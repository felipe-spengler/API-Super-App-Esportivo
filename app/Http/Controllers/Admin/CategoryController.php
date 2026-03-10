<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Category;
use App\Models\Championship;
use App\Services\AuditLogger;

class CategoryController extends Controller
{
    /**
     * Listar todas as categorias de um campeonato
     */
    public function index(Request $request, $championshipId)
    {
        $championship = Championship::findOrFail($championshipId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para acessar este campeonato.'
            ], 403);
        }

        $categories = $championship->categories()
            ->withCount('teams')
            ->get();

        // Append art background URL if exists in art_settings
        $artSettings = $championship->art_settings ?? [];
        $categories->each(function ($category) use ($artSettings) {
            $path = $artSettings['category_backgrounds'][$category->id] ?? null;
            if ($path) {
                $category->art_background_url = rtrim(config('app.url'), '/') . '/api/storage/' . $path;
            } else {
                $category->art_background_url = null;
            }
        });

        return response()->json($categories);
    }

    /**
     * Atualizar fundo da arte para a categoria
     */
    public function updateArtBackground(Request $request, $championshipId, $categoryId)
    {
        $championship = Championship::findOrFail($championshipId);
        $category = Category::where('championship_id', $championshipId)->findOrFail($categoryId);

        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json(['message' => 'Permissão negada.'], 403);
        }

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg|max:5120',
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = 'bg_cat_' . $categoryId . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('art-backgrounds', $filename, 'public');

            $artSettings = $championship->art_settings ?? [];
            $artSettings['category_backgrounds'][$categoryId] = $path;
            $championship->art_settings = $artSettings;
            $championship->save();

            $fullUrl = rtrim(config('app.url'), '/') . '/api/storage/' . $path;

            return response()->json([
                'message' => 'Fundo atualizado com sucesso!',
                'url' => $fullUrl
            ]);
        }

        return response()->json(['message' => 'Nenhum arquivo enviado.'], 400);
    }

    /**
     * Criar nova categoria
     */
    public function store(Request $request, $championshipId)
    {
        $championship = Championship::findOrFail($championshipId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'min_age' => 'nullable|integer|min:0',
            'max_age' => 'nullable|integer|min:0',
            'gender' => 'nullable|in:male,female,mixed',
            'max_teams' => 'nullable|integer|min:0',
            'parent_id' => 'nullable|exists:categories,id',
            'price' => 'nullable|numeric|min:0',
            'included_products' => 'nullable|array',
            'included_products.*.product_id' => 'required|exists:products,id',
            'included_products.*.quantity' => 'required|integer|min:1',
            'included_products.*.required' => 'boolean'
        ]);

        $category = $championship->categories()->create($validated);

        AuditLogger::log('category.create_in_champ', "Criou a categoria '{$category->name}' no campeonato '{$championship->name}'", [
            'category_id' => $category->id,
            'championship_id' => $championship->id
        ]);

        return response()->json([
            'message' => 'Categoria criada com sucesso!',
            'category' => $category
        ], 201);
    }

    /**
     * Atualizar categoria
     */
    public function update(Request $request, $championshipId, $categoryId)
    {
        $championship = Championship::findOrFail($championshipId);
        $category = Category::where('championship_id', $championshipId)
            ->findOrFail($categoryId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'min_age' => 'nullable|integer|min:0',
            'max_age' => 'nullable|integer|min:0',
            'gender' => 'nullable|in:male,female,mixed',
            'max_teams' => 'nullable|integer|min:0',
            'parent_id' => 'nullable|exists:categories,id',
            'price' => 'nullable|numeric|min:0',
            'included_products' => 'nullable|array',
            'included_products.*.product_id' => 'required|exists:products,id',
            'included_products.*.quantity' => 'required|integer|min:1',
            'included_products.*.required' => 'boolean'
        ]);

        $category->update($validated);

        AuditLogger::log('category.update_in_champ', "Editou a categoria '{$category->name}' (ID: {$categoryId})", [
            'category_id' => $categoryId,
            'championship_id' => $championshipId
        ]);

        return response()->json([
            'message' => 'Categoria atualizada com sucesso!',
            'category' => $category
        ]);
    }

    /**
     * Deletar categoria
     */
    public function destroy(Request $request, $championshipId, $categoryId)
    {
        $championship = Championship::findOrFail($championshipId);
        $category = Category::where('championship_id', $championshipId)
            ->findOrFail($categoryId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        // Verifica se há equipes vinculadas
        if ($category->teams()->count() > 0) {
            return response()->json([
                'message' => 'Não é possível deletar categoria com equipes vinculadas.'
            ], 400);
        }

        $category->delete();

        AuditLogger::log('category.delete_in_champ', "Excluiu a categoria '{$category->name}' (ID: {$categoryId}) do campeonato '{$championship->name}'");

        return response()->json([
            'message' => 'Categoria deletada com sucesso!'
        ]);
    }

    /**
     * Adicionar equipe à categoria
     */
    public function addTeam(Request $request, $championshipId, $categoryId)
    {
        $championship = Championship::findOrFail($championshipId);
        $category = Category::where('championship_id', $championshipId)
            ->findOrFail($categoryId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        $validated = $request->validate([
            'team_id' => 'required|exists:teams,id',
        ]);

        // Verifica se a equipe já está na categoria
        if ($category->teams()->where('team_id', $validated['team_id'])->exists()) {
            return response()->json([
                'message' => 'Equipe já está nesta categoria.'
            ], 400);
        }

        // Validação de elegibilidade de todos os membros do time (incluindo capitão)
        $team = \App\Models\Team::with(['players', 'captain'])->findOrFail($validated['team_id']);

        // Verifica o capitão
        if ($team->captain) {
            $check = $category->isUserEligible($team->captain);
            if (!$check['eligible']) {
                return response()->json([
                    'message' => "O capitão {$team->captain->name} não atende aos requisitos desta categoria.",
                    'reason' => $check['reason']
                ], 403);
            }
        }

        // Verifica os jogadores
        foreach ($team->players as $player) {
            $check = $category->isUserEligible($player);
            if (!$check['eligible']) {
                return response()->json([
                    'message' => "O atleta {$player->name} não atende aos requisitos desta categoria.",
                    'reason' => $check['reason']
                ], 403);
            }
        }

        $category->teams()->attach($validated['team_id']);

        AuditLogger::log('category.team_add', "Vinculou o time (ID: {$validated['team_id']}) à categoria '{$category->name}'", [
            'category_id' => $category->id,
            'team_id' => $validated['team_id']
        ]);

        return response()->json([
            'message' => 'Equipe adicionada à categoria com sucesso!'
        ]);
    }

    /**
     * Remover equipe da categoria
     */
    public function removeTeam(Request $request, $championshipId, $categoryId, $teamId)
    {
        $championship = Championship::findOrFail($championshipId);
        $category = Category::where('championship_id', $championshipId)
            ->findOrFail($categoryId);

        // Verifica permissão
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        $category->teams()->detach($teamId);

        AuditLogger::log('category.team_remove', "Removeu o time (ID: {$teamId}) da categoria '{$category->name}'", [
            'category_id' => $category->id,
            'team_id' => $teamId
        ]);

        return response()->json([
            'message' => 'Equipe removida da categoria com sucesso!'
        ]);
    }
}
