import { useState, useEffect } from 'react';
import { Users, Trophy, DollarSign, UserPlus, Loader2 } from 'lucide-react';
import api from '../services/api';

export function Dashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeEvents: 0,
        totalTeams: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                // Request em paralelo para carregar estatísticas
                const [championshipsRes, teamsRes, playersRes] = await Promise.allSettled([
                    api.get('/admin/championships'),
                    api.get('/admin/teams'),
                    api.get('/admin/players')
                ]);

                // Helper para extrair array de dados, lidando com diferentes formatos de resposta
                const getData = (res: PromiseSettledResult<any>) => {
                    if (res.status === 'fulfilled') {
                        return Array.isArray(res.value.data) ? res.value.data : (res.value.data.data || []);
                    }
                    return [];
                };

                const championships = getData(championshipsRes);
                const teams = getData(teamsRes);
                const players = getData(playersRes);

                // Filtrar eventos ativos
                const active = championships.filter((c: any) => c.status === 'active' || new Date(c.end_date) > new Date()).length;

                setStats({
                    totalUsers: players.length, // Assumindo players como usuários principais
                    activeEvents: active,
                    totalTeams: teams.length
                });

            } catch (err) {
                console.error("Erro ao carregar dashboard:", err);
            } finally {
                setLoading(false);
            }
        }
        loadStats();
    }, []);

    const cards = [
        { label: 'Jogadores Cadastrados', value: stats.totalUsers, icon: Users, color: 'text-indigo-500', border: 'border-indigo-500' },
        { label: 'Eventos Ativos', value: stats.activeEvents, icon: Trophy, color: 'text-green-500', border: 'border-green-500' },
        { label: 'Equipes', value: stats.totalTeams, icon: UserPlus, color: 'text-blue-500', border: 'border-blue-500' },
        // Receita deixamos estático por enquanto pois não ví endpoint financeiro claro
        { label: 'Receita (Estimada)', value: 'R$ --', icon: DollarSign, color: 'text-yellow-500', border: 'border-yellow-500' },
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 font-display">Visão Geral</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {cards.map((stat, index) => (
                    <div key={index} className={`bg-white p-6 rounded-xl shadow-lg border-t-4 ${stat.border}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                            </div>
                            <stat.icon className={`w-12 h-12 ${stat.color} opacity-20`} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Chart Section - Placeholder Visual */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 min-h-[400px]">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Atividade da Plataforma</h2>
                    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-400 font-medium">Gráficos serão implementados em breve</p>
                    </div>
                </div>

                {/* Activity Feed Static */}
                <div className="bg-white rounded-xl shadow-lg p-6 h-full">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Atividades Recentes</h2>
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
                        <p>Nenhuma atividade recente encontrada.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
