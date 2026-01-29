
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock } from 'lucide-react';
import api from '../../services/api';

export function EventMatches() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('category_id');
    const navigate = useNavigate();

    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [champName, setChampName] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // Fetch championship info for header
                const champRes = await api.get(`/championships/${id}`);
                setChampName(champRes.data.name);

                const response = await api.get(`/championships/${id}/matches`, {
                    params: { category_id: categoryId }
                });
                setMatches(response.data);

            } catch (error) {
                console.error("Erro ao carregar jogos", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id, categoryId]);

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all mb-3">
            {/* Match Header: Date & Place */}
            <div className="bg-gray-50 px-4 py-2 flex justify-between items-center text-xs text-gray-500 border-b border-gray-100">
                <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(match.start_time).toLocaleDateString()}</span>
                    <span className="mx-1">•</span>
                    <Clock className="w-3 h-3" />
                    <span>{new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{match.location || 'Local a definir'}</span>
                </div>
            </div>

            {/* Match Content */}
            <div className="p-4">
                <div className="flex items-center justify-between">
                    {/* Home Team */}
                    <div className="flex-1 flex flex-col items-center text-center gap-2">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                            {match.home_team?.logo ? (
                                <img src={match.home_team.logo} alt={match.home_team.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold text-gray-400">{match.home_team?.name?.substring(0, 2)}</span>
                            )}
                        </div>
                        <span className="text-sm font-bold text-gray-800 leading-tight block w-full truncate">{match.home_team?.name || 'Mandante'}</span>
                    </div>

                    {/* Score Board */}
                    <div className="flex flex-col items-center px-4 w-24">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-gray-900">{match.home_score ?? '-'}</span>
                            <span className="text-xs text-gray-400 font-bold">X</span>
                            <span className="text-2xl font-black text-gray-900">{match.away_score ?? '-'}</span>
                        </div>
                        <div className="mt-2 text-center scale-90 origin-top">
                            {getStatusBadge(match.status)}
                        </div>
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 flex flex-col items-center text-center gap-2">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                            {match.away_team?.logo ? (
                                <img src={match.away_team.logo} alt={match.away_team.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold text-gray-400">{match.away_team?.name?.substring(0, 2)}</span>
                            )}
                        </div>
                        <span className="text-sm font-bold text-gray-800 leading-tight block w-full truncate">{match.away_team?.name || 'Visitante'}</span>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 leading-none">Jogos</h1>
                    <p className="text-xs text-gray-500 mt-1">{champName || 'Carregando...'}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200 sticky top-[73px] z-10">
                <div className="max-w-3xl mx-auto flex">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'all' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Todos ({matches.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('live')}
                        className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'live' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Ao Vivo ({liveMatches.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'upcoming' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Agendados ({upcomingMatches.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('finished')}
                        className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 ${activeTab === 'finished' ? 'border-gray-600 text-gray-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Finalizados ({finishedMatches.length})
                    </button>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 space-y-6">
                {loading ? (
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
                                    <div>
                                        <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                                            Acontecendo Agora
                                        </h3>
                                        {liveMatches.map(match => <MatchCard key={match.id} match={match} />)}
                                    </div>
                                )}
                                {upcomingMatches.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" />
                                            Próximos Jogos
                                        </h3>
                                        {upcomingMatches.map(match => <MatchCard key={match.id} match={match} />)}
                                    </div>
                                )}
                                {finishedMatches.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Finalizados
                                        </h3>
                                        {finishedMatches.map(match => <MatchCard key={match.id} match={match} />)}
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'live' && (
                            liveMatches.length > 0 ? (
                                liveMatches.map(match => <MatchCard key={match.id} match={match} />)
                            ) : (
                                <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                                    <p className="text-gray-500">Nenhum jogo ao vivo no momento.</p>
                                </div>
                            )
                        )}

                        {activeTab === 'upcoming' && (
                            upcomingMatches.length > 0 ? (
                                upcomingMatches.map(match => <MatchCard key={match.id} match={match} />)
                            ) : (
                                <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                                    <p className="text-gray-500">Nenhum jogo agendado.</p>
                                </div>
                            )
                        )}

                        {activeTab === 'finished' && (
                            finishedMatches.length > 0 ? (
                                finishedMatches.map(match => <MatchCard key={match.id} match={match} />)
                            ) : (
                                <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                                    <p className="text-gray-500">Nenhum jogo finalizado ainda.</p>
                                </div>
                            )
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
