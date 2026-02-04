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
                $matches = $this->generateLeagueBracket($championship, $teams, $startDate, $intervalDays, $categoryId);
                break;

            case 'knockout':
                $matches = $this->generateKnockoutBracket($championship, $teams, $startDate, $intervalDays, $categoryId);
                break;

            case 'groups':
            case 'league_playoffs': // Treat league_playoffs as groups initially
                $customGroups = $request->input('custom_groups'); // Array of arrays of team IDs
                $matches = $this->generateGroupsBracket($championship, $teams, $startDate, $intervalDays, $categoryId, $customGroups);
                break;
        }

        return response()->json([
            'message' => 'Chaveamento gerado com sucesso!',
            'matches_created' => count($matches),
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
        $teamsArray = $teams instanceof \Illuminate\Support\Collection ? $teams->values()->toArray() : array_values($teams);

        \Log::info("Scheduler Round Robin Start", [
            'count' => count($teamsArray),
            'teams' => array_map(function ($t) {
                return $t['id'] . ':' . ($t['name'] ?? 'unknown');
            }, $teamsArray)
        ]);

        if (count($teamsArray) % 2 != 0) {
            $teamsArray[] = null; // Dummy team for bye
            \Log::info("Added dummy team, new count: " . count($teamsArray));
        }

        $numTeams = count($teamsArray);
        $numRounds = $numTeams - 1;
        $half = $numTeams / 2;
        $rounds = [];

        $indices = array_keys($teamsArray); // 0 to N-1

        for ($r = 0; $r < $numRounds; $r++) {
            $roundMatches = [];
            for ($i = 0; $i < $half; $i++) {
                $homeIdx = $indices[$i];
                $awayIdx = $indices[$numTeams - 1 - $i];

                $home = $teamsArray[$homeIdx];
                $away = $teamsArray[$awayIdx];

                if ($home !== null && $away !== null) {
                    $roundMatches[] = [$home, $away];
                } else {
                    \Log::info("Round $r Pair $i skipped (Dummy): " . ($home ? $home['name'] : 'NULL') . " vs " . ($away ? $away['name'] : 'NULL'));
                }
            }
            $rounds[] = $roundMatches;

            // Rotate indices for next round (keep index 0 fixed)
            $moving = array_splice($indices, 1);
            $last = array_pop($moving);
            array_unshift($moving, $last);
            $indices = array_merge([$indices[0]], $moving);
        }

        \Log::info("Generated Rounds Count: " . count($rounds));
        foreach ($rounds as $idx => $rnd) {
            \Log::info("Round " . ($idx + 1) . " matches: " . count($rnd));
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
}
