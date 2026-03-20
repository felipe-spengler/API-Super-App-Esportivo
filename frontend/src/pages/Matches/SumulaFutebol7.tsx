import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Clock, Users, X, Trash2, Flag, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useOfflineResilience } from '../../hooks/useOfflineResilience';
import { getMatchPhrase } from '../../utils/matchPhrases';

// ─── Componentes FORA do componente principal ─────────────────────────────────
// Definir dentro causaria remontagem a cada tick do timer → tremor visual

const ActionBtn = memo(({ onClick, disabled, className, children }: {
    onClick: () => void; disabled?: boolean; className: string; children: React.ReactNode;
}) => (
    <button onClick={onClick} disabled={disabled}
        className={`${className} active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed`}>
        {children}
    </button>
));

// Contador de faltas com indicador visual de limite (Society = 5 faltas)
const FoulDots = memo(({ count }: { count: number }) => {
    const hasFreekick = count >= 5;
    return (
        <div className="flex flex-col items-center gap-1 w-full">
            <div className="flex justify-center gap-1">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className={`w-2.5 h-2.5 rounded-full border ${i < count
                        ? (i >= 5 ? 'bg-orange-500 border-orange-400 shadow-[0_0_6px_rgba(249,115,22,0.8)]' : 'bg-red-500 border-red-400')
                        : 'bg-gray-800 border-gray-700'
                        }`} />
                ))}
            </div>
            {hasFreekick && (
                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${count >= 6 ? 'text-orange-300 bg-orange-500/20 animate-pulse' : 'text-amber-300 bg-amber-500/20'
                    }`}>
                    {count >= 6 ? '⚡ TIRO LIVRE DIRETO' : '⚠️ TIRO LIVRE'}
                </span>
            )}
            <span className="text-[9px] text-gray-600 font-bold">{count} falta{count !== 1 ? 's' : ''}</span>
        </div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────

export function SumulaFutebol7() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });
    const [serverTimerLoaded, setServerTimerLoaded] = useState(false);

    // Timer & Period (25min cada tempo para Society)
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [currentPeriod, setCurrentPeriod] = useState<string>('1º Tempo');

    const [fouls, setFouls] = useState({ home: 0, away: 0 });
    const [penaltyScore, setPenaltyScore] = useState({ home: 0, away: 0 });
    const [timeouts, setTimeouts] = useState({ home: [], away: [] });
    const [events, setEvents] = useState<any[]>([]);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
    const [eventType, setEventType] = useState<'goal' | 'yellow_card' | 'red_card' | 'blue_card' | 'assist' | 'foul' | 'mvp' | null>(null);
    const [showShootoutOptions, setShowShootoutOptions] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
    const [isSelectingOwnGoal, setIsSelectingOwnGoal] = useState(false);
    // Fluxo de Cartão: time → modal de cor → modal de jogador
    const [showCardModal, setShowCardModal] = useState(false);
    const [cardTeam, setCardTeam] = useState<'home' | 'away' | null>(null);
    // Fluxo de Craque: modal de time → modal de jogador
    const [showMvpTeamModal, setShowMvpTeamModal] = useState(false);

    // 🛡️ Offline Resilience
    const { isOnline, addToQueue, pendingCount, getPendingCount } = useOfflineResilience(id, 'Futebol 7', async (action, data) => {
        let url = '';
        switch (action) {
            case 'event': url = `/admin/matches/${id}/events`; break;
            case 'finish': url = `/admin/matches/${id}/finish`; break;
            case 'patch_match': return await api.patch(`/admin/matches/${id}`, data);
        }
        if (url) return await api.post(url, data);
    });

    // Helper: tenta chamada direta; se falhar offline, enfileira
    const apiPost = useCallback(async (action: 'event' | 'finish' | 'patch_match', data: any) => {
        if (isOnline) {
            try {
                const url = action === 'event' ? `/admin/matches/${id}/events`
                    : action === 'finish' ? `/admin/matches/${id}/finish` : '';
                if (action === 'patch_match') return await api.patch(`/admin/matches/${id}`, data);
                return await api.post(url, data);
            } catch (e: any) {
                if (!e.response) { addToQueue(action, data); return null; }
                throw e;
            }
        } else {
            addToQueue(action, data);
            return null;
        }
    }, [isOnline, id, addToQueue]);

    const timerRef = useRef({ time, isRunning, currentPeriod, matchData });
    const lastLocalUpdateAt = useRef<number>(0);
    useEffect(() => {
        timerRef.current = { time, isRunning, currentPeriod, matchData };
    }, [time, isRunning, currentPeriod, matchData]);

    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

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
                    if (serverTimer?.currentPeriod && serverTimer.currentPeriod !== timerRef.current.currentPeriod && Date.now() - lastLocalUpdateAt.current > 5000) {
                        setCurrentPeriod(serverTimer.currentPeriod);
                        if (serverTimer.time !== undefined) setTime(serverTimer.time);
                        if (serverTimer.isRunning !== undefined) setIsRunning(serverTimer.isRunning);
                        if (data.match.status) setMatchData((prev: any) => ({ ...prev, status: data.match.status }));
                    }
                    if (data.rosters) setRosters(data.rosters);
                }

                const history = (data.details?.events || []).map((e: any) => ({
                    id: e.id, type: e.type,
                    team: parseInt(e.team_id) === data.match.home_team_id ? 'home' : 'away',
                    time: e.minute, period: e.period, player_name: e.player_name,
                    player_id: e.player_id ?? null,
                    own_goal: e.metadata?.own_goal === true,
                }));
                setEvents(history);

                // Calcular faltas por período
                const activePeriod = data.match.match_details?.sync_timer?.currentPeriod || timerRef.current.currentPeriod;
                let relevantPeriods: string[] = [activePeriod];
                if (activePeriod === '1º Tempo' || activePeriod === 'Intervalo') relevantPeriods = ['1º Tempo'];
                else if (activePeriod === '2º Tempo' || activePeriod === 'Fim de Tempo Normal') relevantPeriods = ['2º Tempo'];
                else if (activePeriod === 'Prorrogação') relevantPeriods = ['2º Tempo', 'Prorrogação'];

                const homeFouls = history.filter((e: any) => e.team === 'home' && e.type === 'foul' && relevantPeriods.includes(e.period)).length;
                const awayFouls = history.filter((e: any) => e.team === 'away' && e.type === 'foul' && relevantPeriods.includes(e.period)).length;
                setFouls({ home: homeFouls, away: awayFouls });

                const homePenalties = history.filter((e: any) => e.team === 'home' && (e.type === 'shootout_goal' || e.type === 'penalty_goal')).length;
                const awayPenalties = history.filter((e: any) => e.team === 'away' && (e.type === 'shootout_goal' || e.type === 'penalty_goal')).length;
                setPenaltyScore({ home: homePenalties, away: awayPenalties });

                const homeTimeouts = history.filter((e: any) => e.type === 'timeout' && e.team === 'home');
                const awayTimeouts = history.filter((e: any) => e.type === 'timeout' && e.team === 'away');
                setTimeouts({ home: homeTimeouts, away: awayTimeouts });
            }
        } catch (e) {
            console.error(e);
            if (isInitial) alert('Erro ao carregar jogo.');
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    const STORAGE_KEY = `match_state_futebol7_${id}`;
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
            } catch (e) { console.error('Failed to parse saved state', e); }
        }
        fetchMatchDetails(true);
        const syncInterval = setInterval(() => {
            if (getPendingCount() === 0) fetchMatchDetails();
        }, 3000);
        return () => clearInterval(syncInterval);
    }, [id]);

    useEffect(() => {
        if (!id || loading) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ time, isRunning, currentPeriod, fouls }));
    }, [time, isRunning, currentPeriod, fouls, id, loading]);

    useEffect(() => {
        let interval: any = null;
        if (isRunning) {
            interval = setInterval(() => setTime(t => t + 1), 1000);
            if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
                registerSystemEvent('match_start', 'Bola rolando! Que vença o melhor!');
            }
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isRunning]);

    // Ping timer → servidor a cada 3s
    useEffect(() => {
        if (!id) return;
        const pingInterval = setInterval(async () => {
            const { time: t, isRunning: ir, currentPeriod: cp, matchData: md } = timerRef.current;
            if (!md) return;
            try {
                setSyncStatus('syncing');
                await api.patch(`/admin/matches/${id}`, { match_details: { ...md.match_details, sync_timer: { time: t, isRunning: ir, currentPeriod: cp } } });
                setSyncStatus('synced');
            } catch (e: any) {
                setSyncStatus('error');
                registerSystemEvent('sync_error', `Falha ao sincronizar cronômetro F7: ${e?.message || 'Erro de rede'}`);
            }
        }, 3000);
        return () => clearInterval(pingInterval);
    }, [id]);

    // Auditoria avançada
    useEffect(() => {
        if (!id) return;
        const isReload = !!(window.performance && window.performance.navigation.type === 1);
        registerSystemEvent('user_action', isReload ? 'Página Recarregada (Refresh) (F7)' : 'Súmula Aberta/Acessada (F7)');
        const crashKey = `last_crash_f7_${id}`;
        const lastCrash = localStorage.getItem(crashKey);
        if (lastCrash) { registerSystemEvent('system_error', `Recuperado de falha anterior (F7): ${lastCrash}`); localStorage.removeItem(crashKey); }
        const handleError = (event: ErrorEvent) => {
            localStorage.setItem(crashKey, `Erro JS F7: ${event.message} em ${event.filename}:${event.lineno}`);
            registerSystemEvent('system_error', `FATAL JS F7: ${event.message}`);
        };
        const handleUnload = () => {
            const { time: t, currentPeriod: cp } = timerRef.current;
            const blob = new Blob([JSON.stringify({ event_type: 'user_action', minute: formatTime(t), period: cp, metadata: { label: 'Súmula Fechada/Saindo da página (F7)' } })], { type: 'application/json' });
            navigator.sendBeacon(`${api.defaults.baseURL}/admin/matches/${id}/events`, blob);
        };
        window.addEventListener('error', handleError);
        window.addEventListener('beforeunload', handleUnload);
        return () => { window.removeEventListener('error', handleError); window.removeEventListener('beforeunload', handleUnload); };
    }, [id]);

    const registerSystemEvent = async (type: string, label: string) => {
        if (!matchData) return;
        try {
            const response = await apiPost('event', {
                event_type: type,
                team_id: (matchData.home_team_id || matchData.away_team_id) ?? null,
                minute: formatTime(timerRef.current.time),
                period: timerRef.current.currentPeriod,
                metadata: { label, system_period: timerRef.current.currentPeriod }
            });
            setEvents(prev => [{ id: response?.data?.id || Date.now(), type, team: 'home', time: formatTime(timerRef.current.time), period: timerRef.current.currentPeriod, player_name: label }, ...prev]);
            if (type === 'match_start') setMatchData((prev: any) => ({ ...prev, status: 'live' }));
        } catch (e: any) {
            console.error(e);
            if (type === 'match_start') { setIsRunning(false); alert('Erro ao iniciar partida. O cronômetro foi pausado.'); }
        }
    };

    const handlePeriodChange = () => {
        if (Date.now() - lastLocalUpdateAt.current < 2000) return;
        lastLocalUpdateAt.current = Date.now();
        if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado') && time === 0 && !isRunning) {
            if (!window.confirm('Iniciar Partida?')) return;
            setIsRunning(true);
            setMatchData((prev: any) => ({ ...prev, status: 'live' }));
            registerSystemEvent('match_start', 'Bola rolando! Que vença o melhor!');
            return;
        }
        let newPeriod = '';
        if (currentPeriod === '1º Tempo') {
            if (!window.confirm('Encerrar 1º Tempo?')) return;
            setIsRunning(false);
            newPeriod = 'Intervalo';
            // Atualiza timerRef antes do registerSystemEvent para gravar o período correto
            timerRef.current = { ...timerRef.current, currentPeriod: newPeriod };
            registerSystemEvent('period_end', 'Fim do 1º Tempo. Respirem!');
        } else if (currentPeriod === 'Intervalo') {
            newPeriod = '2º Tempo';
            setIsRunning(true);
            // Atualiza timerRef antes do registerSystemEvent para gravar o período correto
            setTime(0);
            timerRef.current = { ...timerRef.current, currentPeriod: newPeriod, isRunning: true, time: 0 };
            registerSystemEvent('period_start', 'Começa o 2º Tempo! Decisão!');
        } else if (currentPeriod === '2º Tempo') {
            if (!window.confirm('Encerrar Tempo Normal?')) return;
            setIsRunning(false);
            newPeriod = 'Fim de Tempo Normal';
            timerRef.current = { ...timerRef.current, currentPeriod: newPeriod, isRunning: false };
            registerSystemEvent('period_end', 'Fim do Tempo Normal de Jogo.');
            const choice = window.confirm("Tempo Normal encerrado!\n\n'OK' → Prorrogação ou Pênaltis\n'Cancelar' → Encerrar agora");
            if (choice) {
                if (window.confirm('Deseja iniciar a PRORROGAÇÃO?')) {
                    newPeriod = 'Prorrogação'; setIsRunning(true);
                    setTime(0);
                    timerRef.current = { ...timerRef.current, currentPeriod: newPeriod, isRunning: true, time: 0 };
                    registerSystemEvent('period_start', 'Início da Prorrogação. Aguenta coração!');
                } else if (window.confirm('Deseja ir DIRETO para os PÊNALTIS?')) {
                    newPeriod = 'Pênaltis';
                    setTime(0);
                    timerRef.current = { ...timerRef.current, currentPeriod: newPeriod, time: 0 };
                    registerSystemEvent('period_start', 'Início dos Shoot-outs. É agora ou nunca!');
                }
                // else mantém 'Fim de Tempo Normal' já setado
            } else { handleFinish(); return; }
        } else if (currentPeriod === 'Fim de Tempo Normal') {
            if (window.confirm('Iniciar Prorrogação?')) {
                newPeriod = 'Prorrogação'; setIsRunning(true);
                setTime(0);
                timerRef.current = { ...timerRef.current, currentPeriod: newPeriod, isRunning: true, time: 0 };
                registerSystemEvent('period_start', 'Início da Prorrogação. Aguenta coração!');
            } else if (window.confirm('Ir para Pênaltis?')) {
                newPeriod = 'Pênaltis';
                setTime(0);
                timerRef.current = { ...timerRef.current, currentPeriod: newPeriod, time: 0 };
                registerSystemEvent('period_start', 'Início dos Shoot-outs. É agora ou nunca!');
            } else { handleFinish(); return; }
        } else if (currentPeriod === 'Prorrogação') {
            if (!window.confirm('Encerrar Prorrogação?')) return;
            setIsRunning(false);
            newPeriod = 'Fim de Tempo Normal';
            timerRef.current = { ...timerRef.current, currentPeriod: newPeriod, isRunning: false };
            registerSystemEvent('period_end', 'Fim da Prorrogação.');
            if (window.confirm('Ir para Pênaltis?')) {
                newPeriod = 'Pênaltis';
                setTime(0);
                timerRef.current = { ...timerRef.current, currentPeriod: newPeriod, time: 0 };
                registerSystemEvent('period_start', 'Início dos Pênaltis');
            } else { handleFinish(); return; }
        } else if (currentPeriod === 'Pênaltis') {
            if (!window.confirm('Encerrar Disputa de Pênaltis?')) return;
            timerRef.current = { ...timerRef.current, currentPeriod: 'Pênaltis' };
            registerSystemEvent('period_end', 'Fim dos Pênaltis. Quem levou a melhor?');
            handleFinish(); return;
        }
        if (newPeriod) {
            setCurrentPeriod(newPeriod);
            apiPost('patch_match', { match_details: { ...matchData?.match_details, sync_timer: { time: timerRef.current.time, isRunning: timerRef.current.isRunning, currentPeriod: newPeriod } } }).catch(() => { });
        }
    };

    const openEventModal = useCallback((team: 'home' | 'away', type: any) => {
        if (!isRunning) {
            registerSystemEvent('user_action_blocked', `Tentativa de lançar '${type}' com cronômetro parado`);
            alert('Atenção: Inicie o cronômetro para poder lançar eventos!');
            return;
        }
        registerSystemEvent('user_action', `Abriu modal de '${type}' para ${team === 'home' ? 'Mandante' : 'Visitante'}`);
        setSelectedTeam(team); setEventType(type); setShowEventModal(true);
    }, [isRunning]);

    // Abre modal de escolha de cor do cartão → depois abre modal de jogador
    const openCardFlow = useCallback((team: 'home' | 'away') => {
        if (!isRunning) {
            registerSystemEvent('user_action_blocked', `Tentativa de cartão com cronômetro parado`);
            alert('Atenção: Inicie o cronômetro para poder lançar eventos!');
            return;
        }
        setCardTeam(team);
        setShowCardModal(true);
    }, [isRunning]);

    // Abre modal de escolha de time → depois abre modal de jogador
    const openMvpFlow = useCallback(() => {
        if (!isRunning) {
            registerSystemEvent('user_action_blocked', `Tentativa de craque com cronômetro parado`);
            alert('Atenção: Inicie o cronômetro para poder lançar eventos!');
            return;
        }
        setShowMvpTeamModal(true);
    }, [isRunning]);

    const registerSimpleEvent = async (team: 'home' | 'away', type: 'timeout') => {
        if (!isRunning) { alert('Atenção: Inicie o cronômetro para poder lançar eventos!'); return; }
        if (!matchData) return;

        // Controle de Tempo: 1 por período (1º T e 2º T)
        const per = currentPeriod === '1º Tempo' || currentPeriod === 'Intervalo' ? '1º Tempo' : '2º Tempo';
        const alreadyTaken = (timeouts as any)[team].some((t: any) => t.period === per);

        if (alreadyTaken) {
            alert(`Este time já pediu tempo no ${per}. Limite de 1 por tempo.`);
            return;
        }

        if (!window.confirm(`Confirmar pedido de tempo para ${team === 'home' ? matchData.home_team?.name : matchData.away_team?.name}?`)) return;

        const teamId = team === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);
        const newEvent: any = { id: Date.now(), type, team, time: currentTime, period: currentPeriod, player_name: 'Pedido de Tempo' };

        setEvents(prev => [newEvent, ...prev]);
        setTimeouts(prev => ({ ...prev, [team]: [...(prev as any)[team], newEvent] }));
        setIsRunning(false); // Pausa o cronômetro automaticamente no pedido de tempo

        try {
            await apiPost('event', { event_type: type, team_id: teamId, minute: currentTime, period: currentPeriod, metadata: { system_period: currentPeriod } });
        } catch (e) {
            console.error(e);
        }
    };

    const confirmEvent = async (player: any) => {
        if (!matchData || !selectedTeam || !eventType) return;
        const teamId = selectedTeam === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);

        if (currentPeriod === 'Pênaltis' && eventType === 'goal') {
            setSelectedPlayer(player); setShowEventModal(false); setShowShootoutOptions(true); return;
        }

        // ⚠️ Aviso de 2º Cartão Amarelo
        if (eventType === 'yellow_card') {
            const prevYellow = player.id
                ? events.find(e => e.type === 'yellow_card' && e.player_id === player.id)
                : events.find(e => e.type === 'yellow_card' && e.player_name === player.name);
            if (prevYellow) {
                const ok = window.confirm(
                    `⚠️ ATENÇÃO — 2º CARTÃO AMARELO!\n\n` +
                    `"${player.name}" já recebeu um cartão amarelo nesta partida.\n\n` +
                    `Deseja confirmar o lançamento?`
                );
                if (!ok) return;
            }
        }

        try {
            const response = await apiPost('event', {
                event_type: eventType, team_id: teamId, minute: currentTime, period: currentPeriod,
                player_id: player.id === 'unknown' ? null : player.id,
                metadata: {
                    own_goal: player.isOwnGoal || false,
                    system_period: currentPeriod,
                    player_name: player.name
                }
            });
            const newEvent = {
                id: response?.data?.id || Date.now(), type: eventType, team: selectedTeam,
                time: currentTime, period: currentPeriod,
                player_name: player.isOwnGoal ? `${player.name} (Gol Contra)` : player.name,
                player_id: player.id ?? null,
                own_goal: player.isOwnGoal
            };
            setEvents(prev => [newEvent, ...prev]);
            if (eventType === 'goal') {
                setMatchData((prev: any) => {
                    let homeInc = 0, awayInc = 0;
                    if (player.isOwnGoal) { if (selectedTeam === 'home') awayInc = 1; else homeInc = 1; }
                    else { if (selectedTeam === 'home') homeInc = 1; else awayInc = 1; }
                    return { ...prev, scoreHome: (prev.scoreHome || 0) + homeInc, scoreAway: (prev.scoreAway || 0) + awayInc };
                });
            }
            if (eventType === 'foul') setFouls(prev => ({ ...prev, [selectedTeam]: prev[selectedTeam] + 1 }));
            setShowEventModal(false); setSelectedPlayer(null); setIsSelectingOwnGoal(false);
        } catch (e: any) {
            console.error(e);
            registerSystemEvent('system_error', `Erro ao registrar '${eventType}': ${e?.message || 'Falha de rede'}`);
            alert('Erro ao registrar evento. Verifique sua conexão.');
        }
    };

    const handleShootoutResult = async (outcome: 'score' | 'saved' | 'post' | 'out') => {
        if (!selectedPlayer || !selectedTeam) return;
        const type = outcome === 'score' ? 'shootout_goal' : 'shootout_miss';
        const teamId = selectedTeam === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);
        try {
            const response = await apiPost('event', { event_type: type, team_id: teamId, minute: currentTime, period: currentPeriod, player_id: selectedPlayer.id, metadata: { outcome } });
            setEvents(prev => [{ id: response?.data?.id || Date.now(), type, team: selectedTeam, time: currentTime, period: currentPeriod, player_name: selectedPlayer.name, player_id: selectedPlayer.id }, ...prev]);
            if (outcome === 'score') setPenaltyScore(prev => ({ ...prev, [selectedTeam]: prev[selectedTeam] + 1 }));
            setShowShootoutOptions(false); setSelectedPlayer(null);
        } catch (e) { console.error(e); alert('Erro ao registrar pênalti'); }
    };

    const handleDeleteEvent = async (eventId: number, type: string, team: 'home' | 'away') => {
        if (!window.confirm('Excluir este evento?')) {
            registerSystemEvent('user_action', `Cancelou exclusão de '${type}'`); return;
        }
        registerSystemEvent('user_action', `Excluiu evento '${type}' (id: ${eventId})`);
        try {
            await api.delete(`/admin/matches/${id}/events/${eventId}`);
            setEvents(prev => prev.filter(e => e.id !== eventId));
            if (type === 'goal') setMatchData((prev: any) => ({
                ...prev,
                scoreHome: team === 'home' ? prev.scoreHome - 1 : prev.scoreHome,
                scoreAway: team === 'away' ? prev.scoreAway - 1 : prev.scoreAway
            }));
            if (type === 'foul') {
                const evToDelete = events.find(e => e.id === eventId);
                if (evToDelete) {
                    let relevantPeriods = [currentPeriod];
                    if (currentPeriod === '1º Tempo' || currentPeriod === 'Intervalo') relevantPeriods = ['1º Tempo'];
                    else if (currentPeriod === '2º Tempo' || currentPeriod === 'Fim de Tempo Normal') relevantPeriods = ['2º Tempo'];
                    else if (currentPeriod === 'Prorrogação') relevantPeriods = ['2º Tempo', 'Prorrogação'];
                    if (relevantPeriods.includes(evToDelete.period)) setFouls(prev => ({ ...prev, [team]: Math.max(0, prev[team] - 1) }));
                }
            }
            if (type === 'shootout_goal') setPenaltyScore(prev => ({ ...prev, [team]: Math.max(0, prev[team] - 1) }));
        } catch (e: any) {
            registerSystemEvent('system_error', `Erro ao excluir '${type}': ${e?.message}`);
            alert('Erro ao excluir evento');
        }
    };

    const deleteSystemEvents = async (types: string[], currentPeriodOnly = false) => {
        const targets = events.filter(e => types.includes(e.type) && (currentPeriodOnly ? e.period === currentPeriod : true));
        if (targets.length === 0) return;
        setEvents(prev => prev.filter(e => !targets.find(t => t.id === e.id)));
        for (const ev of targets) { try { await api.delete(`/admin/matches/${id}/events/${ev.id}`); } catch (e) { console.error(e); } }
    };

    const handleToggleTimer = () => {
        if (!isRunning) {
            deleteSystemEvents(['period_end'], true); deleteSystemEvents(['match_end']);
            registerSystemEvent('timer_control', `Cronômetro retomado em ${formatTime(time)} — ${currentPeriod}`);
            setIsRunning(true);
        } else {
            registerSystemEvent('timer_control', `Cronômetro pausado em ${formatTime(time)} — ${currentPeriod}`);
            setIsRunning(false);
        }
    };

    const handleFinish = async () => {
        if (!window.confirm('Encerrar partida completamente?')) return;
        try {
            await deleteSystemEvents(['match_end']);
            await registerSystemEvent('match_end', 'Partida Finalizada');
            await apiPost('finish', { home_score: matchData.scoreHome, away_score: matchData.scoreAway, home_penalty_score: penaltyScore.home, away_penalty_score: penaltyScore.away });
            localStorage.removeItem(STORAGE_KEY);
            navigate(-1);
        } catch (e) { console.error(e); }
    };

    if (loading || !matchData) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-sm font-medium">Carregando súmula...</span>
            </div>
        </div>
    );

    const isPenaltyPeriod = currentPeriod === 'Pênaltis';
    const periodBtnLabel = matchData.status === 'scheduled' || matchData.status === 'Agendado' ? 'Iniciar Jogo'
        : currentPeriod === '1º Tempo' ? 'Fim 1º T'
            : currentPeriod === 'Intervalo' ? 'Iniciar 2º T'
                : currentPeriod === '2º Tempo' ? 'Encerrar Normal'
                    : currentPeriod === 'Fim de Tempo Normal' ? 'Próxima Fase'
                        : currentPeriod === 'Prorrogação' ? 'Fim Prorrogação'
                            : currentPeriod === 'Pênaltis' ? 'Fim Pênaltis'
                                : 'Finalizado';

    const getSystemEventTitle = (ev: any) => {
        if (ev.type === 'match_start') return 'Início da Partida';
        if (ev.type === 'match_end') return 'Fim de Jogo';
        if (ev.type === 'timeout') return 'Pedido de Tempo';
        const p = String(ev.period || '').toLowerCase();
        if (ev.type === 'period_start') {
            if (p.includes('pênalt') || p.includes('penalt')) return 'Início dos Pênaltis';
            if (p.includes('prorrog')) return 'Início da Prorrogação';
            if (p.includes('2º') || p.includes('2o')) return 'Início do 2º Tempo';
            return `Início de ${ev.period || 'Período'}`;
        }
        if (ev.type === 'period_end') {
            if (p.includes('pênalt') || p.includes('penalt')) return 'Fim dos Pênaltis';
            if (p.includes('prorrog')) return 'Fim da Prorrogação';
            if (p.includes('2º') || p.includes('2o') || p.includes('normal')) return 'Fim do Tempo Normal';
            return 'Fim do 1º Tempo';
        }
        return ev.period || '';
    };

    return (
        <div className="min-h-screen bg-[#080d16] text-white font-sans pb-24">

            {/* ── HEADER ── */}
            <div className="bg-[#071410]/95 backdrop-blur-xl border-b border-emerald-900/30 sticky top-0 z-20 shadow-2xl shadow-black/60">
                <div className="px-3 pt-3 pb-2 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors border border-white/10">
                        <ArrowLeft className="w-5 h-5 text-emerald-200" />
                    </button>

                    <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black tracking-[0.25em] text-emerald-400/80 uppercase">Society · Futebol 7</span>
                            <div className={`w-2 h-2 rounded-full ${!isOnline ? 'bg-orange-500 animate-pulse shadow-[0_0_6px_rgba(249,115,22,0.8)]' :
                                syncStatus === 'synced' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' :
                                    syncStatus === 'syncing' ? 'bg-blue-400 animate-pulse' : 'bg-red-500 animate-bounce'
                                }`} title={!isOnline ? `Offline — ${pendingCount} na fila` : syncStatus} />
                        </div>
                        {matchData.details?.arbitration?.referee && (
                            <span className="text-[9px] text-emerald-700">{matchData.details.arbitration.referee}</span>
                        )}
                    </div>

                    <button onClick={handlePeriodChange} className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border ${currentPeriod === 'Intervalo'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        : currentPeriod === 'Fim de Jogo'
                            ? 'bg-red-600/20 border-red-600/40 text-red-400'
                            : 'bg-emerald-700/20 border-emerald-600/40 text-emerald-300 hover:bg-emerald-700/30'
                        }`}>
                        {periodBtnLabel}
                    </button>
                </div>

                {/* ── PLACAR ── */}
                <div className="px-3 pb-3 flex items-stretch gap-2">
                    {/* Home */}
                    <div className="flex-1 bg-black/40 border border-emerald-900/30 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="text-5xl font-black font-mono tabular-nums text-emerald-100 leading-none drop-shadow-lg">{matchData.scoreHome}</div>
                        {(isPenaltyPeriod || penaltyScore.home > 0 || penaltyScore.away > 0) && (
                            <div className="text-[10px] font-bold text-yellow-400 mt-0.5 bg-yellow-400/10 px-2 py-0.5 rounded-full">(Pên: {penaltyScore.home})</div>
                        )}
                        <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mt-1.5 truncate max-w-[80px] text-center">{matchData.home_team?.name}</div>
                        <div className="mt-1 mb-1"><FoulDots count={fouls.home} /></div>
                        <div className="flex gap-1 mt-1">
                            {['1º Tempo', '2º Tempo'].map(p => {
                                const taken = (timeouts as any).home.some((t: any) => t.period === p);
                                return (
                                    <div key={p} className={`w-3 h-1.5 rounded-sm ${taken ? 'bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.6)]' : 'bg-gray-800'}`} title={`Tempo ${p}`} />
                                );
                            })}
                        </div>
                    </div>

                    {/* Timer center */}
                    <div className="flex flex-col items-center justify-center bg-black/50 border border-emerald-700/30 rounded-2xl px-3 py-2 min-w-[88px] backdrop-blur-sm">
                        <button onClick={handleToggleTimer} className="mb-1 p-1.5 rounded-full hover:bg-white/10 transition-colors">
                            {isRunning
                                ? <Pause className="w-5 h-5 text-emerald-400 fill-current" />
                                : <Play className="w-5 h-5 text-gray-500 fill-current" />
                            }
                        </button>
                        <div className="text-[22px] font-mono font-black text-yellow-400 tracking-widest tabular-nums leading-none">{formatTime(time)}</div>
                        <div className="text-[7px] text-emerald-600 uppercase font-bold mt-1 text-center leading-tight max-w-[80px]">{currentPeriod}</div>
                    </div>

                    {/* Away */}
                    <div className="flex-1 bg-black/40 border border-emerald-900/30 rounded-2xl p-3 flex flex-col items-center justify-center backdrop-blur-sm">
                        <div className="text-5xl font-black font-mono tabular-nums text-emerald-100 leading-none drop-shadow-lg">{matchData.scoreAway}</div>
                        {(isPenaltyPeriod || penaltyScore.away > 0 || penaltyScore.home > 0) && (
                            <div className="text-[10px] font-bold text-yellow-400 mt-0.5 bg-yellow-400/10 px-2 py-0.5 rounded-full">(Pên: {penaltyScore.away})</div>
                        )}
                        <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mt-1.5 truncate max-w-[80px] text-center">{matchData.away_team?.name}</div>
                        <div className="mt-1 mb-1"><FoulDots count={fouls.away} /></div>
                        <div className="flex gap-1 mt-1">
                            {['1º Tempo', '2º Tempo'].map(p => {
                                const taken = (timeouts as any).away.some((t: any) => t.period === p);
                                return (
                                    <div key={p} className={`w-3 h-1.5 rounded-sm ${taken ? 'bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.6)]' : 'bg-gray-800'}`} title={`Tempo ${p}`} />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── OFFLINE BANNER ── */}
            {(!isOnline || pendingCount > 0) && (
                <div className={`mx-3 mt-2 px-3 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold border ${!isOnline ? 'bg-orange-950/40 border-orange-800/40 text-orange-300' : 'bg-blue-950/40 border-blue-800/40 text-blue-300'
                    }`}>
                    {!isOnline ? <WifiOff size={13} /> : <Wifi size={13} />}
                    {!isOnline ? `Offline — ${pendingCount} evento(s) aguardando` : `Sincronizando ${pendingCount} evento(s)...`}
                </div>
            )}

            {/* ── GRID DE AÇÕES ── */}
            <div className="p-3 space-y-3 max-w-4xl mx-auto">
                <div className="grid grid-cols-2 gap-3">
                    {/* Home */}
                    <div className="bg-gradient-to-b from-blue-950/40 to-blue-950/10 border border-blue-800/30 rounded-3xl p-3 space-y-2">
                        <div className="text-[9px] font-black text-blue-400/80 uppercase tracking-widest text-center truncate">{matchData.home_team?.name}</div>
                        <ActionBtn onClick={() => openEventModal('home', 'goal')} disabled={!isRunning}
                            className="w-full py-5 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-2xl font-black text-base shadow-lg shadow-blue-900/40 border border-blue-500/30">
                            {isPenaltyPeriod ? '⚽  PÊNALTI' : '⚽  GOL'}
                        </ActionBtn>
                        <ActionBtn onClick={() => openCardFlow('home')} disabled={!isRunning}
                            className="w-full py-3 bg-gradient-to-r from-yellow-600/80 via-orange-600/80 to-red-700/80 hover:brightness-110 rounded-2xl font-bold text-sm shadow-md border border-white/10">
                            🃏  Cartão
                        </ActionBtn>
                        <div className="grid grid-cols-2 gap-1.5">
                            <ActionBtn onClick={() => openEventModal('home', 'assist')} disabled={!isRunning}
                                className="py-2.5 bg-indigo-600/80 hover:bg-indigo-500/80 rounded-2xl font-bold text-[11px] border border-indigo-500/30 shadow-sm">
                                👟 Assist.
                            </ActionBtn>
                            <ActionBtn onClick={() => openEventModal('home', 'foul')} disabled={!isRunning}
                                className="py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-[11px] border border-white/10 text-gray-300 flex items-center justify-center gap-1">
                                <Flag size={12} /> Falta
                            </ActionBtn>
                            <ActionBtn onClick={() => registerSimpleEvent('home', 'timeout')} disabled={!isRunning}
                                className="py-2.5 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 rounded-2xl font-bold text-[11px] border border-yellow-500/30 shadow-sm col-span-2">
                                ⏱️ Pedir Tempo
                            </ActionBtn>
                        </div>
                    </div>

                    {/* Away */}
                    <div className="bg-gradient-to-b from-emerald-950/40 to-emerald-950/10 border border-emerald-800/30 rounded-3xl p-3 space-y-2">
                        <div className="text-[9px] font-black text-emerald-400/80 uppercase tracking-widest text-center truncate">{matchData.away_team?.name}</div>
                        <ActionBtn onClick={() => openEventModal('away', 'goal')} disabled={!isRunning}
                            className="w-full py-5 bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 rounded-2xl font-black text-base shadow-lg shadow-emerald-900/40 border border-emerald-500/30">
                            {isPenaltyPeriod ? '⚽  PÊNALTI' : '⚽  GOL'}
                        </ActionBtn>
                        <ActionBtn onClick={() => openCardFlow('away')} disabled={!isRunning}
                            className="w-full py-3 bg-gradient-to-r from-yellow-600/80 via-orange-600/80 to-red-700/80 hover:brightness-110 rounded-2xl font-bold text-sm shadow-md border border-white/10">
                            🃏  Cartão
                        </ActionBtn>
                        <div className="grid grid-cols-2 gap-1.5">
                            <ActionBtn onClick={() => openEventModal('away', 'assist')} disabled={!isRunning}
                                className="py-2.5 bg-indigo-600/80 hover:bg-indigo-500/80 rounded-2xl font-bold text-[11px] border border-indigo-500/30 shadow-sm">
                                👟 Assist.
                            </ActionBtn>
                            <ActionBtn onClick={() => openEventModal('away', 'foul')} disabled={!isRunning}
                                className="py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-[11px] border border-white/10 text-gray-300 flex items-center justify-center gap-1">
                                <Flag size={12} /> Falta
                            </ActionBtn>
                            <ActionBtn onClick={() => registerSimpleEvent('away', 'timeout')} disabled={!isRunning}
                                className="py-2.5 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 rounded-2xl font-bold text-[11px] border border-yellow-500/30 shadow-sm col-span-2">
                                ⏱️ Pedir Tempo
                            </ActionBtn>
                        </div>
                    </div>
                </div>

                {/* ── BOTÃO CRAQUE (unificado) ── */}
                <ActionBtn onClick={openMvpFlow} disabled={!isRunning}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-600/30 to-yellow-600/30 hover:from-amber-600/50 hover:to-yellow-600/50 rounded-2xl font-black text-sm border border-amber-500/30 text-amber-300 shadow-lg shadow-amber-900/20 tracking-wide">
                    ⭐  Craque do Jogo
                </ActionBtn>
            </div>

            {/* ── LINHA DO TEMPO ── */}
            <div className="px-3 max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={12} className="text-emerald-600" /> Linha do Tempo
                    </h3>
                    <button onClick={handleFinish} className="text-[10px] text-red-500 hover:text-red-400 underline font-black uppercase tracking-wide">
                        Encerrar Súmula
                    </button>
                </div>

                <div className="space-y-1.5 pb-4">
                    {events.map((ev, idx) => {
                        const isSys = ['match_start', 'match_end', 'period_start', 'period_end', 'timeout'].includes(ev.type);
                        if (isSys) {
                            const phrase = getMatchPhrase(ev.id, ev.type);
                            const sysColors: any = {
                                match_start: 'bg-emerald-900/40 border-emerald-600/50 text-emerald-300',
                                match_end: 'bg-red-900/40 border-red-600/50 text-red-400',
                                period_start: 'bg-blue-900/40 border-blue-600/50 text-blue-300',
                                period_end: 'bg-orange-900/40 border-orange-600/50 text-orange-300',
                                timeout: 'bg-yellow-900/40 border-yellow-600/50 text-yellow-300',
                            };
                            return (
                                <div key={idx} className="flex flex-col items-center my-3">
                                    <div className={`border rounded-full px-5 py-1.5 shadow-lg flex flex-col items-center gap-0.5 ${sysColors[ev.type] || 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{getSystemEventTitle(ev)}</span>
                                        {phrase && <span className="text-[10px] text-gray-300 italic">{phrase}</span>}
                                    </div>
                                </div>
                            );
                        }
                        const isHome = ev.team === 'home';
                        const isOwnGoal = ev.own_goal === true;
                        const eventLabels: any = {
                            goal: isOwnGoal ? '⚽ GOL CONTRA' : '⚽ GOL',
                            shootout_goal: '⚽ GOL (Pênalti)', shootout_miss: '❌ Pênalti Perdido',
                            yellow_card: '🟨 Cartão Amarelo', red_card: '🟥 Cartão Vermelho', blue_card: '🟦 Cartão Azul',
                            assist: '👟 Assistência', foul: '🚩 Falta', mvp: '⭐ Craque do Jogo',
                        };
                        const periodLabel = ['shootout_goal', 'shootout_miss'].includes(ev.type) ? 'Pênaltis'
                            : ev.period === 'Prorrogação' ? 'Prorrog.' : ev.period;
                        return (
                            <div key={idx} className={`rounded-2xl border px-3 py-2.5 flex items-center justify-between transition-all hover:brightness-110 ${isOwnGoal && ev.type === 'goal'
                                ? 'bg-red-950/40 border-red-800/40'
                                : isHome ? 'bg-blue-950/25 border-blue-900/30' : 'bg-emerald-950/25 border-emerald-900/30'
                                }`}>
                                <div className="flex items-center gap-2.5">
                                    <div className={`font-mono text-sm font-black tabular-nums min-w-[38px] ${isOwnGoal && ev.type === 'goal' ? 'text-red-400' : isHome ? 'text-blue-400' : 'text-emerald-400'
                                        }`}>
                                        {ev.time}'
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`font-bold text-sm ${isOwnGoal && ev.type === 'goal' ? 'text-red-300' : 'text-gray-100'
                                                }`}>{eventLabels[ev.type] || ev.type}</span>
                                            {isOwnGoal && ev.type === 'goal' && (
                                                <span className="text-[9px] font-black text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">contra</span>
                                            )}
                                        </div>
                                        {ev.player_name && ev.player_name !== '?' && (
                                            <span className="text-[10px] text-gray-500 mt-0.5">{ev.player_name}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[8px] uppercase font-bold tracking-wider text-gray-600">{periodLabel}</span>
                                    <button onClick={() => handleDeleteEvent(ev.id, ev.type, ev.team)}
                                        className="p-1.5 hover:bg-red-500/20 text-gray-700 hover:text-red-400 rounded-xl transition-colors">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {events.length === 0 && (
                        <div className="text-center py-10 text-gray-700 text-sm">Nenhum evento registrado ainda.</div>
                    )}
                </div>
            </div>

            {/* ── MODAL SHOOTOUT ── */}
            {showShootoutOptions && selectedPlayer && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 w-full max-w-sm rounded-2xl border border-gray-700 shadow-2xl p-6 text-center">
                        <h3 className="text-xl font-black text-white mb-1">Resultado da Cobrança</h3>
                        <p className="text-gray-400 text-sm mb-6">Jogador: <b className="text-emerald-400">{selectedPlayer.name}</b></p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleShootoutResult('score')} className="col-span-2 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black text-white text-lg border-b-4 border-emerald-900 active:scale-95 transition-all">⚽ GOL</button>
                            <button onClick={() => handleShootoutResult('saved')} className="py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white border-b-4 border-indigo-900 active:scale-95 transition-all">🧤 Defendeu</button>
                            <button onClick={() => handleShootoutResult('post')} className="py-3 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-bold border-b-4 border-yellow-900 active:scale-95 transition-all">🏁 Na Trave</button>
                            <button onClick={() => handleShootoutResult('out')} className="col-span-2 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold border-b-4 border-red-900 active:scale-95 transition-all">❌ Pra Fora</button>
                        </div>
                        <button onClick={() => setShowShootoutOptions(false)} className="mt-5 text-gray-500 hover:text-gray-300 text-sm font-bold underline">Cancelar</button>
                    </div>
                </div>
            )}

            {/* ── MODAL COR DO CARTÃO ── */}
            {showCardModal && cardTeam && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm">
                    <div className="bg-[#111827] w-full max-w-sm sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-lg text-white">Tipo de Cartão</h3>
                                <p className="text-xs text-emerald-400/70 uppercase tracking-wide mt-0.5">{cardTeam === 'home' ? matchData.home_team?.name : matchData.away_team?.name}</p>
                            </div>
                            <button onClick={() => setShowCardModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"><X size={18} /></button>
                        </div>
                        <div className="p-4 space-y-2">
                            {[
                                { type: 'yellow_card', label: 'Cartão Amarelo', emoji: '🟨', cls: 'bg-yellow-500 hover:bg-yellow-400 text-black border-yellow-700' },
                                { type: 'red_card', label: 'Cartão Vermelho', emoji: '🟥', cls: 'bg-red-600 hover:bg-red-500 text-white border-red-900' },
                                { type: 'blue_card', label: 'Cartão Azul', emoji: '🟦', cls: 'bg-blue-500 hover:bg-blue-400 text-white border-blue-800' },
                            ].map(card => (
                                <button key={card.type}
                                    onClick={() => { setShowCardModal(false); openEventModal(cardTeam!, card.type as any); }}
                                    className={`w-full py-4 px-5 rounded-2xl font-black text-base border-b-4 flex items-center gap-3 transition-all active:scale-[0.98] ${card.cls}`}>
                                    <span className="text-2xl">{card.emoji}</span> {card.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL TIME DO CRAQUE ── */}
            {showMvpTeamModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm">
                    <div className="bg-[#111827] w-full max-w-sm sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-white/5 flex items-center justify-between">
                            <h3 className="font-black text-lg text-white">⭐ Craque — Escolha o Time</h3>
                            <button onClick={() => setShowMvpTeamModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"><X size={18} /></button>
                        </div>
                        <div className="p-4 space-y-2">
                            <button onClick={() => { setShowMvpTeamModal(false); openEventModal('home', 'mvp'); }}
                                className="w-full py-5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-600/40 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-[0.98]">
                                {matchData.home_team?.name}
                            </button>
                            <button onClick={() => { setShowMvpTeamModal(false); openEventModal('away', 'mvp'); }}
                                className="w-full py-5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-600/40 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-[0.98]">
                                {matchData.away_team?.name}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL SELEÇÃO DE JOGADOR ── */}
            {showEventModal && selectedTeam && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#111827] w-full max-w-md sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-4 bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-b border-emerald-800/30 flex items-center justify-between sticky top-0 z-10">
                            <div>
                                <h3 className="font-black text-lg text-white">
                                    {isSelectingOwnGoal ? '⚠️ Gol Contra — Quem marcou?' : 'Selecione o Jogador'}
                                </h3>
                                <p className="text-xs text-emerald-400/70 uppercase tracking-wide mt-0.5">
                                    {selectedTeam === 'home' ? matchData.home_team?.name : matchData.away_team?.name}
                                    {eventType && <span className="ml-2 text-emerald-300">· {eventType.replace('_', ' ')}</span>}
                                </p>
                            </div>
                            <button onClick={() => { setShowEventModal(false); setIsSelectingOwnGoal(false); }}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-4 flex-1">
                            {eventType === 'goal' && !isSelectingOwnGoal && (
                                <div className="mb-4">
                                    <button onClick={() => setIsSelectingOwnGoal(true)}
                                        className="w-full py-4 px-2 bg-red-950/40 hover:bg-red-900/50 rounded-2xl border border-red-700/40 flex items-center justify-center gap-2 transition-all active:scale-95">
                                        <AlertCircle size={18} className="text-red-400" />
                                        <span className="text-xs font-bold uppercase text-red-400">Marcar como Gol Contra</span>
                                    </button>
                                </div>
                            )}

                            {isSelectingOwnGoal && (
                                <div className="mb-3 px-3 py-2 bg-red-950/30 border border-red-700/30 rounded-2xl flex items-center gap-2 text-red-400 text-xs font-bold">
                                    <AlertCircle size={14} /> Gol contra — escolha quem marcou
                                    <button onClick={() => setIsSelectingOwnGoal(false)} className="ml-auto underline opacity-70">Cancelar</button>
                                </div>
                            )}
                            {(selectedTeam === 'home' ? rosters.home : rosters.away).length === 0 ? (
                                <div className="p-10 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                                    <Users className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm text-gray-500">Nenhum jogador cadastrado.</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {(selectedTeam === 'home' ? rosters.home : rosters.away).map((player: any) => (
                                        <button key={player.id}
                                            onClick={() => confirmEvent(isSelectingOwnGoal ? { ...player, isOwnGoal: true } : player)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group border active:scale-[0.98] ${isSelectingOwnGoal
                                                ? 'bg-red-950/30 hover:bg-red-900/40 border-red-800/30 hover:border-red-600/50'
                                                : 'bg-white/5 hover:bg-emerald-950/40 border-transparent hover:border-emerald-700/40'
                                                }`}>
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${isSelectingOwnGoal ? 'bg-red-700/60 text-red-200' : 'bg-emerald-800/60 text-emerald-200 group-hover:bg-emerald-600'
                                                } transition-colors`}>
                                                {player.number || '#'}
                                            </div>
                                            <div className="flex flex-col items-start text-left">
                                                <span className="font-bold text-sm text-gray-100">
                                                    {player.name}
                                                    {player.nickname && <span className="ml-1 text-emerald-400 opacity-80 text-[10px] font-medium">({player.nickname})</span>}
                                                </span>
                                                {player.position && <span className="text-[9px] text-gray-600 uppercase tracking-tight">{player.position}</span>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
