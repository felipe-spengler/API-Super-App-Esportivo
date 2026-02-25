import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Clock, Users, X, Flag, Timer, UserX, Trash2, AlertOctagon, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { getMatchPhrase } from '../../utils/matchPhrases';
import { useOfflineResilience } from '../../hooks/useOfflineResilience';

export function SumulaHandebol() {
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

    // Stats State
    const [suspensions, setSuspensions] = useState({ home: 0, away: 0 });
    const [events, setEvents] = useState<any[]>([]);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

    // 🛡️ Resilience Shield
    const { isOnline, syncing, addToQueue, registerSystemEvent, pendingCount } = useOfflineResilience(id, 'Handebol', async (action, data) => {
        let url = '';
        switch (action) {
            case 'event': url = `/admin/matches/${id}/events`; break;
            case 'finish': url = `/admin/matches/${id}/finish`; break;
            case 'patch_match': url = `/admin/matches/${id}`; return await api.patch(url, data);
        }
        if (url) return await api.post(url, data);
    });

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

    const handlePeriodChange = () => {
        if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado') && time === 0 && !isRunning) {
            if (!window.confirm("Iniciar Partida?")) return;
            setIsRunning(true);
            setMatchData((prev: any) => ({ ...prev, status: 'live' }));
            addToQueue('event', { event_type: 'match_start', team_id: matchData.home_team_id, minute: formatTime(time), period: currentPeriod, metadata: { label: 'Início de partida. Que vença o melhor!' } });
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

    const openEventModal = (team: 'home' | 'away', type: 'goal' | 'yellow_card' | 'suspension_2min' | 'red_card' | 'assist' | 'mvp') => {
        if (!isRunning) { alert('Atenção: Inicie o cronômetro para poder lançar eventos!'); return; }
        setSelectedTeam(team);
        setEventType(type);
        setShowEventModal(true);
    };

    const registerTimeout = async (team: 'home' | 'away') => {
        if (!isRunning) { alert('Atenção: Inicie o cronômetro para poder lançar eventos!'); return; }
        if (!matchData) return;
        const teamId = team === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);
        const newEvent = { id: Date.now(), type: 'timeout', team, time: currentTime, period: currentPeriod, player_name: 'Pedido de Tempo' };
        setEvents(prev => [newEvent, ...prev]);
        setIsRunning(false);
        addToQueue('event', { event_type: 'timeout', team_id: teamId, minute: currentTime, period: currentPeriod, metadata: { system_period: currentPeriod } });
    };

    const confirmEvent = async (player: any) => {
        if (!matchData || !selectedTeam || !eventType) return;
        const teamId = selectedTeam === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);
        const newEvent = { id: 'temp-' + Date.now(), type: eventType, team: selectedTeam, time: currentTime, period: currentPeriod, player_name: player.name };
        setEvents(prev => [newEvent, ...prev]);
        if (eventType === 'goal') {
            setMatchData((prev: any) => ({ ...prev, scoreHome: selectedTeam === 'home' ? prev.scoreHome + 1 : prev.scoreHome, scoreAway: selectedTeam === 'away' ? prev.scoreAway + 1 : prev.scoreAway }));
        }
        if (eventType === 'suspension_2min') {
            setSuspensions(prev => ({ ...prev, [selectedTeam]: prev[selectedTeam] + 1 }));
            alert(`⚠️ ${player.name} suspenso por 2 minutos!`);
        }
        addToQueue('event', { event_type: eventType, team_id: teamId, minute: currentTime, period: currentPeriod, player_id: player.id, metadata: { system_period: currentPeriod } });
        setShowEventModal(false);
    };

    const handleDeleteEvent = async (eventId: any, type: string, team: 'home' | 'away') => {
        if (!window.confirm('Excluir este evento?')) return;
        try {
            await api.delete(`/admin/matches/${id}/events/${eventId}`);
            setEvents(prev => prev.filter(e => e.id !== eventId));
            if (type === 'goal') setMatchData((prev: any) => ({ ...prev, scoreHome: team === 'home' ? prev.scoreHome - 1 : prev.scoreHome, scoreAway: team === 'away' ? prev.scoreAway - 1 : prev.scoreAway }));
            if (type === 'suspension_2min') setSuspensions(prev => ({ ...prev, [team]: Math.max(0, prev[team] - 1) }));
        } catch (e) { alert('Erro ao excluir evento'); }
    };

    const handleFinish = async () => {
        if (!window.confirm('Encerrar partida completamente?')) return;
        addToQueue('finish', { home_score: matchData.scoreHome, away_score: matchData.scoreAway });
        registerSystemEvent('user_action', 'Finalizou partida via Handebol');
        navigate(-1);
    };

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner"></span></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-black text-white font-sans pb-20">


            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 pb-2 pt-4 sticky top-0 z-10 border-b border-purple-700 shadow-2xl">
                <div className="px-4 flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-black/30 rounded-full backdrop-blur"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="flex flex-col items-center relative">
                        {(!isOnline || pendingCount > 0) && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap">
                                {!isOnline ? (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 border border-red-500/50 rounded-full text-[8px] font-black text-red-500 animate-pulse uppercase">
                                        Offline
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-[8px] font-black text-yellow-500 uppercase">
                                        <RefreshCw size={10} className="animate-spin" /> {pendingCount}
                                    </div>
                                )}
                            </div>
                        )}
                        <span className="text-[10px] font-bold tracking-widest text-purple-200 uppercase">Handebol</span>
                    </div>
                    <button onClick={handlePeriodChange} className="px-4 py-2 bg-indigo-600 rounded-lg text-xs font-bold uppercase transition-colors">{currentPeriod === 'Fim' ? 'Finalizado' : 'Próximo Período'}</button>
                </div>
                <div className="flex items-center justify-center gap-2 px-2">
                    <div className="text-center flex-1">
                        <div className="text-5xl font-black font-mono leading-none mb-1 text-purple-100">{matchData.scoreHome}</div>
                        <h2 className="font-bold text-xs text-purple-200 truncate max-w-[100px] mx-auto">{matchData.home_team?.name}</h2>
                        {suspensions.home > 0 && <div className="mt-1 flex justify-center gap-1">{[...Array(suspensions.home)].map((_, i) => <div key={i} className="w-3 h-3 rounded bg-yellow-500 border border-black animate-pulse"></div>)}</div>}
                    </div>
                    <div className="flex flex-col items-center w-28 bg-black/50 backdrop-blur rounded-xl py-2 border border-purple-500/50">
                        <div onClick={() => setIsRunning(!isRunning)} className="cursor-pointer mb-1">{isRunning ? <Pause className="w-5 h-5 text-green-400 fill-current animate-pulse" /> : <Play className="w-5 h-5 text-gray-500 fill-current" />}</div>
                        <div className="text-3xl font-mono font-bold text-yellow-400 tracking-wider mb-1">{formatTime(time)}</div>
                        <div className="text-[9px] text-purple-300 uppercase font-bold px-2 py-0.5 bg-purple-900/50 rounded">{currentPeriod}</div>
                    </div>
                    <div className="text-center flex-1">
                        <div className="text-5xl font-black font-mono leading-none mb-1 text-purple-100">{matchData.scoreAway}</div>
                        <h2 className="font-bold text-xs text-purple-200 truncate max-w-[100px] mx-auto">{matchData.away_team?.name}</h2>
                        {suspensions.away > 0 && <div className="mt-1 flex justify-center gap-1">{[...Array(suspensions.away)].map((_, i) => <div key={i} className="w-3 h-3 rounded bg-yellow-500 border border-black animate-pulse"></div>)}</div>}
                    </div>
                </div>
            </div>

            <div className="p-2 sm:p-4 grid grid-cols-2 gap-2 sm:gap-4 max-w-4xl mx-auto">
                {[{ t: 'home', color: 'blue' }, { t: 'away', color: 'green' }].map(({ t, color }: any) => (
                    <div key={t} className={`bg-${color}-900/10 p-3 rounded-xl border border-${color}-900/30 space-y-2`}>
                        <button onClick={() => openEventModal(t, 'goal')} disabled={!isRunning} className={`w-full py-4 bg-${t === 'home' ? 'blue' : 'green'}-600 rounded-lg font-black text-xl border-b-4 border-${t === 'home' ? 'blue' : 'green'}-800 active:scale-95 disabled:opacity-50`}>GOL</button>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => openEventModal(t, 'yellow_card')} disabled={!isRunning} className="py-3 bg-yellow-500 text-black rounded-lg font-bold border-b-4 border-yellow-700 text-xs active:scale-95 disabled:opacity-50">🟨 Cartão</button>
                            <button onClick={() => openEventModal(t, 'red_card')} disabled={!isRunning} className="py-3 bg-red-600 rounded-lg font-bold border-b-4 border-red-800 text-xs active:scale-95 disabled:opacity-50">🟥 Cartão</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => openEventModal(t, 'suspension_2min')} disabled={!isRunning} className="py-2 bg-orange-600 rounded-lg font-bold text-[10px] active:scale-95 border-b-2 border-orange-800 disabled:opacity-50"><UserX size={14} /> 2min</button>
                            <button onClick={() => registerTimeout(t)} disabled={!isRunning} className="py-2 bg-gray-700 rounded-lg font-bold text-[10px] active:scale-95 border-b-2 border-gray-900 disabled:opacity-50"><Timer size={14} /> Tempo</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="px-4 mt-2 max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-2"><h3 className="text-xs font-bold text-purple-400 uppercase flex items-center gap-2"><Clock size={14} /> Linha do Tempo</h3><button onClick={handleFinish} className="text-xs text-red-500 underline font-bold">Encerrar Súmula</button></div>
                <div className="space-y-2 pb-20">
                    {events.map((ev, idx) => (
                        <div key={idx} className="bg-gray-800 p-2 sm:p-3 rounded-lg border border-gray-700 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`font-mono text-sm font-bold ${ev.team === 'home' ? 'text-blue-400' : 'text-green-400'} min-w-[30px]`}>{ev.time}'</div>
                                <div className="flex flex-col"><span className="font-bold text-sm uppercase">{ev.type}</span>{ev.player_name && <span className="text-xs text-gray-400">{ev.player_name}</span>}</div>
                            </div>
                            <div className="flex items-center gap-3"><span className="text-[9px] uppercase font-bold text-gray-600">{ev.period}</span><button onClick={() => handleDeleteEvent(ev.id, ev.type, ev.team)} className="p-1 px-2 text-gray-500 hover:text-red-500"><Trash2 size={16} /></button></div>
                        </div>
                    ))}
                </div>
            </div>

            {showEventModal && selectedTeam && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-800 w-full max-w-md sm:rounded-xl rounded-t-3xl border-t border-gray-700 overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 bg-indigo-600 border-b border-indigo-700 flex items-center justify-between"><h3 className="font-bold text-white">Selecione o Jogador</h3><button onClick={() => setShowEventModal(false)}><X size={20} /></button></div>
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {(selectedTeam === 'home' ? rosters.home : rosters.away).map((p: any) => (
                                <button key={p.id} onClick={() => confirmEvent(p)} className="w-full flex items-center justify-between p-3 hover:bg-gray-700 rounded-xl transition-colors border border-transparent hover:border-purple-500">
                                    <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-sm text-white">{p.number || '#'}</div><span className="font-medium text-left text-sm">{p.nickname || p.name}</span></div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
