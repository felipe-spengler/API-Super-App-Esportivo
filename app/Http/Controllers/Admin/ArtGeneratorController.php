<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GameMatch;
use Illuminate\Support\Str;

use App\Models\SystemSetting;

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

    public function saveTemplate(Request $request)
    {
        $name = $request->input('name');
        $elements = $request->input('elements');
        $canvas = $request->input('canvas');
        $bgUrl = $request->input('bg_url');

        $key = $this->getTemplateKey($name);

        $data = [
            'elements' => $elements,
            'canvas' => $canvas,
            'bg_url' => $bgUrl,
            'name' => $name
        ];

        // Check if user is Club Admin
        $user = auth()->user();
        if ($user && $user->club_id) {
            $club = \App\Models\Club::find($user->club_id);
            if ($club) {
                $settings = $club->art_settings ?? []; // JSON column
                if (!isset($settings['templates'])) {
                    $settings['templates'] = [];
                }
                $settings['templates'][$key] = $data;
                $club->art_settings = $settings;
                $club->save();

                return response()->json(['message' => 'Template salvo para o clube com sucesso']);
            }
        }

        // Global System Setting (Super Admin)
        SystemSetting::updateOrCreate(
            ['key' => $key],
            ['value' => json_encode($data), 'group' => 'art_templates']
        );

        return response()->json(['message' => 'Template salvo com sucesso (Sistema)']);
    }

    private function pathToUrl($path)
    {
        if (str_contains($path, 'http'))
            return $path;
        if (file_exists(public_path('assets-templates/' . $path))) {
            return asset('assets-templates/' . $path);
        }
        return asset('storage/' . $path);
    }

    public function getTemplate(Request $request)
    {
        $name = $request->query('name');
        $key = $this->getTemplateKey($name);

        // 1. Try Club Settings (Saved Template)
        $user = auth()->user();
        $club = null;
        if ($user && $user->club_id) {
            $club = \App\Models\Club::find($user->club_id);
            if ($club && !empty($club->art_settings['templates'][$key])) {
                return response()->json($club->art_settings['templates'][$key]);
            }
        }

        // 2. Try System Settings (Global Saved Template)
        $setting = SystemSetting::where('key', $key)->first();
        if ($setting) {
            return response()->json(json_decode($setting->value, true));
        }

        // 3. Fallback: Find Custom Background in Club Settings
        if ($club && !empty($club->art_settings)) {
            $cat = 'confronto';
            $n = strtolower($name);
            if (str_contains($n, 'programado'))
                $cat = 'jogo_programado';
            elseif (str_contains($n, 'craque') || str_contains($n, 'mvp'))
                $cat = 'craque';

            $sports = ['futebol', 'fut7', 'futebol 7', 'society', 'volei', 'futsal', 'basquete', 'handebol'];
            $foundBg = null;

            foreach ($sports as $s) {
                $slug = Str::slug($s);
                // Check clean name
                if (isset($club->art_settings[$s][$cat])) {
                    $foundBg = $club->art_settings[$s][$cat];
                    break;
                }
                // Check slug
                if (isset($club->art_settings[$slug][$cat])) {
                    $foundBg = $club->art_settings[$slug][$cat];
                    break;
                }

                // Fallback for Jogo Programado -> Confronto
                if ($cat === 'jogo_programado') {
                    if (isset($club->art_settings[$s]['confronto'])) {
                        $foundBg = $club->art_settings[$s]['confronto'];
                        break;
                    }
                    if (isset($club->art_settings[$slug]['confronto'])) {
                        $foundBg = $club->art_settings[$slug]['confronto'];
                        break;
                    }
                }
            }

            if ($foundBg) {
                return response()->json(['bg_url' => $this->pathToUrl($foundBg), 'elements' => null]);
            }
        }

        return response()->json(null);
    }

    private function getTemplateKey($name)
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

    /**
     * Gera Arte de Confronto (Faceoff)
     */
    public function matchFaceoff($matchId)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam', 'championship.club', 'championship.sport'])->findOrFail($matchId);
        $club = $match->championship->club;
        $this->loadClubResources($club);

        return $this->generateConfrontationArt($match, $club);
    }

    /**
     * Gera Arte de Jogo Programado (Scheduled Match)
     */
    public function matchScheduled($matchId)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam', 'championship.club', 'championship.sport'])->findOrFail($matchId);
        $club = $match->championship->club;
        $this->loadClubResources($club);

        return $this->generateScheduledArt($match, $club);
    }

    public function downloadScheduledArt($matchId)
    {
        return $this->matchScheduled($matchId);
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

        // Cores
        $club = $championship->club;
        $primaryColorStr = $club->primary_color ?? '#FFB700';
        $pRGB = $this->hexToRgb($primaryColorStr);
        $primaryColor = imagecolorallocate($img, $pRGB['r'], $pRGB['g'], $pRGB['b']);
        $black = imagecolorallocate($img, 0, 0, 0);

        $text = mb_strtoupper($championship->name);
        // Shadow
        $this->drawCenteredText($img, 50, 1700 + 4, $black, $text, true);
        // Text
        $this->drawCenteredText($img, 50, 1700, $primaryColor, $text, true);

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

    private function urlToPath($url)
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

    private function generateScheduledArt($match, $club = null)
    {
        $sport = $match->championship->sport->name ?? 'Futebol';
        $bgFile = $this->getBackgroundFile($sport, 'jogo_programado', $club);

        // Check for Custom Template Background
        $templateKey = 'art_layout_scheduled_feed';
        $templateData = null;
        if ($club && !empty($club->art_settings['templates'][$templateKey])) {
            $templateData = $club->art_settings['templates'][$templateKey];
            if (!empty($templateData['bg_url'])) {
                $customBg = $this->urlToPath($templateData['bg_url']);
                if (file_exists($customBg)) {
                    $bgFile = $customBg;
                }
            }
        }

        $img = $this->initImage($bgFile);

        if (!$img)
            return response("Erro fundo: " . basename($bgFile), 500);

        // --- DYNAMIC RENDERING START ---
        // --- DYNAMIC RENDERING START ---
        if ($templateData) {
            $elements = $templateData['elements'];

            $replacements = [
                '{CAMPEONATO}' => mb_strtoupper($match->championship->name),
                '{RODADA}' => mb_strtoupper($match->round_name ?? "RODADA " . ($match->round_number ?? 1)),
                'X' => 'X',
                'DD/MM HH:MM' => \Carbon\Carbon::parse($match->start_time)->translatedFormat('d/m H:i'),
                'Local da Partida' => mb_strtoupper($match->location ?? 'LOCAL A DEFINIR'),
            ];

            // Images
            $replacements['team_a'] = $this->getTeamLogoPath($match->homeTeam);
            $replacements['team_b'] = $this->getTeamLogoPath($match->awayTeam);

            $this->renderDynamicElements($img, $elements, $replacements);
            return $this->outputImage($img, 'jogo_programado_' . $match->id);
        }
        // --- DYNAMIC RENDERING END ---

        $width = imagesx($img);
        $height = imagesy($img);

        // Cores do Clube
        $primaryColorStr = $club->primary_color ?? '#FFB700'; // Default Yellow/Gold
        $secondaryColorStr = $club->secondary_color ?? '#FFFFFF';

        $pRGB = $this->hexToRgb($primaryColorStr);
        $sRGB = $this->hexToRgb($secondaryColorStr);

        $primaryColor = imagecolorallocate($img, $pRGB['r'], $pRGB['g'], $pRGB['b']);
        $secondaryColor = imagecolorallocate($img, $sRGB['r'], $sRGB['g'], $sRGB['b']);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);

        // Helper para desenhar com Sombra
        $drawText = function ($size, $y, $color, $text, $useSecFont) use ($img, $width, $black) {
            // Sombra
            $this->drawCenteredText($img, $size, $y + 4, $black, $text, $useSecFont);
            // Texto
            $this->drawCenteredText($img, $size, $y, $color, $text, $useSecFont);
        };

        // Helper para desenhar com Sombra em Posição X Específica
        $drawTextAt = function ($size, $xCenter, $y, $color, $text, $useSecFont) use ($img, $black) {
            $font = $useSecFont ? $this->secondaryFontPath : $this->fontPath;
            $box = imagettfbbox($size, 0, $font, $text);
            $textWidth = $box[2] - $box[0];
            $x = $xCenter - ($textWidth / 2);

            // Sombra
            imagettftext($img, $size, 0, $x + 3, $y + 3, $black, $font, $text);
            // Texto
            imagettftext($img, $size, 0, $x, $y, $color, $font, $text);
        };

        $isStory = $height > $width; // Detecta formato Story (1080x1920)

        // 1. Topo: Nome do Campeonato e Esporte
        $champName = mb_strtoupper($match->championship->name);

        $yTop = $isStory ? 250 : 100;
        $ySport = $isStory ? 350 : 190;
        $yRound = $isStory ? 450 : 280;

        // Usar Cor Secundária para o Camp
        $drawText($isStory ? 45 : 35, $yTop, $secondaryColor, $champName, true);
        // Usar Cor Primária para o Esporte (Destaque)
        $drawText($isStory ? 80 : 65, $ySport, $primaryColor, mb_strtoupper($sport), false);

        // 2. Meio: Rodada e Brasões
        $roundText = mb_strtoupper($match->round_name ?? "RODADA " . ($match->round_number ?? 1));
        $drawText($isStory ? 40 : 30, $yRound, $secondaryColor, $roundText, true);

        // Tamanho do brasão
        // Story: 400px. Quadrado: 300px. Retângulo Wide: 380px.
        $badgeSize = $isStory ? 400 : (abs($width - $height) < 100 ? 300 : 380);

        // Centralizar verticalmente
        $yBadges = ($height / 2) - ($badgeSize / 2) - ($isStory ? 0 : 40);
        $centerDist = $isStory ? 280 : 320;

        // Mandante
        $xA = ($width / 2) - $centerDist - ($badgeSize / 2);
        $this->drawTeamBadge($img, $match->homeTeam, $xA, $yBadges, $badgeSize, $secondaryColor);

        // Nome do Time Mandante
        $xCenterA = $xA + ($badgeSize / 2);
        $yName = $yBadges + $badgeSize + ($isStory ? 55 : 45);
        $drawTextAt($isStory ? 35 : 28, $xCenterA, $yName, $secondaryColor, mb_strtoupper($match->homeTeam->name), false);

        // Visitante
        $xB = ($width / 2) + $centerDist - ($badgeSize / 2);
        $this->drawTeamBadge($img, $match->awayTeam, $xB, $yBadges, $badgeSize, $secondaryColor);

        // Nome do Time Visitante
        $xCenterB = $xB + ($badgeSize / 2);
        $drawTextAt($isStory ? 35 : 28, $xCenterB, $yName, $secondaryColor, mb_strtoupper($match->awayTeam->name), false);

        // VS (Versus) no meio
        $drawText($isStory ? 80 : 60, $yBadges + ($badgeSize / 2) + 20, $primaryColor, "X", false);

        // 3. Rodapé: Data, Horário e Local
        $yLoc = $isStory ? ($height - 250) : ($height - 80);
        $yDate = $yLoc - ($isStory ? 100 : 80);

        $dateStr = \Carbon\Carbon::parse($match->start_time)->translatedFormat('d \d\e F \à\s H:i');
        $location = mb_strtoupper($match->location ?? 'LOCAL A DEFINIR');

        // Aumentar fonte no story
        $dateSize = $isStory ? 60 : 50;
        $locSize = $isStory ? 40 : 35;

        // Data com Cor Primária
        $drawText($dateSize, $yDate, $primaryColor, mb_strtoupper($dateStr), false);
        // Local com Branco/Secundário
        $drawText($locSize, $yLoc, $secondaryColor, $location, true);

        return $this->outputImage($img, 'jogo_programado_' . $match->id);
    }

    private function generateConfrontationArt($match, $club = null)
    {
        $sport = $match->championship->sport->name ?? 'Futebol';
        $bgFile = $this->getBackgroundFile($sport, 'confronto', $club);

        // Check for Custom Template Background
        $templateKey = 'art_layout_faceoff';
        $templateData = null;
        if ($club && !empty($club->art_settings['templates'][$templateKey])) {
            $templateData = $club->art_settings['templates'][$templateKey];
            if (!empty($templateData['bg_url'])) {
                $customBg = $this->urlToPath($templateData['bg_url']);
                if (file_exists($customBg)) {
                    $bgFile = $customBg;
                }
            }
        }

        $img = $this->initImage($bgFile);
        if (!$img)
            return response("Erro fundo: " . basename($bgFile), 500);

        // --- DYNAMIC RENDERING START ---
        if ($templateData) {
            $elements = $templateData['elements'];

            // Base Replacements
            $replacements = [
                '{CAMPEONATO}' => mb_strtoupper($match->championship->name),
                '{RODADA}' => mb_strtoupper($match->round_name ?? "RODADA " . ($match->round_number ?? 1)),
                'X' => 'X',
                'DD/MM HH:MM' => \Carbon\Carbon::parse($match->start_time)->translatedFormat('d/m H:i'),
                'Local da Partida' => mb_strtoupper($match->location ?? 'LOCAL A DEFINIR'),
                '{PLACAR_CASA}' => $match->home_score ?? 0,
                '{PLACAR_FORA}' => $match->away_score ?? 0,
            ];

            // Images
            $replacements['team_a'] = $this->getTeamLogoPath($match->homeTeam);
            $replacements['team_b'] = $this->getTeamLogoPath($match->awayTeam);

            $this->renderDynamicElements($img, $elements, $replacements);
            return $this->outputImage($img, 'confronto_' . $match->id);
        }
        // --- DYNAMIC RENDERING END ---

        $width = imagesx($img);

        // Cores do Clube
        $primaryColorStr = $club->primary_color ?? '#FFB700';
        $secondaryColorStr = $club->secondary_color ?? '#FFFFFF';

        $pRGB = $this->hexToRgb($primaryColorStr);
        $sRGB = $this->hexToRgb($secondaryColorStr);

        $primaryColor = imagecolorallocate($img, $pRGB['r'], $pRGB['g'], $pRGB['b']);
        $secondaryColor = imagecolorallocate($img, $sRGB['r'], $sRGB['g'], $sRGB['b']);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);

        // Helper para desenhar com Sombra
        $drawText = function ($size, $y, $color, $text, $useSecFont) use ($img, $black) {
            $this->drawCenteredText($img, $size, $y + 4, $black, $text, $useSecFont);
            $this->drawCenteredText($img, $size, $y, $color, $text, $useSecFont);
        };

        // Dados
        $homeTeam = $match->homeTeam;
        $awayTeam = $match->awayTeam;
        $placar = ($match->home_score ?? 0) . ' x ' . ($match->away_score ?? 0);

        // 1. Brasões Grandes
        $badgeSize = 300;
        $yBadges = 1170 - 280; // Legacy Position
        $centerDist = 400;

        // Team A (Left)
        $xA = 102 + ($width / 2) - $centerDist - ($badgeSize / 2);
        // Usar cor secundária como fallback de caixa para brasão
        $this->drawTeamBadge($img, $homeTeam, $xA, $yBadges, $badgeSize, $secondaryColor);

        // Team B (Right)
        $xB = -94 + ($width / 2) + $centerDist - ($badgeSize / 2);
        $this->drawTeamBadge($img, $awayTeam, $xB, $yBadges, $badgeSize, $secondaryColor);

        // 2. Placar
        $placarY = 1170 + 130;
        $placarSize = 100; // Increased size
        list($scoreA, $scoreB) = explode(' x ', $placar);

        // Usar Cor Primária para o Placar (com sombra)
        // Manual shadow for imagettftext since drawCenteredText is centered globaly
        $shadowOffset = 5;

        // Score Home
        imagettftext($img, $placarSize, 0, -145 + ($width / 2) - 180 + $shadowOffset, $placarY + $shadowOffset, $black, $this->fontPath, trim($scoreA));
        imagettftext($img, $placarSize, 0, -145 + ($width / 2) - 180, $placarY, $primaryColor, $this->fontPath, trim($scoreA));

        // Score Away
        imagettftext($img, $placarSize, 0, ($width / 2) + 180 + 80 + $shadowOffset, $placarY + $shadowOffset, $black, $this->fontPath, trim($scoreB));
        imagettftext($img, $placarSize, 0, ($width / 2) + 180 + 80, $placarY, $primaryColor, $this->fontPath, trim($scoreB));

        // 3. Campeonato e Rodada
        $champName = mb_strtoupper($match->championship->name);
        $roundName = mb_strtoupper($match->round_name ?? 'Rodada');

        // Secundária para o campeonato
        $drawText(40, 1600, $secondaryColor, $champName, true);
        // Primária para a rodada
        $drawText(30, 1660, $primaryColor, $roundName, true);

        return $this->outputImage($img, 'confronto_' . $match->id);
    }

    private function generatePlayerArt($player, $match, $category)
    {
        if (!$player)
            return response('Jogador não definido.', 404);

        $sport = strtolower($match->championship->sport->name ?? 'futebol');

        $roundText = $match->round_name ?? "RODADA " . ($match->round_number ?? 1);

        return $this->createCard(
            $player,
            $match->championship,
            $sport,
            $category,
            $roundText,

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
        // Determine Template Key first
        $templateKey = null;
        if (in_array($category, ['craque', 'mvp', 'melhor_jogador', 'melhor_quadra'])) {
            $templateKey = 'art_layout_mvp_vertical';
        }

        $bgFile = $this->getBackgroundFile($sport, $category, $club);
        $templateData = null;

        // Check Custom Background
        if ($templateKey && $club && !empty($club->art_settings['templates'][$templateKey])) {
            $templateData = $club->art_settings['templates'][$templateKey];
            if (!empty($templateData['bg_url'])) {
                $customBg = $this->urlToPath($templateData['bg_url']);
                if (file_exists($customBg)) {
                    $bgFile = $customBg;
                }
            }
        }

        $img = $this->initImage($bgFile);
        if (!$img)
            return response("Erro fundo: " . basename($bgFile), 500);

        $width = imagesx($img);

        // --- DYNAMIC RENDERING START ---
        if ($templateData) {
            $elements = $templateData['elements'];

            // Prepare Data
            $name = !empty($player->nickname) ? $player->nickname : $player->name;
            // Logic for short name if needed, or just use full

            $replacements = [
                '{JOGADOR}' => mb_strtoupper($name),
                '{CAMPEONATO}' => mb_strtoupper($championship->name),
                '{RODADA}' => $roundName ? mb_strtoupper($roundName) : '',
                'X' => 'X', // Placeholder
                '3' => '3', // Placeholder score
                '1' => '1', // Placeholder score
            ];

            if ($match) {
                $sH = $match->home_score ?? 0;
                $sA = $match->away_score ?? 0;
                $replacements['{PLACAR_CASA}'] = $sH;
                $replacements['{PLACAR_FORA}'] = $sA;
                // Aliases
                $replacements['{PA}'] = $sH;
                $replacements['{PF}'] = $sA;
                $replacements['{PC}'] = $sH;
                $replacements['{PV}'] = $sA;
            }

            // Images
            // Player Photo
            $playerPhotoPath = null;
            if ($player->photo_path) {
                $p = storage_path('app/public/' . $player->photo_path);
                if (!file_exists($p))
                    $p = public_path('storage/' . $player->photo_path);
                if (file_exists($p))
                    $playerPhotoPath = $p;
            }
            $replacements['player_photo'] = $playerPhotoPath;

            // Team Badges
            if ($match) {
                $replacements['team_a'] = $this->getTeamLogoPath($match->homeTeam);
                $replacements['team_b'] = $this->getTeamLogoPath($match->awayTeam);
            } elseif ($playerTeam) {
                $replacements['team_logo'] = $this->getTeamLogoPath($playerTeam);
                // If template expects team_a for single team?
            }

            $this->renderDynamicElements($img, $elements, $replacements);
            return $this->outputImage($img, 'card_' . $category . '_' . $player->id);
        }
        // --- DYNAMIC RENDERING END ---

        // Cores do Clube
        $primaryColorStr = $club->primary_color ?? '#FFB700';
        $secondaryColorStr = $club->secondary_color ?? '#FFFFFF';

        $pRGB = $this->hexToRgb($primaryColorStr);
        $sRGB = $this->hexToRgb($secondaryColorStr);

        $primaryColor = imagecolorallocate($img, $pRGB['r'], $pRGB['g'], $pRGB['b']);
        $secondaryColor = imagecolorallocate($img, $sRGB['r'], $sRGB['g'], $sRGB['b']);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 0, 0, 0);

        // Helper para desenhar com Sombra
        $drawText = function ($size, $y, $color, $text, $useSecFont) use ($img, $black) {
            $this->drawCenteredText($img, $size, $y + 4, $black, $text, $useSecFont);
            $this->drawCenteredText($img, $size, $y, $color, $text, $useSecFont);
        };

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
        // Nome do Jogador em Primária com Destaque
        $drawText(75, 1230, $primaryColor, $playerName, false);

        $champName = mb_strtoupper($championship->name);
        // Campeonato em Secundária
        $drawText(40, 1690, $secondaryColor, $champName, true);

        if ($roundName) {
            // Rodada em Branco (ou Secundária)
            $drawText(30, 1750, $white, mb_strtoupper($roundName), true);
        }

        // Título da Categoria para Vôlei (Legacy)
        if (str_contains($sport, 'volei') || str_contains($sport, 'volley')) {
            $catTitle = mb_strtoupper(str_replace('_', ' ', $category));
            $mapTitles = [
                'levantador' => 'MELHOR LEVANTADORA',
                'ponteira' => 'MELHOR PONTEIRA',
            ];
            $title = $mapTitles[$category] ?? $catTitle;
            $drawText(50, 1150, $secondaryColor, $title, true);
        }

        // 4. Layout: MVP (com Placar) vs Award (sem Placar, só time)
        if ($match && in_array($category, ['craque', 'mvp', 'melhor_jogador', 'melhor_quadra'])) {

            // Layout MVP com Placar
            $badgeSize = 150;
            $yBadges = 1535 - 280;
            $centerDist = 350;

            // Home Team
            // Offset manual +102
            $xA = 102 + ($width / 2) - $centerDist - ($badgeSize / 2);
            $this->drawTeamBadge($img, $match->homeTeam, $xA, $yBadges, $badgeSize, $secondaryColor);

            // Away Team
            // Offset manual -102 (Symmetry)
            $xB = -102 + ($width / 2) + $centerDist - ($badgeSize / 2);
            $this->drawTeamBadge($img, $match->awayTeam, $xB, $yBadges, $badgeSize, $secondaryColor);

            // Placar
            $scoreY = 1535;
            $scoreA = $match->home_score ?? 0;
            $scoreB = $match->away_score ?? 0;

            $placarSize = 100;

            // Calcular centros baseados nas posições dos brasões
            // Centro do Badge A = xA + badgeSize/2
            // Centro do Badge B = xB + badgeSize/2

            $centerA = $xA + ($badgeSize / 2);
            $centerB = $xB + ($badgeSize / 2);

            // Calculate text widths
            $boxA = imagettfbbox($placarSize, 0, $this->fontPath, $scoreA);
            $wA = $boxA[2] - $boxA[0];

            $boxB = imagettfbbox($placarSize, 0, $this->fontPath, $scoreB);
            $wB = $boxB[2] - $boxB[0];

            // Draw Scores (Centered on Badges, Black Color)

            // Score A
            imagettftext($img, $placarSize, 0, $centerA - ($wA / 2), $scoreY, $black, $this->fontPath, $scoreA);

            // Score B
            imagettftext($img, $placarSize, 0, $centerB - ($wB / 2), $scoreY, $black, $this->fontPath, $scoreB);

        } else {
            // Layout Award: Apenas Brasão da Equipe do Jogador
            $targetTeam = $playerTeam;

            if (!$targetTeam && $match) {
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

                $this->drawTeamBadge($img, $targetTeam, $xCenter, $yBadges, $badgeSize, $secondaryColor);
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

            // Tenta pegar pelo nome direto (ex: 'futebol')
            if (isset($settings[$sport]) && isset($settings[$sport][$category])) {
                return $settings[$sport][$category];
            }

            // Tenta pegar pelo Slug (ex: 'futebol-7' para 'Futebol 7')
            $sportSlug = Str::slug($sport);
            if (isset($settings[$sportSlug]) && isset($settings[$sportSlug][$category])) {
                return $settings[$sportSlug][$category];
            }

            // --- FALLBACK FOR JOGO PROGRAMADO ---
            // Se não achou fundo específico para jogo_programado, tenta usar o de confronto
            if ($category === 'jogo_programado') {
                if (isset($settings[$sport]['confronto']))
                    return $settings[$sport]['confronto'];
                if (isset($settings[$sportSlug]['confronto']))
                    return $settings[$sportSlug]['confronto'];
            }
        }

        // 2. Check Global System Defaults (SystemSetting)
        // Key format: default_art_{sport}_{category}
        $sysKey = 'default_art_' . $sport . '_' . $category;
        $sysSetting = \App\Models\SystemSetting::where('key', $sysKey)->first();
        if ($sysSetting && $sysSetting->value) {
            return $sysSetting->value;
        }

        // Custom Naming for Scheduled Games (User request)
        if ($category === 'jogo_programado') {
            $sportSlug = Str::slug($sport, '_');

            // Candidates to search for
            $candidates = [
                $sportSlug . '_jogo_programado.jpg', // ex: futebol_7_jogo_programado.jpg
                str_replace('_', '', $sportSlug) . '_jogo_programado.jpg', // ex: futebol7_jogo_programado.jpg
                str_replace('_', '-', $sportSlug) . '_jogo_programado.jpg' // ex: futebol-7_jogo_programado.jpg
            ];

            foreach ($candidates as $specific) {
                if (file_exists($this->templatesPath . $specific)) {
                    return $specific;
                }
            }

            // Fallbacks based on Sport Group
            if (str_contains($sport, 'volei'))
                return 'volei_confronto.jpg';

            // Try to find a confrontation art that matches the sport as a better fallback than generic
            if (file_exists($this->templatesPath . 'confronto_' . $sportSlug . '.jpg')) {
                return 'confronto_' . $sportSlug . '.jpg';
            }

            return 'fundo_confronto.jpg';
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
            'craque' => 'fundo_craque_do_jogo.jpg',
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

                // --- SMART OVERRIDE (Semantic IDs) ---
                // Garante que elementos vitais usem os placeholders corretos, 
                // mesmo que o usuário tenha alterado o texto para "teste" no editor.
                if (isset($el['id'])) {
                    $id = $el['id'];
                    if ($id === 'player_name')
                        $text = '{JOGADOR}';
                    elseif ($id === 'score_home')
                        $text = '{PLACAR_CASA}';
                    elseif ($id === 'score_away')
                        $text = '{PLACAR_FORA}';
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
                }
                // -------------------------------------

                // Substituições em chaves {}
                foreach ($replaceMap as $key => $val) {
                    if (is_string($val) || is_numeric($val)) {
                        $text = str_replace($key, $val, $text);
                    }
                }

                $fontSize = $el['fontSize'] ?? 40;
                $rgb = $this->hexToRgb($el['color'] ?? '#FFFFFF');
                $color = imagecolorallocate($img, $rgb['r'], $rgb['g'], $rgb['b']);
                $fontName = $el['fontFamily'] ?? 'Roboto';

                $fontPath = $this->fontPath;
                if (file_exists(public_path('assets/fonts/' . $fontName . '.ttf'))) {
                    $fontPath = public_path('assets/fonts/' . $fontName . '.ttf');
                } elseif (file_exists(public_path('assets/fonts/' . $fontName))) {
                    $fontPath = public_path('assets/fonts/' . $fontName);
                }

                $align = $el['align'] ?? 'left';
                $box = imagettfbbox($fontSize, 0, $fontPath, $text);
                $textWidth = abs($box[2] - $box[0]);
                $textHeight = abs($box[5] - $box[1]);

                $drawX = $x;
                if ($align === 'center') {
                    $drawX = $x - ($textWidth / 2);
                } elseif ($align === 'right') {
                    $drawX = $x - $textWidth;
                }

                // Adjust Y (Frontend center -> PHP baseline)
                // Approximate baseline offset
                $drawY = $y + ($textHeight / 2.5);

                imagettftext($img, $fontSize, 0, $drawX, $drawY, $color, $fontPath, $text);

            } elseif ($el['type'] === 'image') {
                $contentKey = $el['content'];
                $sourceImage = null;

                // Check if mapped resource is available
                if (isset($replaceMap[$contentKey]) && $replaceMap[$contentKey]) {
                    $res = $replaceMap[$contentKey];
                    // If it's a path
                    if (is_string($res) && file_exists($res)) {
                        $info = getimagesize($res);
                        if ($info['mime'] == 'image/png')
                            $sourceImage = @imagecreatefrompng($res);
                        else
                            $sourceImage = @imagecreatefromjpeg($res);
                    }
                }

                if ($sourceImage) {
                    $dstX = $x - ($width / 2);
                    $dstY = $y - ($height / 2);
                    imagecopyresampled($img, $sourceImage, $dstX, $dstY, 0, 0, $width, $height, imagesx($sourceImage), imagesy($sourceImage));
                    imagedestroy($sourceImage);
                }
            }
        }
    }

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
            if (file_exists($p)) {
                return $p;
            }
        }
        return null;
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
