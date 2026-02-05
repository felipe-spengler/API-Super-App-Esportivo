<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ShopController extends Controller
{
    // 1. Listar Produtos do Clube (Rota Específica)
    public function products($clubId)
    {
        return response()->json(\App\Models\Product::where('club_id', $clubId)->get());
    }

    // 1.1 Listar Todos os Produtos (Marketplace / Busca Geral)
    public function allProducts(Request $request)
    {
        $query = \App\Models\Product::query();

        if ($request->has('club_id')) {
            $query->where('club_id', $request->club_id);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    // 1.5. Detalhes do Produto
    public function productDetails($id)
    {
        return response()->json(\App\Models\Product::findOrFail($id));
    }

    // 2. Validar Cupom de Desconto
    public function validateCoupon(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'club_id' => 'required|exists:clubs,id'
        ]);

        $coupon = \App\Models\Coupon::where('club_id', $request->club_id)
            ->where('code', $request->code)
            // ->whereDate('expires_at', '>=', now()) // TODO: Descomentar em produção
            ->first();

        if (!$coupon) {
            return response()->json(['message' => 'Cupom inválido ou expirado'], 404);
        }

        return response()->json($coupon);
    }

    // 3. Checkout (Criar Pedido)
    public function dateCheckout(Request $request)
    {
        // Validação Simplificada para MVP
        $validated = $request->validate([
            'club_id' => 'required|exists:clubs,id',
            'items' => 'required|array', // [{ product_id: 1, quantity: 2 }]
            'total_amount' => 'required|numeric'
        ]);

        // 3. Status Inicial e Lógica de Pagamento
        $status = 'pending_payment';
        $paymentMethod = $request->input('payment_method', 'pix');
        $paymentData = [];

        if ($validated['total_amount'] > 0) {
            // Lógica de Gateway de Pagamento (Mock Mercado Pago)

            if ($paymentMethod === 'pix') {
                $paymentData = [
                    'type' => 'pix',
                    'qr_code' => '00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540510.005802BR5913APP ESPORTIVO6008Curitiba62070503***6304E2CA',
                    'qr_code_url' => 'https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=PixKeyExample&choe=UTF-8', // URL QR Code Google Charts Fake
                    'expires_at' => now()->addMinutes(30)->toIso8601String()
                ];
            } elseif ($paymentMethod === 'boleto') {
                $paymentData = [
                    'type' => 'ticket',
                    'pdf_url' => 'https://ww1.mercadopago.com.br/sandbox/boleto/fake_pdf_url',
                    'barcode' => '23790.12345 60012.345678 90123.456789 1 89010000005000',
                    'expires_at' => now()->addDays(3)->toIso8601String()
                ];
            } elseif ($paymentMethod === 'credit_card') {
                // Cartão geralmente aprova na hora ou falha
                $status = 'paid';
                $paymentData = [
                    'type' => 'credit_card',
                    'last_four' => '4242',
                    'brand' => 'master',
                    'status' => 'approved'
                ];
            }

        } else {
            // Se for gratuito (Evento Social ou Cupom 100%), aprova direto
            $status = 'paid';
        }

        // Adiciona dados de pagamento ao retorno (sem salvar no banco na coluna 'payment_gateway_response' por enquanto para simplificar, ou salva em json se tiver campo)


        // Mock de Criação de Pedido
        $order = \App\Models\Order::create([
            'user_id' => $request->user()->id,
            'club_id' => $validated['club_id'],
            'total_amount' => $validated['total_amount'],
            'net_club' => $validated['total_amount'] * 0.90, // Exemplo: 10% Taxa
            'fee_platform' => $validated['total_amount'] * 0.10,
            'status' => $status
        ]);

        return response()->json([
            'order' => $order,
            'payment' => $paymentData
        ], 201);
    }

    // 4. Meus Pedidos
    public function myOrders(Request $request)
    {
        $orders = \App\Models\Order::where('user_id', $request->user()->id)
            ->with('items') // Assumindo relação definida no Model
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($orders);
    }
}
