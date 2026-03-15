<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Club;
use App\Models\Order;
use App\Models\RaceResult;
use App\Services\AuditLogger;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Models\User;

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

    public function webhook(Request $request)
    {
        Log::info("Asaas Webhook chegou.", [
            'ip'      => $request->ip(),
            'token'   => $request->header('asaas-access-token') ? '***presente***' : '(ausente)',
            'payload' => $request->all(),
        ]);

        // Validação do Token do Webhook (Segurança)
        $token = $request->header('asaas-access-token');
        $expectedToken = config('services.asaas.webhook_token');

        if ($expectedToken && $token !== $expectedToken) {
            Log::warning("Asaas Webhook: Token inválido recebido.", ['ip' => $request->ip()]);
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $payload = $request->all();
        $event = $payload['event'] ?? null;
        $payment = $payload['payment'] ?? null;

        Log::info("Asaas Webhook Received: {$event}", ['externalReference' => $payment['externalReference'] ?? 'NONE']);

        if (!$event || !$payment) {
            return response()->json(['message' => 'Invalid payload'], 400);
        }

        // Eventos que indicam sucesso no pagamento
        $successEvents = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
        $failureEvents = ['PAYMENT_OVERDUE', 'PAYMENT_DELETED', 'PAYMENT_REFUNDED'];

        try {
            // ✅ TRANSAÇÃO CRÍTICA: apenas atualiza status no banco
            DB::beginTransaction();

            if (in_array($event, $successEvents)) {
                $this->handlePaymentSuccess($payment);
            } elseif (in_array($event, $failureEvents)) {
                $this->handlePaymentFailure($payment, $event);
            }

            DB::commit();

        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Asaas Webhook CRITICAL Error: " . $e->getMessage() . " at " . $e->getFile() . ":" . $e->getLine());
            // Retorna 500 SOMENTE se a atualização crítica do banco falhar
            return response()->json(['error' => $e->getMessage()], 500);
        }

        // ✅ Retorna 200 ao Asaas IMEDIATAMENTE após o commit do banco
        // Estoque e e-mail são operações secundárias — falhas deles não afetam a resposta
        return response()->json(['status' => 'success']);
    }

    private function handlePaymentSuccess($payment)
    {
        $externalReference = $payment['externalReference'] ?? null;
        if (!$externalReference)
            return;

        // Caso 1: Inscrição Individual de Corrida
        if (str_starts_with($externalReference, 'RR_')) {
            $id = str_replace('RR_', '', $externalReference);
            $result = RaceResult::with(['user', 'race.championship', 'category.parent'])->find($id);
            if ($result && $result->status_payment !== 'paid') {
                $result->update([
                    'status_payment' => 'paid',
                    'payment_method' => $payment['billingType'] ?? 'asaas'
                ]);

                // Baixa no Estoque dos Brindes (Produtos Inclusos na Categoria)
                if ($result->category) {
                    try {
                        $included = $result->category->products;
                        if ($included && $included->count() > 0) {
                            foreach ($included as $product) {
                                if ($product->stock_quantity !== null) {
                                    $qty = $product->pivot->quantity ?? 1;
                                    $product->decrement('stock_quantity', $qty);
                                    Log::info("Stock reduced for Gift Product {$product->id}: -{$qty} (RaceResult {$id})");
                                }
                            }
                        }
                    } catch (\Throwable $stockEx) {
                        Log::error("Erro ao baixar estoque de brindes RR {$id}: " . $stockEx->getMessage());
                    }
                }

                // Baixa no Estoque dos Itens de Loja Adicionais
                try {
                    if ($result->shop_items && is_array($result->shop_items)) {
                        foreach ($result->shop_items as $item) {
                            $prod = \App\Models\Product::find($item['product_id']);
                            if ($prod && $prod->stock_quantity !== null) {
                                $prod->decrement('stock_quantity', $item['quantity'] ?? 1);
                                Log::info("Stock reduced for Additional Shop Item {$prod->id}: -" . ($item['quantity'] ?? 1));
                            }
                        }
                    }
                } catch (\Throwable $stockEx) {
                    Log::error("Erro ao baixar estoque de loja RR {$id}: " . $stockEx->getMessage());
                }

                try {
                    $this->sendInscriptionConfirmation($result);
                } catch (\Throwable $mailEx) {
                    Log::error("Pagamento Confirmado RR {$id}, mas erro ao enviar e-mail: " . $mailEx->getMessage());
                }

                Log::info("RaceResult {$id} marked as PAID");
            }
        }
        // Caso 2: Checkout Geral / Pedido na Loja
        elseif (str_starts_with($externalReference, 'ORD_')) {
            $id = str_replace('ORD_', '', $externalReference);
            $order = Order::with('items.product')->find($id);
            if ($order && $order->status !== 'paid') {
                $order->update(['status' => 'paid']);

                foreach ($order->items as $item) {
                    if ($item->product) {
                        $item->product->decrement('stock_quantity', $item->quantity);
                        Log::info("Stock reduced for Product {$item->product_id}: -{$item->quantity}");
                    }
                }
                Log::info("Order {$id} marked as PAID and stock updated");
            }
        }
        // Caso 3: Inscrição de Equipe (Championship Team Pivot)
        elseif (str_starts_with($externalReference, 'CT_')) {
            $id = str_replace('CT_', '', $externalReference);
            $pivot = DB::table('championship_team')->where('id', $id)->first();
            if ($pivot && $pivot->status_payment !== 'paid') {
                DB::table('championship_team')->where('id', $id)->update([
                    'status_payment' => 'paid',
                    'payment_method' => $payment['billingType'] ?? 'asaas',
                    'updated_at' => now()
                ]);

                // Baixa no Estoque dos Brindes
                if ($pivot->category_id) {
                    $category = \App\Models\Category::find($pivot->category_id);
                    if ($category) {
                        try {
                            $included = $category->products;
                            if ($included && $included->count() > 0) {
                                foreach ($included as $product) {
                                    if ($product->stock_quantity !== null) {
                                        $qty = $product->pivot->quantity ?? 1;
                                        $product->decrement('stock_quantity', $qty);
                                        Log::info("Stock reduced for Team Gift Product {$product->id}: -{$qty} (CT {$id})");
                                    }
                                }
                            }
                        } catch (\Throwable $stockEx) {
                            Log::error("Erro ao baixar estoque de brindes CT {$id}: " . $stockEx->getMessage());
                        }
                    }
                }

                // Baixa no Estoque dos Itens de Loja Adicionais (Team)
                if ($pivot->shop_items) {
                    $shopItems = json_decode($pivot->shop_items, true);
                    if (is_array($shopItems)) {
                        foreach ($shopItems as $item) {
                            $prod = \App\Models\Product::find($item['product_id']);
                            if ($prod && $prod->stock_quantity !== null) {
                                $prod->decrement('stock_quantity', $item['quantity'] ?? 1);
                                Log::info("Stock reduced for Additional Team Shop Item {$prod->id}: -" . ($item['quantity'] ?? 1));
                            }
                        }
                    }
                }

                Log::info("ChampionshipTeam {$id} marked as PAID");
            }
        }

        return;
    }

    private function handlePaymentFailure($payment, $event)
    {
        $externalReference = $payment['externalReference'] ?? null;
        if (!$externalReference)
            return;

        $status = 'cancelled';
        if ($event === 'PAYMENT_REFUNDED')
            $status = 'refunded';

        if (str_starts_with($externalReference, 'RR_')) {
            $id = str_replace('RR_', '', $externalReference);
            RaceResult::where('id', $id)->update(['status_payment' => $status]);
        } elseif (str_starts_with($externalReference, 'ORD_')) {
            $id = str_replace('ORD_', '', $externalReference);
            Order::where('id', $id)->update(['status' => $status]);
        }
    }

    private function sendInscriptionConfirmation($result)
    {
        if (!$result->user || !$result->user->email)
            return;

        $user = $result->user;
        $championship = $result->race->championship;

        try {
            // Gerar o PDF
            $receiptController = new \App\Http\Controllers\ReceiptController();
            $pdf = $receiptController->generatePdf($result);
            $pdfContent = $pdf->output();

            Mail::send([], [], function ($message) use ($user, $championship, $pdfContent, $result) {
                $message->to($user->email)
                    ->subject("Inscrição Confirmada: " . $championship->name)
                    ->attachData($pdfContent, 'comprovante_inscricao.pdf', [
                        'mime' => 'application/pdf',
                    ])
                    ->html("
                        <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;'>
                            <div style='background: #4f46e5; padding: 30px; text-align: center;'>
                                <h1 style='color: white; margin: 0; font-size: 24px;'>Inscrição Confirmada!</h1>
                            </div>
                            <div style='padding: 30px; color: #1e293b; line-height: 1.6;'>
                                <p>Olá, <strong>{$user->name}</strong>!</p>
                                <p>Temos o prazer de informar que seu pagamento foi recebido e sua inscrição no evento <strong>{$championship->name}</strong> está confirmada.</p>
                                
                                <div style='background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;'>
                                    <p style='margin: 0;'><strong>Evento:</strong> {$championship->name}</p>
                                    <p style='margin: 5px 0 0 0;'><strong>Atleta:</strong> {$user->name}</p>
                                    <p style='margin: 5px 0 0 0;'><strong>Data Nasc.:</strong> " . ($user->birth_date ? $user->birth_date->format('d/m/Y') : '---') . "</p>
                                    <p style='margin: 5px 0 0 0;'><strong>Categoria:</strong> " . ($result->category->parent ? $result->category->parent->name : $result->category->name) . "</p>
                                    " . ($result->category->parent ? "<p style='margin: 5px 0 0 0;'><strong>Subcategoria:</strong> {$result->category->name}</p>" : "") . "
                                    <p style='margin: 5px 0 0 0;'><strong>Status:</strong> Pago / Confirmado</p>
                                </div>

                                <p><strong>Anexamos o seu comprovante de inscrição a este e-mail.</strong> Ele contém todos os detalhes da sua compra, brindes inclusos e o QR Code necessário para a retirada de kit no local da prova.</p>

                                <p>Você também pode acessar sua área do atleta a qualquer momento para baixar o comprovante novamente ou ver sua carteirinha digital.</p>
                                
                                <div style='text-align: center; margin-top: 30px;'>
                                    <a href='https://esportivo.techinteligente.site/profile/inscriptions' style='background: #4f46e5; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;'>Ver Minhas Inscrições</a>
                                </div>
                            </div>
                            <div style='background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b;'>
                                <p>© " . date('Y') . " Esportivo. Todos os direitos reservados.</p>
                            </div>
                        </div>
                    ");
            });
        } catch (\Exception $e) {
            Log::error("Erro ao enviar e-mail de confirmação: " . $e->getMessage());
        }
    }
}
