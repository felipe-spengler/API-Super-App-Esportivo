<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GameMatch;
use App\Models\Championship;
use App\Models\User;
use App\Models\Team;
use App\Services\ArtGeneratorService;

class ArtGeneratorController extends Controller
{
    protected $generator;

    public function __construct(ArtGeneratorService $generator)
    {
        $this->generator = $generator;
    }

    /**
     * Generation endpoints
     */

    public function matchFaceoff($matchId)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam', 'championship.sport', 'championship.club', 'events.player', 'mvp'])->findOrFail($matchId);
        return $this->generator->generateConfrontationArt($match);
    }

    public function matchScheduled($matchId)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam', 'championship.sport', 'championship.club'])->findOrFail($matchId);
        return $this->generator->generateScheduledArt($match);
    }

    public function downloadScheduledArt($matchId)
    {
        return $this->matchScheduled($matchId);
    }

    public function mvpArt($matchId, Request $request)
    {
        $match = GameMatch::with(['homeTeam', 'awayTeam', 'championship.sport', 'championship.club', 'mvp'])->findOrFail($matchId);
        $playerId = $request->query('player_id') ?? $match->mvp_id;
        if (!$playerId)
            return response('MVP não definido', 404);
        $player = User::findOrFail($playerId);
        return $this->generator->generatePlayerArt($player, $match, 'craque');
    }

    public function downloadMvpArt($matchId, Request $request)
    {
        return $this->mvpArt($matchId, $request);
    }

    public function downloadArt($matchId, Request $request)
    {
        return $this->mvpArt($matchId, $request);
    }

    public function standingsArt($championshipId)
    {
        return $this->generator->generateStandingsArt($championshipId);
    }

    public function championshipAwardArt($championshipId, $awardType, Request $request)
    {
        $championship = Championship::with(['sport', 'club'])->findOrFail($championshipId);
        $categoryId = $request->query('categoryId');
        $awards = $championship->awards ?? [];
        $target = ($categoryId && isset($awards[$categoryId][$awardType])) ? $awards[$categoryId][$awardType] : ($awards[$awardType] ?? ($awards['generic'][$awardType] ?? null));

        if (!$target || !isset($target['player_id']))
            return response("Premiação não definida: $awardType", 404);

        $player = User::findOrFail($target['player_id']);
        $team = isset($target['team_id']) ? Team::find($target['team_id']) : $championship->teams()->whereHas('players', fn($q) => $q->where('users.id', $player->id))->first();

        return $this->generator->generateAwardCard($player, $championship, $team, $awardType, $championship->club);
    }
}
