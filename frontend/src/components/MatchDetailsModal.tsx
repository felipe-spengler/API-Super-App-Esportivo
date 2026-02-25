
import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Trophy, User, Share2, FileText, ChevronRight, Star, History, Printer, Timer, Triangle } from 'lucide-react';
import api from '../services/api';
import echo from '../services/echo';
import { getMatchPhrase } from '../utils/matchPhrases';

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
        const matchStatus = match?.status || details?.status;
        const isMatchFinished = matchStatus === 'finished';

        if (timerData) {
            const st = timerData;
            const baseTime = st.time ?? 0;
            const diff = localTime !== null ? Math.abs(localTime - baseTime) : 0;

            // Se o jogo está encerrado, o timer nunca deve rodar
            const serverIsRunning = isMatchFinished ? false : (st.isRunning ?? false);

            // Sync Logic: ONLY update if timer state changed or difference is significant
            const shouldSync = localTime === null || isTimerRunning !== serverIsRunning || diff > 5;

            if (shouldSync) {
                setLocalTime(baseTime);
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

        // 1. Sort events by time (descending)
        const sorted = [...details.events].sort((a, b) => {
            const timeA = parseInt(String(a.minute).replace(/\D/g, '')) || 0;
            const timeB = parseInt(String(b.minute).replace(/\D/g, '')) || 0;
            if (timeA !== timeB) return timeB - timeA;
            // secondary sort by ID if available to keep order consistent
            return (b.id || 0) - (a.id || 0);
        });

        // 2. Filter duplicate system events and HIDDEN events
        const seenSystemEvents = new Set<string>();
        const hiddenEvents = ['voice_debug', 'timer_control', 'roster_snapshot'];

        return sorted.filter(event => {
            if (hiddenEvents.includes(event.type)) return false;

            const isUniqSystemEvent = ['match_start', 'match_end', 'period_start', 'period_end'].includes(event.type);
            if (!isUniqSystemEvent) return true;

            const periodKey = event.period || event.metadata?.system_period || event.metadata?.label || 'no-period';
            const key = `${event.type}-${periodKey}`;

            if (seenSystemEvents.has(key)) return false;
            seenSystemEvents.add(key);
            return true;
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
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-2 sm:gap-4">
                                        <span className="text-3xl sm:text-5xl font-black text-white tabular-nums">{match?.home_score ?? 0}</span>
                                        <span className="text-white/40 text-xl sm:text-2xl font-light">x</span>
                                        <span className="text-3xl sm:text-5xl font-black text-white tabular-nums">{match?.away_score ?? 0}</span>
                                    </div>

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
                                                const isSystemEvent = ['match_start', 'match_end', 'period_start', 'period_end', 'timeout'].includes(event.type);

                                                if (isSystemEvent) {
                                                    // Mesmo helper defensivo das súmulas
                                                    const getSystemEventTitle = () => {
                                                        if (event.type === 'match_start') return 'Início da Partida';
                                                        if (event.type === 'match_end') return 'Fim de Jogo';
                                                        if (event.type === 'timeout') return 'Pedido de Tempo';
                                                        const p = String(event.period || '').toLowerCase();
                                                        if (event.type === 'period_start') {
                                                            if (p.includes('pênalt') || p.includes('penalt')) return 'Início dos Pênaltis';
                                                            if (p.includes('prorrog')) return 'Início da Prorrogação';
                                                            if (p.includes('2º') || p.includes('2o')) return 'Início do 2º Tempo';
                                                            if (p.includes('1º') || p.includes('1o')) return 'Início do 1º Tempo';
                                                            if (p.includes('quarto')) return `Início do ${event.period}`;
                                                            return event.period ? `Início de ${event.period}` : 'Novo Período';
                                                        }
                                                        if (event.type === 'period_end') {
                                                            if (p.includes('pênalt') || p.includes('penalt')) return 'Fim dos Pênaltis';
                                                            if (p.includes('prorrog')) return 'Fim da Prorrogação';
                                                            if (p.includes('2º') || p.includes('2o') || p.includes('normal')) return 'Fim do Tempo Normal';
                                                            if (p.includes('1º') || p.includes('1o') || p.includes('intervalo')) return 'Fim do 1º Tempo';
                                                            if (p.includes('quarto')) return `Fim do ${event.period}`;
                                                            return event.period ? `Fim de ${event.period}` : 'Fim do Período';
                                                        }
                                                        return '';
                                                    };

                                                    const phrase = getMatchPhrase(event.id ?? idx, event.type);

                                                    const pillColor = event.type === 'match_start'
                                                        ? 'bg-green-50 border-green-200'
                                                        : event.type === 'match_end'
                                                            ? 'bg-red-50 border-red-200'
                                                            : event.type === 'period_start'
                                                                ? 'bg-blue-50 border-blue-200'
                                                                : event.type === 'timeout'
                                                                    ? 'bg-yellow-50 border-yellow-200'
                                                                    : 'bg-orange-50 border-orange-200';

                                                    const titleColor = event.type === 'match_start'
                                                        ? 'text-green-700'
                                                        : event.type === 'match_end'
                                                            ? 'text-red-700'
                                                            : event.type === 'period_start'
                                                                ? 'text-blue-700'
                                                                : event.type === 'timeout'
                                                                    ? 'text-yellow-700'
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
                                                                {event.minute}'
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
                                                                        {['point', '1_point', '2_points', '3_points', 'free_throw', 'field_goal_2', 'field_goal_3', 'game_won'].includes(event.type) && '🏀'}
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
                                                                                    saque: 'Ace (Saque)',
                                                                                    erro: 'Erro',
                                                                                    game: 'Game',
                                                                                    set: 'Set',
                                                                                    point: 'Ponto',
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
