<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Verifica se o usuário está autenticado
        if (!$user) {
            return response()->json([
                'message' => 'Não autenticado.'
            ], 401);
        }

        // Verifica se o usuário é admin
        if (!$user->is_admin) {
            return response()->json([
                'message' => 'Acesso negado. Apenas administradores podem acessar este recurso.'
            ], 403);
        }

        // Verifica se é um admin temporário expirado
        if ($user->expires_at && now()->gt($user->expires_at)) {
            // Opcional: Revogar token se estiver usando Sanctum (com verificação para evitar erro se não tiver)
            if (method_exists($user, 'currentAccessToken') && $user->currentAccessToken()) {
                $user->currentAccessToken()->delete();
            }

            return response()->json([
                'message' => 'Acesso temporário expirado em ' . $user->expires_at->format('d/m/Y H:i') . '.'
            ], 403);
        }

        return $next($request);
    }
}
