import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import api from '../../services/api';
import { useOfflineResilience } from '../../hooks/useOfflineResilience';

// ─── ActionButton must be defined OUTSIDE the main component ──────────────────
// If defined inside, React sees a new component type every render (every second
// with the timer), causing full unmount+remount = the visual "trembling".
const ActionButton = memo(({ onClick, icon, label, colorClass }: {
    onClick: () => void;
    icon: string;
    label: string;
    colorClass: string;
}) => (
    <button
        onClick={onClick}
        className={`group flex flex-col items-center justify-center gap-2 py-5 bg-[#1a2234]/60 hover:bg-[#252d43] border border-white/5 rounded-[2rem] transition-all duration-300 active:scale-95 shadow-lg relative overflow-hidden`}
    >
        <div className={`p-3 rounded-2xl transition-all duration-500`} style={{ backgroundColor: 'transparent' }}>
            <Icon icon={icon} className={`w-7 h-7`} style={{ color: `var(--color-${colorClass})` }} />
        </div>
        <span className="text-[11px] font-black text-gray-400 group-hover:text-white uppercase tracking-[0.2em] transition-colors">{label}</span>
    </button>
));

// ─────────────────────────────────────────────────────────────────────────────

export function SumulaFutebol() {
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

    const [events, setEvents] = useState<any[]>([]);

    // 🛡️ Resilience Shield
    const { isOnline, addToQueue, pendingCount } = useOfflineResilience(id, 'Futebol', async (action, data) => {
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
    const [showCardTypeModal, setShowCardTypeModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
    const [eventType, setEventType] = useState<'goal' | 'yellow_card' | 'red_card' | 'blue_card' | 'assist' | 'foul' | 'mvp' | null>(null);
    const [isSelectingOwnGoal, setIsSelectingOwnGoal] = useState(false);
    const [confirmationEffect, setConfirmationEffect] = useState<string | null>(null);

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
                    if (serverTimer && serverTimer.currentPeriod && serverTimer.currentPeriod !== timerRef.current.currentPeriod) {
                        setCurrentPeriod(serverTimer.currentPeriod);
                        if (serverTimer.time !== undefined) setTime(serverTimer.time || 0);
                        if (serverTimer.isRunning !== undefined) setIsRunning(serverTimer.isRunning);
                    }
                    if (data.rosters) setRosters(data.rosters);
                }
                const history = (data.details?.events || []).map((e: any) => ({
                    id: e.id, type: e.type,
                    team: parseInt(e.team_id) === data.match.home_team_id ? 'home' : 'away',
                    time: e.minute, period: e.period,
                    player_name: e.player_name,
                    // Support both metadata key names for own goal
                    own_goal: e.metadata?.own_goal === true || e.metadata?.is_own_goal === true
                }));
                setEvents(history);
            }
        } catch (e) { console.error(e); } finally { if (isInitial) setLoading(false); }
    };

    useEffect(() => {
        if (!id) return;
        fetchMatchDetails(true);
        const syncInterval = setInterval(() => { if (!pendingCount || pendingCount === 0) fetchMatchDetails(); }, 5000);
        return () => clearInterval(syncInterval);
    }, [id, pendingCount]);

    useEffect(() => {
        let interval: any = null;
        if (isRunning && !currentPeriod.includes('Intervalo') && !currentPeriod.includes('Fim')) {
            interval = setInterval(() => setTime(t => t + 1), 1000);
            if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
                addToQueue('event', { event_type: 'match_start', team_id: matchData.home_team_id, minute: formatTime(timerRef.current.time), period: currentPeriod, metadata: { label: 'Início da Partida' } });
                setMatchData((prev: any) => ({ ...prev, status: 'live' }));
            }
        }
        return () => interval && clearInterval(interval);
    }, [isRunning, currentPeriod]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleNextPeriod = useCallback(() => {
        const periods = ['1º Tempo', 'Intervalo', '2º Tempo', 'Fim de Tempo Normal', 'Prorrogação', 'Fim'];
        const cur = timerRef.current;
        const currentIndex = periods.indexOf(cur.currentPeriod);
        if (currentIndex < periods.length - 1) {
            const nextPeriod = periods[currentIndex + 1];
            if (!window.confirm(`Mudar para: ${nextPeriod}?`)) return;

            setIsRunning(false);

            if (!nextPeriod.includes('Intervalo') && !nextPeriod.includes('Fim')) {
                setTime(0);
            }

            setCurrentPeriod(nextPeriod);

            addToQueue('event', {
                event_type: 'period_change',
                team_id: cur.matchData?.home_team_id,
                minute: formatTime(cur.time),
                period: nextPeriod,
                metadata: { label: `Mudança de Período: ${nextPeriod}`, timestamp: new Date().toISOString() }
            });

            if (isOnline) {
                api.patch(`/admin/matches/${id}`, {
                    match_details: { ...cur.matchData?.match_details, sync_timer: { time: 0, isRunning: false, currentPeriod: nextPeriod } }
                }).catch(() => { });
            }
        }
    }, [isOnline, id, addToQueue]);

    const handleEndCurrentTime = useCallback(() => {
        if (!window.confirm(`Encerrar o ${timerRef.current.currentPeriod}?`)) return;
        handleNextPeriod();
    }, [handleNextPeriod]);

    const handleEvent = useCallback((team: 'home' | 'away', type: any) => {
        setSelectedTeam(team);
        setEventType(type);
        setIsSelectingOwnGoal(false);
        if (type === 'card_selection') setShowCardTypeModal(true);
        else setShowEventModal(true);
    }, []);

    const confirmEvent = useCallback(async (player: any) => {
        const cur = timerRef.current;
        const type = eventType;
        const tid = selectedTeam === 'home' ? cur.matchData?.home_team_id : cur.matchData?.away_team_id;
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
        const newEvent = { id: 'temp-' + Date.now(), type, team: selectedTeam, time: formatTime(cur.time), period: cur.currentPeriod, player_name: pName, own_goal: isSelectingOwnGoal };
        setEvents(prev => [newEvent, ...prev]);
        addToQueue('event', { event_type: type, team_id: tid, player_id: player?.id || null, minute: formatTime(cur.time), period: cur.currentPeriod, metadata: { label: labelText, own_goal: isSelectingOwnGoal } });
        setShowEventModal(false);
        setEventType(null);
        setConfirmationEffect(selectedTeam);
        setTimeout(() => setConfirmationEffect(null), 1000);
    }, [eventType, selectedTeam, isSelectingOwnGoal, addToQueue]);

    const handleDeleteEvent = useCallback(async (eventId: any) => {
        if (!window.confirm("Cancelar lançamento?")) return;
        try { await api.delete(`/admin/matches/${id}/events/${eventId}`); fetchMatchDetails(); } catch (e) { alert("Erro ao excluir"); }
    }, [id]);

    const handleFinish = useCallback(async () => {
        if (!window.confirm('Encerrar partida?')) return;
        const cur = timerRef.current;
        addToQueue('finish', { home_score: cur.matchData?.scoreHome, away_score: cur.matchData?.scoreAway });
        navigate(-1);
    }, [addToQueue, navigate]);

    // Memoize scores to avoid recalculating on every timer tick
    const homeScore = useMemo(() =>
        events.filter(e => e.team === 'home' && e.type === 'goal' && !e.own_goal).length +
        events.filter(e => e.team === 'away' && e.type === 'goal' && e.own_goal).length,
        [events]
    );
    const awayScore = useMemo(() =>
        events.filter(e => e.team === 'away' && e.type === 'goal' && !e.own_goal).length +
        events.filter(e => e.team === 'home' && e.type === 'goal' && e.own_goal).length,
        [events]
    );

    if (loading || !matchData) return <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center text-white"><Icon icon="svg-spinners:ring-resize" className="text-blue-500 w-12 h-12" /></div>;

    const isPlayPeriod = !currentPeriod.includes('Intervalo') && !currentPeriod.includes('Fim');

    return (
        <div className="min-h-screen bg-[#0a0f18] text-gray-100 font-sans selection:bg-blue-500/30">
            {/* Minimal Sticky Header */}
            <div className="bg-[#111827]/80 backdrop-blur-xl p-3 sticky top-0 z-30 border-b border-white/5 shadow-2xl">
                <div className="flex items-center justify-between max-w-lg mx-auto gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => navigate(-1)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><Icon icon="heroicons-outline:arrow-left" className="w-6 h-6" /></button>
                        <div className="flex flex-col items-center gap-0.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500 animate-pulse'}`} />
                            {pendingCount > 0 && <span className="text-[9px] font-black text-orange-400 tabular-nums leading-none">+{pendingCount}</span>}
                        </div>
                    </div>

                    <div className="text-center flex flex-col items-center flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-emerald-400/80 mb-0.5">
                            <Icon icon="solar:bolt-bold" className={`w-4 h-4 shrink-0 ${isRunning ? "animate-pulse" : ""}`} />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] truncate">{currentPeriod}</span>
                        </div>
                        <div className="text-3xl font-mono font-black tabular-nums tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            {formatTime(time)}
                        </div>
                    </div>

                    <button
                        onClick={() => setIsRunning(r => !r)}
                        className={`shrink-0 p-4 rounded-3xl transition-colors shadow-2xl ${isRunning ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30' : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'}`}
                    >
                        <Icon icon={isRunning ? "heroicons-solid:pause" : "heroicons-solid:play"} className="w-8 h-8" />
                    </button>
                </div>
            </div>

            <div className="p-3 max-w-lg mx-auto space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    {/* Team Cards */}
                    {[
                        { t: 'home' as const, team: matchData.home_team, score: homeScore, color: 'blue' },
                        { t: 'away' as const, team: matchData.away_team, score: awayScore, color: 'emerald' }
                    ].map(({ t, team, score, color }) => (
                        <div key={t} className={`relative bg-[#111827]/40 rounded-[2.5rem] p-4 border border-white/5 flex flex-col items-center shadow-xl transition-all duration-500 ${confirmationEffect === t ? 'ring-2 ring-emerald-500/50 scale-[1.02]' : ''}`}>
                            <div className="absolute top-4 right-4"><Icon icon="solar:chart-bold" className="w-4 h-4 text-white/10" /></div>
                            <h2 className={`text-${color}-400 font-black text-[10px] uppercase tracking-[0.2em] mb-3 italic text-center w-full px-2 truncate`}>{team?.name}</h2>
                            <div className="text-6xl font-black text-white mb-6 drop-shadow-2xl tabular-nums w-16 text-center">{score}</div>

                            <div className="grid grid-cols-2 gap-2 w-full">
                                <ActionButton onClick={() => handleEvent(t, 'goal')} icon="solar:target-bold" label="Gol" colorClass={color === 'blue' ? 'emerald' : 'emerald'} />
                                <ActionButton onClick={() => handleEvent(t, 'assist')} icon="solar:users-group-rounded-bold" label="Asst" colorClass="blue" />
                                <ActionButton onClick={() => handleEvent(t, 'foul')} icon="solar:danger-bold" label="Falta" colorClass="gray" />
                                <ActionButton onClick={() => handleEvent(t, 'card_selection')} icon="solar:card-bold" label="Card" colorClass="orange" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3">
                    {isRunning && isPlayPeriod ? (
                        <button onClick={handleEndCurrentTime} className="flex-1 py-4 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-500/30 rounded-3xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                            Encerrar Tempo <Icon icon="heroicons-solid:stop" className="w-4 h-4" />
                        </button>
                    ) : (
                        <button onClick={handleNextPeriod} className="flex-1 py-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-3xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-2">
                            {currentPeriod.includes('Fim') ? 'Partida Encerrada' : 'Próximo Período'} <Icon icon="heroicons-solid:chevron-right" className="w-4 h-4" />
                        </button>
                    )}

                    <button onClick={() => { setEventType('mvp'); setShowTeamModal(true); }} className="px-6 py-4 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-3xl font-black uppercase text-xs transition-all flex items-center gap-2">
                        <Icon icon="solar:cup-star-bold" className="w-6 h-6" />
                    </button>
                    <button onClick={handleFinish} className="px-5 py-4 bg-red-500/5 hover:bg-red-500/10 text-red-500/60 border border-red-500/20 rounded-3xl font-black uppercase text-[10px] transition-all">
                        Salvar
                    </button>
                </div>

                {/* History */}
                <div className="bg-[#111827]/30 rounded-[2rem] p-5 border border-white/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-gray-500 flex items-center gap-2 px-1"><Icon icon="solar:clock-circle-bold" className="w-4 h-4" /> Timeline</h3>
                    </div>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {events.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 opacity-20"><Icon icon="solar:history-bold" className="w-12 h-12 mb-2" /></div>
                        ) : events.map((ev: any) => (
                            <div key={ev.id} className="group flex items-center justify-between p-3 rounded-2xl bg-[#1a2234]/40 border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 shrink-0 rounded-xl bg-black/20 flex items-center justify-center text-[10px] font-black text-gray-500 group-hover:text-blue-400 transition-colors tabular-nums">{ev.time}</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.team === 'home' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                                            <span className="text-xs font-black uppercase tracking-wide text-gray-200">{ev.player_name}</span>
                                            {ev.own_goal && ev.type === 'goal' && <span className="text-[9px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20">Contra</span>}
                                        </div>
                                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">{ev.type} • {ev.period}</div>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteEvent(ev.id)} className="p-2 text-gray-700 hover:text-red-500 transition-colors"><Icon icon="solar:trash-bin-trash-bold" className="w-5 h-5" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Team Selection Modal */}
            {showTeamModal && (
                <div className="fixed inset-0 bg-[#0a0f18]/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#111827] w-full max-w-sm rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 text-center pb-2">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-4">Escolha o Time</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Ação: {eventType}</p>
                        </div>
                        <div className="p-8 grid grid-cols-1 gap-4">
                            <button onClick={() => { setSelectedTeam('home'); setShowTeamModal(false); setShowEventModal(true); }}
                                className="py-6 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-2xl font-black uppercase text-sm tracking-widest transition-all">
                                {matchData.home_team?.name}
                            </button>
                            <button onClick={() => { setSelectedTeam('away'); setShowTeamModal(false); setShowEventModal(true); }}
                                className="py-6 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded-2xl font-black uppercase text-sm tracking-widest transition-all">
                                {matchData.away_team?.name}
                            </button>
                            <button onClick={() => setShowTeamModal(false)} className="py-4 text-gray-500 font-black uppercase tracking-widest text-[10px]">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Card Selection Modal */}
            {showCardTypeModal && (
                <div className="fixed inset-0 bg-[#0a0f18]/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#111827] w-full max-w-sm rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl transform transition-all animate-in fade-in zoom-in duration-300">
                        <div className="p-8 text-center pb-2">
                            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">Selecione o Cartão</h3>
                        </div>
                        <div className="p-8 grid grid-cols-1 gap-4">
                            {[
                                { t: 'yellow_card', label: 'Amarelo', color: 'bg-yellow-500', text: 'text-black', icon: 'solar:card-bold' },
                                { t: 'blue_card', label: 'Azul', color: 'bg-blue-400', text: 'text-black', icon: 'solar:card-bold' },
                                { t: 'red_card', label: 'Vermelho', color: 'bg-red-600', text: 'text-white', icon: 'solar:card-bold' }
                            ].map(card => (
                                <button key={card.t} onClick={() => { setEventType(card.t as any); setShowCardTypeModal(false); setShowEventModal(true); }}
                                    className={`py-8 ${card.color} ${card.text} rounded-[2rem] font-black uppercase text-xl shadow-2xl transition-all active:scale-95 flex items-center justify-between px-10 group`}>
                                    <div className="flex items-center gap-4">
                                        <Icon icon={card.icon} className="w-8 h-8" />
                                        {card.label}
                                    </div>
                                    <Icon icon="heroicons-solid:chevron-right" className="w-6 h-6 opacity-30 group-hover:translate-x-2 transition-transform" />
                                </button>
                            ))}
                            <button onClick={() => setShowCardTypeModal(false)} className="py-4 mt-2 text-gray-500 font-black uppercase tracking-widest text-[10px]">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Player Selection Modal */}
            {showEventModal && (
                <div className="fixed inset-0 bg-[#0a0f18]/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#111827] w-full max-w-lg rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl max-h-[90vh] flex flex-col transform transition-all animate-in fade-in fill-mode-both duration-300 translate-y-0">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2234]/30">
                            <div>
                                <h3 className="font-black uppercase tracking-tighter text-2xl italic text-white flex items-center gap-3">
                                    <span className={`w-2 h-8 ${selectedTeam === 'home' ? 'bg-blue-500' : 'bg-emerald-500'} rounded-full`} />
                                    {eventType}
                                </h3>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{selectedTeam === 'home' ? matchData.home_team?.name : matchData.away_team?.name}</p>
                            </div>
                            <button onClick={() => setShowEventModal(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><Icon icon="heroicons-solid:x" className="w-6 h-6" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                            {eventType === 'goal' && (
                                <button onClick={() => setIsSelectingOwnGoal(v => !v)} className={`w-full py-5 mb-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${isSelectingOwnGoal ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                                    <Icon icon="solar:info-circle-bold" className="w-5 h-5" />
                                    {isSelectingOwnGoal ? 'SELECIONANDO GOL CONTRA' : 'MODO GOL CONTRA'}
                                </button>
                            )}

                            <div className="space-y-2">
                                {(selectedTeam === 'home' ? rosters.home : rosters.away)
                                    .sort((a: any, b: any) => (parseInt(a.pivot?.number || a.number || 0)) - (parseInt(b.pivot?.number || b.number || 0)))
                                    .map((p: any) => (
                                        <button key={p.id} onClick={() => confirmEvent(p)} className="w-full group px-6 py-4 bg-[#1a2234]/60 hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/50 rounded-2xl transition-all duration-300 flex items-center justify-between text-left">
                                            <div className="flex items-center gap-5">
                                                <div className="w-10 h-10 shrink-0 rounded-xl bg-black/40 flex items-center justify-center text-lg font-black text-white group-hover:text-blue-400 group-hover:scale-110 transition-all tabular-nums">
                                                    {p.pivot?.number || p.number || '#'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black uppercase tracking-wide text-gray-100 group-hover:text-white transition-colors">{p.name}</div>
                                                    {p.nickname && <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-blue-300/50 transition-colors">{p.nickname}</div>}
                                                </div>
                                            </div>
                                            <Icon icon="heroicons-solid:chevron-right" className="w-5 h-5 text-gray-700 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}

                                <button onClick={() => confirmEvent(null)} className="w-full py-5 mt-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase text-gray-500 hover:text-white tracking-[0.2em] text-[10px] transition-all border border-dashed border-white/10 flex items-center justify-center gap-3">
                                    <Icon icon="solar:users-group-rounded-bold" className="w-5 h-5" /> EQUIPE / OUTRO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
