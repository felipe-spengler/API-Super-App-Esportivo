<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Race;
use App\Models\RaceResult;
use App\Models\User;
use App\Models\Category;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
            ->orderBy('position_general', 'asc')
            ->orderBy('net_time', 'asc')
            ->get();

        return response()->json($results);
    }

    /**
     * Atualizar manual (Digitação)
     */
    public function update(Request $request, $id)
    {
        $result = RaceResult::findOrFail($id);
        $result->update($request->only(['net_time', 'gross_time', 'position_general', 'position_category', 'bib_number']));
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

            $lastBib = RaceResult::where('race_id', $race->id)->max(DB::raw('CAST(bib_number AS SIGNED)'));
            $result = RaceResult::create([
                'race_id' => $race->id,
                'user_id' => $user->id,
                'name' => $user->name,
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
                'bib' => array_search('PEITO', $header) ?: array_search('NUMERO', $header),
                'name' => array_search('NOME', $header),
                'doc' => array_search('CPF', $header) ?: array_search('DOCUMENTO', $header),
                'cat' => array_search('CATEGORIA', $header),
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

                RaceResult::updateOrCreate(['race_id' => $race->id, 'bib_number' => $bib], ['name' => $name, 'category_id' => $cat->id]);
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
     * Exportar CSV de Atletas
     */
    public function exportCsv($championshipId)
    {
        $race = Race::where('championship_id', $championshipId)->first();
        if (!$race)
            return response()->json(['error' => 'Corrida não encontrada'], 404);
        $results = RaceResult::where('race_id', $race->id)->with(['category', 'user'])->get();

        $headers = ['Content-Type' => 'text/csv', 'Content-Disposition' => 'attachment; filename="inscritos.csv"'];
        return response()->stream(function () use ($results) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['BIB', 'NOME', 'CATEGORIA', 'DOCUMENTO', 'GENERO', 'STATUS', 'METODO']);
            foreach ($results as $row) {
                fputcsv($file, [$row->bib_number, $row->name, $row->category->name ?? 'Geral', $row->user->cpf ?? '', $row->user->gender ?? 'MISTO', $row->status_payment, $row->payment_method]);
            }
            fclose($file);
        }, 200, $headers);
    }
}
