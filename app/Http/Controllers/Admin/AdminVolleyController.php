<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GameMatch;
use App\Models\MatchSet;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdminVolleyController extends Controller
{
    public function getState($matchId)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam'])->find($matchId);
        if (!$match)
            return response()->json(['error' => 'Partida não encontrada'], 404);

        $details = $match->match_details ?? [];
        $volleyState = $details['volley_state'] ?? [
            'current_set' => 1,
            'serving_team_id' => null,
            'history' => []
        ];

        // Ensure we have set data
        $sets = MatchSet::where('game_match_id', $matchId)->orderBy('set_number')->get();

        // Fetch current rotations from DB
        $currentSetNum = $volleyState['current_set'];
        $dbRotations = DB::table('match_positions')
            ->where('game_match_id', $matchId)
            // ->where('set_number', $currentSetNum) // Disable set filter if positions are global or handle sets
            ->get()
            ->groupBy('team_id');

        $formattedRotations = [
            'home' => $this->formatRotation($dbRotations[$match->home_team_id] ?? collect([])),
            'away' => $this->formatRotation($dbRotations[$match->away_team_id] ?? collect([]))
        ];

        return response()->json([
            'match' => $match,
            'state' => $volleyState,
            'sets' => $sets,
            'current_rotations' => $formattedRotations
        ]);
    }

    private function formatRotation($collection)
    {
        $rot = array_fill(0, 6, null);
        foreach ($collection as $pos) {
            if ($pos->position >= 1 && $pos->position <= 6) {
                // Adjust for array index 0-5
                $rot[$pos->position - 1] = $pos->player_id;
            }
        }
        return $rot;
    }

    public function startSet(Request $request, $matchId)
    {
        $match = GameMatch::findOrFail($matchId);

        $setNumber = $request->input('set_number');
        $homeRotation = $request->input('home_rotation');
        $awayRotation = $request->input('away_rotation');
        $servingTeamId = $request->input('serving_team_id');

        DB::transaction(function () use ($match, $setNumber, $homeRotation, $awayRotation, $servingTeamId) {
            // 1. Create/Reset Set row
            MatchSet::updateOrCreate(
                [
                    'game_match_id' => $match->id,
                    'set_number' => (string) $setNumber
                ],
                [
                    'home_score' => 0,
                    'away_score' => 0
                ]
            );

            // 2. Save Rotations
            $this->saveRotationDB($match->id, $match->home_team_id, $setNumber, $homeRotation);
            $this->saveRotationDB($match->id, $match->away_team_id, $setNumber, $awayRotation);

            // 3. Update JSON State
            $details = $match->match_details ?? [];

            // Preserve history if exists, else init
            $existingHistory = $details['volley_state']['history'] ?? [];

            $details['volley_state'] = [
                'current_set' => $setNumber,
                'serving_team_id' => $servingTeamId,
                'last_point_sideout' => false,
                'history' => $existingHistory
            ];
            $match->match_details = $details;
            $match->status = 'Em Andamento';
            $match->save();
        });

        return $this->getState($matchId);
    }

    public function registerPoint(Request $request, $matchId)
    {
        $teamId = $request->input('team_id');
        $playerId = $request->input('player_id'); // Optional: who made the point
        $pointType = $request->input('point_type', 'ataque');

        $match = GameMatch::findOrFail($matchId);

        DB::transaction(function () use ($match, $teamId, $playerId, $pointType) {
            $details = $match->match_details ?? [];
            $state = $details['volley_state'] ?? ['current_set' => 1, 'serving_team_id' => null, 'history' => []];

            $setNum = $state['current_set'];
            $set = MatchSet::where('game_match_id', $match->id)->where('set_number', (string) $setNum)->first();

            if (!$set)
                throw new \Exception("Set não iniciado");

            $isHome = ($teamId == $match->home_team_id);

            // 1. Increment Score
            if ($isHome)
                $set->increment('home_score');
            else
                $set->increment('away_score');

            // Reload set to get fresh scores
            $set->refresh();

            // Store Point History
            $historyItem = [
                'set' => $setNum,
                'team_id' => $teamId,
                'player_id' => $playerId,
                'home_score' => $set->home_score,
                'away_score' => $set->away_score,
                'type' => $pointType,
                'timestamp' => now()->toIso8601String()
            ];

            if (!isset($state['history']))
                $state['history'] = [];
            $state['history'][] = $historyItem;

            // 2. Check SideOutLogic
            if ($state['serving_team_id'] != $teamId) {
                // SideOut -> Rotate winning team -> They serve
                $this->rotateTeamDB($match->id, $teamId, $setNum);
                $state['serving_team_id'] = $teamId;
                $state['last_point_sideout'] = true;
            } else {
                $state['last_point_sideout'] = false;
            }

            $details['volley_state'] = $state;
            $match->match_details = $details;
            $match->save();

            // 3. Update Match Score (Sets Won)
            $this->updateMatchSetsScore($match);
        });

        return $this->getState($matchId);
    }

    private function updateMatchSetsScore($match)
    {
        $sets = MatchSet::where('game_match_id', $match->id)->get();
        $homeSets = 0;
        $awaySets = 0;

        foreach ($sets as $s) {
            $limit = ($s->set_number == 5) ? 15 : 25;
            // Basic Logic: must reach limit AND be ahead by 2
            if ($s->home_score >= $limit && $s->home_score >= ($s->away_score + 2)) {
                $homeSets++;
            } elseif ($s->away_score >= $limit && $s->away_score >= ($s->home_score + 2)) {
                $awaySets++;
            }
        }

        $match->home_score = $homeSets;
        $match->away_score = $awaySets;

        if ($homeSets >= 3 || $awaySets >= 3) {
            $match->status = 'Finalizado';
        }

        $match->save();
    }

    public function manualRotation(Request $request, $matchId)
    {
        $teamId = $request->input('team_id');
        $direction = $request->input('direction', 'forward');

        $match = GameMatch::findOrFail($matchId);
        $details = $match->match_details;
        $setNum = $details['volley_state']['current_set'] ?? 1;

        if ($direction == 'forward') {
            $this->rotateTeamDB($matchId, $teamId, $setNum);
        } else {
            $this->rotateTeamDB($matchId, $teamId, $setNum, true);
        }

        return $this->getState($matchId);
    }

    public function substitutePlayer(Request $request, $matchId)
    {
        $request->validate([
            'team_id' => 'required',
            'position' => 'required|integer|min:1|max:6',
            'player_in' => 'required',
        ]);

        $teamId = $request->input('team_id');
        $position = $request->input('position');
        $playerIn = $request->input('player_in');

        DB::transaction(function () use ($matchId, $teamId, $position, $playerIn) {
            // Perform swap
            DB::table('match_positions')->updateOrInsert(
                [
                    'game_match_id' => $matchId,
                    'team_id' => $teamId,
                    'position' => $position
                ],
                [
                    'player_id' => $playerIn,
                    'updated_at' => now()
                ]
            );
        });

        return $this->getState($matchId);
    }

    // === DB Helpers ===

    private function saveRotationDB($matchId, $teamId, $setNum, $playerIds)
    {
        // Clear existing for this set/team
        DB::table('match_positions')
            ->where('game_match_id', $matchId)
            ->where('team_id', $teamId)
            // ->where('set_number', $setNum) // Depending on if table has set_number
            ->delete();

        $data = [];
        foreach ($playerIds as $index => $pid) {
            if ($pid) {
                $data[] = [
                    'game_match_id' => $matchId,
                    'team_id' => $teamId,
                    'set_number' => $setNum,
                    'position' => $index + 1, // 1 to 6
                    'player_id' => $pid,
                    'created_at' => now(),
                    'updated_at' => now()
                ];
            }
        }
        if (count($data) > 0)
            DB::table('match_positions')->insert($data);
    }

    private function rotateTeamDB($matchId, $teamId, $setNum, $reverse = false)
    {
        $positions = DB::table('match_positions')
            ->where('game_match_id', $matchId)
            ->where('team_id', $teamId)
            // ->where('set_number', $setNum)
            ->orderBy('position')
            ->get();

        $playersByPos = [];
        foreach ($positions as $p)
            $playersByPos[$p->position] = $p->player_id;

        $newPlayersByPos = [];

        if (!$reverse) {
            // Standard Volei Rotation:
            // Players move from Pos 1 -> Pos 6 -> Pos 5 -> Pos 4 -> Pos 3 -> Pos 2 -> Pos 1
            $newPlayersByPos[6] = $playersByPos[1] ?? null;
            $newPlayersByPos[5] = $playersByPos[6] ?? null;
            $newPlayersByPos[4] = $playersByPos[5] ?? null;
            $newPlayersByPos[3] = $playersByPos[4] ?? null;
            $newPlayersByPos[2] = $playersByPos[3] ?? null;
            $newPlayersByPos[1] = $playersByPos[2] ?? null;

        } else {
            // Backward
            $newPlayersByPos[1] = $playersByPos[6] ?? null;
            $newPlayersByPos[2] = $playersByPos[1] ?? null;
            $newPlayersByPos[3] = $playersByPos[2] ?? null;
            $newPlayersByPos[4] = $playersByPos[3] ?? null;
            $newPlayersByPos[5] = $playersByPos[4] ?? null;
            $newPlayersByPos[6] = $playersByPos[5] ?? null;
        }

        foreach ($newPlayersByPos as $pos => $pid) {
            DB::table('match_positions')
                ->where('game_match_id', $matchId)
                ->where('team_id', $teamId)
                ->where('position', $pos)
                ->update(['player_id' => $pid]);
        }
    }
}
