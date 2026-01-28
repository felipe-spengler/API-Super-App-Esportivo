import { useState, useEffect } from 'react';
import { Calendar, Trash2, Edit, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

export function Matches() {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMatches();
    }, []);

    async function loadMatches() {
        try {
            setLoading(true);
            const response = await api.get('/admin/matches');
            setMatches(response.data);
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

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Partidas</h1>
                    <p className="text-gray-500">Gerencie todos os jogos e súmulas.</p>
                </div>
                {/* Botão de Nova Partida omitido por brevidade nesta iteração, focando na lista */}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : (
                <div className="grid gap-4">
                    {matches.map(match => (
                        <div key={match.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                                {/* Info / Status */}
                                <div className="flex flex-col items-center md:items-start min-w-[150px]">
                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                                        {match.championship?.name}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Calendar className="w-4 h-4" />
                                        <span>{new Date(match.start_time).toLocaleDateString()}</span>
                                    </div>
                                    <div className="mt-2">{getStatusBadge(match.status)}</div>
                                </div>

                                {/* Placar */}
                                <div className="flex-1 flex items-center justify-center gap-8">
                                    <div className="text-right flex-1">
                                        <h3 className="text-lg font-bold text-gray-900">{match.home_team?.name}</h3>
                                        <span className="text-xs text-gray-400">Mandante</span>
                                    </div>

                                    <div className="flex flex-col items-center px-4 bg-gray-50 rounded-lg py-2">
                                        <span className="text-3xl font-black text-indigo-900 font-mono">
                                            {match.home_score ?? '-'} : {match.away_score ?? '-'}
                                        </span>
                                        <span className="text-xs text-gray-400 uppercase font-bold mt-1">Placar</span>
                                    </div>

                                    <div className="text-left flex-1">
                                        <h3 className="text-lg font-bold text-gray-900">{match.away_team?.name}</h3>
                                        <span className="text-xs text-gray-400">Visitante</span>
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="flex items-center gap-2 min-w-[150px] justify-end">

                                    <Link
                                        to={`/matches/${match.id}/sumula`}
                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Súmula
                                    </Link>

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
