import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, PlusCircle, History, Trophy, Maximize2, X, Repeat, ArrowRightLeft, UserPlus, AlertOctagon } from 'lucide-react';
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
        if (id) fetchFullDetails();
        const interval = setInterval(() => { if (id) fetchState() }, 5000);
        return () => clearInterval(interval);
    }, [id]);

    const fetchFullDetails = async () => {
        try {
            // 1. Get Match Core Data including players
            const fullMatch = await api.get(`/admin/matches/${id}`);

            const homeP = fullMatch.data.home_team?.players || [];
            const awayP = fullMatch.data.away_team?.players || [];
            setTeamPlayers({ home: homeP, away: awayP });

            // 2. Get Volley State
            const response = await api.get(`/admin/matches/${id}/volley-state`);
            processStateResponse(response.data);

            // Check if setup needed
            const hasHome = response.data.current_rotations?.home?.filter((x: any) => x).length === 6;
            const hasAway = response.data.current_rotations?.away?.filter((x: any) => x).length === 6;

            if ((!hasHome || !hasAway) && response.data.state.current_set === 1 && response.data.sets.length <= 1 && response.data.sets[0]?.home_score === 0) {
                setSetupModalOpen(true);
            }

        } catch (e) {
            console.error(e);
        }
    }

    const fetchState = async () => {
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

        try {
            await api.post(`/admin/matches/${id}/volley/point`, {
                team_id: teamId,
                point_type: type,
                player_id: pid
            });
            fetchState();
        } catch (e) {
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

    const handleTimeout = async (teamId: number) => {
        try {
            if (!window.confirm("Registrar Pedido de Tempo?")) return;
            await api.post(`/admin/matches/${id}/events`, {
                event_type: 'timeout',
                team_id: teamId,
                minute: 0,
                metadata: {
                    period: `${volleyState.current_set}º Set`
                }
            });
            alert("Tempo registrado!");
        } catch (e) {
            console.error(e);
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
                metadata: {
                    period: `${volleyState.current_set}º Set`
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
    const startNextSet = async () => {
        try {
            const nextSet = (volleyState.current_set || 0) + 1;
            await api.post(`/admin/matches/${id}/volley/set-start`, {
                set_number: nextSet,
                serving_team_id: matchData.home_team_id,
                home_rotation: rotations.home || [],
                away_rotation: rotations.away || []
            });
            fetchState();
        } catch (e) {
            alert("Erro ao iniciar set");
        }
    };

    const confirmSetup = async () => {
        // Validate
        const h = setupRotation.home.filter((x: any) => x).length;
        const a = setupRotation.away.filter((x: any) => x).length;
        if (h < 6 || a < 6) {
            if (!window.confirm("Times incompletos (menos de 6). Deseja iniciar mesmo assim?")) return;
        }

        await api.post(`/admin/matches/${id}/volley/set-start`, {
            set_number: 1,
            serving_team_id: matchData.home_team_id,
            home_rotation: setupRotation.home,
            away_rotation: setupRotation.away
        });
        setSetupModalOpen(false);
        fetchState();
    }

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
                    <h3 className="font-bold uppercase text-sm">{teamName}</h3>
                    {isServing && <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded-full font-bold animate-pulse">SAQUE</span>}
                    <button onClick={() => setRotationViewOpen(true)} className="ml-auto p-1 hover:bg-gray-700 rounded"><Maximize2 size={16} /></button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
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

                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleRotation(teamId, 'forward')} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs flex items-center justify-center gap-1"><RefreshCw size={14} /> Rodar</button>
                    <button onClick={() => handleTimeout(teamId)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs flex items-center justify-center gap-1"><History size={14} /> Tempo</button>
                    <button onClick={() => openCardModal(teamId)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs flex items-center justify-center gap-1"><AlertOctagon size={14} /> Cartão</button>
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
                        <button onClick={() => setSetupModalOpen(true)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full" title="Escalação"><UserPlus size={16} /></button>
                        <button onClick={startNextSet} className="p-2 bg-indigo-600 rounded text-xs font-bold">Novo Set</button>
                    </div>
                </div>
            </div>

            {/* Scoreboard */}
            <div className="flex items-center justify-between px-2 py-4 bg-gradient-to-b from-gray-800 to-gray-900">
                <div className={`text-center w-1/3 order-${invertedSides ? '3' : '1'}`}>
                    <div className="text-5xl font-black mb-1">{currentSetObj.home_score}</div>
                    <div className="text-xs font-bold text-gray-400 truncate">{matchData.home_team?.name}</div>
                    <div className="text-[10px] text-gray-500 mt-1">Sets: {matchData.home_score}</div>
                </div>

                <div className="text-center w-1/3 flex flex-col items-center order-2">
                    <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Placar</div>
                    <div className="w-px h-10 bg-gray-700"></div>
                </div>

                <div className={`text-center w-1/3 order-${invertedSides ? '1' : '3'}`}>
                    <div className="text-5xl font-black mb-1">{currentSetObj.away_score}</div>
                    <div className="text-xs font-bold text-gray-400 truncate">{matchData.away_team?.name}</div>
                    <div className="text-[10px] text-gray-500 mt-1">Sets: {matchData.away_score}</div>
                </div>
            </div>

            {/* Actions & Court */}
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                {/* Home Zone */}
                <div className={`space-y-4 order-${invertedSides ? '2' : '1'}`}>
                    <button onClick={() => handlePointClick(matchData.home_team_id)} className="w-full py-6 bg-blue-600 rounded-xl font-black text-2xl shadow-lg border-b-4 border-blue-800 active:scale-95 transition-all flex items-center justify-center gap-3">
                        <PlusCircle size={32} /> PONTO {matchData.home_team?.code}
                    </button>
                    {renderCourt(matchData.home_team_id, matchData.home_team?.name, rotations.home)}
                </div>

                {/* Away Zone */}
                <div className={`space-y-4 order-${invertedSides ? '1' : '2'}`}>
                    <button onClick={() => handlePointClick(matchData.away_team_id)} className="w-full py-6 bg-green-600 rounded-xl font-black text-2xl shadow-lg border-b-4 border-green-800 active:scale-95 transition-all flex items-center justify-center gap-3">
                        <PlusCircle size={32} /> PONTO {matchData.away_team?.code}
                    </button>
                    {renderCourt(matchData.away_team_id, matchData.away_team?.name, rotations.away)}
                </div>
            </div>

            {/* History Feed */}
            <div className="px-4 pb-10 max-w-5xl mx-auto">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Histórico de Sets</h3>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    {sets.map((s: any) => (
                        <div key={s.set_number} className={`p-2 rounded border ${s.set_number == volleyState.current_set ? 'bg-yellow-900/20 border-yellow-500/50 text-yellow-500' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                            <div className="font-bold mb-1">{s.set_number}º</div>
                            <div>{s.home_score} x {s.away_score}</div>
                        </div>
                    ))}
                </div>
            </div>

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
                        <h2 className="text-xl font-black text-yellow-400">ESCALAÇÃO INICIAL</h2>
                        <button onClick={() => setSetupModalOpen(false)}><X /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-8">
                        {/* Home Setup */}
                        <div>
                            <h3 className="font-bold text-blue-400 mb-4 text-lg">{matchData.home_team?.name}</h3>
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
                            <h3 className="font-bold text-green-400 mb-4 text-lg">{matchData.away_team?.name}</h3>
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
