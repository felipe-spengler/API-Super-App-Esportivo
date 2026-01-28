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
            'format' => 'required|in:league,knockout,groups',
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
                $matches = $this->generateGroupsBracket($championship, $teams, $startDate, $intervalDays, $categoryId);
                break;
        }

        return response()->json([
            'message' => 'Chaveamento gerado com sucesso!',
            'matches_created' => count($matches),
            'matches' => $matches
        ]);
    }

    /**
     * Gera chaveamento de liga (todos contra todos)
     */
    private function generateLeagueBracket($championship, $teams, $startDate, $intervalDays, $categoryId = null)
    {
        $matches = [];
        $teamsArray = $teams->toArray();
        $totalTeams = count($teamsArray);
        $matchDate = $startDate->copy();

        // Todos contra todos
        for ($i = 0; $i < $totalTeams; $i++) {
            for ($j = $i + 1; $j < $totalTeams; $j++) {
                $match = MatchModel::create([
                    'championship_id' => $championship->id,
                    'category_id' => $categoryId,
                    'home_team_id' => $teamsArray[$i]['id'],
                    'away_team_id' => $teamsArray[$j]['id'],
                    'start_time' => $matchDate->format('Y-m-d H:i:s'),
                    'location' => $championship->location ?? 'A definir',
                    'status' => 'scheduled',
                    'round_number' => 1,
                ]);

                $matches[] = $match;
                $matchDate->addDays($intervalDays);
            }
        }

        return $matches;
    }

    /**
     * Gera chaveamento de mata-mata
     */
    private function generateKnockoutBracket($championship, $teams, $startDate, $intervalDays, $categoryId = null)
    {
        $matches = [];
        $teamsArray = $teams->shuffle()->toArray();
        $totalTeams = count($teamsArray);

        // Calcula número de rodadas (potência de 2 mais próxima)
        $rounds = ceil(log($totalTeams, 2));
        $matchDate = $startDate->copy();

        // Primeira rodada
        $round = 1;
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
                $matchDate->addDays($intervalDays);
            }
        }

        return $matches;
    }

    /**
     * Gera chaveamento de grupos
     */
    private function generateGroupsBracket($championship, $teams, $startDate, $intervalDays, $categoryId = null)
    {
        $matches = [];
        $teamsArray = $teams->shuffle()->toArray();
        $totalTeams = count($teamsArray);

        // Divide em 4 grupos (ou menos se houver poucas equipes)
        $numGroups = min(4, ceil($totalTeams / 3));
        $teamsPerGroup = ceil($totalTeams / $numGroups);

        $groups = array_chunk($teamsArray, $teamsPerGroup);
        $matchDate = $startDate->copy();

        // Gera partidas dentro de cada grupo
        foreach ($groups as $groupIndex => $groupTeams) {
            $groupName = chr(65 + $groupIndex); // A, B, C, D...

            for ($i = 0; $i < count($groupTeams); $i++) {
                for ($j = $i + 1; $j < count($groupTeams); $j++) {
                    $match = MatchModel::create([
                        'championship_id' => $championship->id,
                        'category_id' => $categoryId,
                        'home_team_id' => $groupTeams[$i]['id'],
                        'away_team_id' => $groupTeams[$j]['id'],
                        'start_time' => $matchDate->format('Y-m-d H:i:s'),
                        'location' => $championship->location ?? 'A definir',
                        'status' => 'scheduled',
                        'round_number' => 1,
                        'group_name' => "Grupo {$groupName}",
                    ]);

                    $matches[] = $match;
                    $matchDate->addDays($intervalDays);
                }
            }
        }

        return $matches;
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
