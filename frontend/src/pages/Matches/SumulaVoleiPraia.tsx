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
    History,
    Trash2,
    X
} from 'lucide-react';
import api from '../../services/api';
import { useOfflineResilience } from '../../hooks/useOfflineResilience';

type TeamSide = 'home' | 'away';
type BeachPointType = 'ataque' | 'bloqueio' | 'saque' | 'erro';

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

interface TimelineEvent {
    id: number | string;
    event_type: string;
    type?: string;
    team_id?: number | null;
    player_id?: number | null;
    player_name?: string | null;
    player_number?: number | string | null;
    period?: string;
    game_time?: string;
    value?: number;
    metadata?: {
        label?: string;
        volley_type?: string;
        player_name?: string;
        reason?: string;
        score?: string;
    } | null;
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
    home_team?: { id?: number; name?: string; code?: string };
    away_team?: { id?: number; name?: string; code?: string };
    details?: {
        arbitration?: { referee?: string };
        sets?: SetRecord[];
        events?: TimelineEvent[];
    };
    match_details?: Record<string, unknown> & {
        sync_state?: {
            score?: { home: number; away: number };
            currentSet?: number;
            servingTeam?: TeamSide;
            currentServerIndex?: { home: number; away: number };
            delaySanctions?: { home: number; away: number };
            captains?: { home: number; away: number };
            invertedCourt?: boolean;
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

    // Timeline Events (Linha do Tempo sincronizada com o backend)
    const [events, setEvents] = useState<TimelineEvent[]>([]);

    // Fluxo de Ponto igual ao Vôlei: Passo 1 (Tipo: Ataque/Normal, Bloqueio, Saque/Ace, Erro) -> Passo 2 (Jogador)
    const [pointFlow, setPointFlow] = useState<{
        step: 'type' | 'player';
        team: TeamSide;
        pointType?: BeachPointType;
    } | null>(null);

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

    // 2. Ordem de Saque
    const [servingTeam, setServingTeam] = useState<TeamSide>('home');
    const [currentServerIndex, setCurrentServerIndex] = useState<{ home: number; away: number }>({
        home: 0,
        away: 0
    });

    // 3. Troca de Lado (No 1º e 2º sets NÃO troca durante o set; no 3º set troca a cada 5 pontos)
    // Quando invertedCourt === true, TUDO na tela (placar, botões de ponto, ações e duplas) inverte de lado!
    const [invertedCourt, setInvertedCourt] = useState(false);
    const [sideSwitchAlert, setSideSwitchAlert] = useState<string | null>(null);

    // 4. Tempos de Descanso (30 segundos)
    const [timeoutsUsed, setTimeoutsUsed] = useState<{ home: number; away: number }>({ home: 0, away: 0 });
    const [activeTimeout, setActiveTimeout] = useState<{ team: TeamSide; secondsLeft: number } | null>(null);

    // 5. Atendimento Médico por Lesão (5 minutos = 300s)
    const [activeMedicalTimeout, setActiveMedicalTimeout] = useState<{
        team: TeamSide;
        playerIndex: number;
        secondsLeft: number;
    } | null>(null);

    // 6. Sanções por Retardamento (Vigoram por TODA A PARTIDA)
    const [delaySanctions, setDelaySanctions] = useState<{ home: number; away: number }>({ home: 0, away: 0 });

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

    const fetchEvents = useCallback(async () => {
        if (!id) return;
        try {
            const res = await api.get(`/admin/matches/${id}/events`);
            if (Array.isArray(res.data)) {
                setEvents(res.data);
            }
        } catch (e) {
            console.error('Erro ao buscar eventos da linha do tempo', e);
        }
    }, [id]);

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

                    if (data.details?.events && Array.isArray(data.details.events)) {
                        setEvents(
                            data.details.events.map((ev: TimelineEvent) => ({
                                ...ev,
                                event_type: ev.event_type || ev.type || 'point'
                            }))
                        );
                    }

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
                            if (typeof ss.invertedCourt === 'boolean') setInvertedCourt(ss.invertedCourt);
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
            fetchEvents();

            const syncInterval = setInterval(() => {
                if (getPendingCount() === 0) {
                    fetchMatchDetails(true);
                }
            }, 4000);

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
                    if (typeof parsed.invertedCourt === 'boolean') setInvertedCourt(parsed.invertedCourt);
                    if (parsed.duoPlayers) setDuoPlayers(parsed.duoPlayers);
                } catch (e) {
                    console.error('Failed to recover state', e);
                }
            }
            return () => clearInterval(syncInterval);
        }
    }, [id, STORAGE_KEY, fetchMatchDetails, fetchEvents, getPendingCount]);

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
            invertedCourt,
            duoPlayers
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [
        id,
        STORAGE_KEY,
        loading,
        sets,
        currentSet,
        score,
        matchFinished,
        servingTeam,
        currentServerIndex,
        captains,
        delaySanctions,
        timeoutsUsed,
        invertedCourt,
        duoPlayers
    ]);

    // Cronômetro de Pedido de Tempo (30 segundos)
    useEffect(() => {
        if (!activeTimeout) return;
        if (activeTimeout.secondsLeft <= 0) {
            setActiveTimeout(null);
            return;
        }
        const timer = setTimeout(() => {
            setActiveTimeout(prev => (prev ? { ...prev, secondsLeft: prev.secondsLeft - 1 } : null));
        }, 1000);
        return () => clearTimeout(timer);
    }, [activeTimeout]);

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
                            invertedCourt,
                            duoPlayers,
                            updated_at: Date.now()
                        }
                    }
                });
            } catch (e) {
                console.error('State sync failed', e);
            }
        }, 3000);

        return () => clearInterval(pingInterval);
    }, [
        id,
        isOnline,
        getPendingCount,
        loading,
        matchData,
        matchFinished,
        score,
        currentSet,
        servingTeam,
        currentServerIndex,
        captains,
        delaySanctions,
        invertedCourt,
        duoPlayers
    ]);

    const getOpponent = (team: TeamSide): TeamSide => (team === 'home' ? 'away' : 'home');

    const recordEventToServer = async (payload: {
        event_type: string;
        team_id?: number | null;
        player_id?: number | null;
        period?: string;
        value?: number;
        metadata?: Record<string, unknown>;
    }) => {
        const optimisticId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const optimisticEvent: TimelineEvent = {
            id: optimisticId,
            event_type: payload.event_type,
            team_id: payload.team_id,
            player_id: payload.player_id,
            period: payload.period || `${currentSet}º Set`,
            value: payload.value ?? 1,
            metadata: payload.metadata as TimelineEvent['metadata']
        };

        setEvents(prev => [optimisticEvent, ...prev]);

        if (isOnline && getPendingCount() === 0) {
            try {
                const res = await api.post(`/admin/matches/${id}/events`, payload);
                if (res.data && res.data.id) {
                    setEvents(prev =>
                        prev.map(ev =>
                            ev.id === optimisticId
                                ? {
                                      ...optimisticEvent,
                                      id: res.data.id
                                  }
                                : ev
                        )
                    );
                }
                return;
            } catch (e) {
                console.error('Fallback to offline queue for event', e);
            }
        }

        addToQueue('event', payload);
    };

    const registerSystemEvent = async (type: string, label: string, teamSide?: TeamSide) => {
        if (!matchData) return;
        const resolvedTeamId = teamSide
            ? teamSide === 'home'
                ? matchData.home_team_id
                : matchData.away_team_id
            : matchData.home_team_id || matchData.away_team_id;

        if (type === 'match_start') {
            setMatchData(prev => (prev ? { ...prev, status: 'live' } : prev));
        }

        await recordEventToServer({
            event_type: type,
            team_id: resolvedTeamId,
            period: `${currentSet}º Set`,
            metadata: { label }
        });
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
            alert(`🏆 Partida encerrada! ${winnerName} venceu!`);
            await registerSystemEvent('match_end', `Fim de Jogo! Vitória de ${winnerName}`);
        } else {
            const nextSet = currentSet + 1;
            setCurrentSet(nextSet);
            setScore({ home: 0, away: 0 });
            setTimeoutsUsed({ home: 0, away: 0 });
            setSideSwitchAlert(null);
            await registerSystemEvent('period_start', `Início do ${nextSet}º Set`);
        }
    };

    /**
     * Registra um ponto ganho em um rally completo:
     * - Se a equipe sacadora vence o rally: marca 1 ponto e o MESMO jogador continua a sacar.
     * - Se a equipe receptora vence o rally: marca 1 ponto, passa a sacar, e o jogador que NÃO sacou da última vez irá sacar.
     * - Troca de lado automática: APENAS no 3º set (Tie-break) a cada 5 pontos somados! (No 1º e 2º set não troca de lado durante o set).
     */
    const awardRallyPoint = async (
        winnerTeam: TeamSide,
        options?: {
            pointType?: BeachPointType;
            scorerPlayer?: DuoPlayer | null;
            reasonLabel?: string;
        }
    ) => {
        if (matchFinished || !matchData) return;

        if (matchData.status === 'scheduled' || matchData.status === 'Agendado') {
            await registerSystemEvent('match_start', 'Saque autorizado! Partida de Vôlei de Praia iniciada.');
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

        const newScore = {
            ...score,
            [winnerTeam]: score[winnerTeam] + 1
        };
        setScore(newScore);

        const totalPoints = newScore.home + newScore.away;
        const pointsNeeded = currentSet === 3 ? TIE_BREAK_POINTS : POINTS_TO_WIN;
        const loserTeam = getOpponent(winnerTeam);
        const isSetWon = newScore[winnerTeam] >= pointsNeeded && newScore[winnerTeam] >= newScore[loserTeam] + MIN_MARGIN;

        // Troca de Lado Automática: SOMENTE no 3º Set (Tie-break) a cada 5 pontos somados!
        if (!isSetWon && currentSet === 3 && totalPoints > 0 && totalPoints % 5 === 0) {
            setInvertedCourt(prev => !prev);
            const msg = `🔄 TROCA DE LADO! Soma de ${totalPoints} pontos no Tie-break (múltiplo de 5). Lados da súmula invertidos!`;
            setSideSwitchAlert(msg);
            await registerSystemEvent('side_switch', msg);
        } else {
            setSideSwitchAlert(null);
        }

        const pType = options?.pointType || 'ataque';
        const scorer = options?.scorerPlayer || null;

        const typeLabels: Record<BeachPointType, string> = {
            ataque: 'Ponto de Ataque / Normal',
            bloqueio: 'Ponto de Bloqueio',
            saque: 'Ponto de Saque (Ace)',
            erro: 'Ponto (Erro do Adversário)'
        };

        const eventTypeForDb = pType === 'saque' ? 'ace' : pType === 'bloqueio' ? 'block' : 'point';
        const displayLabel =
            options?.reasonLabel ||
            (scorer
                ? `${typeLabels[pType]}: ${scorer.name} (#${scorer.number || ''})`
                : `${typeLabels[pType]} (${getTeamName(winnerTeam)})`);

        await recordEventToServer({
            event_type: eventTypeForDb,
            team_id: winnerTeam === 'home' ? matchData.home_team_id : matchData.away_team_id,
            player_id: typeof scorer?.id === 'number' ? scorer.id : null,
            period: `${currentSet}º Set`,
            value: 1,
            metadata: {
                volley_type: pType,
                label: displayLabel,
                player_name: scorer?.name || undefined,
                reason: options?.reasonLabel || pType,
                score: `${newScore.home}-${newScore.away}`
            }
        });

        if (isSetWon) {
            await finishSet(newScore);
        }
    };

    // Passo 1: Clicou em "+ PONTO" -> abre modal de Tipo de Ponto
    const handleOpenPointModal = (team: TeamSide) => {
        if (matchFinished) return;
        setPointFlow({ step: 'type', team });
    };

    // Passo 2: Selecionou o Tipo de Ponto
    const handleSelectPointType = async (pointType: BeachPointType) => {
        if (!pointFlow) return;
        const { team } = pointFlow;

        // Se for SAQUE (Ace): já sabemos quem está sacando naquele time, inclui o jogador automático sem precisar selecionar!
        if (pointType === 'saque') {
            const serverIdx = currentServerIndex[team];
            const currentServer = duoPlayers[team][serverIdx];
            setPointFlow(null);
            await awardRallyPoint(team, {
                pointType: 'saque',
                scorerPlayer: currentServer
            });
            return;
        }

        // Se for ERRO DO ADVERSÁRIO: confirma direto sem selecionar jogador
        if (pointType === 'erro') {
            setPointFlow(null);
            await awardRallyPoint(team, {
                pointType: 'erro',
                scorerPlayer: null
            });
            return;
        }

        // Se for ATAQUE/NORMAL ou BLOQUEIO: avança para escolher qual dos 2 atletas da dupla fez o ponto
        setPointFlow({
            step: 'player',
            team,
            pointType
        });
    };

    // Passo 3: Selecionou qual dos 2 atletas fez o ponto (Ataque ou Bloqueio)
    const handleConfirmPointPlayer = async (player: DuoPlayer) => {
        if (!pointFlow || !pointFlow.pointType) return;
        const { team, pointType } = pointFlow;
        setPointFlow(null);
        await awardRallyPoint(team, {
            pointType,
            scorerPlayer: player
        });
    };

    // Excluir um lançamento da Linha do Tempo (e reverter 1 ponto se for evento de ponto no set atual)
    const handleDeleteEvent = async (ev: TimelineEvent) => {
        if (!matchData) return;
        if (!window.confirm('Deseja excluir este lançamento da linha do tempo? (Se for um ponto deste set, o placar será ajustado automaticamente)')) {
            return;
        }

        const isPointEvent = ['point', 'ace', 'block', 'goal'].includes(ev.event_type);
        const evSetMatch = ev.period ? ev.period.match(/(\d+)/) : null;
        const evSetNum = evSetMatch ? parseInt(evSetMatch[1], 10) : currentSet;

        try {
            if (typeof ev.id === 'number' || !String(ev.id).startsWith('temp_')) {
                await api.delete(`/admin/matches/${id}/events/${ev.id}`);
            }
            setEvents(prev => prev.filter(item => item.id !== ev.id));

            if (isPointEvent && evSetNum === currentSet) {
                const isHomeTeam = ev.team_id === matchData.home_team_id;
                const side: TeamSide = isHomeTeam ? 'home' : 'away';
                setScore(prev => ({
                    ...prev,
                    [side]: Math.max(0, prev[side] - 1)
                }));
            }
        } catch (e) {
            console.error('Erro ao excluir evento', e);
            alert('Não foi possível excluir o evento no servidor.');
        }
    };

    const removePoint = (team: TeamSide) => {
        if (score[team] > 0) {
            setScore(prev => ({ ...prev, [team]: prev[team] - 1 }));
        }
    };

    const handleServiceOrderFault = async (faultingTeam: TeamSide) => {
        const opponent = getOpponent(faultingTeam);
        const msg = `⚠️ Falta de Ordem de Saque (${getTeamName(faultingTeam)})`;
        await awardRallyPoint(opponent, {
            pointType: 'erro',
            reasonLabel: `${msg} — Ponto para ${getTeamName(opponent)}`
        });
    };

    const handleDoubleFault = async () => {
        const server = duoPlayers[servingTeam][currentServerIndex[servingTeam]];
        const msg = `🤝 FALTA DUPLA! Rally repetido (Saca: #${server?.number || 1} ${server?.name})`;
        await registerSystemEvent('double_fault', msg, servingTeam);
    };

    const handleRequestTimeout = async (team: TeamSide) => {
        if (activeTimeout) return;
        setTimeoutsUsed(prev => ({ ...prev, [team]: prev[team] + 1 }));
        setActiveTimeout({ team, secondsLeft: 30 });
        const msg = `⏱️ Pedido de Tempo (30s) — ${getTeamName(team)} (${score.home}x${score.away})`;
        await registerSystemEvent('timeout', msg, team);
    };

    const handleDelaySanction = async (sanctionedTeam: TeamSide) => {
        const currentCount = delaySanctions[sanctionedTeam];
        const nextCount = currentCount + 1;
        setDelaySanctions(prev => ({ ...prev, [sanctionedTeam]: nextCount }));

        if (nextCount === 1) {
            const msg = `🟨 ADVERTÊNCIA POR RETARDAMENTO — ${getTeamName(sanctionedTeam)}`;
            await registerSystemEvent('delay_warning', msg, sanctionedTeam);
        } else {
            const opponent = getOpponent(sanctionedTeam);
            const msg = `🟥 PENALIDADE POR RETARDAMENTO (#${nextCount}) contra ${getTeamName(sanctionedTeam)}`;
            await awardRallyPoint(opponent, {
                pointType: 'erro',
                reasonLabel: `${msg} — Ponto e saque para ${getTeamName(opponent)}`
            });
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

        const msg = `🛑 EQUIPE INCOMPLETA: ${incompleteName} não pôde continuar após atendimento médico. Vitória de ${winnerName}!`;
        await registerSystemEvent('team_incomplete', msg, incompleteTeam);

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
    const totalPointsInSet = score.home + score.away;
    const pointsUntilTieBreakSwitch = 5 - (totalPointsInSet % 5);

    if (loading || !matchData) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    const activeServingPlayer = duoPlayers[servingTeam][currentServerIndex[servingTeam]];

    // Quando invertedCourt === true, a ordem visual de TUDO (Placar, Botões de Ponto/Ações e Duplas) inverte!
    const orderedSides: TeamSide[] = invertedCourt ? ['away', 'home'] : ['home', 'away'];
    const leftSide = orderedSides[0];
    const rightSide = orderedSides[1];

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-600 via-orange-600 to-amber-800 text-white font-sans pb-24">
            {/* Header & Placar Principal (Segue a ordem visual dos lados da quadra!) */}
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
                            Melhor de 3 Sets • {currentSet === 3 ? 'Tie-break (15 pts / troca a cada 5 pts)' : `${currentSet}º Set (21 pts / sem troca de lado)`}
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

                {/* Sets & Placar do Set Atual — Espelha leftSide e rightSide */}
                <div className="px-4 max-w-4xl mx-auto">
                    <div className="bg-black/35 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/25 shadow-xl">
                        <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-amber-200 mb-2 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                                ⬅️ Lado Esq.: <strong className="text-white">{getTeamName(leftSide)}</strong>
                            </span>
                            <span className="flex items-center gap-1.5 bg-white/15 px-3 py-0.5 rounded-full text-white">
                                SET {currentSet}
                                {currentSet === 3 && (
                                    <span className="bg-red-500 px-1.5 py-0.5 rounded text-[9px] font-black animate-pulse">
                                        TIE-BREAK
                                    </span>
                                )}
                            </span>
                            <span className="flex items-center gap-1">
                                Lado Dir.: <strong className="text-white">{getTeamName(rightSide)}</strong> ➡️
                            </span>
                        </div>

                        <div className="grid grid-cols-3 items-center gap-2 text-center">
                            {/* Equipe no Lado Esquerdo Atual */}
                            <div>
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    {servingTeam === leftSide && (
                                        <span className="bg-yellow-400 text-slate-950 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                                            <Volleyball size={10} /> SAQUE
                                        </span>
                                    )}
                                    <h2
                                        className={`font-black text-xs sm:text-base truncate ${
                                            leftSide === 'home' ? 'text-blue-200' : 'text-emerald-200'
                                        }`}
                                    >
                                        {getTeamName(leftSide)}
                                    </h2>
                                </div>
                                <div className="text-5xl sm:text-6xl font-black text-white leading-none tabular-nums">
                                    {score[leftSide]}
                                </div>
                                <div className="mt-1 inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold text-yellow-200">
                                    Sets: <strong className="text-white text-sm">{leftSide === 'home' ? matchData.scoreHome : matchData.scoreAway}</strong>
                                </div>
                            </div>

                            {/* Info Central (Sacador Atual e Troca no Tie-break) */}
                            <div className="flex flex-col items-center justify-center space-y-1.5">
                                <div className="text-[11px] font-extrabold uppercase text-white/85">
                                    Alvo: {currentPointsNeeded} pts (dif. {MIN_MARGIN})
                                </div>
                                <div className="bg-amber-500/30 border border-amber-300/40 rounded-xl px-2.5 py-1.5 text-[11px] text-center">
                                    <div className="text-amber-100 font-bold uppercase text-[9px]">Sacando Agora</div>
                                    <div className="font-black text-white text-xs truncate max-w-[135px]">
                                        #{activeServingPlayer?.number || currentServerIndex[servingTeam] + 1}{' '}
                                        {activeServingPlayer?.name}
                                    </div>
                                </div>
                                {currentSet === 3 ? (
                                    <div className="text-[10px] text-yellow-100 font-semibold">
                                        Troca de lado em <strong>{pointsUntilTieBreakSwitch}</strong> pt(s)
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-white/70 font-medium">
                                        Sem troca de lado no {currentSet}º Set
                                    </div>
                                )}
                            </div>

                            {/* Equipe no Lado Direito Atual */}
                            <div>
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <h2
                                        className={`font-black text-xs sm:text-base truncate ${
                                            rightSide === 'home' ? 'text-blue-200' : 'text-emerald-200'
                                        }`}
                                    >
                                        {getTeamName(rightSide)}
                                    </h2>
                                    {servingTeam === rightSide && (
                                        <span className="bg-yellow-400 text-slate-950 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                                            <Volleyball size={10} /> SAQUE
                                        </span>
                                    )}
                                </div>
                                <div className="text-5xl sm:text-6xl font-black text-white leading-none tabular-nums">
                                    {score[rightSide]}
                                </div>
                                <div className="mt-1 inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold text-yellow-200">
                                    Sets: <strong className="text-white text-sm">{rightSide === 'home' ? matchData.scoreHome : matchData.scoreAway}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 mt-4 space-y-5">
                {/* Alerta Automático de Troca de Lado (Apenas no 3º set a cada 5 pts) */}
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
                            OK, Confirmado
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

                {/* Botões Principais de Ponto e Ações — Seguem `orderedSides` (Trocam de lado na tela junto com o placar!) */}
                {!matchFinished && (
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                        {orderedSides.map((team, sidePosIdx) => {
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
                                            {sidePosIdx === 0 ? '⬅️ ' : ''}
                                            {getTeamName(team)}
                                            {sidePosIdx === 1 ? ' ➡️' : ''}
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
                                        onClick={() => handleOpenPointModal(team)}
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
                            }}
                            className="py-3 px-4 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                        >
                            <Volleyball size={15} /> Inverter Equipe Sacadora
                        </button>

                        <button
                            onClick={() => {
                                setInvertedCourt(prev => !prev);
                            }}
                            className="py-3 px-4 bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-300/40 text-yellow-100 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                        >
                            <Repeat size={15} /> Trocar Lados na Tela (Esq ⇄ Dir)
                        </button>
                    </div>
                )}

                {/* Formação das Duplas — Também segue `orderedSides` (Esquerda <-> Direita) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orderedSides.map((team, sidePosIdx) => {
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
                                            {sidePosIdx === 0 ? '⬅️ ' : ''}Dupla: {getTeamName(team)}
                                            {sidePosIdx === 1 ? ' ➡️' : ''}
                                        </h3>
                                        <p className="text-[10px] text-white/75">
                                            2 atletas em quadra • Toque em <Crown size={10} className="inline" /> (C) para Capitão
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
                                                className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                                                    isServingRightNow
                                                        ? 'bg-yellow-400/20 border-yellow-300'
                                                        : 'bg-white/10 border-white/15'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <span className="w-6 h-6 rounded-lg bg-black/40 text-yellow-300 font-black text-xs flex items-center justify-center shrink-0">
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
                                                            className="bg-black/40 text-white text-xs font-bold rounded-lg px-2 py-1.5 border border-white/20 truncate flex-1 min-w-0"
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
                                                            className="bg-black/30 text-white text-xs font-bold rounded-lg px-2.5 py-1 border border-white/20 flex-1 min-w-0"
                                                        />
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    {/* Tag Compacta de Capitão: Apenas ícone + (C) para não cortar o nome */}
                                                    <button
                                                        onClick={() => {
                                                            setCaptains(prev => ({ ...prev, [team]: idx }));
                                                        }}
                                                        className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-0.5 transition-all ${
                                                            isCaptain
                                                                ? 'bg-yellow-400 text-slate-950 shadow'
                                                                : 'bg-black/30 text-white/60 hover:text-white'
                                                        }`}
                                                        title="Capitão da Dupla (C)"
                                                    >
                                                        <Crown size={11} />
                                                        <span>(C)</span>
                                                    </button>

                                                    {/* Selecionar Sacador Atual da Dupla */}
                                                    <button
                                                        onClick={() => {
                                                            setCurrentServerIndex(prev => ({ ...prev, [team]: idx }));
                                                        }}
                                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                                                            isCurrentTeamServer
                                                                ? 'bg-emerald-500 text-slate-950 font-black'
                                                                : 'bg-black/30 text-white/60 hover:text-white'
                                                        }`}
                                                        title="Sacador atual desta dupla"
                                                    >
                                                        <Volleyball size={11} />
                                                        <span>{isCurrentTeamServer ? 'Saca' : 'Sacar'}</span>
                                                    </button>

                                                    {/* Atendimento Médico 5 min (Lesão) */}
                                                    <button
                                                        onClick={async () => {
                                                            setActiveMedicalTimeout({
                                                                team,
                                                                playerIndex: idx,
                                                                secondsLeft: 300
                                                            });
                                                            const msg = `🚑 Atendimento médico (5 min) — ${player?.name} (${getTeamName(team)})`;
                                                            await registerSystemEvent('medical_timeout', msg, team);
                                                        }}
                                                        className="p-1.5 bg-red-600/70 hover:bg-red-600 rounded-lg text-white"
                                                        title="Atendimento Médico de 5 minutos (Lesão)"
                                                    >
                                                        <HeartPulse size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* LINHA DO TEMPO (Últimos Lançamentos com botão de Excluir para desfazer/voltar) */}
                <div className="bg-black/35 backdrop-blur-md rounded-2xl p-4 border border-white/25">
                    <h3 className="text-xs font-black text-yellow-200 uppercase tracking-widest flex items-center gap-2 mb-3">
                        <History size={15} /> Linha do Tempo (Últimos Lançamentos)
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {events.length === 0 ? (
                            <div className="text-center py-6 bg-black/20 rounded-xl border border-dashed border-white/20 text-white/60 text-xs font-bold uppercase">
                                Nenhum lançamento registrado ainda
                            </div>
                        ) : (
                            events.map(ev => {
                                const isHome = ev.team_id === matchData.home_team_id;
                                const isAway = ev.team_id === matchData.away_team_id;
                                const teamLabel = isHome
                                    ? getTeamName('home')
                                    : isAway
                                    ? getTeamName('away')
                                    : 'Partida';
                                const isPoint = ['point', 'ace', 'block', 'goal'].includes(ev.event_type);

                                const getEventIcon = (type: string, vType?: string) => {
                                    if (vType === 'bloqueio' || type === 'block') return '🤚';
                                    if (vType === 'saque' || type === 'ace') return '🎯';
                                    if (vType === 'erro') return '❌';
                                    if (type === 'timeout') return '⏱️';
                                    if (type === 'delay_warning') return '🟨';
                                    if (type === 'delay_penalty') return '🟥';
                                    if (type === 'side_switch') return '🔄';
                                    if (type === 'double_fault') return '🤝';
                                    if (type === 'medical_timeout') return '🚑';
                                    if (type === 'team_incomplete') return '🛑';
                                    return '🏐';
                                };

                                const getFriendlyEventText = (item: TimelineEvent) => {
                                    if (item.metadata?.label) return item.metadata.label;
                                    const pName = item.player_name || item.metadata?.player_name || '';
                                    const pNum = item.player_number ? ` (#${item.player_number})` : '';
                                    if (item.event_type === 'ace') return `Ponto de Saque (Ace)${pName ? `: ${pName}${pNum}` : ''}`;
                                    if (item.event_type === 'block') return `Ponto de Bloqueio${pName ? `: ${pName}${pNum}` : ''}`;
                                    if (item.event_type === 'point') return `Ponto${pName ? `: ${pName}${pNum}` : ''}`;
                                    if (item.event_type === 'timeout') return 'Pedido de Tempo (30s)';
                                    return item.event_type;
                                };

                                return (
                                    <div
                                        key={ev.id}
                                        className="bg-black/35 border border-white/15 rounded-xl p-2.5 flex items-center justify-between gap-3 hover:bg-black/45 transition-all"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-lg shrink-0">
                                                {getEventIcon(ev.event_type, ev.metadata?.volley_type)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span
                                                        className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                                            isHome
                                                                ? 'bg-blue-500/30 text-blue-200 border border-blue-400/30'
                                                                : isAway
                                                                ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                                                                : 'bg-white/15 text-white/80'
                                                        }`}
                                                    >
                                                        {teamLabel}
                                                    </span>
                                                    <span className="text-[10px] text-amber-200/80 font-mono">
                                                        {ev.period || `${currentSet}º Set`}
                                                    </span>
                                                    {ev.metadata?.score && (
                                                        <span className="text-[10px] font-black bg-black/40 text-yellow-300 px-1.5 py-0.5 rounded">
                                                            {ev.metadata.score}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5 truncate">
                                                    {isPoint && (
                                                        <span className="text-emerald-400 font-black shrink-0">+1</span>
                                                    )}
                                                    <span className="truncate">{getFriendlyEventText(ev)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDeleteEvent(ev)}
                                            className="p-2.5 text-white/60 hover:text-red-400 hover:bg-red-500/20 rounded-xl transition-colors shrink-0"
                                            title="Excluir lançamento e voltar placar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
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
            </div>

            {/* MODAL DE TIPO DE PONTO E SELEÇÃO DO JOGADOR (Igual ao Vôlei, com Saque Automático!) */}
            {pointFlow && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/20 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
                        {pointFlow.step === 'type' ? (
                            <>
                                <div className="text-center mb-5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                                        Lançar Ponto Para
                                    </span>
                                    <h3 className="font-black text-xl text-white mt-0.5">
                                        {getTeamName(pointFlow.team)}
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleSelectPointType('ataque')}
                                        className="p-5 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-2xl font-black text-sm uppercase flex flex-col items-center justify-center gap-1.5 shadow-lg border-b-4 border-blue-800"
                                    >
                                        <span className="text-2xl">🏐</span>
                                        <span>Ataque / Normal</span>
                                    </button>

                                    <button
                                        onClick={() => handleSelectPointType('bloqueio')}
                                        className="p-5 bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all rounded-2xl font-black text-sm uppercase flex flex-col items-center justify-center gap-1.5 shadow-lg border-b-4 border-purple-800"
                                    >
                                        <span className="text-2xl">🤚</span>
                                        <span>Bloqueio</span>
                                    </button>

                                    <button
                                        onClick={() => handleSelectPointType('saque')}
                                        className="p-5 bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-95 transition-all rounded-2xl font-black text-sm uppercase flex flex-col items-center justify-center gap-1 shadow-lg border-b-4 border-amber-700"
                                    >
                                        <span className="text-2xl">🎯</span>
                                        <span>Saque (Ace)</span>
                                        <span className="text-[10px] font-extrabold text-slate-900 truncate max-w-full">
                                            Auto: #{duoPlayers[pointFlow.team][currentServerIndex[pointFlow.team]]?.number || 1}{' '}
                                            {duoPlayers[pointFlow.team][currentServerIndex[pointFlow.team]]?.name}
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => handleSelectPointType('erro')}
                                        className="p-5 bg-red-600 hover:bg-red-500 active:scale-95 transition-all rounded-2xl font-black text-sm uppercase flex flex-col items-center justify-center gap-1.5 shadow-lg border-b-4 border-red-800"
                                    >
                                        <span className="text-2xl">❌</span>
                                        <span>Erro Adversário</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-center mb-5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                                        {pointFlow.pointType === 'bloqueio' ? '🤚 Ponto de Bloqueio' : '🏐 Ponto de Ataque / Normal'}
                                    </span>
                                    <h3 className="font-black text-xl text-white mt-0.5">
                                        Quem fez o ponto?
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    {duoPlayers[pointFlow.team].map((player, idx) => (
                                        <button
                                            key={player.id}
                                            onClick={() => handleConfirmPointPlayer(player)}
                                            className="p-5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all rounded-2xl border-b-4 border-indigo-800 flex flex-col items-center justify-center gap-1.5 shadow-lg"
                                        >
                                            <span className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center font-black text-lg text-yellow-300">
                                                #{player.number || idx + 1}
                                            </span>
                                            <span className="font-black text-sm text-white text-center line-clamp-2">
                                                {player.name}
                                            </span>
                                            {captains[pointFlow.team] === idx && (
                                                <span className="text-[10px] font-black text-yellow-300 flex items-center gap-0.5">
                                                    <Crown size={10} /> (C)
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        <button
                            onClick={() => setPointFlow(null)}
                            className="mt-4 w-full py-3.5 bg-white/10 hover:bg-white/15 text-white/80 rounded-2xl font-bold text-xs uppercase tracking-widest"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
