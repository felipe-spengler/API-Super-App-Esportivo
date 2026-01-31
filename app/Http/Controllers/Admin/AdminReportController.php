<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\GameMatch;
use App\Models\Team;
use App\Models\MatchEvent;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AdminReportController extends Controller
{
    /**
     * Get comprehensive dashboard statistics
     */
    public function dashboard(Request $request)
    {
        $user = $request->user();
        $clubId = $user->club_id;

        // Apply club filter if not super admin
        $championshipsQuery = Championship::query();
        $matchesQuery = GameMatch::query();
        $teamsQuery = Team::query();
        $playersQuery = User::query(); // Change from Player to User model if Player model doesn't exist or is for something else

        if ($clubId) {
            $championshipsQuery->where('club_id', $clubId);
            $matchesQuery->whereHas('championship', fn($q) => $q->where('club_id', $clubId));
            $teamsQuery->where('club_id', $clubId);
            $playersQuery->where('club_id', $clubId);
        }

        // Basic counts
        $totalChampionships = $championshipsQuery->count();
        $totalMatches = $matchesQuery->count();

        $stats = [
            'total_championships' => $totalChampionships,
            'active_championships' => (clone $championshipsQuery)->whereIn('status', ['active', 'in_progress'])->count(),
            'total_matches' => $totalMatches,
            'finished_matches' => (clone $matchesQuery)->where('status', 'Finalizado')->count(),
            'total_teams' => $teamsQuery->count(),
            'total_players' => $playersQuery->count(),
        ];

        // Championships by sport
        // Try to join with sports if sport column is not on championship table
        $championshipsBySport = (clone $championshipsQuery)
            ->join('sports', 'championships.sport_id', '=', 'sports.id')
            ->select('sports.name as sport', DB::raw('count(*) as count'))
            ->groupBy('sports.name')
            ->get()
            ->pluck('count', 'sport');

        // Matches by status
        $matchesByStatus = (clone $matchesQuery)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        // Recent championships
        $recentChampionships = (clone $championshipsQuery)
            ->with('sport')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'sport' => $c->sport->name ?? 'Outro',
                'status' => $c->status,
                'start_date' => $c->start_date,
                'end_date' => $c->end_date
            ]);

        // Upcoming matches
        $upcomingMatches = (clone $matchesQuery)
            ->with(['homeTeam', 'awayTeam', 'championship'])
            ->where('status', 'Agendado')
            ->where('start_time', '>', now())
            ->orderBy('start_time', 'asc')
            ->limit(10)
            ->get();

        // Top scorers (across all championships in club)
        $topScorers = MatchEvent::query()
            ->select('player_id', DB::raw('count(*) as goals'))
            ->where('event_type', 'goal')
            ->when($clubId, function ($q) use ($clubId) {
                $q->whereHas('match.championship', fn($query) => $query->where('club_id', $clubId));
            })
            ->groupBy('player_id')
            ->orderBy('goals', 'desc')
            ->limit(10)
            ->with('player')
            ->get()
            ->map(fn($e) => [
                'player_id' => $e->player_id,
                'player_name' => $e->player->name ?? 'Desconhecido',
                'goals' => $e->goals
            ]);

        // Cards statistics
        $yellowCards = MatchEvent::query()
            ->where('event_type', 'yellow_card')
            ->when($clubId, fn($q) => $q->whereHas('match.championship', fn($query) => $query->where('club_id', $clubId)))
            ->count();

        $redCards = MatchEvent::query()
            ->where('event_type', 'red_card')
            ->when($clubId, fn($q) => $q->whereHas('match.championship', fn($query) => $query->where('club_id', $clubId)))
            ->count();

        return response()->json([
            'stats' => $stats,
            'championships_by_sport' => $championshipsBySport,
            'matches_by_status' => $matchesByStatus,
            'recent_championships' => $recentChampionships,
            'upcoming_matches' => $upcomingMatches,
            'top_scorers' => $topScorers,
            'cards' => [
                'yellow' => $yellowCards,
                'red' => $redCards
            ]
        ]);
    }

    /**
     * Get championship-specific report
     */
    public function championshipReport($championshipId)
    {
        $championship = Championship::with(['teams', 'matches'])->findOrFail($championshipId);

        $matches = $championship->matches;
        $teams = $championship->teams;

        // Matches statistics
        $totalMatches = $matches->count();
        $finishedMatches = $matches->where('status', 'Finalizado')->count();
        $scheduledMatches = $matches->where('status', 'Agendado')->count();

        // Goals statistics
        $totalGoals = MatchEvent::whereIn('game_match_id', $matches->pluck('id'))
            ->where('event_type', 'goal')
            ->count();

        // Top scorer in this championship
        $topScorer = MatchEvent::query()
            ->select('player_id', DB::raw('count(*) as goals'))
            ->whereIn('game_match_id', $matches->pluck('id'))
            ->where('event_type', 'goal')
            ->groupBy('player_id')
            ->orderBy('goals', 'desc')
            ->with('player')
            ->first();

        // Team standings (wins, draws, losses)
        $standings = [];
        foreach ($teams as $team) {
            $homeMatches = $matches->where('home_team_id', $team->id)->where('status', 'Finalizado');
            $awayMatches = $matches->where('away_team_id', $team->id)->where('status', 'Finalizado');

            $wins = 0;
            $draws = 0;
            $losses = 0;
            $goalsFor = 0;
            $goalsAgainst = 0;

            foreach ($homeMatches as $m) {
                $goalsFor += $m->home_score;
                $goalsAgainst += $m->away_score;
                if ($m->home_score > $m->away_score)
                    $wins++;
                elseif ($m->home_score == $m->away_score)
                    $draws++;
                else
                    $losses++;
            }

            foreach ($awayMatches as $m) {
                $goalsFor += $m->away_score;
                $goalsAgainst += $m->home_score;
                if ($m->away_score > $m->home_score)
                    $wins++;
                elseif ($m->away_score == $m->home_score)
                    $draws++;
                else
                    $losses++;
            }

            $standings[] = [
                'team_id' => $team->id,
                'team_name' => $team->name,
                'played' => $homeMatches->count() + $awayMatches->count(),
                'wins' => $wins,
                'draws' => $draws,
                'losses' => $losses,
                'goals_for' => $goalsFor,
                'goals_against' => $goalsAgainst,
                'goal_difference' => $goalsFor - $goalsAgainst,
                'points' => ($wins * 3) + $draws
            ];
        }

        // Sort by points
        usort($standings, fn($a, $b) => $b['points'] <=> $a['points']);

        return response()->json([
            'championship' => $championship,
            'stats' => [
                'total_matches' => $totalMatches,
                'finished_matches' => $finishedMatches,
                'scheduled_matches' => $scheduledMatches,
                'total_goals' => $totalGoals,
                'total_teams' => $teams->count()
            ],
            'top_scorer' => $topScorer ? [
                'player_name' => $topScorer->player->name ?? 'Desconhecido',
                'goals' => $topScorer->goals
            ] : null,
            'standings' => $standings
        ]);
    }

    /**
     * Export data as CSV
     */
    public function export(Request $request)
    {
        $type = $request->input('type', 'matches'); // matches, teams, players

        $user = $request->user();
        $clubId = $user->club_id;

        $csv = "";

        switch ($type) {
            case 'matches':
                $matches = GameMatch::with(['homeTeam', 'awayTeam', 'championship'])
                    ->when($clubId, fn($q) => $q->whereHas('championship', fn($query) => $query->where('club_id', $clubId)))
                    ->get();

                $csv = "Data,Campeonato,Casa,Visitante,Placar,Status\n";
                foreach ($matches as $m) {
                    $csv .= sprintf(
                        "%s,%s,%s,%s,%s x %s,%s\n",
                        $m->start_time->format('d/m/Y H:i'),
                        $m->championship->name,
                        $m->homeTeam->name,
                        $m->awayTeam->name,
                        $m->home_score ?? '-',
                        $m->away_score ?? '-',
                        $m->status
                    );
                }
                break;

            case 'teams':
                $teams = Team::with('championship')
                    ->when($clubId, fn($q) => $q->where('club_id', $clubId))
                    ->get();

                $csv = "Time,Campeonato,Categoria,Jogadores\n";
                foreach ($teams as $t) {
                    $csv .= sprintf(
                        "%s,%s,%s,%d\n",
                        $t->name,
                        $t->championship->name ?? '-',
                        $t->category ?? '-',
                        $t->players->count()
                    );
                }
                break;

            case 'players':
                $players = User::when($clubId, fn($q) => $q->where('club_id', $clubId))->get();

                $csv = "Nome,Email,Telefone,CPF\n";
                foreach ($players as $p) {
                    $csv .= sprintf(
                        "%s,%s,%s,%s\n",
                        $p->name,
                        $p->email,
                        $p->phone ?? '-',
                        $p->cpf ?? '-'
                    );
                }
                break;
        }

        return response($csv)
            ->header('Content-Type', 'text/csv; charset=utf-8')
            ->header('Content-Disposition', "attachment; filename=\"export_{$type}_" . now()->format('Y-m-d') . ".csv\"");
    }
}
