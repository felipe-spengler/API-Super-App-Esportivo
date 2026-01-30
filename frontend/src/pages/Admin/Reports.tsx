import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3,
    TrendingUp,
    Users,
    Trophy,
    Calendar,
    Download,
    Medal,
    AlertCircle,
    Target,
    Activity
} from 'lucide-react';
import api from '../../services/api';

export function Reports() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [selectedChampionship, setSelectedChampionship] = useState<string | null>(null);
    const [championshipReport, setChampionshipReport] = useState<any>(null);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/reports/dashboard');
            setDashboardData(response.data);
        } catch (e) {
            console.error('Erro ao buscar dados do relatório:', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchChampionshipReport = async (championshipId: string) => {
        try {
            const response = await api.get(`/admin/reports/championship/${championshipId}`);
            setChampionshipReport(response.data);
        } catch (e) {
            console.error('Erro ao buscar relatório do campeonato:', e);
        }
    };

    const handleExport = async (type: string) => {
        try {
            const response = await api.get(`/admin/reports/export?type=${type}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `export_${type}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            alert('Erro ao exportar dados');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-white">Carregando...</div>
            </div>
        );
    }

    const stats = dashboardData?.stats || {};
    const topScorers = dashboardData?.top_scorers || [];
    const upcomingMatches = dashboardData?.upcoming_matches || [];
    const recentChampionships = dashboardData?.recent_championships || [];
    const championshipsBySport = dashboardData?.championships_by_sport || {};
    const matchesByStatus = dashboardData?.matches_by_status || {};
    const cards = dashboardData?.cards || { yellow: 0, red: 0 };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Relatórios e Estatísticas
                </h1>
                <p className="text-gray-400">Análise completa dos dados do sistema</p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    icon={<Trophy className="w-8 h-8" />}
                    title="Campeonatos"
                    value={stats.total_championships}
                    subtitle={`${stats.active_championships} ativos`}
                    color="blue"
                />
                <StatCard
                    icon={<Calendar className="w-8 h-8" />}
                    title="Partidas"
                    value={stats.total_matches}
                    subtitle={`${stats.finished_matches} finalizadas`}
                    color="green"
                />
                <StatCard
                    icon={<Users className="w-8 h-8" />}
                    title="Times"
                    value={stats.total_teams}
                    subtitle="registrados"
                    color="purple"
                />
                <StatCard
                    icon={<Target className="w-8 h-8" />}
                    title="Atletas"
                    value={stats.total_players}
                    subtitle="cadastrados"
                    color="yellow"
                />
            </div>

            {/* Export Section */}
            <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Download className="w-5 h-5" />
                    Exportar Dados
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => handleExport('matches')}
                        className="py-3 px-6 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Download size={16} />
                        Partidas (CSV)
                    </button>
                    <button
                        onClick={() => handleExport('teams')}
                        className="py-3 px-6 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Download size={16} />
                        Times (CSV)
                    </button>
                    <button
                        onClick={() => handleExport('players')}
                        className="py-3 px-6 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                    >
                        <Download size={16} />
                        Atletas (CSV)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Championships by Sport */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Campeonatos por Modalidade
                    </h2>
                    <div className="space-y-3">
                        {Object.entries(championshipsBySport).map(([sport, count]: [string, any]) => (
                            <div key={sport} className="flex justify-between items-center">
                                <span className="text-gray-300 capitalize">{sport}</span>
                                <div className="flex items-center gap-3">
                                    <div className="h-2 bg-gray-700 rounded-full w-32">
                                        <div
                                            className="h-2 bg-blue-500 rounded-full"
                                            style={{ width: `${(count / stats.total_championships) * 100}%` }}
                                        />
                                    </div>
                                    <span className="font-bold text-blue-400 w-8 text-right">{count}</span>
                                </div>
                            </div>
                        ))}
                        {Object.keys(championshipsBySport).length === 0 && (
                            <div className="text-center text-gray-500 py-4">Nenhum dado disponível</div>
                        )}
                    </div>
                </div>

                {/* Matches by Status */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Partidas por Status
                    </h2>
                    <div className="space-y-3">
                        {Object.entries(matchesByStatus).map(([status, count]: [string, any]) => {
                            const colors: any = {
                                'Agendado': 'yellow',
                                'Em Andamento': 'green',
                                'Finalizado': 'blue',
                                'Cancelado': 'red'
                            };
                            const color = colors[status] || 'gray';

                            return (
                                <div key={status} className="flex justify-between items-center">
                                    <span className="text-gray-300">{status}</span>
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 bg-gray-700 rounded-full w-32">
                                            <div
                                                className={`h-2 bg-${color}-500 rounded-full`}
                                                style={{ width: `${(count / stats.total_matches) * 100}%` }}
                                            />
                                        </div>
                                        <span className={`font-bold text-${color}-400 w-8 text-right`}>{count}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {Object.keys(matchesByStatus).length === 0 && (
                            <div className="text-center text-gray-500 py-4">Nenhum dado disponível</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Scorers & Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Top Scorers */}
                <div className="lg:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Medal className="w-5 h-5 text-yellow-500" />
                        Artilheiros
                    </h2>
                    <div className="space-y-2">
                        {topScorers.slice(0, 10).map((scorer: any, idx: number) => (
                            <div
                                key={scorer.player_id}
                                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-yellow-500 text-black' :
                                            idx === 1 ? 'bg-gray-400 text-black' :
                                                idx === 2 ? 'bg-orange-600 text-white' :
                                                    'bg-gray-600 text-white'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <span className="font-medium">{scorer.player_name}</span>
                                </div>
                                <span className="font-bold text-blue-400">{scorer.goals} gols</span>
                            </div>
                        ))}
                        {topScorers.length === 0 && (
                            <div className="text-center text-gray-500 py-8">Nenhum gol registrado ainda</div>
                        )}
                    </div>
                </div>

                {/* Cards Stats */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        Cartões
                    </h2>
                    <div className="space-y-4">
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                            <div className="text-yellow-500 text-sm font-bold mb-1">Cartões Amarelos</div>
                            <div className="text-4xl font-black text-yellow-400">{cards.yellow}</div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <div className="text-red-500 text-sm font-bold mb-1">Cartões Vermelhos</div>
                            <div className="text-4xl font-black text-red-400">{cards.red}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upcoming Matches */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Próximas Partidas
                </h2>
                <div className="space-y-2">
                    {upcomingMatches.slice(0, 5).map((match: any) => (
                        <div
                            key={match.id}
                            className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                            onClick={() => navigate(`/admin/matches/${match.id}`)}
                        >
                            <div className="flex-1">
                                <div className="text-xs text-gray-400 mb-1">{match.championship?.name}</div>
                                <div className="font-bold">
                                    {match.home_team?.name} <span className="text-gray-500">vs</span> {match.away_team?.name}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-400">
                                    {new Date(match.start_time).toLocaleDateString('pt-BR')}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {new Date(match.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {upcomingMatches.length === 0 && (
                        <div className="text-center text-gray-500 py-8">Nenhuma partida agendada</div>
                    )}
                </div>
            </div>

            {/* Recent Championships */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    Campeonatos Recentes
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {recentChampionships.map((championship: any) => (
                        <div
                            key={championship.id}
                            className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer border border-gray-600"
                            onClick={() => navigate(`/admin/championships/${championship.id}`)}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <h3 className="font-bold text-sm">{championship.name}</h3>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${championship.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                        championship.status === 'finished' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {championship.status}
                                </span>
                            </div>
                            <div className="text-xs text-gray-400 capitalize">{championship.sport}</div>
                            {championship.start_date && (
                                <div className="text-xs text-gray-500 mt-2">
                                    {new Date(championship.start_date).toLocaleDateString('pt-BR')}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: number;
    subtitle: string;
    color: 'blue' | 'green' | 'purple' | 'yellow';
}

function StatCard({ icon, title, value, subtitle, color }: StatCardProps) {
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        yellow: 'from-yellow-500 to-yellow-600'
    };

    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 shadow-lg`}>
            <div className="flex items-start justify-between mb-4">
                <div className="bg-white/20 p-3 rounded-lg">
                    {icon}
                </div>
            </div>
            <h3 className="text-white/80 text-sm font-medium mb-1">{title}</h3>
            <div className="text-4xl font-black mb-1">{value || 0}</div>
            <div className="text-white/60 text-xs">{subtitle}</div>
        </div>
    );
}
