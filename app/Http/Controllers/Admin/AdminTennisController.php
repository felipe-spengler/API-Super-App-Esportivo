<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GameMatch;
use App\Models\MatchSet;
use Illuminate\Support\Facades\DB;

class AdminTennisController extends Controller
{
    public function getState($matchId)
    {
        $match = GameMatch::findOrFail($matchId);
        $state = $this->recalculateState($match);
        $match->match_details = array_merge($match->match_details ?? [], ['tennis_state' => $state]);
        $match->save();

        $champId = $match->championship_id;
        $match->load([
            'homeTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            },
            'awayTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            },
            'championship.sport',
            'events' => function ($q) {
                $q->whereIn('event_type', ['point', 'ace'])->orderBy('id', 'desc')->limit(10);
            },
            'events.player'
        ]);

        $details = $match->match_details ?? [];
        $tennisState = $details['tennis_state'] ?? [
            'current_set' => 1,
            'serving_team_id' => null,
            'game_score' => ['home' => 0, 'away' => 0],
            'games_won' => ['home' => 0, 'away' => 0],
            'match_finished' => false,
            'is_tiebreak' => false,
            'actual_start_time' => $details['actual_start_time'] ?? null,
            'actual_end_time' => $details['actual_end_time'] ?? null
        ];

        $sets = MatchSet::where('game_match_id', $matchId)->orderBy('set_number')->get();

        return response()->json([
            'match' => $match,
            'state' => $tennisState,
            'sets' => $sets
        ]);
    }

    public function updateTimes(Request $request, $matchId)
    {
        $match = GameMatch::findOrFail($matchId);
        $details = $match->match_details ?? [];

        if ($request->has('actual_start_time')) {
            $details['actual_start_time'] = $request->input('actual_start_time');
            $match->status = 'live';
        }

        if ($request->has('actual_end_time')) {
            $details['actual_end_time'] = $request->input('actual_end_time');
        }

        $match->match_details = $details;
        $match->save();

        return $this->getState($matchId);
    }

    public function finishMatch(Request $request, $matchId)
    {
        $match = GameMatch::findOrFail($matchId);
        $details = $match->match_details ?? [];

        // 1. Update end time and ensure tennis_state is marked as finished
        $details['actual_end_time'] = $request->input('actual_end_time', now()->format('H:i'));
        if (isset($details['tennis_state'])) {
            $details['tennis_state']['match_finished'] = true;
            $details['tennis_state']['actual_end_time'] = $details['actual_end_time'];
        }
        $match->match_details = $details;
        $match->save();

        // 2. Run recalculation to sync sets/history, but match score will be overridden by request
        $this->recalculateState($match);
        $match->refresh();

        // 3. Call generic finish logic with prioritized manual scores
        // This ensures the match status moves to 'finished' and brackets advance correctly
        $adminMatchController = new AdminMatchController();
        $adminMatchController->finish(new Request([
            'home_score' => $request->input('home_score', $match->home_score),
            'away_score' => $request->input('away_score', $match->away_score)
        ]), $matchId);

        // 4. Return full state
        return $this->getState($matchId);
    }

    private function recalculateState($match)
    {
        $events = DB::table('match_events')
            ->where('game_match_id', $match->id)
            ->whereIn('event_type', ['point', 'ace'])
            ->orderBy('id', 'asc')
            ->get();

        $details = $match->match_details ?? [];
        $state = [
            'current_set' => 1,
            'serving_team_id' => $details['tennis_state']['serving_team_id'] ?? null,
            'game_score' => ['home' => 0, 'away' => 0],
            'games_won' => ['home' => 0, 'away' => 0],
            'match_finished' => false,
            'is_tiebreak' => false,
            'actual_start_time' => $details['actual_start_time'] ?? null,
            'actual_end_time' => $details['actual_end_time'] ?? null
        ];

        // Reset Match/Sets score for fresh calculation
        $match->home_score = 0;
        $match->away_score = 0;
        $match->status = $match->status === 'finished' ? 'live' : $match->status;
        MatchSet::where('game_match_id', $match->id)->delete();

        foreach ($events as $event) {
            $isHome = ($event->team_id == $match->home_team_id);
            $opponentId = $isHome ? $match->away_team_id : $match->home_team_id;
            $teamScoreKey = $isHome ? 'home' : 'away';
            $opponentScoreKey = $isHome ? 'away' : 'home';

            // Point Logic
            $state['game_score'][$teamScoreKey]++;

            $gameWon = false;
            if ($state['is_tiebreak']) {
                if ($state['game_score'][$teamScoreKey] >= 7 && $state['game_score'][$teamScoreKey] >= $state['game_score'][$opponentScoreKey] + 2) {
                    $gameWon = true;
                }
            } else {
                if ($state['game_score'][$teamScoreKey] >= 4) {
                    if ($state['game_score'][$teamScoreKey] >= $state['game_score'][$opponentScoreKey] + 2) {
                        $gameWon = true;
                    } elseif ($state['game_score'][$teamScoreKey] === 4 && $state['game_score'][$opponentScoreKey] === 4) {
                        $state['game_score']['home'] = 3;
                        $state['game_score']['away'] = 3;
                    }
                }
            }

            if ($gameWon) {
                $state['game_score'] = ['home' => 0, 'away' => 0];
                $state['games_won'][$teamScoreKey]++;
                $state['is_tiebreak'] = false;

                if ($state['serving_team_id']) {
                    $state['serving_team_id'] = ($state['serving_team_id'] == $match->home_team_id) ? $match->away_team_id : $match->home_team_id;
                }

                $setFinished = false;
                if ($state['games_won'][$teamScoreKey] >= 6 && $state['games_won'][$teamScoreKey] >= $state['games_won'][$opponentScoreKey] + 2) {
                    $setFinished = true;
                } elseif ($state['games_won'][$teamScoreKey] === 7) {
                    $setFinished = true;
                } elseif ($state['games_won']['home'] === 6 && $state['games_won']['away'] === 6) {
                    $state['is_tiebreak'] = true;
                }

                if ($setFinished) {
                    $this->finishSetInternal($match, $state, $state['games_won']);
                }
            }
        }

        return $state;
    }

    public function registerPoint(Request $request, $matchId)
    {
        $match = GameMatch::findOrFail($matchId);

        $teamId = $request->input('team_id'); // Team that WON the point
        $playerId = $request->input('player_id'); // Player that made the action
        $pointType = $request->input('point_type', 'point'); // point, ace, winner, forced_error, unforced_error, double_fault
        $gameTime = $request->input('game_time', '00:00');

        return DB::transaction(function () use ($match, $teamId, $playerId, $pointType, $gameTime) {
            $details = $match->match_details ?? [];
            $state = $details['tennis_state'] ?? [
                'current_set' => 1,
                'serving_team_id' => null,
                'game_score' => ['home' => 0, 'away' => 0],
                'games_won' => ['home' => 0, 'away' => 0],
                'match_finished' => false,
                'is_tiebreak' => false
            ];

            if ($state['match_finished']) {
                return response()->json(['error' => 'Partida já finalizada'], 400);
            }

            $isHome = ($teamId == $match->home_team_id);
            $opponentId = $isHome ? $match->away_team_id : $match->home_team_id;

            // 1. Update Game Score
            $score = $state['game_score'];
            $opponentScoreKey = $isHome ? 'away' : 'home';
            $teamScoreKey = $isHome ? 'home' : 'away';

            $score[$teamScoreKey]++;
            $gameWon = false;

            if ($state['is_tiebreak']) {
                // Tiebreak: First to 7, lead by 2
                if ($score[$teamScoreKey] >= 7 && $score[$teamScoreKey] >= $score[$opponentScoreKey] + 2) {
                    $gameWon = true;
                }
            } else {
                // Standard: 0, 15, 30, 40, Vantage
                if ($score[$teamScoreKey] >= 4) {
                    if ($score[$teamScoreKey] >= $score[$opponentScoreKey] + 2) {
                        $gameWon = true;
                    } elseif ($score[$teamScoreKey] === 4 && $score[$opponentScoreKey] === 4) {
                        // Deuce (back to 40-40)
                        $score['home'] = 3;
                        $score['away'] = 3;
                    }
                }
            }

            // 2. Handle Game Won
            if ($gameWon) {
                $score = ['home' => 0, 'away' => 0];
                $state['games_won'][$teamScoreKey]++;
                $state['is_tiebreak'] = false; // Reset tiebreak flag after game

                // Record Game Won Event
                DB::table('match_events')->insert([
                    'game_match_id' => $match->id,
                    'team_id' => $teamId,
                    'event_type' => 'game_won',
                    'period' => "Set {$state['current_set']}",
                    'game_time' => $gameTime,
                    'metadata' => json_encode([
                        'label' => "Game Ganho - " . ($isHome ? $match->homeTeam->name : $match->awayTeam->name),
                        'system_period' => "Set {$state['current_set']}"
                    ]),
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Toggle server on game end
                if ($state['serving_team_id']) {
                    $state['serving_team_id'] = ($state['serving_team_id'] == $match->home_team_id) ? $match->away_team_id : $match->home_team_id;
                }

                // Check if Set Won
                $setFinished = false;
                $gamesWon = $state['games_won'];
                if ($gamesWon[$teamScoreKey] >= 6 && $gamesWon[$teamScoreKey] >= $gamesWon[$opponentScoreKey] + 2) {
                    $setFinished = true;
                } elseif ($gamesWon[$teamScoreKey] === 7) {
                    $setFinished = true;
                } elseif ($gamesWon['home'] === 6 && $gamesWon['away'] === 6) {
                    $state['is_tiebreak'] = true;
                }

                if ($setFinished) {
                    // Record Set Won Event BEFORE state changes to next set
                    DB::table('match_events')->insert([
                        'game_match_id' => $match->id,
                        'team_id' => $teamId,
                        'event_type' => 'set_won',
                        'period' => "Set {$state['current_set']}",
                        'game_time' => $gameTime,
                        'metadata' => json_encode([
                            'label' => "Set Ganho - " . ($isHome ? $match->homeTeam->name : $match->awayTeam->name),
                            'system_period' => "Set {$state['current_set']}"
                        ]),
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);

                    $this->finishSetInternal($match, $state, $gamesWon);
                }
            }

            $state['game_score'] = $score;
            $details['tennis_state'] = $state;
            $match->match_details = $details;
            $match->save();

            // 3. Record Point Event
            // Note: teamId is already the winner of the point
            $this->logTennisEvent($match, $teamId, $playerId, $pointType, $gameTime, $state);

            return $this->getState($match->id);
        });
    }

    private function finishSetInternal($match, &$state, $finalGames)
    {
        $setNum = $state['current_set'];
        MatchSet::updateOrCreate(
            ['game_match_id' => $match->id, 'set_number' => (string) $setNum],
            ['home_score' => $finalGames['home'], 'away_score' => $finalGames['away'], 'end_time' => now()]
        );

        // Update match sets score
        $sets = MatchSet::where('game_match_id', $match->id)->get();
        $homeSets = 0;
        $awaySets = 0;
        foreach ($sets as $s) {
            if ($s->home_score > $s->away_score)
                $homeSets++;
            else
                $awaySets++;
        }

        $match->home_score = $homeSets;
        $match->away_score = $awaySets;

        // Check Match end (Best of 3)
        if ($homeSets >= 2 || $awaySets >= 2) {
            $state['match_finished'] = true;
            $match->status = 'finished';
        } else {
            $state['current_set']++;
            $state['games_won'] = ['home' => 0, 'away' => 0];
        }
        $match->save();
    }

    private function logTennisEvent($match, $teamId, $playerId, $type, $time, $state)
    {
        $labelMap = [
            'point' => 'Ponto Normal',
            'ace' => 'Ace (A)',
            'winner' => 'Winner (W)',
            'service_winner' => 'Saque Vencedor',
            'double_fault' => 'Dupla Falta (DF)',
            'foot_fault' => 'Falta de pé',
            'unforced_error' => 'Erro Adversário',
            'forced_error' => 'Erro Forçado',
        ];

        $player = $playerId ? \App\Models\User::find($playerId) : null;
        $pName = $player ? ($player->nickname ?: $player->name) : ($teamId == $match->home_team_id ? $match->homeTeam->name : $match->awayTeam->name);

        $setNum = $state['current_set'];
        $scoreLabel = "{$state['game_score']['home']}-{$state['game_score']['away']}";

        DB::table('match_events')->insert([
            'game_match_id' => $match->id,
            'team_id' => $teamId,
            'player_id' => $playerId,
            'event_type' => in_array($type, ['ace', 'service_winner']) ? 'ace' : 'point',
            'period' => "Set {$setNum}",
            'game_time' => $time,
            'metadata' => json_encode([
                'label' => ($labelMap[$type] ?? 'Ponto') . " - {$pName}",
                'tennis_type' => $type,
                'score' => $scoreLabel,
                'system_period' => "Set {$setNum}"
            ]),
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    public function setServer(Request $request, $matchId)
    {
        $match = GameMatch::findOrFail($matchId);
        $details = $match->match_details;
        $details['tennis_state']['serving_team_id'] = $request->input('team_id');
        $match->match_details = $details;
        $match->save();
        return $this->getState($matchId);
    }

    public function undoPoint($matchId)
    {
        $match = GameMatch::findOrFail($matchId);

        $lastEvent = DB::table('match_events')
            ->where('game_match_id', $match->id)
            ->whereIn('event_type', ['point', 'ace'])
            ->orderBy('id', 'desc')
            ->first();

        if ($lastEvent) {
            DB::table('match_events')->where('id', $lastEvent->id)->delete();
        }

        return $this->getState($matchId);
    }
}
