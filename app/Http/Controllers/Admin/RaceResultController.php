<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Race;
use App\Models\RaceResult;
use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\InscriptionPaymentMail;
use App\Mail\InscriptionConfirmedMail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class RaceResultController extends Controller
{
    /**
     * Listar resultados/inscritos de uma corrida
     */
    public function index($championshipId)
    {
        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race)
            return response()->json(['message' => 'Corrida não encontrada'], 404);

        $results = RaceResult::where('race_id', $race->id)
            ->with(['category', 'user'])
            ->orderBy('lap', 'desc')
            ->orderBy('net_time', 'asc')
            ->orderBy('position_general', 'asc')
            ->get();

        return response()->json($results);
    }

    /**
     * Atualizar manual (Digitação)
     */
    public function update(Request $request, $id)
    {
        $result = RaceResult::findOrFail($id);
        $result->update($request->only(['net_time', 'gross_time', 'position_general', 'position_category', 'bib_number', 'team_name']));
        return response()->json($result);
    }

    /**
     * Adicionar um atleta manualmente (Admin)
     */
    public function store(Request $request, $championshipId)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:255',
            'document' => 'required|string|max:255',
            'birth_date' => 'required|date',
            'gender' => 'required|string|in:M,F,O',
            'category_id' => 'required|exists:categories,id',
            'team_name' => 'nullable|string|max:255',
            'team' => 'nullable|string|max:255',
            'equipe' => 'nullable|string|max:255',
            'status_payment' => 'required|string|in:pending,paid,cancelled',
        ]);

        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race)
            return response()->json(['error' => 'Corrida não encontrada'], 404);

        try {
            DB::beginTransaction();
            $user = User::where('cpf', $request->document)->orWhere('rg', $request->document)->orWhere('document_number', $request->document)->first();

            if ($user && RaceResult::where('race_id', $race->id)->where('user_id', $user->id)->exists()) {
                return response()->json(['error' => 'Atleta já cadastrado.'], 422);
            }

            if (!$user) {
                $user = User::create([
                    'name' => $request->name,
                    'email' => $request->email ?? (preg_replace('/[^0-9]/', '', $request->document) . '@esportivo.com.br'),
                    'phone' => $request->phone,
                    'cpf' => $request->document,
                    'birth_date' => $request->birth_date,
                    'gender' => $request->gender,
                    'club_id' => $race->championship->club_id,
                    'password' => bcrypt(Str::random(12)),
                ]);
            }

            // Handle Photo Upload
            if ($request->hasFile('photo')) {
                $file = $request->file('photo');
                $filename = Str::slug($user->name) . '-' . time() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('players', $filename, 'public');
                
                $user->photo_path = $path;
                $user->photos = [$path];
                $user->save();

                // Trigger Background Removal if requested
                if ($request->boolean('remove_bg')) {
                    try {
                        $php = PHP_BINARY;
                        $artisan = base_path('artisan');
                        $escapedPhp = escapeshellarg($php);
                        $escapedArtisan = escapeshellarg($artisan);
                        $escapedUserId = escapeshellarg((int)$user->id);
                        $cmd = "{$escapedPhp} {$escapedArtisan} player:process-photos {$escapedUserId}";
                        
                        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                            pclose(popen("start /B " . $cmd, "r"));
                        } else {
                            exec("nohup {$cmd} > /dev/null 2>&1 & disown");
                        }
                    } catch (\Exception $e) {
                        Log::error("RaceResultController AI Trigger Error: " . $e->getMessage());
                    }
                }
            }

            $lastBib = RaceResult::where('race_id', $race->id)->max(DB::raw('CAST(bib_number AS SIGNED)'));
            $result = RaceResult::create([
                'race_id' => $race->id,
                'user_id' => $user->id,
                'name' => $user->name,
                'team_name' => $request->input('team_name', $request->input('team', $request->input('equipe', null))),
                'bib_number' => (string) ($lastBib ? $lastBib + 1 : 1),
                'category_id' => $request->category_id,
                'status_payment' => $request->status_payment,
                'payment_method' => $request->payment_method
            ]);

            DB::commit();
            return response()->json($result->load(['user', 'category']), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Excluir inscrição/resultado de atleta
     */
    public function destroy($id)
    {
        $result = RaceResult::findOrFail($id);

        try {
            \App\Services\AuditLogger::log('race_result.delete', "Excluiu a inscrição do atleta '{$result->name}' (ID: {$result->id}, BIB: {$result->bib_number}) da corrida #{$result->race_id}", [
                'race_result_id' => $result->id,
                'race_id' => $result->race_id,
                'user_id' => $result->user_id,
                'bib_number' => $result->bib_number,
                'athlete_name' => $result->name
            ]);
        } catch (\Throwable $e) {
            Log::warning("Falha ao registrar audit log na exclusão do race result: " . $e->getMessage());
        }

        $result->delete();
        return response()->json(['message' => 'Inscrição removida com sucesso!']);
    }

    /**
     * Importar CSV
     */
    public function uploadCsv(Request $request, $championshipId)
    {
        $request->validate(['file' => 'required|file']);
        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race)
            return response()->json(['error' => 'Corrida não encontrada'], 404);

        try {
            DB::beginTransaction();
            $fileData = file($request->file('file')->getRealPath());
            $delimiter = str_contains($fileData[0] ?? '', ';') ? ';' : ',';
            $data = array_map(fn($line) => str_getcsv($line, $delimiter), $fileData);
            $header = array_map(fn($h) => strtoupper(trim($h)), array_shift($data));

            $cols = [
                'bib' => array_search('PEITO', $header) !== false ? array_search('PEITO', $header) : array_search('NUMERO', $header),
                'name' => array_search('NOME', $header),
                'doc' => array_search('CPF', $header) !== false ? array_search('CPF', $header) : array_search('DOCUMENTO', $header),
                'cat' => array_search('CATEGORIA', $header),
                'team' => array_search('EQUIPE', $header) !== false ? array_search('EQUIPE', $header) : (array_search('TIME', $header) !== false ? array_search('TIME', $header) : array_search('ASSESSORIA', $header)),
            ];

            foreach ($data as $row) {
                if (empty($row) || count($row) < 2)
                    continue;
                $name = trim($row[$cols['name']] ?? '');
                $catName = trim($row[$cols['cat']] ?? '');
                if (!$name || !$catName)
                    continue;

                $cat = Category::where('championship_id', $championshipId)->where('name', 'like', "%$catName%")->first();
                if (!$cat)
                    continue;

                $bib = trim($row[$cols['bib']] ?? '');
                if (!$bib) {
                    $lastBib = RaceResult::where('race_id', $race->id)->max(DB::raw('CAST(bib_number AS SIGNED)'));
                    $bib = (string) ($lastBib ? $lastBib + 1 : 1);
                }

                $teamName = ($cols['team'] !== false && isset($row[$cols['team']])) ? trim($row[$cols['team']]) : null;
                $updateData = ['name' => $name, 'category_id' => $cat->id];
                if ($teamName) {
                    $updateData['team_name'] = $teamName;
                }

                RaceResult::updateOrCreate(['race_id' => $race->id, 'bib_number' => $bib], $updateData);
            }
            DB::commit();
            return response()->json(['message' => 'Importação concluída!']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Atualizar apenas o pagamento (Manual / Backup ao webhook)
     */
    public function updatePayment(Request $request, $id)
    {
        $request->validate([
            'status_payment' => 'required|in:pending,paid,cancelled',
            'payment_method' => 'nullable|string|max:50',
            'send_email'     => 'nullable|boolean'
        ]);

        $result = RaceResult::with(['user', 'category.parent', 'race.championship.club'])->findOrFail($id);
        
        $oldStatus = $result->status_payment;
        $newStatus = $request->input('status_payment');
        $paymentMethod = $request->input('payment_method', $result->payment_method ?? 'pix');
        $sendEmail = $request->boolean('send_email', false);

        $result->status_payment = $newStatus;
        $result->payment_method = $paymentMethod;
        $result->save();

        // Se mudou para pago e antes não era pago, dar baixa nos brindes e produtos extras (se aplicável)
        if ($newStatus === 'paid' && $oldStatus !== 'paid') {
            // Baixa no Estoque dos Brindes (Produtos Inclusos na Categoria)
            if ($result->category) {
                try {
                    $included = $result->category->products();
                    if ($included && $included->count() > 0) {
                        foreach ($included as $item) {
                            $product = $item['product'];
                            $qty = $item['quantity'] ?? 1;
                            if ($product && $product->stock_quantity !== null) {
                                $product->decrement('stock_quantity', $qty);
                                Log::info("Manual payment: Stock reduced for Gift Product {$product->id}: -{$qty} (RaceResult {$result->id})");
                            }
                        }
                    }
                } catch (\Throwable $stockEx) {
                    Log::error("Erro manual ao baixar estoque de brindes RR {$result->id}: " . $stockEx->getMessage());
                }
            }

            // Baixa no Estoque dos Itens de Loja Adicionais
            try {
                if ($result->shop_items && is_array($result->shop_items)) {
                    foreach ($result->shop_items as $item) {
                        $prod = Product::find($item['product_id']);
                        if ($prod && $prod->stock_quantity !== null) {
                            $prod->decrement('stock_quantity', $item['quantity'] ?? 1);
                            Log::info("Manual payment: Stock reduced for Additional Shop Item {$prod->id}: -" . ($item['quantity'] ?? 1));
                        }
                    }
                }
            } catch (\Throwable $stockEx) {
                Log::error("Erro manual ao baixar estoque de loja RR {$result->id}: " . $stockEx->getMessage());
            }
        }

        // Se solicitado envio de e-mail e possui e-mail cadastrado
        if ($sendEmail && $result->user && $result->user->email) {
            try {
                if ($newStatus === 'paid') {
                    // Envia confirmação com comprovante em PDF se possível
                    try {
                        $receiptController = new \App\Http\Controllers\ReceiptController();
                        $pdf = $receiptController->generatePdf($result);
                        $pdfContent = $pdf->output();

                        Mail::to($result->user->email)->send(
                            (new InscriptionConfirmedMail($result))
                                ->attachData($pdfContent, 'comprovante_inscricao.pdf', [
                                    'mime' => 'application/pdf',
                                ])
                        );
                    } catch (\Throwable $pdfEx) {
                        Log::warning("Falha ao gerar PDF no updatePayment manual, enviando sem anexo: " . $pdfEx->getMessage());
                        Mail::to($result->user->email)->send(new InscriptionConfirmedMail($result));
                    }
                } elseif ($newStatus === 'pending') {
                    $paymentInfo = $result->payment_info ?? [];
                    Mail::to($result->user->email)->send(new InscriptionPaymentMail($result, $paymentInfo));
                }
            } catch (\Throwable $mailEx) {
                Log::error("Erro ao enviar e-mail após alteração manual de pagamento RR {$result->id}: " . $mailEx->getMessage());
            }
        }

        return response()->json([
            'message' => 'Pagamento atualizado com sucesso!',
            'result'  => $result->load(['user', 'category'])
        ]);
    }

    /**
     * Exportar CSV de Atletas Personalizável (Camiseta, Equipe, Categoria, Seleção de Colunas)
     */
    public function exportCsv(Request $request, $championshipId)
    {
        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race) {
            return response()->json(['error' => 'Corrida não encontrada para este campeonato.'], 404);
        }

        $query = RaceResult::where('race_id', $race->id)->with(['category.parent', 'user']);

        // Filtro opcional por categoria (se selecionado na tela/modal)
        if ($request->filled('category_id') && $request->category_id !== 'all') {
            $catId = $request->category_id;
            $subCatIds = Category::where('parent_id', $catId)->pluck('id')->toArray();
            $targetCatIds = array_merge([$catId], $subCatIds);
            $query->whereIn('category_id', $targetCatIds);
        }

        // Filtro opcional por status de pagamento (se selecionado no modal)
        if ($request->filled('status_payment') && $request->status_payment !== 'all') {
            $query->where('status_payment', $request->status_payment);
        }

        // Filtro opcional por busca (se digitado na tela)
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('bib_number', 'like', "%{$search}%")
                  ->orWhere('team_name', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('cpf', 'like', "%{$search}%")
                         ->orWhere('name', 'like', "%{$search}%")
                         ->orWhere('phone', 'like', "%{$search}%");
                  });
            });
        }

        $results = $query->get();

        // Pré-carregar todos os produtos citados em gifts ou shop_items para extrair camiseta e brindes
        $productIds = [];
        foreach ($results as $r) {
            if (is_array($r->gifts)) {
                foreach ($r->gifts as $g) {
                    if (!empty($g['product_id'])) $productIds[] = $g['product_id'];
                }
            }
            if (is_array($r->shop_items)) {
                foreach ($r->shop_items as $s) {
                    if (!empty($s['product_id'])) $productIds[] = $s['product_id'];
                }
            }
        }
        $productsMap = !empty($productIds)
            ? Product::whereIn('id', array_unique($productIds))->get()->keyBy('id')
            : collect([]);

        // Ordenação
        $orderBy = $request->input('order_by', 'category');
        if ($orderBy === 'bib') {
            $sorted = $results->sortBy(fn($r) => (int) ($r->bib_number ?: 999999))->values();
        } elseif ($orderBy === 'name') {
            $sorted = $results->sortBy(fn($r) => mb_strtolower($r->name ?: ($r->user?->name ?? '')))->values();
        } else {
            // Padrão: 1º Categoria Principal, 2º Subcategoria, 3º Ordem Alfabética (A-Z)
            $sorted = $results->sort(function ($a, $b) {
                $mainCatA = $a->category?->parent ? $a->category->parent->name : ($a->category?->name ?? 'Geral');
                $mainCatB = $b->category?->parent ? $b->category->parent->name : ($b->category?->name ?? 'Geral');
                $cmpMain = strcasecmp($mainCatA, $mainCatB);
                if ($cmpMain !== 0) return $cmpMain;

                $subCatA = $a->category?->parent ? $a->category->name : '';
                $subCatB = $b->category?->parent ? $b->category->name : '';
                $cmpSub = strcasecmp($subCatA, $subCatB);
                if ($cmpSub !== 0) return $cmpSub;

                $nameA = $a->name ?: ($a->user?->name ?? '');
                $nameB = $b->name ?: ($b->user?->name ?? '');
                return strcasecmp($nameA, $nameB);
            })->values();
        }

        // Mapa de todas as colunas possíveis
        $availableColumns = [
            'bib_number'     => 'BIB (PEITO)',
            'name'           => 'NOME DO ATLETA',
            'team_name'      => 'EQUIPE',
            'category'       => 'CATEGORIA',
            'subcategory'    => 'SUBCATEGORIA',
            'shirt_size'     => 'TAMANHO CAMISA',
            'gifts'          => 'KIT / BRINDES INCLUSOS',
            'shop_items'     => 'PRODUTOS EXTRAS',
            'status_payment' => 'STATUS PAGAMENTO',
            'payment_method' => 'FORMA PAGAMENTO',
            'kit_delivered'  => 'KIT ENTREGUE',
            'created_at'     => 'DATA INSCRICAO',
            'cpf'            => 'CPF / DOCUMENTO',
            'phone'          => 'TELEFONE / WHATSAPP',
            'email'          => 'E-MAIL',
            'birth_date'     => 'DATA NASCIMENTO',
            'age'            => 'IDADE',
            'gender'         => 'GENERO',
            'is_pcd'         => 'PCD',
            'address'        => 'ENDERECO'
        ];

        // Determinar colunas selecionadas
        $selectedKeys = [];
        if ($request->filled('columns')) {
            $rawCols = is_array($request->columns) ? $request->columns : explode(',', $request->columns);
            $selectedKeys = array_values(array_intersect(array_map('trim', $rawCols), array_keys($availableColumns)));
        }

        if (empty($selectedKeys)) {
            // Colunas padrão caso não seja especificado
            $selectedKeys = [
                'bib_number', 'name', 'team_name', 'category', 'subcategory',
                'shirt_size', 'gifts', 'cpf', 'phone', 'birth_date', 'age',
                'gender', 'is_pcd', 'status_payment', 'payment_method'
            ];
        }

        $headersCsv = array_map(fn($key) => $availableColumns[$key], $selectedKeys);

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="atletas_inscritos.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($sorted, $selectedKeys, $headersCsv, $productsMap) {
            $file = fopen('php://output', 'w');

            // UTF-8 BOM para garantir acentuação e caracteres corretos no Excel brasileiro
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // Linha de cabeçalho com as colunas selecionadas
            fputcsv($file, $headersCsv, ';');

            foreach ($sorted as $row) {
                $mainCat = $row->category?->parent ? $row->category->parent->name : ($row->category?->name ?? 'Geral');
                $subCat = $row->category?->parent ? $row->category->name : '-';

                // Processar Brindes e extrair Tamanho da Camiseta
                $shirtSizes = [];
                $giftsList = [];
                if (is_array($row->gifts)) {
                    foreach ($row->gifts as $g) {
                        $pId = $g['product_id'] ?? null;
                        $prod = $pId ? ($productsMap[$pId] ?? null) : null;
                        $prodName = $prod ? $prod->name : "Produto #$pId";
                        $variant = $g['variant'] ?? null;

                        $giftsList[] = $prodName . ($variant ? " ($variant)" : "");

                        $isShirt = preg_match('/(camis|camiseta|t-shirt|baby\s*look|regata)/i', $prodName);
                        if ($isShirt && $variant) {
                            $shirtSizes[] = $variant;
                        } elseif (!$isShirt && $variant && empty($shirtSizes) && count($row->gifts) === 1) {
                            $shirtSizes[] = $variant;
                        }
                    }
                }

                // Processar Itens Extras da Loja
                $shopList = [];
                if (is_array($row->shop_items)) {
                    foreach ($row->shop_items as $s) {
                        $pId = $s['product_id'] ?? null;
                        $prod = $pId ? ($productsMap[$pId] ?? null) : null;
                        $prodName = $prod ? $prod->name : "Produto #$pId";
                        $variant = $s['variant'] ?? null;
                        $qty = $s['quantity'] ?? 1;

                        $shopList[] = $prodName . ($variant ? " ($variant)" : "") . ($qty > 1 ? " x$qty" : "");

                        if (empty($shirtSizes) && preg_match('/(camis|camiseta|t-shirt|baby\s*look|regata)/i', $prodName) && $variant) {
                            $shirtSizes[] = $variant;
                        }
                    }
                }

                $shirtSizeFinal = !empty($shirtSizes) ? implode(', ', array_unique($shirtSizes)) : '-';
                $giftsSummary = !empty($giftsList) ? implode('; ', $giftsList) : '-';
                $shopSummary = !empty($shopList) ? implode('; ', $shopList) : '-';

                // Data de nascimento e idade
                $birthDateFormatted = '';
                $age = '';
                if ($row->user?->birth_date) {
                    try {
                        $parsedDate = \Carbon\Carbon::parse($row->user->birth_date);
                        $birthDateFormatted = $parsedDate->format('d/m/Y');
                        $age = (string) $parsedDate->age;
                    } catch (\Exception $e) {
                        $birthDateFormatted = (string) $row->user->birth_date;
                    }
                }

                $statusMap = [
                    'paid' => 'PAGO',
                    'pending' => 'PENDENTE',
                    'cancelled' => 'CANCELADO'
                ];
                $statusLabel = $statusMap[$row->status_payment] ?? strtoupper($row->status_payment ?? 'PENDENTE');

                $genderMap = [
                    'M' => 'MASCULINO',
                    'F' => 'FEMININO',
                    'O' => 'OUTRO'
                ];
                $genderLabel = $genderMap[$row->user?->gender ?? ''] ?? ($row->user?->gender ?? 'MISTO');

                // Montar cada coluna dinamicamente de acordo com a seleção
                $lineValues = [];
                foreach ($selectedKeys as $key) {
                    switch ($key) {
                        case 'bib_number':
                            $lineValues[] = $row->bib_number ?: '--';
                            break;
                        case 'name':
                            $lineValues[] = $row->name ?: ($row->user?->name ?? '');
                            break;
                        case 'team_name':
                            $lineValues[] = $row->team_name ?? '';
                            break;
                        case 'category':
                            $lineValues[] = $mainCat;
                            break;
                        case 'subcategory':
                            $lineValues[] = $subCat;
                            break;
                        case 'shirt_size':
                            $lineValues[] = $shirtSizeFinal;
                            break;
                        case 'gifts':
                            $lineValues[] = $giftsSummary;
                            break;
                        case 'shop_items':
                            $lineValues[] = $shopSummary;
                            break;
                        case 'status_payment':
                            $lineValues[] = $statusLabel;
                            break;
                        case 'payment_method':
                            $lineValues[] = strtoupper($row->payment_method ?? '');
                            break;
                        case 'kit_delivered':
                            $lineValues[] = $row->kit_delivered ? 'SIM' . ($row->kit_delivered_at ? ' (' . $row->kit_delivered_at->format('d/m/Y H:i') . ')' : '') : 'NÃO';
                            break;
                        case 'created_at':
                            $lineValues[] = $row->created_at ? $row->created_at->format('d/m/Y H:i') : '';
                            break;
                        case 'cpf':
                            $lineValues[] = $row->user?->cpf ?? '';
                            break;
                        case 'phone':
                            $lineValues[] = $row->user?->phone ?? '';
                            break;
                        case 'email':
                            $lineValues[] = $row->user?->email ?? '';
                            break;
                        case 'birth_date':
                            $lineValues[] = $birthDateFormatted;
                            break;
                        case 'age':
                            $lineValues[] = $age;
                            break;
                        case 'gender':
                            $lineValues[] = $genderLabel;
                            break;
                        case 'is_pcd':
                            $lineValues[] = $row->is_pcd ? 'SIM' : 'NÃO';
                            break;
                        case 'address':
                            $lineValues[] = $row->user?->address ?? '';
                            break;
                        default:
                            $lineValues[] = '';
                            break;
                    }
                }

                fputcsv($file, $lineValues, ';');
            }
            fclose($file);
        }, 200, $headers);
    }

    /**
     * Reenviar email de status
     */
    public function resendEmail(Request $request, $id)
    {
        $result = RaceResult::with(['user', 'category', 'race.championship.club'])->findOrFail($id);
        
        if (!$result->user || !$result->user->email) {
            return response()->json(['error' => 'Atleta não possui email cadastrado.'], 400);
        }

        try {
            if ($result->status_payment === 'paid') {
                Mail::to($result->user->email)->send(new InscriptionConfirmedMail($result));
            } else {
                $paymentInfo = $result->payment_info ?? [];

                // Tenta gerar a cobrança no Asaas se não existir
                if (empty($paymentInfo) && $result->category && $result->category->price > 0 && $result->race && $result->race->championship && $result->race->championship->club) {
                    try {
                        $asaas = new \App\Services\AsaasService($result->race->championship->club);
                        $payment = $asaas->createPayment(
                            $result->user,
                            $result->category->price,
                            "Inscrição: {$result->race->championship->name} - {$result->name}",
                            "RR_{$result->id}",
                            null,
                            $result->payment_method ?? 'UNDEFINED'
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
                            
                            $result->payment_info = $paymentInfo;
                            $result->asaas_payment_id = $payment['id'];
                            $result->save();
                        }
                    } catch (\Exception $pe) {
                        Log::error("Erro ao gerar Asaas no resendEmail: " . $pe->getMessage());
                    }
                }

                Mail::to($result->user->email)->send(new InscriptionPaymentMail($result, $paymentInfo));
            }
            return response()->json(['message' => 'Email enviado com sucesso.']);
        } catch (\Exception $e) {
            Log::error('Erro ao reenviar email: ' . $e->getMessage());
            return response()->json(['error' => 'Erro ao enviar email: ' . $e->getMessage()], 500);
        }
    }
}
