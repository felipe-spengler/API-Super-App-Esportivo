<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GameMatch;
use Illuminate\Support\Str;
use App\Models\SystemSetting;

use App\Http\Controllers\Admin\Traits\ArtGdTrait;
use App\Http\Controllers\Admin\Traits\ArtCardTrait;
use App\Http\Controllers\Admin\Traits\ArtMatchTrait;

class ArtGeneratorController extends Controller
{
    use ArtGdTrait, ArtCardTrait, ArtMatchTrait;

    private $fontPath;
    private $secondaryFontPath;
    private $templatesPath;

    public function __construct()
    {
        $this->fontPath = public_path('assets/fonts/Roboto-Bold.ttf');
        $this->secondaryFontPath = $this->fontPath;
        $this->templatesPath = public_path('assets/templates/');
    }

    // -------------------------------------------------------------------------
    // Template Management
    // -------------------------------------------------------------------------

    public function saveTemplate(Request $request)
    {
        $name = $request->input('name');
        $elements = $request->input('elements');
        $canvas = $request->input('canvas');
        $bgUrl = $request->input('bg_url');
        $championshipId = $request->input('championship_id');

        $key = $this->getTemplateKey($name);
        $data = ['elements' => $elements, 'canvas' => $canvas, 'bg_url' => $bgUrl, 'name' => $name];

        if ($championshipId) {
            $championship = \App\Models\Championship::find($championshipId);
            if ($championship) {
                $user = auth()->user();
                if ($user && $user->club_id == $championship->club_id) {
                    $settings = $championship->art_settings ?? [];
                    if (!isset($settings['templates']))
                        $settings['templates'] = [];
                    $settings['templates'][$key] = $data;
                    $championship->art_settings = $settings;
                    $championship->save();
                    return response()->json(['message' => 'Template salvo para o campeonato com sucesso']);
                }
            }
            return response()->json(['message' => 'Erro ao salvar template para o campeonato. Verifique permissões.'], 403);
        }

        $user = auth()->user();
        if ($user && $user->club_id) {
            $club = \App\Models\Club::find($user->club_id);
            if ($club) {
                $settings = $club->art_settings ?? [];
                if (!isset($settings['templates']))
                    $settings['templates'] = [];
                $settings['templates'][$key] = $data;
                $club->art_settings = $settings;
                $club->save();
                return response()->json(['message' => 'Template salvo para o clube com sucesso']);
            }
        }

        SystemSetting::updateOrCreate(
            ['key' => $key],
            ['value' => json_encode($data), 'group' => 'art_templates']
        );

        return response()->json(['message' => 'Template salvo com sucesso (Sistema)']);
    }

    public function getTemplate(Request $request)
    {
        $name = $request->query('name');
        $championshipId = $request->query('championship_id');
        $key = $this->getTemplateKey($name);

        $championship = null;
        if ($championshipId) {
            $championship = \App\Models\Championship::find($championshipId);
        }

        $user = auth()->user();
        $club = null;
        if ($user && $user->club_id) {
            $club = \App\Models\Club::find($user->club_id);
        } elseif ($championship) {
            $club = $championship->club;
        }

        $setting = SystemSetting::where('key', $key)->first();
        $default = $this->getDefaultTemplate($key);

        $responseTemplate = null;

        if ($championship && !empty($championship->art_settings['templates'][$key])) {
            $responseTemplate = $championship->art_settings['templates'][$key];
        } elseif ($club && !empty($club->art_settings['templates'][$key])) {
            $responseTemplate = $club->art_settings['templates'][$key];
        } elseif ($setting) {
            $responseTemplate = json_decode($setting->value, true);
        }

        if ($responseTemplate) {
            if ($default && isset($default['elements'])) {
                $existingIds = array_column($responseTemplate['elements'] ?? [], 'id');
                foreach ($default['elements'] as $defEl) {
                    if (isset($defEl['id']) && !in_array($defEl['id'], $existingIds)) {
                        $responseTemplate['elements'][] = $defEl;
                    }
                }
            }

            $sport = $request->query('sport');
            if ($sport) {
                $cat = 'confronto';
                $n = strtolower($name);
                if (str_contains($n, 'programado'))
                    $cat = 'jogo_programado';
                elseif (str_contains($n, 'craque') || str_contains($n, 'mvp'))
                    $cat = 'craque';

                $bgFile = $this->getBackgroundFile($sport, $cat, $club, $championship);
                if ($bgFile)
                    $responseTemplate['preview_bg_url'] = $this->pathToUrl($bgFile);
            }

            return response()->json($responseTemplate);
        }

        if ($default) {
            $sport = $request->query('sport');
            if ($sport) {
                $cat = 'confronto';
                $n = strtolower($name);
                if (str_contains($n, 'programado'))
                    $cat = 'jogo_programado';
                elseif (str_contains($n, 'craque') || str_contains($n, 'mvp'))
                    $cat = 'craque';

                $bgFile = $this->getBackgroundFile($sport, $cat, $club, $championship);
                if ($bgFile)
                    $default['preview_bg_url'] = $this->pathToUrl($bgFile);
            }
            return response()->json($default);
        }

        // Fallback Legacy BG
        if ($championship && !empty($championship->art_settings)) {
            $sport = $request->query('sport');
            if ($sport) {
                $cat = 'confronto';
                $n = strtolower($name);
                if (str_contains($n, 'programado'))
                    $cat = 'jogo_programado';
                elseif (str_contains($n, 'craque') || str_contains($n, 'mvp'))
                    $cat = 'craque';
                $bg = $this->getBackgroundFile($sport, $cat, $club, $championship);
                if ($bg)
                    return response()->json(['bg_url' => $this->pathToUrl($bg), 'elements' => null]);
            }
        }

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
                if (isset($club->art_settings[$s][$cat])) {
                    $foundBg = $club->art_settings[$s][$cat];
                    break;
                }
                if (isset($club->art_settings[$slug][$cat])) {
                    $foundBg = $club->art_settings[$slug][$cat];
                    break;
                }
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

            if ($foundBg)
                return response()->json(['bg_url' => $this->pathToUrl($foundBg), 'elements' => null]);
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
            'Confronto (Placar)' => 'art_layout_faceoff',
            'Atleta Confirmado' => 'art_layout_individual_confirmed',
            'Colocação do Atleta' => 'art_layout_individual_placement',
        ];
        return $map[$name] ?? 'art_layout_custom_' . Str::slug($name);
    }

    // -------------------------------------------------------------------------
    // Route Handlers (Públicos)
    // -------------------------------------------------------------------------

    /** Gera Arte de Confronto (Faceoff) */
    public function matchFaceoff($matchId)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam', 'championship.club', 'championship.sport', 'events.player'])->findOrFail($matchId);
        $club = $match->championship->club;
        $this->loadClubResources($club);
        return $this->generateConfrontationArt($match, $club, $match->championship);
    }

    /** Gera Arte de Jogo Programado */
    public function matchScheduled($matchId)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam', 'championship.club', 'championship.sport'])->findOrFail($matchId);
        $club = $match->championship->club;
        $this->loadClubResources($club);
        return $this->generateScheduledArt($match, $club, $match->championship);
    }

    public function downloadScheduledArt($matchId)
    {
        return $this->matchScheduled($matchId);
    }

    /** Gera Arte do MVP da Partida */
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

    /** Gera Arte de Classificação */
    public function standingsArt($championshipId, Request $request)
    {
        $championship = \App\Models\Championship::with(['sport', 'club'])->findOrFail($championshipId);
        $this->loadClubResources($championship->club);

        $sport = strtolower($championship->sport->name ?? 'futebol');
        $bgFile = $this->getBackgroundFile($sport, 'classificacao', $championship->club, $championship);
        $img = $this->initImage($bgFile);

        if (!$img)
            $img = $this->initImage('fundo_confronto.jpg');
        if (!$img)
            return response('Erro ao inicializar imagem de classificação.', 500);

        $club = $championship->club;
        $primaryColorStr = $club->primary_color ?? '#FFB700';
        $pRGB = $this->hexToRgb($primaryColorStr);
        $primaryColor = imagecolorallocate($img, $pRGB['r'], $pRGB['g'], $pRGB['b']);
        $black = imagecolorallocate($img, 0, 0, 0);

        $text = mb_strtoupper($championship->name);
        $this->drawCenteredText($img, 50, 1700 + 4, $black, $text, true);
        $this->drawCenteredText($img, 50, 1700, $primaryColor, $text, true);

        return $this->outputImage($img, 'classificacao_' . $championshipId);
    }

    /**
     * Gera Arte de Premiação do Campeonato (Melhor Goleiro, Artilheiro, etc.)
     * Rota: /art/championship/{championshipId}/award/{awardType}?categoryId={id}
     */
    public function championshipAwardArt($championshipId, $awardType, Request $request)
    {
        $championship = \App\Models\Championship::with(['sport', 'club'])->findOrFail($championshipId);
        $this->loadClubResources($championship->club);

        $categoryId = $request->query('categoryId');
        $awards = $championship->awards ?? [];
        $targetAward = null;

        if ($categoryId && isset($awards[$categoryId]) && isset($awards[$categoryId][$awardType])) {
            $targetAward = $awards[$categoryId][$awardType];
        } elseif (isset($awards[$awardType]) && isset($awards[$awardType]['player_id'])) {
            $targetAward = $awards[$awardType];
        } elseif (isset($awards['generic']) && isset($awards['generic'][$awardType])) {
            $targetAward = $awards['generic'][$awardType];
        }

        // Fallback backward compatibility for array flat
        if (!$targetAward && is_array($awards)) {
            foreach ($awards as $key => $award) {
                if (is_array($award) && isset($award['category']) && $award['category'] === $awardType) {
                    if (!$categoryId || (isset($award['category_id']) && (string)$award['category_id'] === (string)$categoryId)) {
                        $targetAward = $award;
                        break;
                    }
                    if (!isset($award['category_id'])) {
                        $targetAward = $award;
                        break;
                    }
                }
            }
        }

        if (!$targetAward || !isset($targetAward['player_id'])) {
            return response("Premiação não definida para esta categoria: $awardType" . ($categoryId ? " (CatID: $categoryId)" : ""), 404);
        }

        $player = \App\Models\User::findOrFail($targetAward['player_id']);
        $team = isset($targetAward['team_id']) ? \App\Models\Team::find($targetAward['team_id']) : null;

        if (!$team) {
            $playerId = $player->id;
            $team = $championship->teams()->whereHas('players', function ($q) use ($playerId) {
                $q->where('users.id', $playerId);
            })->first();
        }

        return $this->generateAwardCard($player, $championship, $team, $awardType, $championship->club);
    }

    /**
     * Gera Arte Individual de Atleta (Confirmado ou Colocação)
     */
    public function individualAthleteArt($championshipId, $athleteId, $category, Request $request)
    {
        $championship = \App\Models\Championship::with(['sport', 'club'])->findOrFail($championshipId);
        $athlete = \App\Models\User::findOrFail($athleteId);

        $this->loadClubResources($championship->club);
        $sport = strtolower($championship->sport->name ?? 'futebol');

        // Extra replacements for individual context
        $rank = $request->query('rank', '');
        $catName = $request->query('category_name', '');

        // We'll use createCard but we need to pass these replacements.
        // Since createCard builds its own replacements, we might need a way to inject these.
        // I've already updated createCard to use some default empty strings for these.
        // I'll use a little trick: I'll store them in a temporary property or use a more direct approach if possible.

        // Let's modify createCard to accept an optional $extraReplacements array as a better long-term fix.
        // For now, I'll pass them via a "match" object or similar if it works, or I'll just update createCard signature.

        return $this->createCard($athlete, $championship, $sport, $category, null, null, null, $championship->club, [
            '{COLOCACAO}' => $rank,
            '{CATEGORIA}' => mb_strtoupper($catName)
        ]);
    }

    /** Legacy Wrapper (antigo downloadArt) */
    public function downloadArt($matchId, Request $request)
    {
        return $this->mvpArt($matchId, $request);
    }

    // -------------------------------------------------------------------------
    // Utilitários de URL/Path
    // -------------------------------------------------------------------------

    private function pathToUrl($path)
    {
        if (empty($path))
            return null;
        if (str_contains($path, 'http'))
            return $path;

        $path = str_replace('\\', '/', $path);

        if (file_exists(public_path('assets/templates/' . $path)))
            return url('api/assets-templates/' . $path);
        if (file_exists(public_path('assets-templates/' . $path)))
            return url('api/assets-templates/' . $path);

        $clean = $path;
        $prefixes = [
            str_replace('\\', '/', storage_path('app/public/')),
            str_replace('\\', '/', public_path('storage/')),
            '/storage/',
            'storage/'
        ];

        foreach ($prefixes as $prefix) {
            if (str_starts_with($clean, $prefix)) {
                $clean = substr($clean, strlen($prefix));
                break;
            }
        }

        return url('api/storage/' . ltrim($clean, '/'));
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

    // -------------------------------------------------------------------------
    // Debug
    // -------------------------------------------------------------------------

    public function debugPlayerArt($playerId)
    {
        $player = \App\Models\User::findOrFail($playerId);

        $html = "<!DOCTYPE html><html><head><title>Debug Player Art</title><style>
                 body { font-family: sans-serif; background: #f0f0f0; margin: 20px; }
                 .checker {
                     background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
                                       linear-gradient(-45deg, #ccc 25%, transparent 25%),
                                       linear-gradient(45deg, transparent 75%, #ccc 75%),
                                       linear-gradient(-45deg, transparent 75%, #ccc 75%);
                     background-size: 20px 20px;
                     background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                     background-color: #fff;
                     border: 1px solid #333;
                     display: inline-block;
                 }
                 img { max-width: 400px; display: block; margin-top: 5px; }
                 .box { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                 </style></head><body>";

        $html .= "<h1>Debug: Player {$player->name} (ID: {$player->id})</h1>";

        // 1. Original
        $html .= "<div class='box'><h2>1. Imagem Original Salva (photo_path)</h2>";
        $html .= "<p>DB Path: <code>" . ($player->photo_path ?: 'NULL') . "</code></p>";
        if ($player->photo_path) {
            $urlRel = '/storage/' . $player->photo_path;
            $html .= "<div class='checker'><img src='{$urlRel}' alt='Original' /></div>";
        }
        $html .= "</div>";

        // 2. _nobg Version
        $nobgPath = $player->photo_path ? preg_replace('/\.[^.]+$/i', '_nobg.png', $player->photo_path) : null;
        $html .= "<div class='box'><h2>2. Versão Sem Fundo (_nobg.png)</h2>";
        $html .= "<a href='?run_rembg=1' style='display:inline-block; padding:8px 15px; background:blue; color:white; text-decoration:none; border-radius:4px; margin-bottom:10px;'>Executar REMBG Novamente Agora</a>";

        if (request()->query('run_rembg') && $player->photo_path) {
            $html .= "<div style='background:#f9f9f9; border-left:4px solid blue; padding:10px; margin-bottom:15px;'>";
            $html .= "<h3>Rodando IA Rembg...</h3>";
            try {
                $inputAbsPath = storage_path('app/public/' . $player->photo_path);
                $outputAbsPath = storage_path('app/public/players/' . pathinfo($nobgPath, PATHINFO_BASENAME));
                $processed = $this->runRembgAndGetPath($inputAbsPath, pathinfo($outputAbsPath, PATHINFO_BASENAME));
                $html .= "<p><b>Resultado:</b> " . ($processed ? "Sucesso! arquivo: {$processed}" : "Falhou. Ver logs Laravel.") . "</p>";
            } catch (\Exception $e) {
                $html .= "<p style='color:red'>Erro: {$e->getMessage()}</p>";
            }
            $html .= "</div>";
        }

        $html .= "<p>Expected Path: <code>{$nobgPath}</code></p>";
        $hasNobg = false;
        $fileToLoad = null;

        if ($nobgPath) {
            $p1 = storage_path('app/public/' . $nobgPath);
            $p2 = public_path('storage/' . $nobgPath);
            if (file_exists($p1)) {
                $fileToLoad = $p1;
                $hasNobg = true;
            } elseif (file_exists($p2)) {
                $fileToLoad = $p2;
                $hasNobg = true;
            }

            if ($hasNobg) {
                $html .= "<div class='checker'><img src='/storage/{$nobgPath}' alt='NoBG' /></div>";
            } else {
                $html .= "<p style='color:red;'>Arquivo _nobg não existe fisicamente no disco.</p>";
            }
        }
        $html .= "</div>";

        // 3. _processed Version
        $processedPath = $player->photo_path ? preg_replace('/\.[^.]+$/i', '_processed.png', $player->photo_path) : null;
        $html .= "<div class='box'><h2>3. Versão Processada (_processed.png)</h2>";
        $html .= "<p>Expected Path: <code>{$processedPath}</code></p>";
        $hasProcessed = false;

        if ($processedPath) {
            $p1 = storage_path('app/public/' . $processedPath);
            $p2 = public_path('storage/' . $processedPath);
            if (file_exists($p1) || file_exists($p2)) {
                $hasProcessed = true;
                $html .= "<div class='checker'><img src='/storage/{$processedPath}' alt='Processed' /></div>";
            } else {
                $html .= "<p style='color:red;'>Arquivo _processed.png não existe.</p>";
            }
        }
        $html .= "</div>";

        $html .= "</body></html>";
        return response($html)->header('Content-Type', 'text/html');
    }
}
