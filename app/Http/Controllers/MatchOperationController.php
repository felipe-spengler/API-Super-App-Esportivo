<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\GameMatch;
use App\Models\Team;
use App\Models\User;
use App\Models\MatchSet;
use Illuminate\Support\Facades\DB;

class MatchOperationController extends Controller
{
    // RETORNA DADOS COMPLETOS PARA A SÚMULA (Players, histórico, sets, etc)
    public function show($id)
    {
        $match = GameMatch::findOrFail($id);

        // 1. CARREGAR JOGADORES FILTRADOS POR CAMPEONATO (Evitar vazamento de outros campeonatos)
        $champId = $match->championship_id;
        $match->load([
            'homeTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            },
            'awayTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            },
            'championship.sport',
            'events.player',
            'sets'
        ]);

        $details = $match->match_details ?? [];

        // 2. BUSCAR POSIÇÕES (Para Participação)
        $positions = DB::table('match_positions')
            ->where('game_match_id', $match->id)
            ->get();

        // 3. CALCULAR HORÁRIOS DOS SETS (Via Events created_at)
        $setTimes = [];
        foreach ($match->events as $event) {
            $p = $event->period;
            if (!$p) continue;
            
            // Normalize period to set number if possible (e.g. "1º Set" -> 1)
            $setNum = null;
            if (preg_match('/(\d+)/', $p, $matches)) {
                $setNum = (int)$matches[1];
            }
            if (!$setNum) continue;

            if (!isset($setTimes[$setNum])) {
                $setTimes[$setNum] = ['start' => null, 'end' => null];
            }

            $createdAt = $event->created_at;
            
            // Se for início de período, é o start definitivo
            if ($event->event_type === 'period_start' || $event->event_type === 'match_start') {
                $setTimes[$setNum]['start'] = $createdAt;
            } 
            // Se for fim de período, é o end definitivo
            elseif ($event->event_type === 'period_end' || $event->event_type === 'match_end') {
                $setTimes[$setNum]['end'] = $createdAt;
            }
            // Fallback: Earliest and Latest
            else {
                if (!$setTimes[$setNum]['start'] || $createdAt->lt($setTimes[$setNum]['start'])) {
                    $setTimes[$setNum]['start'] = $createdAt;
                }
                if (!$setTimes[$setNum]['end'] || $createdAt->gt($setTimes[$setNum]['end'])) {
                    $setTimes[$setNum]['end'] = $createdAt;
                }
            }
        }

        if (!isset($details['events'])) {
            $details['events'] = [];
        }

        // Otimização: Cache de números de camisa do campeonato atual
        $rosterNumbers = DB::table('team_players')
            ->where('championship_id', $champId)
            ->get()
            ->groupBy(['team_id', 'user_id']);

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
                ->map(function ($e) use ($eventLabels, $match, $rosterNumbers) {
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
                    if ($player && $e->team_id) {
                        $number = $rosterNumbers[$e->team_id][$player->id][0]->number ?? null;
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
        if (!isset($details['sets']) || empty($details['sets'])) {
            $sportSlug = $match->championship->sport->slug ?? '';
            $isVolley = $sportSlug === 'volei';
            
            // For all sports, if we have setTimes, we can populate a 'sets' structure for the frontend
            if ($isVolley || count($setTimes) > 0) {
                // Se for vôlei, usamos os MatchSet reais se existirem
                if ($isVolley && $match->sets->count() > 0) {
                    $details['sets'] = $match->sets
                        ->sortBy('set_number')
                        ->map(function ($s) use ($setTimes) {
                            $st = $setTimes[$s->set_number] ?? null;
                            return [
                                'id' => $s->id,
                                'set_number' => $s->set_number,
                                'home_score' => $s->home_score,
                                'away_score' => $s->away_score,
                                'status' => $s->status,
                                'start_time' => $s->start_time ?: ($st['start'] ?? null),
                                'end_time' => $s->end_time ?: ($st['end'] ?? null),
                            ];
                        })->toArray();
                } else {
                    // Para outros esportes ou vôlei sem match_sets, usamos os tempos descobertos nos eventos
                    $details['sets'] = [];
                    $maxSet = count($setTimes) > 0 ? max(array_keys($setTimes)) : ($isVolley ? 3 : 2);
                    for ($i = 1; $i <= $maxSet; $i++) {
                        $st = $setTimes[$i] ?? null;
                        $details['sets'][] = [
                            'set_number' => $i,
                            'home_score' => null, // Placar por período opcional aqui
                            'away_score' => null,
                            'start_time' => $st['start'] ?? null,
                            'end_time' => $st['end'] ?? null,
                        ];
                    }
                }
            } else {
                $details['sets'] = [];
            }
        } else {
            // Se já existirem sets no JSON (legacy), tentamos injetar os horários se faltarem
            foreach ($details['sets'] as &$s) {
                $num = $s['set_number'] ?? null;
                if ($num && empty($s['start_time'])) {
                    $s['start_time'] = $setTimes[$num]['start'] ?? null;
                }
                if ($num && empty($s['end_time'])) {
                    $s['end_time'] = $setTimes[$num]['end'] ?? null;
                }
            }
        }

        // 4. CALCULAR PARTICIPAÇÃO (Sets que cada jogador jogou)
        // Um jogador participou se:
        // - Estava em match_positions para aquele set
        // - Foi citado em evento de substitution naquele set (como player_in ou player_out)
        $participationMap = [];
        foreach ($positions as $pos) {
            $pId = $pos->player_id;
            $sNum = (int)$pos->set_number;
            if ($pId) {
                $participationMap[$pId][$sNum] = true;
            }
        }

        foreach ($match->events as $event) {
            if ($event->event_type === 'substitution') {
                $metadata = is_string($event->metadata) ? json_decode($event->metadata, true) : $event->metadata;
                $pIn = $metadata['player_in'] ?? $event->player_id;
                $pOut = $metadata['player_out'] ?? null;
                
                $setNum = 1;
                if (preg_match('/(\d+)/', $event->period, $m)) {
                    $setNum = (int)$m[1];
                }

                if ($pIn) $participationMap[$pIn][$setNum] = true;
                if ($pOut) $participationMap[$pOut][$setNum] = true;
            }
        }

        if (!isset($details['positions']))
            $details['positions'] = $positions;

        // Carregar jogadores reais dos times (Rosters já carregados e filtrados no topo)
        $rosters = [
            'home' => $this->formatRoster($match->homeTeam, $participationMap),
            'away' => $this->formatRoster($match->awayTeam, $participationMap),
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
    private function formatRoster($team, $participationMap = [])
    {
        if (!$team)
            return [];

        return $team->players->map(function ($player) use ($participationMap) {
            $pId = $player->id;
            $participatedSets = isset($participationMap[$pId]) ? array_keys($participationMap[$pId]) : [];
            
            return [
                'id' => $player->id,
                'number' => $player->pivot->number ?? '',
                'name' => $player->name,
                'nickname' => $player->nickname,
                'position' => $player->pivot->position,
                'participated_sets' => $participatedSets
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

        $champId = $match->championship_id;
        $match->load([
            'homeTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            },
            'awayTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            }
        ]);

        return response()->json([
            'success' => true,
            'match' => $match, // Retorna objeto atualizado com rosters filtrados
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

        $champId = $match->championship_id;
        $match->load([
            'homeTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            },
            'awayTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            }
        ]);

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

        $champId = $match->championship_id;
        $match->load([
            'homeTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            },
            'awayTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            }
        ]);

        return response()->json(['success' => true, 'status' => $match->status, 'match' => $match]);
    }
}
