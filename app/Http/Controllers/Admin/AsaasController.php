<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Club;
use App\Models\Order;
use App\Models\RaceResult;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\Log;

class AsaasController extends Controller
{
    /**
     * Obter configurações do Asaas do clube
     */
    public function getSettings(Request $request)
    {
        $user = $request->user();
        $club = Club::findOrFail($user->club_id);

        return response()->json($club->payment_settings ?? [
            'asaas_token' => '',
            'asaas_environment' => 'sandbox',
            'enabled' => false
        ]);
    }

    /**
     * Salvar configurações do Asaas
     */
    public function updateSettings(Request $request)
    {
        $user = $request->user();
        $club = Club::findOrFail($user->club_id);

        $validated = $request->validate([
            'asaas_token' => 'required|string',
            'asaas_environment' => 'required|in:sandbox,production',
            'enabled' => 'required|boolean'
        ]);

        $club->update(['payment_settings' => $validated]);

        AuditLogger::log('club.payment_settings_update', "Atualizou configurações do Asaas", [
            'club_id' => $club->id
        ]);

        return response()->json(['message' => 'Configurações salvas com sucesso!']);
    }

    /**
     * Webhook para receber notificações do Asaas
     */
    public function webhook(Request $request)
    {
        $payload = $request->all();
        $event = $payload['event'] ?? null;
        $payment = $payload['payment'] ?? null;

        Log::info("Asaas Webhook Received: " . ($event ?? 'no event'), ['payload' => $payload]);

        if (!$event || !$payment) {
            return response()->json(['message' => 'Invalid payload'], 400);
        }

        // Exemplo: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, etc.
        if (in_array($event, ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])) {
            $paymentId = $payment['id'];
            $externalReference = $payment['externalReference'] ?? null; // ID do nosso pedido/resultado

            if ($externalReference) {
                // Se for um RaceResult (Inscrição)
                if (str_starts_with($externalReference, 'RR_')) {
                    $resultId = str_replace('RR_', '', $externalReference);
                    $result = RaceResult::find($resultId);
                    if ($result) {
                        $result->update(['status_payment' => 'paid']);
                        Log::info("RaceResult {$resultId} marked as PAID via Asaas");
                    }
                }
            }
        }

        return response()->json(['status' => 'success']);
    }
}
