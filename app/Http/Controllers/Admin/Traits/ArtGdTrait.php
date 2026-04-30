<?php

namespace App\Http\Controllers\Admin\Traits;

/**
 * ArtGdTrait
 * Utilitários de imagem GD: inicialização, renderização, texto, cores.
 */
trait ArtGdTrait
{
    private function initImage($filename)
    {
        $filename = str_replace('\\', '/', $filename);

        if (str_contains($filename, '/') || str_contains($filename, '\\')) {
            if (file_exists($filename)) {
                return $this->createFromFormat($filename);
            }

            $clean = $filename;
            if (str_starts_with($clean, '/storage/'))
                $clean = substr($clean, 9);
            if (str_starts_with($clean, 'storage/'))
                $clean = substr($clean, 8);

            $storagePath = storage_path('app/public/' . $clean);
            if (file_exists($storagePath)) {
                return $this->createFromFormat($storagePath);
            }

            $publicPath = public_path('storage/' . $clean);
            if (file_exists($publicPath)) {
                return $this->createFromFormat($publicPath);
            }
        }

        $path = $this->templatesPath . $filename;
        if (!file_exists($path)) {
            $path = $this->templatesPath . 'fundo_craque_do_jogo.jpg';
            if (!file_exists($path)) {
                $path = $this->templatesPath . 'bg_mvp.jpg';
                if (!file_exists($path)) {
                    $img = imagecreatetruecolor(1080, 1350);
                    $bg = imagecolorallocate($img, 30, 30, 30);
                    imagefill($img, 0, 0, $bg);
                    return $img;
                }
            }
        }
        return $this->createFromFormat($path);
    }

    private function createFromFormat($path)
    {
        $info = @getimagesize($path);
        if (!$info)
            return @imagecreatefromjpeg($path);

        if ($info['mime'] == 'image/png') {
            return @imagecreatefrompng($path);
        }
        if ($info['mime'] == 'image/webp') {
            return @imagecreatefromwebp($path);
        }
        return @imagecreatefromjpeg($path);
    }

    private function outputImage($img, $filename)
    {
        if (ob_get_level() > 0) ob_clean(); 
        ob_start();
        imagejpeg($img, null, 90);
        $content = ob_get_clean();
        imagedestroy($img);
        return response($content)
            ->header('Content-Type', 'image/jpeg')
            ->header('Content-Disposition', 'inline; filename="' . $filename . '.jpg"');
    }

    private function hexToRgb($hex)
    {
        $hex = str_replace("#", "", $hex);
        if (strlen($hex) == 3) {
            $r = hexdec(substr($hex, 0, 1) . substr($hex, 0, 1));
            $g = hexdec(substr($hex, 1, 1) . substr($hex, 1, 1));
            $b = hexdec(substr($hex, 2, 1) . substr($hex, 2, 1));
        } else {
            $r = hexdec(substr($hex, 0, 2));
            $g = hexdec(substr($hex, 2, 2));
            $b = hexdec(substr($hex, 4, 2));
        }
        return ['r' => $r, 'g' => $g, 'b' => $b];
    }

    private function drawCenteredText($image, $size, $y, $color, $text, $useSecondaryFont = false)
    {
        $font = $useSecondaryFont ? $this->secondaryFontPath : $this->fontPath;
        $box = imagettfbbox($size, 0, $font, $text);
        $textWidth = $box[2] - $box[0];
        $width = imagesx($image);
        $x = ($width - $textWidth) / 2;

        if ($color === null) {
            $color = $this->getAutoContrastColor($image, $x, $y - $size, $textWidth, $size);
        }

        imagettftext($image, $size, 0, $x, $y, $color, $font, $text);
    }

    private function drawCenteredTextInBox($image, $fontSize, $xBox, $yBox, $boxSize, $color, $text)
    {
        $box = imagettfbbox($fontSize, 0, $this->fontPath, $text);
        $textW = $box[2] - $box[0];
        $textH = $box[1] - $box[7];

        $x = $xBox + ($boxSize - $textW) / 2;
        $y = $yBox + ($boxSize - $textH) / 2 + $textH;

        imagettftext($image, $fontSize, 0, $x, $y, $color, $this->fontPath, $text);
    }

    private function drawTeamBadge($img, $team, $x, $y, $size, $fallbackColor)
    {
        if (!$team)
            return;

        $badgePath = null;
        if ($team->logo_path) {
            $possiblePaths = [
                storage_path('app/public/' . $team->logo_path),
                public_path('storage/' . $team->logo_path),
                public_path('brasoes/' . basename($team->logo_path))
            ];
            foreach ($possiblePaths as $p) {
                if (file_exists($p)) {
                    $badgePath = $p;
                    break;
                }
            }
        }

        if ($badgePath) {
            $info = @getimagesize($badgePath);
            if ($info) {
                $badgeImg = null;
                if ($info['mime'] == 'image/jpeg')
                    $badgeImg = @imagecreatefromjpeg($badgePath);
                elseif ($info['mime'] == 'image/png')
                    $badgeImg = @imagecreatefrompng($badgePath);
                elseif ($info['mime'] == 'image/webp')
                    $badgeImg = @imagecreatefromwebp($badgePath);

                if ($badgeImg) {
                    imagealphablending($img, true);
                    imagecopyresampled($img, $badgeImg, $x, $y, 0, 0, $size, $size, imagesx($badgeImg), imagesy($badgeImg));
                    imagedestroy($badgeImg);
                    return;
                }
            }
        }

        // Fallback: sigla
        $sigla = mb_strtoupper(mb_substr($team->name ?? '?', 0, 3), 'UTF-8');
        $this->drawCenteredTextInBox($img, (int) ($size / 2), $x, $y, $size, $fallbackColor, $sigla);
    }

    private function getAutoContrastColor($img, $x, $y, $w, $h)
    {
        $totalR = 0;
        $totalG = 0;
        $totalB = 0;
        $count = 0;

        $step = max(1, (int) ($w / 20));

        for ($px = $x; $px < $x + $w; $px += $step) {
            for ($py = $y; $py < $y + $h; $py += $step) {
                if ($px < imagesx($img) && $py < imagesy($img)) {
                    $c = @imagecolorat($img, $px, $py);
                    $totalR += ($c >> 16) & 0xFF;
                    $totalG += ($c >> 8) & 0xFF;
                    $totalB += $c & 0xFF;
                    $count++;
                }
            }
        }

        if ($count === 0)
            return imagecolorallocate($img, 255, 255, 255);

        $avgR = $totalR / $count;
        $avgG = $totalG / $count;
        $avgB = $totalB / $count;

        // Luminância percebida
        $luminance = (0.299 * $avgR + 0.587 * $avgG + 0.114 * $avgB);

        return $luminance > 128
            ? imagecolorallocate($img, 0, 0, 0)   // fundo claro → texto preto
            : imagecolorallocate($img, 255, 255, 255); // fundo escuro → texto branco
    }

    /**
     * Renderiza Elementos Dinâmicos Salvos no Editor
     */
    private function renderDynamicElements($img, $elements, $replaceMap)
    {
        if (!$elements || !is_array($elements))
            return;

        foreach ($elements as $el) {
            $x = $el['x'] ?? 0;
            $y = $el['y'] ?? 0;
            $width = $el['width'] ?? 0;
            $height = $el['height'] ?? 0;

            if ($el['type'] === 'text') {
                $text = $el['content'] ?? '';

                // SMART OVERRIDE (Semantic IDs)
                if (isset($el['id'])) {
                    $id = $el['id'];
                    if ($id === 'player_name')
                        $text = '{JOGADOR}';
                    elseif ($id === 'score_home')
                        $text = '{PC}';
                    elseif ($id === 'score_away')
                        $text = '{PF}';
                    elseif ($id === 'championship')
                        $text = '{CAMPEONATO}';
                    elseif ($id === 'round')
                        $text = '{RODADA}';
                    elseif ($id === 'local')
                        $text = 'Local da Partida';
                    elseif ($id === 'date')
                        $text = 'DD/MM HH:MM';
                    elseif ($id === 'vs')
                        $text = 'X';
                    elseif ($id === 'team_name_a')
                        $text = '{TC}';
                    elseif ($id === 'team_name_b')
                        $text = '{TF}';
                }

                foreach ($replaceMap as $k => $val) {
                    if (is_string($val) || is_numeric($val)) {
                        $text = str_replace($k, $val, $text);
                    }
                }

                $fontSize = $el['fontSize'] ?? 40;
                $isTeamName = isset($el['id']) && in_array($el['id'], ['team_name_a', 'team_name_b', 'team_name', 'score_home', 'score_away']);

                if ($isTeamName && mb_strlen($text, 'UTF-8') > 15) {
                    $text = str_replace('/', "/ ", $text);
                    $text = wordwrap($text, 15, "\n", false);
                    $lines = explode("\n", $text);
                    $formattedLines = [];
                    foreach ($lines as $line) {
                        $trimmed = trim($line);
                        if (!empty($trimmed))
                            $formattedLines[] = $trimmed;
                    }
                    $text = implode("\n", $formattedLines);
                    $fontSize = $fontSize * 0.9;
                }

                $rgb = $this->hexToRgb($el['color'] ?? '#FFFFFF');
                $color = imagecolorallocate($img, $rgb['r'], $rgb['g'], $rgb['b']);
                $fontName = $el['fontFamily'] ?? 'Roboto';
                $fontPath = $this->fontPath;
                $fontNameClean = str_replace('.ttf', '', $fontName);

                if (file_exists(public_path('assets/fonts/' . $fontNameClean . '.ttf'))) {
                    $fontPath = public_path('assets/fonts/' . $fontNameClean . '.ttf');
                } elseif (file_exists(public_path('assets/fonts/' . $fontNameClean . '-Regular.ttf'))) {
                    $fontPath = public_path('assets/fonts/' . $fontNameClean . '-Regular.ttf');
                } elseif (file_exists(public_path('assets/fonts/' . $fontName))) {
                    $fontPath = public_path('assets/fonts/' . $fontName);
                }

                $align = $el['align'] ?? 'left';
                $lines = explode("\n", $text);
                $lineHeight = $fontSize * 1.5;
                $startY = $y;

                if (count($lines) > 1) {
                    $startY = $y - ((count($lines) - 1) * $lineHeight / 2);
                }

                foreach ($lines as $i => $line) {
                    $box = imagettfbbox($fontSize, 0, $fontPath, $line);
                    $textWidth = abs($box[2] - $box[0]);
                    $textHeight = abs($box[5] - $box[1]);

                    $drawX = $x;
                    if ($align === 'center')
                        $drawX = $x - ($textWidth / 2);
                    elseif ($align === 'right')
                        $drawX = $x - $textWidth;

                    $drawY = $startY + ($i * $lineHeight) + ($textHeight / 2.5);
                    imagettftext($img, $fontSize, 0, $drawX, $drawY, $color, $fontPath, $line);
                }

            } elseif ($el['type'] === 'image') {
                $contentKey = $el['content'];
                $sourceImage = null;
                $sourceIsPng = false;

                if (isset($replaceMap[$contentKey]) && $replaceMap[$contentKey]) {
                    $res = $replaceMap[$contentKey];
                    if (is_string($res) && file_exists($res)) {
                        $info = @getimagesize($res);
                        if ($info && $info['mime'] == 'image/png') {
                            $sourceImage = @imagecreatefrompng($res);
                            $sourceIsPng = true;
                        } elseif ($info && $info['mime'] == 'image/webp') {
                            $sourceImage = @imagecreatefromwebp($res);
                            $sourceIsPng = true; // WebP também pode ter transparência
                        } else {
                            $sourceImage = @imagecreatefromjpeg($res);
                        }
                    }
                }

                if ($sourceImage) {
                    $dstX = (int) round($x - ($width / 2));
                    $dstY = (int) round($y - ($height / 2));
                    $srcW = imagesx($sourceImage);
                    $srcH = imagesy($sourceImage);

                    // Se for foto do atleta e o evento NÃO quer remover fundo:
                    // forçar opacidade total para evitar transparência de PNGs pré-processados
                    $keepBg = ($contentKey === 'player_photo') && !empty($replaceMap['player_photo_keep_bg']);

                    if ($sourceIsPng && !$keepBg) {
                        // PNG com transparência (fundo removido) — manter alpha
                        imagealphablending($sourceImage, false);
                        imagesavealpha($sourceImage, true);

                        $tempCanvas = imagecreatetruecolor($width, $height);
                        imagealphablending($tempCanvas, false);
                        imagesavealpha($tempCanvas, true);
                        $transparent = imagecolorallocatealpha($tempCanvas, 0, 0, 0, 127);
                        imagefilledrectangle($tempCanvas, 0, 0, $width, $height, $transparent);
                        imagecopyresampled($tempCanvas, $sourceImage, 0, 0, 0, 0, $width, $height, $srcW, $srcH);

                        imagealphablending($img, true);
                        imagecopy($img, $tempCanvas, $dstX, $dstY, 0, 0, $width, $height);
                        imagedestroy($tempCanvas);
                    } elseif ($sourceIsPng && $keepBg) {
                        // PNG mas sem remoção de fundo — desenhar sobre canvas opaco para ignorar alpha
                        $tempCanvas = imagecreatetruecolor($width, $height);
                        $white = imagecolorallocate($tempCanvas, 255, 255, 255);
                        imagefilledrectangle($tempCanvas, 0, 0, $width, $height, $white);
                        imagealphablending($sourceImage, true);
                        imagecopyresampled($tempCanvas, $sourceImage, 0, 0, 0, 0, $width, $height, $srcW, $srcH);

                        imagealphablending($img, true);
                        imagecopyresampled($img, $tempCanvas, $dstX, $dstY, 0, 0, $width, $height, $width, $height);
                        imagedestroy($tempCanvas);
                    } else {
                        imagealphablending($img, true);
                        imagecopyresampled($img, $sourceImage, $dstX, $dstY, 0, 0, $width, $height, $srcW, $srcH);
                    }
                    imagedestroy($sourceImage);
                }
            }
        }
    }

    private function urlToPath($url)
    {
        if (empty($url))
            return null;
        $parsed = parse_url($url);
        $path = $parsed['path'] ?? $url;
        $path = urldecode($path);

        if (strpos($path, '/assets-templates/') !== false) {
            return public_path(substr($path, strpos($path, '/assets-templates/')));
        }
        if (strpos($path, '/storage/') !== false) {
            $rel = substr($path, strpos($path, '/storage/'));
            $rel = str_replace('/storage/', '', $rel);
            return storage_path('app/public/' . $rel);
        }
        return $path;
    }

    private function drawScorersList($img, $match, $configHome, $configAway)
    {
        $goals = $match->events->where('event_type', 'goal');
        $scorersA = [];
        $scorersB = [];

        foreach ($goals as $goal) {
            $name = 'Desconhecido';
            if ($goal->player) {
                $parts = explode(' ', trim($goal->player->name));
                $name = $parts[0];
                if (isset($parts[1]) && strlen($parts[1]) > 2)
                    $name .= ' ' . $parts[1];
            } elseif (!empty($goal->metadata['label'])) {
                $name = $goal->metadata['label'];
            }

            $isOwnGoal = isset($goal->metadata['own_goal']) && $goal->metadata['own_goal'] === true;
            if ($goal->team_id == $match->home_team_id) {
                if (!isset($scorersA[$name]))
                    $scorersA[$name] = [];
                $scorersA[$name][] = $isOwnGoal;
            } elseif ($goal->team_id == $match->away_team_id) {
                if (!isset($scorersB[$name]))
                    $scorersB[$name] = [];
                $scorersB[$name][] = $isOwnGoal;
            }
        }

        $ballPath = public_path('assets/img/bola.png');
        $ballImg = null;
        if (file_exists($ballPath)) {
            $ballImg = @imagecreatefrompng($ballPath);
        }

        $ballRedImg = null;
        $ballRedPath = public_path('assets/img/bola_vermelha.png');
        if (file_exists($ballRedPath)) {
            $ballRedImg = @imagecreatefrompng($ballRedPath);
        } elseif ($ballImg) {
            $ballRedImg = @imagecreatefrompng($ballPath);
            if ($ballRedImg) {
                imagefilter($ballRedImg, IMG_FILTER_COLORIZE, 255, 0, 0);
            }
        }

        $tamanho_bola = 40;
        $espacamento_bola = 5;
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);
        $red = imagecolorallocate($img, 255, 0, 0);

        foreach ([[$configHome, $scorersA], [$configAway, $scorersB]] as [$cfg, $scorers]) {
            if (!$cfg)
                continue;
            $x = $cfg['x'];
            $y = $cfg['y'];
            $fontSize = $cfg['fontSize'] ?? 30;
            $offset_y = 0;

            foreach ($scorers as $name => $goalsArray) {
                $count = count($goalsArray);
                $ballsWidth = ($count * $tamanho_bola) + (($count - 1) * $espacamento_bola);
                $box = imagettfbbox($fontSize, 0, $this->fontPath, mb_strtoupper($name));
                $nameWidth = abs($box[2] - $box[0]);
                $totalWidth = $ballsWidth + 10 + $nameWidth;
                $startX = $x - ($totalWidth / 2);
                $currX = $startX;

                for ($i = 0; $i < $count; $i++) {
                    $isOwn = $goalsArray[$i];
                    $currentBall = $isOwn ? $ballRedImg : $ballImg;
                    if ($currentBall) {
                        imagecopyresampled($img, $currentBall, $currX, $y + $offset_y - $tamanho_bola + ($tamanho_bola / 2), 0, 0, $tamanho_bola, $tamanho_bola, imagesx($currentBall), imagesy($currentBall));
                    } else {
                        $color = $isOwn ? $red : $white;
                        imagefilledellipse($img, $currX + ($tamanho_bola / 2), $y + $offset_y, $tamanho_bola, $tamanho_bola, $color);
                    }
                    $currX += $tamanho_bola + $espacamento_bola;
                }

                imagettftext($img, $fontSize, 0, $currX + 10 + 2, $y + $offset_y + ($fontSize / 2.5) + 2, $black, $this->fontPath, mb_strtoupper($name));
                imagettftext($img, $fontSize, 0, $currX + 10, $y + $offset_y + ($fontSize / 2.5), $white, $this->fontPath, mb_strtoupper($name));
                $offset_y += ($fontSize + 15);
            }
        }

        if ($ballImg)
            imagedestroy($ballImg);
        if ($ballRedImg)
            imagedestroy($ballRedImg);
    }

    private function getTranslatedRoundName($match)
    {
        if (!$match) return '';
        $roundName = $match->round_name;
        if (empty($roundName)) {
            return "RODADA " . ($match->round_number ?? 1);
        }

        $translations = [
            'round_of_32' => '16 avos de Final',
            'round_of_16' => 'Oitavas de Final',
            'quarter' => 'Quartas de Final',
            'semi' => 'Semifinal',
            'final' => 'Final',
            'third_place' => '3º Lugar',
            'group' => 'Fase de Grupos',
        ];

        return $translations[strtolower($roundName)] ?? $roundName;
    }
}

