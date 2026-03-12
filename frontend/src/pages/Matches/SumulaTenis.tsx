import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Wifi, WifiOff, AlertOctagon, RefreshCw, X, ChevronRight, Check, Plus, Trash2, History } from 'lucide-react';
import api from '../../services/api';
import { useOfflineResilience } from '../../hooks/useOfflineResilience';

export function SumulaTenis() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [tennisState, setTennisState] = useState<any>(null);
    const [sets, setSets] = useState<any[]>([]);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });

    // UI Flow
    const [pointFlow, setPointFlow] = useState<{ teamId: number, playerIndex: number } | null>(null);
    const [timeModal, setTimeModal] = useState<'start' | 'end' | null>(null);
    const [tempTime, setTempTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }));

    // 🛡️ Offline Resilience
    const { isOnline, addToQueue, pendingCount, getPendingCount } = useOfflineResilience(id, 'Tênis', async (action, data) => {
        let url = '';
        switch (action) {
            case 'tennis_point': url = `/admin/matches/${id}/tennis/point`; break;
            case 'tennis_server': url = `/admin/matches/${id}/tennis/server`; break;
            case 'tennis_undo': url = `/admin/matches/${id}/tennis/undo`; break;
            case 'tennis_times': url = `/admin/matches/${id}/tennis/times`; break;
            case 'tennis_finish': url = `/admin/matches/${id}/tennis/finish`; break;
        }
        if (url) return await api.post(url, data);
    });

    const apiCall = async (action: string, endpoint: string, data: any) => {
        if (isOnline && getPendingCount() === 0) {
            try {
                const response = await api.post(endpoint, data);
                if (response.data.match) {
                    processState(response.data);
                }
                return true;
            } catch (e) {
                addToQueue(action, data);
                return false;
            }
        } else {
            addToQueue(action, data);
            return false;
        }
    };

    const fetchState = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await api.get(`/admin/matches/${id}/tennis-state`);
            processState(response.data);

            // Auto prompt start time if in live match but no actual_start_time
            if (!silent && response.data.state && !response.data.state.actual_start_time && response.data.match.status !== 'finished') {
                setTimeModal('start');
            }
        } catch (e) {
            console.error(e);
            if (!silent) alert('Erro ao carregar dados do tênis.');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const processState = (data: any) => {
        setMatchData(data.match);
        setTennisState(data.state);
        setSets(data.sets || []);
        if (data.match.home_team && data.match.away_team) {
            setRosters({
                home: data.match.home_team.players || [],
                away: data.match.away_team.players || []
            });
        }
    };

    useEffect(() => {
        if (id) {
            fetchState();
            const interval = setInterval(() => {
                if (getPendingCount() === 0) fetchState(true);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [id]);

    const handlePointSelection = async (type: string) => {
        if (!pointFlow) return;
        const { teamId, playerIndex } = pointFlow;
        const roster = teamId === matchData.home_team_id ? rosters.home : rosters.away;
        const player = roster[playerIndex];
        setPointFlow(null);

        let winningTeamId = teamId;
        // IMPORTANTE: Quem clicamos na tela é SEMPRE quem ganha o ponto.
        // Se o usuário clicar em "Time A -> Marcar" e escolher "Erro do Adversário", o Time A ganha o ponto (ID do Time A enviado).

        await apiCall('tennis_point', `/admin/matches/${id}/tennis/point`, {
            team_id: winningTeamId,
            player_id: player?.id,
            point_type: type,
            game_time: "00:00"
        });
    };

    const toggleServer = async (teamId: number) => {
        await apiCall('tennis_server', `/admin/matches/${id}/tennis/server`, { teamId });
    };

    const handleUndo = async () => {
        if (!window.confirm("Deseja desfazer o último ponto?")) return;
        await apiCall('tennis_undo', `/admin/matches/${id}/tennis/undo`, {});
    };

    const handleConfirmTime = async () => {
        if (timeModal === 'start') {
            await apiCall('tennis_times', `/admin/matches/${id}/tennis/times`, { actual_start_time: tempTime });
        } else {
            await apiCall('tennis_finish', `/admin/matches/${id}/tennis/finish`, { actual_end_time: tempTime });
            navigate('/admin/matches');
        }
        setTimeModal(null);
    };

    const translatePoint = (points: number, isTiebreak: boolean) => {
        if (isTiebreak) return points.toString();
        const map: any = { 0: '0', 1: '15', 2: '30', 3: '40', 4: 'AD' };
        return map[points] || 'AD';
    };

    if (loading || !matchData || !tennisState) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
                <RefreshCw className="animate-spin mr-2" /> Carregando...
            </div>
        );
    }

    const isHomeServing = tennisState.serving_team_id === matchData.home_team_id;
    const isAwayServing = tennisState.serving_team_id === matchData.away_team_id;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-yellow-400 selection:text-black">
            {/* Header / Connectivity status */}
            <div className={`sticky top-0 z-50 p-3 flex items-center justify-between border-b transition-colors duration-500 ${isOnline ? 'bg-slate-900/80 border-slate-800' : 'bg-red-950/90 border-red-900'}`}>
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"><ArrowLeft size={20} /></button>
                    <div className="min-w-0">
                        <h1 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-500 leading-none truncate">Súmula Profissional</h1>
                        <p className="text-xs sm:text-sm font-bold text-yellow-500 flex items-center gap-1 truncate">TÊNIS <ChevronRight size={14} className="flex-shrink-0" /> <span className="truncate">{matchData.championship?.name || 'Torneio'}</span></p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleUndo} className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-full transition-all border border-slate-700/50" title="Desfazer Último Ponto"><History size={18} /></button>
                    {!isOnline ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-black animate-pulse">
                            <WifiOff size={12} /> OFFLINE ({pendingCount})
                        </div>
                    ) : pendingCount > 0 ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500 text-black rounded-full text-[10px] font-black">
                            <RefreshCw size={12} className="animate-spin" /> SINCRONIZANDO...
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <Wifi size={12} /> Conectado
                        </div>
                    )}
                </div>
            </div>

            <main className="max-w-2xl mx-auto p-1.5 sm:p-4 space-y-4 sm:space-y-6">
                {/* Cabeçalho de Horários */}
                <div className="flex items-center justify-between px-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    <div className="flex items-center gap-2">
                        <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">INÍCIO: {tennisState.actual_start_time || '--:--'}</span>
                        {matchData.status === 'finished' && (
                            <span className="bg-emerald-500/10 px-2 py-0.5 rounded text-emerald-400">FIM: {tennisState.actual_end_time || '--:--'}</span>
                        )}
                    </div>
                    {matchData.status !== 'finished' && (
                        <button
                            onClick={() => {
                                setTempTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false }));
                                setTimeModal('end');
                            }}
                            className="text-red-400 hover:text-red-300 font-black flex items-center gap-1 border border-red-400/20 px-3 py-1 rounded-full bg-red-400/5 transition-colors"
                        >
                            <Trophy size={12} /> ENCERRAR PARTIDA
                        </button>
                    )}
                </div>

                {/* Scoreboard Principal */}
                <div className="bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-500"></div>

                    <div className="p-4 sm:p-6 space-y-4">
                        {/* Labels de Coluna */}
                        <div className="flex justify-end items-center gap-1.5 sm:gap-2 pr-1 sm:pr-2">
                            <div className="flex-1"></div>
                            <div className="w-8 sm:w-10 text-[7px] sm:text-[9px] font-black text-blue-500 uppercase text-center tracking-tighter">Sets</div>
                            <div className="flex gap-1">
                                {sets.map((_, i) => (
                                    <div key={i} className="w-6 sm:w-8 text-[6px] sm:text-[8px] font-black text-slate-600 uppercase text-center tracking-tighter">S{i + 1}</div>
                                ))}
                                <div className="w-6 sm:w-8 text-[6px] sm:text-[8px] font-black text-slate-400 uppercase text-center tracking-tighter">S{sets.length + 1}</div>
                            </div>
                            <div className="w-8 sm:w-10 text-[7px] sm:text-[9px] font-black text-slate-500 uppercase text-center tracking-tighter">Games</div>
                            <div className="w-10 sm:w-14 text-[7px] sm:text-[9px] font-black text-yellow-500 uppercase text-center tracking-tighter">Pontos</div>
                        </div>

                        {/* Team Home */}
                        <div className="flex items-center justify-between gap-1.5 sm:gap-4">
                            <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
                                <button
                                    onClick={() => toggleServer(matchData.home_team_id)}
                                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${isHomeServing ? 'bg-yellow-400 text-black scale-110 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'bg-slate-800 text-slate-600 hover:text-slate-400'}`}
                                >
                                    {isHomeServing ? '🎾' : ''}
                                </button>
                                <div className="truncate">
                                    <h2 className="text-[13px] sm:text-lg font-black uppercase tracking-tight truncate leading-tight">{matchData.home_team?.name}</h2>
                                    <p className="text-[7px] sm:text-[10px] font-bold text-slate-500 uppercase">Mandante</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                {/* Placar de Sets (Partida) */}
                                <div className="w-8 h-10 sm:w-10 sm:h-12 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center text-sm sm:text-lg font-black text-blue-400 shadow-inner">
                                    {matchData.home_score || 0}
                                </div>

                                {/* Sets Histórico (Games do Set) */}
                                <div className="flex items-center gap-1">
                                    {sets.map((s, idx) => (
                                        <div key={idx} className="w-6 h-8 sm:w-8 sm:h-10 bg-slate-800/50 rounded-lg flex items-center justify-center text-[10px] sm:text-sm font-black text-slate-500 border border-slate-700/30">
                                            {s.home_score}
                                        </div>
                                    ))}
                                </div>

                                {/* Games Won no Set Atual */}
                                <div className="w-8 h-10 sm:w-10 sm:h-12 bg-slate-800 rounded-lg sm:rounded-xl border border-slate-700 flex items-center justify-center text-sm sm:text-lg font-black text-white shadow-inner">
                                    {tennisState.games_won?.home || 0}
                                </div>

                                {/* Pontos no Game Atual */}
                                <div className="w-10 h-12 sm:w-14 sm:h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl font-black text-black shadow-lg">
                                    {translatePoint(tennisState.game_score?.home || 0, tennisState.is_tiebreak)}
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-800/50 mx-2 sm:mx-4"></div>

                        {/* Team Away */}
                        <div className="flex items-center justify-between gap-1.5 sm:gap-4">
                            <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
                                <button
                                    onClick={() => toggleServer(matchData.away_team_id)}
                                    className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${isAwayServing ? 'bg-yellow-400 text-black scale-110 shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'bg-slate-800 text-slate-600 hover:text-slate-400'}`}
                                >
                                    {isAwayServing ? '🎾' : ''}
                                </button>
                                <div className="truncate">
                                    <h2 className="text-[13px] sm:text-lg font-black uppercase tracking-tight truncate leading-tight">{matchData.away_team?.name}</h2>
                                    <p className="text-[7px] sm:text-[10px] font-bold text-slate-500 uppercase">Visitante</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                <div className="w-8 h-10 sm:w-10 sm:h-12 bg-blue-600/20 border border-blue-500/30 rounded-lg flex items-center justify-center text-sm sm:text-lg font-black text-blue-400 shadow-inner">
                                    {matchData.away_score || 0}
                                </div>

                                <div className="flex items-center gap-1">
                                    {sets.map((s, idx) => (
                                        <div key={idx} className="w-6 h-8 sm:w-8 sm:h-10 bg-slate-800/50 rounded-lg flex items-center justify-center text-[10px] sm:text-sm font-black text-slate-500 border border-slate-700/30">
                                            {s.away_score}
                                        </div>
                                    ))}
                                </div>
                                <div className="w-8 h-10 sm:w-10 sm:h-12 bg-slate-800 rounded-lg sm:rounded-xl border border-slate-700 flex items-center justify-center text-sm sm:text-lg font-black text-white shadow-inner">
                                    {tennisState.games_won?.away || 0}
                                </div>
                                <div className="w-10 h-12 sm:w-14 sm:h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg sm:rounded-2xl flex items-center justify-center text-lg sm:text-2xl font-black text-black shadow-lg">
                                    {translatePoint(tennisState.game_score?.away || 0, tennisState.is_tiebreak)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-950/50 p-2 text-center font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-4">
                        <span className="text-slate-500">{matchData.status === 'finished' ? 'PARTIDA ENCERRADA' : (tennisState.is_tiebreak ? '💥 TIE-BREAK EM CURSO 💥' : `${tennisState.current_set}º SET - GAME EM DISPUTA`)}</span>
                    </div>
                </div>

                {/* Área de Ações (Jogadores) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    {/* Botões Lançamento Mandante */}
                    <div className="space-y-3">
                        <div className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase text-center tracking-widest pl-2 flex items-center gap-1 sm:gap-2">
                            <div className="h-px bg-slate-800 flex-1"></div>
                            MARCAR
                            <div className="h-px bg-slate-800 flex-1"></div>
                        </div>

                        {(rosters.home.length > 0 ? rosters.home : [{ name: matchData.home_team?.name }]).map((p: any, idx: number) => (
                            <button
                                key={idx}
                                disabled={matchData.status === 'finished'}
                                onClick={() => setPointFlow({ teamId: matchData.home_team_id, playerIndex: idx })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col items-center gap-1 hover:bg-slate-800/80 active:scale-95 transition-all text-blue-400 font-bold disabled:opacity-50 disabled:active:scale-100"
                            >
                                <span className="text-[9px] sm:text-xs uppercase tracking-tight truncate w-full text-center">{p.nickname || p.name}</span>
                                <div className="w-7 h-7 sm:w-10 sm:h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-400">
                                    <Plus size={16} className="sm:hidden" />
                                    <Plus size={20} className="hidden sm:block" />
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Botões Lançamento Visitante */}
                    <div className="space-y-3">
                        <div className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase text-center tracking-widest flex items-center gap-1 sm:gap-2 pr-2">
                            <div className="h-px bg-slate-800 flex-1"></div>
                            MARCAR
                            <div className="h-px bg-slate-800 flex-1"></div>
                        </div>

                        {(rosters.away.length > 0 ? rosters.away : [{ name: matchData.away_team?.name }]).map((p: any, idx: number) => (
                            <button
                                key={idx}
                                disabled={matchData.status === 'finished'}
                                onClick={() => setPointFlow({ teamId: matchData.away_team_id, playerIndex: idx })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 flex flex-col items-center gap-1 hover:bg-slate-800/80 active:scale-95 transition-all text-emerald-400 font-bold disabled:opacity-50 disabled:active:scale-100"
                            >
                                <span className="text-[10px] sm:text-xs uppercase tracking-tight truncate w-full text-center">{p.nickname || p.name}</span>
                                <div className="w-7 h-7 sm:w-10 sm:h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400">
                                    <Plus size={16} className="sm:hidden" />
                                    <Plus size={20} className="hidden sm:block" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Histórico Recente de Pontos */}
                <div className="space-y-2">
                    <h4 className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Últimos Pontos</h4>
                    <div className="bg-slate-900/30 rounded-xl sm:rounded-2xl border border-slate-800/50 p-1 space-y-1">
                        {matchData.events?.slice(0, 5).map((ev: any, i: number) => (
                            <div key={i} className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900/50 border border-slate-800/30">
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                    <span className="text-sm sm:text-lg flex-shrink-0">{ev.metadata?.tennis_type === 'ace' ? '⚡' : '🎾'}</span>
                                    <div className="truncate">
                                        <p className="text-[9px] sm:text-[11px] font-black text-white leading-none mb-0.5 truncate">{ev.metadata?.label?.split(' - ')[0] || 'Ponto'}</p>
                                        <p className="text-[7px] sm:text-[9px] font-bold text-slate-500 uppercase leading-none truncate">{ev.metadata?.label?.split(' - ')[1] || '---'}</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-2">
                                    <p className="text-[9px] sm:text-[10px] font-black text-yellow-500 leading-none mb-0.5">{ev.metadata?.score || '0-0'}</p>
                                    <p className="text-[7px] sm:text-[8px] font-bold text-slate-600 uppercase tracking-tighter">{ev.period}</p>
                                </div>
                            </div>
                        ))}
                        {(!matchData.events || matchData.events.length === 0) && (
                            <p className="p-3 text-center text-[9px] sm:text-[10px] font-bold text-slate-600 uppercase tracking-widest">Nenhum ponto registrado</p>
                        )}
                    </div>
                </div>

                {/* Informações da Partida */}
                <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800 flex items-center justify-around">
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">Status</p>
                        <p className={`text-sm font-black uppercase ${matchData.status === 'live' ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`}>
                            {matchData.status === 'live' ? 'Ao Vivo' : matchData.status === 'finished' ? 'Finalizado' : 'Aguardando'}
                        </p>
                    </div>
                    <div className="w-px h-8 bg-slate-800"></div>
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">Local</p>
                        <p className="text-sm font-black text-white uppercase">{matchData.location || 'Quadra'}</p>
                    </div>
                </div>
            </main>

            {/* Modal de Horário (Início/Fim) */}
            {timeModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
                    <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500 mx-auto mb-6">
                            <RefreshCw size={32} />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
                            {timeModal === 'start' ? 'Início do Jogo' : 'Fim da Partida'}
                        </h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-8 leading-relaxed">
                            {timeModal === 'start' ? 'Confirme o horário real de início para controle da organização.' : 'Confirme o horário de encerramento da partida.'}
                        </p>

                        <div className="relative mb-8 group">
                            <input
                                type="time"
                                value={tempTime}
                                onChange={(e) => setTempTime(e.target.value)}
                                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-4 px-6 text-3xl font-black text-center text-white focus:border-yellow-500 outline-none transition-all appearance-none"
                            />
                            <div className="absolute top-0 right-0 h-full flex items-center pr-4 pointer-events-none text-slate-600 group-focus-within:text-yellow-500">
                                <ChevronRight size={24} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleConfirmTime}
                                className="w-full bg-yellow-500 py-4 rounded-2xl text-black font-black uppercase tracking-widest hover:bg-yellow-400 active:scale-95 transition-all shadow-lg shadow-yellow-500/20"
                            >
                                {timeModal === 'start' ? 'INICIAR JOGO' : 'ENCERRAR JOGO'}
                            </button>
                            {timeModal === 'start' && (
                                <button
                                    onClick={() => setTimeModal(null)}
                                    className="w-full py-2 text-[10px] text-slate-500 font-black uppercase hover:text-white transition-colors"
                                >
                                    Mais Tarde
                                </button>
                            )}
                            {timeModal === 'end' && (
                                <button
                                    onClick={() => setTimeModal(null)}
                                    className="w-full py-2 text-[10px] text-slate-500 font-black uppercase hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Seleção de Tipo de Ponto */}
            {pointFlow && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-2 sm:p-4">
                    <div className="w-full max-w-md bg-slate-900 rounded-[2.5rem] border border-slate-800 p-6 sm:p-8 pt-6 animate-in zoom-in duration-300 max-h-[95vh] overflow-y-auto">
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6"></div>

                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white leading-tight">DETALHAR PONTO</h3>
                                <p className="text-sm text-yellow-500 font-bold uppercase tracking-widest pl-0.5">
                                    {pointFlow.teamId === matchData.home_team_id ? matchData.home_team?.name : matchData.away_team?.name}
                                </p>
                            </div>
                            <button onClick={() => setPointFlow(null)} className="p-3 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-8">
                            <h4 className="col-span-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 pl-1">Ponto de Saque</h4>
                            <PointOption label="Ace (A)" type="ace" icon="⚡" onClick={handlePointSelection} />
                            <PointOption label="Saque Vencedor" type="service_winner" icon="🎯" onClick={handlePointSelection} />

                            <h4 className="col-span-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-4 mb-2 pl-1">Erro do Adversário</h4>
                            <PointOption label="Dupla Falta" type="double_fault" icon="💥" onClick={handlePointSelection} />
                            <PointOption label="Falta de pé" type="foot_fault" icon="🦶" onClick={handlePointSelection} />
                            <PointOption label="Erro Adversário" type="unforced_error" icon="⚠️" onClick={handlePointSelection} />

                            <h4 className="col-span-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-4 mb-2 pl-1">Troca de Bolas</h4>
                            <PointOption label="Ponto Normal" type="point" icon="🎾" onClick={handlePointSelection} />
                            <PointOption label="Winner (W)" type="winner" icon="🌟" onClick={handlePointSelection} />
                        </div>

                        <button
                            onClick={() => setPointFlow(null)}
                            className="w-full bg-slate-800 py-4 rounded-2xl text-slate-400 font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function PointOption({ label, type, icon, onClick, danger = false }: any) {
    return (
        <button
            onClick={() => onClick(type)}
            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-95 text-left ${danger
                ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10 text-red-400'
                : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-slate-200'
                }`}
        >
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-bold uppercase tracking-tight">{label}</span>
        </button>
    );
}
