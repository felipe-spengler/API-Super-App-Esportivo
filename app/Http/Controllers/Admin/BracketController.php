<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\GameMatch as MatchModel;
use App\Models\Team;
use Carbon\Carbon;

class BracketController extends Controller
{
    /**
     * Gerar chaveamento automático
     */
    public function generate(Request $request, $championshipId)
    {
        $championship = Championship::findOrFail($championshipId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        $validated = $request->validate([
            'format' => 'required|in:league,knockout,groups,league_playoffs',
            'category_id' => 'nullable|exists:categories,id',
            'start_date' => 'required|date',
            'match_interval_days' => 'nullable|integer|min:1|max:30',
        ]);

        $format = $validated['format'];
        $categoryId = $validated['category_id'] ?? null;
        $startDate = Carbon::parse($validated['start_date']);
        $intervalDays = $validated['match_interval_days'] ?? 7;

        // Busca equipes
        $teamsQuery = $championship->teams();
        if ($categoryId) {
            $teamsQuery->wherePivot('category_id', $categoryId);
        }
        $teams = $teamsQuery->get();

        if ($teams->count() < 2) {
            return response()->json([
                'message' => 'É necessário pelo menos 2 equipes para gerar o chaveamento.'
            ], 400);
        }

        // Gera chaveamento baseado no formato
        $matches = [];

        switch ($format) {
            case 'league':
            case 'league_playoffs': // League Playoffs should act as a single league for the first phase
                $matches = $this->generateLeagueBracket($championship, $teams, $startDate, $intervalDays, $categoryId);
                break;

            case 'knockout':
                $customGroups = $request->input('custom_groups'); // Array of arrays of team IDs
                $matches = $this->generateGroupsBracket($championship, $teams, $startDate, $intervalDays, $categoryId, $customGroups);
                break;
        }

        return response()->json([
            'message' => 'Chaveamento gerado com sucesso!',
            'matches_created' => count($matches),
            'teams_count' => $teams->count(),
            'teams_list' => $teams->pluck('name')->toArray(),
            'matches' => $matches
        ]);
    }

    /**
     * Gera e persiste partidas usando algoritmo Round Robin
     */
    /**
     * Gera chaveamento de liga (todos contra todos)
     */
    private function generateLeagueBracket($championship, $teams, $startDate, $intervalDays, $categoryId = null)
    {
        $legs = request()->input('legs', 1);
        return $this->generateScheduleFromTeams($championship, $teams, $startDate, $intervalDays, $categoryId, null, 1, $legs);
    }

    /**
     * Gera e persiste partidas usando algoritmo Round Robin
     */
    private function generateScheduleFromTeams($championship, $teamsList, $startDate, $intervalDays, $categoryId, $groupName = null, $startRound = 1, $legs = 1)
    {
        $createdMatches = [];
        $baseSchedule = $this->schedulerRoundRobin($teamsList); // Returns array of rounds, each round is array of [home, away]

        // Debugging
        $debug = [
            'teams_count_in' => count($teamsList),
            'rounds_generated' => count($baseSchedule),
            'pairs_per_round' => count($baseSchedule[0] ?? []),
            'first_round_pairs' => [],
        ];

        foreach ($baseSchedule[0] ?? [] as $p) {
            $debug['first_round_pairs'][] = [
                'home' => $p[0] ? $p[0]['name'] : 'NULL',
                'away' => $p[1] ? $p[1]['name'] : 'NULL'
            ];
        }

        $matchDate = $startDate->copy();
        $currentRoundNumber = $startRound;

        for ($leg = 1; $leg <= $legs; $leg++) {
            $shouldSwap = ($leg % 2 == 0); // Swap home/away for even legs (2, 4...)

            foreach ($baseSchedule as $roundIndex => $matchPairs) {
                foreach ($matchPairs as $pair) {
                    // $pair is [homeTeam, awayTeam]
                    // If swapping (Leg 2), Home becomes Away
                    $home = $shouldSwap ? $pair[1] : $pair[0];
                    $away = $shouldSwap ? $pair[0] : $pair[1];

                    // skip dummy
                    if (!$home || !$away)
                        continue;

                    $match = MatchModel::create([
                        'championship_id' => $championship->id,
                        'category_id' => $categoryId,
                        'home_team_id' => $home['id'],
                        'away_team_id' => $away['id'],
                        'start_time' => $matchDate->format('Y-m-d H:i:s'),
                        'location' => $championship->location ?? 'A definir',
                        'status' => 'scheduled',
                        'round_number' => $currentRoundNumber,
                        'group_name' => $groupName
                    ]);

                    $createdMatches[] = $match;
                }
                // Advance date per round
                $matchDate->addDays($intervalDays);
                $currentRoundNumber++;
            }
        }

        // Attach debug info to array (hacky but effective for JSON return if we merge)
        // Ideally we return an object, but caller expects array of matches. 
        // We will log it instead.
        \Log::info("Bracket Generation Debug", $debug);

        return $createdMatches;
    }

    /**
     * Algoritmo Round Robin (Todos contra todos)
     * Retorna array de Rodadas, onde cada Rodada é array de Pares [Home, Away]
     */
    private function schedulerRoundRobin($teams)
    {
        // 1. Prepare Teams
        $teamsArray = $teams instanceof \Illuminate\Support\Collection ? $teams->values()->toArray() : array_values($teams);

        // Remove invalid entries just in case
        $teamsArray = array_filter($teamsArray, function ($t) {
            return !is_null($t);
        });
        $teamsArray = array_values($teamsArray);

        $totalTeams = count($teamsArray);

        // 2. Handle Odd/Even count
        // If Odd, we add a placeholder "BYE" to make it Even for the algorithm
        $hasBye = false;
        if ($totalTeams % 2 != 0) {
            $teamsArray[] = "BYE"; // Placeholder
            $hasBye = true;
            $totalTeams++;
        }

        $numRounds = $totalTeams - 1;
        $matchesPerRound = $totalTeams / 2;
        $rounds = [];

        // Log count for verification but keeping it clean
        \Log::info("Gerando Tabela (Round Robin)", [
            'total_teams' => count($teams),
            'rounds_expected' => $numRounds
        ]);

        $indices = array_keys($teamsArray); // 0 to N-1

        // 3. Generate Rounds
        for ($r = 0; $r < $numRounds; $r++) {
            $roundMatches = [];

            for ($i = 0; $i < $matchesPerRound; $i++) {
                $homeIdx = $indices[$i];
                $awayIdx = $indices[$totalTeams - 1 - $i];

                $home = $teamsArray[$homeIdx];
                $away = $teamsArray[$awayIdx];

                // If either team is "BYE", it's a rest day (Folga)
                if ($home === "BYE" || $away === "BYE") {
                    // Log safely without scaring the user with "Dummy" or "NULL"
                    // $resting = ($home === "BYE") ? $away : $home;
                    // \Log::info("  Team Bye: " . ($resting['name'] ?? 'Unknown'));
                    continue;
                }

                $roundMatches[] = [$home, $away];
            }
            $rounds[] = $roundMatches;

            // Rotate indices for next round (keep index 0 fixed)
            $moving = array_splice($indices, 1);
            $last = array_pop($moving);
            array_unshift($moving, $last);
            $indices = array_merge([$indices[0]], $moving);
        }

        return $rounds;
    }



    /**
     * Gera chaveamento de mata-mata
     * (Mantido simples, pois mata-mata não é round robin clássico de liga)
     */
    private function generateKnockoutBracket($championship, $teams, $startDate, $intervalDays, $categoryId = null)
    {
        $matches = [];
        $teamsArray = $teams->shuffle()->toArray();
        $totalTeams = count($teamsArray);

        // Primeira rodada
        $round = 1;
        $matchDate = $startDate->copy();

        for ($i = 0; $i < $totalTeams; $i += 2) {
            if (isset($teamsArray[$i + 1])) {
                $match = MatchModel::create([
                    'championship_id' => $championship->id,
                    'category_id' => $categoryId,
                    'home_team_id' => $teamsArray[$i]['id'],
                    'away_team_id' => $teamsArray[$i + 1]['id'],
                    'start_time' => $matchDate->format('Y-m-d H:i:s'),
                    'location' => $championship->location ?? 'A definir',
                    'status' => 'scheduled',
                    'round_number' => $round,
                    'is_knockout' => true,
                ]);

                $matches[] = $match;
            }
        }
        // No mata-mata inicial, assumimos todos jogos mesmo dia/hora base?
        // Ou incrementamos? Geralmente mesma rodada é mesmo dia.

        return $matches;
    }

    /**
     * Gera chaveamento de grupos
     */
    private function generateGroupsBracket($championship, $teams, $startDate, $intervalDays, $categoryId = null, $customGroups = null)
    {
        $allMatches = [];
        $legs = request()->input('legs', 1);

        if ($customGroups && is_array($customGroups)) {
            // Use custom groups provided by frontend
            $groups = [];
            foreach ($customGroups as $groupTeamIds) {
                $groupTeams = $teams->filter(function ($team) use ($groupTeamIds) {
                    return in_array($team->id, $groupTeamIds);
                })->values()->toArray();

                if (!empty($groupTeams)) {
                    $groups[] = $groupTeams;
                }
            }
        } else {
            // Default random generation
            $teamsArray = $teams->shuffle()->toArray();
            $totalTeams = count($teamsArray);

            // Divide em 4 grupos (ou menos se houver poucas equipes)
            $numGroups = min(4, ceil($totalTeams / 3));
            if ($numGroups < 1)
                $numGroups = 1; // Safety
            $teamsPerGroup = ceil($totalTeams / $numGroups);

            $groups = array_chunk($teamsArray, $teamsPerGroup);
        }

        // Validação: Mínimo 2 grupos
        if (count($groups) < 2) {
            // Se for custom groups e veio só 1, ou calculamos e deu 1
            abort(400, 'Para o formato de Grupos, é necessário haver pelo menos 2 grupos. Adicione mais times ou configure os grupos manualmente.');
        }

        // Gera partidas dentro de cada grupo
        foreach ($groups as $groupIndex => $groupTeams) {
            $groupName = chr(65 + $groupIndex); // A, B, C, D...

            // Use Round Robin per group
            $groupMatches = $this->generateScheduleFromTeams(
                $championship,
                $groupTeams,
                $startDate,
                $intervalDays,
                $categoryId,
                "Grupo {$groupName}",
                1,
                $legs
            );

            $allMatches = array_merge($allMatches, $groupMatches);
        }

        return $allMatches;
    }

    /**
     * Avançar fase (mata-mata)
     */
    public function advancePhase(Request $request, $championshipId)
    {
        $championship = Championship::findOrFail($championshipId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        $validated = $request->validate([
            'current_round' => 'required|integer|min:1',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $currentRound = $validated['current_round'];
        $categoryId = $validated['category_id'] ?? null;

        // Busca partidas finalizadas da rodada atual
        $matchesQuery = MatchModel::where('championship_id', $championshipId)
            ->where('round_number', $currentRound)
            ->where('is_knockout', true)
            ->where('status', 'finished');

        if ($categoryId) {
            $matchesQuery->where('category_id', $categoryId);
        }

        $matches = $matchesQuery->get();

        if ($matches->isEmpty()) {
            return response()->json([
                'message' => 'Não há partidas finalizadas nesta rodada.'
            ], 400);
        }

        // Cria próxima rodada com os vencedores
        $winners = [];
        foreach ($matches as $match) {
            if ($match->home_score > $match->away_score) {
                $winners[] = $match->home_team_id;
            } elseif ($match->away_score > $match->home_score) {
                $winners[] = $match->away_team_id;
            } else {
                return response()->json([
                    'message' => "A partida #{$match->id} está empatada. Defina o vencedor antes de avançar."
                ], 400);
            }
        }

        // Cria partidas da próxima rodada
        $newMatches = [];
        $nextRound = $currentRound + 1;
        $lastMatchDate = $matches->max('start_time');
        $nextMatchDate = Carbon::parse($lastMatchDate)->addDays(7);

        for ($i = 0; $i < count($winners); $i += 2) {
            if (isset($winners[$i + 1])) {
                $match = MatchModel::create([
                    'championship_id' => $championshipId,
                    'category_id' => $categoryId,
                    'home_team_id' => $winners[$i],
                    'away_team_id' => $winners[$i + 1],
                    'start_time' => $nextMatchDate->format('Y-m-d H:i:s'),
                    'location' => $championship->location ?? 'A definir',
                    'status' => 'scheduled',
                    'round_number' => $nextRound,
                    'is_knockout' => true,
                ]);

                $newMatches[] = $match;
                $nextMatchDate->addDays(3);
            }
        }

        return response()->json([
            'message' => 'Fase avançada com sucesso!',
            'next_round' => $nextRound,
            'matches_created' => count($newMatches),
            'matches' => $newMatches
        ]);
    }

    /**
     * Sortear equipes
     */
    public function shuffle(Request $request, $championshipId)
    {
        $championship = Championship::findOrFail($championshipId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $categoryId = $validated['category_id'] ?? null;

        $teamsQuery = $championship->teams();
        if ($categoryId) {
            $teamsQuery->wherePivot('category_id', $categoryId);
        }

        $teams = $teamsQuery->get()->shuffle();

        return response()->json([
            'message' => 'Equipes sorteadas!',
            'teams' => $teams->values()
        ]);
    }

    /**
     * Gera mata-mata a partir da fase de grupos
     */
    public function generateFromGroups(Request $request, $championshipId)
    {
        $championship = Championship::findOrFail($championshipId);
        $categoryId = $request->input('category_id');

        // 1. Identificar Grupos e Times
        $matches = MatchModel::where('championship_id', $championshipId)
            ->whereNotNull('group_name')
            ->when($categoryId, function ($q) use ($categoryId) {
                return $q->where('category_id', $categoryId);
            })
            ->get();

        if ($matches->isEmpty()) {
            return response()->json(['message' => 'Nenhum jogo de fase de grupos encontrado.'], 400);
        }

        $groups = [];
        $teamStats = [];

        // Helper para inicializar stats
        $initStats = function () {
            return [
                'points' => 0,
                'wins' => 0,
                'goal_diff' => 0,
                'goals_for' => 0,
                'played' => 0
            ];
        };

        foreach ($matches as $match) {
            $gName = $match->group_name;
            if (!$gName)
                continue;

            if (!isset($groups[$gName]))
                $groups[$gName] = [];

            $hId = $match->home_team_id;
            $aId = $match->away_team_id;

            if (!in_array($hId, $groups[$gName]))
                $groups[$gName][] = $hId;
            if (!in_array($aId, $groups[$gName]))
                $groups[$gName][] = $aId;

            if (!isset($teamStats[$hId]))
                $teamStats[$hId] = $initStats();
            if (!isset($teamStats[$aId]))
                $teamStats[$aId] = $initStats();

            if ($match->status === 'finished') {
                $teamStats[$hId]['played']++;
                $teamStats[$aId]['played']++;

                $teamStats[$hId]['goals_for'] += $match->home_score;
                $teamStats[$aId]['goals_for'] += $match->away_score;

                $diff = $match->home_score - $match->away_score;
                $teamStats[$hId]['goal_diff'] += $diff;
                $teamStats[$aId]['goal_diff'] -= $diff;

                if ($match->home_score > $match->away_score) {
                    $teamStats[$hId]['points'] += 3;
                    $teamStats[$hId]['wins']++;
                } elseif ($match->away_score > $match->home_score) {
                    $teamStats[$aId]['points'] += 3;
                    $teamStats[$aId]['wins']++;
                } else {
                    $teamStats[$hId]['points'] += 1;
                    $teamStats[$aId]['points'] += 1;
                }
            }
        }

        // 2. Classificar cada grupo
        $qualifiedTeams = []; // [ 'A' => [1st_id, 2nd_id], 'B' => ... ]

        foreach ($groups as $gName => $teamIds) {
            usort($teamIds, function ($a, $b) use ($teamStats) {
                $sa = $teamStats[$a];
                $sb = $teamStats[$b];

                if ($sb['points'] !== $sa['points'])
                    return $sb['points'] <=> $sa['points'];
                if ($sb['wins'] !== $sa['wins'])
                    return $sb['wins'] <=> $sa['wins'];
                if ($sb['goal_diff'] !== $sa['goal_diff'])
                    return $sb['goal_diff'] <=> $sa['goal_diff'];
                return $sb['goals_for'] <=> $sa['goals_for'];
            });

            // Pega top 2
            $qualifiedTeams[$gName] = array_slice($teamIds, 0, 2);
        }

        // 3. Determinar Confrontos (Cruzamento)
        // Regra simples: 
        // 4 grupos (A, B, C, D) -> Quartas: A1xB2, B1xA2, C1xD2, D1xC2
        // 2 grupos (A, B) -> Semis: A1xB2, B1xA2

        $groupNames = array_keys($qualifiedTeams);
        sort($groupNames); // A, B, C...
        $numGroups = count($groupNames);

        $nextRoundName = '';
        if ($numGroups == 2)
            $nextRoundName = 'semi';
        elseif ($numGroups == 4)
            $nextRoundName = 'quarter';
        elseif ($numGroups == 8)
            $nextRoundName = 'round_of_16';
        else {
            // Fallback genérico ou erro se for ímpar/diferente
            // Tenta parear sequencialmente: Grupo 0 vs Grupo 1, Grupo 2 vs 3...
            if ($numGroups % 2 != 0) {
                return response()->json([
                    'message' => "Número de grupos ($numGroups) não suportado para geração automática de mata-mata padrão (precisa ser potência de 2: 2, 4, 8)."
                ], 400);
            }
            $nextRoundName = 'round_of_' . ($numGroups * 2); // ex: 16
        }

        $newMatches = [];

        // Encontra a data do último jogo finalizado para usar como base
        $lastMatchDate = MatchModel::where('championship_id', $championshipId)
            ->whereNotNull('group_name')
            ->max('start_time');

        $baseDate = $lastMatchDate ? Carbon::parse($lastMatchDate)->addDays(7) : Carbon::now()->addDays(7);

        for ($i = 0; $i < $numGroups; $i += 2) {
            $g1 = $groupNames[$i];   // ex: A
            $g2 = $groupNames[$i + 1]; // ex: B

            // Jogo 1: 1º do G1 vs 2º do G2
            if (isset($qualifiedTeams[$g1][0]) && isset($qualifiedTeams[$g2][1])) {
                $newMatches[] = MatchModel::create([
                    'championship_id' => $championshipId,
                    'category_id' => $categoryId,
                    'home_team_id' => $qualifiedTeams[$g1][0],
                    'away_team_id' => $qualifiedTeams[$g2][1],
                    'start_time' => $baseDate,
                    'location' => $championship->location,
                    'status' => 'scheduled',
                    'round' => $nextRoundName,
                    'is_knockout' => true
                ]);
            }

            // Jogo 2: 1º do G2 vs 2º do G1
            if (isset($qualifiedTeams[$g2][0]) && isset($qualifiedTeams[$g1][1])) {
                $newMatches[] = MatchModel::create([
                    'championship_id' => $championshipId,
                    'category_id' => $categoryId,
                    'home_team_id' => $qualifiedTeams[$g2][0],
                    'away_team_id' => $qualifiedTeams[$g1][1],
                    'start_time' => $baseDate,
                    'location' => $championship->location,
                    'status' => 'scheduled',
                    'round' => $nextRoundName,
                    'is_knockout' => true
                ]);
            }
        }

        return response()->json([
            'message' => 'Mata-mata gerado com sucesso!',
            'matches' => $newMatches,
            'round_name' => $nextRoundName
        ]);
    }
}
