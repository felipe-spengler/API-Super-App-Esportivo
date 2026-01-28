<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckClubPermission
{
    /**
     * Handle an incoming request.
     * Verifica se o admin tem permissão para acessar recursos do clube.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Verifica se o usuário está autenticado e é admin
        if (!$user || !$user->is_admin) {
            return response()->json([
                'message' => 'Acesso negado.'
            ], 403);
        }

        // Super Admin (club_id = null) tem acesso a tudo
        if ($user->club_id === null) {
            return $next($request);
        }

        // Para Club Admins, verifica se o recurso pertence ao clube dele
        $clubId = $request->route('club_id') ?? $request->input('club_id');

        // Se não há club_id na requisição, permite (será validado no controller)
        if (!$clubId) {
            return $next($request);
        }

        // Verifica se o club_id do admin corresponde ao recurso
        if ($user->club_id != $clubId) {
            return response()->json([
                'message' => 'Você não tem permissão para acessar recursos deste clube.'
            ], 403);
        }

        return $next($request);
    }
}
