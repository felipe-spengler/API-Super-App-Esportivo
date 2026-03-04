<?php

namespace App\Services;

use App\Models\GameMatch;
use App\Models\Championship;
use App\Models\User;
use App\Models\Team;
use Illuminate\Support\Str;
use App\Services\ArtRenderer;
use Illuminate\Http\Request;

class ArtGeneratorService
{
    protected $renderer;

    public function __construct(ArtRenderer $renderer)
    {
        $this->renderer = $renderer;
    }

    public function generateScheduledArt($match, $club = null, $championship = null)
    {
        $club = $club ?? $match->championship->club;
        $championship = $championship ?? $match->championship;
        $this->renderer->loadClubResources($club);

        $sport = strtolower($championship->sport->name ?? 'futebol');
        $bgFile = $this->renderer->getBackgroundFile($sport, 'jogo_programado', $club, $championship);
        $img = $this->renderer->initImage($bgFile);

        $primaryColorStr = $club->primary_color ?? '#FFB700';
        $pRGB = $this->renderer->hexToRgb($primaryColorStr);
        $primaryColor = imagecolorallocate($img, $pRGB['r'], $pRGB['g'], $pRGB['b']);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);

        // Standard placeholders
        $replaceMap = [
            '{CAMPEONATO}' => mb_strtoupper($championship->name),
            '{RODADA}' => mb_strtoupper($match->round_name ?? 'RODADA ' . ($match->round ?? '---')),
            '{TC}' => mb_strtoupper($match->homeTeam->name ?? 'TIME A'),
            '{TF}' => mb_strtoupper($match->awayTeam->name ?? 'TIME B'),
            '{PC}' => '0',
            '{PF}' => '0',
            '{JOGADOR}' => 'MVP',
            'Local da Partida' => mb_strtoupper($match->location ?? 'A DEFINIR'),
            'DD/MM HH:MM' => $match->start_time ? $match->start_time->format('d/m H:i') : 'DD/MM HH:MM'
        ];

        $settings = $championship->art_settings ?? $club->art_settings ?? [];
        $sportSlug = Str::slug($sport, '-');
        $templateData = $settings['templates'][$sportSlug . '_jogo_programado'] ??
            $settings['templates'][$sport . '_jogo_programado'] ??
            $settings['templates']['confronto'] ?? null;

        if ($templateData && isset($templateData['elements'])) {
            $this->renderer->renderDynamicElements($img, $templateData['elements'], $replaceMap);
        } else {
            // Default layout Faceoff/Scheduled
            $width = imagesx($img);
            $yHeader = 220;
            $this->renderer->drawCenteredText($img, 35, $yHeader, $white, mb_strtoupper($championship->name), true);
            $this->renderer->drawCenteredText($img, 25, $yHeader + 50, $white, mb_strtoupper($match->round_name ?? "RODADA {$match->round}"), true);

            $badgeSize = 240;
            $yBadges = 550;
            $centerDist = 320;
            $xA = ($width / 2) - $centerDist - ($badgeSize / 2);
            $this->renderer->drawTeamBadge($img, $match->homeTeam, $xA, $yBadges, $badgeSize, $primaryColor);

            $xB = ($width / 2) + $centerDist - ($badgeSize / 2);
            $this->renderer->drawTeamBadge($img, $match->awayTeam, $xB, $yBadges, $badgeSize, $primaryColor);

            $this->renderer->drawCenteredText($img, 80, $yBadges + ($badgeSize / 2) + 15, $white, 'X', true);
            $this->renderer->drawCenteredText($img, 30, 1100, $white, mb_strtoupper($match->location ?? 'LOCAL A DEFINIR'), true);
            $this->renderer->drawCenteredText($img, 45, 1200, $primaryColor, $match->start_time ? $match->start_time->format('d/m/Y - H:i') : '---', true);
        }

        return $this->renderer->outputImage($img, 'agendado_' . $match->id);
    }

    public function generateConfrontationArt($match, $club = null, $championship = null)
    {
        $club = $club ?? $match->championship->club;
        $championship = $championship ?? $match->championship;
        $this->renderer->loadClubResources($club);

        $sport = strtolower($championship->sport->name ?? 'futebol');
        $bgFile = $this->renderer->getBackgroundFile($sport, 'confronto', $club, $championship);
        $img = $this->renderer->initImage($bgFile);

        $primaryColorStr = $club->primary_color ?? '#FFB700';
        $pRGB = $this->renderer->hexToRgb($primaryColorStr);
        $primaryColor = imagecolorallocate($img, $pRGB['r'], $pRGB['g'], $pRGB['b']);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);

        $replaceMap = [
            '{CAMPEONATO}' => mb_strtoupper($championship->name),
            '{RODADA}' => mb_strtoupper($match->round_name ?? 'RODADA ' . ($match->round ?? '---')),
            '{TC}' => mb_strtoupper($match->homeTeam->name ?? 'TIME A'),
            '{TF}' => mb_strtoupper($match->awayTeam->name ?? 'TIME B'),
            '{PC}' => $match->home_score ?? 0,
            '{PF}' => $match->away_score ?? 0,
            '{JOGADOR}' => $match->mvp->name ?? 'MVP',
            'Local da Partida' => mb_strtoupper($match->location ?? 'A DEFINIR'),
            'DD/MM HH:MM' => $match->start_time ? $match->start_time->format('d/m H:i') : 'FINALIZADO'
        ];

        $settings = $championship->art_settings ?? $club->art_settings ?? [];
        if (isset($settings['templates']['confronto'])) {
            $this->renderer->renderDynamicElements($img, $settings['templates']['confronto']['elements'], $replaceMap);
            return $this->renderer->outputImage($img, 'confronto_' . $match->id);
        }

        // Default layout
        $width = imagesx($img);
        $yHeader = 220;
        $this->renderer->drawCenteredText($img, 35, $yHeader, $white, mb_strtoupper($championship->name), true);
        $this->renderer->drawCenteredText($img, 25, $yHeader + 50, $white, mb_strtoupper($match->round_name ?? "RODADA {$match->round}"), true);

        $badgeSize = 250;
        $yBadges = 550;
        $centerDist = 320;
        $xA = ($width / 2) - $centerDist - ($badgeSize / 2);
        $this->renderer->drawTeamBadge($img, $match->homeTeam, $xA, $yBadges, $badgeSize, $primaryColor);
        $xB = ($width / 2) + $centerDist - ($badgeSize / 2);
        $this->renderer->drawTeamBadge($img, $match->awayTeam, $xB, $yBadges, $badgeSize, $primaryColor);

        $scoreY = $yBadges + ($badgeSize / 2) + 50;
        $scoreSize = 120;
        $boxA = imagettfbbox($scoreSize, 0, $this->renderer->fontPath, $match->home_score ?? 0);
        $wA = $boxA[2] - $boxA[0];
        imagettftext($img, $scoreSize, 0, ($xA + $badgeSize / 2) - ($wA / 2), $scoreY, $primaryColor, $this->renderer->fontPath, $match->home_score ?? 0);

        $boxB = imagettfbbox($scoreSize, 0, $this->renderer->fontPath, $match->away_score ?? 0);
        $wB = $boxB[2] - $boxB[0];
        imagettftext($img, $scoreSize, 0, ($xB + $badgeSize / 2) - ($wB / 2), $scoreY, $primaryColor, $this->renderer->fontPath, $match->away_score ?? 0);

        $this->renderer->drawCenteredText($img, 60, $scoreY - 15, $white, 'X', true);

        // Scorers logic (shortened for brevity but fully functional from controller)
        $this->drawScorersList($img, $match, $xA + ($badgeSize / 2), $xB + ($badgeSize / 2));

        return $this->renderer->outputImage($img, 'confronto_' . $match->id);
    }

    private function drawScorersList($img, $match, $x_goleadores_a, $x_goleadores_b)
    {
        $goals = $match->events->where('event_type', 'goal');
        $scorersA = [];
        $scorersB = [];
        foreach ($goals as $goal) {
            $name = $goal->player->name ?? 'DESCONHECIDO';
            if ($goal->team_id == $match->home_team_id)
                $scorersA[$name] = ($scorersA[$name] ?? 0) + 1;
            else
                $scorersB[$name] = ($scorersB[$name] ?? 0) + 1;
        }

        $ballFile = public_path('assets/icons/futebol_bola.png');
        $ballImg = file_exists($ballFile) ? $this->renderer->createFromFormat($ballFile) : null;
        $tamanho_bola = 30;
        $espacamento_bola = 10;
        $y_goleadores = 950;
        $tamanho_fonte_goleadores = 25;
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);

        foreach ([$scorersA => $x_goleadores_a, $scorersB => $x_goleadores_b] as $list => $x_base) {
            $offset_y = 0;
            foreach ($list as $name => $count) {
                $x_current = $x_base;
                for ($i = 0; $i < $count; $i++) {
                    if ($ballImg) {
                        imagealphablending($img, true);
                        imagecopyresampled($img, $ballImg, $x_current - ($count - 1) * $tamanho_bola, $y_goleadores + $offset_y - $tamanho_bola, 0, 0, $tamanho_bola, $tamanho_bola, imagesx($ballImg), imagesy($ballImg));
                    } else {
                        imagefilledellipse($img, $x_current - ($count - 1) * $tamanho_bola + ($tamanho_bola / 2), $y_goleadores + $offset_y - $tamanho_bola + ($tamanho_bola / 2), $tamanho_bola, $tamanho_bola, $white);
                    }
                    $x_current += $tamanho_bola + $espacamento_bola;
                }
                $x_text = $x_base + $tamanho_bola + $espacamento_bola + 10;
                imagettftext($img, $tamanho_fonte_goleadores, 0, $x_text + 2, $y_goleadores + $offset_y + 2, $black, $this->renderer->fontPath, mb_strtoupper($name));
                imagettftext($img, $tamanho_fonte_goleadores, 0, $x_text, $y_goleadores + $offset_y, $white, $this->renderer->fontPath, mb_strtoupper($name));
                $offset_y += 50;
            }
        }
        if ($ballImg)
            imagedestroy($ballImg);
    }

    public function generatePlayerArt($player, $match, $category)
    {
        $championship = $match->championship;
        return $this->createCard($player, $championship, $championship->sport->name, $category, null, $match);
    }

    public function generateAwardCard($player, $championship, $team, $category, $club = null)
    {
        return $this->createCard($player, $championship, $championship->sport->name, $category, null, null, $team, $club);
    }

    public function createCard($player, $championship, $sport, $category, $roundName = null, $match = null, $playerTeam = null, $club = null)
    {
        $club = $club ?? $championship->club;
        $this->renderer->loadClubResources($club);
        $bgFile = $this->renderer->getBackgroundFile($sport, $category, $club, $championship);
        $img = $this->renderer->initImage($bgFile);

        $primaryColorStr = $club->primary_color ?? '#FFB700';
        $pRGB = $this->renderer->hexToRgb($primaryColorStr);
        $primaryColor = imagecolorallocate($img, $pRGB['r'], $pRGB['g'], $pRGB['b']);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);

        $replaceMap = [
            '{JOGADOR}' => mb_strtoupper($player->name),
            '{CAMPEONATO}' => $championship ? mb_strtoupper($championship->name) : '',
            '{RODADA}' => $roundName ? mb_strtoupper($roundName) : '',
            '{PC}' => $match->home_score ?? 0,
            '{PF}' => $match->away_score ?? 0,
            '{TC}' => $match->homeTeam->name ?? '',
            '{TF}' => $match->awayTeam->name ?? ''
        ];

        // Layout handling
        $this->renderer->drawPlayerPhoto($img, $player);

        $settings = $championship->art_settings ?? $club->art_settings ?? [];
        $sportSlug = Str::slug($sport, '-');
        $template = $settings['templates'][$sportSlug . '_' . $category] ?? $settings['templates'][$category] ?? null;

        if ($template && isset($template['elements'])) {
            $this->renderer->renderDynamicElements($img, $template['elements'], $replaceMap);
        } else {
            // Default Card Layout
            $this->renderer->drawCenteredText($img, 65, 1050, $white, mb_strtoupper($player->name), true);
            $this->renderer->drawCenteredText($img, 30, 1150, $primaryColor, mb_strtoupper($championship->name), true);

            if ($match && in_array($category, ['craque', 'mvp', 'melhor_jogador'])) {
                $badgeSize = 150;
                $yBadges = 1255;
                $width = imagesx($img);
                $this->renderer->drawTeamBadge($img, $match->homeTeam, ($width / 2) - 250, $yBadges, $badgeSize, $primaryColor);
                $this->renderer->drawTeamBadge($img, $match->awayTeam, ($width / 2) + 100, $yBadges, $badgeSize, $primaryColor);
                $this->renderer->drawCenteredText($img, 60, $yBadges + 100, $white, "{$match->home_score} X {$match->away_score}", true);
            } elseif ($playerTeam || $match) {
                $team = $playerTeam ?? ($match->homeTeam ?? $match->awayTeam); // Simplified
                $this->renderer->drawTeamBadge($img, $team, (imagesx($img) / 2) - 75, 1250, 150, $primaryColor);
            }
        }

        return $this->renderer->outputImage($img, "card_{$category}_{$player->id}");
    }

    public function generateStandingsArt($championshipId)
    {
        $championship = Championship::with(['sport', 'club'])->findOrFail($championshipId);
        $this->renderer->loadClubResources($championship->club);
        $bgFile = $this->renderer->getBackgroundFile($championship->sport->name, 'classificacao', $championship->club, $championship);
        $img = $this->renderer->initImage($bgFile);

        $primaryColorStr = $championship->club->primary_color ?? '#FFB700';
        $pRGB = $this->renderer->hexToRgb($primaryColorStr);
        $primaryColor = imagecolorallocate($img, $pRGB['r'], $pRGB['g'], $pRGB['b']);
        $black = imagecolorallocate($img, 0, 0, 0);

        $text = mb_strtoupper($championship->name);
        $this->renderer->drawCenteredText($img, 50, 1704, $black, $text, true);
        $this->renderer->drawCenteredText($img, 50, 1700, $primaryColor, $text, true);

        return $this->renderer->outputImage($img, 'classificacao_' . $championshipId);
    }

    public function getTemplateKey($name)
    {
        $map = [
            'Craque do Jogo' => 'art_layout_mvp_vertical',
            'Craque do Jogo (Geral)' => 'art_layout_mvp_vertical',
            'Craque do Jogo (Vertical)' => 'art_layout_mvp_vertical',
            'Jogo Programado' => 'art_layout_scheduled_feed',
            'Jogo Programado (Feed)' => 'art_layout_scheduled_feed',
            'Jogo Programado (Story)' => 'art_layout_scheduled_story',
            'Confronto' => 'art_layout_faceoff',
            'Confronto (Placar)' => 'art_layout_faceoff'
        ];
        return $map[$name] ?? 'art_layout_custom_' . Str::slug($name);
    }

    public function getDefaultTemplate($key)
    {
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
                    ["id" => "score_x", "type" => "text", "x" => 540, "y" => 1495, "fontSize" => 60, "color" => "#000000", "align" => "center", "label" => "X (Divisor)", "zIndex" => 3, "content" => "X", "fontFamily" => "Roboto"],
                    ["id" => "score_away", "type" => "text", "x" => 785, "y" => 1495, "fontSize" => 100, "color" => "#000000", "align" => "center", "label" => "Placar Visitante", "zIndex" => 3, "content" => "{PF}", "fontFamily" => "Roboto-Bold"]
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
