<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\GameMatch;

class NotificationController extends Controller
{
    /**
     * Enviar notificação manual para usuários
     */
    public function send(Request $request)
    {
        $request->validate([
            'title' => 'required|string',
            'body' => 'required|string',
            'target' => 'required|in:all,club,team,user',
            'target_id' => 'nullable|integer',
        ]);

        $title = $request->title;
        $body = $request->body;
        $tokens = [];

        // Selecionar tokens baseado no alvo
        switch ($request->target) {
            case 'all':
                $tokens = User::whereNotNull('device_token')->pluck('device_token')->toArray();
                break;
            case 'club':
                $tokens = User::whereNotNull('device_token')
                    ->where('club_id', $request->target_id)
                    ->pluck('device_token')->toArray();
                break;
            case 'team':
                // Lógica para pegar tokens de jogadores de um time (precisa de relacionamento users <-> teams)
                // Exemplo simplificado:
                // $tokens = User::whereNotNull('device_token')->where('team_id', $request->target_id)->pluck('device_token')->toArray();
                break;
            case 'user':
                $user = User::find($request->target_id);
                if ($user && $user->device_token) {
                    $tokens[] = $user->device_token;
                }
                break;
        }

        if (empty($tokens)) {
            return response()->json(['message' => 'Nenhum dispositivo encontrado para envio.'], 404);
        }

        // Enviar via Firebase (Mock da função)
        $result = $this->sendToFirebase($tokens, $title, $body);

        return response()->json([
            'message' => 'Notificações enviadas (simulado).',
            'count' => count($tokens),
            'result' => $result
        ]);
    }

    /**
     * Endpoint para salvar token do dispositivo (Mobile chama isso ao logar)
     */
    public function storeToken(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        $user = $request->user();
        $user->device_token = $request->token;
        $user->save();

        return response()->json(['message' => 'Token salvo com sucesso.']);
    }

    /**
     * Função privada para envio real (Firebase)
     */
    private function sendToFirebase(array $tokens, string $title, string $body)
    {
        // Aqui entraria a integração com Firebase Cloud Messaging (FCM)
        // usando curl ou biblioteca google/apiclient

        // Exemplo de payload:
        // {
        //   "registration_ids": $tokens,
        //   "notification": { "title": $title, "body": $body }
        // }

        return ['success' => true, 'mock' => true];
    }
}
