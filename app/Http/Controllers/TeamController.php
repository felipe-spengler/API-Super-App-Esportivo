<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Team;

class TeamController extends Controller
{
    // 1. Meus Times (Capitão ou Jogador)
    // 1. Meus Times (Capitão ou Jogador)
    public function index(Request $request)
    {
        $user = $request->user();

        // Times que sou capitão (na equipe principal OU em algum campeonato)
        $captainTeams = Team::where('captain_id', $user->id)
            ->orWhereHas('championships', function ($q) use ($user) {
                $q->where('championship_team.captain_id', $user->id);
            })
            ->with(['club'])
            ->get()
            ->map(function ($team) {
                $team->role = 'captain';
                return $team;
            });

        // Times que sou apenas jogador
        $playerTeams = $user->teamsAsPlayer()
            ->with(['club'])
            ->get()
            ->map(function ($team) {
                $team->role = 'player';
                return $team;
            });

        $allTeams = $captainTeams->merge($playerTeams);

        return response()->json($allTeams);
    }

    // 2. Detalhes do Time (Elenco)
    public function show(Request $request, $id)
    {
        $user = $request->user();

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

        if (!$user->is_admin && $team->captain_id !== $user->id) {
            $userChampionshipIds = \DB::table('team_players')
                ->where('team_id', $id)
                ->where('user_id', $user->id)
                ->whereNotNull('championship_id')
                ->pluck('championship_id')
                ->toArray();

            $team->setRelation('championships', $team->championships->filter(function ($championship) use ($user, $userChampionshipIds) {
                return $championship->pivot->captain_id === $user->id || in_array($championship->id, $userChampionshipIds);
            })->values());
        }

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

        // Remove mock logic
        $team->description = $team->description ?? "Equipe {$team->name} da cidade de " . ($team->city ?? 'Toledo');

        return response()->json($team);
    }

    // 3. Adicionar Jogador (Convite)
    public function addPlayer(Request $request, $id)
    {
        \Log::info("TeamController addPlayer [START] - Team ID: {$id}", [
            'has_photo_file' => $request->hasFile('photo_file'),
            'photo_size' => $request->hasFile('photo_file') ? $request->file('photo_file')->getSize() : 0,
            'remove_bg' => $request->boolean('remove_bg'),
        ]);

        $team = Team::findOrFail($id);

        // Check permission (only captain or admin)
        if ($request->user()->id !== $team->captain_id && !$request->user()->is_admin) {
            \Log::warning("TeamController addPlayer - Unauthorized attempt", ['user_id' => $request->user()->id, 'team_id' => $id]);
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        \Log::info("TeamController addPlayer [VALIDATING]");
        $request->validate([
            'name' => 'required|string',
            'position' => 'nullable|string',
            'nickname' => 'nullable|string',
            'email' => 'nullable|email',
            'cpf' => 'nullable|string',
            'phone' => 'nullable|string',
            'gender' => 'nullable|string',
            'address' => 'nullable|string',
            'birth_date' => 'nullable|date',
            'number' => 'nullable|string',
            'document_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:4096', // Max 4MB
            'photo_file' => 'nullable|image|max:4096', // Max 4MB
            'championship_id' => 'nullable|integer|exists:championships,id'
        ]);

        $email = $request->email;
        $userData = null;

        if ($email) {
            $userData = \App\Models\User::where('email', $email)->first();
            if ($userData) {
                // Check if already in this team/context
                $alreadyInTeam = \DB::table('team_players')
                    ->where('team_id', $id)
                    ->where('user_id', $userData->id)
                    ->when($request->championship_id, function ($q, $cid) {
                        return $q->where('championship_id', $cid);
                    }, function ($q) {
                        return $q->whereNull('championship_id');
                    })
                    ->exists();

                if ($alreadyInTeam) {
                    return response()->json(['message' => 'Este atleta já está vinculado a este time neste contexto.'], 422);
                }
            }
        }

        if (!$userData) {
            // Se o usuário não existe, criamos um registro básico
            $tempPassword = $request->cpf ? preg_replace('/[^0-9]/', '', $request->cpf) : \Illuminate\Support\Str::random(10);
            $userData = \App\Models\User::create([
                'name' => $request->name,
                'email' => $email ?: 'atleta_' . time() . '_' . rand(100, 999) . '@temporario.com',
                'password' => \Hash::make($tempPassword),
                'cpf' => $request->cpf,
                'nickname' => $request->nickname,
                'phone' => $request->phone,
                'birth_date' => $request->birth_date,
                'gender' => $request->gender,
                'address' => $request->address,
                'role' => 'atleta',
                'club_id' => $team->club_id,
            ]);
        }

        // Processamento de Fotos (vínculo é com o USUÁRIO)
        $photos = $userData->photos ?? [];
        $photoUpdated = false;

        foreach (['photo_file', 'photo_file_1', 'photo_file_2'] as $index => $fileInput) {
            if ($request->hasFile($fileInput)) {
                $file = $request->file($fileInput);
                $filename = \Illuminate\Support\Str::slug($userData->name) . '-' . time() . '-' . $index . '.' . $file->getClientOriginalExtension();
                $pPath = $file->storeAs('players/photos', $filename, 'public');
                $photos[$index] = $pPath;
                $photoUpdated = true;
            }
        }

        if ($photoUpdated) {
            $userData->photos = $photos;
            $userData->photo_path = $photos[0] ?? null;
            $userData->save();

            if ($request->boolean('remove_bg')) {
                try {
                    $php = PHP_BINARY;
                    $artisan = base_path('artisan');
                    $cmd = "{$php} {$artisan} player:process-photos {$userData->id}";
                    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                        pclose(popen("start /B " . $cmd, "r"));
                    } else {
                        exec("nohup {$cmd} > /dev/null 2>&1 & disown");
                    }
                } catch (\Exception $e) {
                    \Log::error("TeamController Background AI Start Error: " . $e->getMessage());
                }
            }
        }

        // Documento
        if ($request->hasFile('document_file')) {
            $userData->document_path = $request->file('document_file')->store('players/documents', 'public');
            $userData->save();
        }

        // Vínculo Pivot - Apenas nos Campeonatos (conforme solicitado: não vai para a base geral)
        $championshipIds = \DB::table('championship_team')
            ->where('team_id', $id)
            ->pluck('championship_id')
            ->toArray();

        // Se veio um específico na request, garantimos na lista
        if ($request->championship_id && !in_array($request->championship_id, $championshipIds)) {
            $championshipIds[] = $request->championship_id;
        }

        if (empty($championshipIds)) {
            return response()->json(['message' => 'O time precisa estar vinculado a um campeonato para adicionar atletas.'], 422);
        }

        foreach ($championshipIds as $champId) {
            \DB::table('team_players')->updateOrInsert(
                [
                    'team_id' => $id,
                    'user_id' => $userData->id,
                    'championship_id' => $champId
                ],
                [
                    'temp_player_name' => $userData->name,
                    'position' => $request->position,
                    'number' => $request->number,
                    'is_approved' => 1,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }

        return response()->json(['message' => 'Jogador adicionado com sucesso aos campeonatos vinculados!', 'player_id' => $userData->id], 201);
    }

    // 3.5. Upload Player Photo (Pelo Capitão)
    public function uploadPlayerPhoto(Request $request, $id, $playerId)
    {
        $team = Team::findOrFail($id);
        $user = $request->user();

        // Permission check
        $isCaptain = ($user->id === $team->captain_id);
        $isAdmin = $user->is_admin;
        $isRegionalCaptain = false;

        if (!$isCaptain && !$isAdmin) {
            $isRegionalCaptain = \DB::table('championship_team')
                ->where('team_id', $id)
                ->where('captain_id', $user->id)
                ->exists();
        }

        if (!$isCaptain && !$isAdmin && !$isRegionalCaptain) {
            return response()->json(['message' => 'Você não tem permissão para editar as fotos deste time.'], 403);
        }

        $uploadController = new \App\Http\Controllers\Admin\ImageUploadController();
        return $uploadController->uploadPlayerPhoto($request, $playerId);
    }

    // 4. Editar Jogador (Pelo Capitão)
    public function updatePlayer(Request $request, $id, $playerId)
    {
        set_time_limit(300);
        \Log::info("TeamController updatePlayer [START] - Team ID: {$id}, Player ID: {$playerId}");

        $team = Team::findOrFail($id);
        $player = \App\Models\User::findOrFail($playerId);
        $user = $request->user();

        // Permission check
        $isCaptain = ($user->id === $team->captain_id);
        $isAdmin = $user->is_admin;
        $isRegionalCaptain = false;

        if (!$isCaptain && !$isAdmin) {
            $isRegionalCaptain = \DB::table('championship_team')
                ->where('team_id', $id)
                ->where('captain_id', $user->id)
                ->exists();
        }

        if (!$isCaptain && !$isAdmin && !$isRegionalCaptain) {
            return response()->json(['message' => 'Sem permissão para editar este atleta.'], 403);
        }

        // Se for atleta exclusivo, admin, ou o PRÓPRIO usuário se editando, pode editar tudo
        $isExclusive = ($player->club_id === $team->club_id);
        $isSelf = ($user->id === $player->id);

        if ($isExclusive || $isAdmin || $isSelf) {
            $data = $request->only([
                'name',
                'nickname',
                'phone',
                'birth_date',
                'gender',
                'address',
                'cpf'
            ]);

            if ($request->filled('password')) {
                $data['password'] = \Hash::make($request->password);
            }

            $player->update($data);
        }

        // Atualiza Pivot
        $pivotQuery = \App\Models\TeamPlayer::where('team_id', $id)
            ->where('user_id', $playerId);

        if ($request->has('championship_id')) {
            $pivotQuery->where('championship_id', $request->championship_id);
        } else {
            $pivotQuery->whereNull('championship_id');
        }

        $pivot = $pivotQuery->first();
        if ($pivot) {
            $pivot->update([
                'temp_player_name' => $request->name,
                'position' => $request->position,
                'number' => $request->number
            ]);
        }

        // Processamento de Fotos (Slots 0, 1, 2)
        $photosArray = $player->photos ?? [];
        $hasUpload = false;

        \Log::info("TeamController updatePlayer [PHOTOS] - Processing slots", ['count' => count($request->allFiles())]);

        foreach (['photo_file', 'photo_file_1', 'photo_file_2'] as $index => $fileInput) {
            if ($request->hasFile($fileInput)) {
                $file = $request->file($fileInput);
                $filename = \Illuminate\Support\Str::slug($player->name) . '-' . time() . '-' . $index . '.' . $file->getClientOriginalExtension();
                $pPath = $file->storeAs('players/photos', $filename, 'public');

                $photosArray[$index] = $pPath;
                $hasUpload = true;
            }
        }

        if ($hasUpload) {
            $player->photos = $photosArray;
            $player->photo_path = $photosArray[0] ?? null;
            $player->save();

            // Background process for AI background removal if requested
            if (($request->boolean('remove_bg') || $request->input('remove_bg') == '1')) {
                try {
                    $userId = $player->id;
                    $php = PHP_BINARY;
                    $artisan = base_path('artisan');
                    $cmd = "{$php} {$artisan} player:process-photos {$userId}";

                    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                        pclose(popen("start /B " . $cmd, "r"));
                    } else {
                        exec("nohup {$cmd} > /dev/null 2>&1 & disown");
                    }
                } catch (\Exception $e) {
                    \Log::error("TeamController Update AI Error: " . $e->getMessage());
                }
            }
        }

        \Log::info("TeamController updatePlayer [SUCCESS] - Athlete {$playerId} updated");

        return response()->json(['message' => 'Atleta atualizado com sucesso!']);
    }

    // 6. Remover Jogador (Pelo Capitão)
    public function removePlayer(Request $request, $id, $playerId)
    {
        $team = Team::findOrFail($id);
        $user = auth()->user();

        // Verificar permissão (apenas capitão do time ou admin do clube)
        $isCaptain = \DB::table('championship_team')
            ->where('team_id', $id)
            ->where('captain_id', $user->id)
            ->exists();

        // Fallback: verificar se é o capitão principal do time ou admin
        if (!$isCaptain && $team->captain_id !== $user->id && !$user->is_admin) {
            return response()->json(['message' => 'Sem permissão para remover atletas deste time'], 403);
        }

        $champId = $request->championship_id;

        // Use standard DB logic for pivot to distinguish specific row
        \DB::table('team_players')
            ->where('team_id', $id)
            ->where('user_id', $playerId)
            ->when($champId, function ($q) use ($champId) {
                return $q->where('championship_id', $champId);
            }, function ($q) {
                return $q->whereNull('championship_id');
            })
            ->delete();

        return response()->json(['message' => 'Atleta removido do time com sucesso!']);
    }

    // 7. Create Team (For users)
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'city' => 'required|string',
            'championship_id' => 'required|exists:championships,id',
            'category_id' => 'required|exists:categories,id',
        ]);

        $team = Team::create([
            'name' => $request->name,
            'city' => $request->city,
            'captain_id' => $request->user()->id,
            'club_id' => 1, // Defaulting to 1 for now or fetching from env/config
        ]);

        // Automatically link the team to the selected championship and category, with the creator as captain
        $team->championships()->attach($request->championship_id, [
            'category_id' => $request->category_id,
            'captain_id' => $request->user()->id
        ]);
        $team->categories()->syncWithoutDetaching([$request->category_id]);

        return response()->json($team, 201);
    }
}
