<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\GameMatch;
use App\Models\Team;

class EventController extends Controller
{
    // 1. Listar Campeonatos de um Clube (Filtrado por Esporte)
    public function championships(Request $request, $clubId)
    {
        $query = Championship::where('club_id', $clubId);

        if ($request->has('sport_id')) {
            $query->where('sport_id', $request->sport_id);
        }

        return response()->json($query->with('sport')->orderBy('start_date', 'desc')->get());
    }

    public function publicList(Request $request)
    {
        $this->syncStatuses();

        $query = Championship::with(['club', 'sport']);

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
        $champ = Championship::with(['categories.children', 'sport'])
            ->withCount('teams')
            ->findOrFail($id);
        return response()->json($champ);
    }

    // 3. Tabela de Jogos (Partidas)
    public function matches(Request $request, $championshipId)
    {
        $query = GameMatch::where('championship_id', $championshipId)
            ->with(['homeTeam', 'awayTeam'])
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

            if ($request->has('category_id') && $request->category_id != 'null') {
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

            // Mapa de grupos dos times (baseado em qualquer jogo gerado, não só finalizados)
            $teamGroups = [];
            $allMatches = GameMatch::where('championship_id', $championshipId)
                ->whereNotNull('group_name')
                ->select('home_team_id', 'away_team_id', 'group_name')
                ->get();

            foreach ($allMatches as $am) {
                if ($am->home_team_id)
                    $teamGroups[$am->home_team_id] = $am->group_name;
                if ($am->away_team_id)
                    $teamGroups[$am->away_team_id] = $am->group_name;
            }

            foreach ($matches as $m) {
                $homeId = $m->home_team_id;
                $awayId = $m->away_team_id;
                if (!$homeId || !$awayId)
                    continue; // Ignora jogos sem definição

                // Prefere o grupo do jogo atual, se não tiver, tenta do mapa
                $groupName = $m->group_name ?? ($teamGroups[$homeId] ?? 'Geral');

                if (!isset($teamsData[$homeId])) {
                    $teamsData[$homeId] = $initStats($m->homeTeam->name ?? 'Time A', $m->homeTeam->logo_url ?? null);
                    $teamsData[$homeId]['group_name'] = $groupName;
                }
                if (!isset($teamsData[$awayId])) {
                    $teamsData[$awayId] = $initStats($m->awayTeam->name ?? 'Time B', $m->awayTeam->logo_url ?? null);
                    $teamsData[$awayId]['group_name'] = $groupName;
                }

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

                    // Regra Simplificada: 3 pontos por vitória, 0 derrota, independente do placar de sets
                    if ($hScore > $aScore) {
                        $teamsData[$homeId]['stats']['wins']++;
                        $teamsData[$awayId]['stats']['losses']++;
                        $teamsData[$homeId]['stats']['points'] += 3;
                    } else {
                        $teamsData[$awayId]['stats']['wins']++;
                        $teamsData[$homeId]['stats']['losses']++;
                        $teamsData[$awayId]['stats']['points'] += 3;
                    }

                    // Mapeia Sets para "Gols" para exibir na tabela genérica
                    $teamsData[$homeId]['stats']['goals_for'] = $teamsData[$homeId]['stats']['sets_won'];
                    $teamsData[$homeId]['stats']['goals_against'] = $teamsData[$homeId]['stats']['sets_lost'];
                    $teamsData[$awayId]['stats']['goals_for'] = $teamsData[$awayId]['stats']['sets_won'];
                    $teamsData[$awayId]['stats']['goals_against'] = $teamsData[$awayId]['stats']['sets_lost'];

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

            // Garante que TODOS os times do campeonato apareçam, mesmo com 0 jogos
            $teamsQuery = $champ->teams();
            if ($request->has('category_id') && $request->category_id != 'null') {
                $teamsQuery->wherePivot('category_id', $request->category_id);
            }
            $allTeams = $teamsQuery->get();

            foreach ($allTeams as $team) {
                if (!isset($teamsData[$team->id])) {
                    $teamsData[$team->id] = $initStats($team->name, $team->logo_url);
                    $teamsData[$team->id]['id'] = $team->id;
                    $teamsData[$team->id]['group_name'] = $teamGroups[$team->id] ?? 'Geral';
                } else {
                    // Ensure ID is set
                    $teamsData[$team->id]['id'] = $team->id;
                    if (($teamsData[$team->id]['group_name'] ?? 'Geral') === 'Geral' && isset($teamGroups[$team->id])) {
                        $teamsData[$team->id]['group_name'] = $teamGroups[$team->id];
                    }
                }
            }

            // Ordenação
            usort($teamsData, function ($a, $b) {
                // Sort by Group
                $groupA = $a['group_name'] ?? 'Geral';
                $groupB = $b['group_name'] ?? 'Geral';
                if ($groupA !== $groupB) {
                    return strcmp($groupA, $groupB);
                }

                if ($a['stats']['points'] === $b['stats']['points']) {
                    if ($a['stats']['wins'] === $b['stats']['wins']) {
                        // Saldo
                        $balA = $a['stats']['goals_for'] - $a['stats']['goals_against'];
                        $balB = $b['stats']['goals_for'] - $b['stats']['goals_against'];

                        if ($balA === $balB) {
                            // Gols Pró (Opcional, mas comum)
                            if ($a['stats']['goals_for'] === $b['stats']['goals_for']) {
                                // Ordem Alfabética
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
            ->whereNotNull('round_name') // Apenas jogos de mata-mata têm 'round_name' definida
            ->orderByRaw("FIELD(round_name, 'round_of_16', 'quarter', 'semi', 'final')");

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
                'round' => $match->round_name, // 'round_of_16', 'quarter', 'semi', 'final'
                'match_date' => $match->start_time,
                'location' => $match->location,
                'status' => $match->status,
                'winner_team_id' => $match->home_score !== null && $match->away_score !== null
                    ? ($match->home_score > $match->away_score ? $match->home_team_id : $match->away_team_id)
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

        // Map request type to DB event_type
        // Map request type to DB event_types
        $dbTypes = [];
        if ($type === 'goals')
            $dbTypes = ['goal'];
        elseif ($type === 'yellow_cards')
            $dbTypes = ['yellow_card'];
        elseif ($type === 'red_cards')
            $dbTypes = ['red_card'];
        elseif ($type === 'points')
            $dbTypes = ['point', 'block', 'ace']; // Volleyball Total Points
        elseif ($type === 'blocks')
            $dbTypes = ['block']; // Volleyball block only
        elseif ($type === 'aces')
            $dbTypes = ['ace']; // Volleyball ace only
        elseif ($type === 'blue_cards')
            $dbTypes = ['blue_card'];

        if (empty($dbTypes)) {
            return response()->json([]);
        }

        // Query Events directly
        $events = \App\Models\MatchEvent::whereIn('event_type', $dbTypes)
            ->whereHas('gameMatch', function ($q) use ($championshipId, $request) {
                $q->where('championship_id', $championshipId)
                    ->whereIn('status', ['finished', 'live', 'ongoing']);

                if ($request->has('category_id') && $request->category_id != 'null') {
                    $q->where('category_id', $request->category_id);
                }
            })
            ->with(['team', 'player', 'gameMatch.homeTeam', 'gameMatch.awayTeam']) // Load team and player
            ->get();

        $playerStats = [];

        foreach ($events as $event) {
            $metadata = json_decode($event->metadata ?? '{}', true);
            // Prefer player relation name, fallback to metadata name, fallback to Desconhecido
            // Since ImportOldData put 'player_id' as null often but 'original_player_name' in metadata
            $pName = $metadata['original_player_name'] ?? 'Desconhecido';
            $pPhoto = null;

            if ($event->player) {
                $pName = $event->player->name;
                // Try to get photo if available (assuming accessor or column)
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
            $playerStats[$pName]['value'] += $event->value;

            // Add detail
            if ($event->gameMatch) {
                $home = $event->gameMatch->homeTeam->name ?? 'TBA';
                $away = $event->gameMatch->awayTeam->name ?? 'TBA';
                $playerStats[$pName]['details'][] = [
                    'match_id' => $event->gameMatch->id,
                    'match_label' => "$home vs $away",
                    'game_time' => $event->game_time,
                    'period' => $event->period,
                    'match_date' => $event->gameMatch->start_time
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
        return response()->json([]);
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

        $matches = $query->with('mvp')->get();

        $mvpCounts = [];
        foreach ($matches as $match) {
            $pid = $match->mvp_player_id;
            if (!$pid || !$match->mvp)
                continue;

            if (!isset($mvpCounts[$pid])) {
                $mvpCounts[$pid] = [
                    'player' => $match->mvp,
                    'count' => 0
                ];
            }
            $mvpCounts[$pid]['count']++;
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

        $teams = $query->orderBy('name')->get();
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
                'away_score' => $match->away_score
            ];
        });

        return response()->json($events);
    }
    // 11. Detalhes da Partida (Público - para Modal Ao Vivo/Súmula)
    public function matchDetails($id)
    {
        $match = GameMatch::with(['homeTeam.players', 'awayTeam.players', 'championship.sport', 'events.player', 'mvp'])->findOrFail($id);

        $details = $match->match_details ?? [];

        if (!isset($details['events'])) {
            $details['events'] = [];
        }

        // Se houver eventos na tabela MatchEvent, eles são a fonte de verdade
        if ($match->events->count() > 0) {
            $tableEvents = $match->events->map(function ($e) {
                return [
                    'id' => $e->id,
                    'type' => $e->event_type,
                    'team_id' => $e->team_id,
                    'player_id' => $e->player_id,
                    'player_name' => $e->player?->name ?? '?',
                    'minute' => $e->game_time ?? '00:00',
                    'period' => $e->metadata['period'] ?? ($e->metadata['label'] ?? '1º Tempo'),
                    'value' => $e->value
                ];
            });
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
