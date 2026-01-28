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
                $q->where('championship_id', $championshipId); })
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
}
