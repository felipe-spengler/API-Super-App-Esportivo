import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, RotateCcw, Trophy, Waves } from 'lucide-react';
import api from '../../services/api';

export function SumulaFutevolei() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });

    // Match State
    const [sets, setSets] = useState<any[]>([]);
    const [currentSet, setCurrentSet] = useState(1);
    const [score, setScore] = useState({ home: 0, away: 0 }); // Pontos no set atual
    const [matchFinished, setMatchFinished] = useState(false);

    const POINTS_TO_WIN = 18; // Futevôlei geralmente é 18 ou 21 pontos
    const MIN_MARGIN = 2;
    const BEST_OF = 3; // Melhor de 3 sets

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

                if (data.details?.sets && data.details.sets.length > 0) {
                    setSets(data.details.sets);
                    setCurrentSet(data.details.sets.length + 1);
                }
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

    const addPoint = async (team: 'home' | 'away') => {
        if (matchFinished) return;

        const newScore = { ...score };
        newScore[team]++;
        setScore(newScore);

        // Check if set won
        if (newScore[team] >= POINTS_TO_WIN && newScore[team] >= newScore[team === 'home' ? 'away' : 'home'] + MIN_MARGIN) {
            await finishSet(newScore);
        }

        // Save point event
        try {
            await api.post(`/admin/matches/${id}/events`, {
                type: 'point',
                team_id: team === 'home' ? matchData.home_team_id : matchData.away_team_id,
                period: `Set ${currentSet}`,
                value: 1
            });
        } catch (e) {
            console.error(e);
        }
    };

    const removePoint = (team: 'home' | 'away') => {
        if (score[team] > 0) {
            setScore(prev => ({ ...prev, [team]: prev[team] - 1 }));
        }
    };

    const finishSet = async (finalScore: any) => {
        const setData = {
            set_number: currentSet,
            home_score: finalScore.home,
            away_score: finalScore.away
        };

        const newSets = [...sets, setData];
        setSets(newSets);

        // Update match score (sets won)
        const homeSetsWon = newSets.filter(s => s.home_score > s.away_score).length;
        const awaySetsWon = newSets.filter(s => s.away_score > s.home_score).length;

        setMatchData((prev: any) => ({
            ...prev,
            scoreHome: homeSetsWon,
            scoreAway: awaySetsWon
        }));

        // Save set to backend
        try {
            await api.post(`/admin/matches/${id}/sets`, {
                set_number: currentSet,
                home_score: finalScore.home,
                away_score: finalScore.away
            });
        } catch (e) {
            console.error(e);
        }

        // Check if match is finished
        const setsNeededToWin = Math.ceil(BEST_OF / 2);
        if (homeSetsWon === setsNeededToWin || awaySetsWon === setsNeededToWin) {
            setMatchFinished(true);
            alert(`🏆 Partida encerrada! ${homeSetsWon > awaySetsWon ? matchData.home_team?.name : matchData.away_team?.name} venceu!`);
        } else {
            // Start new set
            setCurrentSet(currentSet + 1);
            setScore({ home: 0, away: 0 });
        }
    };

    const handleFinish = async () => {
        if (!window.confirm('Encerrar e salvar partida?')) return;
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

    const resetSet = () => {
        if (window.confirm('Resetar set atual?')) {
            setScore({ home: 0, away: 0 });
        }
    };

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-900 text-white font-sans pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 pb-3 pt-4 sticky top-0 z-10 border-b border-cyan-700 shadow-2xl">
                <div className="px-4 flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/20 rounded-full backdrop-blur">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <Waves className="w-5 h-5 text-cyan-200" />
                            <span className="text-[11px] font-bold tracking-widest text-white drop-shadow-lg">FUTEVÔLEI</span>
                        </div>
                        {matchData.details?.arbitration?.referee && <span className="text-[10px] text-cyan-100">{matchData.details.arbitration.referee}</span>}
                    </div>
                    <button onClick={resetSet} className="p-2 bg-white/20 rounded-full backdrop-blur hover:bg-white/30" disabled={matchFinished}>
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>

                {/* Scoreboard - Sets Won */}
                <div className="px-4 mb-3">
                    <div className="flex items-center justify-center gap-4">
                        <div className="text-center flex-1">
                            <div className="text-6xl sm:text-7xl font-black font-mono leading-none mb-1 text-cyan-100 drop-shadow-[0_4px_8px_rgba(0,255,255,0.3)]">{matchData.scoreHome}</div>
                            <h2 className="font-bold text-sm text-cyan-200 truncate max-w-[140px] mx-auto">{matchData.home_team?.name || 'Dupla 1'}</h2>
                        </div>
                        <div className="text-[10px] font-bold text-white/70 uppercase">Sets</div>
                        <div className="text-center flex-1">
                            <div className="text-6xl sm:text-7xl font-black font-mono leading-none mb-1 text-cyan-100 drop-shadow-[0_4px_8px_rgba(0,255,255,0.3)]">{matchData.scoreAway}</div>
                            <h2 className="font-bold text-sm text-cyan-200 truncate max-w-[140px] mx-auto">{matchData.away_team?.name || 'Dupla 2'}</h2>
                        </div>
                    </div>
                </div>

                {/* Current Set Score */}
                {!matchFinished && (
                    <div className="px-4">
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                            <div className="text-center text-[10px] font-bold text-cyan-100 mb-3 uppercase tracking-wider">Set {currentSet}</div>
                            <div className="flex items-center justify-center gap-8">
                                <div className="text-6xl font-black text-white drop-shadow-[0_4px_12px_rgba(255,255,255,0.3)]">{score.home}</div>
                                <div className="text-2xl text-white/50">-</div>
                                <div className="text-6xl font-black text-white drop-shadow-[0_4px_12px_rgba(255,255,255,0.3)]">{score.away}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            {!matchFinished && (
                <div className="p-4 grid grid-cols-2 gap-4 max-w-3xl mx-auto">
                    <div className="space-y-2">
                        <div className="text-center text-xs font-bold text-cyan-300 mb-1">{matchData.home_team?.name || 'Dupla 1'}</div>
                        <button
                            onClick={() => addPoint('home')}
                            className="w-full py-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl font-black text-5xl border-b-8 border-blue-900 active:scale-95 transition-all shadow-2xl hover:from-blue-400 hover:to-blue-600 flex items-center justify-center"
                        >
                            <Plus size={48} />
                        </button>
                        <button
                            onClick={() => removePoint('home')}
                            className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-sm border-b-4 border-gray-900 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Minus size={16} /> Remover
                        </button>
                    </div>

                    <div className="space-y-2">
                        <div className="text-center text-xs font-bold text-cyan-300 mb-1">{matchData.away_team?.name || 'Dupla 2'}</div>
                        <button
                            onClick={() => addPoint('away')}
                            className="w-full py-12 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl font-black text-5xl border-b-8 border-green-900 active:scale-95 transition-all shadow-2xl hover:from-green-400 hover:to-green-600 flex items-center justify-center"
                        >
                            <Plus size={48} />
                        </button>
                        <button
                            onClick={() => removePoint('away')}
                            className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-sm border-b-4 border-gray-900 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Minus size={16} /> Remover
                        </button>
                    </div>
                </div>
            )}

            {/* Sets History */}
            <div className="px-4 mt-4 max-w-3xl mx-auto">
                <h3 className="text-sm font-bold text-white uppercase mb-3 flex items-center gap-2">
                    <Trophy size={16} /> Histórico de Sets
                </h3>
                <div className="space-y-2">
                    {sets.map((set, idx) => (
                        <div key={idx} className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/20 flex items-center justify-between">
                            <span className="font-bold text-lg text-cyan-100">Set {set.set_number}</span>
                            <div className="flex items-center gap-6">
                                <span className={`text-2xl font-bold ${set.home_score > set.away_score ? 'text-green-300' : 'text-white/60'}`}>
                                    {set.home_score}
                                </span>
                                <span className="text-white/50">-</span>
                                <span className={`text-2xl font-bold ${set.away_score > set.home_score ? 'text-green-300' : 'text-white/60'}`}>
                                    {set.away_score}
                                </span>
                            </div>
                        </div>
                    ))}
                    {sets.length === 0 && <div className="text-center text-white/60 py-8 text-sm">Nenhum set finalizado ainda.</div>}
                </div>

                {matchFinished && (
                    <div className="mt-6">
                        <button onClick={handleFinish} className="w-full py-4 bg-gradient-to-r from-green-600 to-green-800 rounded-xl font-black text-xl border-b-4 border-green-900 active:scale-95 transition-all shadow-2xl">
                            ✅ SALVAR E ENCERRAR PARTIDA
                        </button>
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="px-4 mt-6 max-w-3xl mx-auto">
                <div className="bg-black/20 backdrop-blur rounded-xl p-4 border border-white/20">
                    <h4 className="font-bold text-xs text-cyan-200 mb-2 uppercase">ℹ️ Regras do Futevôlei</h4>
                    <ul className="text-[11px] text-white/80 space-y-1">
                        <li>• Set: Primeiro a {POINTS_TO_WIN} pontos (com {MIN_MARGIN} de diferença)</li>
                        <li>• Match: Melhor de {BEST_OF} sets</li>
                        <li>• Não há rotação - Duplas fixas</li>
                        <li>• Saque com os pés, sem uso das mãos</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
