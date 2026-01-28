<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
     * Upload de imagem de campeonato
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
