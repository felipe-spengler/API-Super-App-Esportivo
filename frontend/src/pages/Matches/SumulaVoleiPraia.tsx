import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    Minus,
    RotateCcw,
    Trophy,
    Sun,
    AlertOctagon,
    RefreshCw,
    Timer,
    ShieldAlert,
    Repeat,
    Crown,
    HeartPulse,
    Volleyball,
    AlertTriangle,
    CheckCircle2,
    X
} from 'lucide-react';
import api from '../../services/api';
import { useOfflineResilience } from '../../hooks/useOfflineResilience';

type TeamSide = 'home' | 'away';

interface DuoPlayer {
    id: number | string;
    name: string;
    number?: number | string;
}

interface RosterPlayer {
    id: number | string;
    name?: string;
    nickname?: string;
    number?: number | string;
}

interface SetRecord {
    id?: number;
    set_number: number;
    home_score: number;
    away_score: number;
}

interface MatchStateData {
    id: number;
    status?: string;
    home_team_id?: number;
    away_team_id?: number;
    home_score?: number;
    away_score?: number;
    scoreHome: number;
    scoreAway: number;
    home_team?: { id?: number; name?: string };
    away_team?: { id?: number; name?: string };
    details?: {
        arbitration?: { referee?: string };
        sets?: SetRecord[];
    };
    match_details?: Record<string, unknown> & {
        sync_state?: {
            score?: { home: number; away: number };
            currentSet?: number;
            servingTeam?: TeamSide;
            currentServerIndex?: { home: number; away: number };
            delaySanctions?: { home: number; away: number };
            captains?: { home: number; away: number };
            duoPlayers?: { home: DuoPlayer[]; away: DuoPlayer[] };
        };
    };
}

export function SumulaVoleiPraia() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<MatchStateData | null>(null);
    const [rosters, setRosters] = useState<{ home: RosterPlayer[]; away: RosterPlayer[] }>({ home: [], away: [] });

    // Match State
    const [sets, setSets] = useState<SetRecord[]>([]);
    const [currentSet, setCurrentSet] = useState(1);
    const [score, setScore] = useState({ home: 0, away: 0 });
    const [matchFinished, setMatchFinished] = useState(false);

    // Official Beach Volleyball Rule States
    // 1. Formação: 2 atletas por equipe (sem reservas) + Capitão indicado na súmula
    const [duoPlayers, setDuoPlayers] = useState<{ home: DuoPlayer[]; away: DuoPlayer[] }>({
        home: [
            { id: 'h1', name: 'Atleta 1 (Casa)', number: 1 },
            { id: 'h2', name: 'Atleta 2 (Casa)', number: 2 }
        ],
        away: [
            { id: 'a1', name: 'Atleta 1 (Visitante)', number: 1 },
            { id: 'a2', name: 'Atleta 2 (Visitante)', number: 2 }
        ]
    });
    const [captains, setCaptains] = useState<{ home: number; away: number }>({ home: 0, away: 0 });

    // 2. Ordem de Saque:
    // Quando a equipe sacadora vence o rally -> mesmo jogador continua sacando.
    // Quando a equipe receptora vence o rally -> ganha o saque e o jogador que NÃO sacou da última vez passa a sacar.
    const [servingTeam, setServingTeam] = useState<TeamSide>('home');
    const [currentServerIndex, setCurrentServerIndex] = useState<{ home: number; away: number }>({
        home: 0,
        away: 0
    });

    // 3. Troca de Lado: A cada 7 pontos (1º e 2º sets) e a cada 5 pontos (3º set / Tie-break)
    const [invertedCourt, setInvertedCourt] = useState(false);
    const [sideSwitchAlert, setSideSwitchAlert] = useState<string | null>(null);

    // 4. Tempos de Descanso (30 segundos)
    const [timeoutsUsed, setTimeoutsUsed] = useState<{ home: number; away: number }>({ home: 0, away: 0 });
    const [activeTimeout, setActiveTimeout] = useState<{ team: TeamSide; secondsLeft: number } | null>(null);

    // 5. Atendimento Médico por Lesão (5 minutos = 300s; se não puder continuar -> Equipe Incompleta)
    const [activeMedicalTimeout, setActiveMedicalTimeout] = useState<{
        team: TeamSide;
        playerIndex: number;
        secondsLeft: number;
    } | null>(null);

    // 6. Sanções por Retardamento (Vigoram por TODA A PARTIDA)
    const [delaySanctions, setDelaySanctions] = useState<{ home: number; away: number }>({ home: 0, away: 0 });

    // Histórico de Eventos da Súmula no Set/Partida
    const [matchLog, setMatchLog] = useState<Array<{ time: string; set: number; text: string; type: string }>>([]);

    const POINTS_TO_WIN = 21; // 1º e 2º sets até 21 pontos
    const TIE_BREAK_POINTS = 15; // 3º set (Tie-break) até 15 pontos
    const MIN_MARGIN = 2; // Vantagem mínima de 2 pontos
    const BEST_OF = 3; // Melhor de 3 sets

    const STORAGE_KEY = `match_state_volei_praia_${id}`;

    // 🛡️ Resilience Shield
    const { isOnline, addToQueue, pendingCount, getPendingCount } = useOfflineResilience(
        id,
        'Vôlei de Praia',
        async (action, data) => {
            let url = '';
            switch (action) {
                case 'event':
                    url = `/admin/matches/${id}/events`;
                    break;
                case 'finish':
                    url = `/admin/matches/${id}/finish`;
                    break;
                case 'patch_match':
                    url = `/admin/matches/${id}`;
                    return await api.patch(url, data);
                case 'sets':
                    url = `/admin/matches/${id}/sets`;
                    break;
            }
            if (url) return await api.post(url, data);
        }
    );

    const getTeamName = useCallback(
        (team: TeamSide) => {
            if (!matchData) return team === 'home' ? 'Dupla 1' : 'Dupla 2';
            return team === 'home' ? matchData.home_team?.name || 'Dupla 1' : matchData.away_team?.name || 'Dupla 2';
        },
        [matchData]
    );

    const appendLog = useCallback(
        (text: string, type = 'info') => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setMatchLog(prev => [{ time: timeStr, set: currentSet, text, type }, ...prev.slice(0, 49)]);
        },
        [currentSet]
    );

    const fetchMatchDetails = useCallback(
        async (silent = false) => {
            try {
                if (!silent) setLoading(true);
                const response = await api.get(`/admin/matches/${id}/full-details`);
                const data = response.data;
                if (data.match) {
                    setMatchData({
                        ...data.match,
                        scoreHome: parseInt(String(data.match.home_score || 0), 10),
                        scoreAway: parseInt(String(data.match.away_score || 0), 10)
                    });

                    if (!silent) {
                        if (data.rosters) {
                            setRosters(data.rosters);
                            const savedLocal = localStorage.getItem(STORAGE_KEY);
                            if (!savedLocal) {
                                setDuoPlayers(prev => {
                                    const homeRoster: RosterPlayer[] = (data.rosters.home || []).slice(0, 2);
                                    const awayRoster: RosterPlayer[] = (data.rosters.away || []).slice(0, 2);
                                    return {
                                        home:
                                            homeRoster.length === 2
                                                ? homeRoster.map((p: RosterPlayer, i: number) => ({
                                                      id: p.id,
                                                      name: p.name || p.nickname || `Atleta ${i + 1}`,
                                                      number: p.number || i + 1
                                                  }))
                                                : homeRoster.length === 1
                                                ? [
                                                      {
                                                          id: homeRoster[0].id,
                                                          name: homeRoster[0].name || homeRoster[0].nickname || 'Atleta 1',
                                                          number: homeRoster[0].number || 1
                                                      },
                                                      prev.home[1]
                                                  ]
                                                : prev.home,
                                        away:
                                            awayRoster.length === 2
                                                ? awayRoster.map((p: RosterPlayer, i: number) => ({
                                                      id: p.id,
                                                      name: p.name || p.nickname || `Atleta ${i + 1}`,
                                                      number: p.number || i + 1
                                                  }))
                                                : awayRoster.length === 1
                                                ? [
                                                      {
                                                          id: awayRoster[0].id,
                                                          name: awayRoster[0].name || awayRoster[0].nickname || 'Atleta 1',
                                                          number: awayRoster[0].number || 1
                                                      },
                                                      prev.away[1]
                                                  ]
                                                : prev.away
                                    };
                                });
                            }
                        }

                        if (data.details?.sets && data.details.sets.length > 0) {
                            setSets(data.details.sets);
                        }

                        const hasLocal = localStorage.getItem(STORAGE_KEY);
                        if (!hasLocal && data.match.match_details?.sync_state) {
                            const ss = data.match.match_details.sync_state;
                            if (ss.score) setScore(ss.score);
                            if (ss.currentSet) setCurrentSet(ss.currentSet);
                            if (ss.servingTeam) setServingTeam(ss.servingTeam);
                            if (ss.currentServerIndex) setCurrentServerIndex(ss.currentServerIndex);
                            if (ss.delaySanctions) setDelaySanctions(ss.delaySanctions);
                            if (ss.captains) setCaptains(ss.captains);
                            if (ss.duoPlayers) setDuoPlayers(ss.duoPlayers);
                        }
                    }
                }
            } catch (e) {
                console.error(e);
                if (!silent) alert('Erro ao carregar jogo.');
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [id, STORAGE_KEY]
    );

    useEffect(() => {
        if (id) {
            fetchMatchDetails();

            const syncInterval = setInterval(() => {
                if (getPendingCount() === 0) fetchMatchDetails(true);
            }, 3000);

            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.sets) setSets(parsed.sets);
                    if (parsed.currentSet) setCurrentSet(parsed.currentSet);
                    if (parsed.score) setScore(parsed.score);
                    if (parsed.matchFinished) setMatchFinished(parsed.matchFinished);
                    if (parsed.servingTeam) setServingTeam(parsed.servingTeam);
                    if (parsed.currentServerIndex) setCurrentServerIndex(parsed.currentServerIndex);
                    if (parsed.captains) setCaptains(parsed.captains);
                    if (parsed.delaySanctions) setDelaySanctions(parsed.delaySanctions);
                    if (parsed.timeoutsUsed) setTimeoutsUsed(parsed.timeoutsUsed);
                    if (parsed.matchLog) setMatchLog(parsed.matchLog);
                } catch (e) {
                    console.error('Failed to recover state', e);
                }
            }
            return () => clearInterval(syncInterval);
        }
    }, [id, STORAGE_KEY, fetchMatchDetails, getPendingCount]);

    useEffect(() => {
        if (!id || loading) return;
        const stateToSave = {
            sets,
            currentSet,
            score,
            matchFinished,
            servingTeam,
            currentServerIndex,
            captains,
            delaySanctions,
            timeoutsUsed,
            matchLog
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [id, STORAGE_KEY, loading, sets, currentSet, score, matchFinished, servingTeam, currentServerIndex, captains, delaySanctions, timeoutsUsed, matchLog]);

    // Cronômetro de Pedido de Tempo (30 segundos)
    useEffect(() => {
        if (!activeTimeout) return;
        if (activeTimeout.secondsLeft <= 0) {
            appendLog(`Fim do Tempo de Descanso (30s) - ${getTeamName(activeTimeout.team)}`, 'timeout');
            setActiveTimeout(null);
            return;
        }
        const timer = setTimeout(() => {
            setActiveTimeout(prev => (prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null));
        }, 1000);
        return () => clearTimeout(timer);
    }, [activeTimeout, appendLog, getTeamName]);

    // Cronômetro de Atendimento Médico por Lesão (5 minutos = 300s)
    useEffect(() => {
        if (!activeMedicalTimeout) return;
        if (activeMedicalTimeout.secondsLeft <= 0) {
            return;
        }
        const timer = setTimeout(() => {
            setActiveMedicalTimeout(prev => (prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null));
        }, 1000);
        return () => clearTimeout(timer);
    }, [activeMedicalTimeout]);

    // PING - Sync local state TO server (Every 3 seconds)
    useEffect(() => {
        if (!id || matchFinished || loading || !matchData) return;

        const pingInterval = setInterval(async () => {
            if (!isOnline || getPendingCount() > 0) return;
            try {
                await api.patch(`/admin/matches/${id}`, {
                    match_details: {
                        ...matchData.match_details,
                        sync_state: {
                            score,
                            currentSet,
                            servingTeam,
                            currentServerIndex,
                            captains,
                            delaySanctions,
                            updated_at: Date.now()
                        }
                    }
                });
            } catch (e) {
                console.error('State sync failed', e);
            }
        }, 3000);

        return () => clearInterval(pingInterval);
    }, [id, isOnline, getPendingCount, loading, matchData, matchFinished, score, currentSet, servingTeam, currentServerIndex, captains, delaySanctions]);

    const getOpponent = (team: TeamSide): TeamSide => (team === 'home' ? 'away' : 'home');

    const registerSystemEvent = async (type: string, label: string) => {
        if (!matchData) return;
        try {
            addToQueue('event', {
                event_type: type,
                team_id: matchData.home_team_id || matchData.away_team_id,
                minute: 0,
                period: `Set ${currentSet}`,
                metadata: { label }
            });

            if (type === 'match_start') {
                setMatchData(prev => (prev ? { ...prev, status: 'live' } : prev));
            }
        } catch (e) {
            console.error('Erro ao registrar evento de sistema', e);
        }
    };

    const finishSet = async (finalScore: { home: number; away: number }) => {
        const setData: SetRecord = {
            set_number: currentSet,
            home_score: finalScore.home,
            away_score: finalScore.away
        };

        const newSets = [...sets, setData];
        setSets(newSets);

        const homeSetsWon = newSets.filter(s => s.home_score > s.away_score).length;
        const awaySetsWon = newSets.filter(s => s.away_score > s.home_score).length;

        setMatchData(prev =>
            prev
                ? {
                      ...prev,
                      scoreHome: homeSetsWon,
                      scoreAway: awaySetsWon
                  }
                : prev
        );

        try {
            addToQueue('sets', {
                set_number: currentSet,
                home_score: finalScore.home,
                away_score: finalScore.away
            });
        } catch (e) {
            console.error(e);
        }

        const setsNeededToWin = Math.ceil(BEST_OF / 2);
        if (homeSetsWon === setsNeededToWin || awaySetsWon === setsNeededToWin) {
            setMatchFinished(true);
            const winnerName = homeSetsWon > awaySetsWon ? getTeamName('home') : getTeamName('away');
            appendLog(`🏆 FIM DE PARTIDA! Vitória de ${winnerName} por ${homeSetsWon} sets a ${awaySetsWon}!`, 'finish');
            alert(`🏆 Partida encerrada! ${winnerName} venceu!`);
            registerSystemEvent('match_end', `Fim de Jogo! Vitória de ${winnerName}`);
        } else {
            const nextSet = currentSet + 1;
            setCurrentSet(nextSet);
            setScore({ home: 0, away: 0 });
            setTimeoutsUsed({ home: 0, away: 0 });
            setSideSwitchAlert(null);
            appendLog(
                `Início do ${nextSet}º Set${nextSet === 3 ? ' (Tie-break até 15 pontos, troca de lado a cada 5 pontos)' : ''}`,
                'set_start'
            );
            registerSystemEvent('period_start', `Início do ${nextSet}º Set`);
        }
    };

    /**
     * Registra um ponto ganho em um rally completo seguindo a regra oficial de saque e troca de lado:
     * - Se a equipe sacadora vence o rally: marca 1 ponto e o MESMO jogador continua a sacar.
     * - Se a equipe receptora vence o rally: marca 1 ponto, passa a sacar, e o jogador que NÃO sacou da última vez irá sacar.
     * - Troca de lado: a cada 7 pontos somados (1º e 2º sets) ou a cada 5 pontos somados (3º set).
     */
    const awardRallyPoint = async (winnerTeam: TeamSide, reasonLabel?: string) => {
        if (matchFinished || !matchData) return;

        if (matchData.status === 'scheduled' || matchData.status === 'Agendado') {
            registerSystemEvent('match_start', 'Saque autorizado! Partida de Vôlei de Praia iniciada.');
        }

        let nextServerIdx = currentServerIndex[winnerTeam];
        if (servingTeam !== winnerTeam) {
            nextServerIdx = currentServerIndex[winnerTeam] === 0 ? 1 : 0;
            setServingTeam(winnerTeam);
            setCurrentServerIndex(prev => ({
                ...prev,
                [winnerTeam]: nextServerIdx
            }));
        }

        const serverPlayer = duoPlayers[winnerTeam][nextServerIdx];
        const newScore = {
            ...score,
            [winnerTeam]: score[winnerTeam] + 1
        };
        setScore(newScore);

        const totalPoints = newScore.home + newScore.away;
        const switchInterval = currentSet === 3 ? 5 : 7;

        const pointDescription = reasonLabel
            ? `${reasonLabel} -> Ponto para ${getTeamName(winnerTeam)} (${newScore.home}x${newScore.away}). Próximo saque: #${serverPlayer?.number || nextServerIdx + 1} ${serverPlayer?.name}`
            : `Ponto de ${getTeamName(winnerTeam)} (${newScore.home}x${newScore.away}) — Saca: #${serverPlayer?.number || nextServerIdx + 1} ${serverPlayer?.name}`;

        appendLog(pointDescription, 'point');

        const pointsNeeded = currentSet === 3 ? TIE_BREAK_POINTS : POINTS_TO_WIN;
        const loserTeam = getOpponent(winnerTeam);
        const isSetWon = newScore[winnerTeam] >= pointsNeeded && newScore[winnerTeam] >= newScore[loserTeam] + MIN_MARGIN;

        if (!isSetWon && totalPoints > 0 && totalPoints % switchInterval === 0) {
            setInvertedCourt(prev => !prev);
            const msg = `🔄 TROCA DE LADO! Soma de ${totalPoints} pontos atingida (múltiplo de ${switchInterval} no ${currentSet}º Set).`;
            setSideSwitchAlert(msg);
            appendLog(msg, 'switch');
            registerSystemEvent('side_switch', msg);
        } else {
            setSideSwitchAlert(null);
        }

        try {
            addToQueue('event', {
                event_type: 'point',
                team_id: winnerTeam === 'home' ? matchData.home_team_id : matchData.away_team_id,
                player_id: typeof serverPlayer?.id === 'number' ? serverPlayer.id : null,
                period: `Set ${currentSet}`,
                value: 1,
                metadata: {
                    reason: reasonLabel || 'rally_point',
                    serving_player: serverPlayer?.name,
                    score: `${newScore.home}-${newScore.away}`
                }
            });
        } catch (e) {
            console.error(e);
        }

        if (isSetWon) {
            await finishSet(newScore);
        }
    };

    const removePoint = (team: TeamSide) => {
        if (score[team] > 0) {
            setScore(prev => ({ ...prev, [team]: prev[team] - 1 }));
            appendLog(`Correção de placar: -1 ponto em ${getTeamName(team)}`, 'correction');
        }
    };

    const handleServiceOrderFault = async (faultingTeam: TeamSide) => {
        const opponent = getOpponent(faultingTeam);
        const msg = `Falta de Ordem de Saque cometida por ${getTeamName(faultingTeam)}`;
        registerSystemEvent('service_order_fault', msg);
        await awardRallyPoint(opponent, `⚠️ ${msg}`);
    };

    const handleDoubleFault = () => {
        const server = duoPlayers[servingTeam][currentServerIndex[servingTeam]];
        const msg = `🤝 FALTA DUPLA registrada! O rally é repetido. Mantém o saque com #${server?.number || 1} ${server?.name} (${getTeamName(servingTeam)}).`;
        appendLog(msg, 'double_fault');
        registerSystemEvent('double_fault', msg);
    };

    const handleRequestTimeout = (team: TeamSide) => {
        if (activeTimeout) return;
        setTimeoutsUsed(prev => ({ ...prev, [team]: prev[team] + 1 }));
        setActiveTimeout({ team, secondsLeft: 30 });
        const msg = `⏱️ Tempo de Descanso (30s) solicitado por ${getTeamName(team)} (${score.home}x${score.away} no ${currentSet}º Set)`;
        appendLog(msg, 'timeout');
        registerSystemEvent('timeout', msg);
    };

    const handleDelaySanction = async (sanctionedTeam: TeamSide) => {
        const currentCount = delaySanctions[sanctionedTeam];
        const nextCount = currentCount + 1;
        setDelaySanctions(prev => ({ ...prev, [sanctionedTeam]: nextCount }));

        if (nextCount === 1) {
            const msg = `🟨 ADVERTÊNCIA POR RETARDAMENTO aplicada à equipe ${getTeamName(sanctionedTeam)} (1º retardamento na partida - vigora até o fim do jogo).`;
            appendLog(msg, 'delay_warning');
            registerSystemEvent('delay_warning', msg);
        } else {
            const opponent = getOpponent(sanctionedTeam);
            const msg = `🟥 PENALIDADE POR RETARDAMENTO (${nextCount}º retardamento na partida) contra ${getTeamName(sanctionedTeam)}`;
            registerSystemEvent('delay_penalty', msg);
            await awardRallyPoint(opponent, `${msg} — Ponto e saque para ${getTeamName(opponent)}`);
        }
    };

    const handleDeclareIncompleteTeam = async (incompleteTeam: TeamSide) => {
        if (!matchData) return;
        const winnerTeam = getOpponent(incompleteTeam);
        const winnerName = getTeamName(winnerTeam);
        const incompleteName = getTeamName(incompleteTeam);

        if (
            !window.confirm(
                `Confirmar declaração de EQUIPE INCOMPLETA para "${incompleteName}"?\n\nPela regra oficial do Vôlei de Praia (sem substituições), após o limite de atendimento médico, a equipe incompleta perde a partida e a vitória será atribuída a "${winnerName}".`
            )
        ) {
            return;
        }

        const msg = `🚑 EQUIPE INCOMPLETA: ${incompleteName} não pôde continuar após atendimento médico. Vitória declarada para ${winnerName}!`;
        appendLog(msg, 'incomplete');
        registerSystemEvent('team_incomplete', msg);

        const finalHomeSets = winnerTeam === 'home' ? 2 : matchData.scoreHome;
        const finalAwaySets = winnerTeam === 'away' ? 2 : matchData.scoreAway;

        setMatchData(prev =>
            prev
                ? {
                      ...prev,
                      scoreHome: finalHomeSets,
                      scoreAway: finalAwaySets
                  }
                : prev
        );
        setActiveMedicalTimeout(null);
        setMatchFinished(true);
    };

    const handleFinish = async () => {
        if (!matchData || !window.confirm('Encerrar e salvar súmula oficial da partida?')) return;
        try {
            await registerSystemEvent('match_end', 'Partida Finalizada. Vitória na areia!');

            addToQueue('finish', {
                home_score: matchData.scoreHome,
                away_score: matchData.scoreAway
            });

            localStorage.removeItem(STORAGE_KEY);
            navigate(-1);
        } catch (e) {
            console.error(e);
        }
    };

    const resetSet = () => {
        if (window.confirm('Resetar pontuação do set atual?')) {
            setScore({ home: 0, away: 0 });
            setSideSwitchAlert(null);
        }
    };

    const formatSeconds = (totalSec: number) => {
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const currentPointsNeeded = currentSet === 3 ? TIE_BREAK_POINTS : POINTS_TO_WIN;
    const currentSwitchInterval = currentSet === 3 ? 5 : 7;
    const totalPointsInSet = score.home + score.away;
    const pointsUntilNextSwitch = currentSwitchInterval - (totalPointsInSet % currentSwitchInterval);

    if (loading || !matchData) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    const activeServingPlayer = duoPlayers[servingTeam][currentServerIndex[servingTeam]];

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-600 via-orange-600 to-amber-800 text-white font-sans pb-24">
            {/* Header & Placar Principal */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-700 pb-4 pt-4 sticky top-0 z-20 border-b border-orange-800/80 shadow-2xl">
                {!isOnline && (
                    <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-[10px] font-bold py-1 px-4 z-[9999] flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-2">
                            <AlertOctagon size={12} className="animate-pulse" />
                            <span>SISTEMA OFFLINE</span>
                        </div>
                        <span>{pendingCount} PENDENTES</span>
                    </div>
                )}
                {isOnline && pendingCount > 0 && (
                    <div className="absolute top-0 left-0 w-full bg-yellow-600 text-white text-[10px] font-bold py-1 px-4 z-[9999] flex items-center justify-between shadow-lg">
                        <div className="flex items-center gap-2">
                            <RefreshCw size={12} className="animate-spin" />
                            <span>SINCRONIZANDO...</span>
                        </div>
                        <span>{pendingCount} RESTANTES</span>
                    </div>
                )}

                <div className={`px-4 flex items-center justify-between mb-3 ${!isOnline || pendingCount > 0 ? 'mt-4' : ''}`}>
                    <button onClick={() => navigate(-1)} className="p-2 bg-black/25 rounded-full backdrop-blur hover:bg-black/35">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <Sun className="w-5 h-5 text-yellow-200 animate-pulse" />
                            <span className="text-xs font-black tracking-widest text-white uppercase drop-shadow">
                                SÚMULA OFICIAL • VÔLEI DE PRAIA
                            </span>
                        </div>
                        <span className="text-[10px] text-amber-100 font-semibold">
                            Melhor de 3 Sets • {currentSet === 3 ? 'Tie-break (15 pts / troca a cada 5)' : `${currentSet}º Set (21 pts / troca a cada 7)`}
                        </span>
                    </div>
                    <button
                        onClick={resetSet}
                        className="p-2 bg-black/25 rounded-full backdrop-blur hover:bg-black/35"
                        disabled={matchFinished}
                        title="Zerar Set Atual"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>

                {/* Sets & Placar do Set Atual */}
                <div className="px-4 max-w-4xl mx-auto">
                    <div className="bg-black/35 backdrop-blur-md rounded-2xl p-4 border border-white/25 shadow-xl">
                        <div className="flex items-center justify-between text-[11px] font-bold text-amber-200 mb-2 uppercase tracking-wider">
                            <span>
                                Lado Esq.: {invertedCourt ? getTeamName('away') : getTeamName('home')}
                            </span>
                            <span className="flex items-center gap-1.5 bg-white/15 px-3 py-0.5 rounded-full text-white">
                                SET {currentSet}
                                {currentSet === 3 && (
                                    <span className="bg-red-500 px-1.5 py-0.5 rounded text-[9px] font-black animate-pulse">
                                        TIE-BREAK
                                    </span>
                                )}
                            </span>
                            <span>
                                Lado Dir.: {invertedCourt ? getTeamName('home') : getTeamName('away')}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 items-center gap-2 text-center">
                            {/* Dupla Casa */}
                            <div>
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    {servingTeam === 'home' && (
                                        <span className="bg-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                                            <Volleyball size={11} /> SAQUE
                                        </span>
                                    )}
                                    <h2 className="font-black text-sm sm:text-base text-white truncate">
                                        {getTeamName('home')}
                                    </h2>
                                </div>
                                <div className="text-5xl sm:text-6xl font-black text-white leading-none">
                                    {score.home}
                                </div>
                                <div className="mt-1 inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-yellow-200">
                                    Sets vencidos: <strong className="text-white text-sm">{matchData.scoreHome}</strong>
                                </div>
                            </div>

                            {/* Info Central (Troca de Lado e Sacador Atual) */}
                            <div className="flex flex-col items-center justify-center space-y-1.5">
                                <div className="text-xs font-extrabold uppercase text-white/80">
                                    Alvo: {currentPointsNeeded} pts (dif. {MIN_MARGIN})
                                </div>
                                <div className="bg-amber-500/30 border border-amber-300/40 rounded-xl px-2.5 py-1.5 text-[11px] text-center">
                                    <div className="text-amber-100 font-bold uppercase text-[9px]">Sacador na Súmula</div>
                                    <div className="font-black text-white text-xs truncate max-w-[140px]">
                                        #{activeServingPlayer?.number || currentServerIndex[servingTeam] + 1}{' '}
                                        {activeServingPlayer?.name}
                                    </div>
                                </div>
                                <div className="text-[10px] text-yellow-100 font-semibold">
                                    Próxima troca de lado em <strong>{pointsUntilNextSwitch}</strong> pt(s)
                                </div>
                            </div>

                            {/* Dupla Visitante */}
                            <div>
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <h2 className="font-black text-sm sm:text-base text-white truncate">
                                        {getTeamName('away')}
                                    </h2>
                                    {servingTeam === 'away' && (
                                        <span className="bg-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                                            <Volleyball size={11} /> SAQUE
                                        </span>
                                    )}
                                </div>
                                <div className="text-5xl sm:text-6xl font-black text-white leading-none">
                                    {score.away}
                                </div>
                                <div className="mt-1 inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-yellow-200">
                                    Sets vencidos: <strong className="text-white text-sm">{matchData.scoreAway}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-4 space-y-5">
                {/* Alerta Automático de Troca de Lado (A cada 7 pts no 1º/2º set, 5 pts no 3º set) */}
                {sideSwitchAlert && (
                    <div className="bg-yellow-400 text-slate-950 p-4 rounded-2xl shadow-2xl border-2 border-white flex items-center justify-between animate-bounce">
                        <div className="flex items-center gap-3 font-black text-sm">
                            <Repeat className="w-6 h-6 shrink-0" />
                            <span>{sideSwitchAlert}</span>
                        </div>
                        <button
                            onClick={() => setSideSwitchAlert(null)}
                            className="bg-slate-950 text-white text-xs font-bold px-3 py-1.5 rounded-xl"
                        >
                            OK, Trocado
                        </button>
                    </div>
                )}

                {/* Modal/Banner de Tempo de Descanso (30 segundos) */}
                {activeTimeout && (
                    <div className="bg-indigo-950/95 border-2 border-indigo-400 p-5 rounded-2xl shadow-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Timer className="w-8 h-8 text-indigo-300 animate-spin" />
                            <div>
                                <div className="text-xs font-bold uppercase text-indigo-300">
                                    Tempo de Descanso Oficial (30 Segundos)
                                </div>
                                <div className="text-lg font-black text-white">
                                    Solicitado por: {getTeamName(activeTimeout.team)}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-mono font-black text-yellow-300">
                                00:{activeTimeout.secondsLeft.toString().padStart(2, '0')}
                            </span>
                            <button
                                onClick={() => setActiveTimeout(null)}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold"
                            >
                                Encerrar
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal/Banner de Atendimento Médico por Lesão (5 minutos - Sem Substituição) */}
                {activeMedicalTimeout && (
                    <div className="bg-red-950/95 border-2 border-red-400 p-5 rounded-2xl shadow-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <HeartPulse className="w-8 h-8 text-red-300 animate-pulse" />
                                <div>
                                    <div className="text-xs font-bold uppercase text-red-300">
                                        Atendimento Médico por Lesão (Limite Oficial: 5 Minutos)
                                    </div>
                                    <div className="text-base font-black text-white">
                                        {getTeamName(activeMedicalTimeout.team)} — Atleta:{' '}
                                        {duoPlayers[activeMedicalTimeout.team][activeMedicalTimeout.playerIndex]?.name}
                                    </div>
                                </div>
                            </div>
                            <div className="text-4xl font-mono font-black text-yellow-300">
                                {formatSeconds(activeMedicalTimeout.secondsLeft)}
                            </div>
                        </div>
                        <p className="text-xs text-red-200">
                            Regra Oficial: Não há substituições no Vôlei de Praia. Se o atleta não puder retornar após os 5 minutos, a equipe é declarada <strong>Incompleta</strong> e perde a partida.
                        </p>
                        <div className="flex flex-wrap gap-3 pt-1">
                            <button
                                onClick={() => {
                                    appendLog(
                                        `Atleta ${duoPlayers[activeMedicalTimeout.team][activeMedicalTimeout.playerIndex]?.name} recuperado e retornou à quadra.`,
                                        'medical'
                                    );
                                    setActiveMedicalTimeout(null);
                                }}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={16} /> Atleta Retornou ao Jogo
                            </button>
                            <button
                                onClick={() => handleDeclareIncompleteTeam(activeMedicalTimeout.team)}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl font-black text-xs flex items-center justify-center gap-2 border border-white/30"
                            >
                                <X size={16} /> Declarar Equipe Incompleta (Encerrar Partida)
                            </button>
                        </div>
                    </div>
                )}

                {/* Botões Principais de Ponto (Rally Completo) — Mobile-First Lado a Lado */}
                {!matchFinished && (
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                        {(['home', 'away'] as TeamSide[]).map(team => {
                            const isHome = team === 'home';
                            const isServing = servingTeam === team;
                            const nextIdxIfWins = isServing
                                ? currentServerIndex[team]
                                : currentServerIndex[team] === 0
                                ? 1
                                : 0;
                            const nextServerPlayer = duoPlayers[team][nextIdxIfWins];

                            return (
                                <div
                                    key={team}
                                    className="bg-black/30 backdrop-blur-md rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 border border-white/25 shadow-xl space-y-2.5"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                        <span className="font-black text-xs sm:text-base text-white truncate">
                                            {getTeamName(team)}
                                        </span>
                                        <span
                                            className={`text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase w-fit ${
                                                isServing
                                                    ? 'bg-yellow-400 text-slate-950'
                                                    : 'bg-white/15 text-white/80'
                                            }`}
                                        >
                                            {isServing ? '🏐 Sacando' : 'Recebendo'}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => awardRallyPoint(team)}
                                        className={`w-full py-7 sm:py-10 px-2 rounded-2xl font-black text-xl sm:text-3xl border-b-8 active:scale-95 transition-all shadow-2xl flex flex-col items-center justify-center gap-1 ${
                                            isHome
                                                ? 'bg-gradient-to-br from-blue-600 to-blue-800 border-blue-950 hover:from-blue-500 hover:to-blue-700'
                                                : 'bg-gradient-to-br from-emerald-600 to-emerald-800 border-emerald-950 hover:from-emerald-500 hover:to-emerald-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <Plus className="w-7 h-7 sm:w-10 sm:h-10" strokeWidth={3} />
                                            <span>PONTO</span>
                                        </div>
                                        <span className="text-[10px] sm:text-[11px] font-bold text-white/90 truncate max-w-full px-1">
                                            {isServing
                                                ? `Saca: #${nextServerPlayer?.number || nextIdxIfWins + 1} ${nextServerPlayer?.name}`
                                                : `Vai sacar: #${nextServerPlayer?.number || nextIdxIfWins + 1} ${nextServerPlayer?.name}`}
                                        </span>
                                    </button>

                                    {/* Ações Rápidas da Dupla: Tempo (30s), Falta de Ordem de Saque, Retardamento, Remover Ponto */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 pt-1">
                                        <button
                                            onClick={() => handleRequestTimeout(team)}
                                            disabled={!!activeTimeout}
                                            className="py-2 px-2.5 bg-indigo-600/85 hover:bg-indigo-600 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 border border-indigo-300/30 disabled:opacity-50"
                                        >
                                            <Timer size={13} className="shrink-0" />
                                            <span className="truncate">Tempo 30s ({timeoutsUsed[team]})</span>
                                        </button>

                                        <button
                                            onClick={() => handleServiceOrderFault(team)}
                                            className="py-2 px-2.5 bg-amber-600/85 hover:bg-amber-600 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 border border-amber-300/30"
                                            title="Sanciona esta equipe com perda de ponto e posse de saque para o adversário"
                                        >
                                            <AlertTriangle size={13} className="shrink-0" />
                                            <span className="truncate">Falta Ordem Saque</span>
                                        </button>

                                        <button
                                            onClick={() => handleDelaySanction(team)}
                                            className="py-2 px-2.5 bg-red-700/90 hover:bg-red-600 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 border border-red-300/30"
                                            title={
                                                delaySanctions[team] === 0
                                                    ? '1º Retardamento na partida = Advertência'
                                                    : '2º+ Retardamento na partida = Penalidade (Ponto e saque ao adversário)'
                                            }
                                        >
                                            <ShieldAlert size={13} className="shrink-0" />
                                            <span className="truncate">
                                                {delaySanctions[team] === 0
                                                    ? 'Retardamento (Adv.)'
                                                    : `Retardamento (Pen. #${delaySanctions[team] + 1})`}
                                            </span>
                                        </button>

                                        <button
                                            onClick={() => removePoint(team)}
                                            className="py-2 px-2.5 bg-slate-900/80 hover:bg-slate-800 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 border border-white/15"
                                        >
                                            <Minus size={13} className="shrink-0" />
                                            <span className="truncate">Corrigir (-1 pt)</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Barra de Arbitragem Geral: Falta Dupla (Repetir Rally) & Alternar Posse/Lado */}
                {!matchFinished && (
                    <div className="bg-black/30 backdrop-blur-md rounded-2xl p-3.5 border border-white/25 flex flex-wrap items-center justify-between gap-2">
                        <button
                            onClick={handleDoubleFault}
                            className="flex-1 min-w-[200px] py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase rounded-xl shadow flex items-center justify-center gap-2 transition-all"
                        >
                            <Repeat size={16} /> Falta Dupla (Repetir Rally sem Ponto)
                        </button>

                        <button
                            onClick={() => {
                                const nextTeam = servingTeam === 'home' ? 'away' : 'home';
                                setServingTeam(nextTeam);
                                appendLog(`Posse de saque alterada manualmente para ${getTeamName(nextTeam)}`, 'info');
                            }}
                            className="py-3 px-4 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                        >
                            <Volleyball size={15} /> Inverter Equipe Sacadora
                        </button>

                        <button
                            onClick={() => {
                                setInvertedCourt(prev => !prev);
                                appendLog('Lados da quadra trocados manualmente pelo árbitro.', 'switch');
                            }}
                            className="py-3 px-4 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                        >
                            <Repeat size={15} /> Trocar Lado da Quadra
                        </button>
                    </div>
                )}

                {/* Formação das Duplas (2 Atletas por Equipe, Sem Reserva, Capitão e Ordem de Saque) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(['home', 'away'] as TeamSide[]).map(team => {
                        const players = duoPlayers[team];
                        const availableRoster = rosters[team] || [];

                        return (
                            <div
                                key={team}
                                className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/25 space-y-3"
                            >
                                <div className="flex items-center justify-between border-b border-white/15 pb-2">
                                    <div>
                                        <h3 className="font-black text-sm uppercase text-yellow-200">
                                            Dupla: {getTeamName(team)}
                                        </h3>
                                        <p className="text-[10px] text-white/75">
                                            2 atletas em quadra (sem substituições) • Clique em (C) para definir Capitão
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-bold bg-white/15 px-2.5 py-1 rounded-lg">
                                        Retardamentos: {delaySanctions[team]}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {[0, 1].map(idx => {
                                        const player = players[idx];
                                        const isCaptain = captains[team] === idx;
                                        const isCurrentTeamServer = currentServerIndex[team] === idx;
                                        const isServingRightNow = servingTeam === team && isCurrentTeamServer;

                                        return (
                                            <div
                                                key={idx}
                                                className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                                                    isServingRightNow
                                                        ? 'bg-yellow-400/20 border-yellow-300'
                                                        : 'bg-white/10 border-white/15'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="w-7 h-7 rounded-lg bg-black/40 text-yellow-300 font-black text-xs flex items-center justify-center shrink-0">
                                                            {idx === 0 ? 'I' : 'II'}
                                                        </span>
                                                        {availableRoster.length > 0 ? (
                                                            <select
                                                                value={player?.id}
                                                                onChange={e => {
                                                                    const selected = availableRoster.find(
                                                                        (r: RosterPlayer) => String(r.id) === e.target.value
                                                                    );
                                                                    if (selected) {
                                                                        setDuoPlayers(prev => {
                                                                            const copy = [...prev[team]];
                                                                            copy[idx] = {
                                                                                id: selected.id,
                                                                                name: selected.name || selected.nickname || `Atleta ${idx + 1}`,
                                                                                number: selected.number || idx + 1
                                                                            };
                                                                            return { ...prev, [team]: copy };
                                                                        });
                                                                    }
                                                                }}
                                                                className="bg-black/40 text-white text-xs font-bold rounded-lg px-2 py-1.5 border border-white/20 truncate max-w-[170px]"
                                                            >
                                                                {availableRoster.map((r: RosterPlayer) => (
                                                                    <option key={r.id} value={r.id} className="text-slate-900">
                                                                        #{r.number || '-'} {r.name || r.nickname}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={player?.name || ''}
                                                                onChange={e => {
                                                                    const val = e.target.value;
                                                                    setDuoPlayers(prev => {
                                                                        const copy = [...prev[team]];
                                                                        copy[idx] = { ...copy[idx], name: val };
                                                                        return { ...prev, [team]: copy };
                                                                    });
                                                                }}
                                                                className="bg-black/30 text-white text-xs font-bold rounded-lg px-2.5 py-1 border border-white/20 w-full max-w-[170px]"
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {/* Capitão na Súmula */}
                                                        <button
                                                            onClick={() => {
                                                                setCaptains(prev => ({ ...prev, [team]: idx }));
                                                                appendLog(
                                                                    `${player?.name} definido como Capitão (C) da equipe ${getTeamName(team)} na súmula.`,
                                                                    'info'
                                                                );
                                                            }}
                                                            className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${
                                                                isCaptain
                                                                    ? 'bg-yellow-400 text-slate-950 shadow'
                                                                    : 'bg-black/30 text-white/60 hover:text-white'
                                                            }`}
                                                            title="Indicar Capitão da Equipe na Súmula"
                                                        >
                                                            <Crown size={11} /> {isCaptain ? 'CAPITÃO (C)' : 'C'}
                                                        </button>

                                                        {/* Selecionar Sacador Atual da Dupla */}
                                                        <button
                                                            onClick={() => {
                                                                setCurrentServerIndex(prev => ({ ...prev, [team]: idx }));
                                                            }}
                                                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                                                                isCurrentTeamServer
                                                                    ? 'bg-emerald-500 text-slate-950 font-black'
                                                                    : 'bg-black/30 text-white/60 hover:text-white'
                                                            }`}
                                                            title="Definir como sacador atual desta dupla"
                                                        >
                                                            {isCurrentTeamServer ? 'Sacador Atual' : 'Definir Sacador'}
                                                        </button>

                                                        {/* Atendimento Médico 5 min (Lesão) */}
                                                        <button
                                                            onClick={() => {
                                                                setActiveMedicalTimeout({
                                                                    team,
                                                                    playerIndex: idx,
                                                                    secondsLeft: 300
                                                                });
                                                                const msg = `🚑 Atendimento médico de 5 minutos iniciado para ${player?.name} (${getTeamName(team)}).`;
                                                                appendLog(msg, 'medical');
                                                                registerSystemEvent('medical_timeout', msg);
                                                            }}
                                                            className="p-1.5 bg-red-600/70 hover:bg-red-600 rounded-lg text-white"
                                                            title="Iniciar Atendimento Médico de 5 minutos (Lesão)"
                                                        >
                                                            <HeartPulse size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Histórico de Sets */}
                <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/25">
                    <h3 className="text-sm font-black text-yellow-200 uppercase mb-3 flex items-center gap-2">
                        <Trophy size={16} /> Placar de Sets Finalizados
                    </h3>
                    <div className="space-y-2">
                        {sets.map((set, idx) => (
                            <div
                                key={idx}
                                className="bg-black/30 p-3.5 rounded-xl border border-white/20 flex items-center justify-between"
                            >
                                <span className="font-bold text-sm text-yellow-100">
                                    {set.set_number}º Set{' '}
                                    {set.set_number === 3 && <span className="text-xs text-red-300">(Tie-break)</span>}
                                </span>
                                <div className="flex items-center gap-6">
                                    <span
                                        className={`text-2xl font-black ${
                                            set.home_score > set.away_score ? 'text-emerald-300' : 'text-white/60'
                                        }`}
                                    >
                                        {set.home_score}
                                    </span>
                                    <span className="text-white/40 text-sm">x</span>
                                    <span
                                        className={`text-2xl font-black ${
                                            set.away_score > set.home_score ? 'text-emerald-300' : 'text-white/60'
                                        }`}
                                    >
                                        {set.away_score}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {sets.length === 0 && (
                            <div className="text-center text-white/70 py-4 text-xs">
                                Nenhum set finalizado ainda.
                            </div>
                        )}
                    </div>

                    {matchFinished && (
                        <div className="mt-5">
                            <button
                                onClick={handleFinish}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-2xl font-black text-lg border-b-4 border-emerald-950 active:scale-95 transition-all shadow-2xl"
                            >
                                ✅ SALVAR E ENCERRAR SÚMULA OFICIAL
                            </button>
                        </div>
                    )}
                </div>

                {/* Registro Cronológico da Súmula */}
                {matchLog.length > 0 && (
                    <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 border border-white/25">
                        <h4 className="font-black text-xs text-yellow-200 mb-2 uppercase">
                            📋 Registro de Eventos da Súmula
                        </h4>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                            {matchLog.map((item, i) => (
                                <div
                                    key={i}
                                    className="text-xs bg-black/25 px-3 py-1.5 rounded-lg border border-white/10 flex items-center justify-between gap-2"
                                >
                                    <span className="text-white/95 font-medium">{item.text}</span>
                                    <span className="text-[10px] text-amber-200/80 font-mono shrink-0">
                                        {item.set}ºS • {item.time}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Resumo Oficial das Regras Aplicadas na Súmula */}
                <div className="bg-black/35 backdrop-blur-md rounded-2xl p-4 border border-white/25">
                    <h4 className="font-black text-xs text-yellow-200 mb-2 uppercase">
                        🏖️ Regras Oficiais do Vôlei de Praia (Ativas na Súmula)
                    </h4>
                    <ul className="text-[11px] text-white/90 space-y-1 leading-relaxed">
                        <li>
                            • <strong>Formação e Substituições:</strong> 2 atletas por equipe em quadra, sem jogador reserva e sem substituições. Um atleta é indicado como Capitão (C) na súmula. Em caso de lesão sem retorno após 5 minutos de atendimento, a equipe é declarada incompleta.
                        </li>
                        <li>
                            • <strong>Pontuação e Sets:</strong> Melhor de 3 sets (Rally Point). 1º e 2º sets até 21 pontos (mín. 2 de vantagem); 3º set (Tie-break) até 15 pontos (mín. 2 de vantagem).
                        </li>
                        <li>
                            • <strong>Troca de Lado:</strong> Automática a cada <strong>7 pontos</strong> somados nos 1º e 2º sets, e a cada <strong>5 pontos</strong> somados no 3º set (Tie-break).
                        </li>
                        <li>
                            • <strong>Ordem de Saque:</strong> Se a equipe sacadora vence o rally, o mesmo atleta saca novamente. Se a equipe receptora vence o rally, ela ganha o saque e o atleta que não sacou da última vez passa a sacar.
                        </li>
                        <li>
                            • <strong>Faltas:</strong> Falta Dupla repete o rally sem ponto. Falta de Ordem de Saque concede 1 ponto e o saque para a dupla adversária.
                        </li>
                        <li>
                            • <strong>Tempos e Retardamento:</strong> Tempo de descanso dura <strong>30 segundos</strong>. Sanções por retardamento vigoram por toda a partida (1º = Advertência; 2º e seguintes = Penalidade com ponto e saque ao adversário).
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
