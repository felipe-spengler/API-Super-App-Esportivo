<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\Category;
use App\Models\Team;
use App\Models\Coupon;
use App\Services\AsaasService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InscriptionController extends Controller
{
    // 1. Inscrever Time (Capitão)
    public function registerTeam(Request $request)
    {
        $validated = $request->validate([
            'championship_id' => 'required|exists:championships,id',
            'category_id' => 'required|exists:categories,id',
            'team_name' => 'required|string',
            'gifts' => 'nullable|array',
            'shop_items' => 'nullable|array',
            'shop_items.*.product_id' => 'required|exists:products,id',
            'shop_items.*.quantity' => 'required|integer|min:1',
            'shop_items.*.variant' => 'nullable|string',
            'coupon_code' => 'nullable|string',
            'payment_method' => 'nullable|string|in:PIX,CREDIT_CARD,BOLETO'
        ]);

        $championship = Championship::with('club')->findOrFail($validated['championship_id']);
        $category = Category::findOrFail($validated['category_id']);

        // Check eligibility (Captain)
        $check = $category->isUserEligible($request->user());
        if (!$check['eligible']) {
            return response()->json(['message' => $check['reason']], 403);
        }

        try {
            DB::beginTransaction();

            // 1. Resolve/Create Team (Capitão cria o time se não existir ou usa um novo?)
            // Por simplicidade do fluxo de inscrição, vamos criar um novo time para este campeonato
            $team = Team::create([
                'club_id' => $championship->club_id,
                'captain_id' => $request->user()->id,
                'name' => $validated['team_name'],
                'primary_color' => '#4f46e5'
            ]);

            // 2. Calcular Valor Final
            $originalPrice = (float) $category->price;

            // Calcular Acréscimos de Variações nos Brindes
            if ($request->has('gifts')) {
                foreach ($request->gifts as $gift) {
                    $prod = \App\Models\Product::find($gift['product_id']);
                    if ($prod && is_array($prod->variants)) {
                        foreach ($prod->variants as $v) {
                            if (is_array($v) && isset($v['value']) && $v['value'] === $gift['variant']) {
                                $originalPrice += (float) ($v['surcharge'] ?? 0);
                            }
                        }
                    }
                }
            }

            $finalPrice = $originalPrice;

            // Calcular Itens Adicionais da Loja
            $shopTotal = 0;
            if ($request->has('shop_items')) {
                foreach ($request->shop_items as $item) {
                    $prod = \App\Models\Product::find($item['product_id']);
                    if ($prod) {
                        $itemPrice = (float) $prod->price;
                        if (isset($item['variant']) && is_array($prod->variants)) {
                            foreach ($prod->variants as $v) {
                                if (is_array($v) && isset($v['value']) && $v['value'] === $item['variant']) {
                                    $itemPrice += (float) ($v['surcharge'] ?? 0);
                                }
                            }
                        }
                        $shopTotal += $itemPrice * (int) ($item['quantity'] ?? 1);
                    }
                }
            }

            $finalPrice += $shopTotal;

            // Cupom (Apenas sobre a inscrição, não sobre a loja)
            $couponId = null;
            if ($request->coupon_code) {
                $coupon = Coupon::where('club_id', $championship->club_id)
                    ->where('code', $request->coupon_code)
                    ->first();
 
                if ($coupon && (!$coupon->expires_at || !$coupon->expires_at->endOfDay()->isPast()) && (!$coupon->max_uses || $coupon->used_count < $coupon->max_uses)) {
                    if ($coupon->discount_type === 'percent') {
                        $finalPrice -= ($finalPrice - $shopTotal) * ($coupon->discount_value / 100);
                    } else {
                        $finalPrice -= $coupon->discount_value;
                    }
                    $couponId = $coupon->id;
                    $coupon->increment('used_count');
                }
            }

            if ($finalPrice < 0)
                $finalPrice = 0;

            $status = ($finalPrice > 0) ? 'pending' : 'paid';

            // 3. Vincular Team ao Championship no Pivot Table
            $ctId = DB::table('championship_team')->insertGetId([
                'championship_id' => $championship->id,
                'team_id' => $team->id,
                'category_id' => $category->id,
                'status_payment' => $status,
                'payment_method' => ($status === 'paid') ? 'free' : null,
                'coupon_id' => $couponId,
                'gifts' => $request->gifts ? json_encode($request->gifts) : null,
                'shop_items' => $request->shop_items ? json_encode($request->shop_items) : null,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // 4. Pagamento
            $paymentInfo = null;
            if ($status === 'pending') {
                try {
                    $asaas = new AsaasService($championship->club);
                    $payment = $asaas->createPayment(
                        $request->user(),
                        $finalPrice,
                        "Inscrição Equipe: {$championship->name} - {$team->name}",
                        "CT_{$ctId}", // Championship Team pivot ID
                        null,
                        $request->input('payment_method', 'UNDEFINED')
                    );

                    if (isset($payment['id'])) {
                        $pix = $asaas->getPixQrCode($payment['id']);
                        $paymentInfo = [
                            'asaas_id' => $payment['id'],
                            'invoice_url' => $payment['invoiceUrl'],
                            'pix_qr_code' => $pix['encodedImage'] ?? null,
                            'pix_copy_paste' => $pix['payload'] ?? null,
                            'expiration' => $payment['dueDate']
                        ];
                    }
                } catch (\Exception $pe) {
                    Log::error("Erro Asaas Team Inscription: " . $pe->getMessage());
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Inscrição realizada com sucesso!',
                'team_id' => $team->id,
                'requires_payment' => $finalPrice > 0,
                'price' => $finalPrice,
                'payment_data' => $paymentInfo
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Erro ao processar inscrição: ' . $e->getMessage()], 500);
        }
    }

    // 2. Upload de Documentos (RG/CPF)
    public function uploadDocument(Request $request)
    {
        if ($request->hasFile('document')) {
            // $path = $request->file('document')->store('documents');
            return response()->json(['message' => 'Upload realizado', 'path' => 'mock/path.jpg']);
        }
        return response()->json(['message' => 'Arquivo não enviado'], 400);
    }
}
