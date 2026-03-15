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
            ->with(['race.championship', 'category'])
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
        if ($mainCategory->children->count() > 0) {
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
                    $imageController->uploadPlayerPhoto($photoRequest, $user->id);
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
            if ($championship->has_elderly_discount && $athleteAge >= $championship->elderly_minimum_age) {
                $discountPct = max($discountPct, $championship->elderly_discount_percentage);
            }
            if ($request->boolean('is_pcd') && $championship->has_pcd_discount) {
                $discountPct = max($discountPct, $championship->pcd_discount_percentage);
            }

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
            $couponId = null;
            if ($request->coupon_code) {
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
                'result' => $result,
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

    // Acompanhar Inscrição (Público)
    public function publicTrackRegistration(Request $request, $championshipId)
    {
        $request->validate(['document' => 'required|string', 'birth_date' => 'required|date']);

        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race)
            return response()->json(['error' => 'Evento não encontrado.'], 422);

        $cleanCpf = preg_replace('/[^0-9]/', '', $request->document);
        $user = User::where(DB::raw("REPLACE(REPLACE(cpf, '.', ''), '-', '')"), $cleanCpf)->first();

        if (!$user)
            return response()->json(['error' => 'Inscrição não encontrada.'], 422);

        if ($user->birth_date && \Carbon\Carbon::parse($user->birth_date)->format('Y-m-d') !== \Carbon\Carbon::parse($request->birth_date)->format('Y-m-d')) {
            return response()->json(['error' => 'Dados não conferem.'], 422);
        }

        $registration = RaceResult::where('race_id', $race->id)->where('user_id', $user->id)->with(['category.parent'])->first();
        if (!$registration)
            return response()->json(['error' => 'Não inscrito neste evento.'], 422);

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
