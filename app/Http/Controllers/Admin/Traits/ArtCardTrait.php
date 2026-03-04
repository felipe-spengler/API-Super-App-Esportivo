<?php

namespace App\Http\Controllers\Admin\Traits;

use Illuminate\Support\Str;

/**
 * ArtCardTrait
 * Geração de cards de jogadores (Craque do Jogo, Awards, etc.)
 */
trait ArtCardTrait
{
    private function getTeamLogoPath($team)
    {
        if (!$team || !$team->logo_path)
            return null;

        $possiblePaths = [
            storage_path('app/public/' . $team->logo_path),
            public_path('storage/' . $team->logo_path),
            public_path('brasoes/' . basename($team->logo_path))
        ];

        foreach ($possiblePaths as $p) {
            if (file_exists($p))
                return $p;
        }
        return null;
    }

    private function loadClubResources($club)
    {
        if (!$club)
            return;

        if ($club->primary_font) {
            $fontName = $club->primary_font;
            $candidate = public_path('assets/fonts/' . $fontName);
            if (file_exists($candidate)) {
                $this->fontPath = $candidate;
            } elseif (file_exists($candidate . '.ttf')) {
                $this->fontPath = $candidate . '.ttf';
            } else {
                $candidate = storage_path('app/public/' . $fontName);
                if (file_exists($candidate))
                    $this->fontPath = $candidate;
            }
        }

        if ($club->secondary_font) {
            $fontName = $club->secondary_font;
            $candidate = public_path('assets/fonts/' . $fontName);
            if (file_exists($candidate)) {
                $this->secondaryFontPath = $candidate;
            } elseif (file_exists($candidate . '.ttf')) {
                $this->secondaryFontPath = $candidate . '.ttf';
            } else {
                $candidate = storage_path('app/public/' . $fontName);
                if (file_exists($candidate))
                    $this->secondaryFontPath = $candidate;
            }
        } else {
            $this->secondaryFontPath = $this->fontPath;
        }
    }

    /**
     * Sempre roda rembg e retorna o caminho da imagem processada (ou original como fallback)
     */
    private function runRembgAndGetPath($originalAbsPath, $processedFilename)
    {
        $outputAbsPath = storage_path('app/public/players/' . $processedFilename);
        $photoPath = null;

        try {
            $scriptPath = base_path('scripts/remove_bg.py');
            $cacheDir = storage_path('app/public/.u2net');
            if (!file_exists($cacheDir))
                @mkdir($cacheDir, 0775, true);

            $pythonBin = null;
            foreach (['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3'] as $bin) {
                $out = [];
                $ret = -1;
                @exec("{$bin} --version 2>&1", $out, $ret);
                if ($ret === 0) {
                    $pythonBin = $bin;
                    break;
                }
            }

            if ($pythonBin && file_exists($scriptPath)) {
                $cmd = "export U2NET_HOME={$cacheDir} && export NUMBA_CACHE_DIR={$cacheDir} && {$pythonBin} \"{$scriptPath}\" \"{$originalAbsPath}\" \"{$outputAbsPath}\" 2>&1";
                \Log::info("[ArtCardTrait] Rodando rembg: {$cmd}");
                $cmdOut = [];
                $cmdRet = -1;
                exec($cmd, $cmdOut, $cmdRet);
                \Log::info("[ArtCardTrait] returnVar={$cmdRet} output=" . implode(' | ', $cmdOut));

                if ($cmdRet === 0 && file_exists($outputAbsPath)) {
                    $photoPath = $outputAbsPath;
                    \Log::info("[ArtCardTrait] rembg OK: {$photoPath}");
                } else {
                    \Log::error("[ArtCardTrait] rembg FALHOU: " . implode(' | ', $cmdOut));
                }
            } else {
                \Log::warning("[ArtCardTrait] Python nao encontrado ou script ausente.");
            }
        } catch (\Exception $e) {
            \Log::error("[ArtCardTrait] Excecao: " . $e->getMessage());
        }

        return $photoPath;
    }

    private function drawPlayerPhoto($img, $player)
    {
        if (!$player->photo_path)
            return;

        $originalAbsPath = null;
        foreach ([
            storage_path('app/public/' . $player->photo_path),
            public_path('storage/' . $player->photo_path),
        ] as $c) {
            if (file_exists($c)) {
                $originalAbsPath = $c;
                break;
            }
        }
        if (!$originalAbsPath)
            return;

        $processedFilename = pathinfo(basename($player->photo_path), PATHINFO_FILENAME) . '_processed.png';
        $photoPath = $this->runRembgAndGetPath($originalAbsPath, $processedFilename);

        if (!$photoPath) {
            $photoPath = $originalAbsPath;
            \Log::warning("[ArtCardTrait] Fallback: usando foto original.");
        }

        $photoInfo = @getimagesize($photoPath);
        if (!$photoInfo)
            return;

        $playerImg = null;
        $isPng = false;
        if ($photoInfo['mime'] == 'image/jpeg') {
            $playerImg = @imagecreatefromjpeg($photoPath);
        } elseif ($photoInfo['mime'] == 'image/png') {
            $playerImg = @imagecreatefrompng($photoPath);
            $isPng = true;
        }

        if ($playerImg) {
            $targetHeight = 800;
            $width = imagesx($img);
            $origW = imagesx($playerImg);
            $origH = imagesy($playerImg);
            $targetWidth = (int) round($targetHeight * ($origW / $origH));
            $xPos = (int) round(($width - $targetWidth) / 2);
            $yPos = 335;

            imagealphablending($img, true);
            imagecopyresampled($img, $playerImg, $xPos, $yPos, 0, 0, $targetWidth, $targetHeight, $origW, $origH);
            imagedestroy($playerImg);
        }
    }

    private function generatePlayerArt($player, $match, $category)
    {
        $championship = $match->championship;
        $club = $championship->club;
        $sport = strtolower($championship->sport->name ?? 'futebol');

        if ($club)
            $this->loadClubResources($club);

        return $this->createCard($player, $championship, $sport, $category, $match->round_name ?? ('Rodada ' . $match->round_number), $match, null, $club);
    }

    private function generateAwardCard($player, $championship, $team, $category, $club = null)
    {
        $sport = strtolower($championship->sport->name ?? 'futebol');

        if ($club)
            $this->loadClubResources($club);

        return $this->createCard($player, $championship, $sport, $category, null, null, $team, $club);
    }

    /**
     * Função Genérica de Criação de Card de Jogador
     */
    private function createCard($player, $championship, $sport, $category, $roundName = null, $match = null, $playerTeam = null, $club = null)
    {
        $templateKey = null;
        if (in_array($category, ['craque', 'mvp', 'melhor_jogador', 'melhor_quadra'])) {
            $templateKey = 'art_layout_mvp_vertical';
        }

        $bgFile = $this->getBackgroundFile($sport, $category, $club, $championship);
        $templateData = null;

        if ($templateKey && $championship && !empty($championship->art_settings['templates'][$templateKey])) {
            $templateData = $championship->art_settings['templates'][$templateKey];
        } elseif ($templateKey && $club && !empty($club->art_settings['templates'][$templateKey])) {
            $templateData = $club->art_settings['templates'][$templateKey];
        }

        if ($templateData && !empty($templateData['bg_url'])) {
            $customBg = $this->urlToPath($templateData['bg_url']);
            if (file_exists($customBg))
                $bgFile = $customBg;
        }

        $img = $this->initImage($bgFile);
        if (!$img)
            return response("Erro fundo: " . basename($bgFile), 500);

        $width = imagesx($img);

        // --- DYNAMIC RENDERING START ---
        if ($templateData) {
            $elements = $templateData['elements'];

            $name = !empty($player->nickname) ? $player->nickname : $player->name;
            $replacements = [
                '{JOGADOR}' => mb_strtoupper($name),
                '{CAMPEONATO}' => mb_strtoupper($championship->name),
                '{RODADA}' => $roundName ? mb_strtoupper($roundName) : '',
                'X' => 'X',
                '3' => '3',
                '1' => '1',
            ];

            if ($match) {
                $sH = $match->home_score ?? 0;
                $sA = $match->away_score ?? 0;
                $replacements['{PLACAR_CASA}'] = $sH;
                $replacements['{PLACAR_FORA}'] = $sA;
                $replacements['{PA}'] = $sH;
                $replacements['{PF}'] = $sA;
                $replacements['{PC}'] = $sH;
                $replacements['{PV}'] = $sA;
            }

            // Player Photo — SEMPRE roda rembg para garantir fundo removido
            $playerPhotoPath = null;
            if ($player->photo_path) {
                $originalPhotoCandidates = [
                    storage_path('app/public/' . $player->photo_path),
                    public_path('storage/' . $player->photo_path),
                ];
                $originalAbsPath = null;
                foreach ($originalPhotoCandidates as $c) {
                    if (file_exists($c)) {
                        $originalAbsPath = $c;
                        break;
                    }
                }

                if ($originalAbsPath) {
                    $processedFilename = pathinfo(basename($player->photo_path), PATHINFO_FILENAME) . '_processed.png';
                    $playerPhotoPath = $this->runRembgAndGetPath($originalAbsPath, $processedFilename);

                    if (!$playerPhotoPath) {
                        $playerPhotoPath = $originalAbsPath;
                        \Log::warning("[ArtCardTrait] template photo fallback: usando foto original.");
                    }
                }
            }
            $replacements['player_photo'] = $playerPhotoPath;

            if ($match) {
                $replacements['team_a'] = $this->getTeamLogoPath($match->homeTeam);
                $replacements['team_b'] = $this->getTeamLogoPath($match->awayTeam);
            } elseif ($playerTeam) {
                $replacements['team_logo'] = $this->getTeamLogoPath($playerTeam);
            }

            $this->renderDynamicElements($img, $elements, $replacements);
            return $this->outputImage($img, 'card_' . $category . '_' . $player->id);
        }
        // --- DYNAMIC RENDERING END ---

        // --- LEGACY RENDERING ---
        $primaryColorStr = $club->primary_color ?? '#FFB700';
        $secondaryColorStr = $club->secondary_color ?? '#FFFFFF';

        $pRGB = $this->hexToRgb($primaryColorStr);
        $sRGB = $this->hexToRgb($secondaryColorStr);

        $primaryColor = imagecolorallocate($img, $pRGB['r'], $pRGB['g'], $pRGB['b']);
        $secondaryColor = imagecolorallocate($img, $sRGB['r'], $sRGB['g'], $sRGB['b']);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);

        $drawText = function ($size, $y, $color, $text, $useSecFont) use ($img, $black) {
            $this->drawCenteredText($img, $size, $y + 4, $black, $text, $useSecFont);
            $this->drawCenteredText($img, $size, $y, $color, $text, $useSecFont);
        };

        // 2. Foto do Jogador
        $this->drawPlayerPhoto($img, $player);

        // 3. Textos Principais
        $rawName = !empty($player->nickname) ? $player->nickname : $player->name;
        $nameParts = explode(' ', trim($rawName));
        $finalName = $nameParts[0];
        $exceptions = ['da', 'de', 'do', 'das', 'dos', 'e'];

        if (isset($nameParts[1])) {
            $secondPart = strtolower($nameParts[1]);
            if (in_array($secondPart, $exceptions) && isset($nameParts[2])) {
                $finalName .= ' ' . $nameParts[1] . ' ' . $nameParts[2];
            } else {
                $finalName .= ' ' . $nameParts[1];
            }
        }

        $playerName = mb_strtoupper($finalName);
        $drawText(75, 1230, $primaryColor, $playerName, false);

        $champName = mb_strtoupper($championship->name);
        $drawText(40, 1690, $secondaryColor, $champName, true);

        if ($roundName) {
            $drawText(30, 1750, $white, mb_strtoupper($roundName), true);
        }

        if (str_contains($sport, 'volei') || str_contains($sport, 'volley')) {
            $catTitle = mb_strtoupper(str_replace('_', ' ', $category));
            $mapTitles = ['levantador' => 'MELHOR LEVANTADORA', 'ponteira' => 'MELHOR PONTEIRA'];
            $title = $mapTitles[$category] ?? $catTitle;
            $drawText(50, 1150, $secondaryColor, $title, true);
        }

        // 4. Layout: MVP (com Placar) vs Award (sem Placar, só time)
        if ($match && in_array($category, ['craque', 'mvp', 'melhor_jogador', 'melhor_quadra'])) {
            $badgeSize = 150;
            $yBadges = 1535 - 280;
            $centerDist = 350;

            $xA = 102 + ($width / 2) - $centerDist - ($badgeSize / 2);
            $this->drawTeamBadge($img, $match->homeTeam, $xA, $yBadges, $badgeSize, $secondaryColor);

            $xB = -102 + ($width / 2) + $centerDist - ($badgeSize / 2);
            $this->drawTeamBadge($img, $match->awayTeam, $xB, $yBadges, $badgeSize, $secondaryColor);

            $scoreY = 1535;
            $scoreA = $match->home_score ?? 0;
            $scoreB = $match->away_score ?? 0;
            $placarSize = 100;

            $centerA = $xA + ($badgeSize / 2);
            $centerB = $xB + ($badgeSize / 2);

            $boxA = imagettfbbox($placarSize, 0, $this->fontPath, $scoreA);
            $wA = $boxA[2] - $boxA[0];

            $boxB = imagettfbbox($placarSize, 0, $this->fontPath, $scoreB);
            $wB = $boxB[2] - $boxB[0];

            imagettftext($img, $placarSize, 0, $centerA - ($wA / 2), $scoreY, $black, $this->fontPath, $scoreA);
            imagettftext($img, $placarSize, 0, $centerB - ($wB / 2), $scoreY, $black, $this->fontPath, $scoreB);

        } else {
            $targetTeam = $playerTeam;

            if (!$targetTeam && $match) {
                $isHome = \DB::table('team_players')
                    ->where('team_id', $match->home_team_id)
                    ->where('user_id', $player->id)
                    ->exists();

                $targetTeam = $isHome ? $match->homeTeam : $match->awayTeam;
            }

            if ($targetTeam) {
                $badgeSize = 150;
                $yBadges = 1535 - 280;
                $xCenter = ($width / 2) - ($badgeSize / 2);
                $this->drawTeamBadge($img, $targetTeam, $xCenter, $yBadges, $badgeSize, $secondaryColor);
            }
        }

        return $this->outputImage($img, 'card_' . $category . '_' . $player->id);
    }

    private function getBackgroundFile($sport, $category, $club = null, $championship = null)
    {
        $sport = strtolower($sport);

        if ($championship && !empty($championship->art_settings)) {
            $settings = $championship->art_settings;
            $sportSlug = Str::slug($sport, '-');
            $aliases = ['fut7' => 'futebol-7', 'society' => 'futebol-7', 'futebol-society' => 'futebol-7', 'futebol7' => 'futebol-7', 'f7' => 'futebol-7'];
            if (isset($aliases[$sportSlug]))
                $sportSlug = $aliases[$sportSlug];

            if (isset($settings[$sportSlug][$category]))
                return $settings[$sportSlug][$category];
            if (isset($settings[$sport][$category]))
                return $settings[$sport][$category];
            if ($category === 'jogo_programado') {
                if (isset($settings[$sportSlug]['confronto']))
                    return $settings[$sportSlug]['confronto'];
                if (isset($settings[$sport]['confronto']))
                    return $settings[$sport]['confronto'];
            }
        }

        $sportSlug = Str::slug($sport, '-');
        $aliases = ['fut7' => 'futebol-7', 'society' => 'futebol-7', 'futebol-society' => 'futebol-7', 'futebol7' => 'futebol-7', 'f7' => 'futebol-7'];
        if (isset($aliases[$sportSlug]))
            $sportSlug = $aliases[$sportSlug];

        if ($club && !empty($club->art_settings)) {
            $settings = $club->art_settings;
            if (isset($settings[$sportSlug][$category]))
                return $settings[$sportSlug][$category];
            if (isset($settings[$sport][$category]))
                return $settings[$sport][$category];
            if ($category === 'jogo_programado') {
                if (isset($settings[$sportSlug]['confronto']))
                    return $settings[$sportSlug]['confronto'];
                if (isset($settings[$sport]['confronto']))
                    return $settings[$sport]['confronto'];
            }
        }

        $sysKey = 'default_art_' . $sport . '_' . $category;
        $sysSetting = \App\Models\SystemSetting::where('key', $sysKey)->first();
        if ($sysSetting && $sysSetting->value)
            return $sysSetting->value;

        if ($category === 'jogo_programado') {
            $sportSlug = Str::slug($sport, '_');
            foreach ([
                $sportSlug . '_jogo_programado.jpg',
                str_replace('_', '', $sportSlug) . '_jogo_programado.jpg',
                str_replace('_', '-', $sportSlug) . '_jogo_programado.jpg'
            ] as $specific) {
                if (file_exists($this->templatesPath . $specific))
                    return $specific;
            }
            if (str_contains($sport, 'volei'))
                return 'volei_confronto.jpg';
            if (file_exists($this->templatesPath . 'confronto_' . $sportSlug . '.jpg'))
                return 'confronto_' . $sportSlug . '.jpg';
            return 'fundo_confronto.jpg';
        }

        if (str_contains($sport, 'volei')) {
            $map = [
                'confronto' => 'volei_confronto.jpg',
                'craque' => 'volei_melhor_quadra.jpg',
                'melhor_quadra' => 'volei_melhor_quadra.jpg',
                'levantador' => 'volei_melhor_levantadora.jpg',
                'levantadora' => 'volei_melhor_levantadora.jpg',
                'libero' => 'volei_melhor_libero.jpg',
                'ponteira' => 'volei_melhor_ponteira.jpg',
                'ponteiro' => 'volei_melhor_ponteira.jpg',
                'central' => 'volei_melhor_central.jpg',
                'oposta' => 'volei_melhor_oposta.jpg',
                'oposto' => 'volei_melhor_oposta.jpg',
                'maior_pontuadora' => 'volei_maior_pontuadora_geral.jpg',
                'bloqueadora' => 'volei_maior_bloqueadora.jpg',
                'estreante' => 'volei_melhor_estreante.jpg',
            ];
            return $map[$category] ?? 'volei_melhor_quadra.jpg';
        }

        $sportSlug = Str::slug($sport, '_');
        $specificFile = $sportSlug . '_' . $category . '.jpg';
        if (file_exists($this->templatesPath . $specificFile))
            return $specificFile;

        $map = [
            'confronto' => 'fundo_confronto.jpg',
            'jogo_programado' => 'fundo_confronto.jpg',
            'craque' => 'fundo_craque_do_jogo.jpg',
            'goleiro' => 'fundo_melhor_goleiro.jpg',
            'artilheiro' => 'fundo_melhor_artilheiro.jpg',
            'zagueiro' => 'fundo_melhor_zagueiro.jpg',
            'lateral' => 'fundo_melhor_lateral.jpg',
            'volante' => 'fundo_melhor_volante.jpg',
            'meia' => 'fundo_melhor_meia.jpg',
            'atacante' => 'fundo_melhor_atacante.jpg',
            'assistencia' => 'fundo_melhor_assistencia.jpg',
            'estreante' => 'fundo_melhor_estreiante.jpg',
        ];

        return $map[$category] ?? 'fundo_craque_do_jogo.jpg';
    }

    private function getDefaultTemplate($key)
    {
        if ($key === 'art_layout_scheduled_feed') {
            return [
                "elements" => [
                    ["id" => "championship", "type" => "text", "x" => 1500, "y" => 281, "fontSize" => 45, "color" => "#FFFFFF", "align" => "center", "label" => "Campeonato", "zIndex" => 2, "content" => "{CAMPEONATO}", "fontFamily" => "Roboto"],
                    ["id" => "team_a", "type" => "image", "x" => 250, "y" => 1050, "width" => 400, "height" => 400, "label" => "Brasão Mandante", "zIndex" => 2, "content" => "team_a"],
                    ["id" => "team_b", "type" => "image", "x" => 830, "y" => 1050, "width" => 400, "height" => 400, "label" => "Brasão Visitante", "zIndex" => 2, "content" => "team_b"],
                    ["id" => "vs", "type" => "text", "x" => 535, "y" => 1050, "fontSize" => 80, "color" => "#FFB700", "align" => "center", "label" => "X (Versus)", "zIndex" => 2, "content" => "X", "fontFamily" => "Roboto-Bold"],
                    ["id" => "date", "type" => "text", "x" => 540, "y" => 1740, "fontSize" => 60, "color" => "#FFB700", "align" => "center", "label" => "Data", "zIndex" => 2, "content" => "DD/MM HH:MM", "fontFamily" => "Roboto"],
                    ["id" => "local", "type" => "text", "x" => 543, "y" => 1800, "fontSize" => 35, "color" => "#ffffff", "align" => "center", "label" => "Local", "zIndex" => 2, "content" => "Local da Partida", "fontFamily" => "Roboto"],
                    ["id" => "team_name_a", "type" => "text", "x" => 250, "y" => 1300, "fontSize" => 35, "color" => "#FFFFFF", "align" => "center", "label" => "Nome Mandante", "zIndex" => 2, "content" => "{TC}", "fontFamily" => "Roboto"],
                    ["id" => "team_name_b", "type" => "text", "x" => 830, "y" => 1300, "fontSize" => 35, "color" => "#FFFFFF", "align" => "center", "label" => "Nome Visitante", "zIndex" => 2, "content" => "{TF}", "fontFamily" => "Roboto"]
                ],
                "canvas" => ["width" => 1080, "height" => 1920],
                "bg_url" => null,
                "name" => "Jogo Programado"
            ];
        }

        if ($key === 'art_layout_mvp_vertical') {
            return [
                "elements" => [
                    ["id" => "player_photo", "type" => "image", "x" => 540, "y" => 701, "width" => 700, "height" => 700, "label" => "Foto do Jogador", "zIndex" => 1, "content" => "player_photo", "borderRadius" => 0],
                    ["id" => "player_name", "type" => "text", "x" => 550, "y" => 1140, "fontSize" => 75, "color" => "#FFB700", "align" => "center", "label" => "Nome do Jogador", "zIndex" => 2, "content" => "{JOGADOR}", "fontFamily" => "Roboto"],
                    ["id" => "team_badge_a", "type" => "image", "x" => 295, "y" => 1329, "width" => 160, "height" => 160, "label" => "Brasão Mandante", "zIndex" => 2, "content" => "team_a"],
                    ["id" => "team_badge_b", "type" => "image", "x" => 780, "y" => 1329, "width" => 160, "height" => 160, "label" => "Brasão Visitante", "zIndex" => 2, "content" => "team_b"],
                    ["id" => "championship", "type" => "text", "x" => 540, "y" => 1720, "fontSize" => 40, "color" => "#FFFFFF", "align" => "center", "label" => "Nome Campeonato", "zIndex" => 2, "content" => "{CAMPEONATO}"],
                    ["id" => "round", "type" => "text", "x" => 540, "y" => 1780, "fontSize" => 30, "color" => "#FFFFFF", "align" => "center", "label" => "Rodada/Fase", "zIndex" => 2, "content" => "{RODADA}"],
                    ["id" => "score_home", "type" => "text", "x" => 290, "y" => 1495, "fontSize" => 100, "color" => "#000000", "align" => "center", "label" => "Placar Casa", "zIndex" => 3, "content" => "{PA}", "fontFamily" => "Roboto-Bold"],
                    ["id" => "score_x", "type" => "text", "x" => 1597, "y" => 1335, "fontSize" => 60, "color" => "#000000", "align" => "center", "label" => "X (Divisor)", "zIndex" => 3, "content" => "X", "fontFamily" => "Roboto"],
                    ["id" => "score_away", "type" => "text", "x" => 785, "y" => 1495, "fontSize" => 100, "color" => "#000000", "align" => "right", "label" => "Placar Visitante", "zIndex" => 3, "content" => "{PF}", "fontFamily" => "Roboto-Bold"]
                ],
                "canvas" => ["width" => 1080, "height" => 1920],
                "bg_url" => null,
                "name" => "Craque do Jogo"
            ];
        }

        if ($key === 'art_layout_faceoff') {
            return [
                "elements" => [
                    ["id" => "championship", "type" => "text", "x" => 540, "y" => 1600, "fontSize" => 50, "color" => "#FFFFFF", "align" => "center", "label" => "Campeonato", "zIndex" => 2, "content" => "{CAMPEONATO}", "fontFamily" => "Roboto"],
                    ["id" => "round", "type" => "text", "x" => 540, "y" => 1680, "fontSize" => 35, "color" => "#FFFFFF", "align" => "center", "label" => "Rodada", "zIndex" => 2, "content" => "{RODADA}", "fontFamily" => "Roboto"],
                    ["id" => "team_a", "type" => "image", "x" => 250, "y" => 800, "width" => 350, "height" => 350, "label" => "Brasão Mandante", "zIndex" => 2, "content" => "team_a"],
                    ["id" => "team_b", "type" => "image", "x" => 830, "y" => 800, "width" => 350, "height" => 350, "label" => "Brasão Visitante", "zIndex" => 2, "content" => "team_b"],
                    ["id" => "vs", "type" => "text", "x" => 540, "y" => 900, "fontSize" => 80, "color" => "#FFB700", "align" => "center", "label" => "X (Versus)", "zIndex" => 2, "content" => "X", "fontFamily" => "Roboto-Bold"],
                    ["id" => "score_home", "type" => "text", "x" => 250, "y" => 1150, "fontSize" => 100, "color" => "#FFFFFF", "align" => "center", "label" => "Placar Casa", "zIndex" => 3, "content" => "{PC}", "fontFamily" => "Roboto-Bold"],
                    ["id" => "score_away", "type" => "text", "x" => 830, "y" => 1150, "fontSize" => 100, "color" => "#FFFFFF", "align" => "center", "label" => "Placar Visitante", "zIndex" => 3, "content" => "{PF}", "fontFamily" => "Roboto-Bold"],
                    ["id" => "scorers_home", "type" => "text", "x" => 250, "y" => 1300, "fontSize" => 30, "color" => "#FFFFFF", "align" => "center", "label" => "Gols Mandante", "zIndex" => 2, "content" => "{LISTA_GOLS_CASA}", "fontFamily" => "Roboto"],
                    ["id" => "scorers_away", "type" => "text", "x" => 830, "y" => 1300, "fontSize" => 30, "color" => "#FFFFFF", "align" => "center", "label" => "Gols Visitante", "zIndex" => 2, "content" => "{LISTA_GOLS_FORA}", "fontFamily" => "Roboto"]
                ],
                "canvas" => ["width" => 1080, "height" => 1920],
                "bg_url" => null,
                "name" => "Confronto"
            ];
        }

        return null;
    }
}
