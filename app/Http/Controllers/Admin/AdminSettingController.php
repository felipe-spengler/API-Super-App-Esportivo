<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Club;

class AdminSettingController extends Controller
{
    public function show(Request $request)
    {
        try {
            $user = $request->user();
            $club = null;

            if ($user->club_id) {
                $club = Club::find($user->club_id);
            } else {
                $club = Club::first();
            }

            if ($club) {
                // Include all available sports for the modalities tab
                try {
                    $club->all_sports = \App\Models\Sport::all();
                } catch (\Exception $e) {
                    $club->all_sports = []; // Fallback if table missing or error
                    \Log::error('Error loading sports: ' . $e->getMessage());
                }
            }

            return response()->json($club);
        } catch (\Exception $e) {
            \Log::error('Settings Error: ' . $e->getMessage());
            return response()->json(['message' => 'Erro ao carregar configurações'], 500);
        }
    }

    public function update(Request $request)
    {
        $user = $request->user();
        $club = null;

        if ($user->club_id) {
            $club = Club::find($user->club_id);
        } else {
            $club = Club::first();
        }

        if (!$club) {
            return response()->json(['message' => 'Club not found'], 404);
        }

        $data = $request->validate([
            'name' => 'required|string',
            'contact_email' => 'nullable|email',
            'primary_color' => 'nullable|string',
            'secondary_color' => 'nullable|string',
            'primary_font' => 'nullable|string',
            'secondary_font' => 'nullable|string',
            'active_modalities' => 'nullable|array',
            'art_settings' => 'nullable|array',
        ]);

        $club->update($data);

        return response()->json(['message' => 'Configurações atualizadas com sucesso!', 'club' => $club]);
    }
}
