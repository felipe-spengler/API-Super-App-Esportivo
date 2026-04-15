import { useState, useEffect } from 'react';
import { AlertCircle, X, ExternalLink, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Match {
    id: number;
    home_team_id: number;
    away_team_id: number;
    start_time: string;
    status: string;
    home_team?: { name: string };
    away_team?: { name: string };
    championship?: { name: string };
}

export function PendingMatchesAlert() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPendingMatches = async () => {
            try {
                const response = await api.get('/admin/alerts/pending-matches');
                if (response.data && response.data.length > 0) {
                    setMatches(response.data);
                    setIsVisible(true);
                }
            } catch (error) {
                console.error('Erro ao buscar partidas pendentes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPendingMatches();
    }, []);

    if (!isVisible || matches.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-2xl shadow-2xl border border-amber-100 overflow-hidden">
                <div className="bg-amber-500 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                        <AlertCircle size={20} className="animate-pulse" />
                        <span className="font-bold text-sm uppercase tracking-wider">Atenção Admin</span>
                    </div>
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="text-white/80 hover:text-white transition-colors"
                        title="Fechar aviso"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-4 bg-gradient-to-b from-amber-50/50 to-white">
                    <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                        Existem <span className="font-bold text-amber-600">{matches.length} {matches.length === 1 ? 'partida que está' : 'partidas que estão'}</span> "Ao Vivo" há mais de 24 horas. Verifique se você esqueceu de encerrá-las:
                    </p>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                        {matches.map(match => {
                            const sportSlug = match.championship?.sport?.slug || 'futebol';
                            const sumulaRoutes: Record<string, string> = {
                                'futebol': '/sumula',
                                'volei': '/sumula-volei',
                                'futsal': '/sumula-futsal',
                                'basquete': '/sumula-basquete',
                                'handebol': '/sumula-handebol',
                                'beach-tennis': '/sumula-beach-tennis',
                                'tenis': '/sumula-tenis',
                                'futebol7': '/sumula-futebol7',
                                'futevolei': '/sumula-futevolei',
                                'volei-praia': '/sumula-volei-praia',
                                'tenis-mesa': '/sumula-tenis-mesa',
                                'jiu-jitsu': '/sumula-jiu-jitsu'
                            };
                            const suffix = sumulaRoutes[sportSlug] || '/sumula';
                            const url = `/admin/matches/${match.id}${suffix}`;

                            return (
                                <Link 
                                    key={match.id}
                                    to={url}
                                    className="block p-3 rounded-xl bg-white border border-gray-100 hover:border-amber-300 hover:shadow-md transition-all group"
                                    onClick={() => setIsVisible(false)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="text-[10px] text-gray-400 uppercase font-medium mb-1">
                                                {match.championship?.name || 'Campeonato'}
                                            </div>
                                            <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                                <span>{match.home_team?.name || 'Time A'}</span>
                                                <span className="text-gray-300 text-xs font-normal">x</span>
                                                <span>{match.away_team?.name || 'Time B'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-500 font-medium">
                                                <Clock size={12} />
                                                Iniciada em {new Date(match.start_time).toLocaleDateString()} às {new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <ExternalLink size={14} className="text-gray-300 group-hover:text-amber-500 transition-colors mt-1" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                    
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="w-full mt-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
                    >
                        Entendido, vou verificar
                    </button>
                </div>
            </div>
        </div>
    );
}
