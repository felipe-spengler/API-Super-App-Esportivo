import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Clock, Users, X, Timer, Flame, Trash2 } from 'lucide-react';
import api from '../../services/api';

type Quarter = '1º Quarto' | '2º Quarto' | 'Intervalo' | '3º Quarto' | '4º Quarto' | 'Prorrogação' | 'Fim de Jogo';

interface PlayerFouls {
    [playerId: number]: number;
}

export function SumulaBasquete() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });
    const [serverTimerLoaded, setServerTimerLoaded] = useState(false);

    // Timer & Period State
    const [time, setTime] = useState(600); // 10min = 600s (regressivo)
    const [isRunning, setIsRunning] = useState(false);
    const [currentQuarter, setCurrentQuarter] = useState<Quarter>('1º Quarto');
    const [quarterDuration] = useState(600); // 10min padrão (pode ser 12min = 720s)

    // Stats State
    const [teamFouls, setTeamFouls] = useState({ home: 0, away: 0 });
    const [playerFouls, setPlayerFouls] = useState<{ home: PlayerFouls; away: PlayerFouls }>({ home: {}, away: {} });
    const [timeouts, setTimeouts] = useState({ home: 5, away: 5 }); // 5 pedidos de tempo por equipe
    const [events, setEvents] = useState<any[]>([]);

    // Modal State
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
    const [eventType, setEventType] = useState<'1_point' | '2_points' | '3_points' | 'foul' | 'free_throw' | 'field_goal_2' | 'field_goal_3' | null>(null);

    const fetchMatchDetails = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await api.get(`/admin/matches/${id}/full-details`);
            const data = response.data;
            if (data.match) {
                setMatchData({
                    ...data.match,
                    scoreHome: parseInt(data.match.home_score || 0),
                    scoreAway: parseInt(data.match.away_score || 0)
                });

                // Sync timer if not yet loaded from server or if someone else is running it
                if (data.match.match_details?.sync_timer && !serverTimerLoaded) {
                    const st = data.match.match_details.sync_timer;
                    setTime(st.time || 600);
                    setIsRunning(st.isRunning || false);
                    if (st.currentPeriod) setCurrentQuarter(st.currentPeriod as Quarter);
                    setServerTimerLoaded(true);
                }

                if (data.rosters) setRosters(data.rosters);

                // Process History
                const history = (data.details?.events || []).map((e: any) => ({
                    id: e.id,
                    type: e.type,
                    team: parseInt(e.team_id) === data.match.home_team_id ? 'home' : 'away',
                    time: e.minute,
                    period: e.period,
                    player_name: e.player_name,
                    value: e.value || 1
                }));
                setEvents(history);

                // Calc Fouls (Team)
                const homeFouls = history.filter((e: any) => e.team === 'home' && e.type === 'foul').length;
                const awayFouls = history.filter((e: any) => e.team === 'away' && e.type === 'foul').length;
                setTeamFouls({ home: homeFouls, away: awayFouls });
            }
        } catch (e) {
            console.error(e);
            if (!silent) alert('Erro ao carregar jogo.');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // --- PERSISTENCE LOGIC ---
    const STORAGE_KEY = `match_state_basquete_${id}`;

    useEffect(() => {
        // Initial Fetch
        if (id) fetchMatchDetails();

        // Sync Interval (Every 5s check for server updates to keep in sync)
        const syncInterval = setInterval(() => {
            if (id) fetchMatchDetails(true);
        }, 2000);

        if (id) {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.currentQuarter) setCurrentQuarter(parsed.currentQuarter);
                    if (parsed.teamFouls) setTeamFouls(parsed.teamFouls);
                    if (parsed.playerFouls) setPlayerFouls(parsed.playerFouls);
                    if (parsed.timeouts) setTimeouts(parsed.timeouts);

                    let restoredTime = parsed.time || quarterDuration;
                    if (parsed.isRunning && parsed.lastTimestamp) {
                        const secondsPassed = Math.floor((Date.now() - parsed.lastTimestamp) / 1000);
                        restoredTime -= secondsPassed; // Regressivo
                        if (restoredTime < 0) restoredTime = 0;
                        setIsRunning(true);
                    } else {
                        setIsRunning(false);
                    }
                    setTime(restoredTime);
                } catch (e) {
                    console.error("Failed to recover state", e);
                }
            }
        }

        return () => clearInterval(syncInterval);
    }, [id]);

    useEffect(() => {
        if (!id || loading) return;

        const stateToSave = {
            time,
            isRunning,
            currentQuarter,
            teamFouls,
            playerFouls,
            timeouts,
            lastTimestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));

    }, [time, isRunning, currentQuarter, teamFouls, playerFouls, timeouts, id, loading]);

    // Countdown Timer
    useEffect(() => {
        let interval: any = null;
        if (isRunning && time > 0) {
            interval = setInterval(() => setTime(t => Math.max(0, t - 1)), 1000);

            // If match is still scheduled, set to live on first play
            if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
                registerSystemEvent('match_start', 'Início da Partida');
            }
        } else if (time === 0 && isRunning) {
            setIsRunning(false); // Auto-pause ao chegar a 0
        }
        return () => clearInterval(interval);
    }, [isRunning, time, matchData]);

    // PING - Sync local state TO server (Every 3 seconds)
    useEffect(() => {
        if (!id || loading || !matchData) return;

        const pingInterval = setInterval(async () => {
            try {
                // Update server with our current time
                await api.patch(`/admin/matches/${id}`, {
                    match_details: {
                        ...matchData.match_details,
                        sync_timer: {
                            time,
                            isRunning,
                            currentPeriod: currentQuarter,
                            updated_at: Date.now()
                        }
                    }
                });
            } catch (e) {
                console.error("Timer sync failed", e);
            }
        }, 3000);

        return () => clearInterval(pingInterval);
    }, [id, isRunning, time, currentQuarter]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleQuarterChange = () => {
        const oldPeriod = currentQuarter;
        let newPeriod: Quarter | '' = '';

        if (currentQuarter === '1º Quarto') {
            setIsRunning(false);
            newPeriod = '2º Quarto';
            setTime(quarterDuration);
            setTeamFouls({ home: 0, away: 0 });
            registerSystemEvent('period_end', `Fim do ${oldPeriod}`);
            registerSystemEvent('period_start', `Início do ${newPeriod}`);
        } else if (currentQuarter === '2º Quarto') {
            newPeriod = 'Intervalo';
            setTime(0);
            setIsRunning(false);
            registerSystemEvent('period_end', `Fim do ${oldPeriod}`);
        } else if (currentQuarter === 'Intervalo') {
            newPeriod = '3º Quarto';
            setTime(quarterDuration);
            setTeamFouls({ home: 0, away: 0 });
            registerSystemEvent('period_start', `Início do ${newPeriod}`);
        } else if (currentQuarter === '3º Quarto') {
            setIsRunning(false);
            newPeriod = '4º Quarto';
            setTime(quarterDuration);
            setTeamFouls({ home: 0, away: 0 });
            registerSystemEvent('period_end', `Fim do ${oldPeriod}`);
            registerSystemEvent('period_start', `Início do ${newPeriod}`);
        } else if (currentQuarter === '4º Quarto') {
            setIsRunning(false);
            registerSystemEvent('period_end', `Fim do ${oldPeriod}`);
            if (matchData.scoreHome === matchData.scoreAway) {
                if (window.confirm("Placar empatado. Iniciar Prorrogação (5 min)?")) {
                    newPeriod = 'Prorrogação';
                    setTime(300);
                    setTeamFouls({ home: 0, away: 0 });
                    registerSystemEvent('period_start', `Início da ${newPeriod}`);
                } else {
                    newPeriod = 'Fim de Jogo';
                }
            } else {
                newPeriod = 'Fim de Jogo';
            }
        } else if (currentQuarter === 'Prorrogação') {
            newPeriod = 'Fim de Jogo';
            registerSystemEvent('period_end', `Fim da ${oldPeriod}`);
        }

        if (newPeriod) setCurrentQuarter(newPeriod);
    };

    const registerSystemEvent = async (type: string, label: string) => {
        if (!matchData) return;
        const currentTime = formatTime(time);

        try {
            const response = await api.post(`/admin/matches/${id}/events`, {
                event_type: type,
                team_id: matchData.home_team_id || matchData.away_team_id,
                minute: currentTime,
                period: currentQuarter,
                metadata: { label }
            });

            setEvents(prev => [{
                id: response.data.id,
                type: type,
                team: 'home',
                time: currentTime,
                period: currentQuarter,
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

    const openEventModal = (team: 'home' | 'away', type: '1_point' | '2_points' | '3_points' | 'foul') => {
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
        if (timeouts[team] <= 0) {
            alert('Sem pedidos de tempo restantes!');
            return;
        }
        if (!matchData) return;

        setTimeouts(prev => ({ ...prev, [team]: prev[team] - 1 }));
        setIsRunning(false); // Pause on timeout

        const teamId = team === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);

        const newEvent = {
            id: Date.now(),
            type: 'timeout',
            team: team,
            time: currentTime,
            period: currentQuarter,
            player_name: 'Pedido de Tempo'
        };
        setEvents(prev => [newEvent, ...prev]);

        try {
            await api.post(`/admin/matches/${id}/events`, {
                event_type: 'timeout',
                team_id: teamId,
                minute: currentTime,
                period: currentQuarter
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
            let points = 0;
            let apiType = eventType;

            if (eventType === '1_point') {
                points = 1;
                apiType = 'free_throw';
            } else if (eventType === '2_points') {
                points = 2;
                apiType = 'field_goal_2';
            } else if (eventType === '3_points') {
                points = 3;
                apiType = 'field_goal_3';
            } else if (eventType === 'foul') {
                // Falta
                setTeamFouls(prev => ({ ...prev, [selectedTeam]: prev[selectedTeam] + 1 }));
                setPlayerFouls(prev => ({
                    ...prev,
                    [selectedTeam]: {
                        ...prev[selectedTeam],
                        [player.id]: (prev[selectedTeam][player.id] || 0) + 1
                    }
                }));

                // Check if player fouled out (5 fouls)
                if ((playerFouls[selectedTeam][player.id] || 0) + 1 >= 5) {
                    alert(`⚠️ ${player.name} cometeu a 5ª falta e está ELIMINADO!`);
                }
            }

            const response = await api.post(`/admin/matches/${id}/events`, {
                event_type: apiType,
                team_id: teamId,
                minute: currentTime,
                period: currentQuarter,
                player_id: player.id,
                value: points
            });

            const newEvent = {
                id: response.data.id,
                type: apiType,
                team: selectedTeam,
                time: currentTime,
                period: currentQuarter,
                player_name: player.name,
                value: points
            };
            setEvents(prev => [newEvent, ...prev]);

            if (points > 0) {
                setMatchData((prev: any) => ({
                    ...prev,
                    scoreHome: selectedTeam === 'home' ? prev.scoreHome + points : prev.scoreHome,
                    scoreAway: selectedTeam === 'away' ? prev.scoreAway + points : prev.scoreAway
                }));
            }
            setShowEventModal(false);
        } catch (e) {
            console.error(e);
            alert('Erro ao registrar evento');
        }
    };

    const handleDeleteEvent = async (eventId: number, type: string, team: 'home' | 'away', value: number) => {
        if (!window.confirm('Excluir este evento?')) return;

        try {
            await api.delete(`/admin/matches/${id}/events/${eventId}`);
            setEvents(prev => prev.filter(e => e.id !== eventId));

            if (value > 0) {
                setMatchData((prev: any) => ({
                    ...prev,
                    scoreHome: team === 'home' ? prev.scoreHome - value : prev.scoreHome,
                    scoreAway: team === 'away' ? prev.scoreAway - value : prev.scoreAway
                }));
            }

            if (type === 'foul') {
                setTeamFouls(prev => ({ ...prev, [team]: Math.max(0, prev[team] - 1) }));
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
            navigate('/matches');
        } catch (e) {
            console.error(e);
        }
    };

    // Check if team is in bonus (4+ fouls in quarter)
    const isBonusHome = teamFouls.home >= 4;
    const isBonusAway = teamFouls.away >= 4;

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-900 via-gray-900 to-black text-white font-sans pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 pb-2 pt-4 sticky top-0 z-10 border-b border-orange-700 shadow-2xl">
                <div className="px-4 flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-black/30 rounded-full backdrop-blur">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold tracking-widest text-orange-200">SÚMULA DIGITAL - BASQUETE</span>
                        {(matchData.details?.arbitration?.referee) && <span className="text-[10px] text-orange-300">{matchData.details.arbitration.referee}</span>}
                    </div>
                    <button onClick={handleQuarterChange} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-lg ${currentQuarter === 'Intervalo' ? 'bg-yellow-500 text-black animate-pulse' :
                        currentQuarter === 'Fim de Jogo' ? 'bg-red-700 text-white' :
                            'bg-black/40 text-white backdrop-blur'
                        }`}>
                        {matchData.status === 'scheduled' || matchData.status === 'Agendado' ? 'Iniciar Jogo' :
                            currentQuarter === '1º Quarto' ? 'Fim 1º Q' :
                                currentQuarter === '2º Quarto' ? 'Intervalo' :
                                    currentQuarter === 'Intervalo' ? 'Iniciar 3º Q' :
                                        currentQuarter === '3º Quarto' ? 'Fim 3º Q' :
                                            currentQuarter === '4º Quarto' ? 'Encerrar' :
                                                currentQuarter === 'Prorrogação' ? 'Fim Prorrogação' :
                                                    'Finalizado'}
                    </button>
                </div>

                {/* Scoreboard */}
                <div className="flex items-center justify-center gap-3 px-2">
                    {/* Home */}
                    <div className="text-center flex-1">
                        <div className="text-5xl sm:text-7xl font-black font-mono leading-none mb-1 text-orange-100 drop-shadow-[0_0_15px_rgba(255,165,0,0.5)]">{matchData.scoreHome}</div>
                        <h2 className="font-bold text-xs sm:text-sm text-orange-200 truncate max-w-[120px] mx-auto">{matchData.home_team?.name}</h2>
                        <div className="mt-2 text-[10px] space-y-1">
                            <div className="flex items-center justify-center gap-1">
                                <span className={`px-2 py-0.5 rounded ${isBonusHome ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}>
                                    Faltas: {teamFouls.home} {isBonusHome && '🔥'}
                                </span>
                            </div>
                            <div className="text-gray-400">Tempos: {timeouts.home}</div>
                        </div>
                    </div>

                    {/* Center / Timer */}
                    <div className="flex flex-col items-center w-32 bg-black/50 backdrop-blur rounded-xl py-3 border border-orange-500/50 shadow-2xl">
                        <div onClick={() => setIsRunning(!isRunning)} className="cursor-pointer mb-2">
                            {isRunning
                                ? <Pause className="w-6 h-6 text-red-400 fill-current animate-pulse" />
                                : <Play className="w-6 h-6 text-green-400 fill-current" />
                            }
                        </div>
                        <div className={`text-4xl font-mono font-black tracking-wider mb-1 ${time < 60 ? 'text-red-400 animate-pulse' : 'text-yellow-300'} drop-shadow-[0_0_10px_rgba(255,255,0,0.5)]`}>
                            {formatTime(time)}
                        </div>
                        <div className="text-[9px] text-orange-300 uppercase font-bold px-2 py-1 bg-orange-900/50 rounded">{currentQuarter}</div>
                    </div>

                    {/* Away */}
                    <div className="text-center flex-1">
                        <div className="text-5xl sm:text-7xl font-black font-mono leading-none mb-1 text-orange-100 drop-shadow-[0_0_15px_rgba(255,165,0,0.5)]">{matchData.scoreAway}</div>
                        <h2 className="font-bold text-xs sm:text-sm text-orange-200 truncate max-w-[120px] mx-auto">{matchData.away_team?.name}</h2>
                        <div className="mt-2 text-[10px] space-y-1">
                            <div className="flex items-center justify-center gap-1">
                                <span className={`px-2 py-0.5 rounded ${isBonusAway ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}>
                                    Faltas: {teamFouls.away} {isBonusAway && '🔥'}
                                </span>
                            </div>
                            <div className="text-gray-400">Tempos: {timeouts.away}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Grid */}
            <div className="p-2 sm:p-4 grid grid-cols-2 gap-2 sm:gap-4 max-w-5xl mx-auto">
                {/* Home Controls */}
                <div className="bg-blue-900/20 p-3 rounded-xl border border-blue-500/30 space-y-2 backdrop-blur">
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => openEventModal('home', '1_point')}
                            disabled={!isRunning}
                            className="py-3 bg-blue-600 rounded-lg font-black text-sm border-b-4 border-blue-800 active:scale-95 transition-all hover:bg-blue-500 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            +1
                        </button>
                        <button
                            onClick={() => openEventModal('home', '2_points')}
                            disabled={!isRunning}
                            className="py-3 bg-blue-700 rounded-lg font-black text-lg border-b-4 border-blue-900 active:scale-95 transition-all hover:bg-blue-600 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            +2
                        </button>
                        <button
                            onClick={() => openEventModal('home', '3_points')}
                            disabled={!isRunning}
                            className="py-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg font-black text-xl border-b-4 border-purple-800 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            +3
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('home', 'foul')}
                            disabled={!isRunning}
                            className="py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-red-800 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            ⚠️ Falta
                        </button>
                        <button
                            onClick={() => registerTimeout('home')}
                            disabled={!isRunning}
                            className="py-2 bg-yellow-600 hover:bg-yellow-500 text-black rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-yellow-800 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            <Timer size={14} /> Tempo
                        </button>
                    </div>
                </div>

                {/* Away Controls */}
                <div className="bg-red-900/20 p-3 rounded-xl border border-red-500/30 space-y-2 backdrop-blur">
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => openEventModal('away', '1_point')}
                            disabled={!isRunning}
                            className="py-3 bg-green-600 rounded-lg font-black text-sm border-b-4 border-green-800 active:scale-95 transition-all hover:bg-green-500 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            +1
                        </button>
                        <button
                            onClick={() => openEventModal('away', '2_points')}
                            disabled={!isRunning}
                            className="py-3 bg-green-700 rounded-lg font-black text-lg border-b-4 border-green-900 active:scale-95 transition-all hover:bg-green-600 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            +2
                        </button>
                        <button
                            onClick={() => openEventModal('away', '3_points')}
                            disabled={!isRunning}
                            className="py-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg font-black text-xl border-b-4 border-teal-800 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            +3
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => openEventModal('away', 'foul')}
                            disabled={!isRunning}
                            className="py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-red-800 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            ⚠️ Falta
                        </button>
                        <button
                            onClick={() => registerTimeout('away')}
                            disabled={!isRunning}
                            className="py-2 bg-yellow-600 hover:bg-yellow-500 text-black rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-yellow-800 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            <Timer size={14} /> Tempo
                        </button>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="px-4 mt-2 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-orange-400 uppercase flex items-center gap-2">
                        <Clock size={14} /> Linha do Tempo
                    </h3>
                    <button onClick={handleFinish} className="text-xs text-red-400 underline font-bold hover:text-red-300">Encerrar Súmula</button>
                </div>

                <div className="space-y-2 pb-20">
                    {events.map((ev, idx) => (
                        <div key={idx} className="bg-gray-800/80 backdrop-blur p-2 sm:p-3 rounded-lg border border-gray-700 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`font-mono text-sm font-bold ${ev.team === 'home' ? 'text-blue-400' : 'text-green-400'} min-w-[40px]`}>
                                    {ev.time}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        {ev.type === 'free_throw' && `🎯 +1 Lance Livre`}
                                        {ev.type === 'field_goal_2' && `🏀 +2 Pontos`}
                                        {ev.type === 'field_goal_3' && `🔥 +3 Pontos`}
                                        {ev.type === 'foul' && `⚠️ Falta`}
                                        {ev.type === 'timeout' && `⏱ Pedido de Tempo`}
                                    </span>
                                    {ev.player_name && <span className="text-xs text-gray-400">{ev.player_name}</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-gray-600">{ev.period}</span>
                                <button onClick={() => handleDeleteEvent(ev.id, ev.type, ev.team, ev.value)} className="p-1 px-2 hover:bg-red-500/20 text-gray-500 hover:text-red-500 rounded transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {events.length === 0 && <div className="text-center text-gray-600 py-8 text-sm">Nenhum evento registrado ainda.</div>}
                </div>
            </div>

            {/* Player Modal */}
            {
                showEventModal && selectedTeam && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-gray-800 w-full max-w-md sm:rounded-xl rounded-t-3xl border-t border-orange-500/50 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-4 bg-gradient-to-r from-orange-600 to-red-600 border-b border-orange-700 flex items-center justify-between sticky top-0 z-10">
                                <div>
                                    <h3 className="font-bold text-lg text-white">Selecione o Jogador</h3>
                                    <p className="text-xs text-orange-200 uppercase">
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
                                    (selectedTeam === 'home' ? rosters.home : rosters.away).map((player: any) => {
                                        const fouls = playerFouls[selectedTeam][player.id] || 0;
                                        const isFouledOut = fouls >= 5;
                                        return (
                                            <button
                                                key={player.id}
                                                onClick={() => confirmEvent(player)}
                                                disabled={isFouledOut && eventType !== 'foul'}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors group mb-1 border ${isFouledOut
                                                    ? 'bg-red-900/30 border-red-500 opacity-50 cursor-not-allowed'
                                                    : 'hover:bg-gray-700 border-transparent hover:border-orange-500'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${isFouledOut
                                                        ? 'bg-red-700 text-white'
                                                        : 'bg-orange-600 text-white group-hover:bg-orange-500'
                                                        }`}>
                                                        {player.number || '#'}
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="font-medium text-sm block">{player.name}</span>
                                                        {fouls > 0 && (
                                                            <span className={`text-xs ${isFouledOut ? 'text-red-400 font-bold' : 'text-yellow-400'}`}>
                                                                {fouls} falta{fouls > 1 ? 's' : ''} {isFouledOut && '(ELIMINADO)'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
