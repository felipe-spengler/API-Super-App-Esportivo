<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\Team;
use App\Models\User;
use App\Models\Championship;

class ImageUploadController extends Controller
{
    /**
     * Upload de logo de equipe
     */
    public function uploadTeamLogo(Request $request, $teamId)
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        $team = Team::findOrFail($teamId);

        // Verifica permissão de clube
        $user = $request->user();
        if ($user->club_id !== null && $team->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar esta equipe.'
            ], 403);
        }

        // Remove logo antigo se existir
        if ($team->logo && Storage::disk('public')->exists($team->logo)) {
            Storage::disk('public')->delete($team->logo);
        }

        // Salva novo logo
        $file = $request->file('logo');
        $filename = 'teams/' . Str::slug($team->name) . '-' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('teams', $filename, 'public');

        // Atualiza no banco
        $team->logo = $path;
        $team->save();

        return response()->json([
            'message' => 'Logo atualizado com sucesso!',
            'logo_url' => Storage::url($path),
            'logo_path' => $path
        ]);
    }

    /**
     * Upload de foto de jogador
     */
    public function uploadPlayerPhoto(Request $request, $playerId)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        $player = User::findOrFail($playerId);

        // Verifica permissão de clube
        $user = $request->user();
        if ($user->club_id !== null && $player->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este jogador.'
            ], 403);
        }

        // Remove foto antiga se existir
        if ($player->photo && Storage::disk('public')->exists($player->photo)) {
            Storage::disk('public')->delete($player->photo);
        }

        // Salva nova foto
        $file = $request->file('photo');
        $filename = 'players/' . Str::slug($player->name) . '-' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('players', $filename, 'public'); // Retorna players/nome.jpg

        $responseData = [
            'message' => 'Foto atualizada com sucesso!',
            'photo_url' => Storage::url($path),
            'photo_path' => $path
        ];

        // PROCESSAMENTO DE IA: REMOVER FUNDO
        if ($request->boolean('remove_bg')) {
            try {
                // Caminhos absolutos para o script Python
                $inputAbsPath = storage_path('app/public/' . $path);
                $filenameNobg = str_replace('.', '_nobg.', $filename);
                // Força PNG para suportar transparência
                $filenameNobg = preg_replace('/\.(jpg|jpeg)$/i', '.png', $filenameNobg);

                $outputAbsPath = storage_path('app/public/' . $filenameNobg); // Caminho absoluto para o output

                // Script em: backend/scripts/remove_bg.py
                $scriptPath = base_path('scripts/remove_bg.py');

                // Executa comando (python precisa estar no PATH do servidor)
                $command = "python \"{$scriptPath}\" \"{$inputAbsPath}\" \"{$outputAbsPath}\"";

                // Logging para debug
                // \Log::info("Executando remove_bg: $command");

                $output = [];
                $returnVar = 0;
                exec($command, $output, $returnVar);

                if ($returnVar === 0 && file_exists($outputAbsPath)) {
                    // Atualiza no banco o campo de foto sem fundo (se existir)
                    // $player->photo_nobg = $filenameNobg; 

                    $responseData['photo_nobg_url'] = Storage::url($filenameNobg);
                    $responseData['photo_nobg_path'] = $filenameNobg;
                    $responseData['ai_processed'] = true;
                } else {
                    $responseData['ai_error'] = 'Falha ao processar IA. Código: ' . $returnVar;
                    $responseData['ai_output'] = $output;
                }
            } catch (\Exception $e) {
                $responseData['ai_error'] = $e->getMessage();
            }
        }

        // Atualiza no banco
        $player->photo = $path;
        $player->save();

        return response()->json($responseData);
    }

    /**
     * Upload de logo de campeonato
     */
    public function uploadChampionshipLogo(Request $request, $championshipId)
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        $championship = Championship::findOrFail($championshipId);

        // Verifica permissão de clube
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        // Remove logo antigo se existir
        if ($championship->logo_url && !str_starts_with($championship->logo_url, 'http')) {
            if (Storage::disk('public')->exists($championship->logo_url)) {
                Storage::disk('public')->delete($championship->logo_url);
            }
        }

        // Salva novo logo
        $file = $request->file('logo');
        $filename = 'championships/logo-' . $championship->id . '-' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('championships', $filename, 'public');

        // Atualiza no banco (salvamos o path relativo para facilitar manipulação de arquivos)
        $championship->logo_url = $path;
        $championship->save();

        return response()->json([
            'message' => 'Logo atualizado com sucesso!',
            'logo_url' => Storage::url($path),
            'logo_path' => $path
        ]);
    }

    /**
     * Upload de capa de campeonato
     */
    public function uploadChampionshipBanner(Request $request, $championshipId)
    {
        $request->validate([
            'banner' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:5120',
        ]);

        $championship = Championship::findOrFail($championshipId);

        // Verifica permissão de clube
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        // Remove banner antigo se existir
        if ($championship->cover_image_url && !str_starts_with($championship->cover_image_url, 'http')) {
            if (Storage::disk('public')->exists($championship->cover_image_url)) {
                Storage::disk('public')->delete($championship->cover_image_url);
            }
        }

        // Salva novo banner
        $file = $request->file('banner');
        $filename = 'championships/banner-' . $championship->id . '-' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('championships', $filename, 'public');

        // Atualiza no banco
        $championship->cover_image_url = $path;
        $championship->save();

        return response()->json([
            'message' => 'Capa atualizada com sucesso!',
            'banner_url' => Storage::url($path),
            'banner_path' => $path
        ]);
    }

    /**
     * Upload de foto para premiação/arte
     */
    public function uploadAwardPhoto(Request $request)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg|max:3072',
            'type' => 'required|string|in:mvp,artilheiro,goleiro,destaque,custom',
        ]);

        $type = $request->input('type');
        $file = $request->file('photo');

        $filename = 'awards/' . $type . '-' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('awards', $filename, 'public');

        return response()->json([
            'message' => 'Foto enviada com sucesso!',
            'photo_url' => Storage::url($path),
            'photo_path' => $path
        ]);
    }

    /**
     * Upload genérico de imagem
     */
    public function uploadGeneric(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:5120',
            'folder' => 'nullable|string',
        ]);

        $folder = $request->input('folder', 'uploads');
        $file = $request->file('image');

        $filename = $folder . '/' . Str::random(20) . '-' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs($folder, basename($filename), 'public');

        return response()->json([
            'message' => 'Imagem enviada com sucesso!',
            'url' => Storage::url($path),
            'path' => $path
        ]);
    }

    /**
     * Deletar imagem
     */
    public function deleteImage(Request $request)
    {
        $request->validate([
            'path' => 'required|string',
        ]);

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
    }
    /**
     * Listar imagens de uma pasta
     */
    public function listImages(Request $request)
    {
        $folder = $request->input('folder', 'uploads');

        // Proteção simples para evitar navegar pastas do sistema
        if (str_contains($folder, '..')) {
            return response()->json(['message' => 'Caminho inválido.'], 400);
        }

        $files = Storage::disk('public')->files($folder);
        $images = [];

        foreach ($files as $file) {
            $images[] = [
                'name' => basename($file),
                'path' => $file,
                'url' => Storage::url($file),
                'size' => Storage::disk('public')->size($file),
                'last_modified' => Storage::disk('public')->lastModified($file)
            ];
        }

        return response()->json($images);
    }
}
