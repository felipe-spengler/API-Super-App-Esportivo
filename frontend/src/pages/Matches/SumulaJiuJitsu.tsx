import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Timer, Trophy, Award, AlertCircle, Clock } from 'lucide-react';
import api from '../../services/api';

type EventType = 'takedown' | 'guard_pass' | 'mount' | 'back_control' | 'knee_on_belly' | 'sweep' | 'advantage' | 'penalty' | 'submission';

export function SumulaJiuJitsu() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });

    // Timer State (regressivo - normalmente 5-10min)
    const [time, setTime] = useState(300); // 5min padrão
    const [isRunning, setIsRunning] = useState(false);
    const [finished, setFinished] = useState(false);

    // Score State
    const [points, setPoints] = useState({ home: 0, away: 0 });
    const [advantages, setAdvantages] = useState({ home: 0, away: 0 });
    const [penalties, setPenalties] = useState({ home: 0, away: 0 });
    const [events, setEvents] = useState<any[]>([]);

    // Points values
    const pointsMap: Record<string, number> = {
        'takedown': 2,
        'guard_pass': 3,
        'mount': 4,
        'back_control': 4,
        'knee_on_belly': 2,
        'sweep': 2
    };

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
                    player_name: e.player_name,
                    value: e.value || 0
                }));
                setEvents(history);
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao carregar jogo.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchMatchDetails();
        }
    }, [id]);

    // Countdown Timer
    useEffect(() => {
        let interval: any = null;
        if (isRunning && time > 0) {
            interval = setInterval(() => setTime(t => {
                if (t <= 1) {
                    setIsRunning(false);
                    setFinished(true);
                    alert('⏱️ Tempo esgotado!');
                    return 0;
                }
                return t - 1;
            }), 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, time]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const registerEvent = async (team: 'home' | 'away', eventType: EventType) => {
        if (finished) return;
        if (!matchData) return;

        const teamId = team === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const currentTime = formatTime(time);

        let pointsValue = 0;

        if (eventType === 'submission') {
            // Submission wins immediately
            setFinished(true);
            alert(`🏆 FINALIZAÇÃO! ${team === 'home' ? matchData.home_team?.name : matchData.away_team?.name} venceu por finalização!`);

            const newEvent = {
                id: Date.now(),
                type: 'submission',
                team: team,
                time: currentTime,
                player_name: 'Finalização',
                value: 0
            };
            setEvents(prev => [newEvent, ...prev]);

            try {
                await api.post(`/admin/matches/${id}/events`, {
                    type: 'submission',
                    team_id: teamId,
                    minute: currentTime,
                    value: 0
                });
            } catch (e) {
                console.error(e);
            }
            return;
        }

        if (eventType === 'advantage') {
            setAdvantages(prev => ({ ...prev, [team]: prev[team] + 1 }));
        } else if (eventType === 'penalty') {
            setPenalties(prev => ({ ...prev, [team]: prev[team] + 1 }));
            // Penalties give 2 points to opponent after 4th penalty
            const newPenalties = penalties[team] + 1;
            if (newPenalties >= 4) {
                alert(`⚠️ 4ª penalidade! Oponente ganha 2 pontos.`);
                const opponent = team === 'home' ? 'away' : 'home';
                setPoints(prev => ({ ...prev, [opponent]: prev[opponent] + 2 }));
            }
        } else {
            pointsValue = pointsMap[eventType] || 0;
            setPoints(prev => ({ ...prev, [team]: prev[team] + pointsValue }));
        }

        const newEvent = {
            id: Date.now(),
            type: eventType,
            team: team,
            time: currentTime,
            player_name: eventType === 'advantage' ? 'Vantagem' : eventType === 'penalty' ? 'Penalidade' : `+${pointsValue} pts`,
            value: pointsValue
        };
        setEvents(prev => [newEvent, ...prev]);

        // Update match score
        if (pointsValue > 0) {
            setMatchData((prev: any) => ({
                ...prev,
                scoreHome: team === 'home' ? points.home + pointsValue : prev.scoreHome,
                scoreAway: team === 'away' ? points.away + pointsValue : prev.scoreAway
            }));
        }

        try {
            await api.post(`/admin/matches/${id}/events`, {
                type: eventType,
                team_id: teamId,
                minute: currentTime,
                value: pointsValue
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleFinish = async () => {
        if (!window.confirm('Encerrar luta e salvar resultado?')) return;
        try {
            await api.post(`/admin/matches/${id}/finish`, {
                home_score: points.home,
                away_score: points.away
            });
            navigate('/matches');
        } catch (e) {
            console.error(e);
        }
    };

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-900 via-zinc-900 to-black text-white font-sans pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-700 to-yellow-700 pb-3 pt-4 sticky top-0 z-10 border-b border-amber-800 shadow-2xl">
                <div className="px-4 flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-black/30 rounded-full backdrop-blur">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <Award className="w-6 h-6 text-yellow-200" />
                            <span className="text-[11px] font-bold tracking-widest text-white drop-shadow-lg">JIU-JITSU</span>
                        </div>
                        {matchData.details?.arbitration?.referee && <span className="text-[10px] text-amber-100">{matchData.details.arbitration.referee}</span>}
                    </div>
                    <button onClick={() => setIsRunning(!isRunning)} disabled={finished} className={`p-2 rounded-full backdrop-blur ${isRunning ? 'bg-red-600' : 'bg-green-600'}`}>
                        <Timer className="w-5 h-5" />
                    </button>
                </div>

                {/* Timer */}
                <div className="px-4 mb-3 flex justify-center">
                    <div className="bg-black/50 backdrop-blur rounded-2xl px-8 py-3 border-2 border-amber-500/50">
                        <div className={`text-5xl font-black font-mono ${time < 60 ? 'text-red-400 animate-pulse' : 'text-yellow-300'}`}>
                            {formatTime(time)}
                        </div>
                    </div>
                </div>

                {/* Scoreboard */}
                <div className="px-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Home */}
                        <div className="bg-black/30 backdrop-blur rounded-xl p-3 border border-amber-500/30">
                            <div className="text-center">
                                <div className="text-5xl font-black text-white mb-1">{points.home}</div>
                                <div className="text-xs font-bold text-amber-200 truncate">{matchData.home_team?.name || 'Atleta 1'}</div>
                                <div className="flex justify-center gap-4 mt-2 text-[10px]">
                                    <div className="text-green-400">Vant: {advantages.home}</div>
                                    <div className="text-red-400">Penais: {penalties.home}</div>
                                </div>
                            </div>
                        </div>

                        {/* Away */}
                        <div className="bg-black/30 backdrop-blur rounded-xl p-3 border border-amber-500/30">
                            <div className="text-center">
                                <div className="text-5xl font-black text-white mb-1">{points.away}</div>
                                <div className="text-xs font-bold text-amber-200 truncate">{matchData.away_team?.name || 'Atleta 2'}</div>
                                <div className="flex justify-center gap-4 mt-2 text-[10px]">
                                    <div className="text-green-400">Vant: {advantages.away}</div>
                                    <div className="text-red-400">Penais: {penalties.away}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Grid */}
            <div className="p-3 grid grid-cols-2 gap-3 max-w-5xl mx-auto">
                {/* Home Actions */}
                <div className="space-y-2">
                    <div className="text-center text-xs font-bold text-amber-300 mb-1">{matchData.home_team?.name || 'Atleta 1'}</div>

                    <button onClick={() => registerEvent('home', 'takedown')} className="w-full py-2 bg-blue-700 rounded-lg font-bold text-[11px] border-b-4 border-blue-900 active:scale-95">
                        Queda (2pts)
                    </button>
                    <button onClick={() => registerEvent('home', 'sweep')} className="w-full py-2 bg-blue-700 rounded-lg font-bold text-[11px] border-b-4 border-blue-900 active:scale-95">
                        Raspagem (2pts)
                    </button>
                    <button onClick={() => registerEvent('home', 'knee_on_belly')} className="w-full py-2 bg-blue-700 rounded-lg font-bold text-[11px] border-b-4 border-blue-900 active:scale-95">
                        100kg (2pts)
                    </button>
                    <button onClick={() => registerEvent('home', 'guard_pass')} className="w-full py-2 bg-indigo-700 rounded-lg font-bold text-[11px] border-b-4 border-indigo-900 active:scale-95">
                        Passagem (3pts)
                    </button>
                    <button onClick={() => registerEvent('home', 'mount')} className="w-full py-2 bg-purple-700 rounded-lg font-bold text-[11px] border-b-4 border-purple-900 active:scale-95">
                        Montada (4pts)
                    </button>
                    <button onClick={() => registerEvent('home', 'back_control')} className="w-full py-2 bg-purple-700 rounded-lg font-bold text-[11px] border-b-4 border-purple-900 active:scale-95">
                        Costas (4pts)
                    </button>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <button onClick={() => registerEvent('home', 'advantage')} className="py-2 bg-green-700 rounded-lg font-bold text-[10px] border-b-4 border-green-900 active:scale-95">
                            + Vantagem
                        </button>
                        <button onClick={() => registerEvent('home', 'penalty')} className="py-2 bg-yellow-600 rounded-lg font-bold text-[10px] border-b-4 border-yellow-800 active:scale-95">
                            + Penalidade
                        </button>
                    </div>

                    <button onClick={() => registerEvent('home', 'submission')} className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-700 rounded-xl font-black text-sm border-b-4 border-orange-900 active:scale-95 mt-2">
                        🏆 FINALIZAÇÃO
                    </button>
                </div>

                {/* Away Actions */}
                <div className="space-y-2">
                    <div className="text-center text-xs font-bold text-amber-300 mb-1">{matchData.away_team?.name || 'Atleta 2'}</div>

                    <button onClick={() => registerEvent('away', 'takedown')} className="w-full py-2 bg-blue-700 rounded-lg font-bold text-[11px] border-b-4 border-blue-900 active:scale-95">
                        Queda (2pts)
                    </button>
                    <button onClick={() => registerEvent('away', 'sweep')} className="w-full py-2 bg-blue-700 rounded-lg font-bold text-[11px] border-b-4 border-blue-900 active:scale-95">
                        Raspagem (2pts)
                    </button>
                    <button onClick={() => registerEvent('away', 'knee_on_belly')} className="w-full py-2 bg-blue-700 rounded-lg font-bold text-[11px] border-b-4 border-blue-900 active:scale-95">
                        100kg (2pts)
                    </button>
                    <button onClick={() => registerEvent('away', 'guard_pass')} className="w-full py-2 bg-indigo-700 rounded-lg font-bold text-[11px] border-b-4 border-indigo-900 active:scale-95">
                        Passagem (3pts)
                    </button>
                    <button onClick={() => registerEvent('away', 'mount')} className="w-full py-2 bg-purple-700 rounded-lg font-bold text-[11px] border-b-4 border-purple-900 active:scale-95">
                        Montada (4pts)
                    </button>
                    <button onClick={() => registerEvent('away', 'back_control')} className="w-full py-2 bg-purple-700 rounded-lg font-bold text-[11px] border-b-4 border-purple-900 active:scale-95">
                        Costas (4pts)
                    </button>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <button onClick={() => registerEvent('away', 'advantage')} className="py-2 bg-green-700 rounded-lg font-bold text-[10px] border-b-4 border-green-900 active:scale-95">
                            + Vantagem
                        </button>
                        <button onClick={() => registerEvent('away', 'penalty')} className="py-2 bg-yellow-600 rounded-lg font-bold text-[10px] border-b-4 border-yellow-800 active:scale-95">
                            + Penalidade
                        </button>
                    </div>

                    <button onClick={() => registerEvent('away', 'submission')} className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-700 rounded-xl font-black text-sm border-b-4 border-orange-900 active:scale-95 mt-2">
                        🏆 FINALIZAÇÃO
                    </button>
                </div>
            </div>

            {/* Timeline */}
            <div className="px-4 mt-3 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-2">
                        <Clock size={14} /> Linha do Tempo
                    </h3>
                    <button onClick={handleFinish} className="text-xs text-red-500 underline font-bold">Encerrar Luta</button>
                </div>

                <div className="space-y-2 pb-10">
                    {events.map((ev, idx) => (
                        <div key={idx} className="bg-gray-800/80 p-2 rounded-lg border border-gray-700 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className={`font-mono font-bold ${ev.team === 'home' ? 'text-blue-400' : 'text-green-400'}`}>
                                    {ev.time}
                                </div>
                                <div className="font-bold">
                                    {ev.type === 'submission' && '🏆 FINALIZAÇÃO'}
                                    {ev.type === 'takedown' && '⬇️ Queda (2pts)'}
                                    {ev.type === 'sweep' && '🔄 Raspagem (2pts)'}
                                    {ev.type === 'knee_on_belly' && '💪 100kg (2pts)'}
                                    {ev.type === 'guard_pass' && '➡️ Passagem (3pts)'}
                                    {ev.type === 'mount' && '🔝 Montada (4pts)'}
                                    {ev.type === 'back_control' && '🎯 Costas (4pts)'}
                                    {ev.type === 'advantage' && '✅ Vantagem'}
                                    {ev.type === 'penalty' && '⚠️ Penalidade'}
                                </div>
                            </div>
                        </div>
                    ))}
                    {events.length === 0 && <div className="text-center text-gray-600 py-8 text-sm">Nenhuma ação registrada ainda.</div>}
                </div>
            </div>
        </div>
    );
}
