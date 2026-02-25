import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, PlusCircle, History, Trophy, Maximize2, X, Repeat, ArrowRightLeft, UserPlus, AlertOctagon, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import api from '../../services/api';

export function SumulaVolei() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [volleyState, setVolleyState] = useState<any>(null);
    const [rotations, setRotations] = useState<any>({ home: Array(6).fill(null), away: Array(6).fill(null) });
    const [sets, setSets] = useState<any[]>([]);
    const [teamPlayers, setTeamPlayers] = useState<any>({ home: [], away: [] });

    // UI Modal States
    const [rotationViewOpen, setRotationViewOpen] = useState(false);
    const [subModalOpen, setSubModalOpen] = useState(false);
    const [courtMinimized, setCourtMinimized] = useState(true);

    // Point Flow State: Step 1 (Type) -> Step 2 (Player)
    const [pointFlow, setPointFlow] = useState<{ step: 'type' | 'player', teamId: number, type?: string } | null>(null);

    // Card Flow State
    const [cardFlow, setCardFlow] = useState<{ teamId: number } | null>(null);

    const [setupModalOpen, setSetupModalOpen] = useState(false);

    // Visual State
    const [invertedSides, setInvertedSides] = useState(false);

    const [subData, setSubData] = useState<{ teamId: number, position: number, currentPlayerId: number } | null>(null);

    // Setup State
    const [setupRotation, setSetupRotation] = useState<{ home: any[], away: any[] }>({ home: Array(6).fill(null), away: Array(6).fill(null) });

    // Helpers
    const [servingTeamId, setServingTeamId] = useState<number | null>(null);

    useEffect(() => {
        if (id) {
            fetchFullDetails();
            // Sync Interval (Every 5s check for server updates to keep in sync)
            const syncInterval = setInterval(() => {
                fetchState(true);
            }, 2000);
            return () => clearInterval(syncInterval);
        }
    }, [id]);

    const fetchFullDetails = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            // Get All Volley State (Now includes players and match data)
            const response = await api.get(`/admin/matches/${id}/volley-state`);
            processStateResponse(response.data);

            // Check if setup needed
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
        try {
            const response = await api.get(`/admin/matches/${id}/volley-state`);
            processStateResponse(response.data);
        } catch (e) {
            console.error(e);
        }
    };

    const processStateResponse = (data: any) => {
        setMatchData(data.match);
        setVolleyState(data.state);
        setSets(data.sets);
        setRotations(data.current_rotations);
        setServingTeamId(data.state.serving_team_id);

        // Update players from match data
        if (data.match) {
            // Check both snake_case and camelCase for safety
            const homeTeam = data.match.home_team || data.match.homeTeam;
            const awayTeam = data.match.away_team || data.match.awayTeam;

            const homeP = homeTeam?.players || [];
            const awayP = awayTeam?.players || [];
            setTeamPlayers({ home: homeP, away: awayP });
        }

        setLoading(false);
    }

    const handlePointClick = (teamId: number) => {
        setPointFlow({ step: 'type', teamId });
    }

    const selectPointType = (type: string) => {
        if (!pointFlow) return;
        setPointFlow({ ...pointFlow, step: 'player', type });
    }

    const confirmPointPlayer = async (playerId: number | null) => {
        if (!pointFlow || !pointFlow.type) return;
        const { teamId, type } = pointFlow;
        const pid = playerId;
        setPointFlow(null);

        const teamSide = teamId === matchData?.home_team_id ? 'Mandante' : 'Visitante';
        registerSystemEvent('user_action', `Confirmou ponto '${type}' para ${teamSide}${pid ? '' : ' (jogador não identificado)'}`);

        try {
            await api.post(`/admin/matches/${id}/volley/point`, {
                team_id: teamId,
                point_type: type,
                player_id: pid
            });
            fetchState();
        } catch (e: any) {
            registerSystemEvent('system_error', `Erro ao registrar ponto '${type}': ${e?.message || 'Falha de rede'}`);
            alert('Erro ao registrar ponto');
        }
    };

    const handleRotation = async (teamId: number, direction: 'forward' | 'backward') => {
        try {
            await api.post(`/admin/matches/${id}/volley/rotation`, {
                team_id: teamId,
                direction: direction
            });
            fetchState();
        } catch (e) {
            alert('Erro ao rotacionar');
        }
    };

    const handleSelfError = async (committingTeamId: number) => {
        if (!matchData) return;

        const receivingTeamId = committingTeamId === matchData.home_team_id ? matchData.away_team_id : matchData.home_team_id;
        const receivingTeamName = receivingTeamId === matchData.home_team_id ? matchData.home_team?.name : matchData.away_team?.name;
        const committingTeamSide = committingTeamId === matchData.home_team_id ? 'Mandante' : 'Visitante';

        if (!window.confirm(`Registrar ERRO COMETIDO por este time? \n(Ponto para ${receivingTeamName})`)) {
            registerSystemEvent('user_action', `Cancelou registro de erro do time ${committingTeamSide}`);
            return;
        }
        registerSystemEvent('user_action', `Registrou erro do time ${committingTeamSide} — ponto para ${receivingTeamName}`);

        try {
            await api.post(`/admin/matches/${id}/volley/point`, {
                team_id: receivingTeamId,
                point_type: 'erro',
                player_id: null
            });
            fetchState();
        } catch (e: any) {
            registerSystemEvent('system_error', `Erro ao registrar ponto por erro: ${e?.message || 'Falha de rede'}`);
            alert('Erro ao registrar ponto');
        }
    };

    const handleTimeout = async (teamId: number) => {
        const teamSide = teamId === matchData?.home_team_id ? 'Mandante' : 'Visitante';
        try {
            if (!window.confirm("Registrar Pedido de Tempo?")) {
                registerSystemEvent('user_action', `Cancelou pedido de tempo do time ${teamSide}`);
                return;
            }
            registerSystemEvent('user_action', `Registrou pedido de tempo do time ${teamSide}`);
            await api.post(`/admin/matches/${id}/events`, {
                event_type: 'timeout',
                team_id: teamId,
                minute: 0,
                period: `${volleyState.current_set}º Set`,
                metadata: {
                    label: 'Tempo Técnico solicitado!',
                    system_period: `${volleyState.current_set}º Set`
                }
            });
            alert("Tempo registrado!");
            fetchState();
        } catch (e: any) {
            registerSystemEvent('system_error', `Erro ao registrar tempo técnico: ${e?.message || 'Falha de rede'}`);
            console.error(e);
        }
    };

    const registerSystemEvent = async (type: string, label: string) => {
        if (!matchData) return;
        try {
            await api.post(`/admin/matches/${id}/events`, {
                event_type: type,
                team_id: matchData.home_team_id || matchData.away_team_id,
                minute: 0,
                period: volleyState ? `${volleyState.current_set}º Set` : 'Pré-jogo',
                metadata: {
                    label,
                    system_period: volleyState ? `${volleyState.current_set}º Set` : 'Pré-jogo'
                }
            });

            if (type === 'match_start') {
                setMatchData((prev: any) => ({ ...prev, status: 'live' }));
            }
        } catch (e: any) {
            console.error("Erro ao registrar evento de sistema", e);
            if (type !== 'system_error') {
                try {
                    await api.post(`/admin/matches/${id}/events`, {
                        event_type: 'system_error',
                        team_id: null,
                        minute: 0,
                        period: volleyState ? `${volleyState.current_set}º Set` : 'Pré-jogo',
                        metadata: {
                            label: `Erro ao registrar '${type}': ${e?.message || 'Falha de rede'}`,
                            origin: 'registerSystemEvent',
                            triggered_type: type
                        }
                    });
                } catch (_) { }
            }
            if (type === 'match_start') {
                alert("Erro de conexão ao iniciar partida no servidor.");
            }
        }
    };

    const openCardModal = (teamId: number) => {
        setCardFlow({ teamId });
    }

    const confirmCard = async (playerId: number, cardType: 'yellow' | 'red') => {
        if (!cardFlow) return;
        const { teamId } = cardFlow;
        setCardFlow(null);

        try {
            await api.post(`/admin/matches/${id}/events`, {
                event_type: cardType === 'yellow' ? 'yellow_card' : 'red_card',
                team_id: teamId,
                player_id: playerId,
                minute: 0,
                period: `${volleyState.current_set}º Set`,
                metadata: {
                    system_period: `${volleyState.current_set}º Set`
                }
            });
            alert(`Cartão ${cardType === 'yellow' ? 'Amarelo' : 'Vermelho'} registrado!`);
        } catch (e) {
            alert("Erro ao registrar cartão");
        }
    }

    // --- Substitutions ---
    const openSubModal = (teamId: number, posIndex: number, currentId: number) => {
        setSubData({ teamId, position: posIndex + 1, currentPlayerId: currentId }); // position 1-6
        setSubModalOpen(true);
    }

    const confirmSubstitution = async (playerInId: number) => {
        if (!subData) return;
        try {
            await api.post(`/admin/matches/${id}/volley/substitution`, {
                team_id: subData.teamId,
                position: subData.position,
                player_in: playerInId
            });
            setSubModalOpen(false);
            setSubData(null);
            fetchState();
        } catch (e) {
            alert('Erro na substituição');
        }
    };

    // --- Setup / Set Start ---
    const confirmSetup = async () => {
        if (!matchData) return;
        const hFull = setupRotation.home.filter(x => x).length === 6;
        const aFull = setupRotation.away.filter(x => x).length === 6;

        if (!hFull || !aFull) {
            alert("Preencha todos os jogadores da rotação inicial.");
            return;
        }

        try {
            await api.post(`/admin/matches/${id}/volley/set-start`, {
                set_number: volleyState.current_set || 1,
                home_rotation: setupRotation.home,
                away_rotation: setupRotation.away,
                serving_team_id: servingTeamId || matchData.home_team_id
            });

            // If match is scheduled, start it
            if (matchData.status === 'scheduled') {
                await registerSystemEvent('match_start', 'Partida Iniciada!');
            }

            setSetupModalOpen(false);
            fetchFullDetails();
        } catch (e) {
            alert('Erro ao salvar rotação');
        }
    };

    const handleNextSet = async () => {
        if (!window.confirm("Deseja FINALIZAR este set e iniciar o próximo?")) return;

        // Automatic side swap rule for volleyball
        setInvertedSides(prev => !prev);

        // Reset setup for next set
        setSetupRotation({ home: Array(6).fill(null), away: Array(6).fill(null) });

        // Advance local set to open modal correctly
        setVolleyState((prev: any) => ({ ...prev, current_set: (prev?.current_set || 1) + 1 }));
        setSetupModalOpen(true);
    };

    const copyLastRotation = (team: 'home' | 'away') => {
        if (!rotations || !rotations[team]) return;
        setSetupRotation(prev => ({
            ...prev,
            [team]: [...rotations[team]]
        }));
    };

    const fillSetupSlot = (team: 'home' | 'away', index: number, playerId: any) => {
        setSetupRotation(prev => {
            const n = [...prev[team]];
            n[index] = playerId;
            return { ...prev, [team]: n };
        });
    }


    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner">Carregando...</span></div>;

    const currentSetObj = sets.find((s: any) => s.set_number == volleyState.current_set) || { home_score: 0, away_score: 0 };

    // Helper to render court position
    const renderCourt = (teamId: number, teamName: string, rotation: any[]) => {
        const isServing = servingTeamId === teamId;
        const roster = teamId === matchData.home_team_id ? teamPlayers.home : teamPlayers.away;

        const getPlayerName = (pid: number) => {
            const p = roster?.find((x: any) => x.id == pid);
            return p ? (`${p.number ? p.number + '. ' : ''}${p.nickname || p.name.split(' ')[0]}`) : '???';
        }

        return (
            <div className={`rounded-xl border-2 ${isServing ? 'border-yellow-500 bg-yellow-900/10' : 'border-gray-700 bg-gray-800'} p-4`}>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCourtMinimized(!courtMinimized)}
                            className="p-1 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-white"
                            title={courtMinimized ? "Mostrar Rodízio" : "Recolher Rodízio"}
                        >
                            {courtMinimized ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                        </button>
                        <h3 className="font-bold uppercase text-sm">{teamName}</h3>
                    </div>
                    {isServing && <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded-full font-bold animate-pulse">SAQUE</span>}
                    <button onClick={() => setRotationViewOpen(true)} className="ml-auto p-1 hover:bg-gray-700 rounded"><Maximize2 size={16} /></button>
                </div>

                {!courtMinimized && (
                    <div className="grid grid-cols-3 gap-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Front Row: 4, 3, 2 (Indices 3, 2, 1) */}
                        {[3, 2, 1].map((idx) => (
                            <div key={idx}
                                onClick={() => openSubModal(teamId, (idx === 3 ? 3 : idx === 2 ? 2 : 1), rotation?.[idx === 3 ? 3 : idx === 2 ? 2 : 1])}
                                className="aspect-square bg-gray-700/50 rounded flex flex-col items-center justify-center relative border border-gray-600/30 hover:bg-gray-600 cursor-pointer transition-colors">
                                <span className="text-xs absolute top-1 left-1 text-gray-500">P{idx === 3 ? 4 : idx === 2 ? 3 : 2}</span>
                                <span className="font-bold text-sm text-center px-1">{getPlayerName(rotation?.[idx === 3 ? 3 : idx === 2 ? 2 : 1])}</span>
                            </div>
                        ))}
                        {/* Back Row: 5, 6, 1 (Indices 4, 5, 0) */}
                        {[4, 5, 0].map((rotIdx) => (
                            <div key={rotIdx}
                                onClick={() => openSubModal(teamId, (rotIdx === 4 ? 4 : rotIdx === 5 ? 5 : 0), rotation?.[rotIdx])}
                                className="aspect-square bg-gray-700/50 rounded flex flex-col items-center justify-center relative border border-gray-600/30 hover:bg-gray-600 cursor-pointer transition-colors">
                                <span className="text-xs absolute top-1 left-1 text-gray-500">P{rotIdx === 4 ? 5 : rotIdx === 5 ? 6 : 1}</span>
                                <span className="font-bold text-sm text-center px-1 text-gray-300">{getPlayerName(rotation?.[rotIdx])}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => handleRotation(teamId, 'forward')}
                        disabled={matchData.status !== 'live'}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs flex items-center justify-center gap-1 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                    >
                        <RefreshCw size={14} /> Rodar
                    </button>
                    <button
                        onClick={() => handleTimeout(teamId)}
                        disabled={matchData.status !== 'live'}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs flex items-center justify-center gap-1 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                    >
                        <History size={14} /> Tempo
                    </button>
                    <button
                        onClick={() => openCardModal(teamId)}
                        disabled={matchData.status !== 'live'}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs flex items-center justify-center gap-1 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                    >
                        <AlertOctagon size={14} /> Cartão
                    </button>
                    <button
                        onClick={() => handleSelfError(teamId)}
                        disabled={matchData.status !== 'live'}
                        className="p-2 bg-red-900/40 hover:bg-red-900/60 rounded text-xs flex items-center justify-center gap-1 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed text-red-200"
                    >
                        <XCircle size={14} /> Erro
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans pb-20">
            {/* Header */}
            <div className="bg-gray-800 p-3 border-b border-gray-700 sticky top-0 z-20 shadow-lg">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2 bg-gray-700 rounded-full"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="text-center">
                        <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Súmula Digital</div>
                        <div className="text-yellow-400 font-black text-xl flex items-center gap-2 justify-center">
                            <Trophy size={16} /> {volleyState.current_set}º SET
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setInvertedSides(!invertedSides)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full" title="Inverter Lados"><ArrowRightLeft size={16} /></button>
                    </div>
                </div>
            </div>

            {/* Scoreboard - More compact for mobile */}
            <div className="px-3 py-4 bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700/50">
                <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
                    {/* Home Score */}
                    <div className={`flex items-center gap-3 flex-1 ${invertedSides ? 'flex-row-reverse text-right' : 'text-left'}`}>
                        <div className="text-4xl font-black text-white tabular-nums">{currentSetObj.home_score}</div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider truncate">{matchData.home_team?.name}</div>
                            <div className="text-[10px] text-gray-500 font-medium">Sets: {matchData.home_score}</div>
                        </div>
                    </div>

                    {/* Divider/VS */}
                    <div className="flex flex-col items-center">
                        <div className="text-[8px] font-black text-gray-600 uppercase tracking-tighter">VS</div>
                        <div className="h-4 w-[1px] bg-gray-700 my-1"></div>
                    </div>

                    {/* Away Score */}
                    <div className={`flex items-center gap-3 flex-1 ${invertedSides ? 'text-left' : 'flex-row-reverse text-right'}`}>
                        <div className="text-4xl font-black text-white tabular-nums">{currentSetObj.away_score}</div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold text-green-400 uppercase tracking-wider truncate">{matchData.away_team?.name}</div>
                            <div className="text-[10px] text-gray-500 font-medium">Sets: {matchData.away_score}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Court Container */}
            <div className="p-3 space-y-4 max-w-5xl mx-auto">
                <div className="grid grid-cols-2 gap-3 items-start">
                    {/* Home Interaction Column */}
                    <div className={`space-y-3 ${invertedSides ? 'order-2' : 'order-1'}`}>
                        <button
                            onClick={() => handlePointClick(matchData.home_team_id)}
                            disabled={matchData.status !== 'live'}
                            className="w-full py-5 bg-blue-600 active:bg-blue-700 rounded-2xl shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-[2px] transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:grayscale"
                        >
                            <PlusCircle size={24} />
                            <span className="text-xs font-black uppercase tracking-widest">+ PONTO</span>
                        </button>
                        {renderCourt(matchData.home_team_id, matchData.home_team?.name, rotations.home)}
                    </div>

                    {/* Away Interaction Column */}
                    <div className={`space-y-3 ${invertedSides ? 'order-1' : 'order-2'}`}>
                        <button
                            onClick={() => handlePointClick(matchData.away_team_id)}
                            disabled={matchData.status !== 'live'}
                            className="w-full py-5 bg-green-600 active:bg-green-700 rounded-2xl shadow-lg border-b-4 border-green-800 active:border-b-0 active:translate-y-[2px] transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:grayscale"
                        >
                            <PlusCircle size={24} />
                            <span className="text-xs font-black uppercase tracking-widest">+ PONTO</span>
                        </button>
                        {renderCourt(matchData.away_team_id, matchData.away_team?.name, rotations.away)}
                    </div>
                </div>

                {/* Status Bar / Serving Info */}
                <div className="bg-gray-800/50 backdrop-blur-sm p-3 rounded-xl border border-gray-700/50 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${servingTeamId === matchData.home_team_id ? 'bg-blue-500 animate-pulse' : 'bg-gray-700'}`} />
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Saque {matchData.home_team?.code}</span>
                        </div>

                        <div className="flex flex-col items-center">
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Set Timer</span>
                            <span className="text-xs font-mono text-indigo-400">
                                {sets.find(s => s.set_number == volleyState.current_set)?.start_time
                                    ? new Date(new Date().getTime() - new Date(sets.find(s => s.set_number == volleyState.current_set).start_time).getTime()).toISOString().substr(14, 5)
                                    : '00:00'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase text-right">Saque {matchData.away_team?.code}</span>
                            <div className={`w-3 h-3 rounded-full ${servingTeamId === matchData.away_team_id ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`} />
                        </div>
                    </div>

                    <button
                        onClick={handleNextSet}
                        disabled={matchData.status !== 'live'}
                        className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 rounded-lg text-[10px] font-black text-indigo-300 uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                        {matchData.home_score >= 3 || matchData.away_score >= 3 ? 'FINALIZAR PARTIDA' : 'FECHAR SET / PRÓXIMO'}
                    </button>
                </div>
            </div>

            {/* History Feed */}
            <div className="px-4 pb-10 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <History size={12} /> Histórico de Sets
                    </h3>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                    {sets.map((s: any) => (
                        <div key={s.set_number} className={`py-2 px-1 rounded-xl border transition-all ${s.set_number == volleyState.current_set ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-900/20' : 'bg-gray-800/40 border-gray-700/50 text-gray-500'}`}>
                            <div className={`text-[9px] font-black mb-0.5 ${s.set_number == volleyState.current_set ? 'text-indigo-200' : 'text-gray-600'}`}>{s.set_number}º</div>
                            <div className="text-xs font-black tabular-nums tracking-tighter">
                                {s.home_score}<span className="mx-0.5 opacity-30">x</span>{s.away_score}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Finalize Button */}
            {(matchData.home_score >= 3 || matchData.away_score >= 3) && (
                <div className="px-4 pb-10 max-w-5xl mx-auto">
                    <button
                        onClick={async () => {
                            if (!window.confirm('Encerrar partida e voltar?')) return;
                            await registerSystemEvent('match_end', 'Partida Finalizada. Grande jogo!');
                            navigate(-1);
                        }}
                        className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-xl shadow-lg uppercase"
                    >
                        Encerrar Súmula
                    </button>
                </div>
            )}

            {/* Rotation Modal */}
            {rotationViewOpen && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-6xl space-y-8">
                        <div className="flex justify-end">
                            <button onClick={() => setRotationViewOpen(false)} className="text-white hover:text-gray-300"><X size={32} /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className={`order-${invertedSides ? '2' : '1'}`}>
                                {renderCourt(matchData.home_team_id, matchData.home_team?.name, rotations.home)}
                            </div>
                            <div className={`order-${invertedSides ? '1' : '2'}`}>
                                {renderCourt(matchData.away_team_id, matchData.away_team?.name, rotations.away)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Substitution Modal */}
            {subModalOpen && subData && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
                    <div className="bg-gray-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Repeat size={20} /> Substituição - P{subData.position}</h3>
                        <div className="mb-4 text-sm text-gray-400">Jogadores no Banco:</div>

                        <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto mb-4">
                            {(subData.teamId === matchData.home_team_id ? teamPlayers.home : teamPlayers.away)
                                .map((p: any) => (
                                    <button key={p.id} onClick={() => confirmSubstitution(p.id)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded flex flex-col items-center">
                                        <span className="font-bold text-lg">{p.number || '#'}</span>
                                        <span className="text-xs truncate w-full text-center">{p.nickname || p.name}</span>
                                    </button>
                                ))}
                        </div>
                        <button onClick={() => setSubModalOpen(false)} className="w-full py-3 bg-red-600/20 text-red-500 rounded-xl font-bold">Cancelar</button>
                    </div>
                </div>
            )}

            {/* Point Flow Modal */}
            {pointFlow && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
                    <div className="bg-gray-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
                        {pointFlow.step === 'type' ? (
                            <>
                                <h3 className="text-center font-bold text-xl mb-6">Tipo de Ponto</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => selectPointType('ataque')} className="p-6 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold">ATAQUE</button>
                                    <button onClick={() => selectPointType('bloqueio')} className="p-6 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold">BLOQUEIO</button>
                                    <button onClick={() => selectPointType('saque')} className="p-6 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-bold">SAQUE (Ace)</button>
                                    <button onClick={() => selectPointType('erro')} className="p-6 bg-red-600 hover:bg-red-500 rounded-xl font-bold">ERRO ADV.</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-center font-bold text-xl mb-4">Quem pontuou?</h3>
                                {pointFlow.type === 'erro' ? (
                                    <div className="text-center text-gray-400 mb-4">Ponto por erro do adversário. <br /> Nenhum jogador específico.</div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto mb-4">
                                        {(pointFlow.teamId === matchData.home_team_id ? teamPlayers.home : teamPlayers.away).map((p: any) => (
                                            <button key={p.id} onClick={() => confirmPointPlayer(p.id)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded flex flex-col items-center">
                                                <span className="font-bold text-lg">{p.number}</span>
                                                <span className="text-[10px] truncate w-full text-center">{p.nickname || p.name.split(' ')[0]}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <button onClick={() => confirmPointPlayer(null)} className="w-full py-3 bg-indigo-600 rounded-xl font-bold mb-2">
                                    {pointFlow.type === 'erro' ? 'Confirmar Ponto' : 'Não Identificado / Time'}
                                </button>
                            </>
                        )}
                        <button onClick={() => setPointFlow(null)} className="mt-4 w-full py-4 text-gray-400 font-bold">Cancelar</button>
                    </div>
                </div>
            )}

            {/* Card Modal */}
            {cardFlow && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
                    <div className="bg-gray-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
                        <h3 className="text-center font-bold text-xl mb-4 text-yellow-400 flex items-center justify-center gap-2"><AlertOctagon /> Aplicar Cartão</h3>
                        <div className="mb-4 text-xs text-center text-gray-400">Clique na <span className="font-bold text-yellow-500">Esquerda</span> ou <span className="font-bold text-red-500">Direita</span> do jogador para selecionar o tipo de cartão.</div>

                        <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto mb-4">
                            {(cardFlow.teamId === matchData.home_team_id ? teamPlayers.home : teamPlayers.away).map((p: any) => (
                                <div key={p.id} className="flex items-center gap-2 bg-gray-700/50 rounded p-1">
                                    <button onClick={() => confirmCard(p.id, 'yellow')} className="w-12 h-12 bg-yellow-500 rounded font-bold text-black hover:bg-yellow-400 flex items-center justify-center">CA</button>
                                    <div className="flex-1 flex flex-col justify-center px-4">
                                        <span className="font-bold text-lg">{p.number}</span>
                                        <span className="text-xs truncate">{p.nickname || p.name.split(' ')[0]}</span>
                                    </div>
                                    <button onClick={() => confirmCard(p.id, 'red')} className="w-12 h-12 bg-red-600 rounded font-bold text-white hover:bg-red-500 flex items-center justify-center">CV</button>
                                    <div className="w-1 h-8 border-l border-gray-600 mx-1"></div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setCardFlow(null)} className="mt-4 w-full py-4 text-gray-400 font-bold">Cancelar</button>
                    </div>
                </div>
            )}

            {/* Setup Modal */}
            {setupModalOpen && matchData && (
                <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black text-yellow-400 leading-none">CONFIGURAR {volleyState.current_set}º SET</h2>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">Escolha a Formação Inicial e quem saca</p>
                        </div>
                        <button onClick={() => setSetupModalOpen(false)} className="bg-gray-700 p-2 rounded-lg"><X size={20} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-8">
                        {/* Serving Selection */}
                        <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-2xl">
                            <h3 className="text-center text-xs font-black text-indigo-300 uppercase mb-3 tracking-widest">Inicia Sacando:</h3>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setServingTeamId(matchData.home_team_id)}
                                    className={`flex-1 py-3 rounded-xl border-2 font-black text-sm transition-all ${servingTeamId === matchData.home_team_id ? 'bg-blue-600 border-white text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                                >
                                    {matchData.home_team?.code}
                                </button>
                                <button
                                    onClick={() => setServingTeamId(matchData.away_team_id)}
                                    className={`flex-1 py-3 rounded-xl border-2 font-black text-sm transition-all ${servingTeamId === matchData.away_team_id ? 'bg-green-600 border-white text-white shadow-lg' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                                >
                                    {matchData.away_team?.code}
                                </button>
                            </div>
                        </div>
                        {/* Home Setup */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-blue-400 text-lg">{matchData.home_team?.name}</h3>
                                <button
                                    onClick={() => copyLastRotation('home')}
                                    className="text-[10px] bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-1 rounded font-black uppercase tracking-tighter"
                                >
                                    Repetir Rotação
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[0, 1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="bg-gray-800 p-2 rounded border border-gray-700">
                                        <label className="text-[10px] text-gray-500 font-bold block mb-1">POSIÇÃO {i + 1}</label>
                                        <select
                                            className="w-full bg-gray-900 text-white text-sm p-2 rounded"
                                            value={setupRotation.home[i] || ''}
                                            onChange={(e) => fillSetupSlot('home', i, e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {teamPlayers.home?.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.number} - {p.nickname || p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Away Setup */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-green-400 text-lg">{matchData.away_team?.name}</h3>
                                <button
                                    onClick={() => copyLastRotation('away')}
                                    className="text-[10px] bg-green-600/20 text-green-400 border border-green-500/30 px-2 py-1 rounded font-black uppercase tracking-tighter"
                                >
                                    Repetir Rotação
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {[0, 1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="bg-gray-800 p-2 rounded border border-gray-700">
                                        <label className="text-[10px] text-gray-500 font-bold block mb-1">POSIÇÃO {i + 1}</label>
                                        <select
                                            className="w-full bg-gray-900 text-white text-sm p-2 rounded"
                                            value={setupRotation.away[i] || ''}
                                            onChange={(e) => fillSetupSlot('away', i, e.target.value)}
                                        >
                                            <option value="">Selecione...</option>
                                            {teamPlayers.away?.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.number} - {p.nickname || p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-800 border-t border-gray-700">
                        <button onClick={confirmSetup} className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl rounded-xl">
                            CONFIRMAR INÍCIO
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
