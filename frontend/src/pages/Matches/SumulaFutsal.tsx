import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import api from '../../services/api';
import { useOfflineResilience } from '../../hooks/useOfflineResilience';

// ActionButton FORA do componente — evita remontagem a cada segundo do timer (causa do tremor)
const ActionButton = memo(({ onClick, icon, label }: { onClick: () => void; icon: string; label: string }) => (
    <button onClick={onClick} className="group flex flex-col items-center justify-center gap-2 py-5 bg-[#1a2234]/60 hover:bg-[#252d43] border border-white/5 rounded-[2rem] transition-all duration-300 active:scale-95 shadow-lg">
        <div className="p-3 rounded-2xl"><Icon icon={icon} className="w-7 h-7 text-gray-400 group-hover:text-white transition-colors" /></div>
        <span className="text-[11px] font-black text-gray-400 group-hover:text-white uppercase tracking-[0.2em] transition-colors">{label}</span>
    </button>
));

// FoulDots fora do componente — no futsal 5 faltas = tiro livre direto (regra oficial)
const FoulDots = memo(({ count }: { count: number }) => {
    const hasFreekick = count >= 5;
    return (
        <div className="flex flex-col items-center gap-1 w-full">
            <div className="flex justify-center gap-1">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full border ${i < count ? (i >= 5 ? 'bg-orange-500 border-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.7)]' : 'bg-red-500 border-red-400') : 'bg-gray-800 border-gray-700'}`} />
                ))}
            </div>
            {hasFreekick && (
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${count >= 6 ? 'text-orange-300 bg-orange-500/20 animate-pulse' : 'text-amber-300 bg-amber-500/20'}`}>
                    {count >= 6 ? '⚡ TIRO LIVRE DIRETO' : '⚠️ TIRO LIVRE'}
                </span>
            )}
            <span className="text-[9px] text-gray-600 font-bold">{count} falta{count !== 1 ? 's' : ''}</span>
        </div>
    );
});

export function SumulaFutsal() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });
    const [serverTimerLoaded, setServerTimerLoaded] = useState(false);
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [currentPeriod, setCurrentPeriod] = useState<string>('1º Tempo');
    const [fouls, setFouls] = useState({ home: 0, away: 0 });
    const [events, setEvents] = useState<any[]>([]);

    const { isOnline, addToQueue, pendingCount } = useOfflineResilience(id, 'Futsal', async (action, data) => {
        let url = ''; switch (action) {
            case 'event': url = `/admin/matches/${id}/events`; break;
            case 'finish': url = `/admin/matches/${id}/finish`; break;
            case 'patch_match': url = `/admin/matches/${id}`; return await api.patch(url, data);
        } if (url) return await api.post(url, data);
    });

    const [showEventModal, setShowEventModal] = useState(false);
    const [showCardTypeModal, setShowCardTypeModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
    const [eventType, setEventType] = useState<any>(null);
    const [isSelectingOwnGoal, setIsSelectingOwnGoal] = useState(false);
    const [confirmationEffect, setConfirmationEffect] = useState<string | null>(null);

    const timerRef = useRef({ time, isRunning, currentPeriod, matchData });
    const lastLocalUpdateAt = useRef<number>(0);
    useEffect(() => { timerRef.current = { time, isRunning, currentPeriod, matchData }; }, [time, isRunning, currentPeriod, matchData]);

    const calcFoulsForPeriod = (history: any[], period: string) => {
        let relevantPeriods: string[];
        if (period === '1º Tempo' || period === 'Intervalo') relevantPeriods = ['1º Tempo'];
        else if (period === '2º Tempo' || period === 'Fim de Tempo Normal') relevantPeriods = ['2º Tempo'];
        else relevantPeriods = [period];
        return {
            home: history.filter((e: any) => e.team === 'home' && e.type === 'foul' && relevantPeriods.includes(e.period)).length,
            away: history.filter((e: any) => e.team === 'away' && e.type === 'foul' && relevantPeriods.includes(e.period)).length,
        };
    };

    const fetchMatchDetails = async (isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            const res = await api.get(`/admin/matches/${id}/full-details`);
            const data = res.data;
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
                    const st = data.match.match_details?.sync_timer;
                    if (st?.currentPeriod && st.currentPeriod !== timerRef.current.currentPeriod && Date.now() - lastLocalUpdateAt.current > 5000) {
                        setCurrentPeriod(st.currentPeriod);
                        if (st.time !== undefined) setTime(st.time || 0);
                        if (st.isRunning !== undefined) setIsRunning(st.isRunning);
                    }
                    if (data.rosters) setRosters(data.rosters);
                }
                const history = (data.details?.events || []).map((e: any) => ({
                    id: e.id, type: e.type, team: parseInt(e.team_id) === data.match.home_team_id ? 'home' : 'away',
                    time: e.minute, period: e.period, player_name: e.player_name,
                    own_goal: e.metadata?.own_goal === true || e.metadata?.is_own_goal === true,
                }));
                setEvents(history);
                const activePeriod = data.match.match_details?.sync_timer?.currentPeriod || timerRef.current.currentPeriod;
                setFouls(calcFoulsForPeriod(history, activePeriod));
            }
        } catch (e) { console.error(e); } finally { if (isInitial) setLoading(false); }
    };

    useEffect(() => {
        if (!id) return;
        fetchMatchDetails(true);
        const si = setInterval(() => { if (!pendingCount || pendingCount === 0) fetchMatchDetails(); }, 5000);
        return () => clearInterval(si);
    }, [id, pendingCount]);

    useEffect(() => {
        let iv: any = null;
        if (isRunning && !currentPeriod.includes('Intervalo') && !currentPeriod.includes('Fim')) {
            iv = setInterval(() => setTime(t => t + 1), 1000);
            if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
                addToQueue('event', { event_type: 'match_start', team_id: matchData.home_team_id, minute: formatTime(timerRef.current.time), period: currentPeriod, metadata: { label: 'Início da Partida' } });
                setMatchData((p: any) => ({ ...p, status: 'live' }));
            }
        }
        return () => iv && clearInterval(iv);
    }, [isRunning, currentPeriod]);

    const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

    const handleNextPeriod = useCallback(() => {
        if (Date.now() - lastLocalUpdateAt.current < 2000) return;
        lastLocalUpdateAt.current = Date.now();
        const periods = ['1º Tempo', 'Intervalo', '2º Tempo', 'Fim de Tempo Normal', 'Prorrogação', 'Fim'];
        const cur = timerRef.current;
        const idx = periods.indexOf(cur.currentPeriod);
        if (idx < periods.length - 1) {
            const next = periods[idx + 1];
            if (!window.confirm(`Mudar para: ${next}?`)) return;
            setIsRunning(false);
            if (!next.includes('Intervalo') && !next.includes('Fim')) { setTime(0); setFouls({ home: 0, away: 0 }); }
            setCurrentPeriod(next);
            addToQueue('event', { event_type: 'period_change', team_id: cur.matchData?.home_team_id, minute: formatTime(cur.time), period: next, metadata: { label: `Mudança de Período: ${next}`, timestamp: new Date().toISOString() } });
            addToQueue('patch_match', { match_details: { ...cur.matchData?.match_details, sync_timer: { time: 0, isRunning: false, currentPeriod: next } } });
        }
    }, [isOnline, id, addToQueue]);

    const handleEndCurrentTime = useCallback(() => {
        if (!window.confirm(`Encerrar o ${timerRef.current.currentPeriod}?`)) return;
        handleNextPeriod();
    }, [handleNextPeriod]);

    // Falta direta: no futsal a partir de 5 faltas por tempo = tiro livre direto
    const handleFoul = useCallback((team: 'home' | 'away') => {
        const cur = timerRef.current;
        const tid = team === 'home' ? cur.matchData?.home_team_id : cur.matchData?.away_team_id;
        const currentFouls = fouls[team];
        const isFreekick = currentFouls >= 5;
        const label = isFreekick ? 'Tiro Livre Direto: Equipe' : 'Falta: Equipe';
        const newEvent = { id: 'temp-' + Date.now(), type: 'foul', team, time: formatTime(cur.time), period: cur.currentPeriod, player_name: isFreekick ? 'Tiro Livre' : 'Equipe', own_goal: false };
        setEvents(prev => [newEvent, ...prev]);
        setFouls(prev => ({ ...prev, [team]: prev[team] + 1 }));
        addToQueue('event', { event_type: 'foul', team_id: tid, player_id: null, minute: formatTime(cur.time), period: cur.currentPeriod, metadata: { label, own_goal: false, is_freekick: isFreekick } });
        setConfirmationEffect(team);
        setTimeout(() => setConfirmationEffect(null), 800);
    }, [fouls, addToQueue]);

    const handleEvent = useCallback((team: 'home' | 'away', type: any) => {
        setSelectedTeam(team); setEventType(type); setIsSelectingOwnGoal(false);
        if (type === 'card_selection') setShowCardTypeModal(true);
        else setShowEventModal(true);
    }, []);

    const confirmEvent = useCallback(async (player: any) => {
        const cur = timerRef.current; const type = eventType;
        const tid = selectedTeam === 'home' ? cur.matchData?.home_team_id : cur.matchData?.away_team_id;
        const pName = player ? (player.nickname || player.name) : 'Equipe';
        const labelMap: Record<string, string> = { goal: isSelectingOwnGoal ? `Gol Contra: ${pName}` : `Gol: ${pName}`, yellow_card: `Cartão Amarelo: ${pName}`, red_card: `Cartão Vermelho: ${pName}`, blue_card: `Cartão Azul: ${pName}`, assist: `Assistência: ${pName}`, mvp: `Melhor em Campo: ${pName}` };
        const newEv = { id: 'temp-' + Date.now(), type, team: selectedTeam, time: formatTime(cur.time), period: cur.currentPeriod, player_name: pName, own_goal: isSelectingOwnGoal };
        setEvents(prev => [newEv, ...prev]);
        addToQueue('event', { event_type: type, team_id: tid, player_id: player?.id || null, minute: formatTime(cur.time), period: cur.currentPeriod, metadata: { label: labelMap[type] || type, own_goal: isSelectingOwnGoal } });
        setShowEventModal(false); setEventType(null);
        setConfirmationEffect(selectedTeam); setTimeout(() => setConfirmationEffect(null), 1000);
    }, [eventType, selectedTeam, isSelectingOwnGoal, addToQueue]);

    const handleDeleteEvent = useCallback(async (evId: any) => {
        if (!window.confirm("Cancelar lançamento?")) return;
        try { await api.delete(`/admin/matches/${id}/events/${evId}`); fetchMatchDetails(); } catch { alert("Erro ao excluir"); }
    }, [id]);

    const handleFinish = useCallback(async () => {
        if (!window.confirm('Encerrar partida?')) return;
        const cur = timerRef.current;
        addToQueue('finish', { home_score: cur.matchData?.scoreHome, away_score: cur.matchData?.scoreAway });
        navigate(-1);
    }, [addToQueue, navigate]);

    const homeScore = useMemo(() => events.filter(e => e.team === 'home' && e.type === 'goal' && !e.own_goal).length + events.filter(e => e.team === 'away' && e.type === 'goal' && e.own_goal).length, [events]);
    const awayScore = useMemo(() => events.filter(e => e.team === 'away' && e.type === 'goal' && !e.own_goal).length + events.filter(e => e.team === 'home' && e.type === 'goal' && e.own_goal).length, [events]);

    if (loading || !matchData) return <div className="min-h-screen bg-[#0a0f18] flex items-center justify-center"><Icon icon="svg-spinners:ring-resize" className="text-emerald-500 w-12 h-12" /></div>;
    const isPlayPeriod = !currentPeriod.includes('Intervalo') && !currentPeriod.includes('Fim');

    return (
        <div className="min-h-screen bg-[#0a0f18] text-gray-100 font-sans">
            {/* Header */}
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
                        <div className="text-3xl font-mono font-black tabular-nums tracking-tighter text-white">{formatTime(time)}</div>
                    </div>
                    <button onClick={() => setIsRunning(r => !r)} className={`shrink-0 p-4 rounded-3xl transition-colors shadow-2xl ${isRunning ? 'bg-orange-600/20 text-orange-400 border border-orange-500/30' : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'}`}>
                        <Icon icon={isRunning ? "heroicons-solid:pause" : "heroicons-solid:play"} className="w-8 h-8" />
                    </button>
                </div>
            </div>

            <div className="p-3 max-w-lg mx-auto space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    {[{ t: 'home' as const, team: matchData.home_team, score: homeScore, foulCount: fouls.home, color: 'blue' },
                    { t: 'away' as const, team: matchData.away_team, score: awayScore, foulCount: fouls.away, color: 'emerald' }
                    ].map(({ t, team, score, foulCount, color }) => (
                        <div key={t} className={`relative bg-[#111827]/40 rounded-[2.5rem] p-4 border border-white/5 flex flex-col items-center shadow-xl transition-all duration-500 ${confirmationEffect === t ? 'ring-2 ring-emerald-500/50 scale-[1.02]' : ''}`}>
                            <h2 className={`text-${color}-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2 italic text-center w-full px-2 truncate`}>{team?.name}</h2>
                            <div className="text-6xl font-black text-white mb-3 drop-shadow-2xl tabular-nums w-16 text-center">{score}</div>

                            {/* Contador de faltas por tempo */}
                            <div className="w-full mb-3 px-1">
                                <FoulDots count={foulCount} />
                            </div>

                            <div className="grid grid-cols-2 gap-2 w-full">
                                <ActionButton onClick={() => handleEvent(t, 'goal')} icon="solar:target-bold" label="Gol" />
                                <ActionButton onClick={() => handleEvent(t, 'assist')} icon="solar:users-group-rounded-bold" label="Asst" />
                                <ActionButton onClick={() => handleFoul(t)} icon="solar:danger-bold" label="Falta" />
                                <ActionButton onClick={() => handleEvent(t, 'card_selection')} icon="solar:card-bold" label="Card" />
                            </div>
                        </div>
                    ))}
                </div>

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
                    <button onClick={() => { setEventType('mvp'); setShowTeamModal(true); }} className="px-6 py-4 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-3xl transition-all">
                        <Icon icon="solar:cup-star-bold" className="w-6 h-6" />
                    </button>
                    <button onClick={handleFinish} className="px-5 py-4 bg-red-500/5 hover:bg-red-500/10 text-red-500/60 border border-red-500/20 rounded-3xl font-black uppercase text-[10px] transition-all">Salvar</button>
                </div>

                {/* Timeline */}
                <div className="bg-[#111827]/30 rounded-[2rem] p-5 border border-white/5">
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-gray-500 flex items-center gap-2 mb-4"><Icon icon="solar:clock-circle-bold" className="w-4 h-4" /> Timeline</h3>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {events.length === 0 ? <div className="flex items-center justify-center py-10 opacity-20"><Icon icon="solar:history-bold" className="w-12 h-12" /></div>
                            : events.map((ev: any) => (
                                <div key={ev.id} className="group flex items-center justify-between p-3 rounded-2xl bg-[#1a2234]/40 border border-white/5 hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 shrink-0 rounded-xl bg-black/20 flex items-center justify-center text-[10px] font-black text-gray-500 tabular-nums">{ev.time}</div>
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

            {/* Team Modal */}
            {showTeamModal && (
                <div className="fixed inset-0 bg-[#0a0f18]/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#111827] w-full max-w-sm rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 text-center pb-2"><h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-4">Escolha o Time</h3></div>
                        <div className="p-8 grid grid-cols-1 gap-4">
                            <button onClick={() => { setSelectedTeam('home'); setShowTeamModal(false); setShowEventModal(true); }} className="py-6 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-2xl font-black uppercase text-sm tracking-widest transition-all">{matchData.home_team?.name}</button>
                            <button onClick={() => { setSelectedTeam('away'); setShowTeamModal(false); setShowEventModal(true); }} className="py-6 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 rounded-2xl font-black uppercase text-sm tracking-widest transition-all">{matchData.away_team?.name}</button>
                            <button onClick={() => setShowTeamModal(false)} className="py-4 text-gray-500 font-black uppercase tracking-widest text-[10px]">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Card Modal */}
            {showCardTypeModal && (
                <div className="fixed inset-0 bg-[#0a0f18]/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#111827] w-full max-w-sm rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 text-center pb-2"><h3 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-1">Selecione o Cartão</h3></div>
                        <div className="p-8 grid grid-cols-1 gap-4">
                            {[{ t: 'yellow_card', label: 'Amarelo', color: 'bg-yellow-500', text: 'text-black' }, { t: 'blue_card', label: 'Azul', color: 'bg-blue-400', text: 'text-black' }, { t: 'red_card', label: 'Vermelho', color: 'bg-red-600', text: 'text-white' }].map(card => (
                                <button key={card.t} onClick={() => { setEventType(card.t); setShowCardTypeModal(false); setShowEventModal(true); }} className={`py-8 ${card.color} ${card.text} rounded-[2rem] font-black uppercase text-xl shadow-2xl transition-all active:scale-95 flex items-center justify-between px-10`}>
                                    <div className="flex items-center gap-4"><Icon icon="solar:card-bold" className="w-8 h-8" />{card.label}</div>
                                    <Icon icon="heroicons-solid:chevron-right" className="w-6 h-6 opacity-30" />
                                </button>
                            ))}
                            <button onClick={() => setShowCardTypeModal(false)} className="py-4 mt-2 text-gray-500 font-black uppercase tracking-widest text-[10px]">Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Player Modal */}
            {showEventModal && (
                <div className="fixed inset-0 bg-[#0a0f18]/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#111827] w-full max-w-lg rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl max-h-[90vh] flex flex-col animate-in fade-in duration-300">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#1a2234]/30">
                            <div>
                                <h3 className="font-black uppercase tracking-tighter text-2xl italic text-white flex items-center gap-3">
                                    <span className={`w-2 h-8 ${selectedTeam === 'home' ? 'bg-blue-500' : 'bg-emerald-500'} rounded-full`} />{eventType}
                                </h3>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{selectedTeam === 'home' ? matchData.home_team?.name : matchData.away_team?.name}</p>
                            </div>
                            <button onClick={() => setShowEventModal(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><Icon icon="heroicons-solid:x" className="w-6 h-6" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            {eventType === 'goal' && (
                                <button onClick={() => setIsSelectingOwnGoal(v => !v)} className={`w-full py-5 mb-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${isSelectingOwnGoal ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                                    <Icon icon="solar:info-circle-bold" className="w-5 h-5" />
                                    {isSelectingOwnGoal ? 'SELECIONANDO GOL CONTRA' : 'MODO GOL CONTRA'}
                                </button>
                            )}
                            <div className="space-y-2">
                                {(selectedTeam === 'home' ? rosters.home : rosters.away).sort((a: any, b: any) => parseInt(a.pivot?.number || a.number || 0) - parseInt(b.pivot?.number || b.number || 0)).map((p: any) => (
                                    <button key={p.id} onClick={() => confirmEvent(p)} className="w-full group px-6 py-4 bg-[#1a2234]/60 hover:bg-emerald-600/20 border border-white/5 hover:border-emerald-500/50 rounded-2xl transition-all flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            <div className="w-10 h-10 shrink-0 rounded-xl bg-black/40 flex items-center justify-center text-lg font-black text-white group-hover:text-emerald-400 tabular-nums">{p.pivot?.number || p.number || '#'}</div>
                                            <div>
                                                <div className="text-sm font-black uppercase tracking-wide text-gray-100">{p.name}</div>
                                                {p.nickname && <div className="text-[10px] text-gray-500 uppercase">{p.nickname}</div>}
                                            </div>
                                        </div>
                                        <Icon icon="heroicons-solid:chevron-right" className="w-5 h-5 text-gray-700 group-hover:text-emerald-400" />
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
