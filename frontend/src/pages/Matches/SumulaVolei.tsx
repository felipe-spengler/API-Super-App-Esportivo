
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, User, PlusCircle, MinusCircle, History, Save } from 'lucide-react';
import api from '../../services/api';

export function SumulaVolei() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rotationHome, setRotationHome] = useState<any[]>([]);
    const [rotationAway, setRotationAway] = useState<any[]>([]);

    // States for Modals/Actions
    const [modalRotationOpen, setModalRotationOpen] = useState(false);

    useEffect(() => {
        if (id) fetchMatchDetails();
    }, [id]);

    const fetchMatchDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/matches/${id}/full-details`);
            const data = response.data;
            if (data.match) {
                // Adapt API data
                setMatchData({
                    ...data.match,
                    home_score: data.match.home_score || 0, // Sets won
                    away_score: data.match.away_score || 0,
                    current_set: (data.details?.sets?.length || 0) + 1,
                    points_home: data.details?.current_set_score?.home || 0,
                    points_away: data.details?.current_set_score?.away || 0,
                    history: data.details?.events || [],
                    serving_team_id: data.match.home_team_id // Mock initial server
                });

                if (data.rosters) {
                    setRotationHome(data.rosters.home || []);
                    setRotationAway(data.rosters.away || []);
                }
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao carregar partida de Vôlei');
        } finally {
            setLoading(false);
        }
    };

    const handlePoint = async (team: 'home' | 'away') => {
        if (!matchData) return;
        const teamId = team === 'home' ? matchData.home_team_id : matchData.away_team_id;

        try {
            // Optimistic UI
            setMatchData((prev: any) => ({
                ...prev,
                points_home: team === 'home' ? prev.points_home + 1 : prev.points_home,
                points_away: team === 'away' ? prev.points_away + 1 : prev.points_away
            }));

            await api.post(`/admin/matches/${id}/events`, {
                type: 'point',
                description: 'Ponto',
                team_id: teamId,
                points: 1
            });
            // Reflect: Normally we would check for set finish here
        } catch (e) {
            console.error(e);
        }
    };

    const handleRotation = async (team: 'home' | 'away') => {
        const teamId = team === 'home' ? matchData.home_team_id : matchData.away_team_id;
        try {
            await api.post('/volleyball/rotate', {
                game_match_id: id,
                team_id: teamId,
                set_number: matchData.current_set,
                direction: 'forward'
            });
            alert('Rodízio realizado!');
            fetchMatchDetails(); // Refresh
        } catch (e) {
            console.error(e);
            alert('Erro ao rodar');
        }
    };

    if (loading || !matchData) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
                <span className="loading loading-spinner">Carregando Vôlei...</span>
            </div>
        );
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
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Súmula de Vôlei</span>
                        <span className="text-lg font-bold text-yellow-400">SET {matchData.current_set}</span>
                    </div>
                    <div className="w-8"></div>
                </div>
            </div>

            {/* Scoreboard */}
            <div className="py-8 bg-gray-800 shadow-xl">
                <div className="max-w-4xl mx-auto flex items-center justify-center gap-8">
                    {/* Home */}
                    <div className="flex-1 text-center">
                        <h2 className="text-xl font-bold mb-2 truncate px-4">{matchData.home_team?.name}</h2>
                        <div className="text-8xl font-black font-mono text-blue-400">{matchData.points_home}</div>
                        <div className="text-sm font-bold text-gray-400 mt-2">SETS: {matchData.home_score}</div>
                    </div>

                    <div className="text-gray-600 font-thin text-6xl">:</div>

                    {/* Away */}
                    <div className="flex-1 text-center">
                        <h2 className="text-xl font-bold mb-2 truncate px-4">{matchData.away_team?.name}</h2>
                        <div className="text-8xl font-black font-mono text-green-400">{matchData.points_away}</div>
                        <div className="text-sm font-bold text-gray-400 mt-2">SETS: {matchData.away_score}</div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">

                {/* Home Controls */}
                <div className="bg-blue-900/20 border border-blue-900/50 rounded-3xl p-6">
                    <h3 className="text-center text-blue-300 font-bold mb-6 uppercase tracking-wider">Ações Mandante</h3>

                    <button
                        onClick={() => handlePoint('home')}
                        className="w-full py-8 bg-blue-600 hover:bg-blue-500 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg mb-4 transition-all active:scale-[0.98]"
                    >
                        <PlusCircle className="w-10 h-10" />
                        <span className="text-2xl font-black">PONTO</span>
                    </button>

                    <div className="flex gap-4">
                        <button
                            onClick={() => handleRotation('home')}
                            className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-5 h-5" /> Rodízio
                        </button>
                        <button className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold flex items-center justify-center gap-2">
                            <History className="w-5 h-5" /> Tempo
                        </button>
                    </div>
                </div>

                {/* Away Controls */}
                <div className="bg-green-900/20 border border-green-900/50 rounded-3xl p-6">
                    <h3 className="text-center text-green-300 font-bold mb-6 uppercase tracking-wider">Ações Visitante</h3>

                    <button
                        onClick={() => handlePoint('away')}
                        className="w-full py-8 bg-green-600 hover:bg-green-500 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-lg mb-4 transition-all active:scale-[0.98]"
                    >
                        <PlusCircle className="w-10 h-10" />
                        <span className="text-2xl font-black">PONTO</span>
                    </button>

                    <div className="flex gap-4">
                        <button
                            onClick={() => handleRotation('away')}
                            className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                            <RefreshCw className="w-5 h-5" /> Rodízio
                        </button>
                        <button className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold flex items-center justify-center gap-2">
                            <History className="w-5 h-5" /> Tempo
                        </button>
                    </div>
                </div>
            </div>

            {/* History Feed */}
            <div className="max-w-3xl mx-auto p-6">
                <h3 className="text-gray-500 font-bold mb-4 uppercase text-sm">Histórico do Set</h3>
                <div className="bg-gray-800 rounded-xl p-4 max-h-64 overflow-y-auto border border-gray-700 space-y-2">
                    {matchData.history?.map((ev: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-2 bg-gray-900/50 rounded border border-gray-700/50">
                            <div className={`w-2 h-8 rounded-full ${parseInt(ev.team_id) === matchData.home_team_id ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                            <span className="font-bold">{ev.description || 'Ponto'}</span>
                            <span className="text-xs text-gray-500 ml-auto">{new Date().toLocaleTimeString()}</span>
                        </div>
                    ))}
                    {matchData.history?.length === 0 && <p className="text-center text-gray-600">Nenhum evento ainda.</p>}
                </div>
            </div>
        </div>
    );
}
