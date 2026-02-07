<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GameMatch;
use Illuminate\Support\Str;

class ArtGeneratorController extends Controller
{
    private $fontPath;
    private $secondaryFontPath;
    private $templatesPath;

    public function __construct()
    {
        $this->fontPath = public_path('assets/fonts/Roboto-Bold.ttf'); // Default
        $this->secondaryFontPath = $this->fontPath;
        $this->templatesPath = public_path('assets/templates/');
    }
    /**
     * Gera Arte de Confronto (Faceoff)
     */
    public function matchFaceoff($matchId)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam', 'championship.club'])->findOrFail($matchId);
        $club = $match->championship->club;
        $this->loadClubResources($club);

        return $this->generateConfrontationArt($match, $club);
    }

    /**
     * Gera Arte de MVP da Partida
     */
    public function mvpArt($matchId, Request $request)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam', 'mvp', 'championship', 'championship.sport'])->findOrFail($matchId);
        $category = $request->query('category', 'craque');

        if (!$match->mvp_player_id) {
            return response('MVP não definido para esta partida.', 404);
        }

        return $this->generatePlayerArt($match->mvp, $match, $category);
    }

    public function downloadMvpArt($matchId, Request $request)
    {
        return $this->mvpArt($matchId, $request);
    }

    /**
     * Gera Arte de Classificação (Standings)
     */
    public function standingsArt($championshipId, Request $request)
    {
        $championship = \App\Models\Championship::with(['sport', 'club'])->findOrFail($championshipId);
        $this->loadClubResources($championship->club);

        $sport = strtolower($championship->sport->name ?? 'futebol');
        $bgFile = $this->getBackgroundFile($sport, 'classificacao', $championship->club);
        $img = $this->initImage($bgFile);

        if (!$img) {
            $img = $this->initImage('fundo_confronto.jpg');
        }

        if (!$img) {
            return response('Erro ao inicializar imagem de classificação.', 500);
        }

        $this->drawCenteredText($img, 50, 1700, null, mb_strtoupper($championship->name), true);

        return $this->outputImage($img, 'classificacao_' . $championshipId);
    }

    /**
     * Gera Arte de Premiação do Campeonato (Melhor Goleiro, Artilheiro, etc.)
     */
    /**
     * Gera Arte de Premiação do Campeonato (Melhor Goleiro, Artilheiro, etc.)
     * Rota: /art/championship/{championshipId}/award/{awardType}?categoryId={id}
     */
    public function championshipAwardArt($championshipId, $awardType, Request $request)
    {
        $championship = \App\Models\Championship::with(['sport', 'club'])->findOrFail($championshipId);
        $this->loadClubResources($championship->club);

        $categoryId = $request->query('categoryId'); // ID da Categoria do Campeonato (ex: id da Sub-20)

        $awards = $championship->awards ?? [];

        $targetAward = null;

        // 1. Tenta buscar específico da categoria ID
        if ($categoryId && isset($awards[$categoryId]) && isset($awards[$categoryId][$awardType])) {
            $targetAward = $awards[$categoryId][$awardType];
        }
        // 2. Tenta buscar no root (legado ou sem categoria)
        elseif (isset($awards[$awardType]) && isset($awards[$awardType]['player_id'])) {
            $targetAward = $awards[$awardType];
        }
        // 3. Tenta buscar em 'generic' (caso a UI salve assim para geral)
        elseif (isset($awards['generic']) && isset($awards['generic'][$awardType])) {
            $targetAward = $awards['generic'][$awardType];
        }

        if (!$targetAward || !isset($targetAward['player_id'])) {
            return response("Premiação não definida para esta categoria: $awardType" . ($categoryId ? " (CatID: $categoryId)" : ""), 404);
        }

        $playerId = $targetAward['player_id'];
        $player = \App\Models\User::findOrFail($playerId);

        // Busca time
        $team = null;
        if (isset($targetAward['team_id'])) {
            $team = \App\Models\Team::find($targetAward['team_id']);
        }

        // Se não tem team_id salvo, tenta inferir
        if (!$team) {
            $team = $championship->teams()->whereHas('players', function ($q) use ($playerId) {
                $q->where('users.id', $playerId);
            })->first();
        }

        return $this->generateAwardCard($player, $championship, $team, $awardType, $championship->club);
    }

    /**
     * Legacy Wrapper (antigo downloadArt)
     */
    public function downloadArt($matchId, Request $request)
    {
        return $this->mvpArt($matchId, $request);
    }

    private function generateConfrontationArt($match, $club = null)
    {
        // Fundo
        $bgFile = $this->getBackgroundFile($match->championship->sport->name ?? 'Futebol', 'confronto', $club);
        $img = $this->initImage($bgFile);
        if (!$img)
            return response("Erro fundo: $bgFile", 500);

        $width = imagesx($img);

        // Auto Contrast for Default Colors (used if not passed explicitly)
        // Mas para textos complexos, vamos deixar o drawCenteredText calcular
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
        // Placar usa Fonte Primária
        // Cor do placa: Tenta calcular contraste na região
        $colorScore = $this->getAutoContrastColor($img, ($width / 2) - 180, $placarY - $placarSize, 360, $placarSize);

        imagettftext($img, $placarSize, 0, -145 + ($width / 2) - 180, $placarY, $colorScore, $this->fontPath, trim($scoreA));
        imagettftext($img, $placarSize, 0, ($width / 2) + 180 + 80, $placarY, $colorScore, $this->fontPath, trim($scoreB));

        // 3. Campeonato e Rodada
        $champName = mb_strtoupper($match->championship->name);
        $roundName = mb_strtoupper($match->round_name ?? 'Rodada');

        $this->drawCenteredText($img, 40, 1700, null, $champName, true); // Use Secondary Font
        $this->drawCenteredText($img, 30, 1750, null, $roundName, true); // Use Secondary Font

        return $this->outputImage($img, 'confronto_' . $match->id);
    }

    private function generatePlayerArt($player, $match, $category)
    {
        if (!$player)
            return response('Jogador não definido.', 404);

        $sport = strtolower($match->championship->sport->name ?? 'futebol');
        return $this->createCard(
            $player,
            $match->championship,
            $sport,
            $category,
            $match->round_name ?? 'Rodada',

            $match, // Passa a partida para pegar placar e times se for MVP
            null,
            $match->championship->club
        );
    }

    private function generateAwardCard($player, $championship, $team, $category, $club = null)
    {
        $sport = strtolower($championship->sport->name ?? 'futebol');
        return $this->createCard(
            $player,
            $championship,
            $sport,
            $category,
            null, // Sem rodada
            null, // Sem partida (sem placar)
            $team, // Time específico do jogador
            $club
        );
    }

    /**
     * Função Genérica de Criação de Card de Jogador
     */
    private function createCard($player, $championship, $sport, $category, $roundName = null, $match = null, $playerTeam = null, $club = null)
    {
        // 1. Fundo
        $bgFile = $this->getBackgroundFile($sport, $category, $club);
        $img = $this->initImage($bgFile);
        if (!$img)
            return response("Erro fundo: $bgFile", 500);

        $width = imagesx($img);
        // Colors defined for fallback, but text calls will function with null for auto-contrast
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 30, 30, 30);

        // 2. Foto do Jogador
        $this->drawPlayerPhoto($img, $player);

        // 3. Textos Principais

        // Formatação de Nome (Smart Particle Logic)
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
        $this->drawCenteredText($img, 70, 1230, $white, $playerName, false); // White name

        $champName = mb_strtoupper($championship->name);
        $this->drawCenteredText($img, 40, 1700, $white, $champName, true); // White champ

        if ($roundName) {
            $this->drawCenteredText($img, 30, 1750, $white, mb_strtoupper($roundName), true); // White round
        }

        // Título da Categoria para Vôlei (Legacy)
        // Se for Futebol, geralmente o fundo já tem o texto escrito (ex: MELHOR GOLEIRO)
        // Mas se quisermos forçar:
        if (str_contains($sport, 'volei') || str_contains($sport, 'volley')) {
            $catTitle = mb_strtoupper(str_replace('_', ' ', $category));
            // Ajuste de tradução simples
            $mapTitles = [
                'levantador' => 'MELHOR LEVANTADORA', // ou LEVANTADOR, dependendo do genero
                'ponteira' => 'MELHOR PONTEIRA',
                // ...
            ];
            // Se não estiver no mapa, usa o category limpo
            $title = $mapTitles[$category] ?? $catTitle;
            $this->drawCenteredText($img, 50, 1150, null, $title, true);
        }

        // 4. Layout: MVP (com Placar) vs Award (sem Placar, só time)
        // MVP geralmente tem placar se vier de uma partida
        if ($match && in_array($category, ['craque', 'mvp', 'melhor_jogador', 'melhor_quadra'])) {

            // Layout MVP com Placar
            $badgeSize = 150;
            $yBadges = 1535 - 280;
            $centerDist = 350;

            // Home Team
            $xA = 102 + ($width / 2) - $centerDist - ($badgeSize / 2);
            $this->drawTeamBadge($img, $match->homeTeam, $xA, $yBadges, $badgeSize, $black);

            // Away Team
            $xB = -94 + ($width / 2) + $centerDist - ($badgeSize / 2);
            $this->drawTeamBadge($img, $match->awayTeam, $xB, $yBadges, $badgeSize, $white);

            // Placar
            $scoreY = 1535;
            $scoreA = $match->home_score ?? 0;
            $scoreB = $match->away_score ?? 0;

            $boxA = imagettfbbox(100, 0, $this->fontPath, $scoreA);
            $wA = $boxA[2] - $boxA[0];

            // Auto Color for Scores
            $scoreColor = $this->getAutoContrastColor($img, ($width / 2) - 180, $scoreY - 100, 360, 100);

            imagettftext($img, 100, 0, ($width / 2) - 180 - $wA, $scoreY, $scoreColor, $this->fontPath, $scoreA);
            imagettftext($img, 100, 0, ($width / 2) + 180 + 40, $scoreY, $scoreColor, $this->fontPath, $scoreB);

        } else {
            // Layout Award: Apenas Brasão da Equipe do Jogador
            $targetTeam = $playerTeam;

            // Se não veio time explícito, mas veio partida, tenta deduzir
            if (!$targetTeam && $match) {
                // Tenta achar em qual time o jogador está
                // Nota: Usamos query simples aqui para ser rápido
                $isHome = \DB::table('team_players')
                    ->where('team_id', $match->home_team_id)
                    ->where('user_id', $player->id)
                    ->exists();

                if ($isHome) {
                    $targetTeam = $match->homeTeam;
                } else {
                    $targetTeam = $match->awayTeam;
                }
            }

            if ($targetTeam) {
                $badgeSize = 150;
                $yBadges = 1535 - 280;
                $xCenter = ($width / 2) - ($badgeSize / 2);

                $fallbackColor = str_contains($sport, 'volei') ? $white : $black;

                $this->drawTeamBadge($img, $targetTeam, $xCenter, $yBadges, $badgeSize, $fallbackColor);
            }
        }

        return $this->outputImage($img, 'card_' . $category . '_' . $player->id);
    }

    // --- Helpers ---

    private function getBackgroundFile($sport, $category, $club = null)
    {
        $sport = strtolower($sport);

        // 1. Check Club Art Settings (Custom Backgrounds)
        if ($club && !empty($club->art_settings)) {
            $settings = $club->art_settings;
            // Structure: art_settings[sport][category] = 'path/to/image.jpg'
            if (isset($settings[$sport]) && isset($settings[$sport][$category])) {
                return $settings[$sport][$category];
            }
            // Check fallback without sport key if structure is flat? User suggested "atrelado ao esporte".
            // Implementation assumes nested: sport -> position
        }

        // 2. Check Global System Defaults (SystemSetting)
        // Key format: default_art_{sport}_{category}
        $sysKey = 'default_art_' . $sport . '_' . $category;
        $sysSetting = \App\Models\SystemSetting::where('key', $sysKey)->first();
        if ($sysSetting && $sysSetting->value) {
            return $sysSetting->value;
        }

        // Mapeamento Volei (Default)
        if (str_contains($sport, 'volei')) {
            $map = [
                'confronto' => 'volei_confronto.jpg',
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
            'confronto' => 'fundo_confronto.jpg',
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
        // Se filename vier com caminho completo (storage ou url), tentar carregar
        if (str_contains($filename, '/') || str_contains($filename, '\\')) {
            if (file_exists($filename)) {
                return $this->createFromFormat($filename);
            }
            // Tentar no public/storage se for relativo
            $storagePath = storage_path('app/public/' . $filename);
            if (file_exists($storagePath)) {
                return $this->createFromFormat($storagePath);
            }
            $publicPath = public_path('storage/' . $filename);
            if (file_exists($publicPath)) {
                return $this->createFromFormat($publicPath);
            }
        }

        $path = $this->templatesPath . $filename;
        if (!file_exists($path)) {
            // Tenta fallback para o fundo_craque_do_jogo.jpg se bg_mvp falhar
            $path = $this->templatesPath . 'fundo_craque_do_jogo.jpg';
            if (!file_exists($path)) {
                $path = $this->templatesPath . 'bg_mvp.jpg';
                if (!file_exists($path)) {
                    // Create a blank image as absolute last resort
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
            return @imagecreatefromjpeg($path); // Try anyway

        if ($info['mime'] == 'image/png') {
            return @imagecreatefrompng($path);
        }
        return @imagecreatefromjpeg($path);
    }

    private function loadClubResources($club)
    {
        if (!$club)
            return;

        if ($club->primary_font) {
            // Assume que font name pode ser arquivo em assets/fonts ou path no storage
            $fontName = $club->primary_font;

            // 1. Tenta path direto em assets/fonts
            $candidate = public_path('assets/fonts/' . $fontName);
            if (file_exists($candidate)) {
                $this->fontPath = $candidate;
            } elseif (file_exists($candidate . '.ttf')) {
                $this->fontPath = $candidate . '.ttf';
            } else {
                // 2. Tenta storage
                $candidate = storage_path('app/public/' . $fontName);
                if (file_exists($candidate)) {
                    $this->fontPath = $candidate;
                }
            }
        }

        // Carrega também a fonte secundária
        if ($club->secondary_font) {
            $fontName = $club->secondary_font;
            $candidate = public_path('assets/fonts/' . $fontName);

            if (file_exists($candidate)) {
                $this->secondaryFontPath = $candidate;
            } elseif (file_exists($candidate . '.ttf')) {
                $this->secondaryFontPath = $candidate . '.ttf';
            } else {
                $candidate = storage_path('app/public/' . $fontName);
                if (file_exists($candidate)) {
                    $this->secondaryFontPath = $candidate;
                }
            }
        } else {
            // Se user não definiu secundária, usa a primária (ou padrão se primária falhou)
            $this->secondaryFontPath = $this->fontPath;
        }
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

    private function drawCenteredText($image, $size, $y, $color, $text, $useSecondaryFont = false)
    {
        $font = $useSecondaryFont ? $this->secondaryFontPath : $this->fontPath;
        $box = imagettfbbox($size, 0, $font, $text);
        $textWidth = $box[2] - $box[0];
        $textHeight = abs($box[7] - $box[1]); // Aprox height logic

        $width = imagesx($image);
        $x = ($width - $textWidth) / 2;

        // Auto Contrast Logic
        if ($color === null) {
            $color = $this->getAutoContrastColor($image, $x, $y - $size, $textWidth, $size);
        }

        imagettftext($image, $size, 0, $x, $y, $color, $font, $text);
    }

    private function getAutoContrastColor($img, $x, $y, $w, $h)
    {
        // Garante bounds
        $imgW = imagesx($img);
        $imgH = imagesy($img);

        $x = floor(max(0, $x));
        $y = floor(max(0, $y));
        $w = floor(min($w, $imgW - $x));
        $h = floor(min($h, $imgH - $y));

        if ($w <= 1 || $h <= 1)
            return imagecolorallocate($img, 255, 255, 255); // Fallback White

        // Amostra 5 pontos: cantos e centro, garantindo estar dentro da imagem (0 a size-1)
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

            // Verificação extra de redundância
            if ($px < 0 || $px >= $imgW || $py < 0 || $py >= $imgH)
                continue;

            $rgb = imagecolorat($img, $px, $py);
            $r = ($rgb >> 16) & 0xFF;
            $g = ($rgb >> 8) & 0xFF;
            $b = $rgb & 0xFF;

            // Formula de luminancia: 0.299*R + 0.587*G + 0.114*B
            $lum = (0.299 * $r) + (0.587 * $g) + (0.114 * $b);
            $totalLimunance += $lum;
            $samples++;
        }

        if ($samples === 0)
            return imagecolorallocate($img, 255, 255, 255);

        $avgLum = $totalLimunance / $samples;

        // Se for claro (> 130), texto deve ser escuro (Preto ou quase preto)
        // Se for escuro, texto deve ser claro (Branco)
        if ($avgLum > 130) {
            return imagecolorallocate($img, 20, 20, 20); // Dark text
        } else {
            return imagecolorallocate($img, 255, 255, 255); // White text
        }
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
