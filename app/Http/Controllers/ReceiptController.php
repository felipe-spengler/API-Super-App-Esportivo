<?php

namespace App\Http\Controllers;

use App\Models\RaceResult;
use Barryvdh\DomPDF\Facade\Pdf;
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

        $pdf = $this->generatePdf($result);

        return $pdf->download("comprovante_inscricao_{$result->id}.pdf");
    }

    public function generatePdf(RaceResult $result)
    {
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
                        'name' => $prod->name,
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
                        'name' => $prod->name,
                        'variant' => $item['variant'] ?? null,
                        'quantity' => $item['quantity'] ?? 1
                    ];
                }
            }
        }

        return Pdf::loadView('pdf.inscription_receipt', [
            'result' => $result,
            'championship' => $championship,
            'user' => $user,
            'category' => $category,
            'gifts' => $gifts,
            'shopItems' => $shopItems
        ]);
    }
}
