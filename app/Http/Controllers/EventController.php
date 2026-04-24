<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\GameMatch;
use App\Models\Team;
use App\Models\Product;

class EventController extends Controller
{
    // 1. Listar Campeonatos de um Clube (Filtrado por Esporte)
    public function championships(Request $request, $clubId)
    {
        $query = Championship::where('club_id', $clubId);

        if ($request->has('sport_id')) {
            $query->where('sport_id', $request->sport_id);
        }

        return response()->json($query->with(['sport', 'club.city', 'races'])->orderBy('start_date', 'desc')->get());
    }

    public function publicList(Request $request)
    {
        $this->syncStatuses();

        $query = Championship::with(['club.city', 'sport', 'categories', 'races']);

        if ($request->has('status')) {
            $status = $request->status;
            if ($status === 'open') {
                $query->where('status', 'registrations_open');
            } elseif ($status === 'ongoing') {
                $query->whereIn('status', ['live', 'ongoing', 'in_progress']);
            } elseif ($status === 'finished') {
                $query->where('status', 'finished');
            } elseif ($status === 'upcoming') {
                // 'upcoming' and 'Agendado' (legacy/import) are future events
                $query->whereIn('status', ['upcoming', 'scheduled', 'Agendado']);
            }
        } else {
            // Default (Todos Ativos): Anything NOT in 'draft' or 'finished'
            // We want to show 'upcoming', 'registrations_open', 'ongoing', 'scheduled', etc.
            $query->whereNotIn('status', ['draft', 'finished']);
        }

        if ($request->has('sport_id')) {
            $query->where('sport_id', $request->sport_id);
        }

        if ($request->has('club_id')) {
            $query->where('club_id', $request->club_id);
        }

        $championships = $query->orderBy('start_date', 'asc')->get();

        return response()->json($championships);
    }

    // 2. Detalhes do Campeonato (com Categorias)
    public function championshipDetails($id)
    {
        // Carrega o campeonato com TODAS as suas categorias (pai e filhas)
        $champ = Championship::with(['categories', 'sport'])
            ->withCount('teams')
            ->findOrFail($id);

        // Processa os produtos inclusos para todas as categorias
        $champ->categories->each(function ($category) {
            if ($category->included_products) {
                $category->products_details = $category->products();
            }
        });

        return response()->json($champ);
    }




    // 3. Tabela de Jogos (Partidas)
    public function matches(Request $request, $championshipId)
    {
        $query = GameMatch::where('championship_id', $championshipId)
            ->with(['homeTeam', 'awayTeam', 'mvp'])
            ->orderBy('start_time');

        if ($request->has('category_id') && $request->category_id != 'null') {
            $query->where('category_id', $request->category_id);
        }

        return response()->json($query->get());
    }

    // 4. Tabela de Classificação
    public function leaderboard(Request $request, $championshipId)
    {
        try {
            $champ = Championship::with(['sport', 'teams'])->findOrFail($championshipId);
            $sportSlug = $champ->sport ? $champ->sport->slug : 'futebol';

            // Normalize for logic (Volei uses sets, others use goals)
            if (strpos($sportSlug, 'volei') !== false) {
                $sportSlug = 'volei';
            }

            $query = GameMatch::where('championship_id', $championshipId)
                ->with(['homeTeam', 'awayTeam'])
                ->where('status', 'finished');

            // Excluir repescagem se não estiver configurado para contar na classificação
            if (!($champ->include_repescagem_standings ?? false)) {
                $query->where(function($q) {
                    $q->where('round_name', '!=', 'Repescagem')
                      ->where('round_name', 'not like', '%Repescagem%')
                      ->orWhereNull('round_name');
                });
            }

            // Excluir mata-mata se não estiver configurado para contar na classificação
            if (!($champ->include_knockout_standings ?? false)) {
                $query->where(function($q) {
                    $q->where('is_knockout', '!=', true)
                      ->where('is_knockout', '!=', 1)
                      ->where(function($sq) {
                          $sq->whereNull('round_name')
                             ->orWhere('round_name', 'not like', '%Final%')
                             ->where('round_name', 'not like', '%Semi%')
                             ->where('round_name', 'not like', '%Quartas%')
                             ->where('round_name', 'not like', '%Oitavas%');
                      })
                      ->orWhereNull('is_knockout');
                });
            }

            if ($request->filled('category_id') && $request->category_id != 'null') {
                $query->where('category_id', $request->category_id);
            }

            $matches = $query->get();
            $teamsData = [];

            // Helper para inicializar estrutura
            $initStats = function ($name, $logo = null) {
                return [
                    'name' => $name,
                    'logo' => $logo,
                    'stats' => [ //...
                        'points' => 0,
                        'played' => 0,
                        'wins' => 0,
                        'draws' => 0,
                        'losses' => 0,
                        'goals_for' => 0,
                        'goals_against' => 0,
                        'sets_won' => 0,
                        'sets_lost' => 0
                    ]
                ];
            };

            // 1. PRIMEIRA PASSADA: Inicializa todos os times com seus grupos REAIS (do pivot/cadastro)
            $teamsQuery = $champ->teams();
            if ($request->filled('category_id') && $request->category_id != 'null') {
                $teamsQuery->wherePivot('category_id', $request->category_id);
            }
            $allTeams = $teamsQuery->get();

            foreach ($allTeams as $team) {
                $rawG = $team->pivot->group_name ?? 'Geral';
                $groupName = trim(str_ireplace('Grupo', '', $rawG));
                if (empty($groupName) && $rawG) $groupName = 'A';

                $teamsData[$team->id] = $initStats($team->name, $team->logo_url);
                $teamsData[$team->id]['id'] = $team->id;
                $teamsData[$team->id]['group_name'] = $groupName;
            }

            // 2. SEGUNDA PASSADA: Processa os jogos e soma os pontos nos times já inicializados
            foreach ($matches as $m) {
                $homeId = $m->home_team_id;
                $awayId = $m->away_team_id;
                if (!$homeId || !$awayId) continue;

                // Garante que o time existe no nosso mapa (caso tenha sido deletado ou algo assim)
                if (!isset($teamsData[$homeId])) continue;
                if (!isset($teamsData[$awayId])) continue;

                // Lógica de Pontuação
                $teamsData[$homeId]['stats']['played']++;
                $teamsData[$awayId]['stats']['played']++;

                $hScore = (int) $m->home_score;
                $aScore = (int) $m->away_score;

                // Vôlei
                if ($sportSlug == 'volei') {
                    $teamsData[$homeId]['stats']['sets_won'] += $hScore;
                    $teamsData[$homeId]['stats']['sets_lost'] += $aScore;
                    $teamsData[$awayId]['stats']['sets_won'] += $aScore;
                    $teamsData[$awayId]['stats']['sets_lost'] += $hScore;

                    if ($hScore > $aScore) {
                        $teamsData[$homeId]['stats']['wins']++;
                        $teamsData[$awayId]['stats']['losses']++;
                        $teamsData[$homeId]['stats']['points'] += 3;
                    } else {
                        $teamsData[$awayId]['stats']['wins']++;
                        $teamsData[$homeId]['stats']['losses']++;
                        $teamsData[$awayId]['stats']['points'] += 3;
                    }

                    $teamsData[$homeId]['stats']['goals_for'] = $teamsData[$homeId]['stats']['sets_won'];
                    $teamsData[$homeId]['stats']['goals_against'] = $teamsData[$homeId]['stats']['sets_lost'];
                    $teamsData[$awayId]['stats']['goals_for'] = $teamsData[$awayId]['stats']['sets_won'];
                    $teamsData[$awayId]['stats']['goals_against'] = $teamsData[$awayId]['stats']['sets_lost'];

                } elseif ($sportSlug == 'basquete') {
                    // Basquete: Não tem empate. Saldo de pontos.
                    $teamsData[$homeId]['stats']['goals_for'] += $hScore;
                    $teamsData[$homeId]['stats']['goals_against'] += $aScore;
                    $teamsData[$awayId]['stats']['goals_for'] += $aScore;
                    $teamsData[$awayId]['stats']['goals_against'] += $hScore;

                    if ($hScore > $aScore) {
                        $teamsData[$homeId]['stats']['wins']++;
                        $teamsData[$awayId]['stats']['losses']++;
                        $teamsData[$homeId]['stats']['points'] += 2; // Basquete FIBA: 2 Vitória, 1 Derrota? Vamos usar 2/0 ou 2/1 se quiser ser fiel.
                    } else {
                        $teamsData[$awayId]['stats']['wins']++;
                        $teamsData[$homeId]['stats']['losses']++;
                        $teamsData[$awayId]['stats']['points'] += 2;
                    }
                } else {
                    // Futebol / Futsal / Padrão
                    $teamsData[$homeId]['stats']['goals_for'] += $hScore;
                    $teamsData[$homeId]['stats']['goals_against'] += $aScore;
                    $teamsData[$awayId]['stats']['goals_for'] += $aScore;
                    $teamsData[$awayId]['stats']['goals_against'] += $hScore;

                    if ($hScore > $aScore) {
                        $teamsData[$homeId]['stats']['wins']++;
                        $teamsData[$awayId]['stats']['losses']++;
                        $teamsData[$homeId]['stats']['points'] += 3;
                    } elseif ($hScore < $aScore) {
                        $teamsData[$awayId]['stats']['wins']++;
                        $teamsData[$homeId]['stats']['losses']++;
                        $teamsData[$awayId]['stats']['points'] += 3;
                    } else {
                        $teamsData[$homeId]['stats']['draws']++;
                        $teamsData[$awayId]['stats']['draws']++;
                        $teamsData[$homeId]['stats']['points'] += 1;
                        $teamsData[$awayId]['stats']['points'] += 1;
                    }
                }
            }

            // O sorteio e loop de times já foi feito no início
            // mantemos o loop original limpo apenas para garantir IDs se necessário 
            // (mas foi movido para o topo para ser a fonte da verdade)

            // Manual Tiebreaker Priority
            $priority = $champ->tiebreaker_priority ?? [];
            $priorityMap = array_flip($priority);

            // Ordenação
            usort($teamsData, function ($a, $b) use ($priorityMap) {
                // Sort by Group
                $groupA = $a['group_name'] ?? 'Geral';
                $groupB = $b['group_name'] ?? 'Geral';
                if ($groupA !== $groupB) {
                    return strcmp($groupA, $groupB);
                }

                if ($a['stats']['points'] === $b['stats']['points']) {
                    // Manual Tiebreaker Priority (Immediate override if available)
                    if (isset($priorityMap[$a['id'] ?? 0]) && isset($priorityMap[$b['id'] ?? 0])) {
                        if ($priorityMap[$a['id'] ?? 0] !== $priorityMap[$b['id'] ?? 0]) {
                            return $priorityMap[$a['id'] ?? 0] <=> $priorityMap[$b['id'] ?? 0];
                        }
                    }

                    if ($a['stats']['wins'] === $b['stats']['wins']) {
                        // Saldo
                        $balA = $a['stats']['goals_for'] - $a['stats']['goals_against'];
                        $balB = $b['stats']['goals_for'] - $b['stats']['goals_against'];

                        if ($balA === $balB) {
                            // Gols Pró (Opcional, mas comum)
                            if ($a['stats']['goals_for'] === $b['stats']['goals_for']) {
                                // Ordem Alfabética as final fallback
                                return strcmp($a['name'], $b['name']);
                            }
                            return $b['stats']['goals_for'] <=> $a['stats']['goals_for'];
                        }

                        return $balB <=> $balA;
                    }
                    return $b['stats']['wins'] <=> $a['stats']['wins'];
                }
                return $b['stats']['points'] <=> $a['stats']['points'];
            });

            // Adiciona ID e posição, e transforma para o formato esperado pelo frontend
            $position = 1;
            $formatted = [];
            foreach ($teamsData as $tid => &$t) {
                if (!isset($t['id']))
                    $t['id'] = $tid;

                // Transformar estrutura para frontend
                $formatted[] = [
                    'id' => $t['id'],
                    'team_name' => $t['name'],
                    'team_logo' => $t['logo'] ?? null,
                    'position' => $position++,
                    'points' => $t['stats']['points'],
                    'played' => $t['stats']['played'],
                    'won' => $t['stats']['wins'],
                    'drawn' => $t['stats']['draws'],
                    'lost' => $t['stats']['losses'],
                    'goal_difference' => $t['stats']['goals_for'] - $t['stats']['goals_against'],
                    'goals_for' => $t['stats']['goals_for'],
                    'goals_against' => $t['stats']['goals_against'],
                    'group_name' => $t['group_name'] ?? 'Geral'
                ];
            }

            return response()->json($formatted);
        } catch (\Exception $e) {
            \Log::error("Leaderboard Error: " . $e->getMessage());
            return response()->json(['message' => 'Erro ao carregar classificação'], 500);
        }
    }

    // 4.5. Chaveamento Mata-Mata (Knockout Bracket)
    public function knockoutBracket(Request $request, $championshipId)
    {
        $query = GameMatch::where('championship_id', $championshipId)
            ->with(['homeTeam', 'awayTeam'])
            ->whereNotNull('round_name')
            ->orderByRaw("CASE 
                WHEN round_name LIKE '%16%' OR round_name LIKE '%oitavas%' THEN 1
                WHEN round_name LIKE '%quarter%' OR round_name LIKE '%quartas%' THEN 2
                WHEN round_name LIKE '%semi%' THEN 3
                WHEN round_name LIKE '%final%' THEN 4
                ELSE 99 END");

        if ($request->has('category_id') && $request->category_id != 'null') {
            $query->where('category_id', $request->category_id);
        }

        $matches = $query->get();

        // Formatar para o frontend
        $formatted = $matches->map(function ($match) {
            return [
                'id' => $match->id,
                'team1_name' => $match->homeTeam->name ?? 'A definir',
                'team2_name' => $match->awayTeam->name ?? 'A definir',
                'team1_logo' => $match->homeTeam->logo_url ?? null,
                'team2_logo' => $match->awayTeam->logo_url ?? null,
                'team1_score' => $match->home_score,
                'team2_score' => $match->away_score,
                'team1_penalty' => $match->home_penalty_score,
                'team2_penalty' => $match->away_penalty_score,
                'round' => $match->round_name,
                'match_date' => $match->start_time,
                'location' => $match->location,
                'status' => $match->status,
                'winner_team_id' => $match->home_score !== null && $match->away_score !== null
                    ? ($match->home_score > $match->away_score || ($match->home_score == $match->away_score && $match->home_penalty_score > $match->away_penalty_score) ? $match->home_team_id : $match->away_team_id)
                    : null
            ];
        });

        return response()->json($formatted);
    }


    // 5. Calendário
    public function calendarEvents($clubId)
    {
        $events = [];
        $matches = GameMatch::whereHas('championship', function ($q) use ($clubId) {
            $q->where('club_id', $clubId);
        })->with(['homeTeam', 'awayTeam'])->get();

        foreach ($matches as $match) {
            $events[] = [
                'id' => 'M' . $match->id,
                'type' => 'match',
                'title' => ($match->homeTeam->name ?? '?') . ' x ' . ($match->awayTeam->name ?? '?'),
                'date' => date('Y-m-d', strtotime($match->start_time)),
                'color' => '#009966'
            ];
        }
        return response()->json($events);
    }

    // 6. Estatísticas (Artilharia / Pontuadores)
    public function stats(Request $request, $championshipId)
    {
        $type = $request->query('type', 'goals');

        if ($type === 'defense') {
            // Team-based stat: Least Conceded Goals (Defesa Menos Vazada)
            $champ = \App\Models\Championship::with(['teams'])->findOrFail($championshipId);
            $query = \App\Models\GameMatch::where('championship_id', $championshipId)
                ->whereIn('status', ['finished', 'live', 'ongoing']);

            if ($request->filled('category_id') && $request->category_id != 'null') {
                $query->where('category_id', $request->category_id);
            }

            $matches = $query->get();
            $teamStats = [];

            // Initialize teams from pivot to ensure all teams are shown even with 0 games
            $teamsQuery = $champ->teams();
            if ($request->filled('category_id') && $request->category_id != 'null') {
                $teamsQuery->wherePivot('category_id', $request->category_id);
            }
            $allTeams = $teamsQuery->get();

            foreach ($allTeams as $team) {
                $teamStats[$team->id] = [
                    'id' => $team->id,
                    'player_name' => $team->name, // Using player_name for frontend compatibility
                    'team_name' => $team->name,
                    'team_logo' => $team->logo_url,
                    'photo_url' => $team->logo_url,
                    'value' => 0,
                    'matches_played' => 0,
                    'average' => 0,
                    'details' => []
                ];
            }

            foreach ($matches as $match) {
                $hId = $match->home_team_id;
                $aId = $match->away_team_id;

                if ($hId && isset($teamStats[$hId])) {
                    $teamStats[$hId]['value'] += (int)$match->away_score;
                    $teamStats[$hId]['matches_played']++;
                }
                if ($aId && isset($teamStats[$aId])) {
                    $teamStats[$aId]['value'] += (int)$match->home_score;
                    $teamStats[$aId]['matches_played']++;
                }
            }

            foreach ($teamStats as &$stat) {
                if ($stat['matches_played'] > 0) {
                    $stat['average'] = round($stat['value'] / $stat['matches_played'], 2);
                }
            }

            $sortedStats = array_values($teamStats);
            usort($sortedStats, function ($a, $b) {
                // Primary: Least goals
                if ($a['value'] !== $b['value']) {
                    return $a['value'] <=> $b['value'];
                }
                // Secondary: Most matches played (more impressive)
                return $b['matches_played'] <=> $a['matches_played'];
            });

            return response()->json($sortedStats);
        }

        // Map request type to DB event_type
        $dbTypes = [];
        if ($type === 'goals')
            $dbTypes = ['goal'];
        elseif ($type === 'yellow_cards')
            $dbTypes = ['yellow_card'];
        elseif ($type === 'red_cards')
            $dbTypes = ['red_card'];
        elseif ($type === 'points')
            $dbTypes = [
                'point',
                'block',
                'ace',
                'ataque',
                'bloqueio',
                'saque', // Volei/Outros
                '1_point',
                '2_points',
                '3_points',
                'free_throw',
                'field_goal_2',
                'field_goal_3', // Basquete
                'jiu_jitsu_2',
                'jiu_jitsu_3',
                'jiu_jitsu_4',
                'takedown',
                'guard_pass',
                'mount',
                'back_control',
                'knee_on_belly',
                'sweep',
                'advantage',
                'penalty', // Lutas
                'game_won' // Jogos puros
            ];
        elseif ($type === 'blocks')
            $dbTypes = ['block', 'bloqueio'];
        elseif ($type === 'aces')
            $dbTypes = ['ace', 'saque'];
        elseif ($type === 'assists')
            $dbTypes = ['assist'];
        elseif ($type === 'rebounds')
            $dbTypes = ['rebound'];
        elseif ($type === '3_points')
            $dbTypes = ['3_points', 'field_goal_3'];
        elseif ($type === '2_points')
            $dbTypes = ['2_points', 'field_goal_2'];
        elseif ($type === 'blue_cards')
            $dbTypes = ['blue_card'];

        if (empty($dbTypes)) {
            return response()->json([]);
        }

        // Query Events directly
        $events = \App\Models\MatchEvent::whereIn('event_type', $dbTypes)
            ->whereHas('gameMatch', function ($q) use ($championshipId, $request, $type) {
                $q->where('championship_id', $championshipId)
                    ->whereIn('status', ['finished', 'live', 'ongoing']);

                if ($request->filled('category_id') && $request->category_id != 'null') {
                    $q->where('category_id', $request->category_id);
                }

                // Check championship settings for repescagem
                $championship = \App\Models\Championship::find($championshipId);
                $includeRepescagem = false;
                $includeKnockout = false;
                if ($type === 'goals' || $type === 'assists') {
                    $includeRepescagem = $championship->include_repescagem_goals ?? false;
                    $includeKnockout = $championship->include_knockout_goals ?? false;
                } elseif (in_array($type, ['yellow_cards', 'red_cards', 'blue_cards'])) {
                    $includeRepescagem = $championship->include_repescagem_cards ?? true;
                    $includeKnockout = $championship->include_knockout_cards ?? true;
                }

                if (!$includeRepescagem) {
                    $q->where(function($sq) {
                        $sq->where('round_name', '!=', 'Repescagem')
                          ->where('round_name', 'not like', '%Repescagem%')
                          ->orWhereNull('round_name');
                    });
                }
                if (!$includeKnockout) {
                    $q->where(function($sq) {
                        $sq->where('is_knockout', '!=', true)
                          ->where('is_knockout', '!=', 1)
                          ->where(function($ssq) {
                              $ssq->whereNull('round_name')
                                 ->orWhere('round_name', 'not like', '%Final%')
                                 ->where('round_name', 'not like', '%Semi%')
                                 ->where('round_name', 'not like', '%Quartas%')
                                 ->where('round_name', 'not like', '%Oitavas%');
                          })
                          ->orWhereNull('is_knockout');
                    });
                }
            })
            ->with(['team', 'player', 'gameMatch.homeTeam', 'gameMatch.awayTeam']) // Load team and player
            ->get();

        $playerStats = [];

        // 1. Processar Eventos do Banco (da tabela match_events)
        foreach ($events as $event) {
            $metadata = is_string($event->metadata) ? json_decode($event->metadata, true) : (array) ($event->metadata ?? []);

            // Prefer player relation name, fallback to metadata name, fallback to Desconhecido
            // Since ImportOldData put 'player_id' as null often but 'original_player_name' in metadata
            $pName = $metadata['original_player_name'] ?? ($metadata['player_name'] ?? 'Desconhecido');
            $pPhoto = null;

            if ($event->player) {
                $pName = $event->player->nickname ?: $event->player->name;
                // Try to get photo if available
                $pPhoto = $event->player->photo_url ?? $event->player->photo ?? null;
            }

            $teamName = $event->team->name ?? 'Time Desconhecido';

            if (!isset($playerStats[$pName])) {
                $playerStats[$pName] = [
                    'player_name' => $pName,
                    'team_name' => $teamName,
                    'team_logo' => $event->team->logo_url ?? null,
                    'value' => 0,
                    'photo_url' => $pPhoto,
                    'details' => []
                ];
            }

            // Skip own goals for scorer stats
            if ($type === 'goals' && isset($metadata['own_goal']) && filter_var($metadata['own_goal'], FILTER_VALIDATE_BOOLEAN)) {
                continue;
            }

            $playerStats[$pName]['value'] += $event->value;

            // Add detail
            if ($event->gameMatch) {
                $home = $event->gameMatch->homeTeam?->name ?? 'TBA';
                $away = $event->gameMatch->awayTeam?->name ?? 'TBA';
                $playerStats[$pName]['details'][] = [
                    'match_id' => $event->gameMatch->id,
                    'match_label' => "$home vs $away",
                    'game_time' => $event->game_time,
                    'period' => $event->period ?? ($metadata['period'] ?? ($metadata['label'] ?? null)),
                    'match_date' => $event->gameMatch->start_time,
                    'round' => $event->gameMatch->round_name ?? $event->gameMatch->round_number ?? null,
                    'phase' => $event->gameMatch->phase ?? null,
                ];
            }
        }

        // 2. Processar Eventos da Súmula (salvos em JSON no game_matches.match_details['events'])
        $matchesWithJson = \App\Models\GameMatch::where('championship_id', $championshipId)
            ->whereIn('status', ['finished', 'live', 'ongoing'])
            ->with(['homeTeam', 'awayTeam']);

        if ($request->filled('category_id') && $request->category_id != 'null') {
            $matchesWithJson->where('category_id', $request->category_id);
        }

        // Get championship for settings
        $championship = \App\Models\Championship::find($championshipId);
        $includeRepescagem = false;
        $includeKnockout = false;
        if ($type === 'goals' || $type === 'assists') {
            $includeRepescagem = $championship->include_repescagem_goals ?? false;
            $includeKnockout = $championship->include_knockout_goals ?? false;
        } elseif (in_array($type, ['yellow_cards', 'red_cards', 'blue_cards'])) {
            $includeRepescagem = $championship->include_repescagem_cards ?? true;
            $includeKnockout = $championship->include_knockout_cards ?? true;
        }

        if (!$includeRepescagem) {
            $matchesWithJson->where(function($q) {
                $q->where('round_name', '!=', 'Repescagem')->orWhereNull('round_name');
            });
        }
        if (!$includeKnockout) {
            $matchesWithJson->where(function($q) {
                $q->where('is_knockout', '!=', true)->orWhereNull('is_knockout');
            });
        }

        $matches = $matchesWithJson->get();

        foreach ($matches as $match) {
            $details = $match->match_details ?? [];
            if (!isset($details['events']) || !is_array($details['events'])) {
                continue;
            }

            foreach ($details['events'] as $jsonEvent) {
                $eventType = $jsonEvent['type'] ?? 'unknown';

                // Normaliza tipos de vôlei do JSON para bater com os tipos procurados no banco
                if ($eventType === 'ataque')
                    $eventType = 'point';
                if ($eventType === 'bloqueio')
                    $eventType = 'block';
                if ($eventType === 'saque')
                    $eventType = 'ace';

                if (!in_array($eventType, $dbTypes)) {
                    continue;
                }

                // O valor em JSON pra basquete por exemplo vem como 'points', default 1
                $value = isset($jsonEvent['points']) ? (int) $jsonEvent['points'] : (isset($jsonEvent['value']) ? (int) $jsonEvent['value'] : 1);

                $pName = $jsonEvent['player_name'] ?? 'Desconhecido';
                $pPhoto = null;
                $teamId = $jsonEvent['team_id'] ?? null;

                if (isset($jsonEvent['player_id']) && $jsonEvent['player_id']) {
                    $player = \App\Models\User::find($jsonEvent['player_id']);
                    if ($player) {
                        $pName = $player->name;
                        $pPhoto = $player->photo_url ?? $player->photo ?? null;
                    }
                }

                $teamName = 'Time Desconhecido';
                $teamLogo = null;
                if ($teamId == $match->home_team_id) {
                    $teamName = $match->homeTeam->name ?? 'Time Desconhecido';
                    $teamLogo = $match->homeTeam->logo_url ?? null;
                } elseif ($teamId == $match->away_team_id) {
                    $teamName = $match->awayTeam->name ?? 'Time Desconhecido';
                    $teamLogo = $match->awayTeam->logo_url ?? null;
                } else if ($teamId) {
                    $team = \App\Models\Team::find($teamId);
                    if ($team) {
                        $teamName = $team->name;
                        $teamLogo = $team->logo_url ?? null;
                    }
                }

                if (!isset($playerStats[$pName])) {
                    $playerStats[$pName] = [
                        'player_name' => $pName,
                        'team_name' => $teamName,
                        'team_logo' => $teamLogo,
                        'value' => 0,
                        'photo_url' => $pPhoto,
                        'details' => []
                    ];
                }

                if ($type === 'goals' && isset($jsonEvent['metadata']['own_goal']) && filter_var($jsonEvent['metadata']['own_goal'], FILTER_VALIDATE_BOOLEAN)) {
                    continue;
                }

                $playerStats[$pName]['value'] += $value;

                $home = $match->homeTeam->name ?? 'TBA';
                $away = $match->awayTeam->name ?? 'TBA';
                $playerStats[$pName]['details'][] = [
                    'match_id' => $match->id,
                    'match_label' => "$home vs $away",
                    'game_time' => $jsonEvent['minute'] ?? ($jsonEvent['game_time'] ?? '00:00'),
                    'period' => $jsonEvent['period'] ?? null,
                    'match_date' => $match->start_time,
                    'round' => $match->round_name ?? $match->round_number ?? null,
                    'phase' => $match->phase ?? null,
                ];
            }
        }

        usort($playerStats, function ($a, $b) {
            return $b['value'] <=> $a['value'];
        });

        return response()->json(array_values($playerStats));
    }

    public function heats($championshipId)
    {
        return response()->json([]);
    }
    public function brackets($championshipId)
    {
        return response()->json([]);
    }
    public function participants($championshipId)
    {
        return response()->json([]);
    }
    public function raceDetails($championshipId)
    {
        $race = \App\Models\Race::where('championship_id', $championshipId)->first();
        return response()->json($race);
    }
    public function raceResults(Request $request, $championshipId)
    {
        $query = \App\Models\RaceResult::where('race_id', $championshipId);

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('bib_number', 'like', "%{$term}%");
            });
        }

        return response()->json($query->orderBy('net_time', 'asc')->get());
    }
    // 7. MVP (Most Valuable Player)
    public function mvp(Request $request, $championshipId)
    {
        $query = GameMatch::where('championship_id', $championshipId)
            ->whereNotNull('mvp_player_id')
            ->where('status', 'finished');

        if ($request->has('category_id') && $request->category_id != 'null') {
            $query->where('category_id', $request->category_id);
        }

        $matches = $query->with(['mvp', 'homeTeam', 'awayTeam'])->get();

        $mvpCounts = [];
        foreach ($matches as $match) {
            $pid = $match->mvp_player_id;
            if (!$pid || !$match->mvp)
                continue;

            if (!isset($mvpCounts[$pid])) {
                $team = \DB::table('team_players')
                    ->join('teams', 'teams.id', '=', 'team_players.team_id')
                    ->where('team_players.user_id', $pid)
                    ->where('team_players.championship_id', $championshipId)
                    ->select('teams.name')
                    ->first();

                $mvpCounts[$pid] = [
                    'player' => $match->mvp,
                    'player_name' => $match->mvp->nickname ?: $match->mvp->name,
                    'team_name' => $team->name ?? 'Time não informado',
                    'photo_url' => $match->mvp->photo_url ?? $match->mvp->photo ?? null,
                    'count' => 0,
                    'details' => []
                ];
            }
            $mvpCounts[$pid]['count']++;

            $home = $match->homeTeam?->name ?? 'TBA';
            $away = $match->awayTeam?->name ?? 'TBA';
            $mvpCounts[$pid]['details'][] = [
                'match_id' => $match->id,
                'match_label' => "$home vs $away",
                'match_date' => $match->start_time,
                'round' => $match->round_name ?? $match->round_number ?? null,
                'phase' => $match->phase ?? null,
            ];
        }

        usort($mvpCounts, function ($a, $b) {
            return $b['count'] <=> $a['count'];
        });

        return response()->json(array_values($mvpCounts));
    }

    // 8. Teams List
    public function teamsList(Request $request, $championshipId)
    {
        $championship = Championship::findOrFail($championshipId);

        $query = $championship->teams();

        if ($request->has('category_id') && $request->category_id != 'null') {
            $query->wherePivot('category_id', $request->category_id);
        }

        if ($request->has('team_id')) {
            $query->where('teams.id', $request->team_id);
        }

        if ($request->has('with_players') && $request->with_players == 'true') {
            $query->with([
                'players' => function ($q) use ($championshipId) {
                    $q->where('team_players.championship_id', $championshipId);
                }
            ]);
        }

        if ($request->has('category_id') && $request->category_id != 'null') {
            $teams = $query->orderBy('teams.name')->get();
        } else {
            $teams = $query->orderBy('teams.name')->get()->unique('id')->values();
        }

        return response()->json($teams);
    }

    // 9. Head to Head
    public function h2h(Request $request, $championshipId)
    {
        $team1 = $request->query('team1');
        $team2 = $request->query('team2');

        $query = GameMatch::where('championship_id', $championshipId)
            ->where('status', 'finished')
            ->with(['homeTeam', 'awayTeam'])
            ->orderBy('start_time', 'desc');

        if ($request->has('category_id') && $request->category_id != 'null') {
            $query->where('category_id', $request->category_id);
        }

        if ($team1 && $team2) {
            $query->where(function ($q) use ($team1, $team2) {
                $q->where(function ($q2) use ($team1, $team2) {
                    $q2->where('home_team_id', $team1)->where('away_team_id', $team2);
                })->orWhere(function ($q2) use ($team1, $team2) {
                    $q2->where('home_team_id', $team2)->where('away_team_id', $team1);
                });
            });
        } elseif ($team1) {
            $query->where(function ($q) use ($team1) {
                $q->where('home_team_id', $team1)->orWhere('away_team_id', $team1);
            });
        }
        // If no teams selected, maybe return latest matches? Or empty. 
        // Let's return all if no filter, or user handles it.
        // Usually H2H implies selection. If optional, we return empty if not enough params? 
        // Let's return empty if no team1 at least, to avoid dumping all history
        if (!$team1 && !$team2) {
            return response()->json([]);
        }

        return response()->json($query->get());
    }

    // 10. Agenda (Public with Filters)
    public function agenda(Request $request, $clubId)
    {
        $statusMap = [
            'agendado' => ['scheduled', 'upcoming', 'registrations_open', 'active'],
            'concluido' => ['finished', 'completed'],
            'ao_vivo' => ['live', 'ongoing', 'in_progress']
        ];

        $query = GameMatch::whereHas('championship', function ($q) use ($clubId) {
            $q->where('club_id', $clubId);
        })->with(['homeTeam', 'awayTeam', 'championship']);

        // Date Filter
        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('start_time', '>=', $request->start_date);
        }
        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('start_time', '<=', $request->end_date);
        }

        // Status Filter
        if ($request->has('status') && isset($statusMap[$request->status])) {
            $query->whereIn('status', $statusMap[$request->status]);
        }

        $matches = $query->orderBy('start_time', 'asc')->get();

        $events = $matches->map(function ($match) {
            return [
                'id' => $match->id,
                'title' => ($match->homeTeam->name ?? 'TBA') . ' vs ' . ($match->awayTeam->name ?? 'TBA'),
                'date' => $match->start_time ? $match->start_time->format('Y-m-d H:i:s') : null,
                'time' => $match->start_time ? $match->start_time->format('H:i') : null,
                'location' => $match->location ?? 'Local não definido',
                'category' => $match->championship->name ?? 'Campeonato',
                'status' => $match->status,
                'home_team' => $match->homeTeam->name ?? 'TBA',
                'away_team' => $match->awayTeam->name ?? 'TBA',
                'home_score' => $match->home_score,
                'away_score' => $match->away_score,
                'championship_id' => $match->championship_id
            ];
        });

        return response()->json($events);
    }
    // 11. Detalhes da Partida (Público - para Modal Ao Vivo/Súmula)
    public function matchDetails($id)
    {
        $match = GameMatch::with(['championship.sport', 'events.player', 'mvp', 'pernaDePau'])->findOrFail($id);

        $champId = $match->championship_id;
        $match->load([
            'homeTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            },
            'awayTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            }
        ]);

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
            // Vôlei / Beach Tennis
            'ataque' => ['label' => 'Ataque', 'icon' => '💥'],
            'bloqueio' => ['label' => 'Bloqueio', 'icon' => '🤚'],
            'saque' => ['label' => 'Ace (Saque)', 'icon' => '🏐'],
            'erro' => ['label' => 'Erro', 'icon' => '❌'],
            // Tênis
            'game' => ['label' => 'Game', 'icon' => '🎾'],
            'set' => ['label' => 'Set', 'icon' => '🏆'],
            'point' => ['label' => 'Ponto', 'icon' => '🎾'],
        ];

        if ($match->events->count() > 0) {
            $tableEvents = $match->events
                ->sortByDesc('id')
                ->filter(fn($e) => !in_array($e->event_type, $auditTypes))
                ->map(function ($e) use ($eventLabels, $match) {
                    $metadata = is_string($e->metadata) ? json_decode($e->metadata, true) : (array) $e->metadata;
                    $isOwnGoal = isset($metadata['own_goal']) && filter_var($metadata['own_goal'], FILTER_VALIDATE_BOOLEAN);

                    $info = $eventLabels[$e->event_type] ?? ['label' => ucfirst(str_replace('_', ' ', $e->event_type)), 'icon' => '📋'];
                    $label = $metadata['label'] ?? $info['label'];
                    if ($isOwnGoal && $e->event_type === 'goal') {
                        $label = 'Gol Contra';
                    }

                    // Resolve Player Name
                    $pName = null;
                    if ($e->player) {
                        $pName = $e->player->nickname ?: $e->player->name;
                    } else {
                        // Fallback to metadata
                        $pName = $metadata['player_name'] ?? ($metadata['original_player_name'] ?? null);
                    }

                    // Final fallback if still null: check if it's a team event or just "Equipe"
                    if (!$pName) {
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
                        'label' => $label,
                        'icon' => $info['icon'],
                        'team_id' => $e->team_id,
                        'player_id' => $e->player_id,
                        'player_name' => $pName,
                        'minute' => $e->game_time ?? '00:00',
                        'period' => $e->period ?? '1º Tempo',
                        'value' => $e->value,
                        'metadata' => $metadata,
                    ];
                })->values();
            $details['events'] = $tableEvents;
        }

        // Garante que o cronômetro sincronizado vá para o frontend
        if ($match->match_details && isset($match->match_details['sync_timer'])) {
            $details['sync_timer'] = $match->match_details['sync_timer'];
        }

        if (!isset($details['sets']))
            $details['sets'] = [];
        if (!isset($details['positions']))
            $details['positions'] = [];

        // Carregar jogadores reais dos times
        $rosters = [
            'home' => $this->formatRoster($match->homeTeam),
            'away' => $this->formatRoster($match->awayTeam),
        ];

        return response()->json([
            'match' => $match,
            'details' => $details,
            'rosters' => $rosters,
            'server_time' => now()->timestamp * 1000, // milisegundos
            'sport' => $match->championship->sport->slug ?? 'football'
        ]);
    }

    // 12. Sincronizar Statuses com base nas datas (Automático)
    protected function syncStatuses()
    {
        try {
            $now = now();
            // Apenas campeonatos que estão marcados para atualização automática e não são rascunhos 'draft'
            $championships = Championship::where('is_status_auto', true)
                ->where('status', '!=', 'draft')
                ->get();

            foreach ($championships as $champ) {
                $newStatus = $champ->status;

                // 1. Verificar se terminou (End Date)
                if ($champ->end_date && $now->isAfter($champ->end_date->endOfDay())) {
                    $newStatus = 'finished';
                }
                // 2. Verificar se está em andamento (Start Date ou fim das inscrições)
                else if (
                    ($champ->start_date && $now->isAfter($champ->start_date->startOfDay())) ||
                    ($champ->registration_end_date && $now->isAfter($champ->registration_end_date->endOfDay()))
                ) {
                    // Se já não estiver finalizado, passa para em andamento
                    $newStatus = 'ongoing';
                }
                // 3. Verificar se as inscrições abriram (Registration Start)
                else if ($champ->registration_start_date && $now->isAfter($champ->registration_start_date)) {
                    // Se as inscrições começaram e ainda não é data de jogo, abre inscrições
                    $newStatus = 'registrations_open';
                }

                // Se o status mudou, salva mantendo o is_status_auto como true (pois foi auto)
                if ($newStatus !== $champ->status) {
                    Championship::where('id', $champ->id)->update(['status' => $newStatus]);
                }
            }
        } catch (\Exception $e) {
            // Silenciosamente falha se a coluna não existir (migration não rodada)
            \Log::warning("Erro ao sincronizar status: " . $e->getMessage());
        }
    }

    // Helper para formatar elenco
    private function formatRoster($team)
    {
        if (!$team)
            return [];

        return $team->players->map(function ($player) {
            return [
                'id' => $player->id,
                'number' => $player->pivot->number ?? '',
                'name' => $player->name,
                'position' => $player->pivot->position
            ];
        });
    }

    public function matchPdf($id)
    {
        $match = GameMatch::with(['homeTeam.players', 'awayTeam.players', 'championship.sport', 'events.player', 'mvp'])->findOrFail($id);

        $html = "
        <html>
        <head>
            <title>Súmula - Match #{$id}</title>
            <style>
                body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                .header { text-align: center; border-bottom: 2px solid #EEE; padding-bottom: 20px; margin-bottom: 30px; }
                .teams { display: flex; justify-content: space-around; align-items: center; margin-bottom: 40px; background: #F9FAFB; padding: 20px; border-radius: 12px; }
                .score { font-size: 64px; font-weight: 900; color: #111; }
                .team-card { text-align: center; flex: 1; }
                .team-card h2 { margin: 0; font-size: 24px; color: #4F46E5; }
                .events { width: 100%; border-collapse: collapse; margin-top: 30px; }
                .events th, .events td { border: 1px solid #EEE; padding: 12px; text-align: left; }
                .events th { background-color: #F3F4F6; font-weight: 600; }
                .mvp-section { margin-top: 50px; border-top: 2px solid #4F46E5; padding-top: 20px; display: flex; align-items: center; gap: 20px; }
                .mvp-badge { background: #4F46E5; color: white; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: bold; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class='no-print' style='background: #FFFBEB; padding: 15px; margin-bottom: 40px; border: 1px solid #FEF3C7; border-radius: 12px; text-align: center; color: #92400E;'>
                📄 <b>Documento Oficial</b> - Pressione <b>Ctrl + P</b> para salvar como PDF ou Imprimir.
            </div>
            <div class='header'>
                <h1 style='margin:0; color: #111;'>" . ($match->championship->name ?? 'Campeonato') . "</h1>
                <p style='color: #666;'>" . ($match->start_time ? $match->start_time->format('d/m/Y H:i') : '') . " - " . ($match->location ?? 'Local a definir') . "</p>
            </div>
            <div class='teams'>
                <div class='team-card'><h2>{$match->homeTeam->name}</h2></div>
                <div class='score'>{$match->home_score} <span style='font-size: 32px; color: #999;'>x</span> {$match->away_score}</div>
                <div class='team-card'><h2>{$match->awayTeam->name}</h2></div>
            </div>
            <h3 style='border-left: 4px solid #4F46E5; padding-left: 15px;'>Cronologia da Partida</h3>
            <table class='events'>
                <thead>
                    <tr><th>Tempo</th><th>Tipo</th><th>Jogador</th><th>Equipe</th></tr>
                </thead>
                <tbody>";

        foreach ($match->events as $event) {
            $typeLabel = str_replace('_', ' ', strtoupper($event->event_type));
            $html .= "<tr>
                <td style='font-weight: bold;'>{$event->game_time}'</td>
                <td>{$typeLabel}</td>
                <td>" . ($event->player->name ?? '---') . "</td>
                <td>" . ($event->team_id == $match->home_team_id ? $match->homeTeam->name : $match->awayTeam->name) . "</td>
            </tr>";
        }

        $html .= "</tbody></table>";

        if ($match->mvp) {
            $html .= "<div class='mvp-section'>
                <div>
                    <span class='mvp-badge'>CRAQUE DO JOGO</span>
                    <h2 style='margin: 5px 0 0 0;'>{$match->mvp->name}</h2>
                </div>
            </div>";
        }

        $html .= "
            <footer style='margin-top: 100px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #EEE; padding-top: 20px;'>
                Gerado em " . date('d/m/Y H:i') . " via Plataforma Esportiva
            </footer>
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>";

        return response($html);
    }
}
