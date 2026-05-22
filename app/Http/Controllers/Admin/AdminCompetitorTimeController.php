<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CompetitorTime;
use App\Models\Championship;
use App\Models\Race;
use App\Models\RaceResult;
use App\Events\ChampionshipTimesUpdated;

class AdminCompetitorTimeController extends Controller
{
    public function index(Request $request, $championshipId)
    {
        $query = CompetitorTime::with(['user', 'team', 'category'])
            ->where('championship_id', $championshipId);

        if ($request->has('game_match_id') && $request->game_match_id !== 'null' && $request->game_match_id !== '') {
            $query->where('game_match_id', $request->game_match_id);
        }

        $times = $query->get();
        return response()->json($times);
    }

    private function msToTime($ms) {
        $seconds = floor($ms / 1000);
        $minutes = floor($seconds / 60);
        $hours = floor($minutes / 60);
        $minutes = $minutes % 60;
        $seconds = $seconds % 60;
        return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
    }

    public function store(Request $request, $championshipId)
    {
        $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'team_id' => 'nullable|exists:teams,id',
            'user_id' => 'nullable|exists:users,id',
            'time_ms' => 'required|integer',
            'status' => 'nullable|string',
            'lap' => 'nullable|integer',
            'game_match_id' => 'nullable|exists:game_matches,id'
        ]);

        $insertData = [
            'championship_id' => $championshipId,
            'category_id' => $request->category_id,
            'team_id' => $request->team_id,
            'user_id' => $request->user_id,
            'time_ms' => $request->time_ms,
            'status' => $request->status ?? 'completed'
        ];

        if ($request->has('game_match_id') && $request->game_match_id !== 'null' && $request->game_match_id !== '') {
            $insertData['game_match_id'] = $request->game_match_id;
        }

        // Check if the 'lap' column exists (in case the production VPS hasn't run the migrations yet!)
        if (\Schema::hasColumn('competitor_times', 'lap')) {
            $insertData['lap'] = $request->lap ?? 1;
        }

        $time = CompetitorTime::create($insertData);

        // Auto-sync com RaceResult se for campeonato individual
        $championship = Championship::find($championshipId);
        if ($championship && $championship->registration_type !== 'team' && $request->user_id) {
            $race = Race::where('championship_id', $championshipId)->first();
            if ($race) {
                $raceResult = RaceResult::where('race_id', $race->id)->where('user_id', $request->user_id)->first();
                if ($raceResult) {
                    $raceResult->update([
                        'net_time' => $this->msToTime($request->time_ms),
                        'lap' => $request->lap ?? 1
                    ]);
                }
            }
        }

        try {
            broadcast(new ChampionshipTimesUpdated($championshipId));
        } catch (\Exception $e) {
            \Log::warning("Erro ao transmitir evento de atualizacao de tempos: " . $e->getMessage());
        }

        return response()->json($time->load(['user', 'team', 'category']), 201);
    }
    
    public function destroy($championshipId, $id)
    {
        CompetitorTime::where('championship_id', $championshipId)->where('id', $id)->delete();
        try {
            broadcast(new ChampionshipTimesUpdated($championshipId));
        } catch (\Exception $e) {
            \Log::warning("Erro ao transmitir evento de exclusao de tempos: " . $e->getMessage());
        }
        return response()->json(['message' => 'Deleted']);
    }
}
