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
            'phone' => 'required|string|max:20',
            'document' => 'required|string|max:20', // CPF ou RG
            'birth_date' => 'required|date',
            'gender' => 'required|string|in:M,F,O',
            'category_id' => 'required|exists:categories,id',
            'photo' => 'nullable|image|mimes:jpeg,png,jpg|max:4096',
            'remove_bg' => 'nullable|boolean',
        ]);

        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race) {
            return response()->json(['error' => 'Corrida não encontrada'], 404);
        }

        try {
            DB::beginTransaction();

            // 1. Buscar ou criar o usuário pelo documento (CPF/RG)
            $user = User::where('cpf', $request->document)
                ->orWhere('rg', $request->document)
                ->orWhere('document_number', $request->document)
                ->first();

            if (!$user) {
                // Tenta limpar o CPF/RG para busca mais robusta se necessário
                $user = User::create([
                    'name' => $request->name,
                    'phone' => $request->phone,
                    'cpf' => $request->document,
                    'birth_date' => $request->birth_date,
                    'gender' => $request->gender,
                    'club_id' => $race->championship->club_id ?? null,
                    'password' => bcrypt(Str::random(12)), // Senha aleatória inicial
                ]);
            }

            // 2. Upload da Foto se enviada
            if ($request->hasFile('photo')) {
                $imageController = new ImageUploadController();
                $photoRequest = new Request();
                $photoRequest->files->set('photo', $request->file('photo'));
                $photoRequest->merge(['remove_bg' => $request->boolean('remove_bg')]);

                // Chamamos o método interno de upload do controller (precisa ser público)
                $uploadResult = $imageController->uploadPlayerPhoto($photoRequest, $user->id);
                // O uploadPlayerPhoto já salva o caminho no $user->photos e $user->photo_path
            }

            // 3. Geração Automática de Número de Peito (Serial para esta corrida)
            $lastBib = RaceResult::where('race_id', $race->id)->max(DB::raw('CAST(bib_number AS SIGNED)'));
            $newBib = $lastBib ? $lastBib + 1 : 1;

            // 4. Criar o registro da corrida
            $result = RaceResult::create([
                'race_id' => $race->id,
                'user_id' => $user->id,
                'name' => $user->name,
                'bib_number' => (string) $newBib,
                'category_id' => $request->category_id,
                // net_time etc ficam nulos até a apuração
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
            'file' => 'required|file|mimes:csv,txt,xlsx',
        ]);

        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race)
            return response()->json(['error' => 'Corrida não encontrada'], 404);

        try {
            DB::beginTransaction();

            $file = $request->file('file');
            $data = array_map('str_getcsv', file($file->getRealPath()));

            $header = array_shift($data); // Remove cabeçalho (assumindo que tem)

            // Mapeamento simples: assumindo colunas fixas por enquanto ou tentando detectar
            // Ex esperado: PETO;NOME;TEMPO;CATEGORIA;POS_GERAL

            $count = 0;

            foreach ($data as $row) {
                if (count($row) < 3)
                    continue;

                // Tenta mapear flexivelmente
                $bib = $row[0] ?? null;
                $name = $row[1] ?? 'Atleta Desconhecido';
                $time = $row[2] ?? null; // HH:MM:SS
                $catName = $row[3] ?? null;

                // Busca Categoria ID pelo nome string (se vier no CSV)
                $catId = null;
                if ($catName) {
                    $cat = \App\Models\Category::where('championship_id', $championshipId)
                        ->where('name', 'like', "%$catName%")
                        ->first();
                    $catId = $cat ? $cat->id : null;
                }

                RaceResult::updateOrCreate(
                    [
                        'race_id' => $race->id,
                        'bib_number' => $bib,
                    ],
                    [
                        'name' => $name,
                        'net_time' => $time,
                        'category_id' => $catId,
                        // 'position_general' => $row[4] ?? null,
                    ]
                );
                $count++;
            }

            DB::commit();
            return response()->json(['message' => "$count resultados importados com sucesso!"]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error($e);
            return response()->json(['error' => 'Erro ao processar CSV: ' . $e->getMessage()], 500);
        }
    }
}
