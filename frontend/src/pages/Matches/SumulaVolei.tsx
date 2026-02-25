import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, PlusCircle, History, Trophy, X, Repeat, ArrowRightLeft, UserPlus, AlertOctagon, XCircle, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { useOfflineResilience } from '../../hooks/useOfflineResilience';

export function SumulaVolei() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [volleyState, setVolleyState] = useState<any>(null);
    const [rotations, setRotations] = useState<any>({ home: Array(6).fill(null), away: Array(6).fill(null) });
    const [sets, setSets] = useState<any[]>([]);
    const [teamPlayers, setTeamPlayers] = useState<any>({ home: [], away: [] });
    const [events, setEvents] = useState<any[]>([]);

    // UI Modal States
    const [rotationViewOpen, setRotationViewOpen] = useState(false);
    const [subModalOpen, setSubModalOpen] = useState(false);
    const [courtVisible, setCourtVisible] = useState(true);
    const [pointFlow, setPointFlow] = useState<{ step: 'type' | 'player', teamId: number, type?: string } | null>(null);
    const [cardFlow, setCardFlow] = useState<{ teamId: number } | null>(null);
    const [setupModalOpen, setSetupModalOpen] = useState(false);
    const [invertedSides, setInvertedSides] = useState(false);
    const [subData, setSubData] = useState<{ teamId: number, position: number, currentPlayerId: number } | null>(null);
    const [setupRotation, setSetupRotation] = useState<{ home: any[], away: any[] }>({ home: Array(6).fill(null), away: Array(6).fill(null) });
    const [servingTeamId, setServingTeamId] = useState<number | null>(null);

    // 🛡️ Resilience Shield
    const { isOnline, syncing, addToQueue, registerSystemEvent, pendingCount } = useOfflineResilience(id, 'Vôlei', async (action, data) => {
        let url = '';
        switch (action) {
            case 'point': url = `/admin/matches/${id}/volley/point`; break;
            case 'rotation': url = `/admin/matches/${id}/volley/rotation`; break;
            case 'set-start': url = `/admin/matches/${id}/volley/set-start`; break;
            case 'set-finish': url = `/admin/matches/${id}/volley/set-finish`; break;
            case 'substitution': url = `/admin/matches/${id}/volley/substitution`; break;
            case 'event':
            case 'timeout':
            case 'card':
            case 'match_start': url = `/admin/matches/${id}/events`; break;
        }
        if (url) return await api.post(url, data);
    });

    useEffect(() => {
        if (id) {
            fetchFullDetails();
            const timer = setInterval(() => {
                if (!pendingCount || pendingCount === 0) {
                    fetchState(true);
                }
            }, 5000);
            return () => clearInterval(timer);
        }
    }, [id, pendingCount]);

    const fetchFullDetails = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            await fetchState(true);
            const response = await api.get(`/admin/matches/${id}/volley-state`);
            processStateResponse(response.data);
            const hasHome = response.data.current_rotations?.home?.filter((x: any) => x).length === 6;
            const hasAway = response.data.current_rotations?.away?.filter((x: any) => x).length === 6;
            if ((!hasHome || !hasAway) && response.data.state.current_set === 1 && response.data.sets.length <= 1 && response.data.sets[0]?.home_score === 0) {
                if (!silent) setSetupModalOpen(true);
            }
        } catch (e) {
            console.error(e);
            if (!silent) alert('Erro ao carregar detalhes do vôlei');
        } finally {
            if (!silent) setLoading(false);
        }
    }

    const fetchState = async (silent = false) => {
        if (!isOnline) return;
        try {
            const [stateRes, eventsRes] = await Promise.all([
                api.get(`/admin/matches/${id}/volley-state`),
                api.get(`/admin/matches/${id}/events`)
            ]);
            processStateResponse(stateRes.data);
            setEvents(eventsRes.data || []);
        } catch (e: any) {
            console.error(e);
        }
    };

    const processStateResponse = (data: any) => {
        setMatchData(data.match);
        setVolleyState(data.state);
        setSets(data.sets);
        setRotations(data.current_rotations);
        setServingTeamId(data.state.serving_team_id);
        if (data.match) {
            const homeP = (data.match.home_team || data.match.homeTeam)?.players || [];
            const awayP = (data.match.away_team || data.match.awayTeam)?.players || [];
            setTeamPlayers({ home: homeP, away: awayP });
        }
        setLoading(false);
    }

    const handlePointClick = (teamId: number) => setPointFlow({ step: 'type', teamId });
    const selectPointType = (type: string) => pointFlow && setPointFlow({ ...pointFlow, step: 'player', type });

    const confirmPointPlayer = async (playerId: number | null) => {
        if (!pointFlow || !pointFlow.type) return;
        const { teamId, type } = pointFlow;
        const pid = playerId;
        setPointFlow(null);

        const isHome = teamId === matchData?.home_team_id;
        const currentSetNum = volleyState.current_set;

        setSets(prev => prev.map(s => s.set_number == currentSetNum ? {
            ...s,
            home_score: isHome ? (s.home_score + 1) : s.home_score,
            away_score: !isHome ? (s.away_score + 1) : s.away_score
        } : s));

        if (servingTeamId !== teamId) setServingTeamId(teamId);

        addToQueue('point', { team_id: teamId, point_type: type, player_id: pid });

        const playerObj = pid ? teamPlayers[isHome ? 'home' : 'away'].find((p: any) => p.id === pid) : null;
        const pName = playerObj ? (playerObj.nickname || playerObj.name) : null;
        const newEvent = {
            id: 'temp-' + Date.now(),
            event_type: type,
            team_id: teamId,
            player_name: pName,
            player_number: playerObj?.pivot?.number,
            period: `${currentSetNum}º Set`,
            metadata: { label: `Ponto de ${type}: ${pName || (isHome ? 'Mandante' : 'Visitante')}` },
            created_at: new Date().toISOString()
        };
        setEvents(prev => [newEvent, ...prev]);
    };

    const handleRotation = (teamId: number, direction: 'forward' | 'backward') => {
        const isHome = teamId === matchData?.home_team_id;
        setRotations((prev: any) => {
            const current = [...(isHome ? prev.home : prev.away)];
            if (direction === 'forward') {
                const last = current.pop();
                current.unshift(last);
            } else {
                const first = current.shift();
                current.push(first);
            }
            return isHome ? { ...prev, home: current } : { ...prev, away: current };
        });
        addToQueue('rotation', { team_id: teamId, direction });
    };

    const handleSelfError = (committingTeamId: number) => {
        if (!matchData) return;
        const receivingTeamId = committingTeamId === matchData.home_team_id ? matchData.away_team_id : matchData.home_team_id;
        const receivingTeamName = receivingTeamId === matchData.home_team_id ? matchData.home_team?.name : matchData.away_team?.name;
        if (window.confirm(`Registrar ERRO COMETIDO por este time? \n(Ponto para ${receivingTeamName})`)) {
            setPointFlow({ step: 'player', teamId: receivingTeamId, type: 'erro' });
            confirmPointPlayer(null);
        }
    };

    const handleTimeout = (teamId: number) => {
        if (!window.confirm(`Registrar Pedido de Tempo?`)) return;
        const teamName = teamId === matchData?.home_team_id ? matchData.home_team?.name : matchData.away_team?.name;
        const currentSetLabel = `${volleyState.current_set}º Set`;
        const newEvent = {
            id: 'timeout-' + Date.now(),
            event_type: 'timeout',
            team_id: teamId,
            period: currentSetLabel,
            metadata: { label: `Pedido de Tempo: ${teamName}` },
            created_at: new Date().toISOString()
        };
        setEvents(prev => [newEvent, ...prev]);
        addToQueue('timeout', {
            event_type: 'timeout', team_id: teamId, minute: "00:00", period: currentSetLabel,
            metadata: { label: `Pedido de Tempo: ${teamName}`, system_period: currentSetLabel }
        });
    };

    const openCardModal = (teamId: number) => setCardFlow({ teamId });

    const confirmCard = (playerId: number, cardType: 'yellow' | 'red') => {
        if (!cardFlow) return;
        const { teamId } = cardFlow;
        const isHome = teamId === matchData?.home_team_id;
        setCardFlow(null);
        const playerObj = (isHome ? teamPlayers.home : teamPlayers.away).find((p: any) => p.id === playerId);
        const pName = playerObj ? (playerObj.nickname || playerObj.name) : 'Jogador';
        const newEvent = {
            id: 'card-' + Date.now(),
            event_type: cardType === 'yellow' ? 'yellow_card' : 'red_card',
            team_id: teamId,
            player_id: playerId,
            player_name: pName,
            player_number: playerObj?.pivot?.number,
            period: `${volleyState.current_set}º Set`,
            metadata: { label: `Cartão ${cardType === 'yellow' ? 'Amarelo' : 'Vermelho'}: ${pName}` },
            created_at: new Date().toISOString()
        };
        setEvents(prev => [newEvent, ...prev]);
        addToQueue('card', {
            event_type: cardType === 'yellow' ? 'yellow_card' : 'red_card', team_id: teamId, player_id: playerId,
            minute: "00:00", period: `${volleyState.current_set}º Set`, metadata: { system_period: `${volleyState.current_set}º Set` }
        });
    }

    const openSubModal = (teamId: number, posIndex: number, currentId: number) => {
        setSubData({ teamId, position: posIndex + 1, currentPlayerId: currentId });
        setSubModalOpen(true);
    }

    const confirmSub = (playerInId: number) => {
        if (!subData) return;
        const { teamId, position } = subData;
        setRotations((prev: any) => {
            const current = [...(teamId === matchData.home_team_id ? prev.home : prev.away)];
            current[position - 1] = playerInId;
            return teamId === matchData.home_team_id ? { ...prev, home: current } : { ...prev, away: current };
        });
        addToQueue('substitution', { team_id: teamId, position: position, player_in: playerInId });
        setSubModalOpen(false);
        setSubData(null);
    };

    const handleDeleteEvent = async (eventId: number) => {
        if (!window.confirm("Deseja cancelar este lançamento? (O placar será ajustado automaticamente se for um ponto)")) return;
        try {
            await api.delete(`/admin/matches/${id}/events/${eventId}`);
            registerSystemEvent('user_action', `Excluiu/Cancelou evento ID: ${eventId}`);
            fetchState();
        } catch (e: any) {
            alert("Erro ao excluir evento");
        }
    };

    const confirmSetup = async () => {
        if (!matchData) return;
        const hFull = (rotations?.home || []).filter((x: any) => x).length === 6;
        const aFull = (rotations?.away || []).filter((x: any) => x).length === 6;
        if (!hFull || !aFull) { alert("Ainda há posições vazias na quadra."); return; }
        if (!servingTeamId) { alert("Selecione qual equipe inicia sacando."); return; }
        addToQueue('set-start', { set_number: volleyState.current_set || 1, home_rotation: rotations.home, away_rotation: rotations.away, serving_team_id: servingTeamId });
        if (matchData.status === 'scheduled') {
            addToQueue('match_start', { event_type: 'match_start', team_id: null, minute: "00:00", period: 'Pré-jogo', metadata: { label: 'Partida Iniciada!', system_period: 'Pré-jogo' } });
            setMatchData((prev: any) => ({ ...prev, status: 'live' }));
        }
        setSetupModalOpen(false);
        fetchFullDetails();
    };

    const handleNextSet = async () => {
        const currentSetNum = volleyState.current_set || 1;
        const currentSet = sets.find((s: any) => s.set_number == currentSetNum);
        const limit = currentSetNum === 5 ? 15 : 25;
        const isSetFinished = currentSet && ((currentSet.home_score >= limit && currentSet.home_score >= currentSet.away_score + 2) || (currentSet.away_score >= limit && currentSet.away_score >= currentSet.home_score + 2));
        if (!isSetFinished && !window.confirm("O set atual ainda não atingiu a pontuação final. Deseja realmente ENCERRAR?")) return;
        addToQueue('set-finish', { set_number: currentSetNum });
        setSets(prev => {
            const newSets = prev.map(s => s.set_number === currentSetNum ? { ...s, is_finished: true } : s);
            if (currentSetNum < 5) newSets.push({ id: 'temp-' + (currentSetNum + 1), match_id: matchData.id, set_number: currentSetNum + 1, home_score: 0, away_score: 0, is_finished: false, start_time: new Date().toISOString(), end_time: null });
            return newSets;
        });
        setVolleyState(prev => ({ ...prev, current_set: currentSetNum + 1 }));
        alert(`Set ${currentSetNum} finalizado! O próximo set será o ${currentSetNum + 1}º.`);
        setSetupModalOpen(true);
    };

    const copyLastRotation = (team: 'home' | 'away') => rotations[team] && setSetupRotation(prev => ({ ...prev, [team]: [...rotations[team]] }));
    const fillSetupSlot = (team: 'home' | 'away', index: number, playerId: any) => setSetupRotation(prev => { const n = [...prev[team]]; n[index] = playerId; return { ...prev, [team]: n }; });

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner">Carregando...</span></div>;

    const currentSetObj = sets.find((s: any) => s.set_number == volleyState.current_set) || { home_score: 0, away_score: 0 };

    const renderCourt = (teamId: number, isHome: boolean) => {
        const isServing = servingTeamId === teamId;
        const teamName = isHome ? (matchData.home_team?.code || matchData.home_team?.name) : (matchData.away_team?.code || matchData.away_team?.name);
        const border = isServing ? 'border-yellow-500' : isHome ? 'border-blue-700/40' : 'border-green-700/40';
        return (
            <div className={`rounded-xl border ${border} bg-gray-800/60 p-2`}>
                <div className="flex items-center justify-between mb-2 px-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest truncate ${isHome ? 'text-blue-400' : 'text-green-400'}`}>{teamName}</span>
                    {isServing && <span className="text-[9px] bg-yellow-500 text-black px-1.5 py-0.5 rounded-full font-black animate-pulse flex items-center gap-1">SAQUE <ArrowRightLeft size={10} /></span>}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => handleRotation(teamId, 'backward')} disabled={matchData.status !== 'live'} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs flex flex-col items-center justify-center gap-0.5 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed">
                        <RefreshCw size={13} className="text-yellow-400" />
                        <span className="text-[10px] font-bold">Rodar +</span>
                    </button>
                    <button onClick={() => handleRotation(teamId, 'forward')} disabled={matchData.status !== 'live'} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs flex flex-col items-center justify-center gap-0.5 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed">
                        <RefreshCw size={13} className="text-gray-400 -scale-x-100" />
                        <span className="text-[10px] font-bold">Rodar -</span>
                    </button>
                    <button onClick={() => handleTimeout(teamId)} disabled={matchData.status !== 'live'} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs flex flex-col items-center justify-center gap-0.5 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-blue-300 relative">
                        <History size={13} />
                        <span className="text-[10px] font-bold">Tempo</span>
                        <div className="flex gap-1 mt-0.5">
                            {[1, 2].map(i => {
                                const usedTimeouts = events.filter(ev => ev.event_type === 'timeout' && ev.team_id === teamId && ev.period === `${volleyState.current_set}º Set`).length;
                                return <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= usedTimeouts ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]' : 'bg-gray-500'}`} />;
                            })}
                        </div>
                    </button>
                    <button onClick={() => openCardModal(teamId)} disabled={matchData.status !== 'live'} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs flex flex-col items-center justify-center gap-0.5 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-orange-400">
                        <AlertOctagon size={13} />
                        <span className="text-[10px] font-bold">Cartão</span>
                    </button>
                </div>
            </div>
        );
    };

    const renderUnifiedCourt = () => {
        const posLabel = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
        const homeRot = rotations?.home || Array(6).fill(null);
        const awayRot = rotations?.away || Array(6).fill(null);
        const hBIdxs = [4, 5, 0]; const hFIdxs = [3, 2, 1];
        const aBIdxs = [0, 5, 4]; const aFIdxs = [1, 2, 3];
        const leftIsHome = !invertedSides;
        const leftId = leftIsHome ? matchData.home_team_id : matchData.away_team_id;
        const rightId = leftIsHome ? matchData.away_team_id : matchData.home_team_id;
        const leftRot = leftIsHome ? homeRot : awayRot;
        const rightRot = leftIsHome ? awayRot : homeRot;
        const lBIdxs = leftIsHome ? hBIdxs : aBIdxs;
        const lFIdxs = leftIsHome ? hFIdxs : aFIdxs;
        const rFIdxs = leftIsHome ? aFIdxs : hFIdxs;
        const rBIdxs = leftIsHome ? aBIdxs : hBIdxs;
        const lColor = leftIsHome ? 'blue' : 'green';
        const rColor = leftIsHome ? 'green' : 'blue';

        const getLabel = (teamId: number, pid: number | null) => {
            if (!pid) return { num: '', name: '?' };
            const p = (teamId === matchData.home_team_id ? teamPlayers.home : teamPlayers.away).find((x: any) => x.id == pid);
            return p ? { num: p.number ? `#${p.number}` : '', name: p.nickname || p.name?.split(' ')[0] || '?' } : { num: '', name: '?' };
        };

        const Cell = ({ teamId, idx, rot }: any) => {
            const pid = rot?.[idx] ?? null;
            const { num, name } = getLabel(teamId, pid);
            return (
                <div onClick={() => openSubModal(teamId, idx, pid)} className="rounded-lg p-1.5 text-center cursor-pointer hover:bg-white/10 active:scale-95 transition-all border border-white/10 bg-white/5 flex flex-col items-center justify-center min-h-[52px] min-w-[56px] max-w-[68px]">
                    <span className="text-[8px] text-gray-500 font-mono mb-0.5">{posLabel[idx]}</span>
                    <div className="flex flex-col items-center leading-none">
                        {num && <span className="text-[12px] font-black text-yellow-400 drop-shadow-sm mb-0.5">{num}</span>}
                        <span className="text-[9px] font-bold text-white uppercase tracking-tighter truncate w-full max-w-[54px]">{name}</span>
                    </div>
                </div>
            );
        };

        return (
            <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-2">
                <div className="flex items-center justify-between mb-2 px-1">
                    <span className={`text-[10px] font-black uppercase ${lColor === 'blue' ? 'text-blue-400' : 'text-green-400'}`}>{leftIsHome ? matchData.home_team?.name : matchData.away_team?.name}</span>
                    <button onClick={() => setCourtVisible(v => !v)} className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-white font-bold uppercase tracking-tight transition-colors px-2 py-0.5 rounded hover:bg-gray-700">
                        {courtVisible ? '▲ Ocultar' : '▼ Rodizio'}
                    </button>
                    <span className={`text-[10px] font-black uppercase ${rColor === 'blue' ? 'text-blue-400' : 'text-green-400'}`}>{leftIsHome ? matchData.away_team?.name : matchData.home_team?.name}</span>
                </div>
                {courtVisible && (
                    <div className="overflow-x-auto">
                        <div className="flex items-stretch gap-0.5 mx-auto w-fit">
                            <div className={`flex flex-col gap-1 p-1.5 rounded-l-xl border ${lColor === 'blue' ? 'bg-blue-900/20 border-blue-700/30' : 'bg-green-900/20 border-green-700/30'}`}>
                                {lBIdxs.map(i => <Cell key={i} teamId={leftId} idx={i} rot={leftRot} />)}
                            </div>
                            <div className={`flex flex-col gap-1 p-1.5 border-y border-r ${lColor === 'blue' ? 'bg-blue-900/30 border-blue-600/40' : 'bg-green-900/30 border-green-600/40'}`}>
                                {lFIdxs.map(i => <Cell key={i} teamId={leftId} idx={i} rot={leftRot} />)}
                            </div>
                            <div className="flex flex-col items-center justify-center px-1 bg-gray-900/70 border-y border-gray-600">
                                <span className="text-[7px] text-gray-400 font-black" style={{ writingMode: 'vertical-rl' }}>REDE</span>
                            </div>
                            <div className={`flex flex-col gap-1 p-1.5 border-y border-l ${rColor === 'blue' ? 'bg-blue-900/30 border-blue-600/40' : 'bg-green-900/30 border-green-600/40'}`}>
                                {rFIdxs.map(i => <Cell key={i} teamId={rightId} idx={i} rot={rightRot} />)}
                            </div>
                            <div className={`flex flex-col gap-1 p-1.5 rounded-r-xl border ${rColor === 'blue' ? 'bg-blue-900/20 border-blue-700/30' : 'bg-green-900/20 border-green-700/30'}`}>
                                {rBIdxs.map(i => <Cell key={i} teamId={rightId} idx={i} rot={rightRot} />)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-indigo-500/30">


            <div className="bg-gray-800 p-3 border-b border-gray-700 sticky top-0 z-20 shadow-lg">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2 bg-gray-700 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="text-center relative">
                        {(!isOnline || pendingCount > 0) && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap">
                                {!isOnline ? (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 border border-red-500/50 rounded-full text-[8px] font-black text-red-500 animate-pulse uppercase">
                                        <AlertOctagon size={10} /> Offline
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-[8px] font-black text-yellow-500 uppercase">
                                        <RefreshCw size={10} className="animate-spin" /> {pendingCount} Pendente{pendingCount > 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Súmula Digital</div>
                        <div className="text-yellow-400 font-black text-xl flex items-center gap-2 justify-center"><Trophy size={16} /> {volleyState?.current_set}º SET</div>
                    </div>
                    <button onClick={() => setInvertedSides(!invertedSides)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full"><ArrowRightLeft size={16} /></button>
                </div>
            </div>

            <div className="px-3 py-4 bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700/50">
                <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
                    <div className={`flex items-center gap-3 flex-1 ${invertedSides ? 'flex-row-reverse text-right' : 'text-left'}`}>
                        <div className="text-4xl font-black text-white tabular-nums">{currentSetObj.home_score}</div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider truncate">{matchData.home_team?.name}</div>
                            <div className="text-[10px] text-gray-500 font-medium">Sets: {matchData.home_score}</div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center"><div className="text-[8px] font-black text-gray-600 uppercase tracking-tighter">VS</div><div className="h-4 w-[1px] bg-gray-700 my-1"></div></div>
                    <div className={`flex items-center gap-3 flex-1 ${invertedSides ? 'text-left' : 'flex-row-reverse text-right'}`}>
                        <div className="text-4xl font-black text-white tabular-nums">{currentSetObj.away_score}</div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold text-green-400 uppercase tracking-wider truncate">{matchData.away_team?.name}</div>
                            <div className="text-[10px] text-gray-500 font-medium">Sets: {matchData.away_score}</div>
                        </div>
                    </div>
                </div>
                {matchData.status === 'live' && (
                    <div className="mt-4 max-w-sm mx-auto">
                        <button onClick={handleNextSet} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 shadow-lg rounded-xl flex items-center justify-center gap-2 font-black text-[11px] uppercase tracking-widest border-b-4 border-indigo-800">
                            <Trophy size={14} /> {matchData.home_score >= 3 || matchData.away_score >= 3 ? 'FINALIZAR PARTIDA' : 'ENCERRAR SET / PRÓXIMO'}
                        </button>
                    </div>
                )}
            </div>

            <div className="p-3 space-y-3 max-w-5xl mx-auto">
                {matchData.status === 'scheduled' && (
                    <button onClick={() => setSetupModalOpen(true)} className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl shadow-xl font-black text-lg uppercase tracking-widest">
                        ▶ Configurar e Iniciar Partida
                    </button>
                )}
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handlePointClick(matchData.home_team_id)} disabled={matchData.status !== 'live'} className={`py-5 bg-blue-600 rounded-2xl shadow-lg border-b-4 border-blue-800 flex flex-col items-center justify-center gap-1 disabled:opacity-50 ${invertedSides ? 'order-2' : 'order-1'}`}>
                        <PlusCircle size={24} /><span className="text-xs font-black uppercase tracking-widest">+ PONTO</span>
                    </button>
                    <button onClick={() => handlePointClick(matchData.away_team_id)} disabled={matchData.status !== 'live'} className={`py-5 bg-green-600 rounded-2xl shadow-lg border-b-4 border-green-800 flex flex-col items-center justify-center gap-1 disabled:opacity-50 ${invertedSides ? 'order-1' : 'order-2'}`}>
                        <PlusCircle size={24} /><span className="text-xs font-black uppercase tracking-widest">+ PONTO</span>
                    </button>
                </div>
                {renderUnifiedCourt()}
                <div className="grid grid-cols-2 gap-3">
                    <div className={invertedSides ? 'order-2' : 'order-1'}>{renderCourt(matchData.home_team_id, true)}</div>
                    <div className={invertedSides ? 'order-1' : 'order-2'}>{renderCourt(matchData.away_team_id, false)}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleSelfError(matchData.home_team_id)} disabled={matchData.status !== 'live'} className={`p-3 bg-gray-800 hover:bg-red-900/40 rounded-xl border border-gray-700 text-[10px] font-black uppercase tracking-widest transition-all ${invertedSides ? 'order-2 text-blue-400' : 'order-1 text-blue-400'}`}>Erro Mandante</button>
                    <button onClick={() => handleSelfError(matchData.away_team_id)} disabled={matchData.status !== 'live'} className={`p-3 bg-gray-800 hover:bg-red-900/40 rounded-xl border border-gray-700 text-[10px] font-black uppercase tracking-widest transition-all ${invertedSides ? 'order-1 text-green-400' : 'order-2 text-green-400'}`}>Erro Visitante</button>
                </div>
                <div className="bg-gray-800/80 rounded-2xl border border-gray-700 p-4 shadow-xl">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><History size={14} /> Histórico Recente</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {events.length === 0 ? <p className="text-center text-gray-600 py-8 text-xs font-bold uppercase tracking-widest">Nenhum evento registrado</p> : events.map((ev: any) => (
                            <div key={ev.id} className={`flex items-center justify-between p-2 rounded-lg border bg-gray-700/30 ${ev.event_type === 'system_error' ? 'border-red-500/50 bg-red-900/10' : 'border-gray-600/50'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="text-[10px] font-black text-gray-500 w-8">{ev.minute || '•'}</div>
                                    <div>
                                        <div className={`text-[11px] font-black uppercase ${ev.event_type === 'system_error' ? 'text-red-400' : 'text-gray-100'}`}>{ev.metadata?.label || ev.event_type}</div>
                                        <div className="text-[9px] font-bold text-gray-500">{ev.period} {ev.player_name && `• ${ev.player_name} #${ev.player_number}`}</div>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteEvent(ev.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {setupModalOpen && (
                <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-gray-900 border-2 border-indigo-500/30 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(79,70,229,0.3)]">
                        <div className="bg-indigo-600 p-6 text-center relative">
                            <button
                                onClick={() => setSetupModalOpen(false)}
                                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 rounded-full text-white/80 hover:text-white transition-all transform active:scale-95"
                            >
                                <X size={20} />
                            </button>
                            <Trophy className="mx-auto mb-2 text-yellow-300" size={32} />
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Configuração do Set</h2>
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest italic">{volleyState?.current_set}º SET • VOLLEY PRO</p>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                {[{ label: matchData.home_team?.name, rot: rotations.home, color: 'blue', team: 'home' }, { label: matchData.away_team?.name, rot: rotations.away, color: 'green', team: 'away' }].map(({ label, rot, color, team }: any) => {
                                    const filled = (rot || []).filter((x: any) => x).length;
                                    const full = filled === 6;
                                    return (
                                        <div key={label} className={`p-3 rounded-xl border text-center flex flex-col justify-between ${full ? (color === 'blue' ? 'border-blue-500 bg-blue-900/20' : 'border-green-500 bg-green-900/20') : 'border-red-700 bg-red-900/10'}`}>
                                            <div><div className={`text-[10px] font-black uppercase mb-1 truncate ${color === 'blue' ? 'text-blue-400' : 'text-green-400'}`}>{label}</div><div className="text-2xl font-black">{filled}/6</div></div>
                                            {/* Removido o botão de repetir pois as rotações já persistem no estado local */}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-2xl">
                                <h3 className="text-center text-xs font-black text-indigo-300 uppercase mb-3 tracking-widest">Saque Inicial?</h3>
                                <div className="flex gap-3">
                                    <button onClick={() => setServingTeamId(matchData.home_team_id)} className={`flex-1 py-3 px-1 rounded-xl border-2 font-black text-xs transition-all ${servingTeamId === matchData.home_team_id ? 'bg-blue-600 border-white text-white shadow-lg scale-105' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>{matchData.home_team?.code || matchData.home_team?.name}</button>
                                    <button onClick={() => setServingTeamId(matchData.away_team_id)} className={`flex-1 py-3 px-1 rounded-xl border-2 font-black text-xs transition-all ${servingTeamId === matchData.away_team_id ? 'bg-green-600 border-white text-white shadow-lg scale-105' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>{matchData.away_team?.code || matchData.away_team?.name}</button>
                                </div>
                            </div>
                            <button onClick={confirmSetup} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-xl shadow-lg border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all">✓ CONFIRMAR E INICIAR</button>
                            <button onClick={() => setSetupModalOpen(false)} className="w-full py-2 text-indigo-400 font-black text-xs uppercase tracking-widest hover:text-indigo-300 transition-colors">Voltar</button>
                        </div>
                    </div>
                </div>
            )}

            {subModalOpen && subData && (() => {
                const isHome = subData.teamId === matchData.home_team_id;
                const teamRot = (isHome ? rotations?.home : rotations?.away) || [];
                const allPlayers = isHome ? teamPlayers.home : teamPlayers.away;
                const currentPosIdx = subData.position - 1;
                const occupiedIds = new Set(teamRot.map((id: any, idx: number) => idx !== currentPosIdx ? Number(id) : null).filter((id: any) => id != null));
                const availablePlayers = allPlayers.filter((p: any) => !occupiedIds.has(Number(p.id)));
                return (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
                        <div className="bg-gray-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
                            <h3 className="text-lg font-bold mb-1 flex items-center gap-2"><Repeat size={20} /> Substituição - P{subData.position}</h3>
                            <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto mb-4">
                                {availablePlayers.map((p: any) => (
                                    <button key={p.id} onClick={() => confirmSub(p.id)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded flex flex-col items-center"><span className="font-bold text-lg">{p.number || '#'}</span><span className="text-xs truncate w-full text-center">{p.nickname || p.name}</span></button>
                                ))}
                            </div>
                            <button onClick={() => setSubModalOpen(false)} className="w-full py-3 bg-red-600/20 text-red-500 rounded-xl font-bold">Cancelar</button>
                        </div>
                    </div>
                );
            })()}

            {pointFlow && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
                    <div className="bg-gray-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
                        {pointFlow.step === 'type' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => selectPointType('ataque')} className="p-6 bg-blue-600 rounded-xl font-bold">ATAQUE</button>
                                <button onClick={() => selectPointType('bloqueio')} className="p-6 bg-purple-600 rounded-xl font-bold">BLOQUEIO</button>
                                <button onClick={() => selectPointType('saque')} className="p-6 bg-yellow-600 rounded-xl font-bold">SAQUE (Ace)</button>
                                <button onClick={() => selectPointType('erro')} className="p-6 bg-red-600 rounded-xl font-bold">ERRO ADV.</button>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto mb-4">
                                    {(pointFlow.teamId === matchData.home_team_id ? teamPlayers.home : teamPlayers.away).map((p: any) => (
                                        <button key={p.id} onClick={() => confirmPointPlayer(p.id)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded flex flex-col items-center"><span className="font-bold text-lg">{p.number}</span></button>
                                    ))}
                                </div>
                                <button onClick={() => confirmPointPlayer(null)} className="w-full py-3 bg-indigo-600 rounded-xl font-bold">Time / Desconhecido</button>
                            </>
                        )}
                        <button onClick={() => setPointFlow(null)} className="mt-4 w-full py-4 text-gray-400 font-bold">Cancelar</button>
                    </div>
                </div>
            )}

            {cardFlow && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
                    <div className="bg-gray-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
                        <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto mb-4">
                            {(cardFlow.teamId === matchData.home_team_id ? teamPlayers.home : teamPlayers.away).map((p: any) => (
                                <div key={p.id} className="flex items-center gap-2 bg-gray-700/50 rounded p-1">
                                    <button onClick={() => confirmCard(p.id, 'yellow')} className="w-12 h-12 bg-yellow-500 rounded font-bold text-black flex items-center justify-center">CA</button>
                                    <button onClick={() => confirmCard(p.id, 'red')} className="w-12 h-12 bg-red-500 rounded font-bold text-white flex items-center justify-center">CV</button>
                                    <div className="flex-1 px-4 text-sm font-bold truncate">{p.nickname || p.name}</div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setCardFlow(null)} className="w-full py-3 bg-red-600/20 text-red-500 rounded-xl font-bold">Cancelar</button>
                    </div>
                </div>
            )}
        </div>
    );
}
