<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class VoteController extends Controller
{
    // Votar no Craque do Jogo
    public function voteMvp(Request $request)
    {
        $validated = $request->validate([
            'game_match_id' => 'required|exists:game_matches,id',
            'voted_player_id' => 'required|exists:users,id',
        ]);

        try {
            \App\Models\MvpVote::create([
                'game_match_id' => $validated['game_match_id'],
                'voted_player_id' => $validated['voted_player_id'],
                'voter_user_id' => $request->user()->id // O usuário logado
            ]);

            return response()->json(['message' => 'Voto computado com sucesso!'], 201);
        } catch (\Exception $e) {
            // Se cair aqui, provavelmente violou a regra unique (já votou)
            return response()->json(['message' => 'Você já votou neste jogo.'], 403);
        }
    }
}
