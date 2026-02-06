
import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Clock, Trophy, Share2, Timer, User } from 'lucide-react';
import api from '../services/api';

interface MatchDetailsModalProps {
    matchId: string | number | null;
    isOpen: boolean;
    onClose: () => void;
}

export function MatchDetailsModal({ matchId, isOpen, onClose }: MatchDetailsModalProps) {
    const [match, setMatch] = useState<any>(null);
    const [details, setDetails] = useState<any>(null);
    const [rosters, setRosters] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'summary' | 'lineups' | 'stats'>('summary');
    const [localTime, setLocalTime] = useState<number | null>(null);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [currentPeriod, setCurrentPeriod] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && matchId) {
            loadMatchDetails();
            const interval = setInterval(() => {
                loadMatchDetails(true);
            }, 10000); // 10s poll

            return () => clearInterval(interval);
        } else {
            setMatch(null);
            setDetails(null);
            setLocalTime(null);
            setIsTimerRunning(false);
            setCurrentPeriod(null);
            setLoading(true);
        }
    }, [isOpen, matchId]);

    // Sync local timer with server data
    useEffect(() => {
        if (match?.match_details?.sync_timer) {
            const st = match.match_details.sync_timer;
            const sport = match?.championship?.sport?.slug || 'futebol';
            const isRegressive = sport === 'basquete';

            // Calculate drift if updated_at is available
            let baseTime = st.time ?? 0;
            if (st.updated_at && st.isRunning) {
                const elapsedSinceUpdate = Math.floor((Date.now() - st.updated_at) / 1000);
                if (elapsedSinceUpdate > 0) {
                    baseTime = isRegressive ? Math.max(0, baseTime - elapsedSinceUpdate) : baseTime + elapsedSinceUpdate;
                }
            }

            setLocalTime(baseTime);
            setIsTimerRunning(st.isRunning ?? false);
            setCurrentPeriod(st.currentPeriod ?? null);
        }
    }, [match]);

    // Local ticking for smooth UI
    useEffect(() => {
        let interval: any = null;
        if (isTimerRunning && localTime !== null) {
            const sport = match?.championship?.sport?.slug || 'futebol';
            const isRegressive = sport === 'basquete';

            interval = setInterval(() => {
                setLocalTime(prev => {
                    if (prev === null) return null;
                    return isRegressive ? Math.max(0, prev - 1) : prev + 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, localTime, match]);

    const formatMatchTime = (seconds: number | null) => {
        if (seconds === null) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };


    async function loadMatchDetails(silent = false) {
        if (!silent) setLoading(true);
        try {
            const response = await api.get(`/public/matches/${matchId}`);
            setMatch(response.data.match);
            setDetails(response.data.details);
            setRosters(response.data.rosters);
        } catch (error) {
            console.error("Erro ao carregar detalhes da partida", error);
        } finally {
            if (!silent) setLoading(false);
        }
    }

    if (!isOpen) return null;

    const isLive = match?.status === 'live';
    const isFinished = match?.status === 'finished';

    // Helper to format events
    const getSortedEvents = () => {
        if (!details?.events) return [];
        // Sort events by time (descending)
        return [...details.events].sort((a, b) => {
            // Handle '45+2' format if exists, or just numbers
            const timeA = parseInt(String(a.minute).replace(/\D/g, '')) || 0;
            const timeB = parseInt(String(b.minute).replace(/\D/g, '')) || 0;
            return timeB - timeA;
        });
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'live': return 'AO VIVO';
            case 'finished': return 'ENCERRADO';
            case 'upcoming': return 'AGENDADO';
            default: return status;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header Image/Gradient */}
                <div className="h-32 bg-gradient-to-r from-slate-900 to-slate-800 relative flex items-center justify-center shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
                    >
                        <X size={20} />
                    </button>

                    <div className="absolute top-4 left-4 flex items-center gap-2 text-white/80 text-xs font-medium px-3 py-1 bg-black/20 rounded-full backdrop-blur-md border border-white/10">
                        <Trophy size={12} className="text-yellow-400" />
                        <span>{match?.championship?.name || 'Campeonato'}</span>
                    </div>

                    <div className="flex items-center gap-8 w-full px-8 justify-between mt-4">
                        {/* Home Team */}
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-16 h-16 bg-white/10 rounded-full p-2 backdrop-blur-sm border border-white/20">
                                {match?.home_team?.logo || match?.home_team?.logo_url ? (
                                    <img src={match.home_team.logo || match.home_team.logo_url} className="w-full h-full object-contain" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                                        {match?.home_team?.name?.substring(0, 2)}
                                    </div>
                                )}
                            </div>
                            <span className="text-white font-bold text-sm text-center leading-tight line-clamp-2 w-full">
                                {match?.home_team?.name}
                            </span>
                        </div>

                        {/* Score */}
                        <div className="flex flex-col items-center pb-4 min-w-[120px]">
                            {isLive && localTime !== null && (
                                <div className="mb-2 flex flex-col items-center">
                                    <div className="text-yellow-400 font-mono text-2xl font-bold drop-shadow-md flex items-center gap-2">
                                        <Timer size={18} className="animate-pulse" />
                                        {formatMatchTime(localTime)}
                                    </div>
                                    {currentPeriod && (
                                        <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">{currentPeriod}</span>
                                    )}
                                </div>
                            )}

                            {!loading && (
                                <div className="flex items-center gap-4">
                                    <span className="text-5xl font-black text-white">{match?.home_score ?? 0}</span>
                                    <span className="text-white/40 text-2xl font-light">x</span>
                                    <span className="text-5xl font-black text-white">{match?.away_score ?? 0}</span>
                                </div>
                            )}
                            <div className={`mt-2 px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest uppercase border ${isLive ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' :
                                isFinished ? 'bg-white/10 text-white/60 border-white/10' :
                                    'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                }`}>
                                {getStatusText(match?.status)}
                            </div>
                        </div>

                        {/* Away Team */}
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-16 h-16 bg-white/10 rounded-full p-2 backdrop-blur-sm border border-white/20">
                                {match?.away_team?.logo || match?.away_team?.logo_url ? (
                                    <img src={match.away_team.logo || match.away_team.logo_url} className="w-full h-full object-contain" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                                        {match?.away_team?.name?.substring(0, 2)}
                                    </div>
                                )}
                            </div>
                            <span className="text-white font-bold text-sm text-center leading-tight line-clamp-2 w-full">
                                {match?.away_team?.name}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sub-header Info */}
                <div className="bg-white border-b border-gray-100 p-3 flex items-center justify-between text-xs text-gray-500 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <Calendar size={14} />
                            <span>{new Date(match?.start_time).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} />
                            <span>{new Date(match?.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MapPin size={14} />
                            <span>{match?.location || 'Local a definir'}</span>
                        </div>
                    </div>
                    {isLive && (
                        <div className="flex items-center gap-1.5 text-red-600 font-bold animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-600" />
                            <span>Em tempo real</span>
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex-1 flex items-center justify-center min-h-[300px]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                )}

                {/* Content */}
                {!loading && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 shrink-0">
                            <button
                                onClick={() => setActiveTab('summary')}
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                Resumo
                            </button>
                            <button
                                onClick={() => setActiveTab('lineups')}
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'lineups' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                Escalações
                            </button>
                        </div>

                        {/* Tab Panels */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                            {activeTab === 'summary' && (
                                <div className="space-y-6">
                                    {/* Timeline */}
                                    <div className="relative">
                                        {/* Center Line */}
                                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 -ml-px" />

                                        {getSortedEvents().length === 0 ? (
                                            <div className="text-center py-10 text-gray-400 text-sm">
                                                Nenhum evento registrado.
                                            </div>
                                        ) : (
                                            getSortedEvents().map((event: any, idx: number) => {
                                                const isHome = event.team_id === match.home_team_id;
                                                return (
                                                    <div key={idx} className={`flex items-center mb-6 ${isHome ? 'flex-row-reverse' : ''}`}>
                                                        <div className="flex-1 text-center sm:text-left px-4">
                                                            {/* Empty side */}
                                                        </div>

                                                        {/* Minute Circle */}
                                                        <div className="w-8 h-8 rounded-full bg-white border-2 border-indigo-100 flex items-center justify-center text-xs font-bold text-gray-600 z-10 shrink-0 shadow-sm">
                                                            {event.minute}'
                                                        </div>

                                                        {/* Event Card */}
                                                        <div className={`flex-1 px-4 ${isHome ? 'text-right' : 'text-left'}`}>
                                                            <div className="inline-block bg-white p-3 rounded-lg shadow-sm border border-gray-100 min-w-[140px]">
                                                                <div className={`text-sm font-bold flex items-center gap-2 ${isHome ? 'justify-end' : ''}`}>
                                                                    {event.type === 'goal' && '⚽ Gol!'}
                                                                    {(event.type === 'yellow_card' || event.type === 'yellow') && <div className="w-3 h-4 bg-yellow-400 rounded-sm border border-yellow-500 shadow-sm" />}
                                                                    {(event.type === 'red_card' || event.type === 'red') && <div className="w-3 h-4 bg-red-600 rounded-sm border border-red-700 shadow-sm" />}

                                                                    <span className="text-gray-800">{event.player_name}</span>
                                                                </div>
                                                                {event.type === 'goal' && (
                                                                    <div className="text-xs text-indigo-600 font-medium mt-1">
                                                                        {isHome ? match.home_team?.name : match.away_team?.name}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}

                                        {/* Match Start/End Indicators */}
                                        <div className="flex items-center justify-center my-4 relative z-10">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full border border-gray-200">
                                                Início da Partida
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'lineups' && (
                                <div className="grid grid-cols-2 gap-8">
                                    {/* Home Roster */}
                                    <div>
                                        <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3 text-center uppercase text-sm tracking-wider">
                                            {match.home_team?.name}
                                        </h3>
                                        <div className="space-y-1">
                                            {rosters?.home?.map((player: any) => (
                                                <div key={player.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                                        {player.number || '-'}
                                                    </div>
                                                    <span className="text-sm text-gray-700 font-medium truncate">{player.name}</span>
                                                    {details?.events?.some((e: any) => e.type === 'goal' && e.player_id === player.id) && (
                                                        <span className="ml-auto text-xs">⚽</span>
                                                    )}
                                                </div>
                                            ))}
                                            {(!rosters?.home || rosters.home.length === 0) && (
                                                <p className="text-center text-gray-400 text-sm italic py-4">Escalação não disponível</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Away Roster */}
                                    <div>
                                        <h3 className="font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3 text-center uppercase text-sm tracking-wider">
                                            {match.away_team?.name}
                                        </h3>
                                        <div className="space-y-1">
                                            {rosters?.away?.map((player: any) => (
                                                <div key={player.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                                        {player.number || '-'}
                                                    </div>
                                                    <span className="text-sm text-gray-700 font-medium truncate">{player.name}</span>
                                                    {details?.events?.some((e: any) => e.type === 'goal' && e.player_id === player.id) && (
                                                        <span className="ml-auto text-xs">⚽</span>
                                                    )}
                                                </div>
                                            ))}
                                            {(!rosters?.away || rosters.away.length === 0) && (
                                                <p className="text-center text-gray-400 text-sm italic py-4">Escalação não disponível</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
