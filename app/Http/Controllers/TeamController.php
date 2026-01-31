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
            'position' => 'required|string',
            'email' => 'nullable|email',
            'cpf' => 'nullable|string',
            'number' => 'nullable|string',
            'document_file' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120' // Max 5MB
        ]);

        $userData = null;

        // 1. Check by Email
        if ($request->email) {
            $userData = \App\Models\User::where('email', $request->email)->first();
        }

        // 2. Check by CPF (if not found by email)
        if (!$userData && $request->cpf) {
            $userData = \App\Models\User::where('cpf', $request->cpf)->first();
        }

        $documentPath = null;
        if ($request->hasFile('document_file')) {
            $documentPath = $request->file('document_file')->store('requests/documents', 'public');
        }

        // 3. Create User if not exists (Auto-Registration Logic)
        if (!$userData && ($request->email || $request->cpf)) {
            $tempPassword = $request->cpf ? preg_replace('/[^0-9]/', '', $request->cpf) : 'mudar123';

            $userData = \App\Models\User::create([
                'name' => $request->name,
                'email' => $request->email ?? ($request->cpf . '@temp.com.br'), // Fallback email
                'cpf' => $request->cpf,
                'password' => \Illuminate\Support\Facades\Hash::make($tempPassword),
                'role' => 'user',
                'document_path' => $documentPath
            ]);

            // TODO: Enviar email com credenciais
            // Mail::to($userData->email)->send(new WelcomePlayerMail($userData, $tempPassword));
        } else if ($userData && $documentPath) {
            if (!$userData->document_path) {
                $userData->update(['document_path' => $documentPath]);
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
