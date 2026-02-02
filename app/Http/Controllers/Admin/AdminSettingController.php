<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Club;

class AdminSettingController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        $club = null;

        if ($user->club_id) {
            $club = Club::find($user->club_id);
        } else {
            $club = Club::first();
        }

        if ($club) {
            // Include all available sports for the modalities tab
            $club->all_sports = \App\Models\Sport::all();
        }

        return response()->json($club);
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
        ]);

        $club->update($data);

        return response()->json(['message' => 'Configurações atualizadas com sucesso!', 'club' => $club]);
    }
}
