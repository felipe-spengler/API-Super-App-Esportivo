<?php

namespace App\Http\Controllers\Admin\Traits;

/**
 * ArtMatchTrait
 * Geração de artes de partidas: Confronto, Jogo Programado, Classificação.
 */
trait ArtMatchTrait
{
    private function generateScheduledArt($match, $club = null, $championship = null)
    {
        $sport = $match->championship->sport->name ?? 'Futebol';
        if (!$championship)
            $championship = $match->championship;

        $bgFile = $this->getBackgroundFile($sport, 'jogo_programado', $club, $championship);
        $templateKey = 'art_layout_scheduled_feed';
        $templateData = null;

        if ($championship && !empty($championship->art_settings['templates'][$templateKey])) {
            $templateData = $championship->art_settings['templates'][$templateKey];
        } elseif ($club && !empty($club->art_settings['templates'][$templateKey])) {
            $templateData = $club->art_settings['templates'][$templateKey];
        } else {
            $templateData = $this->getDefaultTemplate($templateKey);
        }

        if ($templateData) {
            if (!empty($templateData['bg_url'])) {
                $customBg = $this->urlToPath($templateData['bg_url']);
                if (file_exists($customBg))
                    $bgFile = $customBg;
            }
            $default = $this->getDefaultTemplate($templateKey);
            if ($default && isset($default['elements'])) {
                $existingIds = array_column($templateData['elements'] ?? [], 'id');
                foreach ($default['elements'] as $defEl) {
                    if (isset($defEl['id']) && !in_array($defEl['id'], $existingIds)) {
                        $templateData['elements'][] = $defEl;
                    }
                }
            }
        }

        $img = $this->initImage($bgFile);
        if (!$img)
            return response("Erro fundo: " . basename($bgFile), 500);

        if ($templateData) {
            $elements = $templateData['elements'];
            $replacements = [
                '{CAMPEONATO}' => mb_strtoupper($match->championship->name),
                '{RODADA}' => mb_strtoupper($match->round_name ?? "RODADA " . ($match->round_number ?? 1)),
                'X' => 'X',
                'DD/MM HH:MM' => \Carbon\Carbon::parse($match->start_time)->setTimezone('America/Sao_Paulo')->translatedFormat('d/m H:i'),
                'Local da Partida' => mb_strtoupper($match->location ?? 'LOCAL A DEFINIR'),
                '{TC}' => mb_strtoupper($match->homeTeam->name),
                '{TF}' => mb_strtoupper($match->awayTeam->name),
            ];
            $replacements['team_a'] = $this->getTeamLogoPath($match->homeTeam);
            $replacements['team_b'] = $this->getTeamLogoPath($match->awayTeam);

            $this->renderDynamicElements($img, $elements, $replacements);
            return $this->outputImage($img, 'jogo_programado_' . $match->id);
        }

        // Legacy rendering
        $width = imagesx($img);
        $height = imagesy($img);

        $primaryColorStr = $club->primary_color ?? '#FFB700';
        $secondaryColorStr = $club->secondary_color ?? '#FFFFFF';
        $pRGB = $this->hexToRgb($primaryColorStr);
        $sRGB = $this->hexToRgb($secondaryColorStr);

        $primaryColor = imagecolorallocate($img, $pRGB['r'], $pRGB['g'], $pRGB['b']);
        $secondaryColor = imagecolorallocate($img, $sRGB['r'], $sRGB['g'], $sRGB['b']);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);

        $drawText = function ($size, $y, $color, $text, $useSecFont) use ($img, $width, $black) {
            $this->drawCenteredText($img, $size, $y + 4, $black, $text, $useSecFont);
            $this->drawCenteredText($img, $size, $y, $color, $text, $useSecFont);
        };

        $drawTextAt = function ($size, $xCenter, $y, $color, $text, $useSecFont) use ($img, $black) {
            $font = $useSecFont ? $this->secondaryFontPath : $this->fontPath;
            $box = imagettfbbox($size, 0, $font, $text);
            $textWidth = $box[2] - $box[0];
            $x = $xCenter - ($textWidth / 2);
            imagettftext($img, $size, 0, $x + 3, $y + 3, $black, $font, $text);
            imagettftext($img, $size, 0, $x, $y, $color, $font, $text);
        };

        $sport = $match->championship->sport->name ?? 'Futebol';
        $isStory = $height > $width;
        $champName = mb_strtoupper($match->championship->name);

        $yTop = $isStory ? 250 : 100;
        $ySport = $isStory ? 350 : 190;
        $yRound = $isStory ? 450 : 280;

        $drawText($isStory ? 45 : 35, $yTop, $secondaryColor, $champName, true);
        $drawText($isStory ? 80 : 65, $ySport, $primaryColor, mb_strtoupper($sport), false);

        $roundText = mb_strtoupper($match->round_name ?? "RODADA " . ($match->round_number ?? 1));
        $drawText($isStory ? 40 : 30, $yRound, $secondaryColor, $roundText, true);

        $badgeSize = $isStory ? 400 : (abs($width - $height) < 100 ? 300 : 380);
        $yBadges = ($height / 2) - ($badgeSize / 2) - ($isStory ? 0 : 40);
        $centerDist = $isStory ? 280 : 320;

        $xA = ($width / 2) - $centerDist - ($badgeSize / 2);
        $this->drawTeamBadge($img, $match->homeTeam, $xA, $yBadges, $badgeSize, $secondaryColor);

        $xCenterA = $xA + ($badgeSize / 2);
        $yName = $yBadges + $badgeSize + ($isStory ? 55 : 45);
        $drawTextAt($isStory ? 35 : 28, $xCenterA, $yName, $secondaryColor, mb_strtoupper($match->homeTeam->name), false);

        $xB = ($width / 2) + $centerDist - ($badgeSize / 2);
        $this->drawTeamBadge($img, $match->awayTeam, $xB, $yBadges, $badgeSize, $secondaryColor);

        $xCenterB = $xB + ($badgeSize / 2);
        $drawTextAt($isStory ? 35 : 28, $xCenterB, $yName, $secondaryColor, mb_strtoupper($match->awayTeam->name), false);

        $drawText($isStory ? 80 : 60, $yBadges + ($badgeSize / 2) + 20, $primaryColor, "X", false);

        $yLoc = $isStory ? ($height - 250) : ($height - 80);
        $yDate = $yLoc - ($isStory ? 100 : 80);

        $dateStr = \Carbon\Carbon::parse($match->start_time)->setTimezone('America/Sao_Paulo')->translatedFormat('d \d\e F \à\s H:i');
        $location = mb_strtoupper($match->location ?? 'LOCAL A DEFINIR');

        $dateSize = $isStory ? 60 : 50;
        $locSize = $isStory ? 40 : 35;

        $drawText($dateSize, $yDate, $primaryColor, mb_strtoupper($dateStr), false);
        $drawText($locSize, $yLoc, $secondaryColor, $location, true);

        return $this->outputImage($img, 'jogo_programado_' . $match->id);
    }

    private function generateConfrontationArt($match, $club = null, $championship = null)
    {
        $sport = $match->championship->sport->name ?? 'Futebol';
        if (!$championship)
            $championship = $match->championship;

        $bgFile = $this->getBackgroundFile($sport, 'confronto', $club, $championship);
        $templateKey = 'art_layout_faceoff';
        $templateData = null;

        if ($championship && !empty($championship->art_settings['templates'][$templateKey])) {
            $templateData = $championship->art_settings['templates'][$templateKey];
        } elseif ($club && !empty($club->art_settings['templates'][$templateKey])) {
            $templateData = $club->art_settings['templates'][$templateKey];
        } else {
            $templateData = $this->getDefaultTemplate($templateKey);
        }

        if ($templateData) {
            if (!empty($templateData['bg_url'])) {
                $customBg = $this->urlToPath($templateData['bg_url']);
                if (file_exists($customBg))
                    $bgFile = $customBg;
            }
            $default = $this->getDefaultTemplate($templateKey);
            if ($default && isset($default['elements'])) {
                $existingIds = array_column($templateData['elements'] ?? [], 'id');
                foreach ($default['elements'] as $defEl) {
                    if (isset($defEl['id']) && !in_array($defEl['id'], $existingIds)) {
                        $templateData['elements'][] = $defEl;
                    }
                }
            }
        }

        $img = $this->initImage($bgFile);
        if (!$img)
            return response("Erro fundo: " . basename($bgFile), 500);

        if ($templateData) {
            $elements = $templateData['elements'];

            $scorersHomeEl = null;
            $scorersAwayEl = null;
            foreach ($elements as $key => $el) {
                if (isset($el['id']) && $el['id'] === 'scorers_home') {
                    $scorersHomeEl = $el;
                    unset($elements[$key]);
                }
                if (isset($el['id']) && $el['id'] === 'scorers_away') {
                    $scorersAwayEl = $el;
                    unset($elements[$key]);
                }
            }

            $replacements = [
                '{CAMPEONATO}' => mb_strtoupper($match->championship->name),
                '{RODADA}' => mb_strtoupper($match->round_name ?? "RODADA " . ($match->round_number ?? 1)),
                'X' => 'X',
                'DD/MM HH:MM' => \Carbon\Carbon::parse($match->start_time)->setTimezone('America/Sao_Paulo')->translatedFormat('d/m H:i'),
                'Local da Partida' => mb_strtoupper($match->location ?? 'LOCAL A DEFINIR'),
                '{PC}' => $match->home_score ?? 0,
                '{PF}' => $match->away_score ?? 0,
                '{TC}' => mb_strtoupper($match->homeTeam->name),
                '{TF}' => mb_strtoupper($match->awayTeam->name),
            ];
            $replacements['team_a'] = $this->getTeamLogoPath($match->homeTeam);
            $replacements['team_b'] = $this->getTeamLogoPath($match->awayTeam);

            $this->renderDynamicElements($img, $elements, $replacements);

            if ($scorersHomeEl || $scorersAwayEl) {
                $this->drawScorersList($img, $match, $scorersHomeEl, $scorersAwayEl);
            }

            return $this->outputImage($img, 'confronto_' . $match->id);
        }

        // Legacy rendering
        $width = imagesx($img);
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

        $homeTeam = $match->homeTeam;
        $awayTeam = $match->awayTeam;
        $placar = ($match->home_score ?? 0) . ' x ' . ($match->away_score ?? 0);

        $badgeSize = 300;
        $yBadges = 1170 - 280;
        $centerDist = 400;

        $xA = 102 + ($width / 2) - $centerDist - ($badgeSize / 2);
        $this->drawTeamBadge($img, $homeTeam, $xA, $yBadges, $badgeSize, $secondaryColor);

        $xB = -94 + ($width / 2) + $centerDist - ($badgeSize / 2);
        $this->drawTeamBadge($img, $awayTeam, $xB, $yBadges, $badgeSize, $secondaryColor);

        $placarY = 1170 + 130;
        $placarSize = 100;
        list($scoreA, $scoreB) = explode(' x ', $placar);

        $shadowOffset = 5;
        imagettftext($img, $placarSize, 0, -145 + ($width / 2) - 180 + $shadowOffset, $placarY + $shadowOffset, $black, $this->fontPath, trim($scoreA));
        imagettftext($img, $placarSize, 0, -145 + ($width / 2) - 180, $placarY, $primaryColor, $this->fontPath, trim($scoreA));
        imagettftext($img, $placarSize, 0, ($width / 2) + 180 + 80 + $shadowOffset, $placarY + $shadowOffset, $black, $this->fontPath, trim($scoreB));
        imagettftext($img, $placarSize, 0, ($width / 2) + 180 + 80, $placarY, $primaryColor, $this->fontPath, trim($scoreB));

        $champName = mb_strtoupper($match->championship->name);
        $roundName = mb_strtoupper($match->round_name ?? 'Rodada');
        $drawText(40, 1600, $secondaryColor, $champName, true);
        $drawText(30, 1660, $primaryColor, $roundName, true);

        // Goleadores legacy
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
        if (file_exists($ballPath))
            $ballImg = @imagecreatefrompng($ballPath);

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

        $tamanho_fonte_goleadores = 40;
        $y_goleadores = 1170 + 200;
        $x_goleadores_a = ($width / 2) - $centerDist - 50;
        $x_goleadores_b = ($width / 2) + $centerDist + 50;
        $tamanho_bola = 40;
        $espacamento_bola = 5;

        $red = imagecolorallocate($img, 255, 0, 0);
        $offset_y_a = 0;
        foreach ($scorersA as $name => $goalsArray) {
            $count = count($goalsArray);
            $x_current = $x_goleadores_a;
            for ($i = 0; $i < $count; $i++) {
                $isOwn = $goalsArray[$i];
                $currentBall = $isOwn ? $ballRedImg : $ballImg;
                if ($currentBall) {
                    imagecopyresampled($img, $currentBall, $x_current - ($count - 1) * $tamanho_bola, $y_goleadores + $offset_y_a - $tamanho_bola, 0, 0, $tamanho_bola, $tamanho_bola, imagesx($currentBall), imagesy($currentBall));
                } else {
                    $color = $isOwn ? $red : $white;
                    imagefilledellipse($img, $x_current - ($count - 1) * $tamanho_bola + ($tamanho_bola / 2), $y_goleadores + $offset_y_a - $tamanho_bola + ($tamanho_bola / 2), $tamanho_bola, $tamanho_bola, $color);
                }
                $x_current += $tamanho_bola + $espacamento_bola;
            }
            $x_text = $x_goleadores_a + $tamanho_bola + $espacamento_bola + 10;
            imagettftext($img, $tamanho_fonte_goleadores, 0, $x_text + 2, $y_goleadores + $offset_y_a + 2, $black, $this->fontPath, mb_strtoupper($name));
            imagettftext($img, $tamanho_fonte_goleadores, 0, $x_text, $y_goleadores + $offset_y_a, $white, $this->fontPath, mb_strtoupper($name));
            $offset_y_a += 50;
        }

        $offset_y_b = 0;
        foreach ($scorersB as $name => $goalsArray) {
            $count = count($goalsArray);
            $x_current = $x_goleadores_b;
            for ($i = 0; $i < $count; $i++) {
                $isOwn = $goalsArray[$i];
                $currentBall = $isOwn ? $ballRedImg : $ballImg;
                if ($currentBall) {
                    imagecopyresampled($img, $currentBall, $x_current - ($count - 1) * $tamanho_bola, $y_goleadores + $offset_y_b - $tamanho_bola, 0, 0, $tamanho_bola, $tamanho_bola, imagesx($currentBall), imagesy($currentBall));
                } else {
                    $color = $isOwn ? $red : $white;
                    imagefilledellipse($img, $x_current - ($count - 1) * $tamanho_bola + ($tamanho_bola / 2), $y_goleadores + $offset_y_b - $tamanho_bola + ($tamanho_bola / 2), $tamanho_bola, $tamanho_bola, $color);
                }
                $x_current += $tamanho_bola + $espacamento_bola;
            }
            $x_text = $x_goleadores_b + $tamanho_bola + $espacamento_bola + 10;
            imagettftext($img, $tamanho_fonte_goleadores, 0, $x_text + 2, $y_goleadores + $offset_y_b + 2, $black, $this->fontPath, mb_strtoupper($name));
            imagettftext($img, $tamanho_fonte_goleadores, 0, $x_text, $y_goleadores + $offset_y_b, $white, $this->fontPath, mb_strtoupper($name));
            $offset_y_b += 50;
        }

        if ($ballImg)
            imagedestroy($ballImg);
        if ($ballRedImg)
            imagedestroy($ballRedImg);

        return $this->outputImage($img, 'confronto_' . $match->id);
    }
}
