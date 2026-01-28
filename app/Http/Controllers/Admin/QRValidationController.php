<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\GameMatch;
use Carbon\Carbon;

class QRValidationController extends Controller
{
    /**
     * Validar carteirinha digital
     */
    public function validateWallet(Request $request)
    {
        $request->validate([
            'qr_code' => 'required|string',
        ]);

        try {
            // Decodifica QR Code (formato: "WALLET:{user_id}:{timestamp}")
            $qrData = $request->input('qr_code');

            if (!str_starts_with($qrData, 'WALLET:')) {
                return response()->json([
                    'valid' => false,
                    'message' => 'QR Code inválido.'
                ], 400);
            }

            $parts = explode(':', $qrData);
            if (count($parts) < 3) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Formato de QR Code inválido.'
                ], 400);
            }

            $userId = $parts[1];
            $timestamp = $parts[2];

            // Verifica se QR Code não expirou (válido por 5 minutos)
            $qrTime = Carbon::createFromTimestamp($timestamp);
            if ($qrTime->diffInMinutes(now()) > 5) {
                return response()->json([
                    'valid' => false,
                    'message' => 'QR Code expirado. Atualize a carteirinha.'
                ], 400);
            }

            // Busca usuário
            $user = User::find($userId);
            if (!$user) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Usuário não encontrado.'
                ], 404);
            }

            // Retorna dados do usuário
            return response()->json([
                'valid' => true,
                'message' => 'Carteirinha válida!',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'cpf' => $user->cpf,
                    'photo_path' => $user->photo_path,
                    'club_id' => $user->club_id,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'valid' => false,
                'message' => 'Erro ao validar QR Code.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check-in de jogador para partida
     */
    public function checkInPlayer(Request $request)
    {
        $request->validate([
            'qr_code' => 'required|string',
            'match_id' => 'required|exists:game_matches,id',
        ]);

        try {
            // Valida QR Code
            $qrData = $request->input('qr_code');

            if (!str_starts_with($qrData, 'WALLET:')) {
                return response()->json([
                    'success' => false,
                    'message' => 'QR Code inválido.'
                ], 400);
            }

            $parts = explode(':', $qrData);
            $userId = $parts[1];

            // Busca usuário e partida
            $user = User::findOrFail($userId);
            $match = GameMatch::with(['homeTeam', 'awayTeam'])->findOrFail($request->input('match_id'));

            // Verifica se jogador pertence a uma das equipes
            // (Aqui você pode adicionar lógica mais complexa de verificação)

            // Registra check-in (pode criar uma tabela de check-ins se necessário)
            // Por enquanto, apenas retorna sucesso

            return response()->json([
                'success' => true,
                'message' => 'Check-in realizado com sucesso!',
                'player' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'photo_path' => $user->photo_path,
                ],
                'match' => [
                    'id' => $match->id,
                    'home_team' => $match->homeTeam->name ?? 'N/A',
                    'away_team' => $match->awayTeam->name ?? 'N/A',
                    'start_time' => $match->start_time,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao fazer check-in.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validar ingresso (se houver sistema de ingressos)
     */
    public function validateTicket(Request $request)
    {
        $request->validate([
            'qr_code' => 'required|string',
        ]);

        try {
            // Decodifica QR Code (formato: "TICKET:{ticket_id}:{match_id}")
            $qrData = $request->input('qr_code');

            if (!str_starts_with($qrData, 'TICKET:')) {
                return response()->json([
                    'valid' => false,
                    'message' => 'QR Code de ingresso inválido.'
                ], 400);
            }

            $parts = explode(':', $qrData);
            if (count($parts) < 3) {
                return response()->json([
                    'valid' => false,
                    'message' => 'Formato de QR Code inválido.'
                ], 400);
            }

            $ticketId = $parts[1];
            $matchId = $parts[2];

            // Aqui você implementaria a lógica de validação de ingressos
            // Por enquanto, retorna exemplo

            return response()->json([
                'valid' => true,
                'message' => 'Ingresso válido!',
                'ticket' => [
                    'id' => $ticketId,
                    'match_id' => $matchId,
                    'type' => 'VIP',
                    'seat' => 'A-15',
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'valid' => false,
                'message' => 'Erro ao validar ingresso.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Gerar QR Code para carteirinha (usado pelo mobile)
     */
    public function generateWalletQR(Request $request)
    {
        $user = $request->user();

        // Gera QR Code com timestamp atual
        $qrContent = "WALLET:{$user->id}:" . time();

        return response()->json([
            'qr_code_content' => $qrContent,
            'expires_in' => 300, // 5 minutos
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'club_id' => $user->club_id,
            ]
        ]);
    }
}
