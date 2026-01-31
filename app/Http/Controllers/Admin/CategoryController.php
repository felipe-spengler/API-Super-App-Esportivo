<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Category;
use App\Models\Championship;

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

        return response()->json($categories);
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
            'gender' => 'nullable|in:M,F,MIXED',
            'max_teams' => 'nullable|integer|min:2',
        ]);

        $category = $championship->categories()->create($validated);

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
            'gender' => 'nullable|in:M,F,MIXED',
            'max_teams' => 'nullable|integer|min:2',
        ]);

        $category->update($validated);

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

        return response()->json([
            'message' => 'Equipe removida da categoria com sucesso!'
        ]);
    }
}
