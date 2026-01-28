import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Save } from 'lucide-react';
import api from '../../services/api';

export function SumulaFutebol() {
    const { id } = useParams(); // gameId
    const navigate = useNavigate();

    // Game State (Cópia da lógica do Mobile)
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        if (id) fetchMatchDetails();
    }, [id]);

    // Timer Logic 
    useEffect(() => {
        let interval: any = null;
        if (isRunning) {
            interval = setInterval(() => setTime(t => t + 1), 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    const fetchMatchDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/matches/${id}/full-details`);
            const data = response.data;
            if (data.match) {
                // Parse history
                const history = (data.details?.events || []).map((e: any) => ({
                    id: e.id,
                    type: e.type,
                    team: parseInt(e.team_id) === data.match.home_team_id ? 'home' : 'away',
                    time: e.minute,
                    period: e.period
                }));

                setEvents(history);
                setMatchData({
                    ...data.match,
                    scoreHome: parseInt(data.match.home_score || 0),
                    scoreAway: parseInt(data.match.away_score || 0)
                });
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao carregar jogo.');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const addEvent = async (type: 'goal' | 'yellow' | 'red', team: 'home' | 'away') => {
        if (!matchData) return;

        const teamId = team === 'home' ? matchData.home_team_id : matchData.away_team_id;
        const eventType = type === 'goal' ? 'goal' : (type === 'yellow' ? 'yellow_card' : 'red_card');
        const currentTime = formatTime(time);

        try {
            // Optimistic Update (UI first)
            const newEvent = {
                id: Date.now(), // Temp ID
                type: eventType,
                team,
                time: currentTime,
                period: '1º Tempo'
            };

            setEvents(prev => [newEvent, ...prev]);

            if (type === 'goal') {
                setMatchData((prev: any) => ({
                    ...prev,
                    scoreHome: team === 'home' ? prev.scoreHome + 1 : prev.scoreHome,
                    scoreAway: team === 'away' ? prev.scoreAway + 1 : prev.scoreAway
                }));
            }

            // Call API
            await api.post(`/admin/matches/${id}/events`, {
                type: eventType,
                team_id: teamId,
                minute: currentTime,
                period: '1º Tempo'
            });

            // Reload Data to confirm (silently)
            // fetchMatchDetails(); 

        } catch (e) {
            console.error(e);
            alert('Falha ao registrar evento.');
        }
    };

    const handleFinish = async () => {
        if (!window.confirm('Deseja realmente encerrar a partida?')) return;

        try {
            await api.post(`/admin/matches/${id}/finish`, {
                home_score: matchData.scoreHome,
                away_score: matchData.scoreAway
            });
            navigate('/matches');
        } catch (e) {
            console.error(e);
            alert('Erro ao finalizar partida');
        }
    };

    if (loading || !matchData) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="flex flex-col items-center gap-4">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p>Carregando Súmula...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            {/* Header / Placar */}
            <div className="bg-gray-800 p-6 shadow-xl border-b border-gray-700 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto flex flex-col items-center">

                    {/* Top Bar */}
                    <div className="w-full flex items-center justify-between mb-8">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <span className="text-xs font-bold tracking-[0.2em] text-gray-400">SUMULA DIGITAL WEB</span>
                        <div className="w-8"></div>
                    </div>

                    {/* Placar Principal */}
                    <div className="flex items-center justify-center gap-12 w-full">
                        {/* Mandante */}
                        <div className="text-center w-1/3">
                            <h2 className="text-2xl font-bold mb-4">{matchData.home_team?.name}</h2>
                            <div className="text-8xl font-black bg-gray-900/50 rounded-2xl py-4 mx-auto w-40 font-mono border border-gray-700 shadow-inner">
                                {matchData.scoreHome}
                            </div>
                        </div>

                        {/* Cronômetro */}
                        <div className="flex flex-col items-center w-1/3">
                            <div className={`text-6xl font-mono font-bold mb-4 ${isRunning ? 'text-green-400' : 'text-gray-500'}`}>
                                {formatTime(time)}
                            </div>
                            <button
                                onClick={() => setIsRunning(!isRunning)}
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${isRunning ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-green-600 hover:bg-green-500'}`}
                            >
                                {isRunning ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                            </button>
                        </div>

                        {/* Visitante */}
                        <div className="text-center w-1/3">
                            <h2 className="text-2xl font-bold mb-4">{matchData.away_team?.name}</h2>
                            <div className="text-8xl font-black bg-gray-900/50 rounded-2xl py-4 mx-auto w-40 font-mono border border-gray-700 shadow-inner">
                                {matchData.scoreAway}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controles e Linha do Tempo */}
            <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">

                {/* Controles Mandante */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 h-fit">
                    <h3 className="text-center font-bold text-gray-400 mb-6 uppercase tracking-wider">Ações {matchData.home_team?.name}</h3>
                    <div className="space-y-4">
                        <button
                            onClick={() => addEvent('goal', 'home')}
                            className="w-full py-6 bg-blue-600 hover:bg-blue-500 rounded-xl font-black text-2xl shadow-lg transition-transform active:scale-[0.98] border-b-4 border-blue-800"
                        >
                            GOL
                        </button>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => addEvent('yellow', 'home')}
                                className="py-4 bg-yellow-500 hover:bg-yellow-400 rounded-xl font-bold text-black border-b-4 border-yellow-700"
                            >
                                Amarelo
                            </button>
                            <button
                                onClick={() => addEvent('red', 'home')}
                                className="py-4 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white border-b-4 border-red-800"
                            >
                                Vermelho
                            </button>
                        </div>
                    </div>
                </div>

                {/* Feed Central (Linha do Tempo) */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 flex flex-col h-[600px]">
                    <h3 className="text-center font-bold text-gray-400 mb-6 uppercase tracking-wider">Linha do Tempo</h3>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {events.length === 0 ? (
                            <div className="text-center text-gray-500 mt-10">Nenhum evento registrado</div>
                        ) : (
                            events.map((ev, idx) => (
                                <div key={idx} className="flex items-center gap-4 mb-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                                    <span className="font-mono font-bold text-green-400 w-12">{ev.time}</span>
                                    <div className="flex-1">
                                        <p className="font-bold text-sm">
                                            {ev.type === 'goal' ? '⚽ GOL MARCADO!' : ev.type === 'yellow_card' || ev.type === 'yellow' ? '🟨 Cartão Amarelo' : '🟥 Cartão Vermelho'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {ev.team === 'home' ? matchData.home_team?.name : matchData.away_team?.name}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <button
                        onClick={handleFinish}
                        className="mt-6 w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                        <Save className="w-5 h-5" /> Encerrar Partida
                    </button>
                </div>

                {/* Controles Visitante */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 h-fit">
                    <h3 className="text-center font-bold text-gray-400 mb-6 uppercase tracking-wider">Ações {matchData.away_team?.name}</h3>
                    <div className="space-y-4">
                        <button
                            onClick={() => addEvent('goal', 'away')}
                            className="w-full py-6 bg-red-600 hover:bg-red-500 rounded-xl font-black text-2xl shadow-lg transition-transform active:scale-[0.98] border-b-4 border-red-800">
                            GOL
                        </button>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => addEvent('yellow', 'away')}
                                className="py-4 bg-yellow-500 hover:bg-yellow-400 rounded-xl font-bold text-black border-b-4 border-yellow-700"
                            >
                                Amarelo
                            </button>
                            <button
                                onClick={() => addEvent('red', 'away')}
                                className="py-4 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white border-b-4 border-red-800"
                            >
                                Vermelho
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
