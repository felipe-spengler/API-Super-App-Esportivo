<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;

use App\Http\Requests\StorePlayerRequest;
use App\Services\AuditLogger;

class AdminPlayerController extends Controller
{
    // List players
    public function index(Request $request)
    {
        $user = $request->user();
        $query = User::query();

        // Determina o club_id (preferência para o parâmetro da URL, fallback para o clube do admin)
        $clubId = $request->query('club_id', $user->club_id);

        if ($clubId) {
            $query->where(function ($q) use ($clubId) {
                // Usuário vinculado diretamente ao clube
                $q->where('club_id', $clubId)
                    // OU usuário que joga em algum time deste clube
                    ->orWhereHas('teamsAsPlayer', function ($sq) use ($clubId) {
                        $sq->where('club_id', $clubId);
                    });
            });
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
        // Ensure that if email is present, we check uniqueness manually if not done by Request (StorePlayerRequest removed unique rule)
        else {
            $exists = User::where('email', $validated['email'])->exists();
            if ($exists) {
                // Return error or handle. For now, let's assume if it passed validation it's ok, 
                // BUT StorePlayerRequest removed 'unique' rule! We should add it back optionally or check here.
                // Correct approach: The Controller should trust the Request, but the Request removed the unique rule.
                // So we must check here to avoid DB error or overwrites.
                return response()->json(['message' => 'Este e-mail já está em uso.', 'errors' => ['email' => ['Este e-mail já está em uso.']]], 422);
            }
        }

        $player = User::create($validated);

        AuditLogger::log('user.create', "Criou o usuário/atleta '{$player->name}' (ID: {$player->id})", [
            'user_id' => $player->id,
            'email' => $player->email
        ]);

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
            'password' => 'nullable|string|min:6|confirmed',
        ], [
            'password.min' => 'A senha deve ter no mínimo :min caracteres.',
            'password.confirmed' => 'A confirmação de senha não confere.',
            'email.unique' => 'Este e-mail já está em uso por outro atleta.',
            'cpf.unique' => 'Este CPF já está cadastrado.',
            'name.required' => 'O nome é obrigatório.',
            'email.email' => 'Informe um e-mail válido.',
        ]);

        // Handle password update
        if ($request->filled('password')) {
            $validated['password'] = bcrypt($request->password);
        } else {
            unset($validated['password']); // Don't update if empty
        }

        $player->update($validated);

        AuditLogger::log('user.update', "Editou dados do usuário/atleta '{$player->name}' (ID: {$player->id})", [
            'user_id' => $player->id,
            'changes' => array_keys($validated)
        ]);

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

        \DB::transaction(function () use ($id, $player) {
            // Remove references from team_players
            \DB::table('team_players')->where('user_id', $id)->delete();
            
            // Remove votes
            \DB::table('mvp_votes')->where('voter_user_id', $id)->orWhere('voted_player_id', $id)->delete();
            
            // Update game matches MVP
            \DB::table('game_matches')->where('mvp_player_id', $id)->update(['mvp_player_id' => null]);
            
            // Update perna_de_pau in game matches if the column exists
            try {
                \DB::table('game_matches')->where('perna_de_pau_player_id', $id)->update(['perna_de_pau_player_id' => null]);
            } catch (\Exception $e) {
                // Column might not exist, ignore
            }
            
            // Delete match events for this player
            \DB::table('match_events')->where('player_id', $id)->delete();
            
            // Delete match positions
            \DB::table('match_positions')->where('player_id', $id)->delete();
            
            // Update teams and championships captains
            \DB::table('teams')->where('captain_id', $id)->update(['captain_id' => null]);
            \DB::table('championship_team')->where('captain_id', $id)->update(['captain_id' => null]);
            
            // Set null or delete in race results
            \DB::table('race_results')->where('user_id', $id)->update(['user_id' => null]);
            
            // Delete competitor times
            try {
                \DB::table('competitor_times')->where('user_id', $id)->delete();
            } catch (\Exception $e) {
                // Table might not exist, ignore
            }
            
            // Delete orders (if any)
            try {
                \DB::table('orders')->where('user_id', $id)->delete();
            } catch (\Exception $e) {
                // Table might not exist, ignore
            }
            
            // Finally delete the user
            $player->delete();
        });

        AuditLogger::log('user.delete', "Excluiu o usuário/atleta '{$player->name}' (ID: {$id})");

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
