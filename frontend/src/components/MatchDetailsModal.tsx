import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Clock, MapPin, Trophy, User, Share2, FileText, ChevronRight, Star, History, Printer, Timer, Triangle } from 'lucide-react';
import api from '../services/api';
import echo from '../services/echo';
import { getMatchPhrase } from '../utils/matchPhrases';
import { MatchArtTab } from './MatchArtTab';
import { MatchMvpTab } from './MatchMvpTab';
import { MatchPernaTab } from './MatchPernaTab';
import { MatchReportTab } from './MatchReportTab';
import { MatchFaceoffTab } from './MatchFaceoffTab';

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
    const [activeTab, setActiveTab] = useState<'summary' | 'mvp' | 'perna' | 'report' | 'art' | 'faceoff'>('summary');
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

    // Real-time updates for competitor times (WebSockets via Reverb)
    useEffect(() => {
        const champId = match?.championship_id;
        if (isOpen && champId) {
            const channelName = `championship.${champId}`;
            echo.channel(channelName)
                .listen('.ChampionshipTimesUpdated', () => {
                    console.log("Real-time competitor times update received, reloading...");
                    loadMatchDetails(true); // Silent reload
                });

            return () => {
                echo.leave(channelName);
            };
        }
    }, [isOpen, match?.championship_id]);

    // Sync local timer with server data
    const localTimeRef = useRef(localTime);
    const isTimerRunningRef = useRef(isTimerRunning);
    useEffect(() => {
        localTimeRef.current = localTime;
        isTimerRunningRef.current = isTimerRunning;
    }, [localTime, isTimerRunning]);

    useEffect(() => {
        const timerData = match?.match_details?.sync_timer || details?.sync_timer;
        const matchStatus = match?.status || details?.status;
        const isMatchFinished = matchStatus === 'finished';

        if (timerData) {
            const st = timerData;
            let adjustedTime = st.time ?? 0;

            // Se o jogo está encerrado, o timer nunca deve rodar
            const serverIsRunning = isMatchFinished ? false : (st.isRunning ?? false);

            if (serverIsRunning && st.updated_at) {
                const now = new Date().getTime();
                const diffMs = Math.max(0, now - st.updated_at);
                adjustedTime += Math.floor(diffMs / 1000);
            }

            const currentLocal = localTimeRef.current;
            const currentRunning = isTimerRunningRef.current;

            const diff = currentLocal !== null ? Math.abs(currentLocal - adjustedTime) : 0;

            // Sync Logic: ONLY update if timer state changed or difference is significant
            const shouldSync = currentLocal === null || currentRunning !== serverIsRunning || diff > 5;

            if (shouldSync) {
                setLocalTime(adjustedTime);
                setIsTimerRunning(serverIsRunning);
            }

            setCurrentPeriod(isMatchFinished ? null : (st.currentPeriod ?? null));
        } else if (isMatchFinished) {
            // Jogo encerrado sem dados de timer: garante que esteja parado
            setIsTimerRunning(false);
        }
    }, [match, details]);

    // Local ticking for smooth UI — only runs if match is live and timer is running
    useEffect(() => {
        let interval: any = null;
        const isMatchFinished = match?.status === 'finished';

        if (isTimerRunning && localTime !== null && !isMatchFinished) {
            const sport = match?.championship?.sport?.slug || 'futebol';
            const isRegressive = sport === 'basquete';

            interval = setInterval(() => {
                setLocalTime(prev => {
                    if (prev === null) return null;
                    return isRegressive ? Math.max(0, prev - 1) : prev + 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerRunning, localTime, match]);

    const formatMatchTime = (seconds: number | null) => {
        if (seconds === null) return '--:--';
        const safeSeconds = Math.max(0, Math.floor(seconds)); // Garante numero positivo e inteiro
        const mins = Math.floor(safeSeconds / 60);
        const secs = safeSeconds % 60;
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

        const sport = match?.championship?.sport?.slug || 'futebol';
        const isVolei = sport.includes('volei') || sport.includes('vôlei');
        const isBasquete = sport.includes('basquete');

        // Sort events by ID descending to ensure true chronological insertion order (newest first)
        // This avoids issues with inconsistent minute strings or multi-period games
        const sorted = [...details.events].sort((a, b) => {
            // Priority 1: ID descending (True chronological entry)
            if (a.id && b.id) {
                return b.id - a.id;
            }

            // Fallback for legacy JSON events without IDs
            const timeA = parseInt(String(a.minute).replace(/\D/g, '')) || 0;
            const timeB = parseInt(String(b.minute).replace(/\D/g, '')) || 0;
            if (timeA !== timeB) return timeB - timeA;

            // Secondary sort by ID if available
            return (b.id || 0) - (a.id || 0);
        });

        // 2. Filter duplicate system events and HIDDEN events
        const seenSystemEvents = new Set<string>();
        const hiddenEvents = ['voice_debug', 'timer_control', 'roster_snapshot'];

        return sorted.filter(event => {
            if (hiddenEvents.includes(event.type)) return false;

            const isUniqSystemEvent = ['match_start', 'match_end', 'period_start', 'period_end', 'game_won', 'set_won'].includes(event.type);
            if (!isUniqSystemEvent) return true;

            const periodKey = event.period || event.metadata?.system_period || event.metadata?.label || 'no-period';
            const key = `${event.type}-${periodKey}`;

            if (seenSystemEvents.has(key)) return false;
            seenSystemEvents.add(key);
            return true;
        });
    };

    const isTimesOrLapsFormat = match?.championship?.format === 'time_ranking' || match?.championship?.format === 'laps';

    const getSortedCompetitorTimes = () => {
        if (!match?.competitor_times) return [];
        return [...match.competitor_times].sort((a, b) => {
            if (match?.championship?.format === 'laps') {
                if (a.lap !== b.lap) {
                    return (b.lap || 1) - (a.lap || 1);
                }
            }
            return a.time_ms - b.time_ms;
        });
    };

    const formatMsToTime = (ms: number) => {
        if (!ms) return '--:--.--';
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
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

                    {isTimesOrLapsFormat ? (
                        <div className="flex flex-col items-center justify-center w-full px-6 mt-6 sm:mt-4">
                            <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/30 px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg shadow-indigo-500/5 mb-2">
                                <Timer size={18} className="text-indigo-400 animate-pulse" />
                                <span className="text-white font-black uppercase tracking-widest text-xs sm:text-sm">
                                    {match?.round_name || `Bateria ${match?.round_number}`}
                                </span>
                            </div>
                            <span className="text-white/60 font-medium text-[10px] sm:text-xs flex items-center gap-1">
                                <span className={`inline-block w-2 h-2 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : isFinished ? 'bg-slate-500' : 'bg-blue-500'}`} />
                                {getStatusText(match?.status)}
                            </span>
                        </div>
                    ) : (
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
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-2 sm:gap-4">
                                            <span className="text-3xl sm:text-5xl font-black text-white tabular-nums">{match?.home_score ?? 0}</span>
                                            <span className="text-white/40 text-xl sm:text-2xl font-light">x</span>
                                            <span className="text-3xl sm:text-5xl font-black text-white tabular-nums">{match?.away_score ?? 0}</span>
                                        </div>

                                        {/* Placar de pontos do set atual (Vôlei) */}
                                        {match?.championship?.sport?.slug === 'volei' && details?.volley_state && (
                                            <div className="flex items-center gap-1.5 mt-[-2px] mb-1">
                                                <span className="text-[10px] sm:text-xs font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/5 shadow-inner tabular-nums">
                                                    {details.volley_state.home_score ?? 0}
                                                </span>
                                                <span className="text-[8px] text-white/20 font-black">PONTOS</span>
                                                <span className="text-[10px] sm:text-xs font-bold text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/5 shadow-inner tabular-nums">
                                                    {details.volley_state.away_score ?? 0}
                                                </span>
                                            </div>
                                        )}

                                        {/* Placar de Sets/Games para Tênis/Vôlei/Beach Tennis */}
                                        {['tenis', 'volei', 'beach-tennis', 'volei-praia', 'tenis-mesa'].includes(match?.championship?.sport?.slug) && details?.sets?.length > 0 && (
                                            <div className="flex items-center gap-1 mt-1">
                                                {details.sets.map((set: any, i: number) => (
                                                    <div key={i} className="flex flex-col items-center px-1 border-x border-white/10 first:border-l-0 last:border-r-0">
                                                        <span className="text-[7px] text-white/40 font-bold leading-none">{i + 1}º</span>
                                                        <span className="text-[9px] text-yellow-400 font-black leading-none">{set.home_score}-{set.away_score}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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
                    )}
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
                        {!isTimesOrLapsFormat && (
                            <div className="flex border-b border-gray-100 shrink-0 bg-white">
                                <button
                                    onClick={() => setActiveTab('summary')}
                                    className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'summary' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Resumo
                                </button>
                                <button
                                    onClick={() => setActiveTab('art')}
                                    className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'art' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    🎨 Arte
                                </button>
                                {(isFinished || match?.mvp || match?.status === 'live') && (
                                    <>
                                        <button
                                            onClick={() => setActiveTab('mvp')}
                                            className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'mvp' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                        >
                                            ⭐ Craque
                                        </button>
                                        {match?.perna_de_pau && (
                                            <button
                                                onClick={() => setActiveTab('perna')}
                                                className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'perna' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                            >
                                                🤡 Perna de Pau
                                            </button>
                                        )}
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
                        )}

                        {/* Tab Panels */}
                        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50/50">
                            {activeTab === 'summary' && (
                                <div className="space-y-6">
                                    {isTimesOrLapsFormat ? (
                                        /* Timing/Lap Leaderboard */
                                        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden text-white font-sans animate-in fade-in duration-300">
                                            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Timer className="text-indigo-400 animate-pulse w-5 h-5" />
                                                    <span className="font-black tracking-wider text-xs sm:text-sm uppercase text-slate-200">
                                                        Tabela de Classificação
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-bold bg-slate-800/50 px-2.5 py-1 rounded border border-slate-700">
                                                    {match?.competitor_times?.length || 0} Registrados
                                                </span>
                                            </div>

                                            {getSortedCompetitorTimes().length === 0 ? (
                                                <div className="text-center py-12 text-slate-500 text-sm font-semibold">
                                                    🏁 Nenhum tempo registrado ainda nesta bateria.
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400">
                                                                <th className="px-4 py-3 text-center w-12">Pos</th>
                                                                <th className="px-4 py-3">Atleta / Equipe</th>
                                                                {match?.championship?.format === 'laps' && (
                                                                    <th className="px-4 py-3 text-center">Volta</th>
                                                                )}
                                                                <th className="px-4 py-3">Melhor Tempo</th>
                                                                <th className="px-4 py-3 text-right">Diferença</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-800">
                                                            {getSortedCompetitorTimes().map((t: any, idx: number) => {
                                                                const isTop3 = idx < 3;
                                                                const position = idx + 1;
                                                                
                                                                // Calculate Gap
                                                                const leader = getSortedCompetitorTimes()[0];
                                                                let gapText = '--';
                                                                
                                                                if (idx > 0 && leader) {
                                                                    if (match?.championship?.format === 'laps') {
                                                                        const leaderLap = leader.lap || 1;
                                                                        const currentLap = t.lap || 1;
                                                                        if (leaderLap > currentLap) {
                                                                            const diff = leaderLap - currentLap;
                                                                            gapText = `+${diff} ${diff === 1 ? 'Volta' : 'Voltas'}`;
                                                                        } else {
                                                                            const diffMs = t.time_ms - leader.time_ms;
                                                                            gapText = diffMs > 0 ? `+${(diffMs / 1000).toFixed(3)}s` : 'LÍDER';
                                                                        }
                                                                    } else {
                                                                        const diffMs = t.time_ms - leader.time_ms;
                                                                        gapText = diffMs > 0 ? `+${(diffMs / 1000).toFixed(3)}s` : 'LÍDER';
                                                                    }
                                                                } else if (idx === 0) {
                                                                    gapText = 'LÍDER';
                                                                }

                                                                const podiumStyles = [
                                                                    'bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-l-amber-500',
                                                                    'bg-slate-400/5 hover:bg-slate-400/10 border-l-4 border-l-slate-400',
                                                                    'bg-amber-700/10 hover:bg-amber-700/15 border-l-4 border-l-amber-700',
                                                                ];

                                                                const rankBadgeColor = [
                                                                    'bg-amber-500/20 text-amber-300 border border-amber-500/30',
                                                                    'bg-slate-400/20 text-slate-300 border border-slate-400/30',
                                                                    'bg-amber-700/20 text-amber-400 border border-amber-700/30',
                                                                ];

                                                                return (
                                                                    <tr 
                                                                        key={t.id || idx} 
                                                                        className={`transition-all duration-150 hover:bg-slate-800/30 ${isTop3 ? podiumStyles[idx] : 'hover:translate-x-0.5'}`}
                                                                    >
                                                                        <td className="px-4 py-3.5 text-center font-mono">
                                                                            {isTop3 ? (
                                                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${rankBadgeColor[idx]}`}>
                                                                                    {position}º
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-slate-500 font-bold text-sm">
                                                                                    {position}
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-3.5">
                                                                            <div className="font-bold text-slate-100 text-xs sm:text-sm">
                                                                                {t.user?.name || 'Piloto Desconhecido'}
                                                                            </div>
                                                                            {t.team && (
                                                                                <div className="text-[10px] text-indigo-400 font-black tracking-widest uppercase mt-0.5">
                                                                                    {t.team.name}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                        {match?.championship?.format === 'laps' && (
                                                                            <td className="px-4 py-3.5 text-center font-mono">
                                                                                <span className="bg-slate-800 text-slate-300 font-black px-2.5 py-1 rounded-full text-xs border border-slate-700">
                                                                                    #{t.lap || 1}
                                                                                </span>
                                                                            </td>
                                                                        )}
                                                                        <td className="px-4 py-3.5 font-mono font-black text-slate-200 text-sm sm:text-base">
                                                                            {formatMsToTime(t.time_ms)}
                                                                        </td>
                                                                        <td className="px-4 py-3.5 text-right font-mono font-bold text-xs sm:text-sm text-slate-300">
                                                                            <span className={idx === 0 ? "text-emerald-400 font-black" : "text-slate-400"}>
                                                                                {gapText}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* Timeline */
                                        <div className="relative">
                                            {/* Center Line */}
                                            <div className="absolute left-8 sm:left-1/2 top-0 bottom-0 w-px bg-gray-200 -ml-px" />

                                        {getSortedEvents().length === 0 ? (
                                            <div className="text-center py-10 text-gray-400 text-sm">
                                                Nenhum evento registrado.
                                            </div>
                                        ) : (
                                            getSortedEvents().map((event: any, idx: number) => {
                                                const isSystemEvent = ['match_start', 'match_end', 'period_start', 'period_end', 'timeout'].includes(event.type);

                                                if (isSystemEvent) {
                                                    // Mesmo helper defensivo das súmulas
                                                    const getSystemEventTitle = () => {
                                                        if (event.type === 'match_start') return 'Início da Partida';
                                                        if (event.type === 'match_end') return 'Fim de Jogo';
                                                        if (event.type === 'timeout') return 'Pedido de Tempo';
                                                        if (event.type === 'game_won') return '🎾 Game Vencido';
                                                        if (event.type === 'set_won') return '🏆 Set Vencido';

                                                        const p = String(event.period || '').toLowerCase();
                                                        const isSet = p.includes('set');

                                                        if (event.type === 'period_start') {
                                                            if (p.includes('pênalt') || p.includes('penalt')) return 'Início dos Pênaltis';
                                                            if (p.includes('prorrog')) return 'Início da Prorrogação';
                                                            if (p.includes('quarto')) return `Início do ${event.period}`;

                                                            // Se tem número ordinal 1º, 2º...
                                                            if (p.match(/[1-9](º|o)/)) {
                                                                const num = p.match(/[1-9]/)?.[0] || '1';
                                                                return isSet ? `Início do ${num}º Set` : `Início do ${num}º Tempo`;
                                                            }
                                                            return event.period ? `Início de ${event.period}` : 'Novo Período';
                                                        }
                                                        if (event.type === 'period_end') {
                                                            if (p.includes('pênalt') || p.includes('penalt')) return 'Fim dos Pênaltis';
                                                            if (p.includes('prorrog')) return 'Fim da Prorrogação';
                                                            if (p.includes('quarto')) return `Fim do ${event.period}`;

                                                            if (p.includes('normal')) return 'Fim do Tempo Normal';
                                                            if (p.includes('intervalo')) return 'Fim do 1º Tempo';

                                                            if (p.match(/[1-9](º|o)/)) {
                                                                const num = p.match(/[1-9]/)?.[0] || '1';
                                                                return isSet ? `Fim do ${num}º Set` : `Fim do ${num}º Tempo`;
                                                            }
                                                            return event.period ? `Fim de ${event.period}` : 'Fim do Período';
                                                        }
                                                        return '';
                                                    };

                                                    const phrase = event.metadata?.label || getMatchPhrase(event.id ?? idx, event.type);

                                                    const pillColor = event.type === 'match_start'
                                                        ? 'bg-green-50 border-green-200'
                                                        : event.type === 'match_end'
                                                            ? 'bg-red-50 border-red-200'
                                                            : event.type === 'period_start'
                                                                ? 'bg-blue-50 border-blue-200'
                                                                : event.type === 'timeout'
                                                                    ? 'bg-yellow-50 border-yellow-200'
                                                                    : (event.type === 'game_won' || event.type === 'set_won')
                                                                        ? 'bg-indigo-50 border-indigo-200'
                                                                        : 'bg-orange-50 border-orange-200';

                                                    const titleColor = event.type === 'match_start'
                                                        ? 'text-green-700'
                                                        : event.type === 'match_end'
                                                            ? 'text-red-700'
                                                            : event.type === 'period_start'
                                                                ? 'text-blue-700'
                                                                : event.type === 'timeout'
                                                                    ? 'text-yellow-700'
                                                                    : (event.type === 'game_won' || event.type === 'set_won')
                                                                        ? 'text-indigo-700'
                                                                        : 'text-orange-700';

                                                    return (
                                                        <div key={idx} className="flex items-center justify-center my-5 relative z-10 w-full">
                                                            <div className={`flex flex-col items-center justify-center border rounded-full px-5 py-2 shadow-sm max-w-[90%] gap-0.5 ${pillColor}`}>
                                                                <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${titleColor}`}>
                                                                    {event.type === 'match_start' && '🏁 '}
                                                                    {event.type === 'match_end' && '🛑 '}
                                                                    {event.type === 'period_start' && '▶️ '}
                                                                    {event.type === 'period_end' && '⏸️ '}
                                                                    {event.type === 'timeout' && '⏱ '}
                                                                    {getSystemEventTitle()}
                                                                </span>
                                                                <span className="text-[10px] sm:text-xs text-gray-500 italic text-center leading-tight">
                                                                    {phrase}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                const isOwnGoal = (event.metadata?.own_goal === true || event.metadata?.is_own_goal === true);
                                                let isHome = event.team_id === match?.home_team_id;
                                                if (isOwnGoal) isHome = !isHome;

                                                const sport = match?.championship?.sport?.slug || 'futebol';
                                                const isVolei = sport.includes('volei') || sport.includes('vôlei');

                                                const teamName = isHome ? match?.home_team?.name : match?.away_team?.name;
                                                const teamInitial = teamName?.substring(0, 3)?.toUpperCase() || '?';
                                                const teamColor = isHome ? 'bg-blue-600' : 'bg-green-600';

                                                return (
                                                    // Desktop: bolha alterna lado. Mobile: tudo à esquerda com badge do time
                                                    <div key={idx} className={`flex items-center mb-5 ${isHome ? 'sm:flex-row-reverse' : ''}`}>
                                                        {/* Spacer desktop */}
                                                        <div className="hidden sm:block flex-1" />

                                                        {/* Minute circle (desktop center line) */}
                                                        <div className="flex flex-col items-center z-10 shrink-0 ml-4 lg:ml-0">
                                                            <div className="w-8 h-8 rounded-full bg-white border-2 border-indigo-100 flex items-center justify-center text-[10px] font-black text-gray-700 shadow-sm mb-0.5">
                                                                {event.minute ? (
                                                                    event.minute.toString().includes(':')
                                                                        ? event.minute.toString().split('.')[0] // Remove fractional seconds if present
                                                                        : (event.minute.toString() === 'Fim' ? event.minute : `${event.minute}'`)
                                                                ) : '--'}
                                                            </div>
                                                            <span className="text-[7px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-1 rounded border border-indigo-100/50">
                                                                {event.period?.replace('Quarto', 'Q') || '1T'}
                                                            </span>
                                                        </div>

                                                        {/* Event card */}
                                                        <div className={`flex-1 pl-3 sm:px-4 ${isHome ? 'sm:text-right sm:pl-0' : 'text-left'}`}>
                                                            <div className="inline-block bg-white p-2.5 rounded-lg shadow-sm border border-gray-100 min-w-[140px] max-w-full">
                                                                {/* Team badge — visible on mobile only, compact */}
                                                                <div className={`flex items-center gap-1.5 mb-1.5 sm:hidden ${isHome ? 'justify-start' : 'justify-start'}`}>
                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black text-white uppercase tracking-wider ${teamColor}`}>
                                                                        {teamInitial}
                                                                    </span>
                                                                    <span className="text-[9px] text-gray-400 truncate max-w-[120px]">{teamName}</span>
                                                                </div>

                                                                <div className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${isHome ? 'sm:justify-end' : ''}`}>
                                                                    <div className="shrink-0 flex items-center justify-center h-4 w-4">
                                                                        {event.type === 'goal' && '⚽'}
                                                                        {['point', '1_point', '2_points', '3_points', 'free_throw', 'field_goal_2', 'field_goal_3', 'game_won', 'ataque', 'bloqueio', 'saque', 'ace', 'erro', 'block'].includes(event.type) && (() => {
                                                                            if (isVolei) {
                                                                                const vt = event.metadata?.volley_type || event.type;
                                                                                if (vt === 'bloqueio' || vt === 'block') return '🛡️';
                                                                                if (vt === 'saque' || vt === 'ace') return '🚀';
                                                                                if (vt === 'erro') return '❌';
                                                                                return '🏐';
                                                                            }
                                                                            if (sport.includes('tenis') || sport.includes('tênis') || sport.includes('beach')) {
                                                                                const tt = event.metadata?.tennis_type || event.type;
                                                                                if (tt === 'ace') return '🚀';
                                                                                if (tt === 'double_fault' || tt === 'unforced_error') return '❌';
                                                                                return '🎾';
                                                                            }
                                                                            return '🏀';
                                                                        })()}
                                                                        {['takedown', 'jiu_jitsu_2', 'jiu_jitsu_3', 'jiu_jitsu_4'].includes(event.type) && '🥋'}
                                                                        {(event.type === 'yellow_card' || event.type === 'yellow') && (
                                                                            <div className="w-3 h-4 rounded-[2px] border border-yellow-600 shadow-sm" style={{ backgroundColor: '#facc15', minWidth: '12px', minHeight: '16px' }} />
                                                                        )}
                                                                        {(event.type === 'red_card' || event.type === 'red') && (
                                                                            <div className="w-3 h-4 rounded-[2px] border border-red-800 shadow-sm" style={{ backgroundColor: '#dc2626', minWidth: '12px', minHeight: '16px' }} />
                                                                        )}
                                                                        {event.type === 'blue_card' && (
                                                                            <div className="w-3 h-4 rounded-[2px] border border-blue-700 shadow-sm" style={{ backgroundColor: '#3b82f6', minWidth: '12px', minHeight: '16px' }} />
                                                                        )}
                                                                        {['foul', 'technical_foul', 'unsportsmanlike_foul', 'disqualifying_foul'].includes(event.type) && (
                                                                            <div className={event.type === 'foul' ? "text-orange-500" : "text-red-500"}><Triangle size={14} fill="currentColor" /></div>
                                                                        )}
                                                                        {event.type === 'substitution' && '🔄'}
                                                                        {event.type === 'assist' && '👟'}
                                                                        {event.type === 'suspension_2min' && '⏱'}
                                                                        {event.type === 'shootout_goal' && '⚽'}
                                                                        {event.type === 'shootout_miss' && '❌'}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-gray-800 leading-tight">
                                                                            {(() => {
                                                                                // Prefere label enviado pelo backend; fallback para mapa local
                                                                                if (event.label) {
                                                                                    const alreadyMarked = event.label.toLowerCase().includes('contra') || event.label.toLowerCase().includes('próprio');
                                                                                    if (isOwnGoal && !alreadyMarked) return event.label + ' (Contra)';
                                                                                    return event.label;
                                                                                }
                                                                                const friendlyMap: Record<string, string> = {
                                                                                    goal: isOwnGoal ? 'Gol Contra!' : 'Gol!',
                                                                                    yellow_card: 'Cartão Amarelo',
                                                                                    red_card: 'Cartão Vermelho',
                                                                                    blue_card: 'Cartão Azul',
                                                                                    foul: 'Falta',
                                                                                    technical_foul: 'Falta Técnica',
                                                                                    unsportsmanlike_foul: 'Falta Antidesportiva',
                                                                                    disqualifying_foul: 'Falta Desqualificante',
                                                                                    field_goal_3: 'Cesta de 3 Pts',
                                                                                    '3_points': 'Cesta de 3 Pts',
                                                                                    field_goal_2: 'Cesta de 2 Pts',
                                                                                    '2_points': 'Cesta de 2 Pts',
                                                                                    free_throw: 'Lance Livre',
                                                                                    '1_point': 'Lance Livre',
                                                                                    game_won: 'Game Vencido',
                                                                                    set_won: 'Set Vencido',
                                                                                    ace: 'Ace (Saque)',
                                                                                    double_fault: 'Dupla Falta',
                                                                                    unforced_error: 'Erro não forçado (Adv)',
                                                                                    forced_error: 'Erro forçado (Adv)',
                                                                                    winner: 'Winner',
                                                                                    service_winner: 'Saque Vencedor',
                                                                                    point: 'Ponto',
                                                                                    assist: 'Assistência',
                                                                                    mvp: 'Craque do Jogo',
                                                                                    timeout: 'Tempo Técnico',
                                                                                    substitution: 'Substituição',
                                                                                    suspension_2min: 'Suspensão 2min',
                                                                                    shootout_goal: 'Pênalti Convertido',
                                                                                    shootout_miss: 'Pênalti Perdido',
                                                                                    penalty_goal: 'Pênalti (Gol)',
                                                                                    ataque: 'Ataque',
                                                                                    bloqueio: 'Bloqueio',
                                                                                    block: 'Bloqueio',
                                                                                    saque: 'Ace (Saque)',
                                                                                    erro: 'Erro',
                                                                                    game: 'Game',
                                                                                    set: 'Set',
                                                                                };
                                                                                return friendlyMap[event.type] ?? event.type.replace(/_/g, ' ');
                                                                            })()}
                                                                            {event.player_name && <span className="text-gray-900 font-black"> - {event.player_name}</span>}
                                                                        </span>
                                                                        {/* Team name — desktop only */}
                                                                        <span className={`hidden sm:block text-[10px] text-indigo-600 font-medium mt-0.5`}>
                                                                            {teamName}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}

                                        {/* Match Start Indicator — hidden when events already include match_start */}
                                        {getSortedEvents().every((e: any) => e.type !== 'match_start') && (
                                            <div className="flex items-center justify-center my-4 relative z-10">
                                                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] sm:text-xs rounded-full border border-gray-200">
                                                    Início da Partida
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'mvp' && <MatchMvpTab match={match} />}

                            {activeTab === 'perna' && <MatchPernaTab match={match} />}

                            {activeTab === 'report' && <MatchReportTab match={match} />}

                            {activeTab === 'art' && <MatchArtTab match={match} />}

                            {activeTab === 'faceoff' && <MatchFaceoffTab match={match} />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
