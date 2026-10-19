<?php

namespace App\Services;

use App\Models\Club;
use App\Models\Championship;
use App\Models\Team;
use App\Models\Category;
use App\Models\User;
use App\Mail\TeamInscriptionClubNotificationMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class TeamInscriptionService
{
    /**
     * Envia notificação por e-mail para o clube informando que a inscrição de um time foi confirmada/efetivada.
     *
     * @param int|object $pivotIdOrPivot ID do registro na tabela championship_team ou o objeto pivot
     * @param array $extraData Dados adicionais (ex: 'price', 'payment_method', 'is_free')
     * @return bool
     */
    public static function notifyClubInscriptionConfirmed($pivotIdOrPivot, array $extraData = []): bool
    {
        try {
            $pivot = is_object($pivotIdOrPivot)
                ? $pivotIdOrPivot
                : DB::table('championship_team')->where('id', $pivotIdOrPivot)->first();

            if (!$pivot) {
                Log::warning("TeamInscriptionService: Inscrição championship_team não encontrada.", [
                    'identifier' => is_scalar($pivotIdOrPivot) ? $pivotIdOrPivot : 'object'
                ]);
                return false;
            }

            // Somente envia se a inscrição estiver efetivada/paga
            if ($pivot->status_payment !== 'paid') {
                Log::info("TeamInscriptionService: Inscrição CT_{$pivot->id} ainda com status '{$pivot->status_payment}'. Notificação ao clube postergada até a confirmação de pagamento.");
                return false;
            }

            $championship = Championship::with(['club', 'sport'])->find($pivot->championship_id);
            if (!$championship) {
                Log::warning("TeamInscriptionService: Campeonato ID {$pivot->championship_id} não encontrado.");
                return false;
            }

            $team = Team::find($pivot->team_id);
            if (!$team) {
                Log::warning("TeamInscriptionService: Time ID {$pivot->team_id} não encontrado.");
                return false;
            }

            $category = $pivot->category_id ? Category::find($pivot->category_id) : null;
            $captain = $pivot->captain_id
                ? User::find($pivot->captain_id)
                : ($team->captain_id ? User::find($team->captain_id) : null);

            $club = $championship->club
                ?? ($team->club_id ? Club::find($team->club_id) : null)
                ?? ($championship->club_id ? Club::find($championship->club_id) : null);

            if (!$club) {
                Log::warning("TeamInscriptionService: Clube associado ao campeonato ou time não encontrado (Championship ID: {$championship->id}).");
                return false;
            }

            // Descobrir o e-mail de contato do clube
            $clubEmail = !empty($club->contact_email) ? trim($club->contact_email) : null;

            // Se o clube não tiver contact_email preenchido, usa como fallback o e-mail do admin do clube
            if (!$clubEmail) {
                $adminUser = User::where('club_id', $club->id)->where('is_admin', true)->first();
                if ($adminUser && !empty($adminUser->email)) {
                    $clubEmail = trim($adminUser->email);
                    Log::info("TeamInscriptionService: contact_email do clube '{$club->name}' (ID: {$club->id}) não está preenchido. Utilizando e-mail do admin do clube: {$clubEmail}");
                }
            }

            if (!$clubEmail) {
                Log::warning("TeamInscriptionService: Não foi possível enviar e-mail de confirmação da equipe '{$team->name}' para o clube '{$club->name}' (ID: {$club->id}). O clube não possui contact_email e não há usuário administrador cadastrado com e-mail.");
                return false;
            }

            $isFree = ($pivot->payment_method === 'free')
                || (isset($extraData['is_free']) && $extraData['is_free'])
                || (isset($extraData['price']) && (float) $extraData['price'] <= 0);

            $paymentDetails = array_merge([
                'status' => $pivot->status_payment,
                'payment_method' => $pivot->payment_method ?? ($isFree ? 'free' : 'asaas'),
                'price' => $extraData['price'] ?? 0,
                'is_free' => $isFree,
            ], $extraData);

            Mail::to($clubEmail)->send(new TeamInscriptionClubNotificationMail(
                $club,
                $championship,
                $team,
                $category,
                $captain,
                $paymentDetails
            ));

            Log::info("TeamInscriptionService: E-mail de confirmação de inscrição da equipe '{$team->name}' no campeonato '{$championship->name}' enviado com sucesso para o clube ({$clubEmail}).");
            return true;

        } catch (\Throwable $e) {
            Log::error("TeamInscriptionService: Erro ao enviar e-mail de confirmação de inscrição de equipe para o clube: " . $e->getMessage(), [
                'exception' => $e
            ]);
            return false;
        }
    }
}
