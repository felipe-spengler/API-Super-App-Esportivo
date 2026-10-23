<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Race;
use App\Models\RaceResult;
use App\Models\User;
use App\Models\Category;
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
     * Excluir inscrição/resultado
     */
    public function destroy($id)
    {
        RaceResult::findOrFail($id)->delete();
        return response()->json(['message' => 'Removido com sucesso!']);
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
     * Atualizar apenas o pagamento
     */
    public function updatePayment(Request $request, $id)
    {
        $result = RaceResult::findOrFail($id);
        $result->update($request->only(['status_payment', 'payment_method']));
        return response()->json($result->load(['user', 'category']));
    }

    /**
     * Exportar CSV de Atletas (Ordenado por Categoria > Subcategoria > Ordem Alfabética)
     */
    public function exportCsv(Request $request, $championshipId)
    {
        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race) {
            return response()->json(['error' => 'Corrida não encontrada para este campeonato.'], 404);
        }

        $query = RaceResult::where('race_id', $race->id)->with(['category.parent', 'user']);

        // Filtro opcional por categoria (se selecionado na tela)
        if ($request->filled('category_id') && $request->category_id !== 'all') {
            $catId = $request->category_id;
            $subCatIds = Category::where('parent_id', $catId)->pluck('id')->toArray();
            $targetCatIds = array_merge([$catId], $subCatIds);
            $query->whereIn('category_id', $targetCatIds);
        }

        // Filtro opcional por busca (se digitado na tela)
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('bib_number', 'like', "%{$search}%")
                  ->orWhere('team_name', 'like', "%{$search}%");
            });
        }

        $results = $query->get();

        // Ordenação: 1º Categoria Principal, 2º Subcategoria, 3º Ordem Alfabética do Nome (A-Z)
        $sorted = $results->sort(function ($a, $b) {
            // Categoria principal
            $mainCatA = $a->category?->parent ? $a->category->parent->name : ($a->category?->name ?? 'Geral');
            $mainCatB = $b->category?->parent ? $b->category->parent->name : ($b->category?->name ?? 'Geral');
            $cmpMain = strcasecmp($mainCatA, $mainCatB);
            if ($cmpMain !== 0) return $cmpMain;

            // Subcategoria
            $subCatA = $a->category?->parent ? $a->category->name : '';
            $subCatB = $b->category?->parent ? $b->category->name : '';
            $cmpSub = strcasecmp($subCatA, $subCatB);
            if ($cmpSub !== 0) return $cmpSub;

            // Nome do Atleta (Ordem Alfabética A-Z)
            $nameA = $a->name ?: ($a->user?->name ?? '');
            $nameB = $b->name ?: ($b->user?->name ?? '');
            return strcasecmp($nameA, $nameB);
        })->values();

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="atletas_inscritos.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($sorted) {
            $file = fopen('php://output', 'w');

            // UTF-8 BOM para garantir acentos perfeitos no Excel brasileiro
            fprintf($file, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // Cabeçalho completo para os organizadores
            fputcsv($file, [
                'BIB (PEITO)',
                'NOME DO ATLETA',
                'EQUIPE',
                'CATEGORIA',
                'SUBCATEGORIA',
                'CPF / DOCUMENTO',
                'TELEFONE',
                'DATA DE NASCIMENTO',
                'GENERO',
                'PCD',
                'STATUS PAGAMENTO',
                'METODO PAGAMENTO'
            ], ';');

            foreach ($sorted as $row) {
                $mainCat = $row->category?->parent ? $row->category->parent->name : ($row->category?->name ?? 'Geral');
                $subCat = $row->category?->parent ? $row->category->name : '-';

                $birthDateFormatted = '';
                if ($row->user?->birth_date) {
                    try {
                        $birthDateFormatted = \Carbon\Carbon::parse($row->user->birth_date)->format('d/m/Y');
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

                fputcsv($file, [
                    $row->bib_number ?: '--',
                    $row->name ?: ($row->user?->name ?? ''),
                    $row->team_name ?? '',
                    $mainCat,
                    $subCat,
                    $row->user?->cpf ?? '',
                    $row->user?->phone ?? '',
                    $birthDateFormatted,
                    $genderLabel,
                    $row->is_pcd ? 'SIM' : 'NÃO',
                    $statusLabel,
                    strtoupper($row->payment_method ?? '')
                ], ';');
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
