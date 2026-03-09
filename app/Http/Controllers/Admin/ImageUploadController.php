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
                'logo' => 'required|image|mimes:jpeg,png,jpg|max:4096', // Max 4MB
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
                'index' => 'nullable|integer|min:0|max:2', // Validar índice (0, 1, 2)
            ]);

            // Aumenta o tempo de execução para evitar timeout durante o processamento da IA
            set_time_limit(300);

            $player = User::findOrFail($playerId);

            // Verifica permissão de clube
            // Verifica permissão de clube
            $user = $request->user();
            if ($user->club_id !== null && $player->club_id !== $user->club_id && $user->id !== $player->id) {
                // Se o player não tem clube, verifica se pertence a algum time do clube do admin
                $belongsToClubTeam = false;
                if ($player->club_id === null) {
                    $belongsToClubTeam = $player->teamsAsPlayer()->where('club_id', $user->club_id)->exists();
                }

                if (!$belongsToClubTeam) {
                    return response()->json([
                        'message' => 'Você não tem permissão para editar este jogador.'
                    ], 403);
                }
            }

            // Recupera fotos atuais
            $currentPhotos = $player->photos ?? [];
            if (!is_array($currentPhotos)) {
                $currentPhotos = [];
                // Migração de legado: se existir photo_path mas não array, adiciona como primeira
                if ($player->photo_path) {
                    $currentPhotos[] = $player->photo_path;
                }
            }

            $index = $request->input('index');

            // Lógica de índice
            if ($index === null) {
                // Se não informado, tenta adicionar. Se cheio, substitui a principal (0)
                if (count($currentPhotos) < 3) {
                    $index = count($currentPhotos);
                } else {
                    $index = 0;
                }
            }

            // Remove foto antiga SE estiver substituindo
            if (isset($currentPhotos[$index])) {
                $oldPath = $currentPhotos[$index];
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            // Salva nova foto
            $file = $request->file('photo');
            $filename = Str::slug($player->name) . '-' . time() . '-' . $index . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('players', $filename, 'public');

            $responseData = [
                'message' => 'Foto atualizada com sucesso!',
                'photo_url' => url('api/storage/' . $path),
                'photo_path' => $path,
                'index' => $index
            ];

            // Atualiza array de fotos
            $currentPhotos[$index] = $path;

            // Reindexa array para garantir consistência (opcional, mas bom para JSON)
            $currentPhotos = array_values($currentPhotos);

            $player->photos = $currentPhotos;

            // Mantém compatibilidade com photo_path (sempre a primeira foto)
            $player->photo_path = $currentPhotos[0] ?? null;

            $player->save();

            // TRIGGER BACKGROUND AI PROCESSING
            if ($request->boolean('remove_bg')) {
                try {
                    $userId = $player->id;
                    $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';

                    $php = PHP_BINARY;
                    $artisan = base_path('artisan');
                    $cmd = "{$php} {$artisan} player:process-photos {$userId}";

                    \Log::info("ImageUploadController Background - Triggering AI for User {$userId}. Cmd: {$cmd}");

                    if ($isWindows) {
                        pclose(popen("start /B " . $cmd, "r"));
                    } else {
                        exec("nohup {$cmd} > /dev/null 2>/dev/null &");
                    }
                } catch (\Throwable $e) {
                    \Log::error("ImageUploadController Background Error: " . $e->getMessage());
                }
            }

            \Log::info("ImageUploadController - Success response for player {$playerId}");

            $responseData['photos'] = $currentPhotos;

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
                // Check if exec() is available
                if (!function_exists('exec')) {
                    throw new \RuntimeException('exec() esta desabilitado.');
                }

                $inputAbsPath = storage_path('app/public/' . $path);
                // Always output as PNG
                $filenameNobg = pathinfo($filename, PATHINFO_FILENAME) . '_nobg.png';
                $outputAbsPath = storage_path('app/public/test/' . $filenameNobg);

                // Script Python
                $scriptPath = base_path('scripts/remove_bg.py');

                // Determine which python binary is available
                $pythonBin = null;
                foreach (['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3'] as $candidate) {
                    $testOut = [];
                    $testRet = -1;
                    @exec("{$candidate} --version 2>&1", $testOut, $testRet);
                    if ($testRet === 0) {
                        $pythonBin = $candidate;
                        break;
                    }
                }

                if (!$pythonBin) {
                    throw new \RuntimeException('Python nao encontrado.');
                }

                // Command with variables
                $cacheDir = storage_path('app/public/.u2net');
                if (!file_exists($cacheDir))
                    @mkdir($cacheDir, 0775, true);

                $command = "export U2NET_HOME={$cacheDir} && export NUMBA_CACHE_DIR={$cacheDir} && {$pythonBin} \"{$scriptPath}\" \"{$inputAbsPath}\" \"{$outputAbsPath}\" 2>&1";

                \Log::info("Lab AI Test - Command: " . $command);

                $output = [];
                $returnVar = 0;
                $startTime = microtime(true);

                exec($command, $output, $returnVar);

                $endTime = microtime(true);
                $processingTime = round($endTime - $startTime, 2);

                if ($returnVar === 0 && file_exists($outputAbsPath)) {
                    // Sucesso
                    $pathNobg = 'test/' . $filenameNobg;

                    $responseData['photo_nobg_url'] = url('api/storage/' . $pathNobg);
                    $responseData['photo_nobg_path'] = $pathNobg;
                    $responseData['ai_processed'] = true;
                    $responseData['processing_time'] = $processingTime . 's';
                    $responseData['original_size'] = @filesize($inputAbsPath);
                    $responseData['processed_size'] = @filesize($outputAbsPath);
                } else {
                    \Log::error("Lab AI Test - Failed: " . json_encode($output));
                    $responseData['ai_error'] = 'Falha ao processar IA. Código: ' . $returnVar;
                    $responseData['ai_output'] = $output;
                    $responseData['command'] = $command;
                }
            } catch (\Throwable $e) {
                $responseData['ai_error'] = 'Erro: ' . $e->getMessage();
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
                $photoRequest->merge($request->all());
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
    /**
     * Diagnóstico do ambiente de IA (exec, python, rembg)
     * Acessível em GET /admin/test-ai-env
     */
    public function testAiEnv()
    {
        $result = [];

        // 1. exec() disponível?
        $result['exec_available'] = function_exists('exec');

        // 2. PHP disable_functions
        $result['php_disable_functions'] = ini_get('disable_functions') ?: '(nenhuma)';

        // 3. Script path
        $scriptPath = base_path('scripts/remove_bg.py');
        $result['script_path'] = $scriptPath;
        $result['script_exists'] = file_exists($scriptPath);

        // 4. Storage writable?
        $storageDir = storage_path('app/public/players');
        $result['storage_dir'] = $storageDir;
        $result['storage_writable'] = is_writable(storage_path('app/public'));

        if (!function_exists('exec')) {
            $result['python_found'] = false;
            $result['python_error'] = 'exec() está desabilitado — impossível rodar Python.';
            return response()->json($result);
        }

        // 5. Qual Python está disponível?
        $pythonBin = null;
        foreach (['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3'] as $candidate) {
            $out = [];
            $ret = -1;
            @exec("{$candidate} --version 2>&1", $out, $ret);
            $result['python_test'][$candidate] = [
                'exit_code' => $ret,
                'output' => implode(' ', $out),
            ];
            if ($ret === 0 && !$pythonBin) {
                $pythonBin = $candidate;
            }
        }

        $result['python_bin'] = $pythonBin;
        $result['python_found'] = !!$pythonBin;

        if ($pythonBin) {
            // 6. rembg instalado?
            $out = [];
            $ret = -1;
            @exec("{$pythonBin} -c \"import rembg; print('rembg ok')\" 2>&1", $out, $ret);
            $result['rembg_installed'] = ($ret === 0);
            $result['rembg_check_output'] = implode(' ', $out);

            // 7. PIL instalado?
            $out2 = [];
            $ret2 = -1;
            @exec("{$pythonBin} -c \"from PIL import Image; print('PIL ok')\" 2>&1", $out2, $ret2);
            $result['pillow_installed'] = ($ret2 === 0);
            $result['pillow_check_output'] = implode(' ', $out2);
        }

        return response()->json($result);
    }
}
