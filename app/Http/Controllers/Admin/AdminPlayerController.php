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
    public function show($id)
    {
        $player = User::findOrFail($id);

        return response()->json($player);
    }

    // Create player
    public function store(StorePlayerRequest $request)
    {
        $user = $request->user();

        $validated = $request->validated();

        $validated['club_id'] = $user->club_id ?? $request->club_id;
        // Senha padrão se não enviada (ou lógica customizada)
        $validated['password'] = bcrypt($request->input('password', 'mudar123'));

        $player = User::create($validated);

        return response()->json($player, 201);
    }

    // Update player
    public function update(Request $request, $id)
    {
        $player = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'string|max:255',
            'email' => 'email|unique:users,email,' . $id,
            'cpf' => 'nullable|string|unique:users,cpf,' . $id,
            'phone' => 'nullable|string',
            'birth_date' => 'nullable|date',
        ]);

        $player->update($validated);

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
