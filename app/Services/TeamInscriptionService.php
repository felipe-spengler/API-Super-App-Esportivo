<?php

namespace App\Services;

use App\Models\Club;
use App\Models\Championship;
use App\Models\Team;
use App\Models\Category;
use App\Models\User;
use App\Mail\AthleteTeamInscriptionMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class TeamInscriptionService
{
    /**
     * Verifica se o e-mail do atleta é real e válido para envio (ignora e-mails temporários gerados pelo sistema).
     */
    public static function isValidAthleteEmail(?string $email): bool
    {
        if (empty($email)) {
            return false;
        }

        $email = strtolower(trim($email));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $tempDomains = [
            '@temporario.com',
            '@temp.local',
            '@example.com',
            '@teste.local',
        ];

        foreach ($tempDomains as $domain) {
            if (str_ends_with($email, $domain)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Envia e-mail de confirmação diretamente para o ATLETA quando ele é inscrito em um time / campeonato.
     *
     * @param User $athlete Usuário/Atleta inscrito
     * @param Team $team Equipe em que foi inscrito
     * @param int|null $championshipId ID do campeonato (opcional)
     * @param array $playerDetails Dados extras na equipe ('position', 'number', 'category_id')
     * @return bool
     */
    public static function notifyAthleteTeamInscription(
        User $athlete,
        Team $team,
        ?int $championshipId = null,
        array $playerDetails = []
    ): bool {
        try {
            if (!self::isValidAthleteEmail($athlete->email)) {
                Log::info("TeamInscriptionService: Atleta '{$athlete->name}' (ID: {$athlete->id}) não possui e-mail válido/real ({$athlete->email}). Notificação ignorada.");
                return false;
            }

            $championship = $championshipId
                ? Championship::with(['club', 'sport'])->find($championshipId)
                : null;

            $category = null;
            if (!empty($playerDetails['category_id'])) {
                $category = Category::find($playerDetails['category_id']);
            } elseif ($championshipId) {
                $ctPivot = DB::table('championship_team')
                    ->where('team_id', $team->id)
                    ->where('championship_id', $championshipId)
                    ->first();

                if ($ctPivot && $ctPivot->category_id) {
                    $category = Category::find($ctPivot->category_id);
                }
            }

            $club = $championship?->club
                ?? ($team->club_id ? Club::find($team->club_id) : null)
                ?? ($championship?->club_id ? Club::find($championship->club_id) : null);

            $recipientEmail = trim($athlete->email);

            Mail::to($recipientEmail)->send(new AthleteTeamInscriptionMail(
                $athlete,
                $team,
                $championship,
                $category,
                $club,
                $playerDetails
            ));

            $champLabel = $championship ? " no campeonato '{$championship->name}'" : "";
            Log::info("TeamInscriptionService: E-mail de confirmação enviado para o atleta '{$athlete->name}' ({$recipientEmail}) na equipe '{$team->name}'{$champLabel}.");

            return true;
        } catch (\Throwable $e) {
            Log::error("TeamInscriptionService: Erro ao enviar e-mail de confirmação para o atleta '{$athlete->name}' (ID: {$athlete->id}): " . $e->getMessage(), [
                'exception' => $e
            ]);
            return false;
        }
    }

    /**
     * Quando a inscrição de uma equipe em um campeonato é confirmada, notifica os atletas vinculados à equipe
     * (não envia mais e-mail administrativo para o clube).
     *
     * @param int|object $pivotIdOrPivot ID do registro na tabela championship_team ou o objeto pivot
     * @param array $extraData Dados adicionais
     * @return bool
     */
    public static function notifyClubInscriptionConfirmed($pivotIdOrPivot, array $extraData = []): bool
    {
        try {
            $pivot = is_object($pivotIdOrPivot)
                ? $pivotIdOrPivot
                : DB::table('championship_team')->where('id', $pivotIdOrPivot)->first();

            if (!$pivot) {
                return false;
            }

            if ($pivot->status_payment !== 'paid') {
                return false;
            }

            $team = Team::find($pivot->team_id);
            if (!$team) {
                return false;
            }

            $championshipId = (int) $pivot->championship_id;
            $categoryId = $pivot->category_id ? (int) $pivot->category_id : null;

            // Busca atletas já inscritos neste time para este campeonato
            $teamPlayers = DB::table('team_players')
                ->where('team_id', $team->id)
                ->where('championship_id', $championshipId)
                ->get();

            $notifiedUserIds = [];

            foreach ($teamPlayers as $tp) {
                $athlete = User::find($tp->user_id);
                if ($athlete) {
                    self::notifyAthleteTeamInscription($athlete, $team, $championshipId, [
                        'position' => $tp->position ?? null,
                        'number' => $tp->number ?? null,
                        'category_id' => $categoryId,
                    ]);
                    $notifiedUserIds[] = $athlete->id;
                }
            }

            // Também notifica o capitão/líder se ele ainda não tiver sido notificado na lista de atletas
            $captainId = $pivot->captain_id ?: $team->captain_id;
            if ($captainId && !in_array((int) $captainId, $notifiedUserIds, true)) {
                $captain = User::find($captainId);
                if ($captain) {
                    self::notifyAthleteTeamInscription($captain, $team, $championshipId, [
                        'position' => 'Capitão / Responsável',
                        'category_id' => $categoryId,
                    ]);
                }
            }

            return true;
        } catch (\Throwable $e) {
            Log::error("TeamInscriptionService: Erro ao notificar atletas da equipe confirmada: " . $e->getMessage(), [
                'exception' => $e
            ]);
            return false;
        }
    }
}
