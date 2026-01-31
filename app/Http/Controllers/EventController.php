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

    // 0. Listar Todos (Public Home)
    public function publicList(Request $request)
    {
        // Retorna os próximos 6 eventos ativos/futuros para a home
        $championships = Championship::whereIn('status', ['upcoming', 'ongoing', 'in_progress', 'registrations_open'])
            ->orderBy('start_date', 'asc')
            ->limit(6)
            ->get();

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
        $champ = Championship::with('sport')->findOrFail($championshipId);
        $sportSlug = $champ->sport->slug ?? 'futebol';
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
        // ... (rest of function)

        $teamsData = [];

        // Helper para inicializar estrutura
        $initStats = function ($name) {
            return [
                'name' => $name,
                'stats' => [
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

        foreach ($matches as $m) {
            $homeId = $m->home_team_id;
            $awayId = $m->away_team_id;
            if (!$homeId || !$awayId)
                continue; // Ignora jogos sem definição

            $groupName = $m->group_name ?? 'Geral';

            if (!isset($teamsData[$homeId])) {
                $teamsData[$homeId] = $initStats($m->homeTeam->name ?? 'Time A');
                $teamsData[$homeId]['group_name'] = $groupName;
            }
            if (!isset($teamsData[$awayId])) {
                $teamsData[$awayId] = $initStats($m->awayTeam->name ?? 'Time B');
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

        // Se nenhum jogo ocorreu, precisamos listar os times inscritos com 0 pontos
        if (empty($teamsData)) {
            $participants = Team::whereHas('homeMatches', function ($q) use ($championshipId) {
                $q->where('championship_id', $championshipId);
            })->orWhereHas('awayMatches', function ($q) use ($championshipId) {
                $q->where('championship_id', $championshipId);
            })->get();

            foreach ($participants as $p) {
                if (!isset($teamsData[$p->id])) {
                    $teamsData[$p->id] = $initStats($p->name);
                    $teamsData[$p->id]['id'] = $p->id;
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
                'team_logo' => null, // TODO: adicionar logo se disponível
                'position' => $position++,
                'points' => $t['stats']['points'],
                'played' => $t['stats']['played'],
                'won' => $t['stats']['wins'],
                'drawn' => $t['stats']['draws'],
                'lost' => $t['stats']['losses'],
                'goal_difference' => $t['stats']['goals_for'] - $t['stats']['goals_against'],
                'group_name' => $t['group_name'] ?? 'Geral'
            ];
        }

        return response()->json($formatted);
    }

    // 4.5. Chaveamento Mata-Mata (Knockout Bracket)
    public function knockoutBracket(Request $request, $championshipId)
    {
        $query = GameMatch::where('championship_id', $championshipId)
            ->with(['homeTeam', 'awayTeam'])
            ->whereNotNull('round') // Apenas jogos de mata-mata têm 'round' definida
            ->orderByRaw("FIELD(round, 'round_of_16', 'quarter', 'semi', 'final')");

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
                'round' => $match->round, // 'round_of_16', 'quarter', 'semi', 'final'
                'match_date' => $match->start_time,
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
            ->with(['team', 'player']) // Load team and player
            ->get();

        $playerStats = [];

        foreach ($events as $event) {
            $metadata = json_decode($event->metadata ?? '{}', true);
            // Prefer player relation name, fallback to metadata name, fallback to Desconhecido
            // Since ImportOldData put 'player_id' as null often but 'original_player_name' in metadata
            $pName = $metadata['original_player_name'] ?? 'Desconhecido';
            if ($event->player) {
                $pName = $event->player->name;
            }

            $teamName = $event->team->name ?? 'Time Desconhecido';

            if (!isset($playerStats[$pName])) {
                $playerStats[$pName] = [
                    'player_name' => $pName,
                    'team_name' => $teamName,
                    'value' => 0,
                    'photo_url' => null
                ];
            }
            $playerStats[$pName]['value'] += $event->value;
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
}
