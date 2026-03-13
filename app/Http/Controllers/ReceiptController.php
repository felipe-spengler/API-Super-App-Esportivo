<?php

namespace App\Http\Controllers;

use App\Models\RaceResult;
use Illuminate\Http\Request;
use App\Models\Product;

class ReceiptController extends Controller
{
    public function download($id)
    {
        $result = RaceResult::with(['user', 'race.championship', 'category'])->findOrFail($id);

        if ($result->status_payment !== 'paid') {
            return response()->json(['message' => 'Comprovante disponível apenas para inscrições confirmadas.'], 403);
        }

        if (!class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            return response()->json(['message' => 'Geração de PDF não disponível no momento.'], 503);
        }

        $pdf = $this->generatePdf($result);

        return $pdf->download("comprovante_inscricao_{$result->id}.pdf");
    }

    public function generatePdf(RaceResult $result)
    {
        if (!class_exists(\Barryvdh\DomPDF\Facade\Pdf::class)) {
            throw new \RuntimeException('DomPDF não instalado. Execute: composer require barryvdh/laravel-dompdf');
        }

        $championship = $result->race->championship;
        $user = $result->user;
        $category = $result->category;

        // Processar Brindes (Gifts)
        $gifts = [];
        if ($result->gifts && is_array($result->gifts)) {
            foreach ($result->gifts as $gift) {
                $prod = Product::find($gift['product_id']);
                if ($prod) {
                    $gifts[] = [
                        'name'    => $prod->name,
                        'variant' => $gift['variant'] ?? null
                    ];
                }
            }
        }

        // Processar Itens de Loja (Shop Items)
        $shopItems = [];
        if ($result->shop_items && is_array($result->shop_items)) {
            foreach ($result->shop_items as $item) {
                $prod = Product::find($item['product_id']);
                if ($prod) {
                    $shopItems[] = [
                        'name'     => $prod->name,
                        'variant'  => $item['variant'] ?? null,
                        'quantity' => $item['quantity'] ?? 1
                    ];
                }
            }
        }

        return \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.inscription_receipt', [
            'result'       => $result,
            'championship' => $championship,
            'user'         => $user,
            'category'     => $category,
            'gifts'        => $gifts,
            'shopItems'    => $shopItems
        ]);
    }
}
