<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GameMatch;
use App\Models\User;
use App\Models\Championship;
use App\Models\MatchEvent;
use Illuminate\Support\Facades\DB;

class ArtGeneratorController extends Controller
{
    /**
     * Dados para Arte de Confronto (Match Face-off)
     */
    public function matchFaceoff($matchId)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam', 'championship'])->findOrFail($matchId);

        return response()->json([
            'type' => 'faceoff',
            'data' => [
                'championship_name' => $match->championship->name,
                'round' => $match->round_name ?? 'Rodada',
                'date' => $match->start_time->format('d/m/Y'),
                'time' => $match->start_time->format('H:i'),
                'location' => $match->location,
                'home_team' => [
                    'name' => $match->homeTeam->name,
                    'logo' => $match->homeTeam->logo_path ? asset('storage/' . $match->homeTeam->logo_path) : null,
                    'color' => $match->homeTeam->primary_color,
                ],
                'away_team' => [
                    'name' => $match->awayTeam->name,
                    'logo' => $match->awayTeam->logo_path ? asset('storage/' . $match->awayTeam->logo_path) : null,
                    'color' => $match->awayTeam->primary_color,
                ],
                // Tenta pegar imagem do campeonato, senão usa template padrão
                'bg_image' => $match->championship->image_path
                    ? asset('storage/' . $match->championship->image_path)
                    : asset('assets/templates/bg_faceoff.png'), // Imagem de fundo padrão
            ]
        ]);
    }

    /**
     * Dados para Arte de MVP/Craque
     */
    public function mvpArt($matchId)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam', 'championship', 'mvpPlayer'])->findOrFail($matchId);

        if (!$match->mvp_player_id) {
            return response()->json(['message' => 'MVP não definido para esta partida.'], 404);
        }

        $player = $match->mvpPlayer;
        $team = $match->homeTeam; // Simplified logic

        // Real Stats
        $goals = MatchEvent::where('game_match_id', $matchId)
            ->where('player_id', $player->id)
            ->where('event_type', 'goal')
            ->count();

        $assists = MatchEvent::where('game_match_id', $matchId)
            ->where('player_id', $player->id)
            ->where('event_type', 'assist')
            ->count();

        return response()->json([
            'type' => 'mvp',
            'data' => [
                'template' => 'mvp_v1',
                'bg_image' => asset('assets/templates/bg_mvp.png'), // Fundo Dourado/Craque
                'title' => 'CRAQUE DA PARTIDA',
                'player_name' => $player->name,
                'player_photo' => $player->photo_path ? asset('storage/' . $player->photo_path) : null,
                'team_logo' => $team->logo_path ? asset('storage/' . $team->logo_path) : null,
                'match_score' => "{$match->home_score} x {$match->away_score}",
                'opponent' => $match->awayTeam->name,
                'stats' => [
                    'goals' => $goals,
                    'assists' => $assists
                ]
            ]
        ]);
    }

    /**
     * Dados para Arte de Artilheiro do Campeonato
     */
    public function topScorerArt($championshipId)
    {
        $topScorer = MatchEvent::where('event_type', 'goal')
            ->whereHas('gameMatch', function ($query) use ($championshipId) {
                $query->where('championship_id', $championshipId);
            })
            ->select('player_id', DB::raw('count(*) as goals'))
            ->groupBy('player_id')
            ->orderBy('goals', 'desc')
            ->with(['player:id,name,photo_path'])
            ->first();

        if (!$topScorer) {
            // Fallback Mock se não houver dados
            return response()->json([
                'type' => 'top_scorer',
                'data' => [
                    'template' => 'artilheiro_v1',
                    'title' => 'ARTILHEIRO',
                    'player_name' => 'Aguardando Jogos',
                    'team_logo' => null,
                    'goals' => 0,
                    'matches' => 0
                ]
            ]);
        }

        // Get total matches for player in this championship
        $matches = MatchEvent::where('player_id', $topScorer->player_id)
            ->whereHas('gameMatch', function ($q) use ($championshipId) {
                $q->where('championship_id', $championshipId);
            })
            ->distinct('game_match_id')
            ->count();

        return response()->json([
            'type' => 'top_scorer',
            'data' => [
                'template' => 'artilheiro_v1',
                'title' => 'ARTILHEIRO',
                'player_name' => $topScorer->player->name,
                'player_photo' => $topScorer->player->photo_path ? asset('storage/' . $topScorer->player->photo_path) : null,
                'team_logo' => null, // Placeholder to avoid N+1 complexity for now
                'goals' => $topScorer->goals,
                'matches' => $matches
            ]
        ]);
    }

    /**
     * Dados para Arte de Melhor Goleiro
     */
    public function bestGoalkeeperArt($championshipId)
    {
        return response()->json([
            'type' => 'best_goalkeeper',
            'data' => [
                'template' => 'goleiro_v1',
                'title' => 'PAREDÃO',
                'player_name' => 'Nome do Goleiro',
                'team_logo' => null,
                'clean_sheets' => 5,
                'saves' => 20
            ]
        ]);
    }

    /**
     * Dados para Arte de Classificação
     */
    public function standingsArt($championshipId)
    {
        // Aqui reutilizariamos a lógica do StatisticsController::standings
        // Mas retornando formatado para arte (apenas top 5, por exemplo)

        return response()->json([
            'type' => 'standings',
            'message' => 'Dados para arte de classificação prontos (mock).'
        ]);
    }
    /**
     * Gera e retorna a Imagem do MVP (JPEG)
     */
    public function downloadMvpArt($matchId)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam', 'mvpPlayer', 'championship'])->findOrFail($matchId);

        if (!$match->mvp_player_id) {
            return response('MVP não definido para esta partida.', 404);
        }

        // --- Configuração ---
        $bgPath = public_path('assets/templates/bg_mvp.jpg');
        $fontPath = public_path('assets/fonts/Roboto-Bold.ttf');

        if (!file_exists($bgPath)) {
            // Fallback development logic if file missing (should not happen after copy)
            return response('Template de fundo não encontrado: ' . $bgPath, 500);
        }

        // --- 1. Inicializa Imagem ---
        $img = @imagecreatefromjpeg($bgPath);
        if (!$img)
            return response('Erro ao carregar template.', 500);

        $width = imagesx($img);
        $white = imagecolorallocate($img, 255, 255, 255);
        $black = imagecolorallocate($img, 30, 30, 30);

        // --- 2. Foto do Jogador ---
        if ($match->mvpPlayer->photo_path) {
            $photoPath = storage_path('app/public/' . $match->mvpPlayer->photo_path);

            // Tenta caminho alternativo se não achar (links simbolicos as vezes)
            if (!file_exists($photoPath)) {
                $photoPath = public_path('storage/' . $match->mvpPlayer->photo_path);
            }

            if (file_exists($photoPath)) {
                $photoInfo = getimagesize($photoPath);
                $playerImg = null;

                if ($photoInfo['mime'] == 'image/jpeg')
                    $playerImg = @imagecreatefromjpeg($photoPath);
                elseif ($photoInfo['mime'] == 'image/png')
                    $playerImg = @imagecreatefrompng($photoPath);

                if ($playerImg) {
                    // Lógica Legacy: Altura fixa 800px
                    $targetHeight = 800;
                    $origW = imagesx($playerImg);
                    $origH = imagesy($playerImg);
                    $ratio = $origW / $origH;
                    $targetWidth = $targetHeight * $ratio;

                    $resizedImg = imagecreatetruecolor($targetWidth, $targetHeight);

                    // Transparência para PNG
                    imagealphablending($resizedImg, false);
                    imagesavealpha($resizedImg, true);

                    imagecopyresampled($resizedImg, $playerImg, 0, 0, 0, 0, $targetWidth, $targetHeight, $origW, $origH);

                    // Centralizar
                    $xPos = ($width - $targetWidth) / 2;
                    $yPos = 335; // Posição vertical fixa do legado

                    imagecopy($img, $resizedImg, $xPos, $yPos, 0, 0, $targetWidth, $targetHeight);

                    imagedestroy($playerImg);
                    imagedestroy($resizedImg);
                }
            }
        }

        // --- 3. Textos ---
        // Helper para centralizar texto
        $drawCenteredText = function ($image, $size, $y, $color, $font, $text) use ($width) {
            $box = imagettfbbox($size, 0, $font, $text);
            $textWidth = $box[2] - $box[0];
            $x = ($width - $textWidth) / 2;
            imagettftext($image, $size, 0, $x, $y, $color, $font, $text);
        };

        // Nome do Jogador
        $playerName = mb_strtoupper($match->mvpPlayer->name);
        $drawCenteredText($img, 70, 1230, $white, $fontPath, $playerName);

        // Nome do Campeonato
        $champName = mb_strtoupper($match->championship->name);
        $drawCenteredText($img, 40, 1700, $white, $fontPath, $champName);

        // Rodada
        $roundName = mb_strtoupper($match->round_name ?? 'Rodada');
        $drawCenteredText($img, 30, 1750, $white, $fontPath, $roundName);

        // Label Categoria (Fixo CRAQUE DO JOGO por enquanto)
        //$drawCenteredText($img, 50, 1150, $white, $fontPath, 'CRAQUE DO JOGO');


        // --- 4. Placar ---
        $homeScore = $match->home_score ?? 0;
        $awayScore = $match->away_score ?? 0;
        $scoreY = 1535;

        // Placar Esquerdo
        $boxA = imagettfbbox(100, 0, $fontPath, $homeScore);
        $wA = $boxA[2] - $boxA[0];
        imagettftext($img, 100, 0, ($width / 2) - 180 - $wA, $scoreY, $black, $fontPath, $homeScore);

        // Placar Direito
        imagettftext($img, 100, 0, ($width / 2) + 180 + 40, $scoreY, $black, $fontPath, $awayScore);


        // --- 5. Output ---
        ob_start();
        imagejpeg($img, null, 90);
        $content = ob_get_clean();
        imagedestroy($img);

        return response($content)->header('Content-Type', 'image/jpeg');
    }
}
