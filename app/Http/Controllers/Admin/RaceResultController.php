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
use App\Services\AsaasService;
use App\Http\Controllers\ImageUploadController;

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
            'phone' => 'required|string|max:20',
            'document' => 'required|string|max:20', // CPF ou RG
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
                $imageController = new ImageUploadController();
                $photoRequest = new Request();
                $photoRequest->files->set('photo', $request->file('photo'));
                $photoRequest->merge(['remove_bg' => $request->boolean('remove_bg')]);
                $imageController->uploadPlayerPhoto($photoRequest, $user->id);
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
            'phone' => 'required|string|max:20',
            'document' => 'required|string|max:20',
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
        if (!$race)
            return response()->json(['error' => 'Evento não encontrado'], 404);

        $category = Category::findOrFail($request->category_id);

        // Validar Idade na data 31/12 do ano do campeonato
        $eventYear = $race->championship->start_date ? \Carbon\Carbon::parse($race->championship->start_date)->year : date('Y');
        $referenceDate = \Carbon\Carbon::createFromDate($eventYear, 12, 31);
        $athleteAge = $referenceDate->diffInYears(\Carbon\Carbon::parse($request->birth_date));

        // Validar Gênero
        if ($category->gender && $category->gender !== 'mixed') {
            $catGender = strtolower($category->gender);
            $userGender = strtolower($request->gender);

            // Map M/F to male/female
            if ($userGender === 'm')
                $userGender = 'male';
            if ($userGender === 'f')
                $userGender = 'female';
            if ($catGender === 'm')
                $catGender = 'male';
            if ($catGender === 'f')
                $catGender = 'female';

            if ($catGender !== 'mixed' && $userGender !== $catGender) {
                return response()->json(['error' => 'Gênero incompatível com a categoria selecionada.'], 422);
            }
        }

        // Validar Idade
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
                $imageController = new ImageUploadController();
                $photoRequest = new Request();
                $photoRequest->files->set('photo', $request->file('photo'));
                $photoRequest->merge(['remove_bg' => $request->boolean('remove_bg', true)]);
                $imageController->uploadPlayerPhoto($photoRequest, $user->id);
            }

            // 3. Documento PCD
            $pcdDocumentUrl = null;
            if ($request->boolean('is_pcd') && $request->hasFile('pcd_document')) {
                $path = $request->file('pcd_document')->store('pcd_documents', 'public');
                $pcdDocumentUrl = '/storage/' . $path;
            }

            // 4. Calcular Descontos (Idoso ou PCD)
            $championship = $race->championship;
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
                    $payment = $asaas->createPayment(
                        $user,
                        $finalPrice,
                        "Inscrição: {$race->championship->name} - {$category->name}",
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
                            'expiration' => $payment['dueDate']
                        ];

                        // Opcional: Salvar ID no resultado para conciliação manual se o webhook falhar
                        $result->update(['payment_method' => 'asaas']);
                    }
                } catch (\Exception $pe) {
                    Log::error("Erro Asaas ao criar pagamento: " . $pe->getMessage());
                    // Não trava a inscrição, apenas não retorna dados de pagamento
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
}
