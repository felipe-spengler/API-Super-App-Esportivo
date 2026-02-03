<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Championship;
use App\Models\GameMatch;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $clubId = $user->club_id;

            // Helper for scoping
            $scopeClub = function ($query, $column = 'club_id') use ($clubId) {
                if ($clubId) {
                    $query->where($column, $clubId);
                }
            };

            // Get total counts
            $totalChampionships = Championship::when($clubId, fn($q) => $q->where('club_id', $clubId))->count();

            $activeChampionships = Championship::when($clubId, fn($q) => $q->where('club_id', $clubId))
                ->where(function ($q) {
                    $q->where('status', 'active')
                        ->orWhere(function ($sub) {
                            $sub->where('end_date', '>=', now());
                        });
                })
                ->count();

            $totalTeams = Team::when($clubId, fn($q) => $q->where('club_id', $clubId))->count();

            // Adjust player count based on club
            $totalPlayers = User::where('user_type', 'player')
                ->when($clubId, fn($q) => $q->whereHas('teamsAsPlayer', fn($t) => $t->where('club_id', $clubId))) // Assuming players are linked to club via teams
                ->count();

            $totalMatches = GameMatch::when($clubId, fn($q) => $q->whereHas('championship', fn($c) => $c->where('club_id', $clubId)))->count();

            $finishedMatches = GameMatch::where('status', 'finished')
                ->when($clubId, fn($q) => $q->whereHas('championship', fn($c) => $c->where('club_id', $clubId)))
                ->count();

            $upcomingMatches = GameMatch::where('status', 'scheduled')
                ->where('start_time', '>=', now())
                ->when($clubId, fn($q) => $q->whereHas('championship', fn($c) => $c->where('club_id', $clubId)))
                ->count();

            // Get recent activities (last 10 records)
            $recentChampionships = Championship::when($clubId, fn($q) => $q->where('club_id', $clubId))
                ->orderBy('created_at', 'desc')
                ->with('sport')
                ->take(3)
                ->get();

            $recentTeams = Team::when($clubId, fn($q) => $q->where('club_id', $clubId))
                ->orderBy('created_at', 'desc')
                ->take(3)
                ->get();

            $recentPlayers = User::where('user_type', 'player')
                ->when($clubId, fn($q) => $q->whereHas('teamsAsPlayer', fn($t) => $t->where('club_id', $clubId)))
                ->orderBy('created_at', 'desc')
                ->take(3)
                ->get();

            // Fix: Use correct relationship names homeTeam and awayTeam
            $recentMatches = GameMatch::where('status', 'finished')
                ->when($clubId, fn($q) => $q->whereHas('championship', fn($c) => $c->where('club_id', $clubId)))
                ->orderBy('created_at', 'desc')
                ->with(['homeTeam', 'awayTeam'])
                ->take(3)
                ->get();

            // Build activities timeline
            $activities = [];

            foreach ($recentChampionships as $championship) {
                $activities[] = [
                    'id' => 'champ_' . $championship->id,
                    'type' => 'championship',
                    'title' => 'Novo Campeonato',
                    'description' => $championship->name,
                    'time' => $this->getTimeAgo($championship->created_at),
                    'created_at' => $championship->created_at,
                ];
            }

            foreach ($recentTeams as $team) {
                $activities[] = [
                    'id' => 'team_' . $team->id,
                    'type' => 'team',
                    'title' => 'Nova Equipe',
                    'description' => $team->name,
                    'time' => $this->getTimeAgo($team->created_at),
                    'created_at' => $team->created_at,
                ];
            }

            foreach ($recentPlayers as $player) {
                $activities[] = [
                    'id' => 'player_' . $player->id,
                    'type' => 'player',
                    'title' => 'Novo Atleta',
                    'description' => $player->name,
                    'time' => $this->getTimeAgo($player->created_at),
                    'created_at' => $player->created_at,
                ];
            }

            foreach ($recentMatches as $match) {
                // Fix: Use homeTeam and awayTeam relations
                $homeTeamName = $match->homeTeam->name ?? 'Time A';
                $awayTeamName = $match->awayTeam->name ?? 'Time B';

                $activities[] = [
                    'id' => 'match_' . $match->id,
                    'type' => 'match',
                    'title' => 'Partida Finalizada',
                    'description' => "{$homeTeamName} vs {$awayTeamName}",
                    'time' => $this->getTimeAgo($match->created_at),
                    'created_at' => $match->created_at,
                ];
            }

            // Sort by most recent
            usort($activities, function ($a, $b) {
                return $b['created_at'] <=> $a['created_at'];
            });

            $activities = array_slice($activities, 0, 10);

            // Remove created_at from final output (only used for sorting)
            foreach ($activities as &$activity) {
                unset($activity['created_at']);
            }

            return response()->json([
                'stats' => [
                    'total_championships' => $totalChampionships,
                    'active_championships' => $activeChampionships,
                    'total_teams' => $totalTeams,
                    'total_players' => $totalPlayers,
                    'total_matches' => $totalMatches,
                    'finished_matches' => $finishedMatches,
                    'upcoming_matches' => $upcomingMatches,
                ],
                'activities' => $activities,
            ]);
        } catch (\Exception $e) {
            \Log::error('Dashboard error: ' . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json([
                'stats' => [
                    'total_championships' => 0,
                    'active_championships' => 0,
                    'total_teams' => 0,
                    'total_players' => 0,
                    'total_matches' => 0,
                    'finished_matches' => 0,
                    'upcoming_matches' => 0,
                ],
                'activities' => [],
                'error' => $e->getMessage()
            ], 500);
        }
    }

    private function getTimeAgo($dateTime)
    {
        $now = now();
        $diff = $now->diffInMinutes($dateTime);

        if ($diff < 60) {
            return $diff === 1 ? 'Há 1 minuto' : "Há {$diff} minutos";
        }

        $diff = $now->diffInHours($dateTime);
        if ($diff < 24) {
            return $diff === 1 ? 'Há 1 hora' : "Há {$diff} horas";
        }

        $diff = $now->diffInDays($dateTime);
        if ($diff < 7) {
            return $diff === 1 ? 'Há 1 dia' : "Há {$diff} dias";
        }

        if ($diff < 30) {
            $weeks = floor($diff / 7);
            return $weeks === 1 ? 'Há 1 semana' : "Há {$weeks} semanas";
        }

        $months = $now->diffInMonths($dateTime);
        if ($months < 12) {
            return $months === 1 ? 'Há 1 mês' : "Há {$months} meses";
        }

        $years = $now->diffInYears($dateTime);
        return $years === 1 ? 'Há 1 ano' : "Há {$years} anos";
    }
}
