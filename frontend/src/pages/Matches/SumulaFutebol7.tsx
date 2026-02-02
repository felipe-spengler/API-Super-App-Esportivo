import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Save, Clock, Users, X, Flag, Timer, Trash2 } from 'lucide-react';
import api from '../../services/api';

export function SumulaFutebol7() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });

    // Timer & Period State (25min cada tempo para Society)
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [currentPeriod, setCurrentPeriod] = useState<string>('1º Tempo');

    // Stats State
    const [fouls, setFouls] = useState({ home: 0, away: 0 });
    const [events, setEvents] = useState<any[]>([]);

    // Modal State
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<'home' | 'away' | null>(null);
    const [eventType, setEventType] = useState<'goal' | 'yellow_card' | 'red_card' | 'blue_card' | 'assist' | 'foul' | 'mvp' | null>(null);

    const fetchMatchDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/matches/${id}/full-details`);
            const data = response.data;
            if (data.match) {
                setMatchData({
                    ...data.match,
                    scoreHome: parseInt(data.match.home_score || 0),
                    scoreAway: parseInt(data.match.away_score || 0)
                });

                if (data.rosters) setRosters(data.rosters);

                const history = (data.details?.events || []).map((e: any) => ({
                    id: e.id,
                    type: e.type,
                    team: parseInt(e.team_id) === data.match.home_team_id ? 'home' : 'away',
                    time: e.minute,
                    period: e.period,
                    player_name: e.player_name
                }));
                setEvents(history);

                const homeFouls = history.filter((e: any) => e.team === 'home' && e.type === 'foul').length;
                const awayFouls = history.filter((e: any) => e.team === 'away' && e.type === 'foul').length;
                setFouls({ home: homeFouls, away: awayFouls });
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao carregar jogo.');
        } finally {
            setLoading(false);
        }
    };

    // --- PERSISTENCE ---
    const STORAGE_KEY = `match_state_futebol7_${id}`;

    useEffect(() => {
        if (id) {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.currentPeriod) setCurrentPeriod(parsed.currentPeriod);
                    if (parsed.fouls) setFouls(parsed.fouls);

                    let restoredTime = parsed.time || 0;
                    if (parsed.isRunning && parsed.lastTimestamp) {
                        const secondsPassed = Math.floor((Date.now() - parsed.lastTimestamp) / 1000);
                        restoredTime += secondsPassed;
                        setIsRunning(true);
                    } else {
                        setIsRunning(false);
                    }
                    setTime(restoredTime);
                } catch (e) {
                    console.error("Failed to recover state", e);
                }
            }
            fetchMatchDetails();
        }
    }, [id]);

    useEffect(() => {
        if (!id || loading) return;
        const stateToSave = {
            time,
            isRunning,
            currentPeriod,
            fouls,
            lastTimestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [time, isRunning, currentPeriod, fouls, id, loading]);

    useEffect(() => {
        let interval: any = null;
        if (isRunning) {
            interval = setInterval(() => setTime(t => t + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePeriodChange = () => {
        if (currentPeriod === '1º Tempo') {
            setIsRunning(false);
            setCurrentPeriod('Intervalo');
        } else if (currentPeriod === 'Intervalo') {
            setCurrentPeriod('2º Tempo');
            setIsRunning(true);
        } else if (currentPeriod === '2º Tempo') {
            setIsRunning(false);
            setCurrentPeriod('Fim de Tempo Normal');
        } else if (currentPeriod === 'Fim de Tempo Normal') {
            if (window.confirm("Iniciar Prorrogação?")) {
                setCurrentPeriod('Prorrogação');
                setIsRunning(true);
            } else if (window.confirm("Ir para Pênaltis?")) {
                setCurrentPeriod('Pênaltis');
            } else {
                setCurrentPeriod('Fim de Jogo');
            }
        } else if (currentPeriod === 'Prorrogação') {
            if (window.confirm("Ir para Pênaltis?")) {
                setCurrentPeriod('Pênaltis');
            } else {
                setCurrentPeriod('Fim de Jogo');
            }
        } else if (currentPeriod === 'Pênaltis') {
            setCurrentPeriod('Fim de Jogo');
        }
    };

    const openEventModal = (team: 'home' | 'away', type: 'goal' | 'yellow_card' | 'red_card' | 'blue_card' | 'assist' | 'foul' | 'mvp') => {
        setSelectedTeam(team);
        setEventType(type);
        setShowEventModal(true);
    };

    const registerSimpleEvent = async (team: 'home' | 'away', type: 'foul' | 'timeout') => {
        if (!matchData) return;
        const teamId = team === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);

        setFouls(prev => ({ ...prev, [team]: prev[team] + 1 }));

        const newEvent = {
            id: Date.now(),
            type: type,
            team: team,
            time: currentTime,
            period: currentPeriod,
            player_name: type === 'timeout' ? 'Pedido de Tempo' : 'Falta de Equipe'
        };
        setEvents(prev => [newEvent, ...prev]);

        try {
            await api.post(`/admin/matches/${id}/events`, {
                event_type: type,
                team_id: teamId,
                minute: currentTime,
                period: currentPeriod
            });
        } catch (e) {
            console.error(e);
        }
    };

    const confirmEvent = async (player: any) => {
        if (!matchData || !selectedTeam || !eventType) return;
        const teamId = selectedTeam === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);

        try {
            const response = await api.post(`/admin/matches/${id}/events`, {
                event_type: eventType,
                team_id: teamId,
                minute: currentTime,
                period: currentPeriod,
                player_id: player.id
            });

            const newEvent = {
                id: response.data.id,
                type: eventType,
                team: selectedTeam,
                time: currentTime,
                period: currentPeriod,
                player_name: player.name
            };
            setEvents(prev => [newEvent, ...prev]);

            if (eventType === 'goal') {
                setMatchData((prev: any) => ({
                    ...prev,
                    scoreHome: selectedTeam === 'home' ? prev.scoreHome + 1 : prev.scoreHome,
                    scoreAway: selectedTeam === 'away' ? prev.scoreAway + 1 : prev.scoreAway
                }));
            }
            setShowEventModal(false);
        } catch (e) {
            console.error(e);
            alert('Erro ao registrar evento');
        }
    };

    const handleDeleteEvent = async (eventId: number, type: string, team: 'home' | 'away') => {
        if (!window.confirm('Excluir este evento?')) return;

        try {
            await api.delete(`/admin/matches/${id}/events/${eventId}`);

            setEvents(prev => prev.filter(e => e.id !== eventId));

            if (type === 'goal') {
                setMatchData((prev: any) => ({
                    ...prev,
                    scoreHome: team === 'home' ? prev.scoreHome - 1 : prev.scoreHome,
                    scoreAway: team === 'away' ? prev.scoreAway - 1 : prev.scoreAway
                }));
            }

            if (type === 'foul') {
                setFouls(prev => ({
                    ...prev,
                    [team]: Math.max(0, prev[team] - 1)
                }));
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir evento');
        }
    };

    const handleFinish = async () => {
        if (!window.confirm('Encerrar partida completamente?')) return;
        try {
            await api.post(`/admin/matches/${id}/finish`, {
                home_score: matchData.scoreHome,
                away_score: matchData.scoreAway
            });
            navigate('/matches');
        } catch (e) {
            console.error(e);
        }
    };

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-gray-900 to-black text-white font-sans pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 pb-2 pt-4 sticky top-0 z-10 border-b border-green-700 shadow-2xl">
                <div className="px-4 flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-black/30 rounded-full backdrop-blur">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold tracking-widest text-green-100">SÚMULA - FUTEBOL 7 (SOCIETY)</span>
                        {matchData.details?.arbitration?.referee && <span className="text-[10px] text-green-200">{matchData.details.arbitration.referee}</span>}
                    </div>
                    <button onClick={handlePeriodChange} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${currentPeriod === 'Intervalo' ? 'bg-yellow-500 text-black' :
                        currentPeriod === 'Fim de Jogo' ? 'bg-red-600 text-white' :
                            'bg-black/40 text-white backdrop-blur'
                        }`}>
                        {currentPeriod === '1º Tempo' ? 'Fim 1º T' :
                            currentPeriod === 'Intervalo' ? 'Iniciar 2º T' :
                                currentPeriod === '2º Tempo' ? 'Encerrar' :
                                    currentPeriod === 'Fim de Tempo Normal' ? 'Próxima Fase' :
                                        currentPeriod === 'Prorrogação' ? 'Fim Prorrogação' :
                                            currentPeriod === 'Pênaltis' ? 'Fim Pênaltis' :
                                                'Finalizado'}
                    </button>
                </div>

                {/* Scoreboard */}
                <div className="flex items-center justify-center gap-2 px-2">
                    <div className="text-center flex-1">
                        <div className="text-5xl sm:text-7xl font-black font-mono leading-none mb-1 text-green-100">{matchData.scoreHome}</div>
                        <h2 className="font-bold text-xs sm:text-sm text-green-200 truncate max-w-[100px] mx-auto">{matchData.home_team?.name}</h2>
                        <div className="text-[10px] text-gray-400 mt-1">Faltas: {fouls.home}</div>
                    </div>

                    <div className="flex flex-col items-center w-28 bg-black/50 backdrop-blur rounded-xl py-2 border border-green-500/50">
                        <div onClick={() => setIsRunning(!isRunning)} className="cursor-pointer mb-1">
                            {isRunning
                                ? <Pause className="w-5 h-5 text-green-400 fill-current animate-pulse" />
                                : <Play className="w-5 h-5 text-gray-500 fill-current" />
                            }
                        </div>
                        <div className="text-3xl font-mono font-bold text-yellow-400 tracking-wider mb-1">{formatTime(time)}</div>
                        <div className="text-[9px] text-green-300 uppercase font-bold px-2 py-0.5 bg-green-900/50 rounded">{currentPeriod}</div>
                    </div>

                    <div className="text-center flex-1">
                        <div className="text-5xl sm:text-7xl font-black font-mono leading-none mb-1 text-green-100">{matchData.scoreAway}</div>
                        <h2 className="font-bold text-xs sm:text-sm text-green-200 truncate max-w-[100px] mx-auto">{matchData.away_team?.name}</h2>
                        <div className="text-[10px] text-gray-400 mt-1">Faltas: {fouls.away}</div>
                    </div>
                </div>
            </div>

            {/* Actions Grid */}
            <div className="p-2 sm:p-4 grid grid-cols-2 gap-2 sm:gap-4 max-w-4xl mx-auto">
                <div className="bg-blue-900/10 p-3 rounded-xl border border-blue-900/30 space-y-2">
                    <button onClick={() => openEventModal('home', 'goal')} className="w-full py-4 bg-blue-600 rounded-lg font-black text-xl border-b-4 border-blue-800 active:scale-95 transition-all">
                        GOL
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => openEventModal('home', 'yellow_card')} className="py-3 bg-yellow-500 text-black rounded-lg font-bold border-b-4 border-yellow-700 active:scale-95 text-xs sm:text-sm">🟨 Amarelo</button>
                        <button onClick={() => openEventModal('home', 'red_card')} className="py-3 bg-red-600 rounded-lg font-bold border-b-4 border-red-800 active:scale-95 text-xs sm:text-sm">🟥 Vermelho</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => openEventModal('home', 'blue_card')} className="py-2 bg-blue-500 rounded-lg font-bold border-b-4 border-blue-700 active:scale-95 text-xs">🟦 Azul</button>
                        <button onClick={() => openEventModal('home', 'assist')} className="py-2 bg-indigo-500 rounded-lg font-bold border-b-4 border-indigo-700 active:scale-95 text-xs">👟 Assist.</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => registerSimpleEvent('home', 'foul')} className="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-gray-900">
                            <Flag size={14} /> + Falta
                        </button>
                        <button onClick={() => openEventModal('home', 'mvp')} className="py-2 bg-amber-500 text-black rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-amber-700">
                            ⭐ Craque
                        </button>
                    </div>
                    {matchData?.championship?.sport?.slug !== 'futebol' && (
                        <button onClick={() => registerSimpleEvent('home', 'timeout')} className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold text-[9px] text-gray-400 uppercase tracking-widest active:scale-95">
                            Pedido de Tempo
                        </button>
                    )}
                </div>

                <div className="bg-red-900/10 p-3 rounded-xl border border-red-900/30 space-y-2">
                    <button onClick={() => openEventModal('away', 'goal')} className="w-full py-4 bg-green-600 rounded-lg font-black text-xl border-b-4 border-green-800 active:scale-95 transition-all">
                        GOL
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => openEventModal('away', 'yellow_card')} className="py-3 bg-yellow-500 text-black rounded-lg font-bold border-b-4 border-yellow-700 active:scale-95 text-xs sm:text-sm">🟨 Amarelo</button>
                        <button onClick={() => openEventModal('away', 'red_card')} className="py-3 bg-red-600 rounded-lg font-bold border-b-4 border-red-800 active:scale-95 text-xs sm:text-sm">🟥 Vermelho</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => openEventModal('away', 'blue_card')} className="py-2 bg-blue-500 rounded-lg font-bold border-b-4 border-blue-700 active:scale-95 text-xs">🟦 Azul</button>
                        <button onClick={() => openEventModal('away', 'assist')} className="py-2 bg-indigo-500 rounded-lg font-bold border-b-4 border-indigo-700 active:scale-95 text-xs">👟 Assist.</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => registerSimpleEvent('away', 'foul')} className="py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-gray-900">
                            <Flag size={14} /> + Falta
                        </button>
                        <button onClick={() => openEventModal('away', 'mvp')} className="py-2 bg-amber-500 text-black rounded-lg font-bold text-xs flex items-center justify-center gap-1 active:scale-95 border-b-2 border-amber-700">
                            ⭐ Craque
                        </button>
                    </div>
                    {matchData?.championship?.sport?.slug !== 'futebol' && (
                        <button onClick={() => registerSimpleEvent('away', 'timeout')} className="w-full py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold text-[9px] text-gray-400 uppercase tracking-widest active:scale-95">
                            Pedido de Tempo
                        </button>
                    )}
                </div>
            </div>

            {/* Timeline */}
            <div className="px-4 mt-2 max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-green-400 uppercase flex items-center gap-2">
                        <Clock size={14} /> Linha do Tempo
                    </h3>
                    <button onClick={handleFinish} className="text-xs text-red-500 underline font-bold">Encerrar Súmula</button>
                </div>

                <div className="space-y-2 pb-20">
                    {events.map((ev, idx) => (
                        <div key={idx} className="bg-gray-800 p-2 sm:p-3 rounded-lg border border-gray-700 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className={`font-mono text-sm font-bold ${ev.team === 'home' ? 'text-blue-400' : 'text-green-400'} min-w-[30px]`}>
                                    {ev.time}'
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm flex items-center gap-2">
                                        {ev.type === 'goal' && '⚽ GOL'}
                                        {ev.type === 'yellow_card' && '🟨 Amarelo'}
                                        {ev.type === 'red_card' && '🟥 Vermelho'}
                                        {ev.type === 'blue_card' && '🟦 Azul'}
                                        {ev.type === 'assist' && '👟 Assistência'}
                                        {ev.type === 'foul' && '⚠️ Falta'}
                                        {ev.type === 'mvp' && '⭐ Craque'}
                                        {ev.type === 'timeout' && '⏱ Pedido de Tempo'}
                                    </span>
                                    {ev.player_name && <span className="text-xs text-gray-400">{ev.player_name}</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-gray-600">{ev.period}</span>
                                <button onClick={() => handleDeleteEvent(ev.id, ev.type, ev.team)} className="p-1 text-gray-500 hover:text-red-500 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {events.length === 0 && <div className="text-center text-gray-600 py-8 text-sm">Nenhum evento registrado ainda.</div>}
                </div>
            </div>

            {/* Player Modal */}
            {showEventModal && selectedTeam && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-gray-800 w-full max-w-md sm:rounded-xl rounded-t-3xl border-t border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-4 bg-gradient-to-r from-green-600 to-emerald-600 border-b border-green-700 flex items-center justify-between sticky top-0 z-10">
                            <div>
                                <h3 className="font-bold text-lg text-white">Selecione o Jogador</h3>
                                <p className="text-xs text-green-200 uppercase">
                                    {selectedTeam === 'home' ? matchData.home_team?.name : matchData.away_team?.name}
                                </p>
                            </div>
                            <button onClick={() => setShowEventModal(false)} className="p-2 bg-black/30 rounded-full hover:bg-black/50">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {(selectedTeam === 'home' ? rosters.home : rosters.away).length === 0 ? (
                                <p className="p-8 text-center text-gray-500">Nenhum jogador cadastrado.</p>
                            ) : (
                                (selectedTeam === 'home' ? rosters.home : rosters.away).map((player: any) => (
                                    <button
                                        key={player.id}
                                        onClick={() => confirmEvent(player)}
                                        className="w-full flex items-center justify-between p-3 hover:bg-gray-700 rounded-xl transition-colors group mb-1 border border-transparent hover:border-green-500"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-bold text-sm text-white group-hover:bg-green-500 transition-colors">
                                                {player.number || '#'}
                                            </div>
                                            <span className="font-medium text-left text-sm">{player.name}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
