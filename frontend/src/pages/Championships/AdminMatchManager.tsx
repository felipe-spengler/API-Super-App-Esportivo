import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Trophy, Save, Plus, Trash2, CheckCircle, AlertCircle, List, Edit2, X, MapPin, Clock as ClockIcon } from 'lucide-react';
import api from '../../services/api';

interface Match {
    id: number;
    home_team: { name: string; logo_url?: string };
    away_team: { name: string; logo_url?: string };
    home_score: number | null;
    away_score: number | null;
    start_time: string;
    round_number: number;
    status: 'scheduled' | 'finished' | 'live' | 'canceled';
    location?: string;
}

export function AdminMatchManager() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [championship, setChampionship] = useState<any>(null);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({ start_time: '', location: '', round_number: 1 });

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

    const openEditModal = (match: Match) => {
        setSelectedMatch(match);
        // Format date for datetime-local input
        const date = new Date(match.start_time);
        const formattedDate = date.toISOString().slice(0, 16);
        setEditData({
            start_time: formattedDate,
            location: match.location || '',
            round_number: match.round_number || 1
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedMatch) return;
        try {
            await api.patch(`/admin/matches/${selectedMatch.id}`, {
                start_time: editData.start_time,
                location: editData.location,
                round_number: editData.round_number
            });
            alert('Jogo atualizado com sucesso!');
            setShowEditModal(false);
            loadData();
        } catch (err) {
            alert('Erro ao atualizar jogo.');
        }
    };

    // Group matches by round and sort them by date
    const rounds = matches.reduce((acc, match) => {
        const round = match.round_number || 1;
        if (!acc[round]) acc[round] = [];
        acc[round].push(match);
        return acc;
    }, {} as Record<number, Match[]>);

    // Sort matches within each round
    Object.keys(rounds).forEach(round => {
        rounds[Number(round)].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    });

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
                            {championship?.format
                                ? `O campeonato está configurado como "${championship.format}". Clique no botão abaixo para gerar a tabela de jogos automaticamente.`
                                : "O campeonato ainda não possui partidas. Configure o formato nas configurações do campeonato."}
                        </p>

                        {championship?.format && (
                            <button
                                onClick={() => handleGenerate(championship.format)}
                                disabled={generating}
                                className="px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                            >
                                {generating ? 'Gerando...' : 'Gerar Tabela de Jogos'}
                            </button>
                        )}

                        {!championship?.format && (
                            <button
                                onClick={() => navigate(`/admin/championships/${id}/edit`)}
                                className="px-6 py-3 bg-white border-2 border-indigo-600 text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition-all"
                            >
                                Configurar Campeonato
                            </button>
                        )}
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
                                                {/* Date / Location */}
                                                <div className="w-full md:w-40 flex flex-col items-center md:items-start">
                                                    <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                                                        <Calendar size={12} /> {new Date(match.start_time).toLocaleDateString('pt-BR')}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                        <ClockIcon size={12} /> {new Date(match.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    {match.location && (
                                                        <div className="text-[10px] text-gray-400 flex items-center gap-1 truncate max-w-[150px]">
                                                            <MapPin size={10} /> {match.location}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Scoreboard */}
                                                <div className="flex flex-col md:flex-row items-center gap-4 flex-1 justify-center w-full">
                                                    <div className="flex items-center gap-3 text-right flex-1 justify-end w-full md:w-auto">
                                                        <span className="font-bold text-gray-900 order-2 md:order-1">{match.home_team?.name || 'Time A'}</span>
                                                        <div className="order-1 md:order-2">
                                                            {match.home_team?.logo_url ? (
                                                                <img src={match.home_team.logo_url} className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-gray-100 border" />
                                                            ) : (
                                                                <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-gray-200"></div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 bg-gray-50 px-6 py-2 rounded-2xl border border-gray-100">
                                                        <span className={`text-2xl font-black ${match.status === 'finished' ? 'text-gray-900' : 'text-gray-300'}`}>
                                                            {match.home_score ?? 0}
                                                        </span>
                                                        <span className="text-gray-400 font-bold text-xs">X</span>
                                                        <span className={`text-2xl font-black ${match.status === 'finished' ? 'text-gray-900' : 'text-gray-300'}`}>
                                                            {match.away_score ?? 0}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3 text-left flex-1 justify-start w-full md:w-auto">
                                                        <div className="">
                                                            {match.away_team?.logo_url ? (
                                                                <img src={match.away_team.logo_url} className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-gray-100 border" />
                                                            ) : (
                                                                <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-gray-200"></div>
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-gray-900">{match.away_team?.name || 'Time B'}</span>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="md:w-32 flex justify-end gap-1">
                                                    <Link
                                                        to={(() => {
                                                            const slug = championship?.sport?.slug;
                                                            if (slug === 'volei') return `/admin/matches/${match.id}/sumula-volei`;
                                                            if (slug === 'futsal') return `/admin/matches/${match.id}/sumula-futsal`;
                                                            if (slug === 'basquete') return `/admin/matches/${match.id}/sumula-basquete`;
                                                            if (slug === 'handebol') return `/admin/matches/${match.id}/sumula-handebol`;
                                                            if (slug === 'beach-tennis') return `/admin/matches/${match.id}/sumula-beach-tennis`;
                                                            if (slug === 'futebol-7') return `/admin/matches/${match.id}/sumula-futebol7`;
                                                            if (slug === 'futevolei') return `/admin/matches/${match.id}/sumula-futevolei`;
                                                            if (slug === 'volei-de-praia') return `/admin/matches/${match.id}/sumula-volei-praia`;
                                                            if (slug === 'tenis-de-mesa') return `/admin/matches/${match.id}/sumula-tenis-mesa`;
                                                            if (slug === 'jiu-jitsu') return `/admin/matches/${match.id}/sumula-jiu-jitsu`;
                                                            return `/admin/matches/${match.id}/sumula`;
                                                        })()}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                                                        title="Abrir Súmula"
                                                    >
                                                        <List className="w-5 h-5" />
                                                    </Link>

                                                    <button
                                                        onClick={() => openEditModal(match)}
                                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                                                        title="Editar Dados do Jogo"
                                                    >
                                                        <Edit2 className="w-5 h-5" />
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

            {/* Edit Modal */}
            {showEditModal && selectedMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Editar Jogo</h3>
                            <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data e Hora</label>
                                <input
                                    type="datetime-local"
                                    value={editData.start_time}
                                    onChange={e => setEditData({ ...editData, start_time: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Local (Campo/Quadra)</label>
                                <input
                                    type="text"
                                    value={editData.location}
                                    placeholder="Ex: Arena 1, Campo B..."
                                    onChange={e => setEditData({ ...editData, location: e.target.value })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rodada (Número)</label>
                                <input
                                    type="number"
                                    value={editData.round_number}
                                    onChange={e => setEditData({ ...editData, round_number: parseInt(e.target.value) })}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                />
                            </div>

                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    O placar deve ser alterado através da <strong>Súmula Digital</strong> para garantir a consistência das estatísticas.
                                </p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleSaveEdit} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
