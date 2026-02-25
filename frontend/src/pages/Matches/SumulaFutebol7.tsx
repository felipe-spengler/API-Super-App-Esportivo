import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Save, Clock, Users, X, Flag, Timer, Trash2, AlertOctagon, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { getMatchPhrase } from '../../utils/matchPhrases';
import { useOfflineResilience } from '../../hooks/useOfflineResilience';

export function SumulaFutebol7() {
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

    const [fouls, setFouls] = useState({ home: 0, away: 0 });
    const [penaltyScore, setPenaltyScore] = useState({ home: 0, away: 0 });
    const [events, setEvents] = useState<any[]>([]);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

    // 🛡️ Resilience Shield
    const { isOnline, syncing, addToQueue, registerSystemEvent, pendingCount } = useOfflineResilience(id, 'Futebol 7', async (action, data) => {
        let url = '';
        switch (action) {
            case 'event': url = `/admin/matches/${id}/events`; break;
            case 'finish': url = `/admin/matches/${id}/finish`; break;
            case 'patch_match': url = `/admin/matches/${id}`; return await api.patch(url, data);
        }
        if (url) return await api.post(url, data);
    });

    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
    const [eventType, setEventType] = useState<'goal' | 'yellow_card' | 'red_card' | 'blue_card' | 'assist' | 'foul' | 'mvp' | null>(null);
    const [showShootoutOptions, setShowShootoutOptions] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const [isSelectingOwnGoal, setIsSelectingOwnGoal] = useState(false);

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
                if (isInitial) {
                    setMatchData({ ...data.match, scoreHome: parseInt(data.match.home_score || 0), scoreAway: parseInt(data.match.away_score || 0) });
                    if (data.match.match_details?.sync_timer && !serverTimerLoaded) {
                        const st = data.match.match_details.sync_timer;
                        setTime(st.time || 0);
                        if (st.currentPeriod) setCurrentPeriod(st.currentPeriod);
                        setServerTimerLoaded(true);
                    }
                    if (data.rosters) setRosters(data.rosters);
                } else {
                    const serverTimer = data.match.match_details?.sync_timer;
                    if (serverTimer && serverTimer.currentPeriod && serverTimer.currentPeriod !== currentPeriod) {
                        setCurrentPeriod(serverTimer.currentPeriod);
                        if (serverTimer.time !== undefined) setTime(serverTimer.time);
                        if (serverTimer.isRunning !== undefined) setIsRunning(serverTimer.isRunning);
                        if (data.match.status) setMatchData((prev: any) => ({ ...prev, status: data.match.status }));
                    }
                    if (data.rosters) setRosters(data.rosters);
                }
                const history = (data.details?.events || []).map((e: any) => ({
                    id: e.id, type: e.type, team: parseInt(e.team_id) === data.match.home_team_id ? 'home' : 'away',
                    time: e.minute, period: e.period, player_name: e.player_name
                }));
                setEvents(history);
                const activePeriod = data.match.match_details?.sync_timer?.currentPeriod || currentPeriod;
                let relevantPeriods = [activePeriod];
                if (activePeriod === '1º Tempo' || activePeriod === 'Intervalo') relevantPeriods = ['1º Tempo'];
                else if (activePeriod === '2º Tempo' || activePeriod === 'Fim de Tempo Normal') relevantPeriods = ['2º Tempo'];
                else if (activePeriod === 'Prorrogação') relevantPeriods = ['2º Tempo', 'Prorrogação'];

                const hFouls = history.filter((e: any) => e.team === 'home' && e.type === 'foul' && relevantPeriods.includes(e.period)).length;
                const aFouls = history.filter((e: any) => e.team === 'away' && e.type === 'foul' && relevantPeriods.includes(e.period)).length;
                setFouls({ home: hFouls, away: aFouls });

                const hPenalties = history.filter((e: any) => e.team === 'home' && (e.type === 'shootout_goal' || e.type === 'penalty_goal')).length;
                const aPenalties = history.filter((e: any) => e.team === 'away' && (e.type === 'shootout_goal' || e.type === 'penalty_goal')).length;
                setPenaltyScore({ home: hPenalties, away: aPenalties });
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        fetchMatchDetails(true);
        const syncInterval = setInterval(() => {
            // Só busca do servidor se não houver nada pendente localmente
            if (!pendingCount || pendingCount === 0) {
                fetchMatchDetails();
            }
        }, 5000);
        return () => clearInterval(syncInterval);
    }, [id, pendingCount]);

    useEffect(() => {
        let interval: any = null;
        if (isRunning) {
            interval = setInterval(() => setTime(t => t + 1), 1000);
            if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
                addToQueue('event', { event_type: 'match_start', team_id: matchData.home_team_id, minute: formatTime(time), period: currentPeriod, metadata: { label: 'Início da Partida' } });
                setMatchData((prev: any) => ({ ...prev, status: 'live' }));
            }
        }
        return () => interval && clearInterval(interval);
    }, [isRunning]);

    useEffect(() => {
        if (!id || !isOnline) return;
        const pingInterval = setInterval(async () => {
            const { time: t, isRunning: ir, currentPeriod: cp, matchData: md } = timerRef.current;
            if (!md) return;
            try {
                setSyncStatus('syncing');
                await api.patch(`/admin/matches/${id}`, {
                    match_details: { ...md.match_details, sync_timer: { time: t, isRunning: ir, currentPeriod: cp } }
                });
                setSyncStatus('synced');
            } catch (e) { setSyncStatus('error'); }
        }, 3000);
        return () => clearInterval(pingInterval);
    }, [id, isOnline]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const renderFouls = (count: number) => {
        const dots = [];
        for (let i = 0; i < 6; i++) {
            const filled = i < count;
            const isLimit = i >= 5;
            dots.push(<div key={i} className={`w-3 h-3 rounded-full border border-black ${filled ? (isLimit ? 'bg-orange-500 animate-pulse' : 'bg-red-500') : 'bg-gray-700'}`}></div>);
        }
        return (
            <div className="flex flex-col items-center gap-1">
                <div className="flex justify-center gap-1">{dots}</div>
                {count >= 5 && <span className={`text-[9px] font-bold uppercase tracking-tighter ${count >= 6 ? 'text-orange-400 animate-bounce' : 'text-red-400'}`}>{count >= 6 ? '🚨 SHOOTOUT' : '⚠️ PRÓX. SHOOTOUT'}</span>}
            </div>
        );
    }

    const handlePeriodChange = () => {
        if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado') && time === 0 && !isRunning) {
            setIsRunning(true);
            return;
        }
        const periods = ['1º Tempo', 'Intervalo', '2º Tempo', 'Fim de Tempo Normal', 'Prorrogação', 'Fim'];
        const currentIndex = periods.indexOf(currentPeriod);
        if (currentIndex < periods.length - 1) {
            const nextPeriod = periods[currentIndex + 1];
            if (!window.confirm(`Deseja mudar para: ${nextPeriod}?`)) return;
            setCurrentPeriod(nextPeriod);
            setIsRunning(false);
            addToQueue('event', { event_type: 'period_change', team_id: matchData.home_team_id, minute: formatTime(time), period: nextPeriod, metadata: { label: `Mudança de Período: ${nextPeriod}` } });
        }
    };

    const handleEvent = (team: 'home' | 'away', type: any) => {
        setSelectedTeam(team);
        setEventType(type);
        setIsSelectingOwnGoal(false);
        if (type === 'foul') {
            confirmEvent(null);
        } else {
            setShowEventModal(true);
        }
    };

    const confirmEvent = async (player: any) => {
        const type = eventType;
        const tid = selectedTeam === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const pid = player?.id || null;
        const pName = player ? (player.nickname || player.name) : 'Equipe';
        let labelText = '';
        switch (type) {
            case 'goal': labelText = isSelectingOwnGoal ? `Gol Contra: ${pName}` : `Gol: ${pName}`; break;
            case 'yellow_card': labelText = `Cartão Amarelo: ${pName}`; break;
            case 'red_card': labelText = `Cartão Vermelho: ${pName}`; break;
            case 'blue_card': labelText = `Cartão Azul: ${pName}`; break;
            case 'foul': labelText = `Falta: ${pName}`; break;
            case 'assist': labelText = `Assistência: ${pName}`; break;
            case 'mvp': labelText = `Melhor em Campo: ${pName}`; break;
        }
        const newEvent = { id: 'temp-' + Date.now(), type, team: selectedTeam, time: formatTime(time), period: currentPeriod, player_name: pName, is_own_goal: isSelectingOwnGoal };
        setEvents(prev => [newEvent, ...prev]);

        // Atualização Otimista do Placar no matchData
        if (type === 'goal') {
            setMatchData((prev: any) => {
                if (!prev) return prev;
                const isHomeGoal = (selectedTeam === 'home' && !isSelectingOwnGoal) || (selectedTeam === 'away' && isSelectingOwnGoal);
                return {
                    ...prev,
                    scoreHome: isHomeGoal ? (prev.scoreHome || 0) + 1 : prev.scoreHome,
                    scoreAway: !isHomeGoal ? (prev.scoreAway || 0) + 1 : prev.scoreAway
                };
            });
        }

        if (type === 'foul') {
            setFouls(prev => ({ ...prev, [selectedTeam!]: prev[selectedTeam!] + 1 }));
        }

        addToQueue('event', { event_type: type, team_id: tid, player_id: pid, minute: formatTime(time), period: currentPeriod, metadata: { label: labelText, is_own_goal: isSelectingOwnGoal } });
        setShowEventModal(false);
        setEventType(null);
        setSelectedPlayer(null);
    };

    const handleDeleteEvent = async (eventId: any) => {
        if (!window.confirm("Deseja cancelar este lançamento?")) return;
        try {
            await api.delete(`/admin/matches/${id}/events/${eventId}`);
            fetchMatchDetails();
        } catch (e) { alert("Erro ao excluir"); }
    };

    const handleFinish = async () => {
        if (!window.confirm('Encerrar e salvar partida?')) return;
        addToQueue('finish', { home_score: matchData.scoreHome, away_score: matchData.scoreAway });
        registerSystemEvent('user_action', 'Finalizou partida via Society');
        navigate(-1);
    };

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner"></span></div>;

    const homeScore = events.filter(e => e.team === 'home' && e.type === 'goal').length + events.filter(e => e.team === 'away' && e.type === 'goal' && e.is_own_goal).length;
    const awayScore = events.filter(e => e.team === 'away' && e.type === 'goal').length + events.filter(e => e.team === 'home' && e.type === 'goal' && e.is_own_goal).length;

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">


            <div className="bg-gray-800 p-2 sticky top-0 z-10 shadow-lg border-b border-gray-700">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-700 rounded-full"><ArrowLeft size={20} /></button>
                    <div className="text-center relative">
                        {(!isOnline || pendingCount > 0) && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap">
                                {!isOnline ? (
                                    <div className="flex items-center gap-1 px-2 text-[8px] font-black text-red-500 animate-pulse uppercase">
                                        Offline
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 px-2 text-[8px] font-black text-yellow-500 uppercase">
                                        <RefreshCw size={10} className="animate-spin" /> {pendingCount}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-1.2 justify-center text-yellow-500 -mb-1">
                            <Timer size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{currentPeriod}</span>
                        </div>
                        <div className="text-3xl font-mono font-black tabular-nums tracking-tighter">{formatTime(time)}</div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => setIsRunning(!isRunning)} className={`p-2.5 rounded-full ${isRunning ? 'bg-orange-600' : 'bg-emerald-600'}`}>
                            {isRunning ? <Pause size={18} /> : <Play size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-2 max-w-5xl mx-auto space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    {/* Home Team */}
                    <div className="bg-gray-800 rounded-xl p-2 border border-blue-900/30 flex flex-col items-center text-center">
                        <h2 className="text-blue-400 font-bold text-[10px] uppercase italic truncate w-full mb-0.5">{matchData.home_team?.name}</h2>
                        <div className="text-4xl font-black leading-tight mb-1">{homeScore}</div>
                        <div className="scale-90 mb-2">{renderFouls(fouls.home)}</div>
                        <div className="grid grid-cols-2 gap-1 w-full">
                            <button onClick={() => handleEvent('home', 'goal')} className="py-2.5 bg-emerald-600 rounded-lg font-black uppercase text-[10px]">Gol</button>
                            <button onClick={() => handleEvent('home', 'foul')} className="py-2.5 bg-gray-700 rounded-lg font-black uppercase text-[10px]">Falta</button>
                            <button onClick={() => handleEvent('home', 'yellow_card')} className="py-2 bg-yellow-500 text-black rounded-lg font-black uppercase tracking-tighter text-[9px]">Card 🟨</button>
                            <button onClick={() => handleEvent('home', 'red_card')} className="py-2 bg-red-600 rounded-lg font-black uppercase tracking-tighter text-[9px]">Card 🟥</button>
                        </div>
                    </div>

                    {/* Away Team */}
                    <div className="bg-gray-800 rounded-xl p-2 border border-green-900/30 flex flex-col items-center text-center">
                        <h2 className="text-green-400 font-bold text-[10px] uppercase italic truncate w-full mb-0.5">{matchData.away_team?.name}</h2>
                        <div className="text-4xl font-black leading-tight mb-1">{awayScore}</div>
                        <div className="scale-90 mb-2">{renderFouls(fouls.away)}</div>
                        <div className="grid grid-cols-2 gap-1 w-full">
                            <button onClick={() => handleEvent('away', 'goal')} className="py-2.5 bg-emerald-600 rounded-lg font-black uppercase text-[10px]">Gol</button>
                            <button onClick={() => handleEvent('away', 'foul')} className="py-2.5 bg-gray-700 rounded-lg font-black uppercase text-[10px]">Falta</button>
                            <button onClick={() => handleEvent('away', 'yellow_card')} className="py-2 bg-yellow-500 text-black rounded-lg font-black uppercase tracking-tighter text-[9px]">Card 🟨</button>
                            <button onClick={() => handleEvent('away', 'red_card')} className="py-2 bg-red-600 rounded-lg font-black uppercase tracking-tighter text-[9px]">Card 🟥</button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={handlePeriodChange} className="flex-1 py-3 bg-indigo-600 rounded-lg font-black uppercase italic tracking-widest text-xs">Próximo Período</button>
                    <button onClick={handleFinish} className="px-4 py-3 bg-gray-800 rounded-lg font-black uppercase italic border border-gray-700 text-xs">Encerrar</button>
                </div>

                <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                    <h3 className="font-black uppercase tracking-widest text-xs mb-2 flex items-center gap-2"><Clock size={14} /> Histórico</h3>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {events.length === 0 ? <p className="text-center text-gray-500 py-10">Inicie a partida para registrar eventos.</p> : events.map((ev: any) => (
                            <div key={ev.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-700">
                                <div>
                                    <div className="text-[10px] font-black text-gray-500 mb-0.5">{ev.time} • {ev.period}</div>
                                    <div className="font-bold flex items-center gap-2">
                                        <span className={ev.team === 'home' ? 'text-blue-400' : 'text-green-400'}>{ev.player_name}</span>
                                        <span className="text-[10px] text-gray-500 uppercase">{ev.type}</span>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteEvent(ev.id)} className="p-2 text-gray-600 hover:text-red-500"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showEventModal && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-gray-800 w-full max-w-lg rounded-3xl overflow-hidden border border-gray-700">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="font-black uppercase tracking-tighter text-xl italic">{eventType} - {selectedTeam === 'home' ? matchData.home_team?.name : matchData.away_team?.name}</h3>
                            <button onClick={() => setShowEventModal(false)}><X /></button>
                        </div>
                        <div className="p-6">
                            {eventType === 'goal' && (
                                <button onClick={() => setIsSelectingOwnGoal(!isSelectingOwnGoal)} className={`w-full py-2 mb-4 rounded-lg font-bold text-xs uppercase ${isSelectingOwnGoal ? 'bg-red-600' : 'bg-gray-700'}`}>
                                    {isSelectingOwnGoal ? '🚨 SELECIONANDO GOL CONTRA' : 'MARCAR COMO GOL CONTRA?'}
                                </button>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                                {(selectedTeam === 'home' ? rosters.home : rosters.away).map((p: any) => (
                                    <button key={p.id} onClick={() => confirmEvent(p)} className="p-4 bg-gray-700 hover:bg-gray-600 rounded-xl text-center">
                                        <div className="text-xl font-black mb-1">{p.pivot?.number || p.number || '#'}</div>
                                        <div className="text-[10px] font-bold uppercase truncate">{p.nickname || p.name}</div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => confirmEvent(null)} className="w-full py-4 mt-4 bg-gray-900 rounded-xl font-bold text-gray-400 uppercase">Não identificado / Time</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
