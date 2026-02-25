import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Timer, Trophy, Award, AlertCircle, Clock, AlertOctagon, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useOfflineResilience } from '../../hooks/useOfflineResilience';

type EventType = 'takedown' | 'guard_pass' | 'mount' | 'back_control' | 'knee_on_belly' | 'sweep' | 'advantage' | 'penalty' | 'submission';

export function SumulaJiuJitsu() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });
    const [serverTimerLoaded, setServerTimerLoaded] = useState(false);

    // Timer State
    const [time, setTime] = useState(300);
    const [isRunning, setIsRunning] = useState(false);
    const [finished, setFinished] = useState(false);

    // Score State
    const [points, setPoints] = useState({ home: 0, away: 0 });
    const [advantages, setAdvantages] = useState({ home: 0, away: 0 });
    const [penalties, setPenalties] = useState({ home: 0, away: 0 });
    const [events, setEvents] = useState<any[]>([]);

    const pointsMap: Record<string, number> = {
        'takedown': 2, 'guard_pass': 3, 'mount': 4, 'back_control': 4, 'knee_on_belly': 2, 'sweep': 2
    };

    // 🛡️ Resilience Shield
    const { isOnline, syncing, addToQueue, registerSystemEvent, pendingCount } = useOfflineResilience(id, 'JiuJitsu', async (action, data) => {
        let url = '';
        switch (action) {
            case 'event': url = `/admin/matches/${id}/events`; break;
            case 'finish': url = `/admin/matches/${id}/finish`; break;
            case 'patch_match': url = `/admin/matches/${id}`; return await api.patch(url, data);
        }
        if (url) return await api.post(url, data);
    });

    const stateRef = useRef({ time, isRunning, matchData, points, advantages, penalties });
    useEffect(() => {
        stateRef.current = { time, isRunning, matchData, points, advantages, penalties };
    }, [time, isRunning, matchData, points, advantages, penalties]);

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
                        setTime(st.time || 300);
                        setIsRunning(st.isRunning || false);
                        setServerTimerLoaded(true);
                    }
                    if (data.rosters) setRosters(data.rosters);
                    const history = (data.details?.events || []).map((e: any) => ({
                        id: e.id, type: e.type, team: parseInt(e.team_id) === data.match.home_team_id ? 'home' : 'away',
                        time: e.minute, player_name: e.player_name, value: e.value || 0
                    }));
                    setEvents(history);
                    const homeP = history.filter((e: any) => e.team === 'home' && pointsMap[e.type]).reduce((acc, curr) => acc + (pointsMap[curr.type] || 0), 0);
                    const awayP = history.filter((e: any) => e.team === 'away' && pointsMap[e.type]).reduce((acc, curr) => acc + (pointsMap[curr.type] || 0), 0);
                    const homeA = history.filter((e: any) => e.team === 'home' && e.type === 'advantage').length;
                    const awayA = history.filter((e: any) => e.team === 'away' && e.type === 'advantage').length;
                    const homePen = history.filter((e: any) => e.team === 'home' && e.type === 'penalty').length;
                    const awayPen = history.filter((e: any) => e.team === 'away' && e.type === 'penalty').length;
                    setPoints({ home: homeP, away: awayP });
                    setAdvantages({ home: homeA, away: awayA });
                    setPenalties({ home: homePen, away: awayPen });
                } else {
                    const st = data.match.match_details?.sync_timer;
                    if (st && st.updated_at > (stateRef.current.matchData?.match_details?.sync_timer?.updated_at || 0)) {
                        if (!stateRef.current.isRunning) setTime(st.time);
                    }
                }
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
        const interval = setInterval(() => fetchMatchDetails(), 3000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        let interval: any = null;
        if (isRunning && time > 0) {
            if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
                registerSystemEvent('match_start', 'Iniciado!');
            }
            interval = setInterval(() => setTime(t => t <= 1 ? (setIsRunning(false), setFinished(true), 0) : t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, time, matchData]);

    useEffect(() => {
        if (!id || !isOnline || finished) return;
        const pingInterval = setInterval(async () => {
            const { time: t, isRunning: r, matchData: md } = stateRef.current;
            if (!md) return;
            try {
                addToQueue('patch_match', { match_details: { ...md.match_details, sync_timer: { time: t, isRunning: r, updated_at: Date.now() } } });
            } catch (e) { }
        }, 5000);
        return () => clearInterval(pingInterval);
    }, [id, isOnline, finished]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const registerEvent = (team: 'home' | 'away', eventType: EventType) => {
        if (finished || !matchData) return;
        const teamId = team === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);
        let pointsValue = 0;

        if (eventType === 'submission') {
            setFinished(true);
            const newEv = { id: Date.now(), type: 'submission', team, time: currentTime, player_name: 'Finalização', value: 0 };
            setEvents(prev => [newEv, ...prev]);
            addToQueue('event', { event_type: 'submission', team_id: teamId, minute: currentTime, value: 0 });
            return;
        }

        if (eventType === 'advantage') setAdvantages(p => ({ ...p, [team]: p[team] + 1 }));
        else if (eventType === 'penalty') {
            setPenalties(p => ({ ...p, [team]: p[team] + 1 }));
            if (penalties[team] + 1 >= 4) {
                const opp = team === 'home' ? 'away' : 'home';
                setPoints(p => ({ ...p, [opp]: p[opp] + 2 }));
            }
        } else {
            pointsValue = pointsMap[eventType] || 0;
            setPoints(p => ({ ...p, [team]: p[team] + pointsValue }));
        }

        const newEv = { id: Date.now(), type: eventType, team, time: currentTime, player_name: eventType === 'advantage' ? 'Vantagem' : eventType === 'penalty' ? 'Penalidade' : `+${pointsValue} pts`, value: pointsValue };
        setEvents(prev => [newEv, ...prev]);

        if (pointsValue > 0) {
            setMatchData((p: any) => ({ ...p, scoreHome: team === 'home' ? points.home + pointsValue : p.scoreHome, scoreAway: team === 'away' ? points.away + pointsValue : p.scoreAway }));
        }

        addToQueue('event', { event_type: eventType, team_id: teamId, minute: currentTime, value: pointsValue });
    };

    const handleFinish = async () => {
        if (!window.confirm('Encerrar luta?')) return;
        registerSystemEvent('match_end', 'Encerrada!');
        addToQueue('finish', { home_score: points.home, away_score: points.away });
        navigate(-1);
    };

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner"></span></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-zinc-900 to-black text-white font-sans pb-20">
            {!isOnline && (
                <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] font-bold py-1 px-4 z-[9999] flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2"><AlertOctagon size={12} className="animate-pulse" /><span>SISTEMA OFFLINE</span></div>
                    <span>{pendingCount} PENDENTES</span>
                </div>
            )}
            {isOnline && pendingCount > 0 && (
                <div className="fixed top-0 left-0 w-full bg-yellow-600 text-white text-[10px] font-bold py-1 px-4 z-[9999] flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2"><RefreshCw size={12} className="animate-spin" /><span>SINCRONIZANDO...</span></div>
                    <span>{pendingCount} RESTANTES</span>
                </div>
            )}

            <div className="bg-gradient-to-r from-amber-700 to-yellow-700 pb-3 pt-4 sticky top-0 z-10 border-b border-amber-800 shadow-2xl">
                <div className="px-4 flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-black/30 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2"><Award className="w-6 h-6 text-yellow-200" /><span className="text-[11px] font-bold tracking-widest uppercase">Jiu-Jitsu</span></div>
                    </div>
                    <button onClick={() => setIsRunning(!isRunning)} disabled={finished} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${isRunning ? 'bg-red-600' : 'bg-green-600'}`}>{isRunning ? 'Pausar' : 'Iniciar'}</button>
                </div>

                <div className="px-4 mb-3 flex justify-center max-w-lg mx-auto">
                    <div className="bg-black/50 backdrop-blur rounded-2xl px-10 py-4 border-2 border-amber-500/50">
                        <div className={`text-6xl font-black font-mono ${time < 60 ? 'text-red-400 animate-pulse' : 'text-yellow-300'}`}>{formatTime(time)}</div>
                    </div>
                </div>

                <div className="px-4 max-w-lg mx-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/30 backdrop-blur rounded-xl p-3 border border-amber-500/30 text-center">
                            <div className="text-5xl font-black text-white mb-1">{points.home}</div>
                            <div className="text-[10px] font-bold text-amber-200 truncate">{matchData.home_team?.name}</div>
                            <div className="flex justify-center gap-3 mt-2 text-[8px] font-black uppercase">
                                <div className="text-green-400">Vant: {advantages.home}</div>
                                <div className="text-red-400">Pen: {penalties.home}</div>
                            </div>
                        </div>
                        <div className="bg-black/30 backdrop-blur rounded-xl p-3 border border-amber-500/30 text-center">
                            <div className="text-5xl font-black text-white mb-1">{points.away}</div>
                            <div className="text-[10px] font-bold text-amber-200 truncate">{matchData.away_team?.name}</div>
                            <div className="flex justify-center gap-3 mt-2 text-[8px] font-black uppercase">
                                <div className="text-green-400">Vant: {advantages.away}</div>
                                <div className="text-red-400">Pen: {penalties.away}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-3 grid grid-cols-2 gap-4 max-w-5xl mx-auto">
                {['home', 'away'].map((team: any) => (
                    <div key={team} className="space-y-2">
                        <div className="text-center text-[10px] font-black text-amber-300 uppercase truncate mb-2">{matchData[team + '_team']?.name}</div>
                        <button onClick={() => registerEvent(team, 'takedown')} className="w-full py-3 bg-blue-700 rounded-xl font-black text-xs border-b-4 border-blue-900 active:scale-95 shadow-lg">QUEDA</button>
                        <button onClick={() => registerEvent(team, 'sweep')} className="w-full py-3 bg-blue-700 rounded-xl font-black text-xs border-b-4 border-blue-900 active:scale-95 shadow-lg">RASPAGEM</button>
                        <button onClick={() => registerEvent(team, 'guard_pass')} className="w-full py-3 bg-indigo-700 rounded-xl font-black text-xs border-b-4 border-indigo-900 active:scale-95 shadow-lg">PASSAGEM</button>
                        <button onClick={() => registerEvent(team, 'mount')} className="w-full py-3 bg-purple-700 rounded-xl font-black text-xs border-b-4 border-purple-900 active:scale-95 shadow-lg">MONTADA</button>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => registerEvent(team, 'advantage')} className="py-3 bg-green-700 rounded-xl font-black text-[10px] border-b-4 border-green-900 active:scale-95 shadow-lg">+ VANT</button>
                            <button onClick={() => registerEvent(team, 'penalty')} className="py-3 bg-red-800 rounded-xl font-black text-[10px] border-b-4 border-red-950 active:scale-95 shadow-lg">+ PEN</button>
                        </div>
                        <button onClick={() => registerEvent(team, 'submission')} className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-700 rounded-2xl font-black text-sm border-b-4 border-orange-900 active:scale-95 shadow-xl mt-4">🏆 FINALIZAÇÃO</button>
                    </div>
                ))}
            </div>

            <div className="px-4 mt-6 max-w-5xl mx-auto space-y-4">
                <div className="flex items-center justify-between"><h3 className="text-xs font-black uppercase flex items-center gap-2"><Clock size={14} /> Timeline</h3><button onClick={handleFinish} className="text-[10px] font-black uppercase text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">Finalizar</button></div>
                <div className="space-y-2 pb-20">
                    {events.map((ev, idx) => (
                        <div key={idx} className="bg-gray-800/80 p-3 rounded-xl border border-gray-700 flex items-center justify-between text-[11px] shadow-lg">
                            <div className="flex items-center gap-3"><div className={`font-black font-mono w-10 ${ev.team === 'home' ? 'text-blue-400' : 'text-green-400'}`}>{ev.time}</div><div className="font-bold uppercase tracking-tight">{ev.type} - {ev.player_name}</div></div>
                        </div>
                    ))}
                    {events.length === 0 && <div className="text-center text-gray-600 py-10 text-[10px] font-black uppercase tracking-widest">Nenhuma ação registrada</div>}
                </div>
            </div>
        </div>
    );
}
