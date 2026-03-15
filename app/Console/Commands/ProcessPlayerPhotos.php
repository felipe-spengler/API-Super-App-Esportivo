<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class ProcessPlayerPhotos extends Command
{
    protected $signature = 'player:process-photos {userId} {--remove-bg=1}';
    protected $description = 'Process player photos (AI background removal) in the background';

    public function handle()
    {
        $userId = $this->argument('userId');
        $user = User::find($userId);

        if (!$user) {
            Log::error("ProcessPlayerPhotos: User {$userId} not found.");
            return;
        }

        Log::info("ProcessPlayerPhotos: Starting for User {$userId} ({$user->name})");

        $photosArray = $user->photos ?? [];
        $photoPath = $user->photo_path;
        $updated = false;

        foreach ($photosArray as $index => $pPath) {
            if (!$this->option('remove-bg'))
                continue;

            // Skip if already processed or not a path we want to process
            if (str_contains($pPath, '_nobg.png'))
                continue;
            if (empty($pPath))
                continue;

            try {
                $inputAbsPath = storage_path('app/public/' . $pPath);
                $filenameNobg = pathinfo($pPath, PATHINFO_FILENAME) . '_nobg.png';
                $outputAbsPath = storage_path('app/public/players/photos/' . $filenameNobg);
                $scriptPath = base_path('scripts/remove_bg.py');
                $cacheDir = storage_path('app/public/.u2net');

                if (!file_exists($cacheDir)) {
                    @mkdir($cacheDir, 0775, true);
                }

                $pythonBin = null;
                $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
                $candidates = $isWindows
                    ? ['python', 'python3', 'py']
                    : ['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3'];

                foreach ($candidates as $candidate) {
                    $testOut = [];
                    $testRet = -1;
                    $cmdTest = $isWindows ? "{$candidate} --version" : "{$candidate} --version 2>&1";
                    @exec($cmdTest, $testOut, $testRet);
                    if ($testRet === 0) {
                        $pythonBin = $candidate;
                        break;
                    }
                }

                if ($pythonBin) {
                    if ($isWindows) {
                        $command = "set U2NET_HOME={$cacheDir} && set NUMBA_CACHE_DIR={$cacheDir} && {$pythonBin} \"{$scriptPath}\" \"{$inputAbsPath}\" \"{$outputAbsPath}\" 2>&1";
                    } else {
                        $command = "export U2NET_HOME={$cacheDir} && export NUMBA_CACHE_DIR={$cacheDir} && {$pythonBin} \"{$scriptPath}\" \"{$inputAbsPath}\" \"{$outputAbsPath}\" 2>&1";
                    }

                    Log::info("ProcessPlayerPhotos: Running for index {$index}: " . $command);
                    exec($command, $output, $returnVar);

                    if ($returnVar === 0 && file_exists($outputAbsPath)) {
                        @chmod($outputAbsPath, 0664);
                        $newPath = 'players/photos/' . $filenameNobg;

                        $photosArray[$index] = $newPath;
                        if ($index === 0) {
                            $user->photo_path = $newPath;
                        }
                        $updated = true;
                        Log::info("ProcessPlayerPhotos: Success for index {$index}");
                    } else {
                        Log::warning("ProcessPlayerPhotos: Failed for index {$index} with code {$returnVar}. Output: " . implode("\n", $output));
                    }
                }
            } catch (\Throwable $e) {
                Log::error("ProcessPlayerPhotos: Exception on index {$index}: " . $e->getMessage());
            }
        }

        if ($updated) {
            // Antes de salvar o array atualizado com as fotos _nobg, 
            // garantimos que a original (sem nobg) esteja em photo_path_original
            if (!$user->photo_path_original && $photoPath && !str_contains($photoPath, '_nobg')) {
                $user->photo_path_original = $photoPath;
            }

            $user->photos = $photosArray;
            $user->save();
            Log::info("ProcessPlayerPhotos: User record updated for {$userId}");
        }
    }
}
