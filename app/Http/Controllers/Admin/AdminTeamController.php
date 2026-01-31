<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Team;
use App\Models\Championship;

use App\Http\Requests\StoreTeamRequest;

class AdminTeamController extends Controller
{
    // List teams
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Team::with('club');

        // Filter by club if not super admin
        if ($user->club_id) {
            $query->where('club_id', $user->club_id);
        }

        if ($request->has('championship_id')) {
            $query->whereHas('championships', function ($q) use ($request) {
                $q->where('championships.id', $request->championship_id);
            });
        }

        $teams = $query->orderBy('name')->get();

        return response()->json($teams);
    }

    // Show team details
    public function show($id)
    {
        $team = Team::with(['club', 'players', 'championships'])->findOrFail($id);
        return response()->json($team);
    }

    // Create team
    public function store(StoreTeamRequest $request)
    {
        $user = $request->user();

        $validated = $request->validated();

        $validated['club_id'] = $user->club_id ?? $request->club_id;

        $team = Team::create($validated);

        return response()->json($team, 201);
    }

    // Update team
    public function update(Request $request, $id)
    {
        $team = Team::findOrFail($id);

        $validated = $request->validate([
            'name' => 'string|max:255',
            'short_name' => 'nullable|string|max:50',
            'logo_url' => 'nullable|url',
            'primary_color' => 'nullable|string|max:7',
            'secondary_color' => 'nullable|string|max:7',
        ]);

        $team->update($validated);

        return response()->json($team);
    }

    // Delete team
    public function destroy($id)
    {
        $team = Team::findOrFail($id);
        $team->delete();

        return response()->json(['message' => 'Team deleted successfully']);
    }

    // Add team to championship
    public function addToChampionship(Request $request, $teamId)
    {
        $validated = $request->validate([
            'championship_id' => 'required|exists:championships,id',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $team = Team::with(['players', 'captain'])->findOrFail($teamId);
        $championship = Championship::findOrFail($validated['championship_id']);

        // Validação de elegibilidade se uma categoria for informada
        if (!empty($validated['category_id'])) {
            $category = \App\Models\Category::findOrFail($validated['category_id']);

            // Verifica o capitão
            if ($team->captain) {
                $check = $category->isUserEligible($team->captain);
                if (!$check['eligible']) {
                    return response()->json([
                        'message' => "O capitão {$team->captain->name} não atende aos requisitos da categoria {$category->name}.",
                        'reason' => $check['reason']
                    ], 403);
                }
            }

            // Verifica os jogadores
            foreach ($team->players as $player) {
                $check = $category->isUserEligible($player);
                if (!$check['eligible']) {
                    return response()->json([
                        'message' => "O atleta {$player->name} não atende aos requisitos da categoria {$category->name}.",
                        'reason' => $check['reason']
                    ], 403);
                }
            }
        }

        // Attach team to championship
        $championship->teams()->syncWithoutDetaching([
            $teamId => ['category_id' => $validated['category_id'] ?? null]
        ]);

        return response()->json(['message' => 'Team added to championship']);
    }

    // Remove team from championship
    public function removeFromChampionship(Request $request, $teamId)
    {
        $validated = $request->validate([
            'championship_id' => 'required|exists:championships,id',
        ]);

        $team = Team::findOrFail($teamId);
        $championship = Championship::findOrFail($validated['championship_id']);

        $championship->teams()->detach($teamId);

        return response()->json(['message' => 'Team removed from championship']);
    }
}
