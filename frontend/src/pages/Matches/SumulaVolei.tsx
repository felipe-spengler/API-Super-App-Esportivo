import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, PlusCircle, History, Trophy, X, Repeat, ArrowRightLeft, UserPlus, AlertOctagon, XCircle, Trash2 } from 'lucide-react';
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
    const [events, setEvents] = useState<any[]>([]);

    // UI Modal States
    const [rotationViewOpen, setRotationViewOpen] = useState(false);
    const [subModalOpen, setSubModalOpen] = useState(false);
    const [courtVisible, setCourtVisible] = useState(true); // toggle da visão da quadra

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

    // 🔬 Advanced Audit: Logging & Error Recovery
    useEffect(() => {
        if (!id) return;

        // 1. Log Page Open / Reload
        const isReload = !!(window.performance && window.performance.navigation.type === 1);
        registerSystemEvent('user_action', isReload ? 'Página Recarregada (Refresh) (Vôlei)' : 'Súmula Aberta/Acessada (Vôlei)');

        // 2. Crash Recovery Check
        const crashKey = `last_crash_volei_${id}`;
        const lastCrash = localStorage.getItem(crashKey);
        if (lastCrash) {
            registerSystemEvent('system_error', `Recuperado de falha anterior (Vôlei): ${lastCrash}`);
            localStorage.removeItem(crashKey);
        }

        // 3. Error Listener
        const handleError = (event: ErrorEvent) => {
            const errorMsg = `Erro JS Vôlei: ${event.message} em ${event.filename}:${event.lineno}`;
            localStorage.setItem(crashKey, errorMsg);
            registerSystemEvent('system_error', `FATAL JS VÔLEI: ${event.message}`);
        };

        // 4. Page Close (Attempt)
        const handleUnload = () => {
            const data = {
                event_type: 'user_action',
                minute: '00:00',
                period: volleyState?.current_set ? `${volleyState.current_set}º Set` : 'Arena',
                metadata: { label: 'Súmula Fechada/Saindo da página (Vôlei)' }
            };
            const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
            navigator.sendBeacon(`${api.defaults.baseURL}/admin/matches/${id}/events`, blob);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('beforeunload', handleUnload);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchFullDetails();
            // Sync Interval (Every 2s check for server updates to keep in sync)
            const syncInterval = setInterval(() => {
                fetchState(true);
            }, 2000);
            return () => clearInterval(syncInterval);
        }
    }, [id]);

    const fetchFullDetails = async (silent = false) => {
        try {
            if (!silent) setLoading(true);

            // Fetch both state and events
            await fetchState(true);

            // But we still need the logic from before for setup modal
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
            const [stateRes, eventsRes] = await Promise.all([
                api.get(`/admin/matches/${id}/volley-state`),
                api.get(`/admin/matches/${id}/events`)
            ]);
            processStateResponse(stateRes.data);
            setEvents(eventsRes.data || []);
        } catch (e: any) {
            console.error(e);
            if (!silent) {
                registerSystemEvent('sync_error', `Falha ao sincronizar dados: ${e?.message || 'Erro de rede'}`);
            }
        }
    };

    const processStateResponse = (data: any) => {
        setMatchData(data.match);
        setVolleyState(data.state);
        setSets(data.sets);
        setRotations(data.current_rotations);
        setServingTeamId(data.state.serving_team_id);

        // Se o set atual no banco está finalizado (tem end_time), 
        // mas o volleyState local ainda não avançou, podemos detectar que estamos em "Intervalo"
        // No vôlei, se o set atual atingiu 25 (ou 15 no 5º) e abriu 2, ele está tecnicamente encerrado.

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
        const teamSide = teamId === matchData?.home_team_id ? 'Mandante' : 'Visitante';
        const dirLabel = direction === 'forward' ? 'Avançar (+)' : 'Voltar (-)';
        try {
            await api.post(`/admin/matches/${id}/volley/rotation`, {
                team_id: teamId,
                direction: direction
            });
            registerSystemEvent('user_action', `Rodizio ${dirLabel} para ${teamSide}`);
            fetchState();
        } catch (e: any) {
            registerSystemEvent('system_error', `Erro ao rotacionar ${teamSide}: ${e?.message}`);
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
        registerSystemEvent('user_action', `Registrou erro do time ${committingTeamSide} -> ponto para ${receivingTeamName}`);

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
        const currentSetLabel = `${volleyState.current_set}º Set`;

        // Contar quantos tempos já foram usados por este time no set atual
        const usedTimeouts = events.filter(ev =>
            ev.event_type === 'timeout' &&
            ev.team_id === teamId &&
            ev.period === currentSetLabel
        ).length;

        if (usedTimeouts >= 2) {
            alert("Limite de tempos atingido para este set (Máximo 2).");
            registerSystemEvent('user_action_blocked', `Tentativa de pedido de tempo bloqueada: limite excedido para ${teamSide}`);
            return;
        }

        try {
            if (!window.confirm(`Registrar Pedido de Tempo? (Uso: ${usedTimeouts + 1}/2)`)) {
                registerSystemEvent('user_action', `Cancelou pedido de tempo do time ${teamSide}`);
                return;
            }
            const teamName = teamId === matchData?.home_team_id ? matchData.home_team?.name : matchData.away_team?.name;
            await api.post(`/admin/matches/${id}/events`, {
                event_type: 'timeout',
                team_id: teamId,
                minute: "00:00",
                period: `${volleyState.current_set}º Set`,
                metadata: {
                    label: `Pedido de Tempo: ${teamName}`,
                    system_period: `${volleyState.current_set}º Set`
                }
            });
            registerSystemEvent('user_action', `Registrou pedido de tempo do time ${teamSide} (${teamName})`);
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
            // Ensure we have a valid team_id or null
            const teamId = matchData.home_team_id || matchData.away_team_id || null;

            await api.post(`/admin/matches/${id}/events`, {
                event_type: type,
                team_id: teamId,
                minute: "00:00",
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
            console.error(`Erro ao registrar evento '${type}':`, e.response?.data || e.message);

            // If it's a validation error (422), the server is telling us what's wrong
            if (e.response?.status === 422) {
                console.warn("Validação falhou:", e.response.data.errors);
            }

            if (type !== 'system_error') {
                try {
                    await api.post(`/admin/matches/${id}/events`, {
                        event_type: 'system_error',
                        team_id: null,
                        minute: "00:00",
                        period: volleyState ? `${volleyState.current_set}º Set` : 'Pré-jogo',
                        metadata: {
                            label: `Erro ao registrar '${type}': ${JSON.stringify(e.response?.data || e.message)}`,
                            origin: 'registerSystemEvent',
                            triggered_type: type
                        }
                    });
                } catch (_) { }
            }

            if (type === 'match_start') {
                alert("Partida configurada no servidor, mas houve um erro ao registrar o evento de início. Você pode continuar a súmula normalmente.");
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
                minute: "00:00",
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
        const teamSide = subData.teamId === matchData?.home_team_id ? 'Mandante' : 'Visitante';
        try {
            await api.post(`/admin/matches/${id}/volley/substitution`, {
                team_id: subData.teamId,
                position: subData.position,
                player_in: playerInId
            });
            registerSystemEvent('user_action', `Substituição realizada no time ${teamSide} na P${subData.position + 1}`);
            setSubModalOpen(false);
            setSubData(null);
            fetchState();
        } catch (e: any) {
            registerSystemEvent('system_error', `Erro na substituição (${teamSide}): ${e?.message}`);
            alert('Erro na substituição');
        }
    };

    const handleDeleteEvent = async (eventId: number) => {
        if (!window.confirm("Deseja cancelar este lançamento? (O placar será ajustado automaticamente se for um ponto)")) return;
        try {
            await api.delete(`/admin/matches/${id}/events/${eventId}`);
            registerSystemEvent('user_action', `Excluiu/Cancelou evento ID: ${eventId}`);
            fetchState();
        } catch (e: any) {
            registerSystemEvent('system_error', `Erro ao excluir evento: ${e?.message}`);
            alert("Erro ao excluir evento");
        }
    };

    // --- Setup / Iniciar Set ---
    // Posições são preenchidas diretamente nas células da quadra.
    // Este modal só confirma quem vai sacar e valida que todas as posições estão preenchidas.
    const confirmSetup = async () => {
        if (!matchData) return;
        const hFull = (rotations?.home || []).filter((x: any) => x).length === 6;
        const aFull = (rotations?.away || []).filter((x: any) => x).length === 6;

        if (!hFull || !aFull) {
            alert("Ainda há posições vazias na quadra. Toque em \"?\" em cada posição para selecionar o jogador.");
            return;
        }

        if (!servingTeamId) {
            alert("Por favor, selecione qual equipe inicia sacando.");
            return;
        }

        try {
            await api.post(`/admin/matches/${id}/volley/set-start`, {
                set_number: volleyState.current_set || 1,
                home_rotation: rotations.home,
                away_rotation: rotations.away,
                serving_team_id: servingTeamId
            });

            if (matchData.status === 'scheduled') {
                await registerSystemEvent('match_start', 'Partida Iniciada!');
            }

            setSetupModalOpen(false);
            fetchFullDetails();
        } catch (e) {
            alert('Erro ao salvar configuração do set');
        }
    };

    const handleNextSet = async () => {
        const currentSetNum = volleyState.current_set || 1;
        const currentSet = sets.find((s: any) => s.set_number == currentSetNum);

        // Se o set atual ainda não acabou (placar não atingiu limite), não permite avançar sem aviso
        const limit = currentSetNum === 5 ? 15 : 25;
        const isSetFinished = currentSet && ((currentSet.home_score >= limit && currentSet.home_score >= currentSet.away_score + 2) || (currentSet.away_score >= limit && currentSet.away_score >= currentSet.home_score + 2));

        if (!isSetFinished) {
            if (!window.confirm("O set atual ainda não atingiu a pontuação final. Deseja realmente ENCERRAR este set e ir para o intervalo?")) return;
        } else {
            if (!window.confirm("Deseja FINALIZAR este set e iniciar o intervalo?")) return;
        }

        try {
            // Em vez de só abrir o modal, vamos registrar que o set acabou (se o servidor já não o fez)
            // No vôlei, o servidor auto-finaliza o set no registerPoint se atingir o score.
            // Aqui garantimos a troca de estado.

            // Inverter lados preventivamente para o próximo
            setInvertedSides(prev => !prev);

            // Zerar rodízio local para o próximo set (obriga o mesário a colocar ou copiar)
            setRotations({ home: Array(6).fill(null), away: Array(6).fill(null) });
            setServingTeamId(null); // Resetar saque

            // Registra auditoria
            registerSystemEvent('user_action', `Set ${currentSetNum} finalizado pelo mesário. Entrando em intervalo.`);

            // Em vez de abrir o modal direto, vamos mostrar um botão de "Iniciar Próximo Set"
            // No momento, vou apenas forçar o usuário a ver o placar final antes.
            alert(`Set ${currentSetNum} finalizado! O próximo set será o ${currentSetNum + 1}º. Lados invertidos e rodízio zerado.`);

            // Avança o número do set NO ESTADO para o modal abrir com o número correto
            setVolleyState((prev: any) => ({ ...prev, current_set: currentSetNum + 1 }));
            setSetupModalOpen(true);
        } catch (e) {
            console.error(e);
        }
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

    // Painel de ações por time
    const renderCourt = (teamId: number, isHome: boolean) => {
        const isServing = servingTeamId === teamId;
        const teamName = isHome ? matchData.home_team?.name : matchData.away_team?.name;
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
                                const usedTimeouts = events.filter(ev =>
                                    ev.event_type === 'timeout' &&
                                    ev.team_id === teamId &&
                                    ev.period === `${volleyState.current_set}º Set`
                                ).length;
                                return (
                                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= usedTimeouts ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]' : 'bg-gray-500'}`} />
                                );
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

    // Visão lateral mesário: [Fundo A | Frente A | REDE | Frente B | Fundo B]
    const renderUnifiedCourt = () => {
        const posLabel = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
        const homeRot: any[] = rotations?.home || Array(6).fill(null);
        const awayRot: any[] = rotations?.away || Array(6).fill(null);
        // Fundos: P5(4), P6(5), P1(0) | Frente: P4(3), P3(2), P2(1)
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
            const roster = teamId === matchData.home_team_id ? teamPlayers.home : teamPlayers.away;
            const p = roster?.find((x: any) => x.id == pid);
            return p ? { num: p.number ? `#${p.number}` : '', name: p.nickname || p.name?.split(' ')[0] || '?' } : { num: '', name: '?' };
        };

        const Cell = ({ teamId, idx, rot }: { teamId: number; idx: number; rot: any[] }) => {
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

        const ZL = ({ t, c }: { t: string; c: string }) => (
            <div className={`text-[8px] font-black text-center uppercase tracking-widest mb-1 ${c === 'blue' ? 'text-blue-400' : 'text-green-400'}`}>{t}</div>
        );

        return (
            <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 p-2">
                <div className="flex items-center justify-between mb-2 px-1">
                    <span className={`text-[10px] font-black uppercase ${lColor === 'blue' ? 'text-blue-400' : 'text-green-400'}`}>{leftIsHome ? matchData.home_team?.name : matchData.away_team?.name}</span>
                    <button
                        onClick={() => setCourtVisible(v => !v)}
                        className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-white font-bold uppercase tracking-tight transition-colors px-2 py-0.5 rounded hover:bg-gray-700"
                    >
                        {courtVisible ? '▲ Ocultar' : '▼ Rodizio'}
                    </button>
                    <span className={`text-[10px] font-black uppercase ${rColor === 'blue' ? 'text-blue-400' : 'text-green-400'}`}>{leftIsHome ? matchData.away_team?.name : matchData.home_team?.name}</span>
                </div>
                {courtVisible && (
                    <>
                        <div className="overflow-x-auto">
                            <div className="flex items-stretch gap-0.5 mx-auto w-fit">
                                <div className={`flex flex-col gap-1 p-1.5 rounded-l-xl border ${lColor === 'blue' ? 'bg-blue-900/20 border-blue-700/30' : 'bg-green-900/20 border-green-700/30'}`}>
                                    <ZL t="Fundo" c={lColor} />
                                    {lBIdxs.map(i => <Cell key={i} teamId={leftId} idx={i} rot={leftRot} />)}
                                </div>
                                <div className={`flex flex-col gap-1 p-1.5 border-y border-r ${lColor === 'blue' ? 'bg-blue-900/30 border-blue-600/40' : 'bg-green-900/30 border-green-600/40'}`}>
                                    <ZL t="Frente" c={lColor} />
                                    {lFIdxs.map(i => <Cell key={i} teamId={leftId} idx={i} rot={leftRot} />)}
                                </div>
                                {/* REDE */}
                                <div className="flex flex-col items-center justify-center px-1 bg-gray-900/70 border-y border-gray-600">
                                    {[...Array(9)].map((_, i) => <div key={i} className="w-3 h-[11px] mb-[2px] border border-gray-500/40 rounded-sm bg-gray-700/20" />)}
                                    <span className="text-[7px] text-gray-400 font-black mt-1" style={{ writingMode: 'vertical-rl' }}>REDE</span>
                                </div>
                                <div className={`flex flex-col gap-1 p-1.5 border-y border-l ${rColor === 'blue' ? 'bg-blue-900/30 border-blue-600/40' : 'bg-green-900/30 border-green-600/40'}`}>
                                    <ZL t="Frente" c={rColor} />
                                    {rFIdxs.map(i => <Cell key={i} teamId={rightId} idx={i} rot={rightRot} />)}
                                </div>
                                <div className={`flex flex-col gap-1 p-1.5 rounded-r-xl border ${rColor === 'blue' ? 'bg-blue-900/20 border-blue-700/30' : 'bg-green-900/20 border-green-700/30'}`}>
                                    <ZL t="Fundo" c={rColor} />
                                    {rBIdxs.map(i => <Cell key={i} teamId={rightId} idx={i} rot={rightRot} />)}
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-[9px] text-gray-600 mt-1.5">Toque em um jogador para substituir</p>
                    </>
                )}
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

                {/* BOTÃO DE CONTROLE DE SET - Logo abaixo do placar */}
                <div className="mt-4 max-w-sm mx-auto">
                    {matchData.status === 'live' && (
                        <button
                            onClick={handleNextSet}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/40 rounded-xl flex items-center justify-center gap-2 font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 border-b-4 border-indigo-800 active:border-b-0"
                        >
                            <Trophy size={14} />
                            {matchData.home_score >= 3 || matchData.away_score >= 3 ? 'FINALIZAR PARTIDA' : 'ENCERRAR SET / PRÓXIMO'}
                        </button>
                    )}
                </div>
            </div>

            {/* Ações + Quadra */}
            <div className="p-3 space-y-3 max-w-5xl mx-auto">
                {/* Botão Iniciar Partida */}
                {matchData.status === 'scheduled' && (
                    <button
                        onClick={() => setSetupModalOpen(true)}
                        className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-2xl shadow-xl border-b-4 border-emerald-800 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3 font-black text-lg uppercase tracking-widest"
                    >
                        &#9654; Configurar e Iniciar Partida
                    </button>
                )}

                {/* + PONTO */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handlePointClick(matchData.home_team_id)}
                        disabled={matchData.status !== 'live'}
                        className={`py-5 bg-blue-600 active:bg-blue-700 rounded-2xl shadow-lg border-b-4 border-blue-800 active:border-b-0 active:translate-y-[2px] transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:grayscale ${invertedSides ? 'order-2' : 'order-1'}`}
                    >
                        <PlusCircle size={24} />
                        <span className="text-xs font-black uppercase tracking-widest">+ PONTO</span>
                    </button>
                    <button
                        onClick={() => handlePointClick(matchData.away_team_id)}
                        disabled={matchData.status !== 'live'}
                        className={`py-5 bg-green-600 active:bg-green-700 rounded-2xl shadow-lg border-b-4 border-green-800 active:border-b-0 active:translate-y-[2px] transition-all flex flex-col items-center justify-center gap-1 disabled:opacity-50 disabled:grayscale ${invertedSides ? 'order-1' : 'order-2'}`}
                    >
                        <PlusCircle size={24} />
                        <span className="text-xs font-black uppercase tracking-widest">+ PONTO</span>
                    </button>
                </div>

                {/* Quadra unificada: visão lateral mesário */}
                {renderUnifiedCourt()}

                {/* Ações por time */}
                <div className="grid grid-cols-2 gap-3">
                    <div className={invertedSides ? 'order-2' : 'order-1'}>
                        {renderCourt(matchData.home_team_id, true)}
                    </div>
                    <div className={invertedSides ? 'order-1' : 'order-2'}>
                        {renderCourt(matchData.away_team_id, false)}
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
                                {(() => {
                                    const currentSet = sets.find(s => s.set_number == volleyState.current_set);
                                    if (!currentSet?.start_time) return '00:00';
                                    try {
                                        const diff = new Date().getTime() - new Date(currentSet.start_time).getTime();
                                        return new Date(diff).toISOString().substr(14, 5);
                                    } catch (e) {
                                        return '00:00';
                                    }
                                })()}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase text-right">Saque {matchData.away_team?.code}</span>
                            <div className={`w-3 h-3 rounded-full ${servingTeamId === matchData.away_team_id ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Point-by-Point History List */}
            <div className="px-4 mb-8 max-w-5xl mx-auto">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                    <History size={12} /> Últimos Lançamentos
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {events.length === 0 ? (
                        <div className="text-center py-4 bg-gray-800/20 rounded-xl border border-dashed border-gray-700 text-gray-600 text-[10px] font-bold uppercase">Nenhum evento registrado</div>
                    ) : (
                        events.filter((ev: any) => ['point', 'ace', 'block', 'goal', 'erro', 'yellow_card', 'red_card', 'timeout', 'substitution'].includes(ev.event_type))
                            .map((ev: any) => {
                                const isHome = ev.team_id == matchData.home_team_id;
                                const teamLabel = isHome ? matchData.home_team?.code : matchData.away_team?.code;
                                const isPoint = ['point', 'ace', 'block', 'goal', 'erro'].includes(ev.event_type);

                                const getFriendlyLabel = (type: string) => {
                                    const map: any = {
                                        'point': 'Ponto',
                                        'ataque': 'Ataque',
                                        'bloqueio': 'Bloqueio',
                                        'ace': 'Saque (Ace)',
                                        'saque': 'Saque (Ace)',
                                        'goal': 'Ponto',
                                        'erro': 'Erro Adv.',
                                        'timeout': 'Pedido de Tempo',
                                        'substitution': 'Substituição',
                                        'yellow_card': 'Cartão Amarelo',
                                        'red_card': 'Cartão Vermelho'
                                    };
                                    return map[type] || type;
                                };

                                // Get player info from event mapping or object
                                const pName = ev.player_name || (ev.player ? (ev.player.nickname || ev.player.name) : (ev.metadata?.player_name || ''));
                                const pNum = ev.player_number || ev.player?.number;
                                const playerInfo = pName ? `${pName}${pNum ? ` (#${pNum})` : ''}` : '';

                                return (
                                    <div key={ev.id} className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-2 flex items-center justify-between group transition-all hover:bg-gray-700/60">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1 h-8 rounded-full ${isHome ? 'bg-blue-500' : 'bg-green-500'}`} />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black ${isHome ? 'text-blue-400' : 'text-green-400'}`}>{teamLabel}</span>
                                                    <span className="text-[8px] text-gray-500 font-mono">{ev.period}</span>
                                                </div>
                                                <div className="text-[11px] font-bold flex items-center gap-1">
                                                    {isPoint && <span className="text-emerald-400 font-bold tracking-tighter w-4">+1</span>}
                                                    <span className="text-gray-200">
                                                        {ev.metadata?.label || `${getFriendlyLabel(ev.event_type)}${playerInfo ? `: ${playerInfo}` : ''}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteEvent(ev.id)}
                                            className="p-3 text-gray-400 hover:text-red-400 transition-colors bg-gray-700/30 rounded-full"
                                            title="Remover lançamento"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                );
                            })
                    )}
                </div>
            </div>

            {/* History Feed - Sets */}
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
                                {renderCourt(matchData.home_team_id, true)}
                            </div>
                            <div className={`order-${invertedSides ? '1' : '2'}`}>
                                {renderCourt(matchData.away_team_id, false)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Substitution Modal */}
            {subModalOpen && subData && (() => {
                const isHome = subData.teamId === matchData.home_team_id;
                const teamRot: any[] = (isHome ? rotations?.home : rotations?.away) || [];
                const allPlayers: any[] = isHome ? teamPlayers.home : teamPlayers.away;
                // IDs já em campo em OUTRAS posições (não a posição atual sendo editada)
                const currentPosIdx = subData.position - 1;
                const occupiedIds = new Set(
                    teamRot
                        .map((id: any, idx: number) => idx !== currentPosIdx ? id : null)
                        .filter((id: any) => id != null)
                        .map((id: any) => Number(id))
                );
                const availablePlayers = allPlayers.filter((p: any) => !occupiedIds.has(Number(p.id)));
                return (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center">
                        <div className="bg-gray-800 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
                            <h3 className="text-lg font-bold mb-1 flex items-center gap-2"><Repeat size={20} /> Substituição - P{subData.position}</h3>
                            <p className="text-xs text-gray-500 mb-4">Jogadores disponíveis (não estão em outra posição)</p>
                            {availablePlayers.length === 0 ? (
                                <div className="text-center text-gray-500 py-6">Todos os jogadores já estão em campo.</div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto mb-4">
                                    {availablePlayers.map((p: any) => (
                                        <button key={p.id} onClick={() => confirmSubstitution(p.id)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded flex flex-col items-center">
                                            <span className="font-bold text-lg">{p.number || '#'}</span>
                                            <span className="text-xs truncate w-full text-center">{p.nickname || p.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button onClick={() => setSubModalOpen(false)} className="w-full py-3 bg-red-600/20 text-red-500 rounded-xl font-bold">Cancelar</button>
                        </div>
                    </div>
                );
            })()}


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
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setCardFlow(null)} className="mt-4 w-full py-4 text-gray-400 font-bold">Cancelar</button>
                    </div>
                </div>
            )}

            {/* Setup Modal - Simplificado: só quem saca */}
            {setupModalOpen && matchData && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/80">
                            <h2 className="text-lg font-black text-yellow-400">▶ Iniciar {volleyState.current_set}º Set</h2>
                            <button onClick={() => setSetupModalOpen(false)} className="bg-gray-700 p-2 rounded-lg"><X size={18} /></button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: matchData.home_team?.name, rot: rotations?.home, color: 'blue' },
                                    { label: matchData.away_team?.name, rot: rotations?.away, color: 'green' }
                                ].map(({ label, rot, color }) => {
                                    const filled = (rot || []).filter((x: any) => x).length;
                                    const full = filled === 6;
                                    return (
                                        <div key={label} className={`p-3 rounded-xl border text-center overflow-hidden flex flex-col justify-between ${full ? (color === 'blue' ? 'border-blue-500 bg-blue-900/20' : 'border-green-500 bg-green-900/20') : 'border-red-700 bg-red-900/10'}`}>
                                            <div>
                                                <div className={`text-[10px] font-black uppercase mb-1 truncate px-1 ${color === 'blue' ? 'text-blue-400' : 'text-green-400'}`} title={label}>{label}</div>
                                                <div className="text-2xl font-black">{filled}/6</div>
                                                <div className={`text-[9px] font-bold mt-0.5 ${full ? 'text-gray-400' : 'text-red-400'}`}>{full ? '✓ Pronto' : 'Preencha na quadra'}</div>
                                            </div>

                                            {/* Botão de Atalho para copiar último rodízio */}
                                            {volleyState.current_set > 1 && !full && (
                                                <button
                                                    onClick={() => {
                                                        alert("Toque nas células da quadra (ao fechar este modal) para preencher os jogadores.");
                                                    }}
                                                    className="mt-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[8px] font-bold text-gray-300 uppercase"
                                                >
                                                    Rodízio Manual
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-2xl">
                                <h3 className="text-center text-xs font-black text-indigo-300 uppercase mb-3 tracking-widest">Quem inicia sacando?</h3>
                                <div className="flex gap-3">
                                    <button onClick={() => setServingTeamId(matchData.home_team_id)} className={`flex-1 py-3 px-1 rounded-xl border-2 font-black text-xs transition-all overflow-hidden ${servingTeamId === matchData.home_team_id ? 'bg-blue-600 border-white text-white shadow-lg scale-105' : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-blue-700'}`}>
                                        <div className="truncate">{matchData.home_team?.code || matchData.home_team?.name}</div>
                                    </button>
                                    <button onClick={() => setServingTeamId(matchData.away_team_id)} className={`flex-1 py-3 px-1 rounded-xl border-2 font-black text-xs transition-all overflow-hidden ${servingTeamId === matchData.away_team_id ? 'bg-green-600 border-white text-white shadow-lg scale-105' : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-green-700'}`}>
                                        <div className="truncate">{matchData.away_team?.code || matchData.away_team?.name}</div>
                                    </button>
                                </div>
                            </div>
                            <button onClick={confirmSetup} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg rounded-xl transition-all active:scale-95 shadow-lg">
                                ✓ CONFIRMAR E INICIAR
                            </button>
                            <p className="text-center text-[10px] text-gray-500">Posições vazias? Feche este modal e toque nas células da quadra para preencher.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
