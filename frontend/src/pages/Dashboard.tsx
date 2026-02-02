import { useState, useEffect } from 'react';
import { Users, Trophy, DollarSign, UserPlus, Loader2, Calendar, CheckCircle2, TrendingUp } from 'lucide-react';
import api from '../services/api';

export function Dashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeEvents: 0,
        totalTeams: 0,
        revenue: 0
    });
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDashboardData() {
            try {
                // Load real stats from backend
                const statsRes = await api.get('/admin/stats');
                const data = statsRes.data;

                setStats({
                    totalUsers: data.stats.total_players || 0,
                    activeEvents: data.stats.active_championships || 0,
                    totalTeams: data.stats.total_teams || 0,
                    revenue: 0 // Can be calculated later based on inscriptions
                });

                // Map activities to frontend format
                const mappedActivities = data.activities.map((activity: any) => {
                    const iconMap: any = {
                        championship: Trophy,
                        team: UserPlus,
                        player: Users,
                        match: CheckCircle2,
                    };

                    const colorMap: any = {
                        championship: 'text-yellow-500',
                        team: 'text-blue-500',
                        player: 'text-indigo-500',
                        match: 'text-green-500',
                    };

                    return {
                        id: activity.id,
                        type: activity.type,
                        title: activity.title,
                        description: activity.description,
                        time: activity.time,
                        icon: iconMap[activity.type] || CheckCircle2,
                        color: colorMap[activity.type] || 'text-gray-500'
                    };
                });

                setActivities(mappedActivities.slice(0, 8));

            } catch (err) {
                console.error("Erro ao carregar dashboard:", err);
                // Fallback to empty state on error
                setStats({
                    totalUsers: 0,
                    activeEvents: 0,
                    totalTeams: 0,
                    revenue: 0
                });
                setActivities([]);
            } finally {
                setLoading(false);
            }
        }
        loadDashboardData();
    }, []);

    const cards = [
        { label: 'Jogadores Cadastrados', value: stats.totalUsers, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        { label: 'Eventos Ativos', value: stats.activeEvents, icon: Trophy, color: 'text-green-500', bg: 'bg-green-50' },
        { label: 'Equipes', value: stats.totalTeams, icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Receita (Estimada)', value: stats.revenue > 0 ? `R$ ${stats.revenue}` : 'R$ --', icon: DollarSign, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Visão Geral</h1>
                    <p className="text-gray-500 mt-1">Bem-vindo ao painel administrativo do App Esportivo.</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {cards.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                                <p className="text-3xl font-black text-gray-900 mt-2">{stat.value}</p>
                            </div>
                            <div className={`${stat.bg} p-3 rounded-xl`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Platform Activity Chart Placeholder */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold text-gray-800">Visão Geral de Atividades</h2>
                    </div>

                    <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-xl">
                        <div className="text-center">
                            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm font-medium">Gráficos de atividade em desenvolvimento</p>
                            <p className="text-gray-300 text-xs mt-1">Estatísticas detalhadas em breve</p>
                        </div>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 lg:p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Atividades Recentes</h2>
                    <div className="space-y-6">
                        {activities.map((activity) => (
                            <div key={activity.id} className="flex gap-4 relative group">
                                {activity.id !== activities.length && (
                                    <div className="absolute left-[19px] top-10 bottom-[-24px] w-0.5 bg-gray-100"></div>
                                )}
                                <div className={`z-10 w-10 h-10 rounded-full bg-white border-2 border-gray-50 flex items-center justify-center shadow-sm group-hover:border-indigo-100 transition-colors`}>
                                    <activity.icon className={`w-5 h-5 ${activity.color}`} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-900">{activity.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-tighter mt-1 block">
                                        {activity.time}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-8 py-3 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
                        Ver todas as atividades
                    </button>
                </div>
            </div>
        </div>
    );
}
