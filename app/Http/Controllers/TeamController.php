<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Team;

class TeamController extends Controller
{
    // 1. Meus Times (Capitão ou Jogador)
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        // Times que sou capitão
        $teams = Team::where('captain_id', $userId)
            ->with(['club'])
            ->get();

        // TODO: Incluir times que sou apenas jogador (quando tiver tabela pivot)

        return response()->json($teams);
    }

    // 2. Detalhes do Time (Elenco)
    public function show($id)
    {
        $team = Team::with(['club', 'captain'])->findOrFail($id);

        // Mock de jogadores (enquanto não tem pivot)
        $team->players = [
            ['id' => 1, 'name' => 'João Silva', 'position' => 'Goleiro', 'number' => 1],
            ['id' => 2, 'name' => 'Pedro Santos', 'position' => 'Zagueiro', 'number' => 4],
            ['id' => 3, 'name' => 'Lucas Lima', 'position' => 'Atacante', 'number' => 9],
        ];

        return response()->json($team);
    }

    // 3. Adicionar Jogador (Convite)
    public function addPlayer(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string',
            'position' => 'required|string'
        ]);

        // Mock: Sucesso
        return response()->json(['message' => 'Jogador adicionado com sucesso!'], 201);
    }
}
