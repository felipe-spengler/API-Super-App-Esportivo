import { useState, useEffect } from 'react';
import { Calendar, Trash2, Edit, Loader2, Filter, Printer } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { isSameDay, isYesterday, isThisWeek, parseISO } from 'date-fns';

export function Matches() {
    const [matches, setMatches] = useState<any[]>([]);
    const [filteredMatches, setFilteredMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterPeriod, setFilterPeriod] = useState('all'); // 'today', 'yesterday', 'week', 'all'

    // Arbitration Modal State
    const [isArbitrationOpen, setIsArbitrationOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [arbitrationData, setArbitrationData] = useState({ referee: '', assistant1: '', assistant2: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadMatches();
    }, []);

    useEffect(() => {
        const now = new Date();
        if (filterPeriod === 'all') {
            setFilteredMatches(matches);
        } else {
            setFilteredMatches(matches.filter(match => {
                const matchDate = parseISO(match.start_time);
                if (filterPeriod === 'today') return isSameDay(matchDate, now);
                if (filterPeriod === 'yesterday') return isYesterday(matchDate);
                if (filterPeriod === 'week') return isThisWeek(matchDate);
                return true;
            }));
        }
    }, [filterPeriod, matches]);

    async function loadMatches() {
        try {
            setLoading(true);
            const response = await api.get('/admin/matches');
            setMatches(response.data);
            setFilteredMatches(response.data);
        } catch (error) {
            console.error("Erro ao carregar partidas", error);
        } finally {
            setLoading(false);
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'finished': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold uppercase">Finalizada</span>;
            case 'live': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold uppercase animate-pulse">Ao Vivo</span>;
            default: return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold uppercase">Agendada</span>;
        }
    };

    const openArbitration = (match: any) => {
        setSelectedMatch(match);
        // Pre-fill if exists
        const currentRef = match.match_details?.arbitration || {};
        setArbitrationData({
            referee: currentRef.referee || '',
            assistant1: currentRef.assistant1 || '',
            assistant2: currentRef.assistant2 || ''
        });
        setIsArbitrationOpen(true);
    };

    const handleConfirmArbitration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMatch) return;

        try {
            setSaving(true);
            // Save to backend
            await api.put(`/admin/matches/${selectedMatch.id}`, {
                arbitration: arbitrationData
            });

            // Determine the correct sumula URL based on sport
            const sportSlug = selectedMatch.championship?.sport?.slug || 'futebol';
            const sumulaRoutes: Record<string, string> = {
                'futebol': '/sumula', // Rota legado ou padrão
                'volei': '/sumula-volei',
                'futsal': '/sumula-futsal',
                'basquete': '/sumula-basquete',
                'handebol': '/sumula-handebol',
                'beach-tennis': '/sumula-beach-tennis',
                'futebol7': '/sumula-futebol7',
                'futevolei': '/sumula-futevolei',
                'volei-praia': '/sumula-volei-praia',
                'tenis-mesa': '/sumula-tenis-mesa',
                'jiu-jitsu': '/sumula-jiu-jitsu'
            };

            const suffix = sumulaRoutes[sportSlug] || 'sumula'; // Fallback to standard

            // Close and navigate
            setIsArbitrationOpen(false);
            window.location.href = `/admin/matches/${selectedMatch.id}${suffix}`;
        } catch (error) {
            console.error("Erro ao salvar arbitragem", error);
            alert("Erro ao salvar dados.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500 relative">
            {/* Modal de Arbitragem */}
            {isArbitrationOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <form onSubmit={handleConfirmArbitration} className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-indigo-600 p-4 text-white">
                            <h3 className="font-bold text-lg">Iniciar Súmula</h3>
                            <p className="text-indigo-100 text-xs">Informe a equipe de arbitragem</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Árbitro Principal</label>
                                <input
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={arbitrationData.referee}
                                    onChange={e => setArbitrationData({ ...arbitrationData, referee: e.target.value })}
                                    placeholder="Nome do Árbitro"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assistente 1</label>
                                    <input
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={arbitrationData.assistant1}
                                        onChange={e => setArbitrationData({ ...arbitrationData, assistant1: e.target.value })}
                                        placeholder="Opcional"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assistente 2</label>
                                    <input
                                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={arbitrationData.assistant2}
                                        onChange={e => setArbitrationData({ ...arbitrationData, assistant2: e.target.value })}
                                        placeholder="Opcional"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 flex justify-end gap-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setIsArbitrationOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Iniciar Partida
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Partidas</h1>
                    <p className="text-gray-500">Gerencie todos os jogos e súmulas.</p>
                </div>

                {/* Filtros de Data */}
                <div className="flex items-center bg-white p-1 rounded-lg border border-gray-200 shadow-sm overflow-x-auto max-w-full no-scrollbar">
                    <button
                        onClick={() => setFilterPeriod('all')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${filterPeriod === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Todas
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1 flex-shrink-0"></div>
                    <button
                        onClick={() => setFilterPeriod('today')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${filterPeriod === 'today' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Hoje
                    </button>
                    <button
                        onClick={() => setFilterPeriod('yesterday')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${filterPeriod === 'yesterday' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Ontem
                    </button>
                    <button
                        onClick={() => setFilterPeriod('week')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${filterPeriod === 'week' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Esta Semana
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredMatches.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Nenhuma partida encontrada para este filtro.
                        </div>
                    )}
                    {filteredMatches.map(match => (
                        <div key={match.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                                {/* Info / Status */}
                                <div className="flex flex-col items-center md:items-start min-w-[150px]">
                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                                        {match.championship?.name}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Calendar className="w-4 h-4" />
                                        <span>{new Date(match.start_time).toLocaleDateString()} {new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="mt-2">{getStatusBadge(match.status)}</div>
                                </div>

                                {/* Placar */}
                                <div className="flex-1 flex items-center justify-center gap-3 md:gap-8 w-full md:w-auto">
                                    <div className="text-right flex-1 min-w-0">
                                        <h3 className="text-sm md:text-lg font-bold text-gray-900 truncate">{match.home_team?.name}</h3>
                                        <span className="text-[10px] md:text-xs text-gray-400">Mandante</span>
                                    </div>

                                    <div className="flex flex-col items-center px-4 bg-gray-50 rounded-lg py-2 shrink-0">
                                        <span className="text-2xl md:text-3xl font-black text-indigo-900 font-mono">
                                            {match.home_score ?? '-'} : {match.away_score ?? '-'}
                                        </span>
                                        <span className="text-[10px] md:text-xs text-gray-400 uppercase font-bold mt-1">Placar</span>
                                    </div>

                                    <div className="text-left flex-1 min-w-0">
                                        <h3 className="text-sm md:text-lg font-bold text-gray-900 truncate">{match.away_team?.name}</h3>
                                        <span className="text-[10px] md:text-xs text-gray-400">Visitante</span>
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="flex items-center gap-2 min-w-[150px] justify-end">

                                    {match.status === 'finished' ? (
                                        <Link
                                            to={`/admin/matches/${match.id}/sumula-print`}
                                            className="p-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors text-gray-600 hover:bg-gray-100"
                                            title="Imprimir Súmula"
                                        >
                                            <Printer className="w-4 h-4" />
                                            Imprimir
                                        </Link>
                                    ) : (
                                        <button
                                            onClick={() => openArbitration(match)}
                                            className="p-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors text-indigo-600 hover:bg-indigo-50"
                                            title="Editar Súmula"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Súmula
                                        </button>
                                    )}

                                    <button className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
