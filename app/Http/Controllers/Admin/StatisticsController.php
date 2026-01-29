<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GameMatch;
use App\Models\MatchEvent;
use App\Models\Championship;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class StatisticsController extends Controller
{
    /**
     * Estatísticas de gols por jogador
     */
    /**
     * Estatísticas de gols por jogador
     */
    public function goalsByPlayer(Request $request, $championshipId)
    {
        $championship = Championship::findOrFail($championshipId);

        $goals = MatchEvent::where('event_type', 'goal')
            ->whereHas('gameMatch', function ($query) use ($championshipId) {
                $query->where('championship_id', $championshipId);
            })
            ->select('player_id', DB::raw('count(*) as total_goals'))
            ->groupBy('player_id')
            ->orderBy('total_goals', 'desc')
            ->with('player:id,name,photo_path')
            ->limit(20)
            ->get();

        return response()->json($goals);
    }

    /**
     * Artilharia do campeonato
     */
    public function topScorers(Request $request, $championshipId)
    {
        $limit = $request->input('limit', 10);

        $scorers = MatchEvent::where('event_type', 'goal')
            ->whereHas('gameMatch', function ($query) use ($championshipId) {
                $query->where('championship_id', $championshipId);
            })
            ->select('player_id', DB::raw('count(*) as goals'))
            ->groupBy('player_id')
            ->orderBy('goals', 'desc')
            ->limit($limit)
            ->with('player:id,name,photo_path')
            ->get();

        return response()->json($scorers);
    }

    /**
     * Assistências por jogador
     */
    public function assistsByPlayer(Request $request, $championshipId)
    {
        $assists = MatchEvent::where('event_type', 'assist')
            ->whereHas('gameMatch', function ($query) use ($championshipId) {
                $query->where('championship_id', $championshipId);
            })
            ->select('player_id', DB::raw('count(*) as total_assists'))
            ->groupBy('player_id')
            ->orderBy('total_assists', 'desc')
            ->with('player:id,name,photo_path')
            ->limit(20)
            ->get();

        return response()->json($assists);
    }

    /**
     * Cartões por jogador
     */
    public function cardsByPlayer(Request $request, $championshipId)
    {
        $cards = MatchEvent::whereIn('event_type', ['yellow_card', 'red_card'])
            ->whereHas('gameMatch', function ($query) use ($championshipId) {
                $query->where('championship_id', $championshipId);
            })
            ->select(
                'player_id',
                DB::raw('SUM(CASE WHEN event_type = "yellow_card" THEN 1 ELSE 0 END) as yellow_cards'),
                DB::raw('SUM(CASE WHEN event_type = "red_card" THEN 1 ELSE 0 END) as red_cards'),
                DB::raw('COUNT(*) as total_cards')
            )
            ->groupBy('player_id')
            ->orderBy('total_cards', 'desc')
            ->with('player:id,name,photo_path')
            ->limit(20)
            ->get();

        return response()->json($cards);
    }

    /**
     * Classificação do campeonato
     */
    public function standings(Request $request, $championshipId)
    {
        $championship = Championship::findOrFail($championshipId);

        // Busca todas as partidas finalizadas
        $matches = GameMatch::where('championship_id', $championshipId)
            ->where('status', 'finished')
            // ->with(['homeTeam', 'awayTeam']) // Optimization
            ->get();

        $standings = [];

        foreach ($matches as $match) {
            // Inicializa equipes se não existirem
            $groupName = $match->group_name ?? 'Geral';

            if (!isset($standings[$match->home_team_id])) {
                $standings[$match->home_team_id] = [
                    'team_id' => $match->home_team_id,
                    'team_name' => $match->homeTeam->name ?? 'N/A',
                    'team_logo' => $match->homeTeam->logo_path ? asset('storage/' . $match->homeTeam->logo_path) : null,
                    'group_name' => $groupName,
                    'played' => 0,
                    'won' => 0,
                    'drawn' => 0,
                    'lost' => 0,
                    'goals_for' => 0,
                    'goals_against' => 0,
                    'goal_difference' => 0,
                    'points' => 0,
                ];
            }

            if (!isset($standings[$match->away_team_id])) {
                $standings[$match->away_team_id] = [
                    'team_id' => $match->away_team_id,
                    'team_name' => $match->awayTeam->name ?? 'N/A',
                    'team_logo' => $match->awayTeam->logo_path ? asset('storage/' . $match->awayTeam->logo_path) : null,
                    'group_name' => $groupName,
                    'played' => 0,
                    'won' => 0,
                    'drawn' => 0,
                    'lost' => 0,
                    'goals_for' => 0,
                    'goals_against' => 0,
                    'goal_difference' => 0,
                    'points' => 0,
                ];
            }

            // Atualiza estatísticas
            $standings[$match->home_team_id]['played']++;
            $standings[$match->away_team_id]['played']++;

            $standings[$match->home_team_id]['goals_for'] += $match->home_score ?? 0;
            $standings[$match->home_team_id]['goals_against'] += $match->away_score ?? 0;

            $standings[$match->away_team_id]['goals_for'] += $match->away_score ?? 0;
            $standings[$match->away_team_id]['goals_against'] += $match->home_score ?? 0;

            // Determina resultado
            if ($match->home_score > $match->away_score) {
                $standings[$match->home_team_id]['won']++;
                $standings[$match->home_team_id]['points'] += 3;
                $standings[$match->away_team_id]['lost']++;
            } elseif ($match->home_score < $match->away_score) {
                $standings[$match->away_team_id]['won']++;
                $standings[$match->away_team_id]['points'] += 3;
                $standings[$match->home_team_id]['lost']++;
            } else {
                $standings[$match->home_team_id]['drawn']++;
                $standings[$match->away_team_id]['drawn']++;
                $standings[$match->home_team_id]['points']++;
                $standings[$match->away_team_id]['points']++;
            }
        }

        // Calcula saldo de gols
        foreach ($standings as &$team) {
            $team['goal_difference'] = $team['goals_for'] - $team['goals_against'];
        }

        // Ordena por Grupo, Pontos, Saldo
        usort($standings, function ($a, $b) {
            if ($a['group_name'] != $b['group_name']) {
                return strcmp($a['group_name'], $b['group_name']);
            }
            if ($a['points'] != $b['points']) {
                return $b['points'] - $a['points'];
            }
            if ($a['goal_difference'] != $b['goal_difference']) {
                return $b['goal_difference'] - $a['goal_difference'];
            }
            return $b['goals_for'] - $a['goals_for'];
        });

        // Adiciona Posição (reinicia por grupo)
        $rankedStandings = array_values($standings);
        $currentGroup = null;
        $position = 1;

        foreach ($rankedStandings as &$row) {
            if ($row['group_name'] !== $currentGroup) {
                $currentGroup = $row['group_name'];
                $position = 1;
            }
            $row['position'] = $position++;
        }

        return response()->json($rankedStandings);
    }

    /**
     * Histórico de um jogador
     */
    public function playerHistory(Request $request, $playerId)
    {
        $player = User::findOrFail($playerId);

        // Partidas jogadas
        $matches = MatchEvent::where('player_id', $playerId)
            ->with('gameMatch.championship:id,name')
            ->select('game_match_id')
            ->distinct()
            ->get();

        // Estatísticas gerais
        $stats = [
            'total_matches' => $matches->count(),
            'total_goals' => MatchEvent::where('player_id', $playerId)
                ->where('event_type', 'goal')
                ->count(),
            'total_assists' => MatchEvent::where('player_id', $playerId)
                ->where('event_type', 'assist')
                ->count(),
            'yellow_cards' => MatchEvent::where('player_id', $playerId)
                ->where('event_type', 'yellow_card')
                ->count(),
            'red_cards' => MatchEvent::where('player_id', $playerId)
                ->where('event_type', 'red_card')
                ->count(),
            'mvp_awards' => GameMatch::where('mvp_player_id', $playerId)->count(),
        ];

        return response()->json([
            'player' => $player,
            'stats' => $stats,
            'matches' => $matches,
        ]);
    }

    /**
     * Dashboard geral do campeonato
     */
    public function championshipDashboard(Request $request, $championshipId)
    {
        $championship = Championship::with('sport')->findOrFail($championshipId);

        $stats = [
            'total_teams' => $championship->teams()->count(),
            'total_matches' => GameMatch::where('championship_id', $championshipId)->count(),
            'finished_matches' => GameMatch::where('championship_id', $championshipId)
                ->where('status', 'finished')
                ->count(),
            'total_goals' => MatchEvent::where('event_type', 'goal')
                ->whereHas('gameMatch', function ($query) use ($championshipId) {
                    $query->where('championship_id', $championshipId);
                })
                ->count(),
            'total_players' => MatchEvent::whereHas('gameMatch', function ($query) use ($championshipId) {
                $query->where('championship_id', $championshipId);
            })
                ->distinct('player_id')
                ->count('player_id'),
        ];

        return response()->json([
            'championship' => $championship,
            'stats' => $stats,
        ]);
    }
}
