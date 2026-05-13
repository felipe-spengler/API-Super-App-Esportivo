<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientPortalController extends Controller
{
    /**
     * Retorna as estatísticas e inventário de dados consolidados para o portal seguro.
     * Protegido por token de auditoria definido no .env do projeto.
     */
    public function getAuditDashboard(Request $request)
    {
        // Recupera o token enviado no cabeçalho ou no corpo da requisição
        $token = $request->header('X-Audit-Token') ?? $request->input('access_token');
        
        // Recupera a chave mestre configurada no .env (ou usa o padrão para funcionamento imediato)
        $expectedToken = env('CLIENT_AUDIT_TOKEN', 'Felipe0110Auditoria');

        // Valida se a funcionalidade está ativa e se a chave está correta
        if (!$expectedToken || $token !== $expectedToken) {
            return response()->json([
                'success' => false,
                'message' => 'Acesso negado. Chave de auditoria inválida ou inativa.'
            ], 401);
        }

        try {
            // 1. Coleta de Métricas de Contagem Básica
            $metrics = [
                'users'         => DB::table('users')->count(),
                'clubs'         => DB::table('clubs')->count(),
                'championships' => DB::table('championships')->count(),
                'teams'         => DB::table('teams')->count(),
                'matches'       => DB::table('game_matches')->count(),
                'players'       => DB::table('team_players')->count(),
                'orders'        => DB::table('orders')->count(),
                'mvps'          => DB::table('mvp_votes')->count(),
                'paid_sales'    => DB::table('orders')->where('status', 'paid')->count(),
            ];

            // 2. Últimos campeonatos registrados para exibição em grade
            $recentChampionships = DB::table('championships')
                ->select('name', 'format', 'start_date', 'status')
                ->orderBy('start_date', 'desc')
                ->limit(8)
                ->get();

            // 3. Últimas compras na plataforma
            $recentOrders = DB::table('orders')
                ->join('users', 'orders.user_id', '=', 'users.id')
                ->select('users.name as cliente', 'orders.total_amount', 'orders.status', 'orders.created_at as data')
                ->orderBy('orders.created_at', 'desc')
                ->limit(8)
                ->get();

            // Retorna o payload consolidado com sucesso
            return response()->json([
                'success'      => true,
                'timestamp'    => now()->format('Y-m-d H:i:s'),
                'environment'  => 'Produção Protegida',
                'metrics'      => $metrics,
                'championships'=> $recentChampionships,
                'orders'       => $recentOrders
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao extrair dados operacionais.',
                'error'   => $e->getMessage()
            ], 500);
        }
    }
}
