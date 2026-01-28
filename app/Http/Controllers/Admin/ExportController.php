<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\GameMatch;
use App\Models\Team;
use Illuminate\Support\Facades\Response;

class ExportController extends Controller
{
    /**
     * Exportar Jogadores para CSV
     */
    public function exportPlayers(Request $request)
    {
        $query = User::query();

        if ($request->has('club_id')) {
            $query->where('club_id', $request->club_id);
        }

        $players = $query->get(['name', 'email', 'cpf', 'phone', 'birth_date']);

        $csvHeader = ["Nome", "Email", "CPF", "Telefone", "Data Nascimento"];
        $csvData = [];

        foreach ($players as $player) {
            $csvData[] = [
                $player->name,
                $player->email,
                $player->cpf,
                $player->phone,
                $player->birth_date,
            ];
        }

        return $this->generateCsv($csvHeader, $csvData, 'jogadores.csv');
    }

    /**
     * Exportar Times para CSV
     */
    public function exportTeams(Request $request)
    {
        $teams = Team::with('club')->get();

        $csvHeader = ["Nome", "Clube", "Cor Primária"];
        $csvData = [];

        foreach ($teams as $team) {
            $csvData[] = [
                $team->name,
                $team->club->name ?? 'N/A',
                $team->primary_color
            ];
        }

        return $this->generateCsv($csvHeader, $csvData, 'times.csv');
    }

    /**
     * Helper para gerar resposta CSV
     */
    private function generateCsv($header, $data, $filename)
    {
        $handle = fopen('php://temp', 'w');

        // Adicionar BOM para Excel reconhecer UTF-8 corretamente
        fputs($handle, "\xEF\xBB\xBF");

        fputcsv($handle, $header);

        foreach ($data as $row) {
            fputcsv($handle, $row);
        }

        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        return Response::make($content, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename={$filename}",
        ]);
    }
}
