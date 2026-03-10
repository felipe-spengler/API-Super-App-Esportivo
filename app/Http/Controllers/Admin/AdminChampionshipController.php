<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Championship;
use App\Models\Club;
use App\Models\Sport;
use App\Models\Category;

use App\Http\Requests\StoreChampionshipRequest;
use App\Services\AuditLogger;

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

    // Get championship details
    public function show(Request $request, $id)
    {
        $championship = Championship::with(['sport', 'club', 'categories'])->findOrFail($id);
        return response()->json($championship);
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

        AuditLogger::log('championship.create', "Criou o campeonato '{$championship->name}' (ID: {$championship->id})", [
            'championship_id' => $championship->id
        ]);

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
            'format' => 'in:league,knockout,groups,league_playoffs,double_elimination,time_ranking,group_knockout,racing',
            'max_teams' => 'nullable|integer|min:2',
            'status' => 'nullable|in:draft,registrations_open,in_progress,upcoming,ongoing,finished,scheduled,Agendado',
            'is_active' => 'boolean',
            'art_settings' => 'nullable|array',
            'has_pcd_discount' => 'nullable|boolean',
            'pcd_discount_percentage' => 'nullable|numeric|min:0|max:100',
            'has_elderly_discount' => 'nullable|boolean',
            'elderly_discount_percentage' => 'nullable|numeric|min:0|max:100',
            'elderly_minimum_age' => 'nullable|integer|min:0',
            'allow_shopping_registration' => 'nullable|boolean'
        ]);

        if (isset($validated['status'])) {
            $validated['is_status_auto'] = false;
        }

        $championship->update($validated);

        $changedFields = array_keys($validated);
        $description = "Editou o campeonato '{$championship->name}' (ID: {$championship->id})";

        if (count($changedFields) > 0) {
            $translatedFields = [
                'name' => 'nome',
                'start_date' => 'data de início',
                'end_date' => 'data de fim',
                'description' => 'descrição',
                'format' => 'formato',
                'status' => 'status',
                'max_teams' => 'limite de times',
            ];

            $details = [];
            foreach ($changedFields as $field) {
                if (isset($translatedFields[$field])) {
                    $details[] = $translatedFields[$field];
                }
            }

            if (!empty($details)) {
                $description .= ". Campos alterados: " . implode(', ', $details);
            }
        }

        AuditLogger::log('championship.update', $description, [
            'championship_id' => $championship->id,
            'changes' => $changedFields
        ]);

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

        AuditLogger::log('championship.delete', "Excluiu o campeonato '{$championship->name}' (ID: {$id})");

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

        AuditLogger::log('championship.category_add', "Adicionou a categoria '{$category->name}' ao campeonato '{$championship->name}'", [
            'championship_id' => $championship->id,
            'category_id' => $category->id
        ]);

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

        AuditLogger::log('championship.awards_update', "Atualizou as premiações do campeonato '{$championship->name}'", [
            'championship_id' => $championship->id
        ]);

        return response()->json($championship);
    }
}