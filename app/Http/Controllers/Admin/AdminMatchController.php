<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GameMatch;
use App\Models\Championship;
use App\Models\Team;
use App\Models\MatchEvent;

use App\Http\Requests\StoreMatchRequest;

class AdminMatchController extends Controller
{
    // List matches for admin
    public function index(Request $request)
    {
        $user = $request->user();

        $query = GameMatch::with(['homeTeam', 'awayTeam', 'championship.sport']);

        // Filter by club if not super admin
        if ($user->club_id) {
            $query->whereHas('championship', function ($q) use ($user) {
                $q->where('club_id', $user->club_id);
            });
        }

        if ($request->has('championship_id')) {
            $query->where('championship_id', $request->championship_id);
        }

        if ($request->has('category_id') && $request->category_id != 'null') {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $matches = $query->orderBy('start_time', 'desc')->get();

        return response()->json($matches);
    }

    // Create new match
    public function store(StoreMatchRequest $request)
    {
        $validated = $request->validated();

        $match = GameMatch::create($validated);

        return response()->json($match->load(['homeTeam', 'awayTeam']), 201);
    }

    // Update match
    public function update(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);

        $validated = $request->validate([
            'home_team_id' => 'sometimes|exists:teams,id',
            'away_team_id' => 'sometimes|exists:teams,id|different:home_team_id',
            'start_time' => 'sometimes|date_format:Y-m-d\TH:i|after_or_equal:2020-01-01',
            'location' => 'nullable|string|max:255',
            'round_name' => 'nullable|string|max:100',
            'round_number' => 'nullable|integer|min:1',
            'phase' => 'nullable|string|max:100',
            'home_score' => 'nullable|integer|min:0',
            'away_score' => 'nullable|integer|min:0',
            'status' => 'sometimes|in:scheduled,live,finished,cancelled',
            'category_id' => 'nullable|integer|exists:categories,id',
            'match_details' => 'nullable|array',
            'arbitration' => 'nullable|array',
        ]);

        // Merge arbitration into match_details if provided
        if (isset($validated['arbitration'])) {
            $currentDetails = $match->match_details ?? [];
            $currentDetails['arbitration'] = $validated['arbitration'];
            $validated['match_details'] = $currentDetails;
            unset($validated['arbitration']);
        }

        $match->update($validated);

        return response()->json($match->load(['homeTeam', 'awayTeam', 'category']));
    }

    // Finish match and set final score
    public function finish(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);

        $validated = $request->validate([
            'home_score' => 'required|integer|min:0',
            'away_score' => 'required|integer|min:0',
        ]);

        $match->update([
            'home_score' => $validated['home_score'],
            'away_score' => $validated['away_score'],
            'status' => 'finished',
        ]);

        // Send Notification Hook
        // (new NotificationController)->sendInternal(...)
        // \Log::info("Match finished: Notification scheduled for Match #{$id}");

        return response()->json($match);
    }

    // Set MVP for match
    public function setMVP(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);

        $validated = $request->validate([
            'player_id' => 'required|integer',
            'photo_id' => 'nullable|integer',
        ]);

        // Update both legacy column and awards JSON
        $awards = $match->awards ?? [];
        $awards['craque'] = [
            'player_id' => $validated['player_id'],
            'photo_id' => $validated['photo_id'] ?? null,
        ];

        $match->update([
            'mvp_player_id' => $validated['player_id'],
            'awards' => $awards,
        ]);

        return response()->json($match);
    }

    // Add event to match (goal, card, etc)
    public function addEvent(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);

        $validated = $request->validate([
            'team_id' => 'required|exists:teams,id',
            'player_id' => 'nullable|integer',
            'event_type' => 'required|in:goal,yellow_card,red_card,blue_card,assist,foul,mvp,substitution,point,ace,block,timeout,period_start,period_end,match_start,match_end',
            'minute' => 'nullable|string', // Change to string to support "00:00"
            'value' => 'nullable|integer|min:1',
            'metadata' => 'nullable|array',
        ]);

        $event = MatchEvent::create([
            'game_match_id' => $match->id,
            'team_id' => $validated['team_id'],
            'player_id' => $validated['player_id'] ?? null,
            'event_type' => $validated['event_type'],
            'game_time' => $validated['minute'] ?? null, // Map minute from frontend to game_time in DB
            'value' => $validated['value'] ?? 1,
            'metadata' => $validated['metadata'] ?? null,
        ]);

        // Auto-update match status to live if it was scheduled
        if ($match->status === 'scheduled') {
            $match->update(['status' => 'live']);
        }

        return response()->json($event, 201);
    }

    // Get match events
    public function events($id)
    {
        $match = GameMatch::with(['events.team', 'events.player'])->findOrFail($id);

        return response()->json($match->events);
    }

    // Delete match
    public function destroy($id)
    {
        $match = GameMatch::findOrFail($id);
        $match->delete();

        return response()->json(['message' => 'Match deleted successfully']);
    }

    // Update match awards
    public function updateAwards(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);

        $validated = $request->validate([
            'awards' => 'required|array',
        ]);

        $match->update(['awards' => $validated['awards']]);

        return response()->json($match);
    }

    // Delete a specific event
    public function deleteEvent($matchId, $eventId)
    {
        $event = MatchEvent::where('game_match_id', $matchId)->findOrFail($eventId);
        $event->delete();

        return response()->json(['message' => 'Event deleted successfully']);
    }
}
