<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CompetitorTime;
use App\Models\Championship;

class AdminCompetitorTimeController extends Controller
{
    public function index($championshipId)
    {
        $times = CompetitorTime::with(['user', 'team', 'category'])
            ->where('championship_id', $championshipId)
            ->get();
        return response()->json($times);
    }

    public function store(Request $request, $championshipId)
    {
        $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'team_id' => 'nullable|exists:teams,id',
            'user_id' => 'nullable|exists:users,id',
            'time_ms' => 'required|integer',
            'status' => 'nullable|string'
        ]);

        $time = CompetitorTime::create([
            'championship_id' => $championshipId,
            'category_id' => $request->category_id,
            'team_id' => $request->team_id,
            'user_id' => $request->user_id,
            'time_ms' => $request->time_ms,
            'status' => $request->status ?? 'completed'
        ]);

        return response()->json($time, 201);
    }
    
    public function destroy($championshipId, $id)
    {
        CompetitorTime::where('championship_id', $championshipId)->where('id', $id)->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
