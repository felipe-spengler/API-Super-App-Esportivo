<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;

use App\Http\Requests\StorePlayerRequest;

class AdminPlayerController extends Controller
{
    // List players
    public function index(Request $request)
    {
        $user = $request->user();

        $query = User::query();

        // Filter by club if not super admin
        if ($user->club_id) {
            $query->where('club_id', $user->club_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('cpf', 'like', "%{$search}%");
            });
        }

        $players = $query->orderBy('name')->paginate(50);

        return response()->json($players);
    }

    // Get player details
    public function show($id, Request $request)
    {
        $player = User::findOrFail($id);

        if ($request->has('team_id')) {
            $teamId = $request->query('team_id');
            $championshipId = $request->query('championship_id');

            $query = \App\Models\TeamPlayer::where('user_id', $id)
                ->where('team_id', $teamId);

            if ($championshipId) {
                // Tenta buscar específico do campeonato
                // Se não achar, pode ser que seja um registro "global" do time (sem champ id ainda)?
                // A lógica atual é: se tem campeonato, o registro na pivô deve ter campeonato.
                $query->where('championship_id', $championshipId);
            } else {
                // Se não passou campeonato, pega qualquer um ou o nulo?
                // Idealmente pega o mais recente ou o nulo (base).
                // Vamos focar no caso que o front manda (que é quando está num contexto)
            }

            $pivot = $query->first();

            if ($pivot) {
                $player->position = $pivot->position;
                $player->number = $pivot->number;
                // Add extra info if needed
                $player->team_player_id = $pivot->id;
            }
        }

        return response()->json($player);
    }

    // Create player
    public function store(StorePlayerRequest $request)
    {
        $user = $request->user();

        $validated = $request->validated();

        $validated['club_id'] = $user->club_id ?? $request->club_id;
        // Senha padrão se não enviada
        $validated['password'] = bcrypt($request->input('password', 'mudar123'));

        // Handle missing email if allowed by validation but required by DB
        if (empty($validated['email'])) {
            $validated['email'] = 'temp_' . uniqid() . '@temp.local';
        }

        $player = User::create($validated);

        return response()->json($player, 201);
    }

    // Update player
    public function update(Request $request, $id)
    {
        $player = User::findOrFail($id);

        // Validation for User fields
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'nickname' => 'nullable|string|max:255',
            'email' => 'nullable|email|unique:users,email,' . $id,
            'cpf' => 'nullable|string|unique:users,cpf,' . $id,
            'phone' => 'nullable|string',
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|string|in:M,F,O',
            'address' => 'nullable|string|max:500',
        ]);

        $player->update($validated);

        // Handle Team Context Update (Pivot)
        if ($request->has('team_id')) {
            $teamId = $request->input('team_id');
            $championshipId = $request->input('championship_id');
            $position = $request->input('position');
            $number = $request->input('number');

            $query = \App\Models\TeamPlayer::where('user_id', $id)
                ->where('team_id', $teamId);

            if ($championshipId) {
                $query->where('championship_id', $championshipId);
            }

            $pivot = $query->first();

            if ($pivot) {
                $pivot->update([
                    'position' => $position,
                    'number' => $number
                ]);
            } else {
                // Se não achou na pivô mas mandaram o team_id, talvez devêssemos criar?
                // Por segurança, apenas editamos se existir.
            }
        }

        return response()->json($player);
    }

    // Delete player
    public function destroy($id)
    {
        $player = User::findOrFail($id);
        $player->delete();

        return response()->json(['message' => 'Player deleted successfully']);
    }

    // Search players for awards/MVP selection
    public function search(Request $request)
    {
        $query = User::query();

        if ($request->has('q')) {
            $search = $request->q;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('cpf', 'like', "%{$search}%");
            });
        }

        if ($request->has('team_id')) {
            // Future: filter by team membership
        }

        $players = $query->limit(20)->get(['id', 'name', 'email', 'cpf']);

        return response()->json($players);
    }
}
