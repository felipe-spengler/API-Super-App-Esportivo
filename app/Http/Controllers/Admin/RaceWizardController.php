<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\Category;
use App\Models\Race;
use App\Models\Product; // Se formos usar produtos globais ou específicos
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RaceWizardController extends Controller
{
    /**
     * Cria um evento completo de corrida (Evento + Categorias/Subcategorias + Configs de Prova)
     * Recebe um JSON complexo do Wizard Frontend.
     */
    public function store(Request $request)
    {
        /*
         Payload esperado:
         {
            "general": { "name": "Corrida X", "start_date": "...", "location": "...", "description": "..." },
            "categories": [
               { 
                  "name": "5km", "price": 100.00,
                  "subcategories": [
                     { "name": "18-29 anos", "min_age": 18, "max_age": 29, "gender": "MISTO" }
                  ] 
               }
            ],
            "products": [ ... ],
            "coupons": [ ... ]
         }
        */

        // TODO: Validação robusta aqui
        $data = $request->validate([
            'general.name' => 'required|string',
            'general.start_date' => 'required|date',
            'general.sport_id' => 'nullable|integer'
        ]);

        try {
            DB::beginTransaction();

            $clubId = $request->user()->club_id; // Pega do admin logado

            // 1. Criar o "Campeonato" (Evento pai)
            $championship = Championship::create([
                'club_id' => $clubId,
                'name' => $request->input('general.name'),
                'start_date' => $request->input('general.start_date'),
                'end_date' => $request->input('general.start_date'),
                'sport_id' => $request->input('general.sport_id', 3), // Default 3 (Corrida)
                'registration_type' => 'individual',
                'format' => 'racing',
                'status' => 'upcoming',
                'description' => $request->input('general.description'),
            ]);

            // 2. Criar tabela detalhe de corrida (opcional, se tiver dados específicos)
            Race::create([
                'championship_id' => $championship->id,
                'start_datetime' => $request->input('general.start_date'),
                'location_name' => $request->input('general.location'),
                'kits_info' => $request->input('general.kits_info')
            ]);

            // 3. Criar Categorias e Subcategorias
            $categoriesData = $request->input('categories', []);
            foreach ($categoriesData as $catData) {
                // Categoria Pai (Ex: 5km)
                $parentCat = Category::create([
                    'championship_id' => $championship->id,
                    'name' => $catData['name'],
                    'price' => $catData['price'] ?? 0,
                    'gender' => $catData['gender'] ?? 'MISTO',
                    'included_products' => $catData['included_products'] ?? null,
                    // Parent fields can be null for top-level
                ]);

                // Subcategorias (Ex: 18-29 anos)
                if (!empty($catData['subcategories'])) {
                    foreach ($catData['subcategories'] as $subData) {
                        Category::create([
                            'championship_id' => $championship->id,
                            'parent_id' => $parentCat->id, // VINCULO HIERÁRQUICO
                            'name' => $subData['name'],
                            'min_age' => $subData['min_age'] ?? null,
                            'max_age' => $subData['max_age'] ?? null,
                            'gender' => $subData['gender'] ?? $parentCat->gender,
                            'price' => $parentCat->price, // Herda preço se não especificado (simplificação)
                            'included_products' => $parentCat->included_products, // Herda produtos da categoria pai
                        ]);
                    }
                }
            }

            // 4. Produtos (Kits, Camisetas)
            $productsData = $request->input('products', []);
            foreach ($productsData as $prod) {
                if (empty($prod['name']))
                    continue;
                Product::create([
                    'club_id' => $clubId,
                    'name' => $prod['name'],
                    'price' => $prod['price'] ?? 0,
                    'variants' => $prod['variants'] ?? null
                ]);
            }

            // 5. Cupons de Desconto
            $couponsData = $request->input('coupons', []);
            foreach ($couponsData as $cup) {
                if (empty($cup['code']))
                    continue;
                \App\Models\Coupon::create([
                    'club_id' => $clubId,
                    'code' => strtoupper($cup['code']),
                    'discount_type' => $cup['discount_type'] ?? 'fixed',
                    'discount_value' => $cup['discount_value'] ?? 0,
                    'max_uses' => $cup['max_uses'] ?? 100,
                    'expires_at' => $cup['expires_at'] ?? $championship->start_date
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Evento de corrida criado com sucesso!',
                'championship_id' => $championship->id
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Erro criando corrida: " . $e->getMessage());
            return response()->json(['error' => 'Falha ao criar evento: ' . $e->getMessage()], 500);
        }
    }
}
