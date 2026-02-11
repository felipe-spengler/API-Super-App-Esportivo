<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\Club;
use App\Models\Sport;
use App\Models\Category;

use App\Http\Requests\StoreChampionshipRequest;

class AdminChampionshipController extends Controller
{
    // List all championships for admin's club
    public function index(Request $request)
    {
        $user = $request->user();

        // Removed 'sport' from with() because typically sport is a string column, unless strictly defined.
        // If Model has sport() relation, keep it. But earlier view of Model showed public function sport() { belongsTo(Sport::class) }.

        $query = Championship::with(['sport', 'club', 'categories']);

        // If not super admin, filter by club
        if ($user->club_id) {
            $query->where('club_id', $user->club_id);
        }

        if ($request->has('sport_id')) {
            $query->where('sport_id', $request->sport_id);
        }

        $championships = $query->orderBy('start_date', 'desc')->get();

        return response()->json($championships);
    }

    // Create new championship
    public function store(StoreChampionshipRequest $request)
    {
        $user = $request->user();

        // Dados já validados pelo FormRequest
        $validated = $request->validated();

        // Use user's club or allow super admin to specify
        $validated['club_id'] = $user->club_id ?? $request->club_id;

        $championship = Championship::create($validated);

        // Cria uma categoria padrão automaticamente para evitar que o campeonato fique vazio
        $championship->categories()->create([
            'name' => 'Principal',
            'gender' => 'mixed'
        ]);

        return response()->json($championship->load(['sport', 'club', 'categories']), 201);
    }

    // Update championship
    public function update(Request $request, $id)
    {
        $user = $request->user();

        $championship = Championship::findOrFail($id);

        // Check permission
        if ($user->club_id && $championship->club_id !== $user->club_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'string|max:255',
            'start_date' => 'date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'description' => 'nullable|string',
            'format' => 'in:league,knockout,groups,league_playoffs,double_elimination,time_ranking,group_knockout',
            'max_teams' => 'nullable|integer|min:2',
            'status' => 'nullable|in:draft,registrations_open,in_progress,upcoming,ongoing,finished,scheduled,Agendado',
            'is_active' => 'boolean',
        ]);

        if (isset($validated['status'])) {
            $validated['is_status_auto'] = false;
        }

        $championship->update($validated);

        return response()->json($championship->load(['sport', 'club']));
    }

    // Delete championship
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        $championship = Championship::findOrFail($id);

        // Check permission
        if ($user->club_id && $championship->club_id !== $user->club_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $championship->delete();

        return response()->json(['message' => 'Championship deleted successfully']);
    }

    // Add category to championship
    public function addCategory(Request $request, $championshipId)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'min_age' => 'nullable|integer',
            'max_age' => 'nullable|integer',
            'gender' => 'nullable|in:male,female,mixed',
        ]);

        $championship = Championship::findOrFail($championshipId);

        $category = $championship->categories()->create($validated);

        return response()->json($category, 201);
    }

    // Get championship categories
    public function categories($championshipId)
    {
        $championship = Championship::with('categories.children')->findOrFail($championshipId);

        return response()->json($championship->categories);
    }

    // Update awards for championship
    public function updateAwards(Request $request, $championshipId)
    {
        $championship = Championship::findOrFail($championshipId);

        $validated = $request->validate([
            'awards' => 'nullable', // Allow any structure (array or object)
        ]);

        $championship->update(['awards' => $validated['awards']]);

        return response()->json($championship);
    }
}