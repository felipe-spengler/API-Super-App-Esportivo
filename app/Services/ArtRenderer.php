<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Str;

class ArtRenderer
{
    public $fontPath;
    public $secondaryFontPath;
    public $templatesPath;

    public function __construct()
    {
        $this->fontPath = public_path('assets/fonts/Roboto-Bold.ttf');
        $this->secondaryFontPath = $this->fontPath;
        $this->templatesPath = public_path('assets/templates/');
    }

    public function initImage($filename)
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
            if (file_exists($storagePath))
                return $this->createFromFormat($storagePath);

            $publicPath = public_path('storage/' . $clean);
            if (file_exists($publicPath))
                return $this->createFromFormat($publicPath);
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

    public function createFromFormat($path)
    {
        $info = @getimagesize($path);
        if (!$info) {
            if (str_ends_with(strtolower($path), '.webp')) {
                if (function_exists('imagecreatefromwebp'))
                    return @imagecreatefromwebp($path);
            }
            return @imagecreatefromjpeg($path);
        }

        $mime = $info['mime'];
        if ($mime == 'image/png')
            return @imagecreatefrompng($path);
        if ($mime == 'image/webp' && function_exists('imagecreatefromwebp'))
            return @imagecreatefromwebp($path);

        return @imagecreatefromjpeg($path);
    }

    public function loadClubResources($club)
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

    public function drawPlayerPhoto($img, $player)
    {
        if (!$player->photo_path)
            return;

        $noBgExtensions = ['_nobg.png', '_nobg.webp', '.png', '.webp', '.jpg', '.jpeg'];
        $photoPath = null;

        foreach ($noBgExtensions as $ext) {
            $testPath = $player->photo_path;
            if (str_contains($ext, '_nobg')) {
                $testPath = preg_replace('/\.[^.]+$/i', $ext, $player->photo_path);
            }

            foreach ([
                storage_path('app/public/' . $testPath),
                public_path('storage/' . $testPath),
            ] as $candidate) {
                if (file_exists($candidate)) {
                    $photoPath = $candidate;
                    break 2;
                }
            }
        }

        if (!$photoPath)
            return;

        $playerImg = $this->createFromFormat($photoPath);
        if (!$playerImg)
            return;

        // Ensure source has alpha
        imagealphablending($playerImg, false);
        imagesavealpha($playerImg, true);

        $targetHeight = 800;
        $width = imagesx($img);
        $origW = imagesx($playerImg);
        $origH = imagesy($playerImg);
        $ratio = $origW / $origH;
        $targetWidth = (int) round($targetHeight * $ratio);

        $xPos = (int) round(($width - $targetWidth) / 2);
        $yPos = 335;

        // Use intermediate canvas for alpha preservation and resampling
        $tempCanvas = imagecreatetruecolor($targetWidth, $targetHeight);
        imagealphablending($tempCanvas, false);
        imagesavealpha($tempCanvas, true);

        // Fill with FULL transparency (Black Transparent)
        $transparent = imagecolorallocatealpha($tempCanvas, 0, 0, 0, 127);
        imagefilledrectangle($tempCanvas, 0, 0, $targetWidth, $targetHeight, $transparent);

        imagecopyresampled($tempCanvas, $playerImg, 0, 0, 0, 0, $targetWidth, $targetHeight, $origW, $origH);

        // Blend onto final image
        imagealphablending($img, true);
        imagecopyresampled($img, $tempCanvas, $xPos, $yPos, 0, 0, $targetWidth, $targetHeight, $targetWidth, $targetHeight);

        imagedestroy($tempCanvas);
        imagedestroy($playerImg);
    }

    public function drawTeamBadge($img, $team, $x, $y, $size, $fallbackColor)
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
            $badgeImg = $this->createFromFormat($badgePath);
            if ($badgeImg) {
                $tempCanvas = imagecreatetruecolor($size, $size);
                imagealphablending($tempCanvas, false);
                imagesavealpha($tempCanvas, true);
                $transparent = imagecolorallocatealpha($tempCanvas, 255, 255, 255, 127);
                imagefilledrectangle($tempCanvas, 0, 0, $size, $size, $transparent);

                imagecopyresampled($tempCanvas, $badgeImg, 0, 0, 0, 0, $size, $size, imagesx($badgeImg), imagesy($badgeImg));

                imagealphablending($img, true);
                imagecopy($img, $tempCanvas, $x, $y, 0, 0, $size, $size);

                imagedestroy($tempCanvas);
                imagedestroy($badgeImg);
                return;
            }
        }

        $sigla = mb_strtoupper(Str::limit($team->name, 3, ''), 'UTF-8');
        $this->drawCenteredTextInBox($img, $size / 2, $x, $y, $size, $fallbackColor, $sigla);
    }

    public function drawCenteredText($image, $size, $y, $color, $text, $useSecondaryFont = false)
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

    public function drawCenteredTextInBox($image, $fontSize, $xBox, $yBox, $boxSize, $color, $text)
    {
        $box = imagettfbbox($fontSize, 0, $this->fontPath, $text);
        $textW = $box[2] - $box[0];
        $textH = $box[1] - $box[7];

        $x = $xBox + ($boxSize - $textW) / 2;
        $y = $yBox + ($boxSize - $textH) / 2 + $textH;

        imagettftext($image, $fontSize, 0, $x, $y, $color, $this->fontPath, $text);
    }

    public function getAutoContrastColor($img, $x, $y, $w, $h)
    {
        $imgW = imagesx($img);
        $imgH = imagesy($img);

        $x = floor(max(0, $x));
        $y = floor(max(0, $y));
        $w = floor(min($w, $imgW - $x));
        $h = floor(min($h, $imgH - $y));

        if ($w <= 1 || $h <= 1)
            return imagecolorallocate($img, 255, 255, 255);

        $points = [
            [$x, $y],
            [min($x + $w - 1, $imgW - 1), $y],
            [$x, min($y + $h - 1, $imgH - 1)],
            [min($x + $w - 1, $imgW - 1), min($y + $h - 1, $imgH - 1)],
            [min($x + ($w / 2), $imgW - 1), min($y + ($h / 2), $imgH - 1)]
        ];

        $totalLimunance = 0;
        $samples = 0;

        foreach ($points as $p) {
            $px = (int) $p[0];
            $py = (int) $p[1];
            if ($px < 0 || $px >= $imgW || $py < 0 || $py >= $imgH)
                continue;
            $rgb = imagecolorat($img, $px, $py);
            $r = ($rgb >> 16) & 0xFF;
            $g = ($rgb >> 8) & 0xFF;
            $b = $rgb & 0xFF;
            $totalLimunance += (0.299 * $r) + (0.587 * $g) + (0.114 * $b);
            $samples++;
        }

        if ($samples === 0)
            return imagecolorallocate($img, 255, 255, 255);
        return ($totalLimunance / $samples > 130) ? imagecolorallocate($img, 20, 20, 20) : imagecolorallocate($img, 255, 255, 255);
    }

    public function hexToRgb($hex)
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

    public function renderDynamicElements($img, $elements, $replaceMap)
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
                if (isset($el['id'])) {
                    $id = $el['id'];
                    $map = [
                        'player_name' => '{JOGADOR}',
                        'score_home' => '{PC}',
                        'score_away' => '{PF}',
                        'championship' => '{CAMPEONATO}',
                        'round' => '{RODADA}',
                        'local' => 'Local da Partida',
                        'date' => 'DD/MM HH:MM',
                        'vs' => 'X',
                        'team_name_a' => '{TC}',
                        'team_name_b' => '{TF}'
                    ];
                    if (isset($map[$id]))
                        $text = $map[$id];
                }

                foreach ($replaceMap as $k => $val) {
                    if (is_string($val) || is_numeric($val))
                        $text = str_replace($k, $val, $text);
                }

                $fontSize = $el['fontSize'] ?? 40;
                $isTeamName = isset($el['id']) && in_array($el['id'], ['team_name_a', 'team_name_b', 'team_name', 'score_home', 'score_away']);
                if ($isTeamName && mb_strlen($text, 'UTF-8') > 15) {
                    $text = wordwrap(str_replace('/', "/ ", $text), 15, "\n", false);
                    $lines = explode("\n", $text);
                    $formattedLines = [];
                    foreach ($lines as $line)
                        if (!empty($trimmed = trim($line)))
                            $formattedLines[] = $trimmed;
                    $text = implode("\n", $formattedLines);
                    $fontSize *= 0.9;
                }

                $rgb = $this->hexToRgb($el['color'] ?? '#FFFFFF');
                $color = imagecolorallocate($img, $rgb['r'], $rgb['g'], $rgb['b']);

                $fontNameClean = str_replace('.ttf', '', $el['fontFamily'] ?? 'Roboto');
                $fontPath = $this->fontPath;
                if (file_exists($p = public_path("assets/fonts/$fontNameClean.ttf")))
                    $fontPath = $p;
                elseif (file_exists($p = public_path("assets/fonts/$fontNameClean-Regular.ttf")))
                    $fontPath = $p;

                $lines = explode("\n", $text);
                $lineHeight = $fontSize * 1.5;
                $startY = $y - (count($lines) > 1 ? ((count($lines) - 1) * $lineHeight / 2) : 0);

                foreach ($lines as $i => $line) {
                    $box = imagettfbbox($fontSize, 0, $fontPath, $line);
                    $tw = abs($box[2] - $box[0]);
                    $th = abs($box[5] - $box[1]);
                    $align = $el['align'] ?? 'left';
                    $drawX = ($align === 'center') ? $x - ($tw / 2) : (($align === 'right') ? $x - $tw : $x);
                    $drawY = $startY + ($i * $lineHeight) + ($th / 2.5);
                    imagettftext($img, $fontSize, 0, $drawX, $drawY, $color, $fontPath, $line);
                }

            } elseif ($el['type'] === 'image') {
                $contentKey = $el['content'];
                if (isset($replaceMap[$contentKey]) && ($res = $replaceMap[$contentKey]) && is_string($res) && file_exists($res)) {
                    $sourceImage = $this->createFromFormat($res);
                    if ($sourceImage) {
                        $dstX = (int) round($x - ($width / 2));
                        $dstY = (int) round($y - ($height / 2));
                        $srcW = imagesx($sourceImage);
                        $srcH = imagesy($sourceImage);

                        imagealphablending($img, true);
                        if (str_ends_with(strtolower($res), '.png') || str_ends_with(strtolower($res), '.webp')) {
                            // Intermediate canvas for better alpha handling
                            $tempCanvas = imagecreatetruecolor($width, $height);
                            imagealphablending($tempCanvas, false);
                            imagesavealpha($tempCanvas, true);
                            $transparent = imagecolorallocatealpha($tempCanvas, 0, 0, 0, 127); // Opaque Black to avoid halos
                            imagefilledrectangle($tempCanvas, 0, 0, $width, $height, $transparent);

                            imagecopyresampled($tempCanvas, $sourceImage, 0, 0, 0, 0, $width, $height, $srcW, $srcH);

                            // Blend onto main image using resampled copy which respects alphablending
                            imagecopyresampled($img, $tempCanvas, $dstX, $dstY, 0, 0, $width, $height, $width, $height);
                            imagedestroy($tempCanvas);
                        } else {
                            imagecopyresampled($img, $sourceImage, $dstX, $dstY, 0, 0, $width, $height, $srcW, $srcH);
                        }
                        imagedestroy($sourceImage);
                    }
                }
            }
        }
    }

    public function getBackgroundFile($sport, $category, $club = null, $championship = null)
    {
        $sport = strtolower($sport);
        $sportSlug = Str::slug($sport, '-');
        $aliases = ['fut7' => 'futebol-7', 'society' => 'futebol-7', 'futebol-society' => 'futebol-7', 'futebol7' => 'futebol-7', 'f7' => 'futebol-7'];
        if (isset($aliases[$sportSlug]))
            $sportSlug = $aliases[$sportSlug];

        if ($championship && !empty($championship->art_settings)) {
            $settings = $championship->art_settings;
            if (isset($settings[$sportSlug][$category]))
                return $settings[$sportSlug][$category];
            if (isset($settings[$sport][$category]))
                return $settings[$sport][$category];
            if ($category === 'jogo_programado' && isset($settings[$sportSlug]['confronto']))
                return $settings[$sportSlug]['confronto'];
        }

        if ($club && !empty($club->art_settings)) {
            $s = $club->art_settings;
            if (isset($s[$sportSlug][$category]))
                return $s[$sportSlug][$category];
            if (isset($s[$sport][$category]))
                return $s[$sport][$category];
            if ($category === 'jogo_programado' && isset($s[$sportSlug]['confronto']))
                return $s[$sportSlug]['confronto'];
        }

        $sysKey = "default_art_{$sport}_{$category}";
        if ($s = SystemSetting::where('key', $sysKey)->first()) if ($s->value)
            return $s->value;

        if ($category === 'jogo_programado') {
            $slug = Str::slug($sport, '_');
            foreach (["{$slug}_jogo_programado.jpg", str_replace('_', '', $slug) . "_jogo_programado.jpg", str_replace('_', '-', $slug) . "_jogo_programado.jpg"] as $f) {
                if (file_exists($this->templatesPath . $f))
                    return $f;
            }
            if (str_contains($sport, 'volei'))
                return 'volei_confronto.jpg';
            if (file_exists($this->templatesPath . "confronto_{$slug}.jpg"))
                return "confronto_{$slug}.jpg";
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
                'estreante' => 'volei_melhor_estreante.jpg'
            ];
            return $map[$category] ?? 'volei_melhor_quadra.jpg';
        }

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
            'estreante' => 'fundo_melhor_estreiante.jpg'
        ];
        return $map[$category] ?? 'fundo_craque_do_jogo.jpg';
    }

    public function outputImage($img, $filename)
    {
        ob_start();
        imagejpeg($img, null, 90);
        $content = ob_get_clean();
        imagedestroy($img);
        return response($content)
            ->header('Content-Type', 'image/jpeg')
            ->header('Content-Disposition', 'inline; filename="' . $filename . '.jpg"');
    }

    public function pathToUrl($path)
    {
        if (empty($path))
            return '';
        if (str_starts_with($path, 'http'))
            return $path;
        $path = str_replace('\\', '/', $path);
        if (str_contains($path, 'storage/')) {
            $rel = substr($path, strpos($path, 'storage/'));
            return url($rel);
        }
        return url('storage/' . $path);
    }

    public function urlToPath($url)
    {
        if (empty($url))
            return null;
        $parsed = parse_url($url);
        $path = $parsed['path'] ?? $url;
        $path = urldecode($path);

        if (strpos($path, '/assets-templates/') !== false) {
            $rel = substr($path, strpos($path, '/assets-templates/'));
            return public_path($rel);
        }
        if (strpos($path, '/storage/') !== false) {
            $rel = substr($path, strpos($path, '/storage/'));
            $rel = str_replace('/storage/', '', $rel);
            return storage_path('app/public/' . $rel);
        }
        return $path;
    }
}
