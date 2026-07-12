<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class VoteController extends Controller
{
    // Votar no Craque do Jogo (Autenticado - Mesário ou Árbitro)
    public function voteMvp(Request $request)
    {
        $validated = $request->validate([
            'game_match_id' => 'required|exists:game_matches,id',
            'voted_player_id' => 'required|exists:users,id',
            'voter_type' => 'nullable|in:mesario,arbitro,public',
        ]);

        $voterType = $validated['voter_type'] ?? 'mesario';
        $matchId = $validated['game_match_id'];
        $votedPlayerId = $validated['voted_player_id'];
        $userId = $request->user()->id;

        try {
            // Se for mesário ou árbitro, eles podem atualizar o seu voto na súmula
            if (in_array($voterType, ['mesario', 'arbitro'])) {
                $vote = \App\Models\MvpVote::updateOrCreate(
                    [
                        'game_match_id' => $matchId,
                        'voter_type' => $voterType,
                    ],
                    [
                        'voted_player_id' => $votedPlayerId,
                        'voter_user_id' => $userId,
                    ]
                );
            } else {
                // Usuário comum logado votando como público
                $ipAddress = $request->ip();
                
                // Validação de IP para voto público
                $exists = \App\Models\MvpVote::where('game_match_id', $matchId)
                    ->where('voter_type', 'public')
                    ->where(function ($query) use ($userId, $ipAddress) {
                        $query->where('voter_user_id', $userId)
                              ->orWhere('ip_address', $ipAddress);
                    })
                    ->exists();

                if ($exists) {
                    return response()->json(['message' => 'Você já votou nesta partida.'], 403);
                }

                $vote = \App\Models\MvpVote::create([
                    'game_match_id' => $matchId,
                    'voter_user_id' => $userId,
                    'voted_player_id' => $votedPlayerId,
                    'voter_type' => 'public',
                    'ip_address' => $ipAddress,
                ]);
            }

            // Notificar via WebSocket
            $match = \App\Models\GameMatch::find($matchId);
            if ($match) {
                \App\Events\MatchUpdated::dispatch($match->id, $match->toArray());
            }

            return response()->json(['message' => 'Voto computado com sucesso!'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao computar o voto: ' . $e->getMessage()], 500);
        }
    }

    // Votar no Craque do Jogo (Público / Não autenticado / Mobile)
    public function publicVoteMvp(Request $request, $id)
    {
        $validated = $request->validate([
            'voted_player_id' => 'required|exists:users,id',
        ]);

        $match = \App\Models\GameMatch::findOrFail($id);
        
        if ($match->status !== 'live') {
            return response()->json(['message' => 'A votação só é permitida enquanto a partida estiver ao vivo.'], 403);
        }

        $ipAddress = $request->ip();

        // Limita a 1 voto por IP
        $exists = \App\Models\MvpVote::where('game_match_id', $match->id)
            ->where('voter_type', 'public')
            ->where('ip_address', $ipAddress)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'Já foi registrado um voto com este celular/conexão.'], 403);
        }

        try {
            \App\Models\MvpVote::create([
                'game_match_id' => $match->id,
                'voted_player_id' => $validated['voted_player_id'],
                'voter_type' => 'public',
                'ip_address' => $ipAddress,
            ]);

            // Notificar via WebSocket
            \App\Events\MatchUpdated::dispatch($match->id, $match->toArray());

            return response()->json(['message' => 'Seu voto foi computado com sucesso!'], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao registrar voto: ' . $e->getMessage()], 500);
        }
    }
}
