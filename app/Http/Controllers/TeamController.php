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

        // Times que sou capitão
        $captainTeams = Team::where('captain_id', $user->id)
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
    public function show($id)
    {
        $team = Team::with(['club', 'captain', 'players'])->findOrFail($id);

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
            'photo_file' => 'nullable|image|max:2048' // Max 2MB
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
        if ($request->hasFile('photo_file')) {
            $photoPath = $request->file('photo_file')->store('players/photos', 'public');
        }

        // 3. Create User if not exists (Auto-Registration Logic)
        if (!$userData) {
            $tempPassword = $request->cpf ? preg_replace('/[^0-9]/', '', $request->cpf) : 'mudar123';
            // Generate temp email if strict logic requires it, assuming DB requires unique email
            $email = $request->email;
            if (empty($email)) {
                $email = 'temp_' . uniqid() . '_' . time() . '@temp.app';
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
                'document_path' => $documentPath,
                'photo_path' => $photoPath
            ]);
        } else {
            // Update existing user with new info if they are blank
            $updateData = [];
            if (!$userData->document_path && $documentPath)
                $updateData['document_path'] = $documentPath;
            if (!$userData->photo_path && $photoPath)
                $updateData['photo_path'] = $photoPath;
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

        $team->players()->attach($userData ? $userData->id : null, [
            'temp_player_name' => $userData ? $userData->name : $request->name,
            'position' => $request->position,
            'number' => $request->number,
            'user_id' => $userData ? $userData->id : null,
            'is_approved' => $userData ? 1 : 0 // Se criado agora ou já existe, está "aprovado" no time. Se for só nome temp, status pendente? Ou aprovado direto pois foi o capitão? Aprovado direto.
        ]);

        return response()->json(['message' => 'Jogador adicionado e vinculado com sucesso!'], 201);
    }
    // 4. Create Team (For users)
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'city' => 'required|string',
        ]);

        $team = Team::create([
            'name' => $request->name,
            'city' => $request->city,
            'captain_id' => $request->user()->id,
            // You might want to assign a default club or handle it differently if logic changes
            'club_id' => 1, // Defaulting to 1 for now or fetching from env/config
        ]);

        return response()->json($team, 201);
    }
}
