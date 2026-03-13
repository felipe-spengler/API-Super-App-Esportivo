<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\RaceResult;
use App\Models\Championship;
use App\Models\Team;
use App\Models\Category;
use App\Models\User;
use App\Services\AsaasService;
use App\Mail\InscriptionPaymentMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class RacePaymentController extends Controller
{
    // Recriar Pagamento (Mudar método ou renovar)
    public function recreatePayment(Request $request, $id)
    {
        $request->validate([
            'payment_method' => 'required|string|in:PIX,CREDIT_CARD,BOLETO,UNDEFINED',
            'document' => 'nullable|string',
            'birth_date' => 'nullable|date',
        ]);

        $result = RaceResult::where('id', $id)
            ->with(['race.championship.club', 'category.parent', 'user'])
            ->first();


        if (!$result) {
            $pivot = DB::table('championship_team')->where('id', $id)->first();
            if ($pivot)
                return $this->recreateTeamPayment($request, $pivot);
            return response()->json(['error' => 'Inscrição não encontrada.'], 404);
        }

        // Segurança
        $user = auth('sanctum')->user();
        if ($user) {
            if (!$user->is_admin && $user->id !== $result->user_id) {
                return response()->json(['error' => 'Acesso negado.'], 403);
            }
        } elseif (!$request->document || !$request->birth_date) {
            return response()->json(['error' => 'Autenticação necessária.'], 401);
        } else {
            $cleanCpf = preg_replace('/[^0-9]/', '', $request->document);
            $dbCpf = preg_replace('/[^0-9]/', '', $result->user->cpf ?? '');
            if ($cleanCpf !== $dbCpf || \Carbon\Carbon::parse($request->birth_date)->format('Y-m-d') !== \Carbon\Carbon::parse($result->user->birth_date)->format('Y-m-d')) {
                return response()->json(['error' => 'Dados não conferem.'], 403);
            }
        }

        if ($result->status_payment === 'paid')
            return response()->json(['error' => 'Inscrição já paga.'], 422);

        try {
            DB::beginTransaction();
            $asaas = new AsaasService($result->race->championship->club);

            if ($result->asaas_payment_id) {
                try {
                    $asaas->deletePayment($result->asaas_payment_id);
                } catch (\Exception $e) {
                }
            }

            // Calcular Preço (SOMA CATEGORIA + SUBCATEGORIA se não salvo no payment_info)
            $mainCategory = $result->category->parent_id ? $result->category->parent : $result->category;
            $amount = $result->payment_info['value'] ?? (float) $mainCategory->price;

            // Se for subcategoria e não tiver o valor salvo em payment_info, PRECISAMOS somar o adicional da subcategoria
            if (!isset($result->payment_info['value']) && $result->category->id !== $mainCategory->id) {
                $amount += (float) ($result->category->price ?? 0);
            }

            $description = "Inscrição (Renovada): {$result->race->championship->name} - {$result->category->name}";
            $payment = $asaas->createPayment($result->user, $amount, substr($description, 0, 250), "RR_{$result->id}", null, $request->payment_method);

            if (isset($payment['id'])) {
                $pix = ($request->payment_method === 'PIX' || $request->payment_method === 'UNDEFINED') ? $asaas->getPixQrCode($payment['id']) : null;
                $paymentInfo = [
                    'asaas_id' => $payment['id'],
                    'invoice_url' => $payment['invoiceUrl'],
                    'pix_qr_code' => $pix['encodedImage'] ?? null,
                    'pix_copy_paste' => $pix['payload'] ?? null,
                    'expiration' => $payment['dueDate'],
                    'value' => $amount
                ];
                $result->update(['payment_method' => 'asaas', 'asaas_payment_id' => $payment['id'], 'payment_info' => $paymentInfo]);
                try {
                    Mail::to($result->user->email)->send(new InscriptionPaymentMail($result, $paymentInfo));
                } catch (\Exception $me) {
                }
            }

            DB::commit();
            return response()->json(['message' => 'Pagamento atualizado!', 'payment_data' => $paymentInfo]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Erro: ' . $e->getMessage()], 500);
        }
    }

    private function recreateTeamPayment(Request $request, $pivot)
    {
        $championship = Championship::with('club')->findOrFail($pivot->championship_id);
        $team = Team::findOrFail($pivot->team_id);
        $category = Category::findOrFail($pivot->category_id);
        $captain = User::findOrFail($team->captain_id);

        $user = auth('sanctum')->user();
        if ($user && !$user->is_admin && $user->id !== $captain->id)
            return response()->json(['error' => 'Acesso negado.'], 403);

        try {
            DB::beginTransaction();
            $asaas = new AsaasService($championship->club);
            $oldInfo = json_decode($pivot->payment_info ?? '[]', true);
            if (!empty($oldInfo['asaas_id'])) {
                try {
                    $asaas->deletePayment($oldInfo['asaas_id']);
                } catch (\Exception $e) {
                }
            }

            $amount = (float) ($oldInfo['value'] ?? $category->price);
            $payment = $asaas->createPayment($captain, $amount, "Inscrição Equipe: {$championship->name}", "CT_{$pivot->id}", null, $request->payment_method);

            if (isset($payment['id'])) {
                $pix = ($request->payment_method === 'PIX' || $request->payment_method === 'UNDEFINED') ? $asaas->getPixQrCode($payment['id']) : null;
                $paymentInfo = ['asaas_id' => $payment['id'], 'invoice_url' => $payment['invoiceUrl'], 'pix_qr_code' => $pix['encodedImage'] ?? null, 'pix_copy_paste' => $pix['payload'] ?? null, 'expiration' => $payment['dueDate'], 'value' => $amount];
                DB::table('championship_team')->where('id', $pivot->id)->update(['payment_method' => 'asaas', 'payment_info' => json_encode($paymentInfo), 'updated_at' => now()]);
            }
            DB::commit();
            return response()->json(['message' => 'Pagamento atualizado!', 'payment_data' => $paymentInfo]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Erro: ' . $e->getMessage()], 500);
        }
    }
}
