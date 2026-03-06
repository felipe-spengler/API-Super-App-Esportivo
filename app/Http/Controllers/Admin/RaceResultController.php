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

            if ($user) {
                // VERIFICAÇÃO DE DUPLICIDADE: Atleta já está nesta corrida?
                $exists = RaceResult::where('race_id', $race->id)
                    ->where('user_id', $user->id)
                    ->exists();

                if ($exists) {
                    return response()->json(['error' => 'Este atleta já está cadastrado nesta corrida.'], 422);
                }
            } else {
                $user = User::create([
                    'name' => $request->name,
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
}
