<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\GameMatch;
use Illuminate\Support\Facades\DB;

class VolleyballRotationController extends Controller
{
    /**
     * Obter posições atuais da quadra
     */
    public function getPositions(Request $request, $matchId)
    {
        $match = GameMatch::findOrFail($matchId);
        $setNumber = $request->query('set', 1);

        $positions = DB::table('match_positions')
            ->where('game_match_id', $matchId)
            ->where('set_number', $setNumber)
            ->get();

        // Formata para facilitar uso no frontend: [team_id => [posicao => player_id]]
        $formatted = [];
        foreach ($positions as $pos) {
            $formatted[$pos->team_id][$pos->position] = $pos->player_id;
        }

        return response()->json($formatted);
    }

    /**
     * Salvar posições (Drag & Drop)
     */
    public function savePositions(Request $request, $matchId)
    {
        $request->validate([
            'positions' => 'required|array', // [team_id => [posicao => player_id]]
            'set_number' => 'required|integer'
        ]);

        $setNumber = $request->set_number;
        $positions = $request->positions;

        DB::transaction(function () use ($matchId, $setNumber, $positions) {
            // Limpa posições atuais deste set (poderia ser update, mas delete/insert é mais limpo pra drag&drop total)
            DB::table('match_positions')
                ->where('game_match_id', $matchId)
                ->where('set_number', $setNumber)
                ->delete();

            $insertData = [];
            foreach ($positions as $teamId => $teamPositions) {
                foreach ($teamPositions as $pos => $playerId) {
                    if ($playerId && $pos >= 1 && $pos <= 6) {
                        $insertData[] = [
                            'game_match_id' => $matchId,
                            'team_id' => $teamId,
                            'player_id' => $playerId,
                            'set_number' => $setNumber,
                            'position' => $pos,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                }
            }

            if (!empty($insertData)) {
                DB::table('match_positions')->insert($insertData);
            }
        });

        return response()->json(['message' => 'Posições salvas com sucesso!']);
    }

    /**
     * Realizar Rodízio (Forward ou Backward)
     */
    public function rotate(Request $request)
    {
        $request->validate([
            'game_match_id' => 'required|exists:game_matches,id',
            'team_id' => 'required|exists:teams,id',
            'set_number' => 'required|integer',
            'direction' => 'required|in:forward,backward' // forward = horário (padrão), backward = anti-horário
        ]);

        $matchId = $request->game_match_id;
        $teamId = $request->team_id;
        $setNumber = $request->set_number;
        $direction = $request->direction;

        // Busca posições atuais (1 a 6 apenas)
        $currentPositions = DB::table('match_positions')
            ->where('game_match_id', $matchId)
            ->where('team_id', $teamId)
            ->where('set_number', $setNumber)
            ->whereBetween('position', [1, 6])
            ->pluck('player_id', 'position')
            ->toArray();

        if (count($currentPositions) != 6) {
            return response()->json(['message' => 'Posições incompletas. Necessário 6 jogadores na quadra.'], 400);
        }

        $newPositions = [];

        if ($direction === 'forward') {
            // Rotação Horária (Padrão Vôlei):
            // 1->6, 6->5, 5->4, 4->3, 3->2, 2->1
            // Mas a lógica do sistema antigo diz:
            // "O jogador que estava em P2 vai para P1 (saque)"
            // "O jogador que estava em P1 (saque) vai para P6"

            // Mapeamento: Destino <= Origem
            $newPositions[1] = $currentPositions[2];
            $newPositions[2] = $currentPositions[3];
            $newPositions[3] = $currentPositions[4];
            $newPositions[4] = $currentPositions[5];
            $newPositions[5] = $currentPositions[6];
            $newPositions[6] = $currentPositions[1];

        } else {
            // Rotação Anti-Horária (Reverter):
            // Mapeamento inverso
            $newPositions[1] = $currentPositions[6];
            $newPositions[6] = $currentPositions[5];
            $newPositions[5] = $currentPositions[4];
            $newPositions[4] = $currentPositions[3];
            $newPositions[3] = $currentPositions[2];
            $newPositions[2] = $currentPositions[1];
        }

        // Atualiza no banco
        DB::transaction(function () use ($matchId, $teamId, $setNumber, $newPositions) {
            foreach ($newPositions as $pos => $playerId) {
                DB::table('match_positions')
                    ->where('game_match_id', $matchId)
                    ->where('team_id', $teamId)
                    ->where('set_number', $setNumber)
                    ->where('position', $pos)
                    ->update(['player_id' => $playerId]);
            }
        });

        return response()->json([
            'message' => 'Rodízio realizado com sucesso!',
            'new_positions' => $newPositions
        ]);
    }
}
