<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\Race;
use App\Models\RaceResult;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Team;
use App\Services\AsaasService;
use Illuminate\Support\Facades\Mail;
use App\Mail\InscriptionPaymentMail;

class RaceResultController extends Controller
{
    // Listar resultados/inscritos de uma corrida
    public function index($championshipId)
    {
        // Precisamos achar a Race associada ao Campeonato
        $race = Race::where('championship_id', $championshipId)->first();

        if (!$race) {
            return response()->json(['message' => 'Corrida não encontrada para este campeonato'], 404);
        }

        $results = RaceResult::where('race_id', $race->id)
            ->with(['category', 'user'])
            ->orderBy('position_general', 'asc')
            ->orderBy('net_time', 'asc')
            ->get();

        return response()->json($results);
    }

    // Atualizar manual (Digitação)
    public function update(Request $request, $id)
    {
        $result = RaceResult::findOrFail($id);

        $result->update([
            'net_time' => $request->net_time, // "HH:MM:SS"
            'gross_time' => $request->gross_time,
            'position_general' => $request->position_general,
            'position_category' => $request->position_category,
            'bib_number' => $request->bib_number,
        ]);

        return response()->json($result);
    }

    // Adicionar um atleta manualmente (que ainda não estava na lista)
    public function store(Request $request, $championshipId)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email',
            'phone' => 'required|string|max:255',
            'document' => 'required|string|max:255', // CPF ou RG
            'birth_date' => 'required|date',
            'gender' => 'required|string|in:M,F,O',
            'category_id' => 'required|exists:categories,id',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg|max:4096',
            'remove_bg' => 'nullable|boolean',
            'status_payment' => 'required|string|in:pending,paid,cancelled',
            'payment_method' => 'nullable|string'
        ]);

        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race) {
            return response()->json(['error' => 'Corrida não encontrada'], 404);
        }

        try {
            DB::beginTransaction();

            // 1. Buscar ou criar o usuário pelo documento (CPF/RG) ou Email
            $user = User::where(function ($q) use ($request) {
                $q->where('cpf', $request->document)
                    ->orWhere('rg', $request->document)
                    ->orWhere('document_number', $request->document);
                if ($request->email) {
                    $q->orWhere('email', $request->email);
                }
            })->first();

            if ($user) {
                // VERIFICAÇÃO DE DUPLICIDADE: Atleta já está nesta corrida?
                $exists = RaceResult::where('race_id', $race->id)
                    ->where('user_id', $user->id)
                    ->exists();

                if ($exists) {
                    return response()->json(['error' => 'Este atleta já está cadastrado nesta corrida.'], 422);
                }
            } else {
                // Se não tem email, gerar um fictício baseado no documento para não quebrar o banco
                $email = $request->email ?? (preg_replace('/[^0-9]/', '', $request->document) . '@esportivo.com.br');

                $user = User::create([
                    'name' => $request->name,
                    'email' => $email,
                    'phone' => $request->phone,
                    'cpf' => $request->document,
                    'birth_date' => $request->birth_date,
                    'gender' => $request->gender,
                    'club_id' => $race->championship->club_id ?? null,
                    'password' => bcrypt(Str::random(12)),
                ]);
            }

            // 2. Upload da Foto se enviada
            if ($request->hasFile('photo')) {
                Log::info("RaceResultController: Iniciando upload de foto para usuário {$user->id}");
                set_time_limit(300);
                $imageController = new ImageUploadController();
                $photoRequest = new Request();
                $photoRequest->files->set('photo', $request->file('photo'));
                $photoRequest->merge(['remove_bg' => false]);
                $imageController->uploadPlayerPhoto($photoRequest, $user->id);
                Log::info("RaceResultController: Upload de foto concluído");
            }

            // 3. Geração de Número de Peito
            $lastBib = RaceResult::where('race_id', $race->id)->max(DB::raw('CAST(bib_number AS SIGNED)'));
            $newBib = $lastBib ? $lastBib + 1 : 1;

            // 4. Criar o registro
            $result = RaceResult::create([
                'race_id' => $race->id,
                'user_id' => $user->id,
                'name' => $user->name,
                'bib_number' => (string) $newBib,
                'category_id' => $request->category_id,
                'status_payment' => $request->status_payment ?? 'pending',
                'payment_method' => $request->payment_method
            ]);

            DB::commit();
            return response()->json($result->load(['user', 'category']), 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error($e);
            return response()->json(['error' => 'Erro ao registrar atleta: ' . $e->getMessage()], 500);
        }
    }

    // Excluir inscrição/resultado
    public function destroy($id)
    {
        $result = RaceResult::findOrFail($id);
        $result->delete();

        Log::info("Inscrição/Resultado removido: ID {$id}");

        return response()->json(['message' => 'Inscrição removida com sucesso!']);
    }

    // Importar CSV
    public function uploadCsv(Request $request, $championshipId)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt', // Removido xlsx para usar str_getcsv nativo
        ]);

        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race)
            return response()->json(['error' => 'Corrida não encontrada'], 404);

        try {
            DB::beginTransaction();
            $file = $request->file('file');
            $fileData = file($file->getRealPath());

            // Tentar detectar delimitador (vírgula ou ponto-e-vírgula)
            $firstLine = $fileData[0] ?? '';
            $delimiter = str_contains($firstLine, ';') ? ';' : ',';

            $data = array_map(fn($line) => str_getcsv($line, $delimiter), $fileData);
            $header = array_shift($data);

            // Normalizar cabeçalho para facilitar busca
            $header = array_map(fn($h) => strtoupper(trim($h)), $header);

            $colBib = array_search('PEITO', $header);
            if ($colBib === false)
                $colBib = array_search('NUMERO', $header);

            $colName = array_search('NOME', $header);
            $colDocument = array_search('CPF', $header);
            if ($colDocument === false)
                $colDocument = array_search('DOCUMENTO', $header);

            $colGender = array_search('SEXO', $header);
            if ($colGender === false)
                $colGender = array_search('GENERO', $header);

            $colCategory = array_search('CATEGORIA', $header);

            $count = 0;
            $skipped = [];

            foreach ($data as $index => $row) {
                // Ignorar linhas vazias
                if (empty($row) || count($row) < 2)
                    continue;

                $rowNum = $index + 2; // +1 do shift +1 do index 0

                $name = $colName !== false ? trim($row[$colName] ?? '') : '';
                $document = $colDocument !== false ? trim($row[$colDocument] ?? '') : '';
                $gender = $colGender !== false ? strtoupper(trim($row[$colGender] ?? '')) : 'MISTO';
                $bib = $colBib !== false ? trim($row[$colBib] ?? '') : null;
                $catName = $colCategory !== false ? trim($row[$colCategory] ?? '') : '';

                // Validação de dados essenciais
                if (!$name || !$catName) {
                    $skipped[] = "Linha $rowNum: Nome ou Categoria ausentes.";
                    continue;
                }

                // Normalizar Gênero
                if ($gender === 'MASCULINO')
                    $gender = 'M';
                if ($gender === 'FEMININO')
                    $gender = 'F';
                if (!in_array($gender, ['M', 'F', 'O', 'MISTO']))
                    $gender = 'MISTO';

                // Buscar Categoria
                $cat = Category::where('championship_id', $championshipId)
                    ->where('name', 'like', "%$catName%")
                    ->first();

                if (!$cat) {
                    $skipped[] = "Linha $rowNum: Categoria '$catName' não encontrada no sistema.";
                    continue;
                }

                // Buscar ou criar usuário se tiver documento
                $userId = null;
                if ($document) {
                    $user = User::where('cpf', $document)->orWhere('document_number', $document)->first();
                    if (!$user) {
                        $user = User::create([
                            'name' => $name,
                            'cpf' => $document,
                            'gender' => $gender,
                            'club_id' => $race->championship->club_id,
                            'password' => bcrypt(Str::random(10))
                        ]);
                    }
                    $userId = $user->id;
                }

                // Se não tiver BIB no CSV, gerar sequencial
                if (!$bib) {
                    $lastBib = RaceResult::where('race_id', $race->id)->max(DB::raw('CAST(bib_number AS SIGNED)'));
                    $bib = (string) ($lastBib ? $lastBib + 1 : 1);
                }

                RaceResult::updateOrCreate(
                    [
                        'race_id' => $race->id,
                        'bib_number' => $bib,
                    ],
                    [
                        'user_id' => $userId,
                        'name' => $name,
                        'category_id' => $cat->id,
                    ]
                );
                $count++;
            }

            DB::commit();

            return response()->json([
                'message' => "Importação concluída!",
                'success_count' => $count,
                'errors' => $skipped
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error($e);
            return response()->json(['error' => 'Erro ao processar CSV: ' . $e->getMessage()], 500);
        }
    }

    // Atualizar apenas o pagamento
    public function updatePayment(Request $request, $id)
    {
        $request->validate([
            'status_payment' => 'required|string|in:pending,paid,cancelled',
            'payment_method' => 'nullable|string'
        ]);

        $result = RaceResult::findOrFail($id);
        $result->update([
            'status_payment' => $request->status_payment,
            'payment_method' => $request->payment_method
        ]);

        return response()->json($result->load(['user', 'category']));
    }

    // Exportar CSV de Atletas
    public function exportCsv($championshipId)
    {
        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race)
            return response()->json(['error' => 'Corrida não encontrada'], 404);

        $results = RaceResult::where('race_id', $race->id)
            ->with(['category', 'user'])
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="inscritos_corrida.csv"',
        ];

        $callback = function () use ($results) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['BIB', 'NOME', 'CATEGORIA', 'DOCUMENTO', 'GENERO', 'STATUS PAGAMENTO', 'METODO']);

            foreach ($results as $row) {
                fputcsv($file, [
                    $row->bib_number,
                    $row->name,
                    $row->category->name ?? 'Geral',
                    $row->user->cpf ?? $row->user->document_number ?? '',
                    $row->user->gender ?? 'MISTO',
                    $row->status_payment,
                    $row->payment_method ?? 'N/A'
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

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
        // Decodificar JSON vindo do FormData (que chega como string)
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
            'gifts' => 'nullable|array', // [{product_id, variant}]
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

        // 1. Carregar Categoria com Parent/Children
        $category = Category::with(['parent', 'children'])->findOrFail($request->category_id);
        $mainCategory = $category->parent_id ? $category->parent : $category;


        // Validar Idade na data 31/12 do ano do campeonato
        $eventYear = $race->championship->start_date ? \Carbon\Carbon::parse($race->championship->start_date)->year : date('Y');
        $referenceDate = \Carbon\Carbon::createFromDate($eventYear, 12, 31);
        $athleteAge = (int) $referenceDate->diffInYears(\Carbon\Carbon::parse($request->birth_date), true);

        // 2026-03-12: A subcategoria deve ser automática conforme idade.
        // Se a categoria principal tiver filhos (subcategorias), selecionamos o que bate com a idade.
        if ($mainCategory->children->count() > 0) {
            $subCategory = $mainCategory->children
                ->filter(function ($child) use ($athleteAge) {
                    $min = $child->min_age ?? 0;
                    $max = $child->max_age ?? 999;
                    return $athleteAge >= $min && $athleteAge <= $max;
                })
                ->first();

            // Se encontrou a subcategoria certa, usamos ela para o registro do resultado
            if ($subCategory) {
                $category = $subCategory;
            }
        }

        // Validar Gênero (Validamos na categoria final selecionada)
        $catGender = strtolower($category->gender ?? $mainCategory->gender ?? '');
        if ($catGender && $catGender !== 'mixed' && $catGender !== 'misto') {
            $userGender = strtolower($request->gender);

            // Map M/F to male/female
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
            return response()->json(['error' => "Idade não permitida. A categoria exige idade mínima de {$category->min_age} anos em 31/12/{$eventYear}. (Idade calculada: {$athleteAge} anos)"], 422);
        }
        if ($category->max_age && $athleteAge > $category->max_age) {
            return response()->json(['error' => "Idade não permitida. A categoria exige idade máxima de {$category->max_age} anos em 31/12/{$eventYear}. (Idade calculada: {$athleteAge} anos)"], 422);
        }


        try {
            DB::beginTransaction();

            // 1. Resolver Usuário
            $user = User::where('cpf', $request->document)
                ->orWhere('email', $request->email)
                ->first();

            if ($user) {
                // Check if already in this race
                $exists = RaceResult::where('race_id', $race->id)->where('user_id', $user->id)->exists();
                if ($exists) {
                    return response()->json(['error' => 'Você já está inscrito neste evento.'], 422);
                }

                // APROVEITAR PARA COMPLETAR O PERFIL SE ESTIVER FALTANDO
                $updatedFields = [];
                if (!$user->birth_date && $request->birth_date)
                    $updatedFields['birth_date'] = $request->birth_date;
                if (!$user->gender && $request->gender)
                    $updatedFields['gender'] = $request->gender;
                if (!$user->phone && $request->phone)
                    $updatedFields['phone'] = $request->phone;
                if (!$user->cpf && $request->document)
                    $updatedFields['cpf'] = $request->document;

                if (!empty($updatedFields)) {
                    $user->update($updatedFields);
                }
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
                Log::info("RaceResultController (Public): Upload de foto para usuário {$user->id}");
                set_time_limit(300);
                $imageController = new ImageUploadController();
                $photoRequest = new Request();
                $photoRequest->files->set('photo', $request->file('photo'));
                // Forçar remove_bg como false por enquanto conforme solicitado
                $photoRequest->merge(['remove_bg' => false]);
                $imageController->uploadPlayerPhoto($photoRequest, $user->id);
                Log::info("RaceResultController (Public): Foto processada");
            }

            // 3. Documento PCD
            $pcdDocumentUrl = null;
            if ($request->boolean('is_pcd') && $request->hasFile('pcd_document')) {
                $path = $request->file('pcd_document')->store('pcd_documents', 'public');
                $pcdDocumentUrl = '/storage/' . $path;
            }

            // 4. Calcular Descontos (Idoso ou PCD)
            $championship = $race->championship;
            // O valor deve vir da categoria principal, não da subcategoria
            $originalPrice = (float) $mainCategory->price;


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

            $discountPct = 0;
            if ($championship->has_elderly_discount && $athleteAge >= $championship->elderly_minimum_age) {
                $discountPct = max($discountPct, $championship->elderly_discount_percentage);
            }

            if ($request->boolean('is_pcd') && $championship->has_pcd_discount) {
                $discountPct = max($discountPct, $championship->pcd_discount_percentage);
            }

            // O desconto (PCD/Idoso) aplica apenas na inscrição (originalPrice base)
            $finalPrice = $originalPrice * (1 - ($discountPct / 100));

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

            // 4.1 Validar Cupom (se houver)
            $couponId = null;
            if ($request->coupon_code) {
                $coupon = \App\Models\Coupon::where('club_id', $championship->club_id)
                    ->where('code', $request->coupon_code)
                    ->first();

                if (!$coupon) {
                    return response()->json(['error' => 'Cupom inválido.'], 422);
                }

                if ($coupon->max_uses && $coupon->used_count >= $coupon->max_uses) {
                    return response()->json(['error' => 'Este cupom atingiu o limite de usos.'], 422);
                }

                if ($coupon->expires_at && $coupon->expires_at->isPast()) {
                    return response()->json(['error' => 'Este cupom expirou.'], 422);
                }

                if ($coupon->discount_type === 'percentage') {
                    $finalPrice -= $finalPrice * ($coupon->discount_value / 100);
                } else {
                    $finalPrice -= $coupon->discount_value;
                }

                $couponId = $coupon->id;
                $coupon->increment('used_count');
            }

            if ($finalPrice < 0)
                $finalPrice = 0;

            // 5. Race Result
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
                    $description = "Inscrição: {$race->championship->name} - {$category->name}";
                    $payment = $asaas->createPayment(
                        $user,
                        $finalPrice,
                        substr($description, 0, 250),
                        "RR_{$result->id}",
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
                            'value' => $finalPrice
                        ];

                        // Salvar info no resultado para conciliação e re-exibição
                        $result->update([
                            'payment_method' => 'asaas',
                            'asaas_payment_id' => $payment['id'],
                            'payment_info' => $paymentInfo
                        ]);

                        // Enviar E-mail!
                        try {
                            Mail::to($user->email)->send(new InscriptionPaymentMail($result, $paymentInfo));
                        } catch (\Exception $me) {
                            Log::error("Erro ao enviar e-mail de inscrição: " . $me->getMessage());
                        }
                    }
                } catch (\Exception $pe) {
                    Log::error("Erro Asaas ao criar pagamento: " . $pe->getMessage());
                    // Durante o debug, vamos retornar o erro para o usuário saber o que houve
                    DB::rollBack();
                    return response()->json(['error' => 'Erro ao gerar cobrança no Asaas: ' . $pe->getMessage()], 500);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Inscrição realizada!',
                'result' => $result,
                'requires_payment' => $finalPrice > 0,
                'price' => $finalPrice,
                'original_price' => $originalPrice,
                'discount_applied' => $discountPct,
                'payment_data' => $paymentInfo
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Erro ao processar inscrição: ' . $e->getMessage()], 500);
        }
    }

    // Recriar Pagamento (Mudar método ou renovar)
    public function recreatePayment(Request $request, $id)
    {
        $request->validate([
            'payment_method' => 'required|string|in:PIX,CREDIT_CARD,BOLETO,UNDEFINED',
            'document' => 'nullable|string',
            'birth_date' => 'nullable|date',
        ]);

        $result = RaceResult::where('id', $id)
            ->with(['race.championship.club', 'category', 'user'])
            ->first();

        if (!$result) {
            // Se não achou em RaceResult, tenta em championship_team (pivot)
            $pivot = DB::table('championship_team')->where('id', $id)->first();
            if ($pivot) {
                return $this->recreateTeamPayment($request, $pivot);
            }
            return response()->json(['error' => 'Inscrição não encontrada.'], 404);
        }

        // VERIFICAÇÃO DE SEGURANÇA
        $user = auth('sanctum')->user();
        if ($user) {
            // Se logado: Dono da inscrição OU Admin
            if (!$user->is_admin && $user->id !== $result->user_id) {
                return response()->json(['error' => 'Acesso negado. Esta inscrição pertence a outro atleta.'], 403);
            }
        } else {
            // Se DESLOGADO (fluxo de Acompanhar Inscrição): Exige CPF e Data de Nascimento
            if (!$request->document || !$request->birth_date) {
                return response()->json(['error' => 'Autenticação necessária.'], 401);
            }

            $cleanCpf = preg_replace('/[^0-9]/', '', $request->document);
            $dbCpf = preg_replace('/[^0-9]/', '', $result->user->cpf ?? '');

            $reqDate = \Carbon\Carbon::parse($request->birth_date)->format('Y-m-d');
            $dbDate = $result->user->birth_date ? \Carbon\Carbon::parse($result->user->birth_date)->format('Y-m-d') : null;

            if ($cleanCpf !== $dbCpf || $reqDate !== $dbDate) {
                return response()->json(['error' => 'Dados de verificação não conferem.'], 403);
            }
        }

        if ($result->status_payment === 'paid') {
            return response()->json(['error' => 'Esta inscrição já está paga.'], 422);
        }

        try {
            DB::beginTransaction();
            $asaas = new AsaasService($result->race->championship->club);

            // 1. Tentar cancelar o antigo no Asaas
            if ($result->asaas_payment_id) {
                try {
                    $asaas->deletePayment($result->asaas_payment_id);
                } catch (\Exception $e) {
                    Log::warning("Não foi possível cancelar pagamento antigo {$result->asaas_payment_id}: " . $e->getMessage());
                }
            }

            // 2. Criar Novo Pagamento
            $mainCategory = $result->category->parent_id ? $result->category->parent : $result->category;
            $amount = $result->payment_info['value'] ?? (float) $mainCategory->price;


            $description = "Inscrição (Renovada): {$result->race->championship->name} - {$result->category->name}";
            $payment = $asaas->createPayment(
                $result->user, // Usar o usuário da inscrição, não necessariamente o logado
                $amount,
                substr($description, 0, 250),
                "RR_{$result->id}",
                null,
                $request->payment_method
            );

            $paymentInfo = null;
            if (isset($payment['id'])) {
                $pix = ($request->payment_method === 'PIX' || $request->payment_method === 'UNDEFINED') ? $asaas->getPixQrCode($payment['id']) : null;

                $paymentInfo = [
                    'asaas_id' => $payment['id'],
                    'invoice_url' => $payment['invoiceUrl'],
                    'pix_qr_code' => $pix['encodedImage'] ?? null,
                    'pix_copy_paste' => $pix['payload'] ?? null,
                    'expiration' => $payment['dueDate'],
                    'value' => $amount
                ];

                $result->update([
                    'payment_method' => 'asaas',
                    'asaas_payment_id' => $payment['id'],
                    'payment_info' => $paymentInfo
                ]);

                // Re-enviar E-mail
                try {
                    Mail::to($result->user->email)->send(new InscriptionPaymentMail($result, $paymentInfo));
                } catch (\Exception $me) {
                    Log::error("Erro ao re-enviar e-mail de inscrição: " . $me->getMessage());
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Pagamento atualizado!',
                'payment_data' => $paymentInfo
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Erro ao recriar pagamento: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Recriar pagamento para Inscrição de Equipe (championship_team)
     */
    private function recreateTeamPayment(Request $request, $pivot)
    {
        $championship = Championship::with('club')->findOrFail($pivot->championship_id);
        $team = Team::findOrFail($pivot->team_id);
        $category = Category::findOrFail($pivot->category_id);
        $captain = User::findOrFail($team->captain_id);

        // Segurança para Equipes (Apenas Capitão ou Admin)
        $user = auth('sanctum')->user();
        if ($user) {
            if (!$user->is_admin && $user->id !== $captain->id) {
                return response()->json(['error' => 'Acesso negado. Apenas o capitão ou admin podem alterar o pagamento.'], 403);
            }
        } else {
            // Caso queira permitir via Documento do Capitão
            if (!$request->document || !$request->birth_date) {
                return response()->json(['error' => 'Autenticação necessária.'], 401);
            }
            $cleanCpf = preg_replace('/[^0-9]/', '', $request->document);
            $dbCpf = preg_replace('/[^0-9]/', '', $captain->cpf ?? '');
            if ($cleanCpf !== $dbCpf) {
                return response()->json(['error' => 'Dados do capitão não conferem.'], 403);
            }
        }

        if ($pivot->status_payment === 'paid') {
            return response()->json(['error' => 'Esta inscrição já está paga.'], 422);
        }

        try {
            DB::beginTransaction();
            $asaas = new AsaasService($championship->club);

            // Carregar info do pagamento antigo do pivot (se existir)
            $oldInfo = json_decode($pivot->payment_info ?? '[]', true);
            if (!empty($oldInfo['asaas_id'])) {
                try {
                    $asaas->deletePayment($oldInfo['asaas_id']);
                } catch (\Exception $e) {
                    Log::warning("Erro cancelamento asaas team: " . $e->getMessage());
                }
            }

            // Calcular valor total (simplificado aqui, pegando do pivot ou da categoria)
            // Idealmente o pivot deveria ter um campo total_price salvo. 
            // Se não tem, usamos o preço da categoria.
            $amount = (float) ($oldInfo['value'] ?? $category->price);

            $description = "Inscrição Equipe (Renovada): {$championship->name} - {$team->name}";
            $payment = $asaas->createPayment(
                $captain,
                $amount,
                substr($description, 0, 250),
                "CT_{$pivot->id}",
                null,
                $request->payment_method
            );

            if (isset($payment['id'])) {
                $pix = ($request->payment_method === 'PIX' || $request->payment_method === 'UNDEFINED') ? $asaas->getPixQrCode($payment['id']) : null;
                $paymentInfo = [
                    'asaas_id' => $payment['id'],
                    'invoice_url' => $payment['invoiceUrl'],
                    'pix_qr_code' => $pix['encodedImage'] ?? null,
                    'pix_copy_paste' => $pix['payload'] ?? null,
                    'expiration' => $payment['dueDate'],
                    'value' => $amount
                ];

                DB::table('championship_team')->where('id', $pivot->id)->update([
                    'payment_method' => 'asaas',
                    'payment_info' => json_encode($paymentInfo),
                    'updated_at' => now()
                ]);
            }

            DB::commit();
            return response()->json(['message' => 'Pagamento atualizado!', 'payment_data' => $paymentInfo]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Erro ao recriar pagamento equipe: ' . $e->getMessage()], 500);
        }
    }

    // Acompanhar Inscrição (Público)
    public function publicTrackRegistration(Request $request, $championshipId)
    {
        Log::info("Tracking registration for championship: $championshipId", $request->all());

        $request->validate([
            'document' => 'required|string',
            'birth_date' => 'required|date'
        ]);

        // Localizar a Corrida
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
                return response()->json(['error' => 'Evento não configurado como corrida.'], 422);
            }
        }

        // Limpar CPF para busca
        $cleanCpf = preg_replace('/[^0-9]/', '', $request->document);

        // 1. Tentar buscar pelo CPF exato (independente da data inicialmente)
        $user = User::where(DB::raw("REPLACE(REPLACE(cpf, '.', ''), '-', '')"), $cleanCpf)->first();

        if (!$user) {
            return response()->json(['error' => 'Nenhuma inscrição encontrada para este CPF.'], 422);
        }

        // 2. Se o usuário tem data no banco, ELA DEVE COINCIDIR (Segurança)
        if ($user->birth_date) {
            $dbDate = \Carbon\Carbon::parse($user->birth_date)->format('Y-m-d');
            $reqDate = \Carbon\Carbon::parse($request->birth_date)->format('Y-m-d');

            if ($dbDate !== $reqDate) {
                return response()->json(['error' => 'Data de nascimento não confere com nossos registros.'], 422);
            }
        } else {
            // 3. Se o usuário NÃO tem data no banco (caso de usuários antigos), cadastramos a data agora
            // Isso permite que ele entre e já "limpa" o registro dele para o futuro.
            $user->update(['birth_date' => $request->birth_date]);
            Log::info("User ID {$user->id} updated birth_date during tracking.");
        }

        $registration = RaceResult::where('race_id', $race->id)
            ->where('user_id', $user->id)
            ->with(['category'])
            ->first();

        if (!$registration) {
            return response()->json(['error' => 'Você ainda não está inscrito neste evento.'], 422);
        }

        return response()->json([
            'result' => $registration,
            'requires_payment' => $registration->status_payment === 'pending',
            'payment_data' => $registration->payment_info,
            'price' => $registration->payment_info['value'] ?? (float) $registration->category->price,
            'discount_applied' => $registration->discount_applied ?? 0
        ]);
    }
}
