<?php

namespace App\Http\Controllers\Admin;

use App\Events\MatchUpdated;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\GameMatch;
use App\Models\Championship;
use App\Models\Team;
use App\Models\MatchEvent;
use Illuminate\Support\Facades\DB;

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

    // Get single match details
    public function show($id)
    {
        $match = GameMatch::findOrFail($id);
        $champId = $match->championship_id;

        $match->load([
            'homeTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            },
            'awayTeam.players' => function ($q) use ($champId) {
                $q->where('team_players.championship_id', $champId);
            },
            'championship.sport',
            'category'
        ]);

        return response()->json($match);
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

        // Always update server timestamp on sync_timer to ensure accurate drift calculation
        if (isset($validated['match_details']['sync_timer'])) {
            $validated['match_details']['sync_timer']['updated_at'] = now()->timestamp * 1000;
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
        if (empty($match->round_name) || empty($match->championship_id)) {
            return;
        }

        $roundsOrder = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final'];
        $currentRoundIndex = array_search($match->round_name, $roundsOrder);
        $isSemi = ($match->round_name === 'semi');

        // Se não achou, não tem pra onde ir. Se for final, acabou.
        if ($currentRoundIndex === false || ($currentRoundIndex >= count($roundsOrder) - 1 && !$isSemi)) {
            return;
        }

        $nextRoundName = isset($roundsOrder[$currentRoundIndex + 1]) ? $roundsOrder[$currentRoundIndex + 1] : null;

        // Map round name to a logical round number for sorting (Group stage usually 1-20, so we start knockout at 50 or 100)
        $roundNumberMap = [
            'round_of_32' => 50,
            'round_of_16' => 51,
            'quarter' => 52,
            'semi' => 53,
            'final' => 54,
            'third_place' => 53 // Same level as semi/final or separate? usually happens before final.
        ];
        $nextRoundNumber = $nextRoundName ? ($roundNumberMap[$nextRoundName] ?? 60) : null;

        // Busca todos os jogos desta rodada neste campeonato, na mesma categoria!
        $roundMatches = GameMatch::where('championship_id', $match->championship_id)
            ->where('round_name', $match->round_name)
            ->when($match->category_id, function ($q) use ($match) {
                return $q->where('category_id', $match->category_id);
            })
            ->orderBy('id', 'asc')
            ->get();

        // Encontra posição do jogo atual
        $myIndex = $roundMatches->search(function ($m) use ($match) {
            return $m->id === $match->id;
        });

        if ($myIndex === false)
            return;

        // Determina o índice do "Par" (vizinho)
        // Regra: 0 e 1, 2 e 3...
        // Se myIndex é par (0, 2), partner é +1. Se ímpar (1, 3), partner é -1.
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
            // Se empatou (penalties)
            if ($match->home_score == $match->away_score) {
                $myWinnerId = $match->home_penalty_score > $match->away_penalty_score ? $match->home_team_id : $match->away_team_id;
            }

            $partnerWinnerId = $partnerMatch->home_score > $partnerMatch->away_score ? $partnerMatch->home_team_id : $partnerMatch->away_team_id;
            if ($partnerMatch->home_score == $partnerMatch->away_score) {
                $partnerWinnerId = $partnerMatch->home_penalty_score > $partnerMatch->away_penalty_score ? $partnerMatch->home_team_id : $partnerMatch->away_team_id;
            }

            if ($myWinnerId && $partnerWinnerId) {
                // Checa duplicação
                $exists = GameMatch::where('championship_id', $match->championship_id)
                    ->where('round_name', $nextRoundName)
                    ->when($match->category_id, function ($q) use ($match) {
                        return $q->where('category_id', $match->category_id);
                    })
                    ->where(function ($q) use ($myWinnerId, $partnerWinnerId) {
                        // Verifica se JÁ EXISTE um jogo com esses dois times, em qualquer ordem
                        $q->where(function ($q2) use ($myWinnerId, $partnerWinnerId) {
                            $q2->where('home_team_id', $myWinnerId)->where('away_team_id', $partnerWinnerId);
                        })->orWhere(function ($q3) use ($myWinnerId, $partnerWinnerId) {
                            $q3->where('home_team_id', $partnerWinnerId)->where('away_team_id', $myWinnerId);
                        });
                    })->exists();

                if (!$exists) {
                    $homeTeamId = ($myIndex < $partnerIndex) ? $myWinnerId : $partnerWinnerId;
                    $awayTeamId = ($myIndex < $partnerIndex) ? $partnerWinnerId : $myWinnerId;

                    // Data prevista: Pega a data mais tardia dos dois jogos e soma intervalo (ex: 7 dias)
                    $baseDate = $match->start_time > $partnerMatch->start_time ? $match->start_time : $partnerMatch->start_time;
                    $nextDate = \Carbon\Carbon::parse($baseDate)->addDays(7);

                    GameMatch::create([
                        'championship_id' => $match->championship_id,
                        'category_id' => $match->category_id,
                        'home_team_id' => $homeTeamId,
                        'away_team_id' => $awayTeamId,
                        'start_time' => $nextDate,
                        'location' => $match->location ?? 'A Definir',
                        'status' => 'scheduled',
                        'round_name' => $nextRoundName,
                        'round_number' => $nextRoundNumber,
                        'is_knockout' => true
                    ]);
                }
            }
        }

        // --- Perdedores -> Disputa de 3º Lugar (Apenas na Semi) ---
        if ($isSemi) {
            // Lógica para perdedores (incluindo pênaltis)
            $myLoserId = $match->home_score < $match->away_score ? $match->home_team_id : $match->away_team_id;
            if ($match->home_score == $match->away_score) {
                $myLoserId = $match->home_penalty_score < $match->away_penalty_score ? $match->home_team_id : $match->away_team_id;
            }

            $partnerLoserId = $partnerMatch->home_score < $partnerMatch->away_score ? $partnerMatch->home_team_id : $partnerMatch->away_team_id;
            if ($partnerMatch->home_score == $partnerMatch->away_score) {
                $partnerLoserId = $partnerMatch->home_penalty_score < $partnerMatch->away_penalty_score ? $partnerMatch->home_team_id : $partnerMatch->away_team_id;
            }

            if ($myLoserId && $partnerLoserId) {
                // Checa duplicação
                $exists3rd = GameMatch::where('championship_id', $match->championship_id)
                    ->where('round_name', 'third_place')
                    ->where('category_id', $match->category_id)
                    ->exists();

                if (!$exists3rd) {
                    $homeTeamId = ($myIndex < $partnerIndex) ? $myLoserId : $partnerLoserId;
                    $awayTeamId = ($myIndex < $partnerIndex) ? $partnerLoserId : $myLoserId;

                    $baseDate = $match->start_time > $partnerMatch->start_time ? $match->start_time : $partnerMatch->start_time;
                    $nextDate = \Carbon\Carbon::parse($baseDate)->addDays(7);

                    GameMatch::create([
                        'championship_id' => $match->championship_id,
                        'category_id' => $match->category_id,
                        'home_team_id' => $homeTeamId,
                        'away_team_id' => $awayTeamId,
                        'start_time' => $nextDate,
                        'location' => $match->location ?? 'A Definir',
                        'status' => 'scheduled',
                        'round_name' => 'third_place',
                        'round_number' => 53, // Same as Semi/Final context
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

        MatchUpdated::dispatch($match->id, $match->toArray());

        return response()->json($match);
    }

    // Add event to match (goal, card, etc)
    public function addEvent(Request $request, $id)
    {
        $match = GameMatch::findOrFail($id);

        $validated = $request->validate([
            'team_id' => 'nullable|exists:teams,id', // Allow system events without team
            'player_id' => 'nullable|integer',
            'event_type' => 'required|in:goal,yellow_card,red_card,blue_card,assist,foul,mvp,substitution,point,ace,block,timeout,period_start,period_end,match_start,match_end,shootout_goal,shootout_miss,takedown,guard_pass,mount,back_control,knee_on_belly,sweep,advantage,penalty,game_won,technical_foul,unsportsmanlike_foul,disqualifying_foul,free_throw,field_goal_2,field_goal_3,voice_debug,timer_control,system_error,user_action,user_action_blocked',
            'minute' => 'nullable|string', // Change to string to support "00:00"
            'period' => 'nullable|string',
            'value' => 'nullable|integer',
            'metadata' => 'nullable|array',
        ]);

        $auditTypesToStorage = ['system_error', 'user_action', 'user_action_blocked', 'voice_debug', 'voice_input'];

        if (in_array($validated['event_type'], $auditTypesToStorage)) {
            \App\Services\AuditLogger::log($validated['event_type'], $match->id, [
                'team_id' => $validated['team_id'] ?? null,
                'player_id' => $validated['player_id'] ?? null,
                'game_time' => $validated['minute'] ?? null,
                'period' => $validated['period'] ?? null,
                'value' => $validated['value'] ?? null,
                'metadata' => $validated['metadata'] ?? null,
            ]);

            // Broadcast so real-time clients ignore or log as needed
            // Provide a dummy ID so it looks like an event without being saved to the database
            $eventArray = [
                'id' => time() . rand(100, 999),
                'game_match_id' => $match->id,
                'event_type' => $validated['event_type'],
                'metadata' => $validated['metadata'] ?? null,
            ];
            \App\Events\MatchUpdated::dispatch($match->id, ['event' => $eventArray]);

            return response()->json($eventArray, 201);
        }

        $event = MatchEvent::create([
            'game_match_id' => $match->id,
            'team_id' => $validated['team_id'] ?? null,
            'player_id' => $validated['player_id'] ?? null,
            'event_type' => $validated['event_type'],
            'game_time' => $validated['minute'] ?? null,
            'period' => $validated['period'] ?? null,
            'value' => $validated['value'] ?? 1,
            'metadata' => $validated['metadata'] ?? null,
        ]);

        // Auto-update match score for regular points/goals
        $scoreEvents = [
            'goal',
            'point',
            'ace',
            'block',
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
            'sweep',
            'game_won'
        ];
        if (in_array($event->event_type, $scoreEvents)) {
            $value = $event->value ?: 1;

            // SPECIAL LOGIC FOR VOLLEYBALL: points don't increment match scores (sets), they increment MatchSet
            $match->load('championship.sport');
            $isVolley = $match->championship && ($match->championship->sport->id == 4 || stripos($match->championship->sport->name, 'vôlei') !== false || stripos($match->championship->sport->name, 'volei') !== false);

            if ($isVolley) {
                // Try to find the set by period string (e.g. "1º Set")
                $setNumber = preg_replace('/[^0-9]/', '', $event->period);
                if ($setNumber) {
                    $set = \App\Models\MatchSet::where('game_match_id', $match->id)->where('set_number', (string) $setNumber)->first();
                    if ($set) {
                        if ($event->team_id == $match->home_team_id) {
                            $set->increment('home_score', $value);
                        } else {
                            $set->increment('away_score', $value);
                        }
                    }
                }
            } else {
                // Check if it's an own goal - if so, invert the team that receives the point
                $isOwnGoal = isset($event->metadata['own_goal']) && $event->metadata['own_goal'] === true;

                if ($event->team_id == $match->home_team_id) {
                    // If home team scored, but it's own goal, increment away score
                    if ($isOwnGoal) {
                        $match->increment('away_score', $value);
                    } else {
                        $match->increment('home_score', $value);
                    }
                } elseif ($event->team_id == $match->away_team_id) {
                    // If away team scored, but it's own goal, increment home score
                    if ($isOwnGoal) {
                        $match->increment('home_score', $value);
                    } else {
                        $match->increment('away_score', $value);
                    }
                }
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
        // Only for "real" game events, not for audit/system logs
        $auditTypes = ['system_error', 'user_action', 'user_action_blocked', 'timer_control', 'voice_debug', 'voice_input'];
        if ($match->status === 'scheduled' && !in_array($event->event_type, $auditTypes)) {
            $match->update(['status' => 'live']);
        }

        // Auto-sync MVP: se o evento for 'mvp' e tiver player_id, atualiza a coluna dedicada
        // Isso garante que o ranking de MVP, a arte e a aba pública de MVP funcionem corretamente
        if ($event->event_type === 'mvp' && $event->player_id) {
            $awards = $match->awards ?? [];
            $awards['craque'] = [
                'player_id' => $event->player_id,
                'photo_id' => null,
            ];
            $match->update([
                'mvp_player_id' => $event->player_id,
                'awards' => $awards,
            ]);
        }

        MatchUpdated::dispatch($match->id, ['event' => $event]);

        return response()->json($event, 201);
    }

    // Get match events
    public function events($id)
    {
        try {
            $match = GameMatch::findOrFail($id);
            // Mostrar logs do sistema para auditoria (mesários/admins precisam ver o que deu errado)
            $historyTypes = ['system_error', 'user_action', 'user_action_blocked', 'timer_control', 'voice_input'];

            $events = \App\Models\MatchEvent::where('game_match_id', $id)
                ->with(['player'])
                ->orderBy('id', 'desc')
                ->get();

            // Otimização: Pegar todos os números de camisa do campeonato de uma vez
            $playerNumbers = DB::table('team_players')
                ->where('championship_id', $match->championship_id)
                ->get()
                ->groupBy('user_id');

            $formatted = $events->map(function ($e) use ($match, $playerNumbers) {
                $player = $e->player;

                // Busca número indexado por user_id e filtrado por team_id
                $number = null;
                if ($player && isset($playerNumbers[$player->id])) {
                    $teamNum = $playerNumbers[$player->id]->firstWhere('team_id', $e->team_id);
                    $number = $teamNum ? $teamNum->number : null;
                }

                return [
                    'id' => $e->id,
                    'team_id' => $e->team_id,
                    'player_id' => $e->player_id,
                    'event_type' => $e->event_type,
                    'game_time' => $e->game_time ?? '00:00',
                    'period' => $e->period ?? '1º Set',
                    'metadata' => $e->metadata,
                    'player_name' => $player ? ($player->nickname ?: $player->name) : ($e->metadata['player_name'] ?? null),
                    'player_number' => $number,
                    'created_at' => $e->created_at->toIso8601String(),
                ];
            });

            // LER LOGS DO ARQUIVO DE AUDITORIA
            $fileEvents = [];
            $logFiles = glob(storage_path('logs/audit*.log'));
            foreach ($logFiles as $file) {
                $contents = file_get_contents($file);
                // match example: [2026-02-26 23:44:00] audit.INFO: voice_input {"match_id":3103,"metadata":{...},"timestamp":"2026-02-26T23:44:00+00:00"}
                // We'll read lines and parse JSON where available. Since monolog logs the context as json, we can extract it.
                $lines = explode(PHP_EOL, $contents);
                foreach ($lines as $line) {
                    if (empty(trim($line)))
                        continue;

                    // Regex para pegar a data do log e o JSON do contexto
                    // Formato Monolog default: [YYYY-MM-DD HH:MM:SS] channel.LEVEL: Message {"context":json} []
                    if (preg_match('/^\[(.*?)\] .*?\.INFO: (.*?) ({.*})/', $line, $matches)) {
                        $logDate = $matches[1];
                        $eventType = $matches[2];
                        $context = json_decode($matches[3], true);

                        if (isset($context['match_id']) && $context['match_id'] == $id) {
                            $metadata = $context['metadata'] ?? [];
                            $fileEvents[] = [
                                'id' => 'log_' . md5($line), // Unique ID fake
                                'team_id' => $metadata['team_id'] ?? null,
                                'player_id' => $metadata['player_id'] ?? null,
                                'event_type' => $eventType,
                                'game_time' => $metadata['game_time'] ?? '00:00',
                                'period' => $metadata['period'] ?? null,
                                'metadata' => $metadata,
                                'player_name' => $metadata['player_name'] ?? null,
                                'player_number' => null, // Player number is hard to fetch offline but usually not needed for these logs
                                'created_at' => \Carbon\Carbon::parse($logDate)->toIso8601String(),
                            ];
                        }
                    }
                }
            }

            // JOIN and SORT them
            $allEvents = collect($formatted)->concat($fileEvents)->sortByDesc('created_at')->values();

            return response()->json($allEvents);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erro interno ao carregar eventos',
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ], 500);
        }
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
            'ace',
            'block',
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

            // SPECIAL LOGIC FOR VOLLEYBALL: points don't decrement match scores (sets), they decrement MatchSet
            $match->load('championship.sport');
            $isVolley = $match->championship && ($match->championship->sport->id == 4 || stripos($match->championship->sport->name, 'vôlei') !== false || stripos($match->championship->sport->name, 'volei') !== false);

            if ($isVolley) {
                // Try to find the set by period string (e.g. "1º Set")
                $setNumber = preg_replace('/[^0-9]/', '', $event->period);
                if ($setNumber) {
                    $set = \App\Models\MatchSet::where('game_match_id', $match->id)->where('set_number', (string) $setNumber)->first();
                    if ($set) {
                        $column = ($event->team_id == $match->home_team_id) ? 'home_score' : 'away_score';
                        $set->update([
                            $column => DB::raw("GREATEST(0, $column - $value)")
                        ]);
                    }
                }
            } else {
                // Check if it's an own goal - if so, invert the team that loses the point
                $isOwnGoal = isset($event->metadata['own_goal']) && $event->metadata['own_goal'] === true;

                if ($event->team_id == $match->home_team_id) {
                    // If home team scored, but it's own goal, decrement away score
                    if ($isOwnGoal) {
                        $match->update(['away_score' => DB::raw("GREATEST(0, away_score - $value)")]);
                    } else {
                        $match->update(['home_score' => DB::raw("GREATEST(0, home_score - $value)")]);
                    }
                } elseif ($event->team_id == $match->away_team_id) {
                    // If away team scored, but it's own goal, decrement home score
                    if ($isOwnGoal) {
                        $match->update(['home_score' => DB::raw("GREATEST(0, home_score - $value)")]);
                    } else {
                        $match->update(['away_score' => DB::raw("GREATEST(0, away_score - $value)")]);
                    }
                }
            }
        }

        // Auto-update penalty score
        if ($event->event_type === 'shootout_goal') {
            if ($event->team_id == $match->home_team_id) {
                $match->update(['home_penalty_score' => DB::raw("GREATEST(0, home_penalty_score - 1)")]);
            } elseif ($event->team_id == $match->away_team_id) {
                $match->update(['away_penalty_score' => DB::raw("GREATEST(0, away_penalty_score - 1)")]);
            }
        }

        // --- NEW: Status / Period Reversion Logic ---
        // Revert to 'live' if 'match_end' is deleted
        if ($event->event_type === 'match_end' || ($event->event_type === 'period_end' && $event->period === 'Fim')) {
            $match->update(['status' => 'live']);
        }

        // Revert to 'scheduled' if 'match_start' is deleted
        if ($event->event_type === 'match_start') {
            $match->update(['status' => 'scheduled']);
        }

        $event->delete();

        // Refresh and broadcast
        $match->refresh()->load(['homeTeam', 'awayTeam', 'category']);
        MatchUpdated::dispatch($match->id, $match->toArray());

        return response()->json(['message' => 'Event deleted successfully', 'match' => $match]);
    }
}
