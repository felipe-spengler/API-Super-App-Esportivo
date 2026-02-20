import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Clock, Users, X, Flag, Timer, UserX, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { getMatchPhrase } from '../../utils/matchPhrases';

export function SumulaHandebol() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });
    const [serverTimerLoaded, setServerTimerLoaded] = useState(false);

    // Timer & Period State (30min cada tempo)
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [currentPeriod, setCurrentPeriod] = useState<string>('1º Tempo');

    // Stats State
    const [suspensions, setSuspensions] = useState({ home: 0, away: 0 }); // 2min suspensions
    const [events, setEvents] = useState<any[]>([]);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

    // Modal State
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
    const [eventType, setEventType] = useState<'goal' | 'yellow_card' | 'suspension_2min' | 'red_card' | 'assist' | 'mvp' | null>(null);

    // Refs for stable sync
    const timerRef = useRef({ time, isRunning, currentPeriod, matchData });
    useEffect(() => {
        timerRef.current = { time, isRunning, currentPeriod, matchData };
    }, [time, isRunning, currentPeriod, matchData]);

    const fetchMatchDetails = async (isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            const response = await api.get(`/admin/matches/${id}/full-details`);
            const data = response.data;
            if (data.match) {
                // 🔒 ONLY update matchData on initial load to prevent race conditions
                if (isInitial) {
                    setMatchData({
                        ...data.match,
                        scoreHome: parseInt(data.match.home_score || 0),
                        scoreAway: parseInt(data.match.away_score || 0)
                    });

                    // Sync timer ONLY on initial load
                    if (data.match.match_details?.sync_timer && !serverTimerLoaded) {
                        const st = data.match.match_details.sync_timer;
                        setTime(st.time || 0);
                        if (st.currentPeriod) setCurrentPeriod(st.currentPeriod);
                        setServerTimerLoaded(true);
                    }

                    if (data.rosters) setRosters(data.rosters);
                } else {
                    // 🔄 On periodic sync, we usually ignore timer/matchData to avoid overwriting local timer state.
                    // BUT, if the PERIOD changed on the server (by another device), we MUST accept it.
                    const serverTimer = data.match.match_details?.sync_timer;
                    if (serverTimer && serverTimer.currentPeriod && serverTimer.currentPeriod !== currentPeriod) {
                        console.log(`🔄 Syncing period from server: ${currentPeriod} -> ${serverTimer.currentPeriod}`);
                        setCurrentPeriod(serverTimer.currentPeriod);
                        if (serverTimer.time !== undefined) setTime(serverTimer.time);
                        if (serverTimer.isRunning !== undefined) setIsRunning(serverTimer.isRunning);
                        // Also update matchData status if passed
                        if (data.match.status) {
                            setMatchData((prev: any) => ({ ...prev, status: data.match.status }));
                        }
                    }

                    if (data.rosters) setRosters(data.rosters);
                }

                const history = (data.details?.events || []).map((e: any) => ({
                    id: e.id,
                    type: e.type,
                    team: parseInt(e.team_id) === data.match.home_team_id ? 'home' : 'away',
                    time: e.minute,
                    period: e.period,
                    player_name: e.player_name
                }));
                setEvents(history);
            }
        } catch (e) {
            console.error(e);
            if (isInitial) alert('Erro ao carregar jogo.');
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    // --- PERSISTENCE LOGIC ---
    const STORAGE_KEY = `match_state_handebol_${id}`;

    // 1. Load State on Mount
    useEffect(() => {
        if (!id) return;

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setTime(parsed.time || 0);
                setIsRunning(parsed.isRunning || false);
                setCurrentPeriod(parsed.currentPeriod || '1º Tempo');
                if (parsed.suspensions) setSuspensions(parsed.suspensions);
            } catch (e) {
                console.error("Failed to parse saved state", e);
            }
        }

        fetchMatchDetails(true);

        const syncInterval = setInterval(() => {
            fetchMatchDetails();
        }, 3000);

        return () => clearInterval(syncInterval);
    }, [id]);

    // 2. Save State on Change
    useEffect(() => {
        if (!id || loading) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            time,
            isRunning,
            currentPeriod,
            suspensions
        }));
    }, [time, isRunning, currentPeriod, suspensions, id, loading]);

    useEffect(() => {
        let interval: any = null;
        if (isRunning) {
            console.log(`🎬 TIMER HANDEBOL INICIADO`);
            interval = setInterval(() => {
                setTime(t => {
                    const newTime = t + 1;
                    console.log(`⏰ TICK HANDEBOL: ${formatTime(newTime)}`);
                    return newTime;
                });
            }, 1000);

            if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
                registerSystemEvent('match_start', 'Início da Partida');
            }
        } else {
            console.log(`⏸️ TIMER HANDEBOL PAUSADO`);
        }
        return () => {
            if (interval) {
                console.log(`🛑 TIMER HANDEBOL PARADO`);
                clearInterval(interval);
            }
        };
    }, [isRunning]);

    // PING - Sync local state TO server (Every 3 seconds)
    useEffect(() => {
        if (!id) return;

        const pingInterval = setInterval(async () => {
            const { time: t, isRunning: ir, currentPeriod: cp, matchData: md } = timerRef.current;
            if (!md) return;

            try {
                setSyncStatus('syncing');

                // 🔍 DEBUG LOG - O que está sendo enviado para o servidor
                console.group(`📤 ENVIANDO TIMER HANDEBOL PARA SERVIDOR - ${new Date().toLocaleTimeString()}`);
                console.log(`⏰ Timer Local:`, `${formatTime(t)} (${t}s)`);
                console.log(`▶️ Estado:`, ir ? '🟢 RODANDO' : '🔴 PARADO');
                console.log(`📍 Período:`, cp);
                console.log(`🕐 Timestamp Envio:`, new Date().toLocaleTimeString());

                await api.patch(`/admin/matches/${id}`, {
                    match_details: {
                        ...md.match_details,
                        sync_timer: {
                            time: t,
                            isRunning: ir,
                            currentPeriod: cp
                        }
                    }
                });

                setSyncStatus('synced');
                console.log(`✅ SYNC HANDEBOL COMPLETO`);
                console.groupEnd();
            } catch (e) {
                setSyncStatus('error');
                console.error(`❌ ERRO NO SYNC HANDEBOL:`, e);
                console.groupEnd();
            }
        }, 3000);

        return () => clearInterval(pingInterval);
    }, [id]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePeriodChange = () => {
        // Fix for "Start Game" button triggering "End 1st Half"
        if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado') && time === 0 && !isRunning) {
            if (!window.confirm("Iniciar Partida?")) return;
            setIsRunning(true);
            setMatchData((prev: any) => ({ ...prev, status: 'live' }));
            registerSystemEvent('match_start', 'Início de partida. Que vença o melhor!');
            return;
        }

        const oldPeriod = currentPeriod;
        let newPeriod = '';

        if (currentPeriod === '1º Tempo') {
            if (!window.confirm("Encerrar 1º Tempo?")) return;
            setIsRunning(false);
            newPeriod = 'Intervalo';
            registerSystemEvent('period_end', 'Fim do 1º Tempo. Intervalo!');
        } else if (currentPeriod === 'Intervalo') {
            newPeriod = '2º Tempo';
            setIsRunning(true);
            registerSystemEvent('period_start', 'Começa o 2º Tempo! Vamos pro jogo!');
        } else if (currentPeriod === '2º Tempo') {
            if (!window.confirm("Encerrar Tempo Normal?")) return;
            setIsRunning(false);
            registerSystemEvent('period_end', 'Fim do Tempo Normal. A batalha continua?');

            const choice = window.confirm("Tempo Normal encerrado! Deseja prosseguir para Prorrogação?\n\n'OK' para escolher Prorrogação.\n'Cancelar' para ENCERRAR a súmula agora (ex: Fase de Grupos).");

            if (choice) {
                if (window.confirm("Deseja iniciar a PRORROGAÇÃO?")) {
                    newPeriod = 'Prorrogação';
                    setIsRunning(true);
                    registerSystemEvent('period_start', 'Início da Prorrogação. Decisão!');
                } else {
                    newPeriod = 'Fim de Tempo Normal';
                }
            } else {
                handleFinish();
                return;
            }
        } else if (currentPeriod === 'Fim de Tempo Normal') {
            if (window.confirm("Iniciar Prorrogação?")) {
                newPeriod = 'Prorrogação';
                setIsRunning(true);
                registerSystemEvent('period_start', 'Início da Prorrogação. Decisão!');
            } else {
                handleFinish();
                return;
            }
        } else if (currentPeriod === 'Prorrogação') {
            if (!window.confirm("Encerrar Prorrogação?")) return;
            newPeriod = 'Fim de Jogo';
            setIsRunning(false);
            registerSystemEvent('period_end', 'Fim da Prorrogação.');
            handleFinish();
            return;
        }

        if (newPeriod) setCurrentPeriod(newPeriod);
    };

    const registerSystemEvent = async (type: string, label: string) => {
        if (!matchData) return;
        const currentTime = formatTime(time);

        try {
            const response = await api.post(`/admin/matches/${id}/events`, {
                event_type: type,
                team_id: matchData.home_team_id || matchData.away_team_id,
                minute: currentTime,
                period: currentPeriod,
                metadata: { label }
            });

            setEvents(prev => [{
                id: response.data.id,
                type: type,
                team: 'home',
                time: currentTime,
                period: currentPeriod,
                player_name: label
            }, ...prev]);

            // If we successfully started the match, update status locally
            if (type === 'match_start') {
                setMatchData((prev: any) => ({ ...prev, status: 'live' }));
            }
        } catch (e) {
            console.error("Erro ao registrar evento de sistema", e);
            if (type === 'match_start') {
                setIsRunning(false); // Stop timer if we couldn't start match!
                alert("Erro de conexão ao iniciar partida. O cronômetro foi pausado. Tente novamente.");
            }
        }
    };

    const openEventModal = (team: 'home' | 'away', type: 'goal' | 'yellow_card' | 'suspension_2min' | 'red_card' | 'assist' | 'mvp') => {
        if (!isRunning) {
            alert('Atenção: Inicie o cronômetro para poder lançar eventos!');
            return;
        }
        setSelectedTeam(team);
        setEventType(type);
        setShowEventModal(true);
    };

    const registerTimeout = async (team: 'home' | 'away') => {
        if (!isRunning) {
            alert('Atenção: Inicie o cronômetro para poder lançar eventos!');
            return;
        }
        if (!matchData) return;
        const teamId = team === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);

        const newEvent = {
            id: Date.now(),
            type: 'timeout',
            team: team,
            time: currentTime,
            period: currentPeriod,
            player_name: 'Pedido de Tempo'
        };
        setEvents(prev => [newEvent, ...prev]);
        setIsRunning(false);

        try {
            await api.post(`/admin/matches/${id}/events`, {
                event_type: 'timeout',
                team_id: teamId,
                minute: currentTime,
                period: currentPeriod
            });
        } catch (e) {
            console.error(e);
        }
    };

    const confirmEvent = async (player: any) => {
        if (!matchData || !selectedTeam || !eventType) return;
        const teamId = selectedTeam === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);

        try {
            const response = await api.post(`/admin/matches/${id}/events`, {
                event_type: eventType,
                team_id: teamId,
                minute: currentTime,
                period: currentPeriod,
                player_id: player.id
            });

            const newEvent = {
                id: response.data.id,
                type: eventType,
                team: selectedTeam,
                time: currentTime,
                period: currentPeriod,
                player_name: player.name
            };
            setEvents(prev => [newEvent, ...prev]);

            if (eventType === 'goal') {
                setMatchData((prev: any) => ({
                    ...prev,
                    scoreHome: selectedTeam === 'home' ? prev.scoreHome + 1 : prev.scoreHome,
                    scoreAway: selectedTeam === 'away' ? prev.scoreAway + 1 : prev.scoreAway
                }));
            }

            if (eventType === 'suspension_2min') {
                setSuspensions(prev => ({ ...prev, [selectedTeam]: prev[selectedTeam] + 1 }));
                alert(`⚠️ ${player.name} suspenso por 2 minutos!`);
            }
            setShowEventModal(false);
        } catch (e) {
            console.error(e);
            alert('Erro ao registrar evento');
        }
    };

    const handleDeleteEvent = async (eventId: number, type: string, team: 'home' | 'away') => {
        if (!window.confirm('Excluir este evento?')) return;

        try {
            await api.delete(`/admin/matches/${id}/events/${eventId}`);
            setEvents(prev => prev.filter(e => e.id !== eventId));

            if (type === 'goal') {
                setMatchData((prev: any) => ({
                    ...prev,
                    scoreHome: team === 'home' ? prev.scoreHome - 1 : prev.scoreHome,
                    scoreAway: team === 'away' ? prev.scoreAway - 1 : prev.scoreAway
                }));
            }

            if (type === 'suspension_2min') {
                setSuspensions(prev => ({ ...prev, [team]: Math.max(0, prev[team] - 1) }));
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir evento');
        }
    };

    const handleFinish = async () => {
        if (!window.confirm('Encerrar partida completamente?')) return;
        try {
            await registerSystemEvent('match_end', 'Partida Finalizada');

            await api.post(`/admin/matches/${id}/finish`, {
                home_score: matchData.scoreHome,
                away_score: matchData.scoreAway
            });

            localStorage.removeItem(STORAGE_KEY);
            navigate(-1);
        } catch (e) {
            console.error(e);
        }
    };

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-black text-white font-sans pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 pb-2 pt-4 sticky top-0 z-10 border-b border-purple-700 shadow-2xl">
                <div className="px-4 flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-black/30 rounded-full backdrop-blur">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold tracking-widest text-purple-200">SÚMULA DIGITAL - HANDEBOL</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            {matchData.details?.arbitration?.referee && <span className="text-[10px] text-purple-300">{matchData.details.arbitration.referee}</span>}
                            {syncStatus === 'syncing' && <span className="flex h-2 w-2 rounded-full bg-yellow-400 animate-pulse" title="Sincronizando..."></span>}
                            {syncStatus === 'error' && <span className="flex h-2 w-2 rounded-full bg-red-500" title="Erro de conexão"></span>}
                            {syncStatus === 'synced' && <span className="flex h-2 w-2 rounded-full bg-green-400" title="Sincronizado"></span>}
                        </div>
                    </div>
                    <button onClick={handlePeriodChange} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${currentPeriod === 'Intervalo' || currentPeriod === 'Fim de Tempo Normal' ? 'bg-orange-500 text-white' :
                        currentPeriod === 'Fim de Jogo' ? 'bg-red-600 text-white' :
                            'bg-indigo-600 text-white'
                        }`}>
                        {matchData.status === 'scheduled' || matchData.status === 'Agendado' ? 'Iniciar Jogo' :
                            currentPeriod === '1º Tempo' ? 'Fim 1º T' :
                                currentPeriod === 'Intervalo' ? 'Iniciar 2º T' :
                                    currentPeriod === '2º Tempo' ? 'Encerrar Normal' :
                                        currentPeriod === 'Fim de Tempo Normal' ? 'Próxima Fase' :
                                            currentPeriod === 'Prorrogação' ? 'Fim Prorrogação' :
                                                currentPeriod === 'Pênaltis' ? 'Encerrar Pênaltis' :
                                                    'Finalizado'}
                    </button>
                </div>

                {/* Scoreboard */}
                <div className="flex items-center justify-center gap-2 px-2">
                    {/* Home */}
                    <div className="text-center flex-1">
                        <div className="text-5xl sm:text-7xl font-black font-mono leading-none mb-1 text-purple-100">{matchData.scoreHome}</div>
                        <h2 className="font-bold text-xs sm:text-sm text-purple-200 truncate max-w-[100px] mx-auto">{matchData.home_team?.name}</h2>
                        {suspensions.home > 0 && (
                            <div className="mt-1 flex justify-center gap-1">
                                {[...Array(suspensions.home)].map((_, i) => (
                                    <div key={i} className="w-3 h-3 rounded bg-yellow-500 border border-black animate-pulse"></div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Center / Timer */}
                    <div className="flex flex-col items-center w-28 bg-black/50 backdrop-blur rounded-xl py-2 border border-purple-500/50">
                        <div onClick={() => setIsRunning(!isRunning)} className="cursor-pointer mb-1">
                            {isRunning
                                ? <Pause className="w-5 h-5 text-green-400 fill-current animate-pulse" />
                                : <Play className="w-5 h-5 text-gray-500 fill-current" />
                            }
                        </div>
                        <div className="text-3xl font-mono font-bold text-yellow-400 tracking-wider mb-1">{formatTime(time)}</div>
                        <div className="text-[9px] text-purple-300 uppercase font-bold px-2 py-0.5 bg-purple-900/50 rounded">{currentPeriod}</div>
                    </div>

                    {/* Away */}
                    <div className="text-center flex-1">
                        <div className="text-5xl sm:text-7xl font-black font-mono leading-none mb-1 text-purple-100">{matchData.scoreAway}</div>
                        <h2 className="font-bold text-xs sm:text-sm text-purple-200 truncate max-w-[100px] mx-auto">{matchData.away_team?.name}</h2>
                        {suspensions.away > 0 && (
                            <div className="mt-1 flex justify-center gap-1">
                                {[...Array(suspensions.away)].map((_, i) => (
                                    <div key={i} className="w-3 h-3 rounded bg-yellow-500 border border-black animate-pulse"></div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions Grid */}
            <div className="p-2 sm:p-4 grid grid-cols-2 gap-2 sm:gap-4 max-w-4xl mx-auto">
                {/* Home Controls */}
                <div className="bg-blue-900/10 p-3 rounded-xl border border-blue-900/30 space-y-2">
                    <button
                        onClick={() => openEventModal('home', 'goal')}
                        disabled={!isRunning}
                        className="w-full py-4 bg-blue-600 rounded-lg font-black text-xl border-b-4 border-blue-800 active:scale-95 transition-all text-shadow disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                    >
                        GOL
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('home', 'yellow_card')}
                            disabled={!isRunning}
                            className="py-3 bg-yellow-500 text-black rounded-lg font-bold border-b-4 border-yellow-700 active:scale-95 text-xs sm:text-sm disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            🟨 Cartão
                        </button>
                        <button
                            onClick={() => openEventModal('home', 'red_card')}
                            disabled={!isRunning}
                            className="py-3 bg-red-600 rounded-lg font-bold border-b-4 border-red-800 active:scale-95 text-xs sm:text-sm disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            🟥 Cartão
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('home', 'suspension_2min')}
                            disabled={!isRunning}
                            className="py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-orange-800 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            <UserX size={14} /> 2min
                        </button>
                        <button
                            onClick={() => registerTimeout('home')}
                            disabled={!isRunning}
                            className="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-gray-900 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            <Timer size={14} /> Tempo
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('home', 'assist')}
                            disabled={!isRunning}
                            className="py-2 bg-indigo-500 rounded-lg font-bold border-b-4 border-indigo-700 active:scale-95 text-xs disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            👟 Assist.
                        </button>
                        <button
                            onClick={() => openEventModal('home', 'mvp')}
                            disabled={!isRunning}
                            className="py-2 bg-amber-500 text-black rounded-lg font-bold border-b-4 border-amber-700 active:scale-95 text-xs disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            ⭐ Craque
                        </button>
                    </div>
                </div>

                {/* Away Controls */}
                <div className="bg-red-900/10 p-3 rounded-xl border border-red-900/30 space-y-2">
                    <button
                        onClick={() => openEventModal('away', 'goal')}
                        disabled={!isRunning}
                        className="w-full py-4 bg-green-600 rounded-lg font-black text-xl border-b-4 border-green-800 active:scale-95 transition-all text-shadow disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                    >
                        GOL
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('away', 'yellow_card')}
                            disabled={!isRunning}
                            className="py-3 bg-yellow-500 text-black rounded-lg font-bold border-b-4 border-yellow-700 active:scale-95 text-xs sm:text-sm disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            🟨 Cartão
                        </button>
                        <button
                            onClick={() => openEventModal('away', 'red_card')}
                            disabled={!isRunning}
                            className="py-3 bg-red-600 rounded-lg font-bold border-b-4 border-red-800 active:scale-95 text-xs sm:text-sm disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            🟥 Cartão
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('away', 'suspension_2min')}
                            disabled={!isRunning}
                            className="py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-orange-800 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            <UserX size={14} /> 2min
                        </button>
                        <button
                            onClick={() => registerTimeout('away')}
                            disabled={!isRunning}
                            className="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-gray-900 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            <Timer size={14} /> Tempo
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('away', 'assist')}
                            disabled={!isRunning}
                            className="py-2 bg-indigo-500 rounded-lg font-bold border-b-4 border-indigo-700 active:scale-95 text-xs disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            👟 Assist.
                        </button>
                        <button
                            onClick={() => openEventModal('away', 'mvp')}
                            disabled={!isRunning}
                            className="py-2 bg-amber-500 text-black rounded-lg font-bold border-b-4 border-amber-700 active:scale-95 text-xs disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            ⭐ Craque
                        </button>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="px-4 mt-2 max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-purple-400 uppercase flex items-center gap-2">
                        <Clock size={14} /> Linha do Tempo
                    </h3>
                    <button onClick={handleFinish} className="text-xs text-red-500 underline font-bold">Encerrar Súmula</button>
                </div>

                <div className="space-y-2 pb-20">
                    {events.map((ev, idx) => {
                        const isSystemEvent = ['match_start', 'match_end', 'period_start', 'period_end'].includes(ev.type);

                        // Helper: friendly title based on event type + period
                        const getSystemEventTitle = () => {
                            if (ev.type === 'match_start') return 'Início da Partida';
                            if (ev.type === 'match_end') return 'Fim de Jogo';
                            if (ev.type === 'period_start') {
                                if (ev.period === '2º Tempo') return 'Início do 2º Tempo';
                                if (ev.period === 'Prorrogação') return 'Início da Prorrogação';
                                return `Início do ${ev.period}`;
                            }
                            if (ev.type === 'period_end') {
                                if (ev.period === '1º Tempo') return 'Fim do 1º Tempo';
                                if (ev.period === '2º Tempo') return 'Fim do Tempo Normal';
                                if (ev.period === 'Prorrogação') return 'Fim da Prorrogação';
                                return `Fim do ${ev.period}`;
                            }
                            return ev.type;
                        };

                        const periodLabel = ev.period === 'Prorrogação' ? 'Prorrog.' : ev.period;

                        if (isSystemEvent) {
                            const phrase = getMatchPhrase(ev.id, idx);
                            return (
                                <div key={idx} className="flex flex-col items-center justify-center my-4 relative z-0">
                                    <div className={`backdrop-blur border rounded-full px-6 py-2 shadow-xl flex flex-col items-center gap-0.5
                                        ${ev.type === 'match_start' ? 'bg-green-900/50 border-green-600/60' :
                                            ev.type === 'match_end' ? 'bg-red-900/50 border-red-600/60' :
                                                ev.type === 'period_start' ? 'bg-blue-900/50 border-blue-600/60' :
                                                    'bg-orange-900/40 border-orange-600/50'}`}>
                                        <span className={`text-[11px] sm:text-xs font-black uppercase tracking-widest
                                            ${ev.type === 'match_start' ? 'text-green-300' :
                                                ev.type === 'match_end' ? 'text-red-400' :
                                                    ev.type === 'period_start' ? 'text-blue-300' :
                                                        'text-orange-300'}`}>
                                            {ev.type === 'match_start' && '🏁 '}
                                            {ev.type === 'match_end' && '🛑 '}
                                            {ev.type === 'period_start' && '▶️ '}
                                            {ev.type === 'period_end' && '⏸️ '}
                                            {getSystemEventTitle()}
                                        </span>
                                        <span className="text-[10px] text-gray-400 italic text-center leading-tight">
                                            {phrase}
                                        </span>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={idx} className="bg-gray-800 p-2 sm:p-3 rounded-lg border border-gray-700 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`font-mono text-sm font-bold ${ev.team === 'home' ? 'text-blue-400' : 'text-green-400'} min-w-[30px]`}>
                                        {ev.time}'
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm flex items-center gap-2">
                                            {ev.type === 'goal' && '⚽ GOL'}
                                            {ev.type === 'yellow_card' && '🟨 Amarelo'}
                                            {ev.type === 'red_card' && '🟥 Vermelho'}
                                            {ev.type === 'suspension_2min' && '⏱ Suspensão 2min'}
                                            {ev.type === 'assist' && '👟 Assistência'}
                                            {ev.type === 'mvp' && '⭐ Craque'}
                                            {ev.type === 'timeout' && '⏱ Pedido de Tempo'}
                                        </span>
                                        {ev.player_name && (
                                            <span className="text-xs text-gray-400">{ev.player_name}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] uppercase font-bold tracking-wider text-gray-600">{periodLabel}</span>
                                    <button onClick={() => handleDeleteEvent(ev.id, ev.type, ev.team)} className="p-1 px-2 hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {events.length === 0 && <div className="text-center text-gray-600 py-8 text-sm">Nenhum evento registrado ainda.</div>}
                </div>
            </div>

            {/* Player Modal */}
            {
                showEventModal && selectedTeam && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-gray-800 w-full max-w-md sm:rounded-xl rounded-t-3xl border-t border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-purple-700 flex items-center justify-between sticky top-0 z-10">
                                <div>
                                    <h3 className="font-bold text-lg text-white">Selecione o Jogador</h3>
                                    <p className="text-xs text-purple-200 uppercase">
                                        {selectedTeam === 'home' ? matchData.home_team?.name : matchData.away_team?.name}
                                    </p>
                                </div>
                                <button onClick={() => setShowEventModal(false)} className="p-2 bg-black/30 rounded-full hover:bg-black/50">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-2 space-y-1 flex-1">
                                {(selectedTeam === 'home' ? rosters.home : rosters.away).length === 0 ? (
                                    <p className="p-8 text-center text-gray-500">Nenhum jogador cadastrado.</p>
                                ) : (
                                    (selectedTeam === 'home' ? rosters.home : rosters.away).map((player: any) => (
                                        <button
                                            key={player.id}
                                            onClick={() => confirmEvent(player)}
                                            className="w-full flex items-center justify-between p-3 hover:bg-gray-700 rounded-xl transition-colors group mb-1 border border-transparent hover:border-purple-500"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-sm text-white group-hover:bg-purple-500 transition-colors">
                                                    {player.number || '#'}
                                                </div>
                                                <span className="font-medium text-left text-sm">{player.name}</span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
