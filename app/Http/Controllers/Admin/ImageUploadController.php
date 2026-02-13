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
        try {
            $request->validate([
                'logo' => 'required|image|mimes:jpeg,png,jpg|max:2048',
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
            // Verifica logo_path (preferencial) ou tenta inferir do logo_url
            if (!empty($team->logo_path) && Storage::disk('public')->exists($team->logo_path)) {
                Storage::disk('public')->delete($team->logo_path);
            } elseif (!empty($team->logo_url)) {
                $oldPath = str_replace('/storage/', '', parse_url($team->logo_url, PHP_URL_PATH));
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            // Salva novo logo
            $file = $request->file('logo');
            // Fix: Don't add 'teams/' prefix here, storeAs adds it based on first arg
            $filename = Str::slug($team->name) . '-' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('teams', $filename, 'public');

            // Atualiza no banco usando as colunas corretas
            $team->logo_url = '/storage/' . $path; // Force relative path
            $team->logo_path = $path;

            // Remove a atribuição incorreta '$team->logo' que causava erro se a coluna não existisse
            // $team->logo = $path; 

            $team->save();

            return response()->json([
                'message' => 'Logo atualizado com sucesso!',
                'logo_url' => $team->logo_url,
                'logo_path' => $team->logo_path
            ]);
        } catch (\Exception $e) {
            \Log::error("Upload Team Logo Error: " . $e->getMessage());
            // Retorna a mensagem de erro detalhada para facilitar o debug do usuário
            return response()->json(['message' => 'Erro ao fazer upload do logo: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Upload de foto de jogador
     */
    public function uploadPlayerPhoto(Request $request, $playerId)
    {
        try {
            $request->validate([
                'photo' => 'required|image|mimes:jpeg,png,jpg|max:4096',
            ]);

            // Aumenta o tempo de execução para evitar timeout durante o processamento da IA (rembg pode demorar no 1º uso)
            set_time_limit(300);

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
            $filename = Str::slug($player->name) . '-' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('players', $filename, 'public'); // Retorna players/nome.jpg

            $responseData = [
                'message' => 'Foto atualizada com sucesso!',
                'photo_url' => '/storage/' . $path,
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

                    $outputAbsPath = storage_path('app/public/players/' . $filenameNobg); // Caminho absoluto para o output

                    // Script em: backend/scripts/remove_bg.py
                    $scriptPath = base_path('scripts/remove_bg.py');

                    // Executa comando (python precisa estar no PATH do servidor)
                    $command = "python \"{$scriptPath}\" \"{$inputAbsPath}\" \"{$outputAbsPath}\"";

                    \Log::info("Lab AI - Command: " . $command);

                    $output = [];
                    $returnVar = 0;
                    exec($command, $output, $returnVar);

                    \Log::info("Lab AI - Output: " . json_encode($output));
                    \Log::info("Lab AI - Return: " . $returnVar);

                    if ($returnVar === 0 && file_exists($outputAbsPath)) {
                        // Se sucesso, atualiza o path principal para a versão sem fundo
                        $path = 'players/' . $filenameNobg;

                        $responseData['photo_nobg_url'] = '/storage/' . $path;
                        $responseData['photo_nobg_path'] = $path;
                        $responseData['ai_processed'] = true;
                    } else {
                        \Log::error("Lab AI - Failed: " . json_encode($output));
                        $responseData['ai_error'] = 'Falha ao processar IA. Código: ' . $returnVar;
                        $responseData['ai_output'] = $output;
                    }
                } catch (\Exception $e) {
                    \Log::error("Lab AI - Exception: " . $e->getMessage());
                    $responseData['ai_error'] = $e->getMessage();
                }
            }

            // Atualiza no banco
            $player->photo_path = $path;
            $player->save();

            return response()->json($responseData);
        } catch (\Exception $e) {
            \Log::error("Upload Player Photo Error: " . $e->getMessage());
            return response()->json(['message' => 'Erro ao fazer upload da foto.'], 500);
        }
    }

    /**
     * Upload de logo de campeonato
     */
    public function uploadChampionshipLogo(Request $request, $championshipId)
    {
        try {
            $request->validate([
                'logo' => 'required|image|mimes:jpeg,png,jpg|max:5120', // 5MB
            ]);

            $championship = Championship::findOrFail($championshipId);

            // Verifica permissão de clube
            $user = $request->user();
            if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
                return response()->json([
                    'message' => 'Você não tem permissão para editar este campeonato.'
                ], 403);
            }

            // Remove logo antigo se existir (extraindo path do URL)
            if ($championship->logo_url) {
                $oldPath = str_replace('/storage/', '', parse_url($championship->logo_url, PHP_URL_PATH));
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            // Salva novo logo em pasta organizada: championships/{id}/logo.ext
            $file = $request->file('logo');
            $extension = $file->getClientOriginalExtension();
            $filename = 'logo.' . $extension;
            $path = $file->storeAs("championships/{$championshipId}", $filename, 'public');
            $url = '/storage/' . $path;

            // Atualiza no banco com URL completo
            $championship->logo_url = $url;
            $championship->save();

            return response()->json([
                'message' => 'Logo atualizado com sucesso!',
                'logo_url' => $url
            ]);
        } catch (\Exception $e) {
            \Log::error("Upload Champ Logo Error: " . $e->getMessage());
            return response()->json(['message' => 'Erro ao fazer upload do logo.'], 500);
        }
    }

    /**
     * Upload de capa de campeonato
     */
    public function uploadChampionshipBanner(Request $request, $championshipId)
    {
        $request->validate([
            'banner' => 'required|image|mimes:jpeg,png,jpg|max:5120', // 5MB
        ]);

        $championship = Championship::findOrFail($championshipId);

        // Verifica permissão de clube
        $user = $request->user();
        if ($user->club_id !== null && $championship->club_id !== $user->club_id) {
            return response()->json([
                'message' => 'Você não tem permissão para editar este campeonato.'
            ], 403);
        }

        // Remove banner antigo se existir (extraindo path do URL)
        if ($championship->cover_image_url) {
            $oldPath = str_replace('/storage/', '', parse_url($championship->cover_image_url, PHP_URL_PATH));
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        // Salva novo banner em pasta organizada: championships/{id}/banner.ext
        $file = $request->file('banner');
        $extension = $file->getClientOriginalExtension();
        $filename = 'banner.' . $extension;
        $path = $file->storeAs("championships/{$championshipId}", $filename, 'public');
        $url = '/storage/' . $path;

        // Atualiza no banco com URL completo
        $championship->cover_image_url = $url;
        $championship->save();

        return response()->json([
            'message' => 'Capa atualizada com sucesso!',
            'banner_url' => $url,
            'cover_image_url' => $url // Compatibilidade
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
            'photo_url' => '/storage/' . $path,
            'photo_path' => $path
        ]);
    }

    /**
     * Upload genérico de imagem
     */
    public function uploadGeneric(Request $request)
    {
        try {
            $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg|max:5120',
                'folder' => 'nullable|string',
            ]);

            $folder = $request->input('folder', 'uploads');
            $file = $request->file('image');

            // Prevent path traversal
            if (str_contains($folder, '..')) {
                throw new \Exception("Invalid folder path");
            }

            $filename = $folder . '/' . Str::random(20) . '-' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs($folder, basename($filename), 'public');

            return response()->json([
                'message' => 'Imagem enviada com sucesso!',
                'url' => '/storage/' . $path,
                'path' => $path
            ]);
        } catch (\Exception $e) {
            \Log::error("Upload Generic Error: " . $e->getMessage());
            return response()->json(['message' => 'Erro ao fazer upload da imagem: ' . $e->getMessage()], 500);
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
                'url' => '/storage/' . $file,
                'size' => Storage::disk('public')->size($file),
                'last_modified' => Storage::disk('public')->lastModified($file)
            ];
        }

        return response()->json($images);
    }
    /**
     * Upload de foto do próprio perfil (Authenticated User)
     */
    public function uploadMyPhoto(Request $request)
    {
        $user = $request->user();
        return $this->uploadPlayerPhoto($request, $user->id);
    }

    /**
     * 🧪 MÉTODO DE TESTE - Remover fundo de imagem sem autenticação
     * Para testar a qualidade do rembg com diferentes tipos de fotos
     */
    public function testRemoveBg(Request $request)
    {
        try {
            $request->validate([
                'photo' => 'required|image|mimes:jpeg,png,jpg|max:4096',
            ]);

            // Aumenta o tempo de execução para evitar timeout
            set_time_limit(300);

            $file = $request->file('photo');
            $filename = 'test-' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('test', $filename, 'public');

            $responseData = [
                'message' => 'Foto enviada com sucesso!',
                'photo_url' => Storage::url($path),
                'photo_path' => $path
            ];

            // PROCESSAMENTO DE IA: REMOVER FUNDO
            try {
                // Caminhos absolutos
                $inputAbsPath = storage_path('app/public/' . $path);
                $filenameNobg = str_replace('.', '_nobg.', $filename);
                // Força PNG para suportar transparência
                $filenameNobg = preg_replace('/\.(jpg|jpeg)$/i', '.png', $filenameNobg);

                $outputAbsPath = storage_path('app/public/test/' . $filenameNobg);

                // Script Python
                $scriptPath = base_path('scripts/remove_bg.py');

                // Executa comando
                $command = "python \"{$scriptPath}\" \"{$inputAbsPath}\" \"{$outputAbsPath}\"";

                \Log::info("Lab AI Test - Command: " . $command);

                $output = [];
                $returnVar = 0;
                $startTime = microtime(true);

                exec($command, $output, $returnVar);

                \Log::info("Lab AI Test - Output: " . json_encode($output));
                \Log::info("Lab AI Test - Return: " . $returnVar);

                $endTime = microtime(true);
                $processingTime = round($endTime - $startTime, 2);

                if ($returnVar === 0 && file_exists($outputAbsPath)) {
                    // Sucesso
                    $pathNobg = 'test/' . $filenameNobg;

                    $responseData['photo_nobg_url'] = Storage::url($pathNobg);
                    $responseData['photo_nobg_path'] = $pathNobg;
                    $responseData['ai_processed'] = true;
                    $responseData['processing_time'] = $processingTime . 's';
                    $responseData['original_size'] = filesize($inputAbsPath);
                    $responseData['processed_size'] = filesize($outputAbsPath);
                } else {
                    \Log::error("Lab AI Test - Failed: " . json_encode($output));
                    $responseData['ai_error'] = 'Falha ao processar IA. Código: ' . $returnVar;
                    $responseData['ai_output'] = $output;
                    $responseData['command'] = $command;
                }
            } catch (\Exception $e) {
                \Log::error("Lab AI Test - Exception: " . $e->getMessage());
                $responseData['ai_error'] = $e->getMessage();
            }

            return response()->json($responseData);
        } catch (\Exception $e) {
            \Log::error("Test Remove BG Error: " . $e->getMessage());
            return response()->json([
                'message' => 'Erro ao processar imagem: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload unificado de imagem (player, team, championship)
     */
    public function uploadImage(Request $request)
    {
        try {
            $request->validate([
                'file' => 'required|image|mimes:jpeg,png,jpg|max:4096',
                'type' => 'required|string|in:player,team,championship',
                'id' => 'required|integer',
            ]);

            $type = $request->input('type');
            $id = $request->input('id');

            // Redireciona para o método específico
            if ($type === 'player') {
                // Cria um novo request com o campo 'photo' esperado
                $photoRequest = new Request();
                $photoRequest->files->set('photo', $request->file('file'));
                $photoRequest->setUserResolver($request->getUserResolver());

                return $this->uploadPlayerPhoto($photoRequest, $id);
            } elseif ($type === 'team') {
                // Cria um novo request com o campo 'logo' esperado
                $logoRequest = new Request();
                $logoRequest->files->set('logo', $request->file('file'));
                $logoRequest->setUserResolver($request->getUserResolver());

                return $this->uploadTeamLogo($logoRequest, $id);
            } elseif ($type === 'championship') {
                // Cria um novo request com o campo 'logo' esperado
                $logoRequest = new Request();
                $logoRequest->files->set('logo', $request->file('file'));
                $logoRequest->setUserResolver($request->getUserResolver());

                return $this->uploadChampionshipLogo($logoRequest, $id);
            }

            return response()->json(['message' => 'Tipo inválido'], 400);
        } catch (\Exception $e) {
            \Log::error("Upload Image Error: " . $e->getMessage());
            return response()->json(['message' => 'Erro ao fazer upload: ' . $e->getMessage()], 500);
        }
    }
}
