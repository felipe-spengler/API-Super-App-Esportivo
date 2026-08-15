<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\Race;
use App\Models\RaceResult;
use App\Models\User;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Product;
use App\Services\AsaasService;
use App\Mail\InscriptionPaymentMail;
use App\Http\Controllers\Admin\ImageUploadController;
use Illuminate\Support\Facades\DB;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class RaceInscriptionController extends Controller
{
    // Listar minhas inscrições (para o app/site)
    public function myInscriptions(Request $request)
    {
        $results = RaceResult::where('user_id', $request->user()->id)
            ->with(['race.championship', 'category.parent', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($results);
    }

    // Registro Público (Site)
    public function publicRegister(Request $request, $championshipId)
    {
        // Decodificar JSON vindo do FormData
        if ($request->has('gifts') && is_string($request->gifts)) {
            $decoded = json_decode($request->gifts, true);
            $request->merge(['gifts' => is_array($decoded) ? $decoded : []]);
        }
        if ($request->has('shop_items') && is_string($request->shop_items)) {
            $decoded = json_decode($request->shop_items, true);
            $request->merge(['shop_items' => is_array($decoded) ? $decoded : []]);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'required|string|max:255',
            'document' => 'required|string|max:255',
            'birth_date' => 'required|date',
            'gender' => 'required|string|in:M,F,O',
            'category_id' => 'required|exists:categories,id',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg|max:4096',
            'is_pcd' => 'nullable|boolean',
            'pcd_document' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:4096',
            'gifts' => 'nullable|array',
            'shop_items' => 'nullable|array',
            'shop_items.*.product_id' => 'required|exists:products,id',
            'shop_items.*.quantity' => 'required|integer|min:1',
            'shop_items.*.variant' => 'nullable|string',
            'coupon_code' => 'nullable|string',
            'payment_method' => 'nullable|string|in:PIX,CREDIT_CARD,BOLETO'
        ]);

        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race) {
            $championship = Championship::find($championshipId);
            if ($championship && $championship->format === 'racing') {
                $race = Race::create([
                    'championship_id' => $championshipId,
                    'start_datetime' => $championship->start_date,
                    'location_name' => 'A definir',
                    'kits_info' => 'Informações do kit em breve'
                ]);
            } else {
                return response()->json(['error' => 'Evento não encontrado ou não configurado como corrida.'], 404);
            }
        }

        // 1. Carregar Categoria Enviada e Identificar a Principal (Pai)
        // Mesmo que o frontend envie uma subcategoria, o preço base vem da pai.
        $selectedCategory = Category::with(['parent', 'children'])->findOrFail($request->category_id);
        $mainCategory = $selectedCategory->parent_id ? $selectedCategory->parent : $selectedCategory;

        // A categoria final de registro (inicialmente a selecionada, 
        // mas pode mudar via automatização de idade)
        $category = $selectedCategory;

        // Validar Idade na data 31/12 do ano do campeonato
        $eventYear = $race->championship->start_date ? \Carbon\Carbon::parse($race->championship->start_date)->year : date('Y');
        $referenceDate = \Carbon\Carbon::createFromDate($eventYear, 12, 31);
        $athleteAge = (int) $referenceDate->diffInYears(\Carbon\Carbon::parse($request->birth_date), true);

        // A subcategoria deve ser automática conforme idade e gênero se a categoria principal tiver filhos.
        $subCategory = null;
        if ($mainCategory->children->count() > 0) {
            // 1. Prioridade PCD: Se é PCD, busca categoria que tenha "PcD" no nome
            if ($request->boolean('is_pcd')) {
                $subCategory = $mainCategory->children
                    ->filter(function ($child) use ($request) {
                        $nameMatch = str_contains(strtolower($child->name), 'pcd');
                        
                        $childGender = strtolower($child->gender ?? '');
                        if ($childGender && $childGender !== 'mixed' && $childGender !== 'misto') {
                            $userGender = strtolower($request->gender);
                            if ($userGender === 'm') $userGender = 'male';
                            if ($userGender === 'f') $userGender = 'female';

                            $normalizedChildGender = $childGender;
                            if ($normalizedChildGender === 'm') $normalizedChildGender = 'male';
                            if ($normalizedChildGender === 'f') $normalizedChildGender = 'female';

                            if ($userGender !== $normalizedChildGender) {
                                return false;
                            }
                        }
                        
                        return $nameMatch;
                    })
                    ->first();
            }

            // 2. Se não achou via PcD (ou não é PcD), busca por Idade e Gênero
            if (!isset($subCategory)) {
                $subCategory = $mainCategory->children
                    ->filter(function ($child) use ($athleteAge, $request) {
                        // Validar Idade
                        $min = $child->min_age ?? 0;
                        $max = $child->max_age ?? 999;
                        if ($athleteAge < $min || $athleteAge > $max) {
                            return false;
                        }

                        // Validar Gênero (se a subcategoria tiver gênero específico)
                        $childGender = strtolower($child->gender ?? '');
                        if ($childGender && $childGender !== 'mixed' && $childGender !== 'misto') {
                            $userGender = strtolower($request->gender);
                            if ($userGender === 'm') $userGender = 'male';
                            if ($userGender === 'f') $userGender = 'female';

                            $normalizedChildGender = $childGender;
                            if ($normalizedChildGender === 'm') $normalizedChildGender = 'male';
                            if ($normalizedChildGender === 'f') $normalizedChildGender = 'female';

                            if ($userGender !== $normalizedChildGender) {
                                return false;
                            }
                        }

                        return true;
                    })
                    ->first();
            }

            if ($subCategory) {
                $category = $subCategory;
            }
        }

        // Validar Gênero
        $catGender = strtolower($category->gender ?? $mainCategory->gender ?? '');
        if ($catGender && $catGender !== 'mixed' && $catGender !== 'misto') {
            $userGender = strtolower($request->gender);
            if ($userGender === 'm')
                $userGender = 'male';
            if ($userGender === 'f')
                $userGender = 'female';

            $normalizedCatGender = $catGender;
            if ($normalizedCatGender === 'm')
                $normalizedCatGender = 'male';
            if ($normalizedCatGender === 'f')
                $normalizedCatGender = 'female';

            if ($userGender !== $normalizedCatGender) {
                return response()->json(['error' => 'Gênero incompatível com a categoria selecionada.'], 422);
            }
        }

        // Validar Idade (Na categoria final)
        if ($category->min_age && $athleteAge < $category->min_age) {
            return response()->json(['error' => "Idade não permitida. A categoria exige idade mínima de {$category->min_age} anos. (Idade: {$athleteAge})"], 422);
        }
        if ($category->max_age && $athleteAge > $category->max_age) {
            return response()->json(['error' => "Idade não permitida. A categoria exige idade máxima de {$category->max_age} anos. (Idade: {$athleteAge})"], 422);
        }

        try {
            DB::beginTransaction();

            // 1. Resolver Usuário
            $user = User::where('cpf', $request->document)
                ->orWhere('email', $request->email)
                ->first();

            if ($user) {
                $exists = RaceResult::where('race_id', $race->id)->where('user_id', $user->id)->exists();
                if ($exists) {
                    return response()->json(['error' => 'Você já está inscrito neste evento.'], 422);
                }
                $user->update(array_filter([
                    'birth_date' => $user->birth_date ?: $request->birth_date,
                    'gender' => $user->gender ?: $request->gender,
                    'phone' => $user->phone ?: $request->phone,
                    'cpf' => $user->cpf ?: $request->document,
                ]));
            } else {
                $user = User::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'phone' => $request->phone,
                    'cpf' => $request->document,
                    'birth_date' => $request->birth_date,
                    'gender' => $request->gender,
                    'club_id' => $race->championship->club_id,
                    'password' => bcrypt(Str::random(12)),
                ]);
            }

            // 2. Foto
            if ($request->hasFile('photo')) {
                try {
                    set_time_limit(300);
                    $imageController = new ImageUploadController();
                    $photoRequest = new Request();
                    $photoRequest->files->set('photo', $request->file('photo'));
                    $photoRequest->merge(['remove_bg' => false]);
                    // Passa o user resolver para o photoRequest (se autenticado)
                    if ($request->getUserResolver()) {
                        $photoRequest->setUserResolver($request->getUserResolver());
                    }
                    $imageController->uploadPlayerPhoto($photoRequest, (int)$user->id);
                } catch (\Exception $photoEx) {
                    Log::error("Erro ao fazer upload de foto na inscrição: " . $photoEx->getMessage());
                    // Não cancela a inscrição por falha no upload de foto
                }
            }

            // 3. Documento PCD
            $pcdDocumentUrl = null;
            if ($request->boolean('is_pcd') && $request->hasFile('pcd_document')) {
                $path = $request->file('pcd_document')->store('pcd_documents', 'public');
                $pcdDocumentUrl = '/storage/' . $path;
            }

            // 4. Calcular Preço (SOMA CATEGORIA PRINCIPAL + SUBCATEGORIA SELECIONADA)
            $championship = $race->championship;

            // O preço base vem SEMPRE da categoria que o usuário clicou (mainCategory)
            $originalPrice = (float) $mainCategory->price;

            // Se o sistema encontrou uma subcategoria específica via idade, e ela for DIFERENTE da clicada,
            // somamos o valor dela (que pode ser um acréscimo configurado)
            if ($category->id !== $mainCategory->id) {
                $originalPrice += (float) ($category->price ?? 0);
            }


            // Calcular Acréscimos de Variações nos Brindes
            if ($request->has('gifts')) {
                foreach ($request->gifts as $gift) {
                    $prod = Product::find($gift['product_id']);
                    if ($prod && is_array($prod->variants)) {
                        foreach ($prod->variants as $v) {
                            if (is_array($v) && isset($v['value']) && $v['value'] === $gift['variant']) {
                                $originalPrice += (float) ($v['surcharge'] ?? 0);
                            }
                        }
                    }
                }
            }

            $discountPct = 0;
            $hasAutoDiscount = false;

            Log::info("DEBUG Descontos - Atleta: {$user->name}, Idade Calculada: {$athleteAge}", [
                'has_elderly_discount_config' => $championship->has_elderly_discount,
                'elderly_minimum_age' => $championship->elderly_minimum_age,
                'elderly_discount_percentage' => $championship->elderly_discount_percentage,
                'is_pcd_request' => $request->boolean('is_pcd'),
                'has_pcd_discount_config' => $championship->has_pcd_discount,
                'pcd_discount_percentage' => $championship->pcd_discount_percentage,
            ]);

            if ($championship->has_elderly_discount && $athleteAge >= $championship->elderly_minimum_age) {
                $discountPct = max($discountPct, (float) $championship->elderly_discount_percentage);
                $hasAutoDiscount = true;
                Log::info("Candidato a Desconto Idoso: {$championship->elderly_discount_percentage}%");
            }

            if ($request->boolean('is_pcd') && $championship->has_pcd_discount) {
                $discountPct = max($discountPct, (float) $championship->pcd_discount_percentage);
                $hasAutoDiscount = true;
                Log::info("Candidato a Desconto PCD: {$championship->pcd_discount_percentage}%");
            }

            Log::info("Desconto Automático Final Selecionado: {$discountPct}%");

            $finalPrice = $originalPrice * (1 - ($discountPct / 100));

            // Itens da Loja
            $shopTotal = 0;
            if ($request->has('shop_items')) {
                foreach ($request->shop_items as $item) {
                    $prod = Product::find($item['product_id']);
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

            // Cupom (Apenas sobre o valor da INSCRIÇÃO, não sobre a loja)
            // REGRA: Se já tem desconto automático (PCD/Idoso), não permite aplicar cupom
            $couponId = null;
            if ($request->coupon_code) {
                if (!$hasAutoDiscount) {
                    $coupon = Coupon::where('club_id', $championship->club_id)->where('code', $request->coupon_code)->first();
                    if ($coupon && (!$coupon->max_uses || $coupon->used_count < $coupon->max_uses) && (!$coupon->expires_at || !$coupon->expires_at->endOfDay()->isPast())) {
                        if ($coupon->discount_type === 'percent') {
                            $finalPrice -= ($finalPrice - $shopTotal) * ($coupon->discount_value / 100);
                        } else {
                            $finalPrice -= $coupon->discount_value;
                        }
                        $couponId = $coupon->id;
                        $coupon->increment('used_count');
                    }
                } else {
                    Log::info("Cupom '{$request->coupon_code}' ignorado: Atleta já possui desconto automático (Idoso/PCD).");
                }
            }

            if ($finalPrice < 0)
                $finalPrice = 0;

            // 5. Salvar Resultado
            $lastBib = RaceResult::where('race_id', $race->id)->max(DB::raw('CAST(bib_number AS SIGNED)'));
            $newBib = $lastBib ? $lastBib + 1 : 1;
            $status = ($finalPrice > 0) ? 'pending' : 'paid';

            $result = RaceResult::create([
                'race_id' => $race->id,
                'user_id' => $user->id,
                'name' => $user->name,
                'bib_number' => (string) $newBib,
                'category_id' => $category->id,
                'status_payment' => $status,
                'payment_method' => $status === 'paid' ? 'free' : null,
                'is_pcd' => $request->boolean('is_pcd'),
                'pcd_document_url' => $pcdDocumentUrl,
                'gifts' => $request->gifts,
                'coupon_id' => $couponId,
                'shop_items' => $request->shop_items
            ]);
            
            // 4.1. Baixa no Estoque se for inscrição Gratuita/Cortesia (Já nasce 'paid')
            if ($status === 'paid') {
                try {
                    // Baixa nos Brindes da Categoria
                    $included = $category->products();
                    foreach ($included as $item) {
                        $product = $item['product'];
                        $qty = $item['quantity'] ?? 1;
                        if ($product && $product->stock_quantity !== null) {
                            $product->decrement('stock_quantity', $qty);
                        }
                    }
                    // Baixa nos Itens da Loja
                    if ($request->has('shop_items')) {
                        foreach ($request->shop_items as $item) {
                            $prod = \App\Models\Product::find($item['product_id']);
                            if ($prod && $prod->stock_quantity !== null) {
                                $prod->decrement('stock_quantity', $item['quantity'] ?? 1);
                            }
                        }
                    }
                } catch (\Exception $stockEx) {
                    \Illuminate\Support\Facades\Log::error("Erro estoque inscrição grátis: " . $stockEx->getMessage());
                }
            }

            $paymentInfo = null;
            if ($status === 'pending') {
                try {
                    $asaas = new AsaasService($race->championship->club);

                    $catName = $mainCategory->name;
                    if ($category->id !== $mainCategory->id) {
                        $catName .= " (" . $category->name . ")";
                    }

                    $description = "Inscrição: {$race->championship->name} - {$catName}";
                    $payment = $asaas->createPayment($user, $finalPrice, substr($description, 0, 250), "RR_{$result->id}", null, $request->input('payment_method', 'UNDEFINED'));


                    if (isset($payment['id'])) {
                        $pix = $asaas->getPixQrCode($payment['id']);
                        $paymentInfo = [
                            'asaas_id' => $payment['id'],
                            'invoice_url' => $payment['invoiceUrl'],
                            'pix_qr_code' => $pix['encodedImage'] ?? null,
                            'pix_copy_paste' => $pix['payload'] ?? null,
                            'expiration' => $payment['dueDate'],
                            'value' => $finalPrice
                        ];
                        $result->update(['payment_method' => 'asaas', 'asaas_payment_id' => $payment['id'], 'payment_info' => $paymentInfo]);
                        try {
                            Mail::to($user->email)->send(new InscriptionPaymentMail($result, $paymentInfo));
                        } catch (\Exception $me) {
                            Log::error("Erro e-mail: " . $me->getMessage());
                        }
                    }
                } catch (\Exception $pe) {
                    DB::rollBack();
                    return response()->json(['error' => 'Erro cobrança: ' . $pe->getMessage()], 500);
                }
            }

            DB::commit();
            return response()->json([
                'message' => 'Inscrição realizada!',
                'result' => $result->load('user'),
                'requires_payment' => $finalPrice > 0,
                'price' => $finalPrice,
                'category_name' => $mainCategory->name,
                'subcategory_name' => ($category->id !== $mainCategory->id) ? $category->name : null,
                'original_price' => $originalPrice,
                'payment_data' => $paymentInfo
            ], 201);


        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Erro: ' . $e->getMessage()], 500);
        }
    }

    // Registro Coletivo (Site)
    public function publicRegisterBulk(Request $request, $championshipId)
    {
        if ($request->has('athletes') && is_string($request->athletes)) {
            $decoded = json_decode($request->athletes, true);
            $request->merge(['athletes' => is_array($decoded) ? $decoded : []]);
        }

        $request->validate([
            'athletes' => 'required|array|min:1',
            'athletes.*.name' => 'required|string|max:255',
            'athletes.*.email' => 'required|email',
            'athletes.*.phone' => 'required|string|max:255',
            'athletes.*.document' => 'required|string|max:255',
            'athletes.*.birth_date' => 'required|date',
            'athletes.*.gender' => 'required|string|in:M,F,O',
            'athletes.*.category_id' => 'required|exists:categories,id',
            'athletes.*.is_pcd' => 'nullable|boolean',
            'athletes.*.gifts' => 'nullable|array',
            'athletes.*.shop_items' => 'nullable|array',
            'coupon_code' => 'nullable|string',
            'payment_method' => 'nullable|string|in:PIX,CREDIT_CARD,BOLETO'
        ]);

        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race) {
            $championship = Championship::find($championshipId);
            if ($championship && $championship->format === 'racing') {
                $race = Race::create([
                    'championship_id' => $championshipId,
                    'start_datetime' => $championship->start_date,
                    'location_name' => 'A definir',
                    'kits_info' => 'Informações do kit em breve'
                ]);
            } else {
                return response()->json(['error' => 'Evento não encontrado ou não configurado como corrida.'], 404);
            }
        }

        $championship = $race->championship;
        $athletes = $request->athletes;
        $count = count($athletes);

        // Calcular Desconto Coletivo Progressivo
        $bulkDiscountPct = 0;
        if ($championship->bulk_discount_settings && is_array($championship->bulk_discount_settings)) {
            foreach ($championship->bulk_discount_settings as $rule) {
                if ($count >= ($rule['min_athletes'] ?? 0) && $count <= ($rule['max_athletes'] ?? 9999)) {
                    $bulkDiscountPct = (float) ($rule['discount_percentage'] ?? 0);
                    break;
                }
            }
        }

        $paymentGroupId = (string) Str::uuid();
        $totalPrice = 0;
        $resultsToCreate = [];

        try {
            DB::beginTransaction();

            $index = 0;
            foreach ($athletes as $athleteData) {
                $selectedCategory = Category::with(['parent', 'children'])->findOrFail($athleteData['category_id']);
                $mainCategory = $selectedCategory->parent_id ? $selectedCategory->parent : $selectedCategory;
                $category = $selectedCategory;
                $subCategory = null;

                $eventYear = $championship->start_date ? \Carbon\Carbon::parse($championship->start_date)->year : date('Y');
                $referenceDate = \Carbon\Carbon::createFromDate($eventYear, 12, 31);
                $athleteAge = (int) $referenceDate->diffInYears(\Carbon\Carbon::parse($athleteData['birth_date']), true);

                if ($mainCategory->children->count() > 0) {
                    if (!empty($athleteData['is_pcd'])) {
                        $subCategory = $mainCategory->children
                            ->filter(function ($child) use ($athleteData) {
                                $nameMatch = str_contains(strtolower($child->name), 'pcd');
                                $childGender = strtolower($child->gender ?? '');
                                if ($childGender && $childGender !== 'mixed' && $childGender !== 'misto') {
                                    $userGender = strtolower($athleteData['gender']);
                                    if ($userGender === 'm') $userGender = 'male';
                                    if ($userGender === 'f') $userGender = 'female';
                                    $normalizedChildGender = $childGender;
                                    if ($normalizedChildGender === 'm') $normalizedChildGender = 'male';
                                    if ($normalizedChildGender === 'f') $normalizedChildGender = 'female';
                                    if ($userGender !== $normalizedChildGender) return false;
                                }
                                return $nameMatch;
                            })
                            ->first();
                    }

                    if (!isset($subCategory)) {
                        $subCategory = $mainCategory->children
                            ->filter(function ($child) use ($athleteAge, $athleteData) {
                                $min = $child->min_age ?? 0;
                                $max = $child->max_age ?? 999;
                                if ($athleteAge < $min || $athleteAge > $max) return false;

                                $childGender = strtolower($child->gender ?? '');
                                if ($childGender && $childGender !== 'mixed' && $childGender !== 'misto') {
                                    $userGender = strtolower($athleteData['gender']);
                                    if ($userGender === 'm') $userGender = 'male';
                                    if ($userGender === 'f') $userGender = 'female';
                                    $normalizedChildGender = $childGender;
                                    if ($normalizedChildGender === 'm') $normalizedChildGender = 'male';
                                    if ($normalizedChildGender === 'f') $normalizedChildGender = 'female';
                                    if ($userGender !== $normalizedChildGender) return false;
                                }
                                return true;
                            })
                            ->first();
                    }

                    if ($subCategory) {
                        $category = $subCategory;
                    }
                }

                $catGender = strtolower($category->gender ?? $mainCategory->gender ?? '');
                if ($catGender && $catGender !== 'mixed' && $catGender !== 'misto') {
                    $userGender = strtolower($athleteData['gender']);
                    if ($userGender === 'm') $userGender = 'male';
                    if ($userGender === 'f') $userGender = 'female';
                    $normalizedCatGender = $catGender;
                    if ($normalizedCatGender === 'm') $normalizedCatGender = 'male';
                    if ($normalizedCatGender === 'f') $normalizedCatGender = 'female';
                    if ($userGender !== $normalizedCatGender) {
                        return response()->json(['error' => "Gênero incompatível para o atleta {$athleteData['name']}."], 422);
                    }
                }

                if ($category->min_age && $athleteAge < $category->min_age) {
                    return response()->json(['error' => "Idade não permitida para o atleta {$athleteData['name']}. Mínima: {$category->min_age}."], 422);
                }
                if ($category->max_age && $athleteAge > $category->max_age) {
                    return response()->json(['error' => "Idade não permitida para o atleta {$athleteData['name']}. Máxima: {$category->max_age}."], 422);
                }

                $user = User::where('cpf', $athleteData['document'])
                    ->orWhere('email', $athleteData['email'])
                    ->first();

                if ($user) {
                    $exists = RaceResult::where('race_id', $race->id)->where('user_id', $user->id)->exists();
                    if ($exists) {
                        return response()->json(['error' => "O atleta {$athleteData['name']} já está inscrito neste evento."], 422);
                    }
                    $user->update(array_filter([
                        'birth_date' => $user->birth_date ?: $athleteData['birth_date'],
                        'gender' => $user->gender ?: $athleteData['gender'],
                        'phone' => $user->phone ?: $athleteData['phone'],
                        'cpf' => $user->cpf ?: $athleteData['document'],
                    ]));
                } else {
                    $user = User::create([
                        'name' => $athleteData['name'],
                        'email' => $athleteData['email'],
                        'phone' => $athleteData['phone'],
                        'cpf' => $athleteData['document'],
                        'birth_date' => $athleteData['birth_date'],
                        'gender' => $athleteData['gender'],
                        'club_id' => $championship->club_id,
                        'password' => bcrypt(Str::random(12)),
                    ]);
                }

                if ($request->hasFile("athletes.{$index}.photo")) {
                    try {
                        $imageController = new ImageUploadController();
                        $photoRequest = new Request();
                        $photoRequest->files->set('photo', $request->file("athletes.{$index}.photo"));
                        $photoRequest->merge(['remove_bg' => false]);
                        $imageController->uploadPlayerPhoto($photoRequest, (int)$user->id);
                    } catch (\Exception $photoEx) {
                        Log::error("Erro foto bulk: " . $photoEx->getMessage());
                    }
                }

                $pcdDocumentUrl = null;
                if (!empty($athleteData['is_pcd']) && $request->hasFile("athletes.{$index}.pcd_document")) {
                    $path = $request->file("athletes.{$index}.pcd_document")->store('pcd_documents', 'public');
                    $pcdDocumentUrl = '/storage/' . $path;
                }

                $originalPrice = (float) $mainCategory->price;
                if ($category->id !== $mainCategory->id) {
                    $originalPrice += (float) ($category->price ?? 0);
                }

                if (isset($athleteData['gifts']) && is_array($athleteData['gifts'])) {
                    foreach ($athleteData['gifts'] as $gift) {
                        $prod = Product::find($gift['product_id']);
                        if ($prod && is_array($prod->variants)) {
                            foreach ($prod->variants as $v) {
                                if (is_array($v) && isset($v['value']) && $v['value'] === $gift['variant']) {
                                    $originalPrice += (float) ($v['surcharge'] ?? 0);
                                }
                            }
                        }
                    }
                }

                $discountPct = 0;
                $hasAutoDiscount = false;

                if ($championship->has_elderly_discount && $athleteAge >= $championship->elderly_minimum_age) {
                    $discountPct = max($discountPct, (float) $championship->elderly_discount_percentage);
                    $hasAutoDiscount = true;
                }

                if (!empty($athleteData['is_pcd']) && $championship->has_pcd_discount) {
                    $discountPct = max($discountPct, (float) $championship->pcd_discount_percentage);
                    $hasAutoDiscount = true;
                }

                $finalDiscountPct = max($discountPct, $bulkDiscountPct);
                if ($finalDiscountPct > 0) {
                    $hasAutoDiscount = true;
                }

                $athleteFinalPrice = $originalPrice * (1 - ($finalDiscountPct / 100));

                $shopTotal = 0;
                if (isset($athleteData['shop_items']) && is_array($athleteData['shop_items'])) {
                    foreach ($athleteData['shop_items'] as $item) {
                        $prod = Product::find($item['product_id']);
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
                $athleteFinalPrice += $shopTotal;

                $couponId = null;
                if ($request->coupon_code && !$hasAutoDiscount) {
                    $coupon = Coupon::where('club_id', $championship->club_id)->where('code', $request->coupon_code)->first();
                    if ($coupon && (!$coupon->max_uses || $coupon->used_count < $coupon->max_uses) && (!$coupon->expires_at || !$coupon->expires_at->endOfDay()->isPast())) {
                        if ($coupon->discount_type === 'percent') {
                            $athleteFinalPrice -= ($athleteFinalPrice - $shopTotal) * ($coupon->discount_value / 100);
                        } else {
                            $athleteFinalPrice -= $coupon->discount_value;
                        }
                        $couponId = $coupon->id;
                        $coupon->increment('used_count');
                    }
                }

                if ($athleteFinalPrice < 0) $athleteFinalPrice = 0;

                $totalPrice += $athleteFinalPrice;

                $resultsToCreate[] = [
                    'user' => $user,
                    'category' => $category,
                    'main_category' => $mainCategory,
                    'price' => $athleteFinalPrice,
                    'original_price' => $originalPrice,
                    'is_pcd' => !empty($athleteData['is_pcd']),
                    'pcd_document_url' => $pcdDocumentUrl,
                    'gifts' => $athleteData['gifts'] ?? null,
                    'shop_items' => $athleteData['shop_items'] ?? null,
                    'coupon_id' => $couponId,
                    'payment_group_leader' => ($index === 0)
                ];

                $index++;
            }

            $createdResults = [];
            $status = ($totalPrice > 0) ? 'pending' : 'paid';

            foreach ($resultsToCreate as $r) {
                $lastBib = RaceResult::where('race_id', $race->id)->max(DB::raw('CAST(bib_number AS SIGNED)'));
                $newBib = $lastBib ? $lastBib + 1 : 1;

                $result = RaceResult::create([
                    'race_id' => $race->id,
                    'user_id' => $r['user']->id,
                    'name' => $r['user']->name,
                    'bib_number' => (string) $newBib,
                    'category_id' => $r['category']->id,
                    'status_payment' => $status,
                    'payment_method' => $status === 'paid' ? 'free' : null,
                    'is_pcd' => $r['is_pcd'],
                    'pcd_document_url' => $r['pcd_document_url'],
                    'gifts' => $r['gifts'],
                    'coupon_id' => $r['coupon_id'],
                    'shop_items' => $r['shop_items'],
                    'payment_group_id' => $paymentGroupId,
                    'payment_group_leader' => $r['payment_group_leader']
                ]);

                if ($status === 'paid') {
                    try {
                        $included = $r['category']->products();
                        foreach ($included as $item) {
                            $product = $item['product'];
                            $qty = $item['quantity'] ?? 1;
                            if ($product && $product->stock_quantity !== null) {
                                $product->decrement('stock_quantity', $qty);
                            }
                        }
                        if ($r['shop_items']) {
                            foreach ($r['shop_items'] as $item) {
                                $prod = Product::find($item['product_id']);
                                if ($prod && $prod->stock_quantity !== null) {
                                    $prod->decrement('stock_quantity', $item['quantity'] ?? 1);
                                }
                            }
                        }
                    } catch (\Exception $se) {
                        Log::error("Erro estoque grátis bulk: " . $se->getMessage());
                    }
                }

                $createdResults[] = $result;
            }

            $paymentInfo = null;
            if ($status === 'pending') {
                $leaderResult = $createdResults[0];
                $leaderUser = $resultsToCreate[0]['user'];

                $asaas = new AsaasService($championship->club);
                $description = "Inscrição Coletiva: {$championship->name} - {$count} atletas";
                $payment = $asaas->createPayment(
                    $leaderUser,
                    $totalPrice,
                    substr($description, 0, 250),
                    "PG_{$paymentGroupId}",
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
                        'expiration' => $payment['dueDate'],
                        'value' => $totalPrice
                    ];

                    foreach ($createdResults as $res) {
                        $res->update([
                            'payment_method' => 'asaas',
                            'asaas_payment_id' => $payment['id'],
                            'payment_info' => $paymentInfo
                        ]);
                    }

                    try {
                        Mail::to($leaderUser->email)->send(new InscriptionPaymentMail($leaderResult, $paymentInfo));
                    } catch (\Exception $me) {
                        Log::error("Erro e-mail bulk: " . $me->getMessage());
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Inscrições em lote realizadas com sucesso!',
                'result' => $leaderResult->load('user'),
                'payment_group_id' => $paymentGroupId,
                'requires_payment' => $totalPrice > 0,
                'price' => $totalPrice,
                'payment_data' => $paymentInfo
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Erro ao processar inscrições: ' . $e->getMessage()], 500);
        }
    }

    // Acompanhar Inscrição (Público)
    public function publicTrackRegistration(Request $request, $championshipId)
    {
        $request->validate(['document' => 'required|string', 'birth_date' => 'required|date']);

        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race)
            return response()->json(['error' => 'Evento não encontrado.'], 422);

        $cleanCpf = preg_replace('/[^0-9]/', '', $request->document);
        $user = User::where(DB::raw("REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '')"), $cleanCpf)->first();

        if (!$user) {
            return response()->json(['error' => 'Atleta não encontrado com este documento.'], 422);
        }

        $requestBirthDate = \Carbon\Carbon::parse($request->birth_date)->format('Y-m-d');
        $userBirthDate = $user->birth_date ? \Carbon\Carbon::parse($user->birth_date)->format('Y-m-d') : null;

        if ($userBirthDate && $userBirthDate !== $requestBirthDate) {
            return response()->json(['error' => 'Data de nascimento não confere com o documento informado.'], 422);
        }

        $registration = RaceResult::where('race_id', $race->id)
            ->where('user_id', $user->id)
            ->with(['category.parent', 'user'])
            ->first();

        if (!$registration) {
            return response()->json(['error' => 'Inscrição não encontrada para este evento.'], 422);
        }

        if ($registration->payment_group_id) {
            $groupResults = RaceResult::where('payment_group_id', $registration->payment_group_id)
                ->with(['category.parent', 'user'])
                ->get();

            return response()->json([
                'result' => $registration,
                'group_results' => $groupResults,
                'requires_payment' => $registration->status_payment === 'pending',
                'payment_data' => $registration->payment_info,
                'price' => $registration->payment_info['value'] ?? $groupResults->sum(function ($r) {
                    $m = $r->category->parent_id ? $r->category->parent : $r->category;
                    $p = (float) $m->price;
                    if ($r->category_id !== $m->id) {
                        $p += (float) ($r->category->price ?? 0);
                    }
                    return $p;
                })
            ]);
        }

        $mainCategory = $registration->category->parent_id ? $registration->category->parent : $registration->category;
        $fallbackPrice = (float) $mainCategory->price;
        if ($registration->category_id !== $mainCategory->id) {
            $fallbackPrice += (float) ($registration->category->price ?? 0);
        }

        return response()->json([
            'result' => $registration,
            'requires_payment' => $registration->status_payment === 'pending',
            'payment_data' => $registration->payment_info,
            'price' => $registration->payment_info['value'] ?? $fallbackPrice,
        ]);

    }
}
