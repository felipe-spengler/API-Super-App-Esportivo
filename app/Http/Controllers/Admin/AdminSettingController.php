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
        try {
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

            // Validate basic text fields
            $data = $request->validate([
                'name' => 'nullable|string',
                'contact_email' => 'nullable|email',
                'primary_color' => 'nullable|string',
                'secondary_color' => 'nullable|string',
                'primary_font' => 'nullable|string',
                'secondary_font' => 'nullable|string',
                'active_modalities' => 'nullable', // Accept array or json string
            ]);

            // Handle Modalites format
            $am = $request->input('active_modalities');
            if ($am !== null) {
                if (is_string($am)) {
                    $decoded = json_decode($am, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $data['active_modalities'] = $decoded;
                    }
                } elseif (is_array($am)) {
                    $data['active_modalities'] = $am;
                }
            }

            // Handle Logo Upload
            if ($request->hasFile('logo')) {
                $path = $request->file('logo')->store("clubs/{$club->id}", 'public');
                $data['logo_url'] = '/storage/' . $path;
            }

            // Handle Banner Upload
            if ($request->hasFile('banner')) {
                $path = $request->file('banner')->store("clubs/{$club->id}", 'public');
                $data['banner_url'] = '/storage/' . $path;
            }

            // Handle Art Settings
            $inputSettings = $request->input('art_settings');

            if ($inputSettings !== null) {
                if (is_string($inputSettings)) {
                    $decoded = json_decode($inputSettings, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $inputSettings = $decoded;
                    } else {
                        $inputSettings = [];
                    }
                }

                if (is_array($inputSettings)) {
                    $currentSettings = $club->art_settings ?? [];
                    $data['art_settings'] = array_replace_recursive($currentSettings, $inputSettings);
                }
            }

            $club->update($data);

            return response()->json(['message' => 'Configurações atualizadas com sucesso!', 'club' => $club]);
        } catch (\Exception $e) {
            \Log::error('Settings Update Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erro ao salvar configurações.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
