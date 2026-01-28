<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Team;

class SecurityController extends Controller
{
    // Valida o status de um jogador pelo QR Code (CPF ou ID criptografado)
    public function validatePlayer(Request $request, $code)
    {
        // code pode ser o ID do usuario direto
        $user = User::with(['club', 'teams'])->find($code);

        if (!$user) {
            return response()->json([
                'status' => 'invalid',
                'message' => 'Jogador não encontrado na base de dados.'
            ], 404);
        }

        // Validações de Negócio
        // 1. Está com mensalidade em dia? (Mock)
        $isFinancialOk = true;

        // 2. Está suspenso de jogos anteriores? (Mock)
        $isSuspended = false;

        // 3. Documentação está aprovada? (Assumindo que OCR já rodou e aprovou)
        $isDocsOk = $user->profile_verified_at != null;

        if ($isSuspended) {
            return response()->json([
                'status' => 'blocked',
                'message' => 'Jogador Suspenso (Cartão Vermelho pendente).',
                'player' => $user
            ]);
        }

        if (!$isFinancialOk) {
            return response()->json([
                'status' => 'alert',
                'message' => 'Pendência Financeira com o Clube.',
                'player' => $user
            ]);
        }

        return response()->json([
            'status' => 'authorized',
            'message' => 'Jogador APTO para a partida.',
            'player' => $user
        ]);
    }
}
