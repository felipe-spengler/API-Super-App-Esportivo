import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Save, Clock, Users, X, Flag, Timer, Trash2 } from 'lucide-react';
import api from '../../services/api';

export function SumulaFutsal() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });
    const [serverTimerLoaded, setServerTimerLoaded] = useState(false);

    // Timer & Period State
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [currentPeriod, setCurrentPeriod] = useState<string>('1º Tempo');
    // Periods: '1º Tempo', 'Intervalo', '2º Tempo', 'Fim'

    // Stats State (Optimistic)
    const [fouls, setFouls] = useState({ home: 0, away: 0 });
    const [penaltyScore, setPenaltyScore] = useState({ home: 0, away: 0 });
    const [events, setEvents] = useState<any[]>([]);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

    // Modal State
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
    const [eventType, setEventType] = useState<'goal' | 'yellow_card' | 'red_card' | 'blue_card' | 'assist' | 'foul' | 'mvp' | null>(null);
    const [showShootoutOptions, setShowShootoutOptions] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const [isSelectingOwnGoal, setIsSelectingOwnGoal] = useState(false);

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
                    // 🔄 On periodic sync, ONLY update rosters and events, NOT matchData
                    if (data.rosters) setRosters(data.rosters);
                }

                // Process History & Stats
                const history = (data.details?.events || []).map((e: any) => ({
                    id: e.id,
                    type: e.type,
                    team: parseInt(e.team_id) === data.match.home_team_id ? 'home' : 'away',
                    time: e.minute,
                    period: e.period,
                    player_name: e.player_name
                }));
                setEvents(history);

                const homeFouls = history.filter((e: any) => e.team === 'home' && e.type === 'foul').length;
                const awayFouls = history.filter((e: any) => e.team === 'away' && e.type === 'foul').length;
                setFouls({ home: homeFouls, away: awayFouls });

                const homePenalties = history.filter((e: any) => e.team === 'home' && (e.type === 'shootout_goal' || e.type === 'penalty_goal')).length;
                const awayPenalties = history.filter((e: any) => e.team === 'away' && (e.type === 'shootout_goal' || e.type === 'penalty_goal')).length;
                setPenaltyScore({ home: homePenalties, away: awayPenalties });
            }
        } catch (e) {
            console.error(e);
            if (isInitial) alert('Erro ao carregar jogo.');
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    // --- PERSISTENCE LOGIC START ---
    const STORAGE_KEY = `match_state_futsal_${id}`;

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
                if (parsed.fouls) setFouls(parsed.fouls);
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
            fouls
        }));
    }, [time, isRunning, currentPeriod, fouls, id, loading]);

    useEffect(() => {
        let interval: any = null;
        if (isRunning) {
            console.log(`🎬 TIMER FUTSAL INICIADO`);
            interval = setInterval(() => {
                setTime(t => {
                    const newTime = t + 1;
                    console.log(`⏰ TICK FUTSAL: ${formatTime(newTime)}`);
                    return newTime;
                });
            }, 1000);

            if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
                registerSystemEvent('match_start', 'Início da Partida');
            }
        } else {
            console.log(`⏸️ TIMER FUTSAL PAUSADO`);
        }
        return () => {
            if (interval) {
                console.log(`🛑 TIMER FUTSAL PARADO`);
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
                console.group(`📤 ENVIANDO TIMER FUTSAL PARA SERVIDOR - ${new Date().toLocaleTimeString()}`);
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
                console.log(`✅ SYNC FUTSAL COMPLETO`);
                console.groupEnd();
            } catch (e) {
                setSyncStatus('error');
                console.error(`❌ ERRO NO SYNC FUTSAL:`, e);
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
        const oldPeriod = currentPeriod;
        let newPeriod = '';

        if (currentPeriod === '1º Tempo') {
            if (!window.confirm("Encerrar 1º Tempo?")) return;
            setIsRunning(false);
            newPeriod = 'Intervalo';
            registerSystemEvent('period_end', `Fim do ${oldPeriod}`);
        } else if (currentPeriod === 'Intervalo') {
            newPeriod = '2º Tempo';
            setIsRunning(true);
            registerSystemEvent('period_start', `Início do ${newPeriod}`);
        } else if (currentPeriod === '2º Tempo') {
            if (!window.confirm("Encerrar Tempo Normal?")) return;
            setIsRunning(false);
            registerSystemEvent('period_end', `Fim do ${oldPeriod}`);

            const choice = window.confirm("Tempo Normal encerrado! Deseja prosseguir para Prorrogação/Pênaltis?\n\n'OK' para escolher Prorrogação ou Pênaltis.\n'Cancelar' para ENCERRAR a súmula agora (ex: Fase de Grupos).");

            if (choice) {
                if (window.confirm("Deseja iniciar a PRORROGAÇÃO?")) {
                    newPeriod = 'Prorrogação';
                    setIsRunning(true);
                    registerSystemEvent('period_start', `Início da ${newPeriod}`);
                } else if (window.confirm("Deseja ir DIRETO para os PÊNALTIS?")) {
                    newPeriod = 'Pênaltis';
                    setIsRunning(false);
                    registerSystemEvent('period_start', `Início dos Pênaltis`);
                } else {
                    newPeriod = 'Fim de Tempo Normal';
                }
            } else {
                handleFinish();
                return;
            }
        } else if (currentPeriod === 'Fim de Tempo Normal') {
            // Option to go to Extra Time or End
            if (window.confirm("Iniciar Prorrogação? Cancelar para ir direto para Pênaltis ou Encerrar.")) {
                newPeriod = 'Prorrogação';
                setIsRunning(true);
                registerSystemEvent('period_start', `Início da ${newPeriod}`);
            } else {
                if (window.confirm("Iniciar Pênaltis?")) {
                    newPeriod = 'Pênaltis';
                    setIsRunning(false);
                    registerSystemEvent('period_start', `Início dos ${newPeriod}`);
                } else {
                    handleFinish();
                    return;
                }
            }
        } else if (currentPeriod === 'Prorrogação') {
            if (!window.confirm("Encerrar Prorrogação?")) return;
            setIsRunning(false);
            registerSystemEvent('period_end', `Fim da ${oldPeriod}`);
            if (window.confirm("Iniciar Pênaltis?")) {
                newPeriod = 'Pênaltis';
                registerSystemEvent('period_start', `Início dos Pênaltis`);
            } else {
                handleFinish();
                return;
            }
        } else if (currentPeriod === 'Pênaltis') {
            if (!window.confirm("Encerrar Disputa de Pênaltis?")) return;
            newPeriod = 'Fim de Jogo';
            registerSystemEvent('period_end', `Fim dos Pênaltis`);
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
                team_id: matchData.home_team_id || matchData.away_team_id, // Default to home team for system events
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

    const openEventModal = (team: 'home' | 'away', type: 'goal' | 'yellow_card' | 'red_card' | 'blue_card' | 'assist' | 'foul' | 'mvp') => {
        if (!isRunning) {
            alert('Atenção: Inicie o cronômetro para poder lançar eventos!');
            return;
        }
        setSelectedTeam(team);
        setEventType(type);
        setShowEventModal(true);
    };

    const registerSimpleEvent = async (team: 'home' | 'away', type: 'timeout') => {
        if (!isRunning) {
            alert('Atenção: Inicie o cronômetro para poder lançar eventos!');
            return;
        }
        if (!matchData) return;
        const teamId = team === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);

        const newEvent = {
            id: Date.now(),
            type: type,
            team: team,
            time: currentTime,
            period: currentPeriod,
            player_name: 'Pedido de Tempo'
        };
        setEvents(prev => [newEvent, ...prev]);

        // API
        try {
            await api.post(`/admin/matches/${id}/events`, {
                event_type: type,
                team_id: teamId,
                minute: currentTime,
                period: currentPeriod
            });
        } catch (e) {
            console.error(e);
        }
    }

    const confirmEvent = async (player: any) => {
        if (!matchData || !selectedTeam || !eventType) return;
        const teamId = selectedTeam === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);

        // Intercept Logic for Shootout
        if (currentPeriod === 'Pênaltis' && eventType === 'goal') {
            setSelectedPlayer(player);
            setShowEventModal(false);
            setShowShootoutOptions(true);
            return;
        }

        try {
            const response = await api.post(`/admin/matches/${id}/events`, {
                event_type: eventType,
                team_id: teamId,
                minute: currentTime,
                period: currentPeriod,
                player_id: player.id === 'unknown' ? null : player.id,
                metadata: player.isOwnGoal ? { own_goal: true } : null
            });

            const newEvent = {
                id: response.data.id,
                type: eventType,
                team: selectedTeam,
                time: currentTime,
                period: currentPeriod,
                player_name: player.isOwnGoal ? `${player.name} (Gol Contra)` : player.name,
                isOwnGoal: player.isOwnGoal
            };
            setEvents(prev => [newEvent, ...prev]);

            if (eventType === 'goal') {
                setMatchData((prev: any) => {
                    // Logic for score update
                    let homeInc = 0;
                    let awayInc = 0;

                    if (player.isOwnGoal) {
                        // Gol contra: selectedTeam is 'home', but point goes to 'away'
                        if (selectedTeam === 'home') awayInc = 1;
                        else homeInc = 1;
                    } else {
                        if (selectedTeam === 'home') homeInc = 1;
                        else awayInc = 1;
                    }

                    return {
                        ...prev,
                        scoreHome: (prev.scoreHome || 0) + homeInc,
                        scoreAway: (prev.scoreAway || 0) + awayInc
                    };
                });
            }

            if (eventType === 'foul') {
                setFouls(prev => ({ ...prev, [selectedTeam]: prev[selectedTeam] + 1 }));
            }
            setShowEventModal(false);
            setSelectedPlayer(null);
            setIsSelectingOwnGoal(false);
        } catch (e) {
            console.error(e);
            alert('Erro ao registrar evento');
        }
    };

    const handleShootoutResult = async (outcome: 'score' | 'saved' | 'post' | 'out') => {
        if (!selectedPlayer || !selectedTeam) return;

        const type = outcome === 'score' ? 'shootout_goal' : 'shootout_miss';
        const teamId = selectedTeam === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);

        try {
            const response = await api.post(`/admin/matches/${id}/events`, {
                event_type: type,
                team_id: teamId,
                minute: currentTime,
                period: currentPeriod,
                player_id: selectedPlayer.id,
                metadata: { outcome }
            });

            const newEvent = {
                id: response.data.id,
                type: type,
                team: selectedTeam,
                time: currentTime,
                period: currentPeriod,
                player_name: selectedPlayer.name
            };
            setEvents(prev => [newEvent, ...prev]);

            // Update penalty score locally
            if (outcome === 'score') {
                setPenaltyScore(prev => ({
                    ...prev,
                    [selectedTeam]: prev[selectedTeam] + 1
                }));
            }

            // Note: We deliberately do NOT update matchData.scoreHome/scoreAway
            // because shootout goals should not count for stats/regular score.

            setShowShootoutOptions(false);
            setSelectedPlayer(null);

        } catch (e) {
            console.error(e);
            alert('Erro ao registrar pênalti');
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

            if (type === 'foul') {
                setFouls(prev => ({
                    ...prev,
                    [team]: Math.max(0, prev[team] - 1)
                }));
            }

            if (type === 'shootout_goal') {
                setPenaltyScore(prev => ({
                    ...prev,
                    [team]: Math.max(0, prev[team] - 1)
                }));
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir evento');
        }
    };

    const handleFinish = async () => {
        if (!window.confirm('Encerrar partida completamente?')) return;
        try {
            // Record final event
            await registerSystemEvent('match_end', 'Partida Finalizada');

            await api.post(`/admin/matches/${id}/finish`, {
                home_score: matchData.scoreHome,
                away_score: matchData.scoreAway,
                home_penalty_score: penaltyScore.home,
                away_penalty_score: penaltyScore.away
            });

            // Clear local storage
            localStorage.removeItem(STORAGE_KEY);

            navigate(-1);
        } catch (e) {
            console.error(e);
        }
    };

    // Helper to render foul dots (Futsal style)
    const renderFouls = (count: number) => {
        // Futsal limit is 5. 6th is penalty.
        const dots = [];
        for (let i = 0; i < 6; i++) {
            const filled = i < count;
            const isLimit = i >= 5; // 6th foul slot
            dots.push(
                <div key={i} className={`w-3 h-3 rounded-full border border-black ${filled ? (isLimit ? 'bg-purple-500 animate-pulse' : 'bg-red-500') : 'bg-gray-700'}`}></div>
            );
        }
        return (
            <div className="flex flex-col items-center gap-1">
                <div className="flex justify-center gap-1">
                    {dots}
                </div>
                {count >= 5 && (
                    <span className={`text-[9px] font-bold uppercase tracking-tighter ${count >= 6 ? 'text-purple-400 animate-bounce' : 'text-red-400'}`}>
                        {count >= 6 ? '🚨 TIRO LIVRE' : '⚠️ PRÓX. TIRO LIVRE'}
                    </span>
                )}
            </div>
        );
    }

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans pb-20">
            {/* Header Sticky */}
            <div className="bg-gray-800 pb-2 pt-4 sticky top-0 z-10 border-b border-gray-700 shadow-xl">
                <div className="px-4 flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-gray-700 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">SUMULA DIGITAL - FUTSAL</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            {matchData.details?.arbitration?.referee && <span className="text-[10px] text-gray-500">{matchData.details.arbitration.referee}</span>}
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

                {/* Placar & Timer */}
                <div className="flex items-center justify-center gap-2 px-2">
                    {/* Home */}
                    <div className="text-center flex-1">
                        <div className="text-4xl sm:text-6xl font-black font-mono leading-none mb-1">{matchData.scoreHome}</div>
                        {(currentPeriod === 'Pênaltis' || penaltyScore.home > 0 || penaltyScore.away > 0) && (
                            <div className="text-sm font-bold text-yellow-400 mb-1">
                                (Pên: {penaltyScore.home})
                            </div>
                        )}
                        <h2 className="font-bold text-xs sm:text-sm text-gray-400 truncate max-w-[100px] mx-auto">{matchData.home_team?.name}</h2>
                        <div className="mt-1">
                            {renderFouls(fouls.home)}
                        </div>
                    </div>

                    {/* Center / Timer */}
                    <div className="flex flex-col items-center w-28 bg-gray-900/50 rounded-xl py-2 border border-gray-700">
                        <div onClick={() => setIsRunning(!isRunning)} className="cursor-pointer mb-1">
                            {isRunning
                                ? <Pause className="w-5 h-5 text-green-400 fill-current animate-pulse" />
                                : <Play className="w-5 h-5 text-gray-500 fill-current" />
                            }
                        </div>
                        <div className="text-3xl font-mono font-bold text-yellow-400 tracking-wider mb-1">{formatTime(time)}</div>
                        <div className="text-[9px] text-gray-500 uppercase font-bold px-2 py-0.5 bg-gray-800 rounded">{currentPeriod}</div>
                    </div>

                    {/* Away */}
                    <div className="text-center flex-1">
                        <div className="text-4xl sm:text-6xl font-black font-mono leading-none mb-1">{matchData.scoreAway}</div>
                        {(currentPeriod === 'Pênaltis' || penaltyScore.away > 0 || penaltyScore.home > 0) && (
                            <div className="text-sm font-bold text-yellow-400 mb-1">
                                (Pên: {penaltyScore.away})
                            </div>
                        )}
                        <h2 className="font-bold text-xs sm:text-sm text-gray-400 truncate max-w-[100px] mx-auto">{matchData.away_team?.name}</h2>
                        <div className="mt-1">
                            {renderFouls(fouls.away)}
                        </div>
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
                        {currentPeriod === 'Pênaltis' ? 'PÊNALTI' : 'GOL'}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('home', 'yellow_card')}
                            disabled={!isRunning}
                            className="py-3 bg-yellow-500 text-black rounded-lg font-bold border-b-4 border-yellow-700 active:scale-95 text-xs sm:text-sm disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            🟨 Amarelo
                        </button>
                        <button
                            onClick={() => openEventModal('home', 'red_card')}
                            disabled={!isRunning}
                            className="py-3 bg-red-600 rounded-lg font-bold border-b-4 border-red-800 active:scale-95 text-xs sm:text-sm disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            🟥 Vermelho
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('home', 'blue_card')}
                            disabled={!isRunning}
                            className="py-2 bg-blue-500 rounded-lg font-bold border-b-4 border-blue-700 active:scale-95 text-xs disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            🟦 Azul
                        </button>
                        <button
                            onClick={() => openEventModal('home', 'assist')}
                            disabled={!isRunning}
                            className="py-2 bg-indigo-500 rounded-lg font-bold border-b-4 border-indigo-700 active:scale-95 text-xs disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            👟 Assist.
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('home', 'foul')}
                            disabled={!isRunning}
                            className="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-gray-900 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            <Flag size={14} /> + Falta
                        </button>
                        <button
                            onClick={() => openEventModal('home', 'mvp')}
                            disabled={!isRunning}
                            className="py-2 bg-amber-500 text-black rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-amber-700 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            ⭐ Craque
                        </button>
                    </div>
                    <button
                        onClick={() => registerSimpleEvent('home', 'timeout')}
                        disabled={!isRunning}
                        className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold text-[9px] text-gray-400 uppercase tracking-widest active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                    >
                        Pedido de Tempo
                    </button>
                </div>

                {/* Away Controls */}
                <div className="bg-red-900/10 p-3 rounded-xl border border-red-900/30 space-y-2">
                    <button
                        onClick={() => openEventModal('away', 'goal')}
                        disabled={!isRunning}
                        className="w-full py-4 bg-green-600 rounded-lg font-black text-xl border-b-4 border-green-800 active:scale-95 transition-all text-shadow disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                    >
                        {currentPeriod === 'Pênaltis' ? 'PÊNALTI' : 'GOL'}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('away', 'yellow_card')}
                            disabled={!isRunning}
                            className="py-3 bg-yellow-500 text-black rounded-lg font-bold border-b-4 border-yellow-700 active:scale-95 text-xs sm:text-sm disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            🟨 Amarelo
                        </button>
                        <button
                            onClick={() => openEventModal('away', 'red_card')}
                            disabled={!isRunning}
                            className="py-3 bg-red-600 rounded-lg font-bold border-b-4 border-red-800 active:scale-95 text-xs sm:text-sm disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            🟥 Vermelho
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('away', 'blue_card')}
                            disabled={!isRunning}
                            className="py-2 bg-blue-500 rounded-lg font-bold border-b-4 border-blue-700 active:scale-95 text-xs disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            🟦 Azul
                        </button>
                        <button
                            onClick={() => openEventModal('away', 'assist')}
                            disabled={!isRunning}
                            className="py-2 bg-indigo-500 rounded-lg font-bold border-b-4 border-indigo-700 active:scale-95 text-xs disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            👟 Assist.
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('away', 'foul')}
                            disabled={!isRunning}
                            className="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-gray-900 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            <Flag size={14} /> + Falta
                        </button>
                        <button
                            onClick={() => openEventModal('away', 'mvp')}
                            disabled={!isRunning}
                            className="py-2 bg-amber-500 text-black rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-amber-700 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            ⭐ Craque
                        </button>
                    </div>
                    <button
                        onClick={() => registerSimpleEvent('away', 'timeout')}
                        disabled={!isRunning}
                        className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold text-[9px] text-gray-400 uppercase tracking-widest active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                    >
                        Pedido de Tempo
                    </button>
                </div>
            </div>

            {/* Timeline & Actions Footer */}
            <div className="px-4 mt-2 max-w-4xl mx-auto pb-20">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                        <Clock size={14} /> Linha do Tempo
                    </h3>
                    <button onClick={handleFinish} className="text-xs text-red-500 underline font-bold">Encerrar Súmula</button>
                </div>

                <div className="space-y-2">
                    {events.map((ev, idx) => (
                        <div key={idx} className="bg-gray-800 p-2 sm:p-3 rounded-lg border border-gray-700 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`font-mono text-sm font-bold ${ev.team === 'home' ? 'text-blue-400' : 'text-green-400'} min-w-[30px]`}>
                                    {ev.time}'
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        {ev.type === 'goal' && '⚽ GOL'}
                                        {ev.type === 'shootout_goal' && '⚽ GOL (Pênalti)'}
                                        {ev.type === 'shootout_miss' && '❌ Pênalti Perdido'}
                                        {ev.type === 'yellow_card' && '🟨 Amarelo'}
                                        {ev.type === 'red_card' && '🟥 Vermelho'}
                                        {ev.type === 'blue_card' && '🟦 Azul'}
                                        {ev.type === 'assist' && '👟 Assistência'}
                                        {ev.type === 'foul' && '⚠️ Falta'}
                                        {ev.type === 'mvp' && '⭐ Craque'}
                                        {ev.type === 'timeout' && '⏱ Pedido de Tempo'}
                                    </span>
                                    {ev.player_name && ev.player_name !== '?' ? (
                                        <span className="text-xs text-gray-400">{ev.player_name}</span>
                                    ) : (
                                        <span className="text-[10px] text-gray-500 italic">Evento de Partida</span>
                                    )}
                                    {ev.type === 'shootout_miss' && (
                                        <span className="text-[10px] text-red-400 uppercase font-bold ml-1">
                                            {/* Metadata detail if available */}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-gray-600">{ev.period}</span>
                                <button onClick={() => handleDeleteEvent(ev.id, ev.type, ev.team)} className="p-1 text-gray-500 hover:text-red-500 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {events.length === 0 && <div className="text-center text-gray-600 py-8 text-sm">Nenhum evento registrado ainda.</div>}
                </div>
            </div>

            {/* Shootout Outcome Modal */}
            {showShootoutOptions && selectedPlayer && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-gray-800 w-full max-w-sm rounded-2xl border border-gray-700 shadow-2xl p-6 text-center">
                        <h3 className="text-xl font-bold text-white mb-2">Resultado da Cobrança</h3>
                        <p className="text-gray-400 mb-6">Jogador: <b className="text-indigo-400">{selectedPlayer.name}</b></p>

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleShootoutResult('score')} className="col-span-2 py-4 bg-green-600 hover:bg-green-700 rounded-xl font-black text-white text-lg transition-colors border-b-4 border-green-800 active:scale-95">
                                ⚽ GOL
                            </button>
                            <button onClick={() => handleShootoutResult('saved')} className="py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-white transition-colors border-b-4 border-indigo-800 active:scale-95">
                                🧤 Defendeu
                            </button>
                            <button onClick={() => handleShootoutResult('post')} className="py-3 bg-yellow-600 hover:bg-yellow-700 rounded-xl font-bold text-white transition-colors border-b-4 border-yellow-800 active:scale-95">
                                🥅 Na Trave
                            </button>
                            <button onClick={() => handleShootoutResult('out')} className="col-span-2 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-white transition-colors border-b-4 border-red-800 active:scale-95">
                                ❌ Pra Fora
                            </button>
                        </div>
                        <button onClick={() => setShowShootoutOptions(false)} className="mt-6 text-gray-500 hover:text-gray-300 text-sm font-bold underline">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Player Modal */}
            {showEventModal && selectedTeam && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-800 w-full max-w-md sm:rounded-xl rounded-t-3xl border-t border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 border-b border-green-700 flex items-center justify-between sticky top-0 z-10">
                            <div>
                                <h3 className="font-bold text-lg text-white">Selecione o Jogador</h3>
                                <p className="text-xs text-green-200 uppercase">
                                    {selectedTeam === 'home' ? matchData.home_team?.name : matchData.away_team?.name}
                                </p>
                            </div>
                            <button onClick={() => { setShowEventModal(false); setIsSelectingOwnGoal(false); }} className="p-2 bg-black/30 rounded-full hover:bg-black/50">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-4 space-y-2 custom-scrollbar flex-1 bg-gray-900/30">
                            {/* Opções Específicas para GOL */}
                            {(eventType === 'goal' || eventType === 'foul') && (
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <button
                                        onClick={() => confirmEvent({ id: 'unknown', name: 'Jogador Desconhecido' })}
                                        className="p-4 bg-gray-700 hover:bg-gray-600 rounded-xl border border-gray-600 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                                    >
                                        <Users size={20} className="text-gray-400" />
                                        <span className="text-[10px] font-bold uppercase">Sem Jogador</span>
                                    </button>
                                    <button
                                        onClick={() => setIsSelectingOwnGoal(true)}
                                        className="p-4 bg-red-900/20 hover:bg-red-900/40 rounded-xl border border-red-900/30 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 text-red-400"
                                    >
                                        <X size={20} className="text-red-500" />
                                        <span className="text-[10px] font-bold uppercase">Gol Contra</span>
                                    </button>
                                </div>
                            )}

                            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">
                                {isSelectingOwnGoal ? 'Quem fez o Gol Contra?' : 'Selecione do Elenco'}
                            </div>

                            {(selectedTeam === 'home' ? rosters.home : rosters.away).length === 0 ? (
                                <p className="p-8 text-center text-gray-500">Nenhum jogador cadastrado.</p>
                            ) : (
                                (selectedTeam === 'home' ? rosters.home : rosters.away).map((player: any) => (
                                    <button
                                        key={player.id}
                                        onClick={() => confirmEvent(isSelectingOwnGoal ? { ...player, isOwnGoal: true } : player)}
                                        className="w-full flex items-center justify-between p-3 hover:bg-gray-700 rounded-xl transition-colors group mb-1 border border-transparent hover:border-green-500"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-bold text-sm text-white group-hover:bg-green-500 transition-colors">
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
            )}
        </div>
    );
}
