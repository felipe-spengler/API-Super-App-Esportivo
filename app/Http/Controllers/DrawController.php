<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\Team;
use App\Models\GameMatch;

class DrawController extends Controller
{
    // Gerar Chaves (Mata-mata simples)
    public function generateBracket(Request $request, $championshipId)
    {
        // 1. Pegar times inscritos
        // Como o MVP não tem tabela 'inscriptions' bem definida, vamos pegar Teams que 'pertencem' ao campeonato
        // Vamos supor que passamos os IDs dos times no request para simplificar
        $teamIds = $request->input('team_ids', []);

        if (count($teamIds) < 2) {
            return response()->json(['message' => 'Mínimo de 2 times necessários'], 400);
        }

        // Embaralhar
        shuffle($teamIds);

        // Criar Partidas (Round 1)
        $matches = [];
        $matchCount = count($teamIds) / 2;

        for ($i = 0; $i < $matchCount; $i++) {
            $homeId = $teamIds[$i * 2] ?? null;
            $awayId = $teamIds[($i * 2) + 1] ?? null;

            if ($homeId && $awayId) {
                $match = GameMatch::create([
                    'championship_id' => $championshipId,
                    'home_team_id' => $homeId,
                    'away_team_id' => $awayId,
                    'round' => 1,
                    'start_time' => now()->addDays(1)->addHours($i * 2), // Ex: Amanhã escalonado
                    'status' => 'scheduled'
                ]);
                $matches[] = $match;
            }
        }

        return response()->json(['message' => 'Sorteio realizado', 'matches' => $matches]);
    }
}
