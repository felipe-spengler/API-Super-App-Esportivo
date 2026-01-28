<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Inscription; // Assumindo model
use Log;

class PaymentWebhookController extends Controller
{
    // Webhook de Pagamento (Ex: Asaas, MercadoPago, StarkBank)
    public function handle(Request $request, $gateway)
    {
        Log::info("Webhook recebido de {$gateway}: ", $request->all());

        // Lógica Genérica de Mock
        $transactionId = $request->input('id');
        $status = $request->input('status'); // 'PAYMENT_RECEIVED', 'APPROVED', etc.

        // Buscar pedido pelo ID externo (mock) ou ID interno
        // Vamos supor que o gateway manda 'external_reference' que é nosso order_id
        $orderId = $request->input('external_reference');

        if ($orderId) {
            $order = Order::find($orderId);
            if ($order) {
                if (in_array($status, ['PAYMENT_RECEIVED', 'APPROVED', 'paid'])) {
                    $order->update(['status' => 'paid', 'payment_id' => $transactionId]);

                    // Disparar ações pós-pagamento (Ex: confirmar inscrição)
                    // Inscription::where('order_id', $order->id)->update(['status' => 'confirmed']);
                } elseif ($status === 'REFUNDED') {
                    $order->update(['status' => 'refunded']);
                }
            }
        }

        return response()->json(['message' => 'Webhook processed']);
    }
}
