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
        $championship = Championship::with(['sport', 'club', 'categories', 'races'])->findOrFail($id);
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

        // Se o formato for corrida (racing), cria automaticamente o registro na tabela 'races'
        // para que a inscrição pública funcione sem precisar ir no wizard.
        if ($championship->format === 'racing') {
            \App\Models\Race::firstOrCreate(
                ['championship_id' => $championship->id],
                [
                    'start_datetime' => $championship->start_date,
                    'location_name' => 'A definir',
                    'kits_info' => 'Informações do kit em breve'
                ]
            );
        }

        return response()->json($championship->load(['sport', 'club', 'categories', 'races']), 201);
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
            'allow_shopping_registration' => 'nullable|boolean',
            'remove_bg_on_art' => 'nullable|boolean',
            'location_name' => 'nullable|string',
            'include_repescagem_goals' => 'nullable|boolean',
            'include_repescagem_assists' => 'nullable|boolean',
            'include_repescagem_cards' => 'nullable|boolean',
            'include_repescagem_standings' => 'nullable|boolean',
            'include_knockout_standings' => 'nullable|boolean',
            'include_knockout_goals' => 'nullable|boolean',
            'include_knockout_assists' => 'nullable|boolean',
            'include_knockout_cards' => 'nullable|boolean'
        ]);

        if (isset($validated['status'])) {
            $validated['is_status_auto'] = false;
        }

        $championship->update($validated);

        // Update race location if format is racing
        if ($championship->format === 'racing' && $request->has('location_name')) {
            \App\Models\Race::updateOrCreate(
                ['championship_id' => $championship->id],
                ['location_name' => $request->location_name]
            );
        }

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

        try {
            \DB::beginTransaction();

            // 1. Deletar Corridas (Races) e seus resultados
            $raceIds = \App\Models\Race::where('championship_id', $id)->pluck('id');
            \App\Models\RaceResult::whereIn('race_id', $raceIds)->delete();
            \App\Models\Race::where('championship_id', $id)->delete();

            // 2. Deletar Partidas (Matches), Sets e Eventos
            $matchIds = \App\Models\GameMatch::where('championship_id', $id)->pluck('id');
            \App\Models\MatchSet::whereIn('game_match_id', $matchIds)->delete();
            \App\Models\MatchEvent::whereIn('game_match_id', $matchIds)->delete();
            \App\Models\GameMatch::where('championship_id', $id)->delete();

            // 3. Limpar vínculos de times e inscritos (Pivot e Jogadores)
            \DB::table('championship_team')->where('championship_id', $id)->delete();
            \DB::table('team_players')->where('championship_id', $id)->delete();

            // 4. Categorias
            \App\Models\Category::where('championship_id', $id)->delete();

            // 5. O Campeonato em si
            $championship->delete();

            \DB::commit();

            AuditLogger::log('championship.delete', "Excluiu o campeonato '{$championship->name}' (ID: {$id})");

            return response()->json(['message' => 'Campeonato excluído com sucesso!']);
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error("Erro ao deletar campeonato: " . $e->getMessage());
            return response()->json(['error' => 'Não foi possível excluir o campeonato. ' . $e->getMessage()], 500);
        }
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

    // Update tiebreaker priority
    public function updateTiebreakerPriority(Request $request, $id)
    {
        $championship = Championship::findOrFail($id);

        $validated = $request->validate([
            'tiebreaker_priority' => 'array',
        ]);

        $championship->update(['tiebreaker_priority' => $validated['tiebreaker_priority']]);

        return response()->json(['message' => 'Ordem de desempate atualizada', 'tiebreaker_priority' => $championship->tiebreaker_priority]);
    }
}