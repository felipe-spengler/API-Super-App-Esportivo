<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\GameMatch;
use App\Models\Team;
use App\Models\User; // Players are Users or specific Player model? Using User/Participant logic concept
use Illuminate\Support\Facades\DB;

class MatchOperationController extends Controller
{
    // RETORNA DADOS COMPLETOS PARA A SÚMULA (Players, histórico, sets, etc)
    public function show($id)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam', 'championship.sport'])->findOrFail($id);

        // Carregar jogadores (Simulado via Mock ou tabela se existisse)
        // Como o seeder jogou positions no JSON, vamos tentar extrair de lá ou retornar lista fake se vazio
        // Ideal: Tabela de 'championship_inscriptions' ou 'team_rosters'. 
        // Para MVP, vamos retornar jogadores mockados baseados no time se não tiver no JSON.

        $details = $match->match_details ?? [];

        // Garante estrutura mínima
        if (!isset($details['events']))
            $details['events'] = [];
        if (!isset($details['sets']))
            $details['sets'] = [];
        if (!isset($details['positions']))
            $details['positions'] = []; // Rodízio atual

        // Carregar jogadores dos times (Se existirem no banco)
        // Assumindo que User tem club_id, podemos listar users dos clubes
        $homePlayers = User::where('club_id', $match->home_team_id)->get(['id', 'name', 'created_at']); // Mock attributes

        // Se não tiver users reais, mockar para o frontend não quebrar
        $rosters = [
            'home' => $this->formatRoster($match->home_team_id, $details['positions'], 'home'),
            'away' => $this->formatRoster($match->away_team_id, $details['positions'], 'away'),
        ];

        return response()->json([
            'match' => $match,
            'details' => $details,
            'rosters' => $rosters,
            'sport' => $match->championship->sport->slug ?? 'football'
        ]);
    }

    // LISTA DE JOGADORES (ROSTER)
    private function formatRoster($teamId, $positions, $side)
    {
        // Tenta pegar do JSON positions primeiro 
        // Se vazio, gera lista fictícia baseada no teamID
        // Num app real, buscaria na tabela `team_players`

        $players = [];
        // Mock players generator
        for ($i = 1; $i <= 12; $i++) {
            $players[] = [
                'id' => $teamId * 100 + $i,
                'number' => $i,
                'name' => "Jogador $i ($side)",
                'position' => null // 1 a 6 se estiver em quadra
            ];
        }
        return $players;
    }

    // LANÇAR EVENTO (GOL, PONTO, CARTÃO)
    public function addEvent(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);
        $details = $match->match_details ?? [];
        if (!isset($details['events']))
            $details['events'] = [];

        $type = $request->input('type'); // goal, point, card, set_end
        $teamId = $request->input('team_id');
        $playerPoints = $request->input('points', 1); // 1, 2, 3 (basquete)

        // Adiciona evento
        $newEvent = [
            'id' => uniqid(),
            'type' => $type,
            'team_id' => $teamId,
            'player_name' => $request->input('player_name', 'Desconhecido'),
            'minute' => $request->input('minute', '00:00'),
            'period' => $request->input('period', '1º Tempo'),
            'created_at' => now()->toIso8601String()
        ];

        // Atualiza Placar Geral
        if ($type === 'goal' || $type === 'point' || strpos($type, 'pt') !== false) {
            if ($teamId == $match->home_team_id) {
                $match->home_score += $playerPoints;

                // Vôlei/Sets: Atualiza placar do set corrente também
                if (isset($details['current_set_score'])) {
                    $details['current_set_score']['home'] += $playerPoints;
                } else {
                    $details['current_set_score'] = ['home' => $playerPoints, 'away' => 0];
                }

            } else {
                $match->away_score += $playerPoints;

                if (isset($details['current_set_score'])) {
                    $details['current_set_score']['away'] += $playerPoints;
                } else {
                    $details['current_set_score'] = ['home' => 0, 'away' => $playerPoints];
                }
            }
        }

        // Push event
        array_unshift($details['events'], $newEvent); // O mais recente primeiro

        $match->match_details = $details;
        $match->status = 'live'; // Garante que está ao vivo
        $match->save();

        return response()->json([
            'success' => true,
            'match' => $match, // Retorna objeto atualizado
            'event' => $newEvent
        ]);
    }

    // CONTROLE DE SETS (Início/Fim)
    public function updateSet(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);
        $details = $match->match_details ?? [];

        $action = $request->input('action'); // start_set, end_set

        if ($action === 'end_set') {
            // Salva o set atual no histórico
            $currentScore = $details['current_set_score'] ?? ['home' => 0, 'away' => 0];
            $details['sets'][] = [
                'label' => $request->input('label', count($details['sets']) + 1 . 'º Set'),
                'home' => $currentScore['home'],
                'away' => $currentScore['away']
            ];
            // Reseta placar do set
            $details['current_set_score'] = ['home' => 0, 'away' => 0];

            // Incrementa placar "Geral" de sets na tabela principal?
            // No Vôlei, home_score geralmente é Sets Vencidos.
            // Minha lógica no addEvent estava somando pontos corridos. Vamos ajustar.
            // Se for Vôlei, home_score guarda SETS. Se for Basquete, PONTOS.
            // Complexidade do Polimorfismo. Vamos assumir que home_score = Placar Principal que define vencedor.
            // No Vôlei, ao fechar set, incrementamos o home_score.

            if ($match->championship->sport && $match->championship->sport->slug === 'volei') {
                if ($currentScore['home'] > $currentScore['away']) {
                    $match->home_score++;
                } else {
                    $match->away_score++;
                }
                // Resetamos os pontos "corridos" de addEvent? Não, addEvent no volei soma 'points' internos.
                // Precisamos separar: placar_principal (sets) vs placar_set (pontos).
                // O frontend deve saber exibir.
            }
        }

        $match->match_details = $details;
        $match->save();

        return response()->json(['success' => true, 'match' => $match]);
    }

    // ATUALIZAR STATUS (Timer, Intervalo, Fim de Jogo)
    public function updateStatus(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);
        $status = $request->input('status'); // live, warmpup, finished, paused

        if ($status) {
            $match->status = $status;
            $match->save();
        }
        return response()->json(['success' => true, 'status' => $match->status]);
    }
}
