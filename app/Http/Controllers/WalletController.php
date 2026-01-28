<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class WalletController extends Controller
{
    // Obter dados da Carteirinha Digital
    public function getWallet(Request $request)
    {
        $user = $request->user();

        // QR Code Data (Ex: JSON com ID e Hash de segurança)
        $qrData = json_encode([
            'id' => $user->id,
            'email' => $user->email,
            'timestamp' => now()->timestamp,
            'valid' => true
        ]);

        return response()->json([
            'user_name' => $user->name,
            'user_id' => $user->id,
            'qr_code_content' => $qrData,
            'club_name' => 'Clube Toledão', // Idealmente viria de user->club
            'status' => 'Ativo',
            'expires_at' => '31/12/2026'
        ]);
    }
}
