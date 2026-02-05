
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, Eye, FileText } from 'lucide-react';
import api from '../../services/api';
import { MatchDetailsModal } from '../../components/MatchDetailsModal';

export function EventMatches() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('category_id');
    const navigate = useNavigate();

    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [champName, setChampName] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');

    // Modal State
    const [selectedMatchId, setSelectedMatchId] = useState<string | number | null>(null);

    // Polling Ref to avoid state closure staleness if needed, but dependency array is enough
    const pollingRef = useRef<any>(null);

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            // Only fetch name if empty
            if (!champName) {
                const champRes = await api.get(`/championships/${id}`);
                setChampName(champRes.data.name);
            }

            const response = await api.get(`/championships/${id}/matches`, {
                params: { category_id: categoryId }
            });
            setMatches(response.data);

        } catch (error) {
            console.error("Erro ao carregar jogos", error);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Polling every 30 seconds to keep list updated (live scores, etc)
        pollingRef.current = setInterval(() => {
            fetchData(true);
        }, 30000); // 30s

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [id, categoryId]);

    // Faster polling if active tab is live? 
    // Maybe better to just keep 30s for list, and let Modal handle fast polling for details.

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'finished': return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase border border-gray-200">Finalizada</span>;
            case 'live': return <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold uppercase border border-red-200 animate-pulse">Ao Vivo</span>;
            case 'upcoming': return <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-bold uppercase border border-blue-200">Agendada</span>;
            default: return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px] font-bold uppercase border border-yellow-200">{status}</span>;
        }
    };

    // Group matches
    const liveMatches = matches.filter(m => m.status === 'live');
    const upcomingMatches = matches.filter(m => m.status === 'upcoming' || m.status === 'scheduled');
    const finishedMatches = matches.filter(m => m.status === 'finished');

    const MatchCard = ({ match }: { match: any }) => (
        <div
            onClick={() => setSelectedMatchId(match.id)}
            className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all mb-3 cursor-pointer relative"
        >
            {/* Live Indicator Strip */}
            {match.status === 'live' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
            )}

            {/* Match Header: Date & Place */}
            <div className="bg-gray-50 px-4 py-2 flex justify-between items-center text-xs text-gray-500 border-b border-gray-100 mt-1">
                <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{match.start_time ? new Date(match.start_time).toLocaleDateString() : 'TBA'}</span>
                    <span className="mx-1">•</span>
                    <Clock className="w-3 h-3" />
                    <span>{match.start_time ? new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                </div>
                <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{match.location || 'Local a definir'}</span>
                </div>
            </div>

            {/* Match Content */}
            <div className="p-4 relative">
                {/* Hover Action Overlay Text (Optional, keeping it clean for mobile) */}

                <div className="flex items-center justify-between">
                    {/* Home Team */}
                    <div className="flex-1 flex flex-col items-center text-center gap-2">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 group-hover:border-indigo-200 transition-colors">
                            {match.home_team?.logo || match.home_team?.logo_url ? (
                                <img src={match.home_team.logo || match.home_team.logo_url} alt={match.home_team.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold text-gray-400">{match.home_team?.name?.substring(0, 2)}</span>
                            )}
                        </div>
                        <span className="text-sm font-bold text-gray-800 leading-tight block w-full truncate">{match.home_team?.name || 'Mandante'}</span>
                    </div>

                    {/* Score Board */}
                    <div className="flex flex-col items-center px-4 w-28">
                        <div className="flex items-center gap-3">
                            <span className={`text-2xl font-black ${match.home_score > match.away_score ? 'text-gray-900' : 'text-gray-600'}`}>
                                {match.home_score ?? '-'}
                            </span>
                            <span className="text-xs text-gray-400 font-bold">X</span>
                            <span className={`text-2xl font-black ${match.away_score > match.home_score ? 'text-gray-900' : 'text-gray-600'}`}>
                                {match.away_score ?? '-'}
                            </span>
                        </div>
                        <div className="mt-2 text-center scale-90 origin-top">
                            {getStatusBadge(match.status)}
                        </div>
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 flex flex-col items-center text-center gap-2">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200 group-hover:border-indigo-200 transition-colors">
                            {match.away_team?.logo || match.away_team?.logo_url ? (
                                <img src={match.away_team.logo || match.away_team.logo_url} alt={match.away_team.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold text-gray-400">{match.away_team?.name?.substring(0, 2)}</span>
                            )}
                        </div>
                        <span className="text-sm font-bold text-gray-800 leading-tight block w-full truncate">{match.away_team?.name || 'Visitante'}</span>
                    </div>
                </div>

                {/* Call to Action Button (Visible on Hover or Always small) */}
                <div className="mt-4 flex justify-center">
                    {match.status === 'live' ? (
                        <button className="flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-bold hover:bg-red-100 transition-colors">
                            <Eye size={14} className="animate-pulse" /> Acompanhar Ao Vivo
                        </button>
                    ) : match.status === 'finished' ? (
                        <button className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-200 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                            <FileText size={14} /> Ver Súmula e Detalhes
                        </button>
                    ) : (
                        <span className="text-[10px] text-gray-400">Clique para ver detalhes</span>
                    )}
                </div>
            </div>
        </div>
    );

    const renderMatchesByRound = (matchesList: any[], emptyMessage: string) => {
        if (matchesList.length === 0) {
            return (
                <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500">{emptyMessage}</p>
                </div>
            );
        }

        const groups: Record<string, any[]> = {};

        matchesList.forEach(m => {
            let roundLabel = 'Outros Jogos';

            // Tenta identificar o nome da rodada se for numérico ou string
            if (m.round_number) {
                roundLabel = `Rodada ${m.round_number}`;
            } else if (m.round) {
                // Formata rodadas de mata-mata
                const lower = String(m.round).toLowerCase();
                if (lower.includes('32')) roundLabel = '16 Avos de Final';
                else if (lower.includes('16') || lower.includes('oitavas')) roundLabel = 'Oitavas de Final';
                else if (lower.includes('quarter') || lower.includes('quartas')) roundLabel = 'Quartas de Final';
                else if (lower.includes('semi')) roundLabel = 'Semifinais';
                else if (lower.includes('third') || lower.includes('3rd')) roundLabel = 'Disputa de 3º Lugar';
                else if (lower.includes('final')) roundLabel = 'Grande Final';
                else roundLabel = `Rodada ${m.round}`;
            }

            if (!groups[roundLabel]) groups[roundLabel] = [];
            groups[roundLabel].push(m);
        });

        // Tenta ordenar as chaves. Rodadas numéricas primeiro, depois strings
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''));
            const numB = parseInt(b.replace(/\D/g, ''));

            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            // Se um é numérico e outro não, numérico vem antes
            if (!isNaN(numA)) return -1;
            if (!isNaN(numB)) return 1;

            return a.localeCompare(b);
        });

        return (
            <div className="space-y-8">
                {sortedKeys.map(round => (
                    <div key={round}>
                        <div className="flex items-center justify-center mb-6 mt-4">
                            <div className="h-px bg-gray-300 flex-1 opacity-50"></div>
                            <span className="mx-4 text-sm font-black text-white uppercase tracking-widest bg-gray-900 px-6 py-2 rounded-lg shadow-md border border-gray-800">
                                {round}
                            </span>
                            <div className="h-px bg-gray-300 flex-1 opacity-50"></div>
                        </div>
                        {groups[round].map(match => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-20 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 leading-none">Jogos</h1>
                    <p className="text-xs text-gray-500 mt-1">{champName || 'Carregando...'}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200 sticky top-[73px] z-10 shadow-sm">
                <div className="max-w-3xl mx-auto flex overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap px-4 ${activeTab === 'all' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Todos ({matches.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('live')}
                        className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap px-4 ${activeTab === 'live' ? 'border-red-600 text-red-600 bg-red-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Ao Vivo ({liveMatches.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap px-4 ${activeTab === 'upcoming' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Agendados ({upcomingMatches.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('finished')}
                        className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap px-4 ${activeTab === 'finished' ? 'border-gray-600 text-gray-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Finalizados ({finishedMatches.length})
                    </button>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 space-y-6">
                {loading && matches.length === 0 ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                        <p className="text-gray-500">Nenhum jogo encontrado para esta seleção.</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'all' && (
                            <>
                                {liveMatches.length > 0 && (
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                        <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <span className="block w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                                            Acontecendo Agora
                                        </h3>
                                        {liveMatches.map(match => <MatchCard key={match.id} match={match} />)}
                                    </div>
                                )}

                                {renderMatchesByRound(matches.filter(m => m.status !== 'live'), "Nenhum outro jogo encontrado.")}
                            </>
                        )}

                        {activeTab === 'live' && (
                            liveMatches.length > 0 ? (
                                <div className="animate-in fade-in zoom-in-95 duration-300">
                                    {liveMatches.map(match => <MatchCard key={match.id} match={match} />)}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                                    <p className="text-gray-500">Nenhum jogo ao vivo no momento.</p>
                                </div>
                            )
                        )}

                        {activeTab === 'upcoming' && renderMatchesByRound(upcomingMatches, "Nenhum jogo agendado.")}

                        {activeTab === 'finished' && renderMatchesByRound(finishedMatches, "Nenhum jogo finalizado ainda.")}
                    </>
                )}
            </div>

            <MatchDetailsModal
                matchId={selectedMatchId}
                isOpen={!!selectedMatchId}
                onClose={() => setSelectedMatchId(null)}
            />
        </div>
    );
}
