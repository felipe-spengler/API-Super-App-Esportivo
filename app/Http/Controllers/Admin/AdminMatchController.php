<?php

namespace App\Http\Controllers\Admin;

use App\Events\MatchUpdated;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GameMatch;
use App\Models\Championship;
use App\Models\Team;
use App\Models\MatchEvent;

use App\Http\Requests\StoreMatchRequest;
use App\Http\Controllers\Admin\BracketController;

class AdminMatchController extends Controller
{
    // List matches for admin
    public function index(Request $request)
    {
        $user = $request->user();

        $query = GameMatch::with(['homeTeam', 'awayTeam', 'championship.sport']);

        // Filter by club if not super admin
        if ($user->club_id) {
            $query->whereHas('championship', function ($q) use ($user) {
                $q->where('club_id', $user->club_id);
            });
        }

        if ($request->has('championship_id')) {
            $query->where('championship_id', $request->championship_id);
        }

        if ($request->has('category_id') && $request->category_id != 'null') {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $matches = $query->orderBy('start_time', 'desc')->get();

        return response()->json($matches);
    }

    // Create new match
    public function store(StoreMatchRequest $request)
    {
        $validated = $request->validated();

        $match = GameMatch::create($validated);

        return response()->json($match->load(['homeTeam', 'awayTeam']), 201);
    }

    // Update match
    public function update(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);

        $validated = $request->validate([
            'home_team_id' => 'sometimes|exists:teams,id',
            'away_team_id' => 'sometimes|exists:teams,id|different:home_team_id',
            'start_time' => 'sometimes|date_format:Y-m-d\TH:i|after_or_equal:2020-01-01',
            'location' => 'nullable|string|max:255',
            'round_name' => 'nullable|string|max:100',
            'round_number' => 'nullable|integer|min:1',
            'phase' => 'nullable|string|max:100',
            'home_score' => 'nullable|integer|min:0',
            'away_score' => 'nullable|integer|min:0',
            'home_penalty_score' => 'nullable|integer|min:0',
            'away_penalty_score' => 'nullable|integer|min:0',
            'status' => 'sometimes|in:scheduled,live,finished,cancelled',
            'category_id' => 'nullable|integer|exists:categories,id',
            'match_details' => 'nullable|array',
            'arbitration' => 'nullable|array',
        ]);

        // Merge arbitration into match_details if provided
        if (isset($validated['arbitration'])) {
            $currentDetails = $match->match_details ?? [];
            $currentDetails['arbitration'] = $validated['arbitration'];
            $validated['match_details'] = $currentDetails;
            unset($validated['arbitration']);
        }

        $match->update($validated);
        $match->load(['homeTeam', 'awayTeam', 'category']);

        MatchUpdated::dispatch($match->id, $match->toArray());

        return response()->json($match);
    }

    // Finish match and set final score
    public function finish(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);

        $validated = $request->validate([
            'home_score' => 'required|integer|min:0',
            'away_score' => 'required|integer|min:0',
            'home_penalty_score' => 'nullable|integer|min:0',
            'away_penalty_score' => 'nullable|integer|min:0',
        ]);

        $updateData = [
            'home_score' => $validated['home_score'],
            'away_score' => $validated['away_score'],
            'status' => 'finished',
        ];

        if (array_key_exists('home_penalty_score', $validated))
            $updateData['home_penalty_score'] = $validated['home_penalty_score'];
        if (array_key_exists('away_penalty_score', $validated))
            $updateData['away_penalty_score'] = $validated['away_penalty_score'];

        $match->update($updateData);
        $match->load(['homeTeam', 'awayTeam', 'category']);

        MatchUpdated::dispatch($match->id, $match->toArray());

        // Check for automatic bracket advancement or Group -> Knockout transition
        try {
            if ($match->group_name) {
                $this->checkAndGenerateKnockout($match);
            } else {
                $this->checkAndAdvanceBracket($match);
            }
        } catch (\Exception $e) {
            \Log::error("Auto Automation Error: " . $e->getMessage());
        }

        return response()->json($match);
    }

    /**
     * Verifica se a fase de grupos acabou e gera o mata-mata automaticamente
     */
    private function checkAndGenerateKnockout($match)
    {
        // 1. Verifica se todos os jogos de grupo estão finalizados
        $pendingQuery = GameMatch::where('championship_id', $match->championship_id)
            ->whereNotNull('group_name')
            ->where('status', '!=', 'finished');

        if ($match->category_id) {
            $pendingQuery->where('category_id', $match->category_id);
        }

        if ($pendingQuery->count() > 0) {
            return; // Ainda tem jogos
        }

        // 2. Verifica se já existe mata-mata gerado para esta categoria
        $existsQuery = GameMatch::where('championship_id', $match->championship_id)
            ->where('is_knockout', true);

        if ($match->category_id) {
            $existsQuery->where('category_id', $match->category_id);
        }

        if ($existsQuery->exists()) {
            return; // Já gerou
        }

        // 3. Gera mata-mata
        $bracketController = new BracketController();
        // Simula request
        $req = new Request();
        $req->merge(['category_id' => $match->category_id]);

        $bracketController->generateFromGroups($req, $match->championship_id);
    }

    /**
     * Verifica e avança o chaveamento automaticamente
     */
    private function checkAndAdvanceBracket($match)
    {
        // Só processa se for jogo de mata-mata com rodada definida
        if (empty($match->round) || empty($match->championship_id)) {
            return;
        }

        $roundsOrder = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final'];
        $currentRoundIndex = array_search($match->round, $roundsOrder);
        $isSemi = ($match->round === 'semi');

        // Se não achou, não tem pra onde ir. Se for final, acabou.
        // A MENOS que precise gerar 3o lugar, mas 3o lugar é gerado NA semi.
        if ($currentRoundIndex === false || ($currentRoundIndex >= count($roundsOrder) - 1 && !$isSemi)) {
            return;
        }

        $nextRoundName = isset($roundsOrder[$currentRoundIndex + 1]) ? $roundsOrder[$currentRoundIndex + 1] : null;

        // Busca todos os jogos desta rodada neste campeonato
        $roundMatches = GameMatch::where('championship_id', $match->championship_id)
            ->where('round', $match->round)
            ->where('category_id', $match->category_id) // Add category check
            ->orderBy('id', 'asc')
            ->get();

        // Encontra posição do jogo atual
        $myIndex = $roundMatches->search(function ($m) use ($match) {
            return $m->id === $match->id;
        });

        if ($myIndex === false)
            return;

        // Determina o índice do "Par" (vizinho)
        $metrics = $myIndex % 2; // 0 ou 1
        $partnerIndex = ($metrics === 0) ? $myIndex + 1 : $myIndex - 1;

        if (!isset($roundMatches[$partnerIndex]))
            return;
        $partnerMatch = $roundMatches[$partnerIndex];

        if ($partnerMatch->status !== 'finished')
            return;

        // --- Vencedores -> Próxima Fase ---
        if ($nextRoundName) {
            $myWinnerId = $match->home_score > $match->away_score ? $match->home_team_id : $match->away_team_id;
            $partnerWinnerId = $partnerMatch->home_score > $partnerMatch->away_score ? $partnerMatch->home_team_id : $partnerMatch->away_team_id;

            if ($myWinnerId && $partnerWinnerId) {
                // Checa duplicação
                $exists = GameMatch::where('championship_id', $match->championship_id)
                    ->where('round', $nextRoundName)
                    ->where('category_id', $match->category_id)
                    ->where(function ($q) use ($myWinnerId, $partnerWinnerId) {
                        $q->where('home_team_id', $myWinnerId)->orWhere('home_team_id', $partnerWinnerId);
                    })->exists();

                if (!$exists) {
                    $homeTeamId = ($myIndex < $partnerIndex) ? $myWinnerId : $partnerWinnerId;
                    $awayTeamId = ($myIndex < $partnerIndex) ? $partnerWinnerId : $myWinnerId;

                    // Data prevista: Pega a data mais tardia dos dois jogos e soma intervalo (ex: 7 dias)
                    // Idealmente pegaria intervalo do campeonato, mas aqui vamos hardcoded por segurança ou 7 dias
                    $baseDate = $match->start_time > $partnerMatch->start_time ? $match->start_time : $partnerMatch->start_time;
                    $nextDate = \Carbon\Carbon::parse($baseDate)->addDays(7); // Default +7 dias

                    GameMatch::create([
                        'championship_id' => $match->championship_id,
                        'category_id' => $match->category_id,
                        'home_team_id' => $homeTeamId,
                        'away_team_id' => $awayTeamId,
                        'start_time' => $nextDate,
                        'location' => $match->location ?? 'A Definir',
                        'status' => 'scheduled',
                        'round' => $nextRoundName,
                        'is_knockout' => true
                    ]);
                }
            }
        }

        // --- Perdedores -> Disputa de 3º Lugar (Apenas na Semi) ---
        if ($isSemi) {
            $myLoserId = $match->home_score < $match->away_score ? $match->home_team_id : $match->away_team_id;
            $partnerLoserId = $partnerMatch->home_score < $partnerMatch->away_score ? $partnerMatch->home_team_id : $partnerMatch->away_team_id;

            if ($myLoserId && $partnerLoserId) {
                // Checa duplicação
                $exists3rd = GameMatch::where('championship_id', $match->championship_id)
                    ->where('round', 'third_place')
                    ->where('category_id', $match->category_id)
                    ->exists();

                if (!$exists3rd) {
                    $homeTeamId = ($myIndex < $partnerIndex) ? $myLoserId : $partnerLoserId;
                    $awayTeamId = ($myIndex < $partnerIndex) ? $partnerLoserId : $myLoserId;

                    $baseDate = $match->start_time > $partnerMatch->start_time ? $match->start_time : $partnerMatch->start_time;
                    // Geralmente mesmo dia da final ou antes
                    $nextDate = \Carbon\Carbon::parse($baseDate)->addDays(7);

                    GameMatch::create([
                        'championship_id' => $match->championship_id,
                        'category_id' => $match->category_id,
                        'home_team_id' => $homeTeamId,
                        'away_team_id' => $awayTeamId,
                        'start_time' => $nextDate,
                        'location' => $match->location ?? 'A Definir',
                        'status' => 'scheduled',
                        'round' => 'third_place',
                        'is_knockout' => true
                    ]);
                }
            }
        }
    }


    // Set MVP for match
    public function setMVP(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);

        $validated = $request->validate([
            'player_id' => 'required|integer',
            'photo_id' => 'nullable|integer',
        ]);

        // Update both legacy column and awards JSON
        $awards = $match->awards ?? [];
        $awards['craque'] = [
            'player_id' => $validated['player_id'],
            'photo_id' => $validated['photo_id'] ?? null,
        ];

        $match->update([
            'mvp_player_id' => $validated['player_id'],
            'awards' => $awards,
        ]);

        return response()->json($match);
    }

    // Add event to match (goal, card, etc)
    public function addEvent(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);

        $validated = $request->validate([
            'team_id' => 'nullable|exists:teams,id', // Allow system events without team
            'player_id' => 'nullable|integer',
            'event_type' => 'required|in:goal,yellow_card,red_card,blue_card,assist,foul,mvp,substitution,point,ace,block,timeout,period_start,period_end,match_start,match_end,shootout_goal,shootout_miss,takedown,guard_pass,mount,back_control,knee_on_belly,sweep,advantage,penalty',
            'minute' => 'nullable|string', // Change to string to support "00:00"
            'value' => 'nullable|integer',
            'metadata' => 'nullable|array',
        ]);

        $event = MatchEvent::create([
            'game_match_id' => $match->id,
            'team_id' => $validated['team_id'] ?? null,
            'player_id' => $validated['player_id'] ?? null,
            'event_type' => $validated['event_type'],
            'game_time' => $validated['minute'] ?? null,
            'value' => $validated['value'] ?? 1,
            'metadata' => $validated['metadata'] ?? null,
        ]);

        // Auto-update match score for regular points/goals
        $scoreEvents = [
            'goal',
            'point',
            '1_point',
            '2_points',
            '3_points',
            'free_throw',
            'field_goal_2',
            'field_goal_3',
            'jiu_jitsu_2',
            'jiu_jitsu_3',
            'jiu_jitsu_4',
            'takedown',
            'guard_pass',
            'mount',
            'back_control',
            'knee_on_belly',
            'sweep'
        ];
        if (in_array($event->event_type, $scoreEvents)) {
            $value = $event->value ?: 1;
            if ($event->team_id == $match->home_team_id) {
                $match->increment('home_score', $value);
            } elseif ($event->team_id == $match->away_team_id) {
                $match->increment('away_score', $value);
            }
        }

        // Auto-update penalty score
        if ($event->event_type === 'shootout_goal') {
            if ($event->team_id == $match->home_team_id) {
                $match->increment('home_penalty_score');
            } elseif ($event->team_id == $match->away_team_id) {
                $match->increment('away_penalty_score');
            }
        }

        // Auto-update match status to live if it was scheduled
        if ($match->status === 'scheduled') {
            $match->update(['status' => 'live']);
        }

        MatchUpdated::dispatch($match->id, ['event' => $event]);

        return response()->json($event, 201);
    }

    // Get match events
    public function events($id)
    {
        $match = GameMatch::with(['events.team', 'events.player'])->findOrFail($id);

        return response()->json($match->events);
    }

    // Delete match
    public function destroy($id)
    {
        $match = GameMatch::findOrFail($id);
        $match->delete();

        return response()->json(['message' => 'Match deleted successfully']);
    }

    // Update match awards
    public function updateAwards(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);

        $validated = $request->validate([
            'awards' => 'required|array',
        ]);

        $match->update(['awards' => $validated['awards']]);

        return response()->json($match);
    }

    // Delete a specific event
    public function deleteEvent($matchId, $eventId)
    {
        $event = MatchEvent::where('game_match_id', $matchId)->findOrFail($eventId);
        $match = GameMatch::findOrFail($matchId);

        // Auto-update match score if deleting goals/points
        $scoreEvents = [
            'goal',
            'point',
            '1_point',
            '2_points',
            '3_points',
            'free_throw',
            'field_goal_2',
            'field_goal_3',
            'jiu_jitsu_2',
            'jiu_jitsu_3',
            'jiu_jitsu_4'
        ];
        if (in_array($event->event_type, $scoreEvents)) {
            $value = $event->value ?: 1;
            if ($event->team_id == $match->home_team_id) {
                $match->decrement('home_score', $value);
            } elseif ($event->team_id == $match->away_team_id) {
                $match->decrement('away_score', $value);
            }
        }

        // Auto-update penalty score
        if ($event->event_type === 'shootout_goal') {
            if ($event->team_id == $match->home_team_id) {
                $match->decrement('home_penalty_score');
            } elseif ($event->team_id == $match->away_team_id) {
                $match->decrement('away_penalty_score');
            }
        }

        $event->delete();

        return response()->json(['message' => 'Event deleted successfully']);
    }
}
