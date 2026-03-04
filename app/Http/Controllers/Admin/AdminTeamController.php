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
    public function show(Request $request, $id)
    {
        $team = Team::with(['club', 'captain', 'championships.sport', 'championships.categories'])
            ->with([
                'players' => function ($q) use ($request) {
                    if ($request->has('championship_id')) {
                        $q->where('team_players.championship_id', $request->championship_id);
                    } else {
                        $q->whereNull('team_players.championship_id');
                    }
                }
            ])
            ->findOrFail($id);

        // Map the category name to each championship
        $team->championships->each(function ($championship) {
            $categoryId = $championship->pivot->category_id;
            if ($categoryId) {
                $category = $championship->categories->firstWhere('id', $categoryId);
                $championship->category_name = $category ? $category->name : null;
            } else {
                $championship->category_name = null;
            }
        });

        return response()->json($team);
    }

    // Create team
    public function store(StoreTeamRequest $request)
    {
        $user = $request->user();
        $validated = $request->validated();
        $clubId = $user->club_id ?? ($request->club_id ?? null);
        $validated['club_id'] = $clubId;

        // 1. De-duplicação: Verifica se já existe um time com este nome neste clube
        $existingTeam = Team::where('name', $validated['name'])
            ->where('club_id', $clubId)
            ->first();

        if ($existingTeam) {
            // Log de tentativa de duplicata/vinculação automática
            \App\Services\AuditLogger::log(
                'team.duplicate_prevented',
                "Tentativa de criar time duplicado '{$validated['name']}'. Vinculado ao ID {$existingTeam->id}.",
                ['team_id' => $existingTeam->id]
            );

            // Se um championship_id foi enviado, já vincula ao campeonato
            if ($request->has('championship_id')) {
                $this->addToChampionship($request, $existingTeam->id);
            }

            return response()->json([
                'message' => 'Este time já existe no seu clube e foi selecionado automaticamente.',
                'team' => $existingTeam
            ], 200); // Retorna 200 em vez de 201
        }

        // 2. Criação normal se não for duplicado
        $team = Team::create($validated);

        \App\Services\AuditLogger::log(
            'team.create',
            "Criou o time '{$team->name}' (ID {$team->id})",
            ['team_id' => $team->id]
        );

        return response()->json($team, 201);
    }

    // Update team
    public function update(Request $request, $id)
    {
        $team = Team::findOrFail($id);

        $validated = $request->validate([
            'name' => 'string|max:255',
            'city' => 'nullable|string|max:255',
            'captain_id' => 'nullable|integer|exists:users,id',
            'short_name' => 'nullable|string|max:50',
            'logo_url' => 'nullable|url',
            'primary_color' => 'nullable|string|max:7',
            'secondary_color' => 'nullable|string|max:7',
        ]);

        $oldName = $team->name;
        $team->update($validated);

        \App\Services\AuditLogger::log(
            'team.update',
            "Editou o time '{$team->name}' (ID {$team->id}). Nome antigo era '{$oldName}'",
            ['team_id' => $team->id, 'changes' => $validated]
        );

        return response()->json($team);
    }

    // Delete team
    public function destroy($id)
    {
        $team = Team::findOrFail($id);

        // Check if the team has matches
        $hasMatches = \App\Models\GameMatch::where('home_team_id', $id)
            ->orWhere('away_team_id', $id)
            ->exists();

        if ($hasMatches) {
            return response()->json([
                'message' => 'Não é possível excluir este time pois ele já possui jogos agendados ou concluídos. Remova-o dos jogos primeiro ou apenas desvincule-o do campeonato.'
            ], 400);
        }

        $name = $team->name;
        $team->delete();

        \App\Services\AuditLogger::log(
            'team.delete',
            "Excluiu o time '{$name}' (ID {$id})",
            ['team_id' => $id]
        );

        return response()->json(['message' => 'Team deleted successfully']);
    }

    // Add team to championship
    public function addToChampionship(Request $request, $teamId)
    {
        $validated = $request->validate([
            'championship_id' => 'required|exists:championships,id',
            'category_id' => 'nullable|exists:categories,id',
            'captain_id' => 'nullable|exists:users,id',
        ]);

        $team = Team::with(['players', 'captain'])->findOrFail($teamId);
        $championship = Championship::findOrFail($validated['championship_id']);

        // Validação de elegibilidade se uma categoria for informada
        if (!empty($validated['category_id'])) {
            $category = \App\Models\Category::findOrFail($validated['category_id']);

            // Verifica o capitão informado ou o global
            $checkCaptain = $validated['captain_id'] ? \App\Models\User::find($validated['captain_id']) : $team->captain;
            if ($checkCaptain) {
                $check = $category->isUserEligible($checkCaptain);
                if (!$check['eligible']) {
                    return response()->json([
                        'message' => "O capitão {$checkCaptain->name} não atende aos requisitos da categoria {$category->name}.",
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

        // Se não informou categoria e o campeonato tem categorias, pega a primeira
        $categoryId = $validated['category_id'] ?? null;
        if (!$categoryId) {
            $firstCategory = $championship->categories()->first();
            if ($firstCategory) {
                $categoryId = $firstCategory->id;
            }
        }

        // Determina o capitão para este vínculo (prioriza o informado, depois o do time)
        $captainIdForPivot = $validated['captain_id'] ?? ($team->captain_id ?? null);

        // Attach team to championship with specific category
        $exists = \DB::table('championship_team')
            ->where('championship_id', $championship->id)
            ->where('team_id', $teamId)
            ->where('category_id', $categoryId)
            ->exists();

        if (!$exists) {
            \DB::table('championship_team')->insert([
                'championship_id' => $championship->id,
                'team_id' => $teamId,
                'category_id' => $categoryId,
                'captain_id' => $captainIdForPivot,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            // Se já existe, apenas atualiza o capitão se for necessário
            \DB::table('championship_team')
                ->where('championship_id', $championship->id)
                ->where('team_id', $teamId)
                ->where('category_id', $categoryId)
                ->update([
                    'captain_id' => $captainIdForPivot,
                    'updated_at' => now(),
                ]);
        }

        \App\Services\AuditLogger::log(
            'team.championship_add',
            "Vinculou o time '{$team->name}' ao campeonato '{$championship->name}' (Categoria ID: " . ($categoryId ?? 'Nenhuma') . ")",
            ['team_id' => $teamId, 'championship_id' => $championship->id, 'category_id' => $categoryId]
        );

        return response()->json(['message' => 'Team added to championship']);
    }

    // Remove team from championship
    public function removeFromChampionship(Request $request, $teamId)
    {
        $validated = $request->validate([
            'championship_id' => 'required|exists:championships,id',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $team = Team::findOrFail($teamId);
        $championship = Championship::findOrFail($validated['championship_id']);
        $categoryId = $validated['category_id'] ?? null;

        // Check if there are matches for this team in this category
        $hasMatches = \App\Models\GameMatch::where('championship_id', $championship->id)
            ->where(function ($q) use ($teamId) {
                $q->where('home_team_id', $teamId)->orWhere('away_team_id', $teamId);
            });

        if ($categoryId) {
            $hasMatches->where('category_id', $categoryId);
        }

        if ($hasMatches->exists()) {
            return response()->json([
                'message' => 'Não é possível remover este time porque ele já possui jogos vinculados' . ($categoryId ? ' nesta categoria.' : '.')
            ], 400);
        }

        if ($categoryId) {
            \DB::table('championship_team')
                ->where('championship_id', $championship->id)
                ->where('team_id', $teamId)
                ->where('category_id', $categoryId)
                ->delete();
        } else {
            $championship->teams()->detach($teamId);
        }

        return response()->json(['message' => 'Team removed from championship']);
    }

    // Remove player from team
    public function removePlayer(Request $request, $teamId, $playerId)
    {
        $team = Team::findOrFail($teamId);

        $champId = $request->championship_id;

        // Use standard DB logic for pivot to distinguish specific row
        \DB::table('team_players')
            ->where('team_id', $teamId)
            ->where('user_id', $playerId)
            ->when($champId, function ($q) use ($champId) {
                return $q->where('championship_id', $champId);
            }, function ($q) {
                return $q->whereNull('championship_id');
            })
            ->delete();

        return response()->json(['message' => 'Player removed from team']);
    }

    // NEW: Copy players from general roster to championship context
    public function copyRoster(Request $request, $id)
    {
        $validated = $request->validate([
            'championship_id' => 'required|integer',
        ]);

        $championshipId = $validated['championship_id'];

        // Get players from general roster (championship_id null)
        $generalPlayers = \DB::table('team_players')
            ->where('team_id', $id)
            ->whereNull('championship_id')
            ->get();

        if ($generalPlayers->isEmpty()) {
            return response()->json(['message' => 'Nenhum jogador na base geral para copiar.'], 400);
        }

        $count = 0;
        foreach ($generalPlayers as $player) {
            // Check if already in championship
            $exists = \DB::table('team_players')
                ->where('team_id', $id)
                ->where('user_id', $player->user_id)
                ->where('championship_id', $championshipId)
                ->exists();

            if (!$exists) {
                \DB::table('team_players')->insert([
                    'team_id' => $id,
                    'user_id' => $player->user_id,
                    'championship_id' => $championshipId,
                    'position' => $player->position,
                    'number' => $player->number,
                    'is_approved' => $player->is_approved,
                    'temp_player_name' => $player->temp_player_name ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $count++;
            }
        }

        return response()->json([
            'message' => "Sincronização concluída: $count novos jogadores vinculados ao campeonato."
        ]);
    }

    // NEW (Lider Context): Update captain for specific championship
    public function updateChampionshipCaptain(Request $request, $teamId)
    {
        $validated = $request->validate([
            'championship_id' => 'required|exists:championships,id',
            'category_id' => 'nullable|exists:categories,id',
            'captain_id' => 'nullable|exists:users,id',
        ]);

        $query = \DB::table('championship_team')
            ->where('team_id', $teamId)
            ->where('championship_id', $validated['championship_id']);

        if (!empty($validated['category_id'])) {
            $query->where('category_id', $validated['category_id']);
        }

        $query->update([
            'captain_id' => $validated['captain_id'],
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Líder da categoria atualizado com sucesso!']);
    }
}
