import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Trophy, Save, Plus, Trash2, CheckCircle, AlertCircle, List } from 'lucide-react';
import api from '../../services/api';

interface Match {
    id: number;
    home_team: { name: string; logo_url?: string };
    away_team: { name: string; logo_url?: string };
    home_score: number | null;
    away_score: number | null;
    start_time: string;
    round_number: number;
    status: 'scheduled' | 'finished';
}

export function AdminMatchManager() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [championship, setChampionship] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            const [campRes, matchesRes] = await Promise.all([
                api.get(`/championships/${id}`),
                api.get(`/admin/matches?championship_id=${id}`) // Using admin filter
            ]);
            setChampionship(campRes.data);
            setMatches(matchesRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleGenerate(format: string) {
        if (!confirm("Isso irá gerar a tabela de jogos com os times inscritos. Deseja continuar?")) return;

        setGenerating(true);
        try {
            await api.post(`/admin/championships/${id}/bracket/generate`, {
                format: format, // 'league', 'knockout'
                start_date: championship.start_date,
                match_interval_days: 7
            });
            alert('Tabela gerada com sucesso!');
            loadData();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'Erro ao gerar tabela.');
        } finally {
            setGenerating(false);
        }
    }

    async function updateScore(match_id: number, home: string, away: string) {
        try {
            await api.post(`/admin/matches/${match_id}/finish`, {
                home_score: parseInt(home),
                away_score: parseInt(away)
            });
            // Update local state without reload
            setMatches(prev => prev.map(m => m.id === match_id ? { ...m, home_score: parseInt(home), away_score: parseInt(away), status: 'finished' } : m));
        } catch (err) {
            alert('Erro ao salvar placar.');
        }
    }

    // Group matches by round
    const rounds = matches.reduce((acc, match) => {
        const round = match.round_number || 1;
        if (!acc[round]) acc[round] = [];
        acc[round].push(match);
        return acc;
    }, {} as Record<number, Match[]>);

    if (loading) return <div className="p-8 text-center">Carregando...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-6 border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(`/admin/championships/${id}`)} className="p-2 hover:bg-gray-100 rounded-full">
                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Gerenciar Jogos</h1>
                            <p className="text-gray-500">{championship?.name}</p>
                        </div>
                    </div>
                    {matches.length > 0 && (
                        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                            <Plus className="w-4 h-4" /> Novo Jogo Avulso
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-6">

                {/* Empty State / Generator */}
                {matches.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-sm">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Calendar className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Nenhum jogo criado ainda</h2>
                        <p className="text-gray-500 max-w-md mx-auto mb-8">
                            O campeonato ainda não possui partidas. Você pode gerar a tabela automaticamente baseada nos times inscritos ou criar jogos manualmente.
                        </p>

                        <div className="flex flex-wrap justify-center gap-4">
                            <button
                                onClick={() => handleGenerate('league')}
                                disabled={generating}
                                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-all"
                            >
                                Gerar Pontos Corridos
                            </button>
                            <button
                                onClick={() => handleGenerate('knockout')}
                                disabled={generating}
                                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 hover:border-indigo-300 transition-all"
                            >
                                Gerar Mata-Mata
                            </button>
                            {/* Groups usually done via GroupDraw page */}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(rounds).sort((a, b) => Number(a[0]) - Number(b[0])).map(([round, roundMatches]) => (
                            <div key={round} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                                    <h3 className="font-bold text-gray-800">Rodada {round}</h3>
                                    <span className="text-xs font-medium text-gray-500">{roundMatches.length} jogos</span>
                                </div>
                                <div>
                                    {roundMatches.map((match) => (
                                        <div key={match.id} className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                                                {/* Date / Location */}
                                                <div className="text-xs text-gray-500 w-full md:w-32 text-center md:text-left">
                                                    <div>{new Date(match.start_time).toLocaleDateString()}</div>
                                                    <div>{new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>

                                                {/* Scoreboard */}
                                                <div className="flex items-center gap-4 flex-1 justify-center">
                                                    <div className="flex items-center gap-3 text-right flex-1 justify-end">
                                                        <span className="font-bold text-gray-900">{match.home_team?.name || 'Time A'}</span>
                                                        {match.home_team?.logo_url ? (
                                                            <img src={match.home_team.logo_url} className="w-8 h-8 rounded-full bg-gray-100" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                                        <input
                                                            type="number"
                                                            name={`home_${match.id}`}
                                                            defaultValue={match.home_score ?? ''}
                                                            className="w-12 text-center bg-white border border-gray-200 rounded py-1 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                        <span className="text-gray-400 font-bold">X</span>
                                                        <input
                                                            type="number"
                                                            name={`away_${match.id}`}
                                                            defaultValue={match.away_score ?? ''}
                                                            className="w-12 text-center bg-white border border-gray-200 rounded py-1 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                                        />
                                                    </div>

                                                    <div className="flex items-center gap-3 text-left flex-1 justify-start">
                                                        {match.away_team?.logo_url ? (
                                                            <img src={match.away_team.logo_url} className="w-8 h-8 rounded-full bg-gray-100" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                                                        )}
                                                        <span className="font-bold text-gray-900">{match.away_team?.name || 'Time B'}</span>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="md:w-32 flex justify-end gap-2">
                                                    <Link
                                                        to={(() => {
                                                            const slug = championship?.sport?.slug;
                                                            if (slug === 'volei') return `/matches/${match.id}/sumula-volei`;
                                                            if (slug === 'futsal') return `/matches/${match.id}/sumula-futsal`;
                                                            if (slug === 'basquete') return `/matches/${match.id}/sumula-basquete`;
                                                            if (slug === 'handebol') return `/matches/${match.id}/sumula-handebol`;
                                                            if (slug === 'beach-tennis') return `/matches/${match.id}/sumula-beach-tennis`;
                                                            if (slug === 'futebol-7') return `/matches/${match.id}/sumula-futebol7`;
                                                            if (slug === 'futevolei') return `/matches/${match.id}/sumula-futevolei`;
                                                            if (slug === 'volei-de-praia') return `/matches/${match.id}/sumula-volei-praia`;
                                                            if (slug === 'tenis-de-mesa') return `/matches/${match.id}/sumula-tenis-mesa`;
                                                            if (slug === 'jiu-jitsu') return `/matches/${match.id}/sumula-jiu-jitsu`;
                                                            return `/matches/${match.id}/sumula`;
                                                        })()}
                                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                                        title="Abrir Súmula"
                                                    >
                                                        <List className="w-5 h-5" />
                                                    </Link>

                                                    <button
                                                        onClick={(e) => {
                                                            const row = e.currentTarget.closest('.flex-col');
                                                            if (row) {
                                                                const homeInput = row.querySelector(`input[name="home_${match.id}"]`) as HTMLInputElement;
                                                                const awayInput = row.querySelector(`input[name="away_${match.id}"]`) as HTMLInputElement;
                                                                updateScore(match.id, homeInput.value, awayInput.value);
                                                            }
                                                        }}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                                        title="Salvar Placar Rápido"
                                                    >
                                                        <Save className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
