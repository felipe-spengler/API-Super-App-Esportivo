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
        const syncInterval = setInterval(() => fetchMatchDetails(), 3000);
        return () => clearInterval(syncInterval);
    }, [id]);

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
        const newEvent = { id: 'temp-' + Date.now(), type, team: selectedTeam, time: formatTime(time), period: currentPeriod, player_name: pName };
        setEvents(prev => [newEvent, ...prev]);
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
            {!isOnline && (
                <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] font-bold py-1 px-4 z-[9999] flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2"><Flag size={12} className="animate-pulse" /><span>SISTEMA OFFLINE</span></div>
                    <span>{pendingCount} PENDENTES</span>
                </div>
            )}
            {isOnline && pendingCount > 0 && (
                <div className="fixed top-0 left-0 w-full bg-yellow-600 text-white text-[10px] font-bold py-1 px-4 z-[9999] flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2"><RefreshCw size={12} className="animate-spin" /><span>SINCRONIZANDO...</span></div>
                    <span>{pendingCount} RESTANTES</span>
                </div>
            )}

            <div className="bg-gray-800 p-4 sticky top-0 z-10 shadow-lg border-b border-gray-700">
                <div className="flex items-center justify-between max-w-5xl mx-auto">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-700 rounded-full"><ArrowLeft /></button>
                    <div className="text-center">
                        <div className="flex items-center gap-2 justify-center text-yellow-500 mb-1">
                            <Timer size={16} />
                            <span className="text-xs font-black uppercase tracking-widest">{currentPeriod}</span>
                        </div>
                        <div className="text-4xl font-mono font-black tabular-nums tracking-tighter">{formatTime(time)}</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsRunning(!isRunning)} className={`p-3 rounded-full ${isRunning ? 'bg-orange-600' : 'bg-emerald-600'}`}>
                            {isRunning ? <Pause size={20} /> : <Play size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 max-w-5xl mx-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Home Team */}
                    <div className="bg-gray-800 rounded-2xl p-6 border border-blue-900/30">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-blue-400 font-black text-xl uppercase italic">{matchData.home_team?.name}</h2>
                                <div className="text-5xl font-black mt-2">{homeScore}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Faltas</div>
                                {renderFouls(fouls.home)}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleEvent('home', 'goal')} className="p-4 bg-emerald-600 rounded-xl font-black uppercase">Gol</button>
                            <button onClick={() => handleEvent('home', 'foul')} className="p-4 bg-gray-700 rounded-xl font-black uppercase">Falta</button>
                            <button onClick={() => handleEvent('home', 'yellow_card')} className="p-4 bg-yellow-500 text-black rounded-xl font-black uppercase tracking-tighter text-xs">Amarelo</button>
                            <button onClick={() => handleEvent('home', 'red_card')} className="p-4 bg-red-600 rounded-xl font-black uppercase tracking-tighter text-xs">Vermelho</button>
                        </div>
                    </div>

                    {/* Away Team */}
                    <div className="bg-gray-800 rounded-2xl p-6 border border-green-900/30">
                        <div className="flex justify-between items-start mb-6">
                            <div className="text-right order-2">
                                <h2 className="text-green-400 font-black text-xl uppercase italic">{matchData.away_team?.name}</h2>
                                <div className="text-5xl font-black mt-2">{awayScore}</div>
                            </div>
                            <div className="text-left order-1">
                                <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Faltas</div>
                                {renderFouls(fouls.away)}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleEvent('away', 'goal')} className="p-4 bg-emerald-600 rounded-xl font-black uppercase">Gol</button>
                            <button onClick={() => handleEvent('away', 'foul')} className="p-4 bg-gray-700 rounded-xl font-black uppercase">Falta</button>
                            <button onClick={() => handleEvent('away', 'yellow_card')} className="p-4 bg-yellow-500 text-black rounded-xl font-black uppercase tracking-tighter text-xs">Amarelo</button>
                            <button onClick={() => handleEvent('away', 'red_card')} className="p-4 bg-red-600 rounded-xl font-black uppercase tracking-tighter text-xs">Vermelho</button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={handlePeriodChange} className="flex-1 py-4 bg-indigo-600 rounded-xl font-black uppercase italic tracking-widest">Próximo Período</button>
                    <button onClick={handleFinish} className="px-6 py-4 bg-gray-800 rounded-xl font-black uppercase italic border border-gray-700">Encerrar</button>
                </div>

                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                    <h3 className="font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Clock size={16} /> Histórico</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
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
