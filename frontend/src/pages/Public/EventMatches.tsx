
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

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // Fetch championship info for header
                const champRes = await api.get(`/championships/${id}`);
                setChampName(champRes.data.name);

                // Fetch matches
                // Assuming filtered by championship. Ideally backend supports ?championship_id={id}
                // or we use a specific endpoint like /championships/:id/matches
                // Falling back to a plausible public endpoint or reusing admin one if safe (often admin endpoints are protected).
                // Let's try to query public matches. 
                // If specific public endpoint doesn't exist, I'll filter client side for now from a general list if the specific one fails, 
                // but usually there is /public/matches or similar.
                // Given the context of "parity with mobile", mobile probably hits /matches?championship_id=X

                const response = await api.get(`/matches?championship_id=${id}${categoryId ? `&category_id=${categoryId}` : ''}`);
                setMatches(response.data);

            } catch (error) {
                console.error("Erro ao carregar jogos", error);
                // Fallback for mocked environment if backend route not ready
                // setMatches([]); 
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

            <div className="max-w-3xl mx-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                        <p className="text-gray-500">Nenhum jogo encontrado para esta seleção.</p>
                    </div>
                ) : (
                    matches.map((match) => (
                        <div key={match.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
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
                                    <div className="flex flex-col items-center px-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl font-black text-gray-900">{match.home_score ?? '-'}</span>
                                            <span className="text-xs text-gray-400 font-bold">X</span>
                                            <span className="text-2xl font-black text-gray-900">{match.away_score ?? '-'}</span>
                                        </div>
                                        <div className="mt-2 text-center">
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
                    ))
                )}
            </div>
        </div>
    );
}
