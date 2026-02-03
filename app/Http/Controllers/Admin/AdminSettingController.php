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
            if ($request->has('active_modalities') && is_string($request->active_modalities)) {
                $data['active_modalities'] = json_decode($request->active_modalities, true);
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
            // 1. Merge Text Data
            $currentSettings = $club->art_settings ?? [];
            $inputSettings = $request->input('art_settings', []);

            if (is_string($inputSettings)) {
                $decoded = json_decode($inputSettings, true);
                if (is_array($decoded)) {
                    $inputSettings = $decoded;
                } else {
                    $inputSettings = [];
                }
            }

            // Recursive merge for settings structure
            $currentSettings = array_replace_recursive($currentSettings, $inputSettings);

            // 2. Handle Art Files Uploads
            // Expecting: art_files[sport_slug][position_key] = File
            if ($request->file('art_files')) {
                foreach ($request->file('art_files') as $sportSlug => $positions) {
                    if (!is_array($positions))
                        continue;

                    foreach ($positions as $posKey => $file) {
                        if ($file) {
                            $filename = "bg_{$sportSlug}_{$posKey}_" . time() . '.' . $file->getClientOriginalExtension();
                            $path = $file->storeAs("clubs/{$club->id}/art", $filename, 'public');

                            // Initialize sport key if missed
                            if (!isset($currentSettings[$sportSlug])) {
                                $currentSettings[$sportSlug] = ['positions' => []];
                            }

                            // Update specific position URL
                            // We need to find the matching position in the array or create it
                            $found = false;
                            if (isset($currentSettings[$sportSlug]['positions'])) {
                                foreach ($currentSettings[$sportSlug]['positions'] as &$p) {
                                    if (($p['key'] ?? '') === $posKey) {
                                        $p['customFile'] = '/storage/' . $path;
                                        $found = true;
                                        break;
                                    }
                                }
                            } else {
                                $currentSettings[$sportSlug]['positions'] = [];
                            }

                            if (!$found) {
                                $currentSettings[$sportSlug]['positions'][] = [
                                    'key' => $posKey,
                                    'customFile' => '/storage/' . $path
                                ];
                            }
                        }
                    }
                }
            }

            $data['art_settings'] = $currentSettings;

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
