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
        $team = Team::findOrFail($id);

        // Check permission (only captain or admin)
        if ($request->user()->id !== $team->captain_id && !$request->user()->is_admin) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

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
            'document_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120', // Max 5MB
            'photo_file' => 'nullable|image|max:4096', // Max 4MB
            'championship_id' => 'nullable|integer|exists:championships,id'
        ]);

        $userData = null;

        // 1. Check by Email (if provided)
        if ($request->email) {
            $userData = \App\Models\User::where('email', $request->email)->first();
        }

        // 2. Check by CPF (if provided and not found by email)
        if (!$userData && $request->cpf) {
            $userData = \App\Models\User::where('cpf', $request->cpf)->first();
        }

        $documentPath = null;
        if ($request->hasFile('document_file')) {
            $documentPath = $request->file('document_file')->store('requests/documents', 'public');
        }

        $photoPath = null;
        $photosArray = [];

        foreach (['photo_file', 'photo_file_1', 'photo_file_2'] as $index => $fileInput) {
            if ($request->hasFile($fileInput)) {
                $pPath = $request->file($fileInput)->store('players/photos', 'public');

                // PROCESSAMENTO DE IA: REMOVER FUNDO
                if ($request->boolean('remove_bg') || $request->input('remove_bg') == '1') {
                    try {
                        $inputAbsPath = storage_path('app/public/' . $pPath);
                        $filenameNobg = pathinfo($pPath, PATHINFO_FILENAME) . '_nobg.png';
                        $outputAbsPath = storage_path('app/public/players/photos/' . $filenameNobg);
                        $scriptPath = base_path('scripts/remove_bg.py');

                        $cacheDir = storage_path('app/public/.u2net');
                        if (!file_exists($cacheDir)) {
                            @mkdir($cacheDir, 0775, true);
                        }

                        $pythonBin = null;
                        foreach (['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3'] as $candidate) {
                            $testOut = [];
                            $testRet = -1;
                            @exec("{$candidate} --version 2>&1", $testOut, $testRet);
                            if ($testRet === 0) {
                                $pythonBin = $candidate;
                                break;
                            }
                        }

                        if ($pythonBin) {
                            $command = "export U2NET_HOME={$cacheDir} && export NUMBA_CACHE_DIR={$cacheDir} && {$pythonBin} \"{$scriptPath}\" \"{$inputAbsPath}\" \"{$outputAbsPath}\" 2>&1";
                            exec($command, $output, $returnVar);

                            if ($returnVar === 0 && file_exists($outputAbsPath)) {
                                @chmod($outputAbsPath, 0664);
                                $pPath = 'players/photos/' . $filenameNobg;
                            }
                        }
                    } catch (\Throwable $e) {
                        \Log::error("Lab AI TeamController (add) - Exception: " . $e->getMessage());
                    }
                }

                $photosArray[$index] = $pPath;
                if ($index === 0) {
                    $photoPath = $pPath; // Mantém compatibilidade principal
                }
            }
        }
        $photosArray = array_values($photosArray);

        // 3. Create User if not exists (Auto-Registration Logic)
        if (!$userData) {
            $tempPassword = $request->cpf ? preg_replace('/[^0-9]/', '', $request->cpf) : 'mudar123';
            // Generate temp email if strict logic requires it, assuming DB requires unique email
            $email = $request->email;
            if (empty($email)) {
                $email = 'temp_' . uniqid() . '_' . time() . '@temp.app';
            } else {
                $exists = \App\Models\User::where('email', $email)->exists();
                if ($exists) {
                    return response()->json(['message' => 'Este e-mail já está em uso por outro atleta no sistema.'], 422);
                }
            }

            $userData = \App\Models\User::create([
                'name' => $request->name,
                'nickname' => $request->nickname,
                'email' => $email,
                'cpf' => $request->cpf,
                'phone' => $request->phone,
                'gender' => $request->gender,
                'address' => $request->address,
                'birth_date' => $request->birth_date,
                'password' => \Illuminate\Support\Facades\Hash::make($tempPassword),
                'role' => 'user',
                'club_id' => $team->club_id,
                'document_path' => $documentPath,
                'photo_path' => $photoPath,
                'photos' => $photosArray,
                'created_by' => $request->user()->id
            ]);
        } else {
            // Update existing user with new info if they are blank
            $updateData = [];
            if (!$userData->document_path && $documentPath)
                $updateData['document_path'] = $documentPath;
            if (!$userData->photo_path && $photoPath) {
                $updateData['photo_path'] = $photoPath;
                $updateData['photos'] = array_values(array_unique(array_merge($userData->photos ?? [], $photosArray)));
            } else if (!empty($photosArray)) {
                $updateData['photos'] = array_values(array_unique(array_merge($userData->photos ?? [], $photosArray)));
            }
            if (!$userData->phone && $request->phone)
                $updateData['phone'] = $request->phone;
            if (!$userData->gender && $request->gender)
                $updateData['gender'] = $request->gender;
            if (!$userData->address && $request->address)
                $updateData['address'] = $request->address;
            if (!$userData->nickname && $request->nickname)
                $updateData['nickname'] = $request->nickname;
            if (!$userData->birth_date && $request->birth_date)
                $updateData['birth_date'] = $request->birth_date;

            // Only update email/cpf if they were empty on the user? 
            // Usually we don't overwrite verified info with potentially partial info unless explicitly requested.
            // Keeping existing logic of only filling blanks.

            if (!empty($updateData)) {
                $userData->update($updateData);
            }
        }

        // Add to pivot
        // Validação de elegibilidade se o time já estiver em algum campeonato/categoria
        if ($userData) {
            $teamCategories = \App\Models\Category::whereHas('teams', function ($q) use ($team) {
                $q->where('teams.id', $team->id);
            })->get();

            // Também verificar categorias vinculadas via championship_team se houver
            $champCategories = \App\Models\Category::whereIn('id', function ($query) use ($team) {
                $query->select('category_id')
                    ->from('championship_team')
                    ->where('team_id', $team->id)
                    ->whereNotNull('category_id');
            })->get();

            $allCategories = $teamCategories->merge($champCategories);

            foreach ($allCategories as $category) {
                // Skip eligibility check if user is admin or club manager
                $isAdmin = $request->user()->is_admin;
                $isClubManager = $request->user()->club_id === $team->club_id;

                if (!$isAdmin && !$isClubManager) {
                    $check = $category->isUserEligible($userData);
                    if (!$check['eligible']) {
                        return response()->json([
                            'message' => 'O atleta não atende aos requisitos desta categoria.',
                            'reason' => $check['reason'],
                            'category' => $category->name
                        ], 403);
                    }
                }
            }
        }

        $team->players()->attach($userData ? $userData->id : null, [
            'temp_player_name' => $userData ? $userData->name : $request->name,
            'position' => $request->position,
            'number' => $request->number,
            'user_id' => $userData ? $userData->id : null,
            'is_approved' => $userData ? 1 : 0, // Se criado agora ou já existe, está "aprovado" no time.
            'championship_id' => $request->championship_id
        ]);

        return response()->json(['message' => 'Jogador adicionado e vinculado com sucesso!'], 201);
    }
    // 4. Editar Jogador (Pelo Capitão)
    public function updatePlayer(Request $request, $id, $playerId)
    {
        $team = Team::findOrFail($id);
        $user = $request->user();

        // Verifica permissão (apenas capitão ou admin)
        if ($user->id !== $team->captain_id && !$user->is_admin) {
            return response()->json(['message' => 'Você não tem permissão para editar este time.'], 403);
        }

        $player = \App\Models\User::findOrFail($playerId);

        // 1. Atualizar Dados de Contexto (Pivô) - SEMPRE PERMITIDO
        $pivot = \App\Models\TeamPlayer::where('team_id', $id)
            ->where('user_id', $playerId)
            ->first();

        if ($pivot) {
            $pivot->update([
                'position' => $request->position,
                'number' => $request->number
            ]);
        }

        // 2. Lógica de Dados Globais (Nome, Foto, etc)
        // Permite se: Criou o jogador OU jogador é exclusivo deste time OU é admin
        $isExclusive = $player->teamsAsPlayer()->count() <= 1;
        $canEditGlobal = ($player->created_by === $user->id) || $isExclusive || $user->is_admin;

        if ($canEditGlobal) {
            $validated = $request->validate([
                'name' => 'nullable|string|max:255',
                'nickname' => 'nullable|string|max:255',
                'birth_date' => 'nullable|date',
                'phone' => 'nullable|string',
                'gender' => 'nullable|string|in:M,F,O',
                'address' => 'nullable|string|max:500',
            ]);

            // Impedir alteração de CPF/Email de jogadores compartilhados para segurança
            if (!$isExclusive && !$user->is_admin) {
                unset($validated['email']);
                unset($validated['cpf']);
            }

            $player->update($validated);

            // Se enviou nova foto, processar (apenas se tiver permissão global)
            // Se enviou novas fotos, processar (apenas se tiver permissão global)
            $photosArray = [];
            $hasAnyPhoto = false;
            $photoPath = null;

            foreach (['photo_file', 'photo_file_1', 'photo_file_2'] as $index => $fileInput) {
                if ($request->hasFile($fileInput)) {
                    $hasAnyPhoto = true;
                    $pPath = $request->file($fileInput)->store('players/photos', 'public');

                    // PROCESSAMENTO DE IA: REMOVER FUNDO
                    if ($request->boolean('remove_bg') || $request->input('remove_bg') == '1') {
                        try {
                            $inputAbsPath = storage_path('app/public/' . $pPath);
                            $filenameNobg = pathinfo($pPath, PATHINFO_FILENAME) . '_nobg.png';
                            $outputAbsPath = storage_path('app/public/players/photos/' . $filenameNobg);
                            $scriptPath = base_path('scripts/remove_bg.py');

                            $cacheDir = storage_path('app/public/.u2net');
                            if (!file_exists($cacheDir)) {
                                @mkdir($cacheDir, 0775, true);
                            }

                            $pythonBin = null;
                            foreach (['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3'] as $candidate) {
                                $testOut = [];
                                $testRet = -1;
                                @exec("{$candidate} --version 2>&1", $testOut, $testRet);
                                if ($testRet === 0) {
                                    $pythonBin = $candidate;
                                    break;
                                }
                            }

                            if ($pythonBin) {
                                $command = "export U2NET_HOME={$cacheDir} && export NUMBA_CACHE_DIR={$cacheDir} && {$pythonBin} \"{$scriptPath}\" \"{$inputAbsPath}\" \"{$outputAbsPath}\" 2>&1";
                                exec($command, $output, $returnVar);

                                if ($returnVar === 0 && file_exists($outputAbsPath)) {
                                    @chmod($outputAbsPath, 0664);
                                    $pPath = 'players/photos/' . $filenameNobg;
                                }
                            }
                        } catch (\Throwable $e) {
                            \Log::error("Lab AI TeamController (update loop) - Exception: " . $e->getMessage());
                        }
                    }

                    $photosArray[$index] = $pPath;
                    if ($index === 0) {
                        $photoPath = $pPath; // Mantém compatibilidade principal
                    }
                }
            }

            if ($hasAnyPhoto) {
                // If they uploaded at least one new file, we merge it with existing photos or replace?
                // The most sensible UX for multiple select is replace the slot. Wait, since it's an array,
                // if they upload 2, it replaces the existing? Or it just merges?
                // Let's just merge all uniquely to be safe, like we did in addPlayer.
                $photosArray = array_values($photosArray);
                $finalPhotos = array_values(array_unique(array_merge($player->photos ?? [], $photosArray)));

                $updateData = ['photos' => $finalPhotos];
                if ($photoPath) {
                    $updateData['photo_path'] = $photoPath;
                }
                $player->update($updateData);
            }
        }

        return response()->json(['message' => 'Atleta atualizado com sucesso!']);
    }

    // 5. Create Team (For users)
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
