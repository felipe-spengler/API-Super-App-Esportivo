<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Championship;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    /**
     * Upload de logo de equipe
     */
    public function uploadTeamLogo(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        try {
            $image = $request->file('image');
            $filename = 'team_' . time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();

            // Salva na pasta public/storage/teams
            $path = $image->storeAs('teams', $filename, 'public');

            return response()->json([
                'message' => 'Logo enviado com sucesso!',
                'path' => $path,
                'url' => Storage::url($path)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao fazer upload do logo.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload de foto de jogador
     */
    public function uploadPlayerPhoto(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        try {
            $image = $request->file('image');
            $filename = 'player_' . time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();

            // Salva na pasta public/storage/players
            $path = $image->storeAs('players', $filename, 'public');

            return response()->json([
                'message' => 'Foto enviada com sucesso!',
                'path' => $path,
                'url' => Storage::url($path)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao fazer upload da foto.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload de logo de campeonato (1:1)
     * Organizado em: championships/{championship_id}/logo.ext
     */
    public function uploadChampionshipLogo(Request $request, $championshipId)
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:5120', // 5MB
        ]);

        try {
            $championship = Championship::findOrFail($championshipId);
            $image = $request->file('logo');
            $extension = $image->getClientOriginalExtension();
            $filename = 'logo.' . $extension;

            // Remove logo anterior se existir
            if ($championship->logo_url) {
                $oldPath = str_replace('/storage/', '', parse_url($championship->logo_url, PHP_URL_PATH));
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            // Salva em: storage/app/public/championships/{id}/logo.ext
            $path = $image->storeAs("championships/{$championshipId}", $filename, 'public');
            $url = Storage::url($path);

            // Atualiza o banco de dados
            $championship->logo_url = $url;
            $championship->save();

            return response()->json([
                'message' => 'Logo do campeonato atualizado com sucesso!',
                'logo_url' => $url
            ]);
        } catch (\Exception $e) {
            \Log::error('Error uploading championship logo: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erro ao fazer upload do logo.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload de banner/capa de campeonato (16:9)
     * Organizado em: championships/{championship_id}/banner.ext
     */
    public function uploadChampionshipBanner(Request $request, $championshipId)
    {
        $request->validate([
            'banner' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:5120', // 5MB
        ]);

        try {
            $championship = Championship::findOrFail($championshipId);
            $image = $request->file('banner');
            $extension = $image->getClientOriginalExtension();
            $filename = 'banner.' . $extension;

            // Remove banner anterior se existir
            if ($championship->cover_image_url) {
                $oldPath = str_replace('/storage/', '', parse_url($championship->cover_image_url, PHP_URL_PATH));
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            // Salva em: storage/app/public/championships/{id}/banner.ext
            $path = $image->storeAs("championships/{$championshipId}", $filename, 'public');
            $url = Storage::url($path);

            // Atualiza o banco de dados
            $championship->cover_image_url = $url;
            $championship->save();

            return response()->json([
                'message' => 'Banner do campeonato atualizado com sucesso!',
                'banner_url' => $url,
                'cover_image_url' => $url // Para compatibilidade
            ]);
        } catch (\Exception $e) {
            \Log::error('Error uploading championship banner: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erro ao fazer upload do banner.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload de imagem de campeonato (método genérico - manter por compatibilidade)
     */
    public function uploadChampionshipImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        try {
            $image = $request->file('image');
            $filename = 'championship_' . time() . '_' . Str::random(10) . '.' . $image->getClientOriginalExtension();

            // Salva na pasta public/storage/championships
            $path = $image->storeAs('championships', $filename, 'public');

            return response()->json([
                'message' => 'Imagem enviada com sucesso!',
                'path' => $path,
                'url' => Storage::url($path)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao fazer upload da imagem.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Deletar imagem
     */
    public function deleteImage(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
        ]);

        try {
            $path = $request->input('path');

            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);

                return response()->json([
                    'message' => 'Imagem deletada com sucesso!'
                ]);
            }

            return response()->json([
                'message' => 'Imagem não encontrada.'
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erro ao deletar imagem.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
