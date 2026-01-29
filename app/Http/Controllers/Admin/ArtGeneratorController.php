<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GameMatch;
use Illuminate\Support\Str;

class ArtGeneratorController extends Controller
{
    private $fontPath;
    private $templatesPath;

    public function __construct()
    {
        $this->fontPath = public_path('assets/fonts/Roboto-Bold.ttf');
        $this->templatesPath = public_path('assets/templates/');
    }

    /**
     * Gera Arte Dinâmica
     * Rota: /public/art/match/{matchId}/download?type={mvp|confrontation|player}&category={goleiro|levatadora|etc}
     */
    public function downloadArt($matchId, Request $request)
    {
        $type = $request->query('type', 'mvp');
        $category = $request->query('category', 'craque'); // Usado para selecionar fundo específico

        $match = GameMatch::with(['homeTeam', 'awayTeam', 'mvpPlayer', 'championship', 'championship.sport'])->findOrFail($matchId);

        // Define Layout e Fundo
        if ($type === 'confrontation') {
            return $this->generateConfrontationArt($match);
        } else {
            // Player Art (MVP ou Position Specific)
            return $this->generatePlayerArt($match, $category);
        }
    }

    private function generateConfrontationArt($match)
    {
        // Fundo
        $bgFile = 'fundo_confronto.jpg';
        $img = $this->initImage($bgFile);
        if (!$img)
            return response("Erro fundo: $bgFile", 500);

        $width = imagesx($img);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 30, 30, 30);

        // Dados
        $homeTeam = $match->homeTeam;
        $awayTeam = $match->awayTeam;
        $placar = ($match->home_score ?? 0) . ' x ' . ($match->away_score ?? 0);

        // 1. Brasões Grandes
        $badgeSize = 300;
        $yBadges = 1170 - 280; // Ajuste baseado no legado (1170 base - offset)
        $centerDist = 400;

        // Team A (Left)
        $xA = 102 + ($width / 2) - $centerDist - ($badgeSize / 2);
        $this->drawTeamBadge($img, $homeTeam, $xA, $yBadges, $badgeSize, $black);

        // Team B (Right)
        $xB = -94 + ($width / 2) + $centerDist - ($badgeSize / 2);
        $this->drawTeamBadge($img, $awayTeam, $xB, $yBadges, $badgeSize, $white);

        // 2. Placar
        $placarY = 1170 + 130;
        $placarSize = 80;
        list($scoreA, $scoreB) = explode(' x ', $placar);
        // Ajuste fino de posição do legado
        imagettftext($img, $placarSize, 0, -145 + ($width / 2) - 180, $placarY, $white, $this->fontPath, trim($scoreA));
        imagettftext($img, $placarSize, 0, ($width / 2) + 180 + 80, $placarY, $white, $this->fontPath, trim($scoreB));

        // 3. Campeonato e Rodada
        $champName = mb_strtoupper($match->championship->name);
        $roundName = mb_strtoupper($match->round_name ?? 'Rodada');

        $this->drawCenteredText($img, 40, 1700, $white, $champName);
        $this->drawCenteredText($img, 30, 1750, $white, $roundName);

        return $this->outputImage($img, 'confronto_' . $match->id);
    }

    private function generatePlayerArt($match, $category)
    {
        $player = $match->mvpPlayer;
        // Se for MVP genérico e não tiver player definido, erro (ou fallback)
        if (!$player)
            return response('Jogador não definido.', 404);

        // --- Seleção de Fundo Inteligente ---
        $sport = strtolower($match->championship->sport->name ?? 'futebol'); // 'futebol', 'volei', etc
        $bgFile = $this->getBackgroundFile($sport, $category);

        $img = $this->initImage($bgFile);
        if (!$img)
            return response("Erro fundo: $bgFile", 500);

        $width = imagesx($img);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 30, 30, 30);

        // --- 1. Foto do Jogador ---
        $this->drawPlayerPhoto($img, $player);

        // --- 2. Textos (Nome, Camp, Rodada) ---
        // Título da Categoria é parte do fundo ou desenhado? 
        // No legado alguns scripts desenham, outros assumem que o fundo já tem.
        // O script `gerar_melhor_goleiro` desenha o nome, mas comenta a categoria.
        // O `craque_volei` desenha categoria. Vamos padronizar: Desenhar se não for 'craque' padrão.

        $playerName = mb_strtoupper($player->name);
        $this->drawCenteredText($img, 70, 1230, $white, $playerName);

        $champName = mb_strtoupper($match->championship->name);
        $this->drawCenteredText($img, 40, 1700, $white, $champName);

        $roundName = mb_strtoupper($match->round_name ?? 'Rodada');
        $this->drawCenteredText($img, 30, 1750, $white, $roundName);

        // Desenha categoria se for Volei (legado desenha)
        if ($sport == 'volei' || $sport == 'volleyball') {
            $catTitle = mb_strtoupper(str_replace('_', ' ', $category));
            $this->drawCenteredText($img, 50, 1150, $white, $catTitle);
        }


        // --- 3. Layout Específico: Placar vs Só Brasão ---
        // Se for "craque" ou "mvp", geralmente tem placar (Confronto Direto).
        // Se for "Melhor Goleiro", "Levantadora", etc, geralmente é destaque individual (Só brasão do jogador).

        $isFullMatchStats = in_array($category, ['craque', 'mvp', 'melhor_jogador', 'melhor_quadra']);

        if ($isFullMatchStats) {
            // Layout MVP: 2 Brasões + Placar
            $badgeSize = 150;
            $yBadges = 1535 - 280;
            $centerDist = 350;

            // Team A
            $xA = 102 + ($width / 2) - $centerDist - ($badgeSize / 2);
            $this->drawTeamBadge($img, $match->homeTeam, $xA, $yBadges, $badgeSize, $black);

            // Team B
            $xB = -94 + ($width / 2) + $centerDist - ($badgeSize / 2);
            $this->drawTeamBadge($img, $match->awayTeam, $xB, $yBadges, $badgeSize, $white);

            // Score
            $scoreY = 1535;
            $scoreA = $match->home_score ?? 0;
            $scoreB = $match->away_score ?? 0;

            // Placar A
            $boxA = imagettfbbox(100, 0, $this->fontPath, $scoreA);
            $wA = $boxA[2] - $boxA[0];
            imagettftext($img, 100, 0, ($width / 2) - 180 - $wA, $scoreY, $black, $this->fontPath, $scoreA);

            // Placar B
            imagettftext($img, 100, 0, ($width / 2) + 180 + 40, $scoreY, $black, $this->fontPath, $scoreB);

        } else {
            // Layout "Melhor Posição": Apenas Brasão da Equipe do Jogador no Centro
            // Descobrir equipe do jogador (assumindo Home ou Away baseado na ID no pivot, 
            // mas aqui simplificamos: pegamos a equipe A se home, B se away.
            // Para maior precisão precisariamos saber em qual time ele jogou. Back-end simplified: homeTeam default or search.

            // Tenta achar time do jogador
            $playerTeam = $match->homeTeam; // Default fallback
            // Lógica ideal: verificar relação player_team.

            $badgeSize = 150;
            $yBadges = 1535 - 280;
            $xCenter = ($width / 2) - ($badgeSize / 2);

            // Cor do texto fallback (sigla) pode ser preto ou branco dependendo do fundo. 
            // Goleiro usa preto no legado. Volei usa branco.
            $fallbackColor = ($sport == 'volei') ? $white : $black;

            $this->drawTeamBadge($img, $playerTeam, $xCenter, $yBadges, $badgeSize, $fallbackColor);
        }

        return $this->outputImage($img, 'card_' . $player->id);
    }

    // --- Helpers ---

    private function getBackgroundFile($sport, $category)
    {
        $sport = strtolower($sport);

        // Mapeamento Volei
        if (str_contains($sport, 'volei')) {
            $map = [
                'craque' => 'volei_melhor_quadra.jpg', // Default MVP
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

        // Mapeamento Futebol (e outros)
        $map = [
            'craque' => 'fundo_craque_do_jogo.jpg', // ou bg_mvp.jpg
            'goleiro' => 'fundo_melhor_goleiro.jpg',
            'artilheiro' => 'fundo_melhor_artilheiro.jpg',
            'zagueiro' => 'fundo_melhor_zagueiro.jpg',
            'lateral' => 'fundo_melhor_lateral.jpg',
            'volante' => 'fundo_melhor_volante.jpg',
            'meia' => 'fundo_melhor_meia.jpg',
            'atacante' => 'fundo_melhor_atacante.jpg',
            'assistencia' => 'fundo_melhor_assistencia.jpg',
            'estreante' => 'fundo_melhor_estreiante.jpg' // sic (erro digitação original)
        ];

        return $map[$category] ?? 'fundo_craque_do_jogo.jpg';
    }

    private function initImage($filename)
    {
        $path = $this->templatesPath . $filename;
        if (!file_exists($path)) {
            // Tenta fallback para o bg_mvp padrão se específico falhar
            $path = $this->templatesPath . 'bg_mvp.jpg';
            if (!file_exists($path))
                return null;
        }
        return @imagecreatefromjpeg($path);
    }

    private function drawPlayerPhoto($img, $player)
    {
        if (!$player->photo_path)
            return;

        $photoPath = storage_path('app/public/' . $player->photo_path);
        // Fallbacks de caminho
        if (!file_exists($photoPath))
            $photoPath = public_path('storage/' . $player->photo_path);
        if (!file_exists($photoPath))
            return;

        $photoInfo = getimagesize($photoPath);
        $playerImg = null;
        if ($photoInfo['mime'] == 'image/jpeg')
            $playerImg = @imagecreatefromjpeg($photoPath);
        elseif ($photoInfo['mime'] == 'image/png')
            $playerImg = @imagecreatefrompng($photoPath);

        if ($playerImg) {
            $targetHeight = 800;
            $width = imagesx($img);
            $origW = imagesx($playerImg);
            $origH = imagesy($playerImg);
            $ratio = $origW / $origH;
            $targetWidth = $targetHeight * $ratio;

            $resizedImg = imagecreatetruecolor($targetWidth, $targetHeight);
            imagealphablending($resizedImg, false);
            imagesavealpha($resizedImg, true);

            imagecopyresampled($resizedImg, $playerImg, 0, 0, 0, 0, $targetWidth, $targetHeight, $origW, $origH);

            $xPos = ($width - $targetWidth) / 2;
            $yPos = 335; // Posição fixa legado

            imagecopy($img, $resizedImg, $xPos, $yPos, 0, 0, $targetWidth, $targetHeight);
            imagedestroy($playerImg);
            imagedestroy($resizedImg);
        }
    }

    private function drawTeamBadge($img, $team, $x, $y, $size, $fallbackColor)
    {
        if (!$team)
            return;

        $badgePath = null;
        // Tenta achar o brasão
        if ($team->logo_path) {
            $possiblePaths = [
                storage_path('app/public/' . $team->logo_path),
                public_path('storage/' . $team->logo_path),
                public_path('brasoes/' . basename($team->logo_path)) // Legado path wrapper
            ];
            foreach ($possiblePaths as $p) {
                if (file_exists($p)) {
                    $badgePath = $p;
                    break;
                }
            }
        }

        if ($badgePath) {
            $info = getimagesize($badgePath);
            $badgeImg = null;
            if ($info['mime'] == 'image/jpeg')
                $badgeImg = @imagecreatefromjpeg($badgePath);
            elseif ($info['mime'] == 'image/png')
                $badgeImg = @imagecreatefrompng($badgePath);

            if ($badgeImg) {
                imagecopyresampled($img, $badgeImg, $x, $y, 0, 0, $size, $size, imagesx($badgeImg), imagesy($badgeImg));
                imagedestroy($badgeImg);
                return;
            }
        }

        // Fallback Sigla
        $sigla = mb_strtoupper(Str::limit($team->name, 3, ''), 'UTF-8');
        $this->drawCenteredTextInBox($img, $size / 2, $x, $y, $size, $fallbackColor, $sigla);
    }

    private function drawCenteredText($image, $size, $y, $color, $text)
    {
        $box = imagettfbbox($size, 0, $this->fontPath, $text);
        $textWidth = $box[2] - $box[0];
        $width = imagesx($image);
        $x = ($width - $textWidth) / 2;
        imagettftext($image, $size, 0, $x, $y, $color, $this->fontPath, $text);
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

    private function outputImage($img, $filename)
    {
        ob_start();
        imagejpeg($img, null, 90);
        $content = ob_get_clean();
        imagedestroy($img);
        return response($content)
            ->header('Content-Type', 'image/jpeg')
            ->header('Content-Disposition', 'inline; filename="' . $filename . '.jpg"');
    }
}
