
import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Trophy, User, Share2, FileText, ChevronRight, Star, History, Printer, Timer } from 'lucide-react';
import api from '../services/api';
import echo from '../services/echo';

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
    const [activeTab, setActiveTab] = useState<'summary' | 'mvp' | 'report' | 'art' | 'faceoff'>('summary');
    const [localTime, setLocalTime] = useState<number | null>(null);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [currentPeriod, setCurrentPeriod] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && matchId) {
            loadMatchDetails();

            // Real-time Updates with Reverb
            const channelName = `match.${matchId}`;
            echo.channel(channelName)
                .listen('.MatchUpdated', (payload: any) => {
                    console.log("Real-time match update received:", payload);

                    // The event has 'matchId' and 'data' properties
                    const matchData = payload.data;

                    if (matchData && matchData.id) {
                        // Full match update
                        setMatch(matchData);
                        setDetails(matchData.match_details || matchData.details);
                    } else if (payload.event) {
                        // Incremental update (new goal/card) - trigger reload
                        loadMatchDetails(true);
                    }
                });

            // Keep re-sync as fallback. Faster if live.
            let fallbackInterval = 30000; // default 30s

            const recomputeInterval = () => {
                const isLive = match?.status === 'live' || details?.status === 'live';
                const newInterval = isLive ? 5000 : 30000; // 5s if live, 30s otherwise
                if (newInterval !== fallbackInterval) {
                    fallbackInterval = newInterval;
                    clearInterval(slowInterval);
                    slowInterval = setInterval(() => loadMatchDetails(true), fallbackInterval);
                }
            };

            let slowInterval = setInterval(() => {
                loadMatchDetails(true);
                recomputeInterval();
            }, fallbackInterval);

            return () => {
                echo.leave(channelName);
                clearInterval(slowInterval);
            };
        } else {
            setMatch(null);
            setDetails(null);
            setLocalTime(null);
            setIsTimerRunning(false);
            setCurrentPeriod(null);
            setLoading(true);
            setActiveTab('summary');
        }
    }, [isOpen, matchId]);

    // Sync local timer with server data
    useEffect(() => {
        const timerData = match?.match_details?.sync_timer || details?.sync_timer;
        if (timerData) {
            const st = timerData;
            const serverTime = match?.server_time || details?.server_time || Date.now();
            const baseTime = st.time ?? 0;
            const diff = localTime !== null ? Math.abs(localTime - baseTime) : 0;

            // 🔍 DEBUG LOG - Informações completas do timer
            console.group(`⏱️ TIMER SYNC DEBUG - ${new Date().toLocaleTimeString()}`);
            console.log(`📡 Server Time:`, new Date(serverTime).toLocaleTimeString());
            console.log(`⏰ Timer do Servidor:`, `${Math.floor(baseTime / 60)}:${String(baseTime % 60).padStart(2, '0')}`);
            console.log(`💻 Timer Local Atual:`, localTime !== null ? `${Math.floor(localTime / 60)}:${String(localTime % 60).padStart(2, '0')}` : 'null');
            console.log(`📊 Diferença:`, `${diff} segundos`);
            console.log(`▶️ Estado Servidor:`, st.isRunning ? '🟢 RODANDO' : '🔴 PARADO');
            console.log(`▶️ Estado Local:`, isTimerRunning ? '🟢 RODANDO' : '🔴 PARADO');
            console.log(`🔄 Updated At:`, st.updated_at ? new Date(st.updated_at).toLocaleTimeString() : 'N/A');

            // Sync Logic: ONLY update if timer state changed or difference is significant
            const shouldSync = localTime === null || isTimerRunning !== st.isRunning || diff > 5;

            if (shouldSync) {
                const reason = localTime === null ? 'Inicialização' :
                    isTimerRunning !== st.isRunning ? 'Mudança de estado' :
                        `Diferença grande (${diff}s)`;
                console.log(`✅ SINCRONIZANDO:`, reason);
                console.groupEnd();
                setLocalTime(baseTime);
                setIsTimerRunning(st.isRunning ?? false);
            } else {
                console.log(`⏭️ IGNORANDO SYNC: Diferença pequena (${diff}s ≤ 5s)`);
                console.groupEnd();
            }

            setCurrentPeriod(st.currentPeriod ?? null);
        }
    }, [match, details]);

    // Local ticking for smooth UI
    useEffect(() => {
        let interval: any = null;
        if (isTimerRunning && localTime !== null) {
            const sport = match?.championship?.sport?.slug || 'futebol';
            const isRegressive = sport === 'basquete';

            console.log(`🎬 TIMER LOCAL INICIADO - Modo: ${isRegressive ? 'Regressivo ⏪' : 'Progressivo ⏩'}`);

            interval = setInterval(() => {
                setLocalTime(prev => {
                    if (prev === null) return null;
                    const newTime = isRegressive ? Math.max(0, prev - 1) : prev + 1;
                    console.log(`⏰ TICK LOCAL: ${Math.floor(newTime / 60)}:${String(newTime % 60).padStart(2, '0')}`);
                    return newTime;
                });
            }, 1000);
        } else {
            if (!isTimerRunning && localTime !== null) {
                console.log(`⏸️ TIMER LOCAL PAUSADO`);
            }
        }
        return () => {
            if (interval) {
                console.log(`🛑 TIMER LOCAL PARADO`);
                clearInterval(interval);
            }
        };
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
                {/* Header Image/Gradient */}
                <div className="h-40 sm:h-32 bg-gradient-to-r from-slate-900 to-slate-800 relative flex items-center justify-center shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md z-20"
                    >
                        <X size={20} />
                    </button>

                    <div className="absolute top-4 left-4 flex items-center gap-2 text-white/80 text-[10px] sm:text-xs font-medium px-3 py-1 bg-black/20 rounded-full backdrop-blur-md border border-white/10 z-10 max-w-[70%] truncate">
                        <Trophy size={12} className="text-yellow-400 shrink-0" />
                        <span className="truncate">{match?.championship?.name || 'Campeonato'}</span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-8 w-full px-4 sm:px-8 justify-between mt-6 sm:mt-4">
                        {/* Home Team */}
                        <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1 min-w-0">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-full p-1.5 sm:p-2 backdrop-blur-sm border border-white/20 shrink-0">
                                {match?.home_team?.logo || match?.home_team?.logo_url ? (
                                    <img src={match.home_team.logo || match.home_team.logo_url} className="w-full h-full object-contain" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                                        {match?.home_team?.name?.substring(0, 2)}
                                    </div>
                                )}
                            </div>
                            <span className="text-white font-bold text-[10px] sm:text-sm text-center leading-tight line-clamp-2 w-full">
                                {match?.home_team?.name}
                            </span>
                        </div>

                        {/* Score */}
                        <div className="flex flex-col items-center pb-2 min-w-[100px] sm:min-w-[120px] shrink-0">
                            {(isLive || isFinished) && (
                                <div className="mb-1 sm:mb-2 flex flex-col items-center">
                                    <div className="text-yellow-400 font-mono text-xl sm:text-2xl font-bold drop-shadow-md flex items-center gap-1.5 line-height-none">
                                        <Timer size={16} className={isTimerRunning ? "animate-pulse" : "opacity-30"} />
                                        {localTime !== null ? formatMatchTime(localTime) : "--:--"}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        {currentPeriod ? (
                                            <span className="text-[8px] sm:text-[10px] text-white/60 font-bold uppercase tracking-widest">{currentPeriod}</span>
                                        ) : (
                                            isLive && <span className="text-[8px] text-white/30 font-bold uppercase tracking-widest">Aguardando Sinc.</span>
                                        )}
                                        {isLive && localTime !== null && !isTimerRunning && (
                                            <span className="text-[7px] sm:text-[8px] bg-yellow-500/20 text-yellow-500 px-1 rounded font-black border border-yellow-500/30 shrink-0">PARADO</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!loading && (
                                <div className="flex items-center gap-2 sm:gap-4">
                                    <span className="text-3xl sm:text-5xl font-black text-white">{match?.home_score ?? 0}</span>
                                    <span className="text-white/40 text-xl sm:text-2xl font-light">x</span>
                                    <span className="text-3xl sm:text-5xl font-black text-white">{match?.away_score ?? 0}</span>
                                </div>
                            )}
                            <div className={`mt-2 px-2 sm:px-3 py-0.5 rounded-full text-[8px] sm:text-[10px] font-black tracking-widest uppercase border ${isLive ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' :
                                isFinished ? 'bg-white/10 text-white/60 border-white/10' :
                                    'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                }`}>
                                {getStatusText(match?.status)}
                            </div>
                        </div>

                        {/* Away Team */}
                        <div className="flex flex-col items-center gap-1 sm:gap-2 flex-1 min-w-0">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-full p-1.5 sm:p-2 backdrop-blur-sm border border-white/20 shrink-0">
                                {match?.away_team?.logo || match?.away_team?.logo_url ? (
                                    <img src={match.away_team.logo || match.away_team.logo_url} className="w-full h-full object-contain" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                                        {match?.away_team?.name?.substring(0, 2)}
                                    </div>
                                )}
                            </div>
                            <span className="text-white font-bold text-[10px] sm:text-sm text-center leading-tight line-clamp-2 w-full">
                                {match?.away_team?.name}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sub-header Info */}
                <div className="bg-white border-b border-gray-100 p-2 sm:p-3 flex items-center justify-between text-[10px] sm:text-xs text-gray-500 shrink-0 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-3 sm:gap-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 sm:gap-1.5">
                            <Calendar size={14} className="shrink-0" />
                            <span>{match?.start_time ? new Date(match?.start_time).toLocaleDateString() : '--/--/----'}</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5">
                            <Clock size={14} className="shrink-0" />
                            <span>{match?.start_time ? new Date(match?.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5">
                            <MapPin size={14} className="shrink-0" />
                            <span className="max-w-[80px] sm:max-w-none truncate">{match?.location || 'Local a definir'}</span>
                        </div>
                    </div>
                    {isLive && (
                        <div className="flex items-center gap-1.5 text-red-600 font-bold animate-pulse shrink-0 ml-2">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-600" />
                            <span className="hidden sm:inline">Em tempo real</span>
                            <span className="sm:hidden">LIVE</span>
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
                        {/* Tabs (Show MVP and Report only when finished) */}
                        <div className="flex border-b border-gray-100 shrink-0 bg-white">
                            <button
                                onClick={() => setActiveTab('summary')}
                                className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                Resumo
                            </button>
                            {(match?.status === 'scheduled' || match?.status === 'upcoming') && (
                                <button
                                    onClick={() => setActiveTab('art')}
                                    className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'art' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    🎨 Arte
                                </button>
                            )}
                            {isFinished && (
                                <>
                                    <button
                                        onClick={() => setActiveTab('mvp')}
                                        className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'mvp' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                    >
                                        ⭐ Craque
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('faceoff')}
                                        className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'faceoff' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                    >
                                        🖼️ Confronto
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('report')}
                                        className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'report' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                    >
                                        📄 Súmula
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Tab Panels */}
                        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50/50">
                            {activeTab === 'summary' && (
                                <div className="space-y-6">
                                    {/* Timeline */}
                                    <div className="relative">
                                        {/* Center Line */}
                                        <div className="absolute left-8 sm:left-1/2 top-0 bottom-0 w-px bg-gray-200 -ml-px" />

                                        {getSortedEvents().length === 0 ? (
                                            <div className="text-center py-10 text-gray-400 text-sm">
                                                Nenhum evento registrado.
                                            </div>
                                        ) : (
                                            getSortedEvents().map((event: any, idx: number) => {
                                                // Check if it's an own goal - if so, invert the display side
                                                const isOwnGoal = event.metadata?.own_goal === true;
                                                let isHome = event.team_id === match.home_team_id;

                                                // If it's an own goal, invert the side where it appears
                                                // (team A scored own goal -> show on team B's side)
                                                if (isOwnGoal) {
                                                    isHome = !isHome;
                                                }
                                                return (
                                                    <div key={idx} className={`flex items-center mb-6 sm:mb-8 ${isHome ? 'sm:flex-row-reverse' : ''}`}>
                                                        <div className="hidden sm:block flex-1">
                                                            {/* Empty side for desktop positioning */}
                                                        </div>

                                                        {/* Minute Circle */}
                                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-indigo-100 flex items-center justify-center text-[10px] sm:text-xs font-bold text-gray-600 z-10 shrink-0 shadow-sm ml-4.5 sm:ml-0">
                                                            {event.minute}'
                                                        </div>

                                                        {/* Event Card */}
                                                        <div className={`flex-1 pl-4 sm:px-4 ${isHome ? 'sm:text-right' : 'text-left'}`}>
                                                            <div className="inline-block bg-white p-2.5 sm:p-3 rounded-lg shadow-sm border border-gray-100 min-w-[140px] max-w-full">
                                                                <div className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${isHome ? 'sm:justify-end' : ''}`}>
                                                                    <div className="shrink-0">
                                                                        {event.type === 'goal' && '⚽'}
                                                                        {(event.type === 'yellow_card' || event.type === 'yellow') && <div className="w-2.5 h-3.5 sm:w-3 sm:h-4 bg-yellow-400 rounded-sm border border-yellow-500 shadow-sm" />}
                                                                        {(event.type === 'red_card' || event.type === 'red') && <div className="w-2.5 h-3.5 sm:w-3 sm:h-4 bg-red-600 rounded-sm border border-red-700 shadow-sm" />}
                                                                        {event.type === 'blue_card' && <div className="w-2.5 h-3.5 sm:w-3 sm:h-4 bg-blue-500 rounded-sm border border-blue-600 shadow-sm" />}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-gray-800 leading-tight">
                                                                            {event.type === 'goal' ? (event.metadata?.own_goal ? 'Gol Contra!' : 'Gol!') : ''} {event.player_name}
                                                                        </span>
                                                                        <span className="text-[9px] sm:text-[10px] text-gray-400 font-normal sm:hidden">
                                                                            {isHome ? match.home_team?.name : match.away_team?.name}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className={`hidden sm:block text-[10px] text-indigo-600 font-medium mt-1`}>
                                                                    {isHome ? match.home_team?.name : match.away_team?.name}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}

                                        {/* Match Start Indicator */}
                                        <div className="flex items-center justify-center my-4 relative z-10">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] sm:text-xs rounded-full border border-gray-200">
                                                Início da Partida
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'mvp' && (
                                <div className="flex flex-col items-center justify-center py-6">
                                    {match?.mvp ? (
                                        <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                                            <a
                                                href={`${api.defaults.baseURL}/public/art/match/${match.id}/mvp`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="relative w-full aspect-[4/5] bg-gray-200 rounded-2xl overflow-hidden shadow-xl border border-white hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
                                            >
                                                <img
                                                    src={`${api.defaults.baseURL}/public/art/match/${match.id}/mvp`}
                                                    className="w-full h-full object-cover"
                                                    alt="Arte do Craque do Jogo"
                                                    onError={(e: any) => {
                                                        e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22500%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22Arial%22%20font-size%3D%2224%22%20fill%3D%22%239ca3af%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EArte%20do%20Craque%3C%2Ftext%3E%3C%2Fsvg%3E';
                                                    }}
                                                />
                                                {/* Overlay on hover */}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-gray-800 shadow-lg">
                                                        🔍 Clique para ampliar
                                                    </div>
                                                </div>
                                            </a>
                                            <div className="text-center">
                                                <h3 className="text-xl font-black text-indigo-900 uppercase italic tracking-tighter">
                                                    {match.mvp.name}
                                                </h3>
                                                <p className="text-gray-500 text-sm font-medium mb-3">Eleito o melhor da partida</p>
                                                <a
                                                    href={`${api.defaults.baseURL}/public/art/match/${match.id}/mvp`}
                                                    download={`craque-${match.id}-${match.mvp.name}.jpg`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 text-sm"
                                                >
                                                    <Share2 size={16} /> Baixar Arte
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-20">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <User size={32} className="text-gray-300" />
                                            </div>
                                            <p className="text-gray-500 font-medium">Nenhum craque definido ainda.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'report' && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                                        <Printer size={40} className="text-indigo-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Súmula Oficial</h3>
                                    <p className="text-gray-500 max-w-xs mb-8">
                                        Clique abaixo para visualizar e imprimir o documento oficial desta partida.
                                    </p>
                                    <a
                                        href={`/matches/${match.id}/print`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95"
                                    >
                                        <Printer size={20} /> Imprimir Súmula
                                    </a>
                                </div>
                            )}

                            {activeTab === 'art' && (
                                <div className="flex flex-col items-center justify-center py-6">
                                    <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                                        <a
                                            href={`${api.defaults.baseURL}/public/art/match/${match.id}/scheduled?download=true`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="relative w-full aspect-video bg-gray-200 rounded-2xl overflow-hidden shadow-xl border border-white hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
                                        >
                                            <img
                                                src={`${api.defaults.baseURL}/public/art/match/${match.id}/scheduled?t=${Date.now()}`}
                                                className="w-full h-full object-cover"
                                                alt="Arte do Jogo Programado"
                                                onError={(e: any) => {
                                                    e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22225%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22Arial%22%20font-size%3D%2220%22%20fill%3D%22%239ca3af%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3ECarregando%20Arte...%3C%2Ftext%3E%3C%2Fsvg%3E';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-gray-800 shadow-lg">
                                                    🔍 Clique para ampliar
                                                </div>
                                            </div>
                                        </a>
                                        <div className="text-center">
                                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                                Arte de Divulgação
                                            </h3>
                                            <p className="text-gray-500 text-sm mb-4">Compartilhe as informações do jogo!</p>
                                            <a
                                                href={`${api.defaults.baseURL}/public/art/match/${match.id}/scheduled?download=true`}
                                                download={`jogo-${match.id}.jpg`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 text-sm"
                                            >
                                                <Share2 size={16} /> Baixar Imagem
                                            </a>
                                            {/* @ts-ignore */}
                                            {navigator.share && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const response = await fetch(`${api.defaults.baseURL}/public/art/match/${match.id}/scheduled`);
                                                            const blob = await response.blob();
                                                            const file = new File([blob], `jogo-${match.id}.jpg`, { type: 'image/jpeg' });
                                                            await navigator.share({
                                                                title: `Jogo: ${match.home_team?.name} vs ${match.away_team?.name}`,
                                                                text: 'Confira os detalhes da nossa próxima partida!',
                                                                files: [file]
                                                            });

                                                        } catch (err) {
                                                            console.error('Error sharing:', err);
                                                        }
                                                    }}
                                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95 text-sm mt-2"
                                                >
                                                    <Share2 size={16} /> Compartilhar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'faceoff' && (
                                <div className="flex flex-col items-center justify-center py-6">
                                    <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                                        <a
                                            href={`${api.defaults.baseURL}/public/art/match/${match.id}/faceoff`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="relative w-full aspect-[4/5] bg-gray-200 rounded-2xl overflow-hidden shadow-xl border border-white hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
                                        >
                                            <img
                                                src={`${api.defaults.baseURL}/public/art/match/${match.id}/faceoff?t=${Date.now()}`}
                                                className="w-full h-full object-cover"
                                                alt="Arte do Confronto"
                                                onError={(e: any) => {
                                                    e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22500%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22Arial%22%20font-size%3D%2224%22%20fill%3D%22%239ca3af%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EArte%20do%20Confronto%3C%2Ftext%3E%3C%2Fsvg%3E';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-gray-800 shadow-lg">
                                                    🔍 Clique para ampliar
                                                </div>
                                            </div>
                                        </a>
                                        <div className="text-center">
                                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                                Arte do Confronto
                                            </h3>
                                            <p className="text-gray-500 text-sm mb-4">Resultado final e goleadores!</p>
                                            <a
                                                href={`${api.defaults.baseURL}/public/art/match/${match.id}/faceoff`}
                                                download={`confronto-${match.id}.jpg`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 text-sm"
                                            >
                                                <Share2 size={16} /> Baixar Imagem
                                            </a>
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
