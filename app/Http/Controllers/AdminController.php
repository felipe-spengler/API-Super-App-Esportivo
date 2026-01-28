<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Championship;
use App\Models\Order;

class AdminController extends Controller
{
    // Dashboard Geral
    public function dashboard(Request $request)
    {
        // 1. Métricas Principais
        $totalUsers = User::count();
        $totalRevenue = Order::where('status', 'paid')->sum('total_amount');
        $activeChampionships = Championship::where('status', 'registrations_open')->orWhere('status', 'in_progress')->count();

        // 2. Crescimento Mensal (Mock simples)
        $monthlyGrowth = [
            'labels' => ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            'data' => [100, 120, 150, 180, 220, $totalUsers]
        ];

        // 3. Receita por Clube (Top 5)
        // Precisaríamos agrupar orders por club_id. 
        // Mock:
        $revenueByClub = [
            ['name' => 'Clube Toledão', 'value' => 15000],
            ['name' => 'Run Events', 'value' => 5000],
        ];

        return response()->json([
            'metrics' => [
                'users' => $totalUsers,
                'revenue' => $totalRevenue,
                'active_events' => $activeChampionships
            ],
            'charts' => [
                'growth' => $monthlyGrowth,
                'revenue_by_club' => $revenueByClub
            ]
        ]);
    }
}
