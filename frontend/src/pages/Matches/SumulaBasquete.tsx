
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Plus, Minus } from 'lucide-react';
import api from '../../services/api';

export function SumulaBasquete() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);

    // Simple Timer
    const [quarter, setQuarter] = useState(1);
    const [time, setTime] = useState(600); // 10 minutes in seconds
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        if (id) fetchMatchDetails();
    }, [id]);

    useEffect(() => {
        let interval: any = null;
        if (isRunning && time > 0) {
            interval = setInterval(() => setTime(t => t - 1), 1000);
        } else if (time === 0) {
            setIsRunning(false); // End of quarter
        }
        return () => clearInterval(interval);
    }, [isRunning, time]);

    const fetchMatchDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/matches/${id}/full-details`);
            const data = response.data;
            if (data.match) {
                setMatchData({
                    ...data.match,
                    home_score: parseInt(data.match.home_score || 0),
                    away_score: parseInt(data.match.away_score || 0),
                });
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao carregar partida de Basquete');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleScore = async (team: 'home' | 'away', points: number) => {
        if (!matchData) return;
        const teamId = team === 'home' ? matchData.home_team_id : matchData.away_team_id;

        try {
            // Optimistic UI
            setMatchData((prev: any) => ({
                ...prev,
                home_score: team === 'home' ? prev.home_score + points : prev.home_score,
                away_score: team === 'away' ? prev.away_score + points : prev.away_score
            }));

            await api.post(`/admin/matches/${id}/events`, {
                type: 'point',
                description: `${points} Pontos`,
                team_id: teamId,
                points: points
            });
        } catch (e) {
            console.error(e);
        }
    };

    if (loading || !matchData) {
        return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Carregando Basquete...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans pb-20">
            {/* Header */}
            <div className="bg-gray-800 p-4 border-b border-gray-700 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-700 rounded-full">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Súmula de Basquete</span>
                        <span className="text-lg font-bold text-orange-500">{quarter}º QUARTO</span>
                    </div>
                    <div className="w-8"></div>
                </div>
            </div>

            {/* Scoreboard */}
            <div className="py-8 bg-gray-800 shadow-xl border-b border-gray-700">
                <div className="max-w-4xl mx-auto flex items-center justify-center gap-12">
                    {/* Home */}
                    <div className="flex-1 text-center">
                        <h2 className="text-xl font-bold mb-2 text-gray-200">{matchData.home_team?.name}</h2>
                        <div className="text-9xl font-black font-mono text-white">{matchData.home_score}</div>
                        <div className="flex justify-center gap-2 mt-4">
                            <button onClick={() => handleScore('home', 1)} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 font-bold">+1</button>
                            <button onClick={() => handleScore('home', 2)} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 font-bold">+2</button>
                            <button onClick={() => handleScore('home', 3)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-bold">+3</button>
                        </div>
                    </div>

                    {/* Timer */}
                    <div className="w-48 flex flex-col items-center p-4 bg-black/40 rounded-2xl border border-gray-600">
                        <span className={`text-5xl font-mono font-bold mb-2 ${time < 60 ? 'text-red-500' : 'text-white'}`}>
                            {formatTime(time)}
                        </span>
                        <button
                            onClick={() => setIsRunning(!isRunning)}
                            className={`w-full py-2 rounded-lg font-bold uppercase tracking-wider ${isRunning ? 'bg-yellow-600' : 'bg-green-600'}`}
                        >
                            {isRunning ? 'Pausar' : 'Iniciar'}
                        </button>
                    </div>

                    {/* Away */}
                    <div className="flex-1 text-center">
                        <h2 className="text-xl font-bold mb-2 text-gray-200">{matchData.away_team?.name}</h2>
                        <div className="text-9xl font-black font-mono text-white">{matchData.away_score}</div>
                        <div className="flex justify-center gap-2 mt-4">
                            <button onClick={() => handleScore('away', 1)} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 font-bold">+1</button>
                            <button onClick={() => handleScore('away', 2)} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 font-bold">+2</button>
                            <button onClick={() => handleScore('away', 3)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-500 font-bold">+3</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fouls & Timeouts */}
            <div className="max-w-4xl mx-auto p-6 grid grid-cols-2 gap-8">
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <h3 className="text-center text-gray-400 font-bold mb-4 uppercase text-xs">Faltas Coletivas</h3>
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map(n => (
                            <div key={n} className="w-8 h-8 rounded bg-gray-700 border border-gray-600 flex items-center justify-center text-gray-400 font-bold cursor-pointer hover:bg-red-900 hover:text-white">
                                {n}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <h3 className="text-center text-gray-400 font-bold mb-4 uppercase text-xs">Faltas Coletivas</h3>
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map(n => (
                            <div key={n} className="w-8 h-8 rounded bg-gray-700 border border-gray-600 flex items-center justify-center text-gray-400 font-bold cursor-pointer hover:bg-red-900 hover:text-white">
                                {n}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
