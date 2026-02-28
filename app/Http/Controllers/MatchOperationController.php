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
        $match = GameMatch::with(['championship.sport', 'events.player'])->findOrFail($id);

        $details = $match->match_details ?? [];

        if (!isset($details['events'])) {
            $details['events'] = [];
        }

        // Se houver eventos na tabela MatchEvent, eles são a fonte de verdade
        // Tipos internos de auditoria nunca devem aparecer na página pública
        $auditTypes = ['system_error', 'user_action', 'user_action_blocked', 'timer_control', 'voice_input'];

        $eventLabels = [
            'goal' => ['label' => 'Gol', 'icon' => '⚽'],
            'yellow_card' => ['label' => 'Cartão Amarelo', 'icon' => '🟨'],
            'red_card' => ['label' => 'Cartão Vermelho', 'icon' => '🟥'],
            'blue_card' => ['label' => 'Cartão Azul', 'icon' => '🟦'],
            'foul' => ['label' => 'Falta', 'icon' => '🚩'],
            'assist' => ['label' => 'Assistência', 'icon' => '👟'],
            'mvp' => ['label' => 'Craque do Jogo', 'icon' => '⭐'],
            'timeout' => ['label' => 'Tempo Técnico', 'icon' => '⏱️'],
            'shootout_goal' => ['label' => 'Pênalti (Gol)', 'icon' => '⚽'],
            'shootout_miss' => ['label' => 'Pênalti (Erro)', 'icon' => '❌'],
            'penalty_goal' => ['label' => 'Pênalti (Gol)', 'icon' => '⚽'],
            'match_start' => ['label' => 'Início da Partida', 'icon' => '🏁'],
            'match_end' => ['label' => 'Fim de Jogo', 'icon' => '🛑'],
            'period_start' => ['label' => 'Início de Período', 'icon' => '▶️'],
            'period_end' => ['label' => 'Fim de Período', 'icon' => '⏸️'],
            'point' => ['label' => 'Ponto', 'icon' => '🏐'],
            'ace' => ['label' => 'Ponto de Saque (Ace)', 'icon' => '🏐'],
            'block' => ['label' => 'Ponto de Bloqueio', 'icon' => '🤚'],
            'ataque' => ['label' => 'Ponto de Ataque', 'icon' => '💥'],
            'bloqueio' => ['label' => 'Ponto de Bloqueio', 'icon' => '🤚'],
            'saque' => ['label' => 'Ponto de Saque (Ace)', 'icon' => '🏐'],
        ];

        if ($match->events->count() > 0) {
            $tableEvents = $match->events
                ->sortByDesc('id') // O mais recente primeiro
                ->filter(fn($e) => !in_array($e->event_type, $auditTypes))
                ->map(function ($e) use ($eventLabels, $match) {
                    $isVolley = ($match->championship->sport->slug ?? '') === 'volei';
                    $info = $eventLabels[$e->event_type] ?? ['label' => ucfirst(str_replace('_', ' ', $e->event_type)), 'icon' => '📋'];

                    // Ajuste de ícone dinâmico baseado no esporte
                    $icon = $info['icon'];
                    if ($isVolley && in_array($e->event_type, ['point', 'ace', 'ataque', 'saque', 'block', 'bloqueio'])) {
                        $icon = '🏐';
                        $metadata = is_string($e->metadata) ? json_decode($e->metadata, true) : $e->metadata;
                        if (isset($metadata['volley_type'])) {
                            $vType = $metadata['volley_type'];
                            if ($vType === 'ataque') {
                                $info['label'] = 'Ponto de Ataque';
                            } elseif ($vType === 'bloqueio') {
                                $info['label'] = 'Ponto de Bloqueio';
                            } elseif ($vType === 'saque') {
                                $info['label'] = 'Ponto de Saque (Ace)';
                            } elseif ($vType === 'erro') {
                                $info['label'] = 'Erro Adversário';
                            }
                        }
                    }

                    $player = $e->player;
                    $number = null;
                    if ($player) {
                        $number = DB::table('team_players')
                            ->where('user_id', $player->id)
                            ->where('team_id', $e->team_id ?? 0)
                            ->where('championship_id', $match->championship_id)
                            ->value('number');
                    }

                    // Resolve Player Name
                    $pName = null;
                    if ($player) {
                        $pName = $player->nickname ?: $player->name;
                    } else {
                        // For team level events or missing records, use team name if possible
                        if ($e->team_id) {
                            $team = ($e->team_id == $match->home_team_id) ? $match->homeTeam : $match->awayTeam;
                            $pName = $team->name ?? 'Equipe';
                        } else {
                            $pName = 'Equipe';
                        }
                    }

                    return [
                        'id' => $e->id,
                        'type' => $e->event_type,
                        'label' => $info['label'],
                        'icon' => $icon,
                        'team_id' => $e->team_id,
                        'player_id' => $e->player_id,
                        'player_name' => $pName,
                        'player_number' => $number,
                        'minute' => $e->game_time ?? '00:00',
                        'period' => $e->period ?? ($isVolley ? '1º Set' : '1º Tempo'),
                        'value' => $e->value,
                        'metadata' => $e->metadata,
                    ];
                })->values();
            $details['events'] = $tableEvents;
        }
        if (!isset($details['sets']))
            $details['sets'] = [];
        if (!isset($details['positions']))
            $details['positions'] = [];

        // Carrega apenas os jogadores vinculados a ESTE campeonato
        $champId = $match->championship_id;

        $match->load([
            'homeTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            },
            'awayTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            }
        ]);

        // Carregar jogadores reais dos times
        $rosters = [
            'home' => $this->formatRoster($match->homeTeam),
            'away' => $this->formatRoster($match->awayTeam),
        ];

        return response()->json([
            'match' => $match,
            'details' => $details,
            'rosters' => $rosters,
            'server_time' => now()->timestamp * 1000,
            'sport' => $match->championship->sport->slug ?? 'football'
        ]);
    }

    // LISTA DE JOGADORES (ROSTER) REAL
    private function formatRoster($team)
    {
        if (!$team)
            return [];

        return $team->players->map(function ($player) {
            return [
                'id' => $player->id,
                'number' => $player->pivot->number ?? '',
                'name' => $player->name,
                'nickname' => $player->nickname,
                'position' => $player->pivot->position
            ];
        });
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
