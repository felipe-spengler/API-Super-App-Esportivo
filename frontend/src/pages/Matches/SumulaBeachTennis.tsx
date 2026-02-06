import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, RotateCcw, Trophy, Sun } from 'lucide-react';
import api from '../../services/api';

export function SumulaBeachTennis() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });

    // Match State
    const [sets, setSets] = useState<any[]>([]);
    const [currentSet, setCurrentSet] = useState(1);
    const [gameScore, setGameScore] = useState({ home: 0, away: 0 }); // Pontos no game atual
    const [gamesWon, setGamesWon] = useState({ home: 0, away: 0 }); // Games vencidos no set atual
    const [matchFinished, setMatchFinished] = useState(false);

    const fetchMatchDetails = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await api.get(`/admin/matches/${id}/full-details`);
            const data = response.data;
            if (data.match) {
                setMatchData({
                    ...data.match,
                    scoreHome: parseInt(data.match.home_score || 0), // Sets vencidos
                    scoreAway: parseInt(data.match.away_score || 0)
                });

                if (data.rosters) setRosters(data.rosters);

                // Recover sets history if exists
                if (data.details?.sets && data.details.sets.length > 0) {
                    setSets(data.details.sets);
                }

                // Recover current state from server sync
                if (data.match.match_details?.sync_state) {
                    const ss = data.match.match_details.sync_state;
                    if (ss.gameScore) setGameScore(ss.gameScore);
                    if (ss.gamesWon) setGamesWon(ss.gamesWon);
                    if (ss.currentSet) setCurrentSet(ss.currentSet);
                }
            }
        } catch (e) {
            console.error(e);
            if (!silent) alert('Erro ao carregar jogo.');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // --- PERSISTENCE ---
    const STORAGE_KEY = `match_state_beach_tennis_${id}`;

    useEffect(() => {
        if (id) {
            // Initial Fetch
            fetchMatchDetails();

            // Sync Interval
            const syncInterval = setInterval(() => {
                fetchMatchDetails(true);
            }, 2000);

            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.sets) setSets(parsed.sets);
                    if (parsed.currentSet) setCurrentSet(parsed.currentSet);
                    if (parsed.gameScore) setGameScore(parsed.gameScore);
                    if (parsed.gamesWon) setGamesWon(parsed.gamesWon);
                    if (parsed.matchFinished) setMatchFinished(parsed.matchFinished);
                } catch (e) {
                    console.error("Failed to recover state", e);
                }
            }
            return () => clearInterval(syncInterval);
        }
    }, [id]);

    useEffect(() => {
        if (!id || loading) return;
        const stateToSave = {
            sets,
            currentSet,
            gameScore,
            gamesWon,
            matchFinished
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [id, loading, sets, currentSet, gameScore, gamesWon, matchFinished]);

    // PING - Sync local state TO server (Every 3 seconds)
    useEffect(() => {
        if (!id || matchFinished || loading || !matchData) return;

        const pingInterval = setInterval(async () => {
            try {
                await api.patch(`/admin/matches/${id}`, {
                    match_details: {
                        ...matchData.match_details,
                        sync_state: {
                            gameScore,
                            gamesWon,
                            currentSet,
                            updated_at: Date.now()
                        }
                    }
                });
            } catch (e) {
                console.error("State sync failed", e);
            }
        }, 3000);

        return () => clearInterval(pingInterval);
    }, [id, gameScore, gamesWon, currentSet]);

    // Scoring system: 0, 15, 30, 40, Game (Simplified, no deuce)
    const pointLabels = ['0', '15', '30', '40'];

    const addPoint = async (team: 'home' | 'away') => {
        if (matchFinished) return;

        // If match is still scheduled, try to set to live on first point
        if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
            registerSystemEvent('match_start', 'Início da Partida');
        }

        const newScore = { ...gameScore };
        newScore[team]++;

        // Check if game won
        if (newScore[team] >= 4 && newScore[team] >= newScore[team === 'home' ? 'away' : 'home'] + 2) {
            // Game won
            const newGames = { ...gamesWon };
            newGames[team]++;
            setGamesWon(newGames);
            setGameScore({ home: 0, away: 0 });

            // Check if set won (first to 6 games, margin of 2, or tiebreak at 6-6)
            if (newGames[team] >= 6 && newGames[team] >= newGames[team === 'home' ? 'away' : 'home'] + 2) {
                await finishSet(newGames);
            } else if (newGames.home === 6 && newGames.away === 6) {
                // Tiebreak (simplified, just first to 7 points)
                alert('Tiebreak! Primeiro a 7 pontos vence o set.');
            }
        } else {
            setGameScore(newScore);
        }

        // Save point event
        try {
            await api.post(`/admin/matches/${id}/events`, {
                event_type: 'point',
                team_id: team === 'home' ? matchData.home_team_id : matchData.away_team_id,
                period: `Set ${currentSet}`,
                metadata: { game_score: `${newScore.home}-${newScore.away}` }
            });
        } catch (e) {
            console.error(e);
        }
    };

    const finishSet = async (finalGames: any) => {
        const setData = {
            set_number: currentSet,
            home_games: finalGames.home,
            away_games: finalGames.away
        };

        const newSets = [...sets, setData];
        setSets(newSets);

        // Update match score (sets won)
        const homeSetsWon = newSets.filter(s => s.home_games > s.away_games).length;
        const awaySetsWon = newSets.filter(s => s.away_games > s.home_games).length;

        setMatchData((prev: any) => ({
            ...prev,
            scoreHome: homeSetsWon,
            scoreAway: awaySetsWon
        }));

        // Save set to backend
        try {
            await api.post(`/admin/matches/${id}/sets`, {
                set_number: currentSet,
                home_score: finalGames.home,
                away_score: finalGames.away
            });
        } catch (e) {
            console.error(e);
        }

        // Check if match is finished (best of 3: first to 2 sets)
        if (homeSetsWon === 2 || awaySetsWon === 2) {
            setMatchFinished(true);
            alert(`🏆 Partida encerrada! ${homeSetsWon > awaySetsWon ? matchData.home_team?.name : matchData.away_team?.name} venceu!`);
        } else {
            // Start new set
            setCurrentSet(currentSet + 1);
            setGamesWon({ home: 0, away: 0 });
            setGameScore({ home: 0, away: 0 });
        }
    };

    const handleFinish = async () => {
        if (!window.confirm('Encerrar e salvar partida?')) return;
        try {
            await registerSystemEvent('match_end', 'Partida Finalizada');

            await api.post(`/admin/matches/${id}/finish`, {
                home_score: matchData.scoreHome,
                away_score: matchData.scoreAway
            });

            localStorage.removeItem(STORAGE_KEY);
            navigate('/matches');
        } catch (e) {
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
                period: `Set ${currentSet}`,
                metadata: { label }
            });

            // If we successfully started the match, update status locally
            if (type === 'match_start') {
                setMatchData((prev: any) => ({ ...prev, status: 'live' }));
            }
        } catch (e) {
            console.error("Erro ao registrar evento de sistema", e);
            if (type === 'match_start') {
                alert("Erro de conexão ao iniciar partida no servidor.");
            }
        }
    };

    const resetGame = () => {
        if (window.confirm('Resetar game atual?')) {
            setGameScore({ home: 0, away: 0 });
        }
    };

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-600 via-orange-500 to-pink-600 text-white font-sans pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 pb-3 pt-4 sticky top-0 z-10 border-b border-yellow-600 shadow-2xl">
                <div className="px-4 flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/20 rounded-full backdrop-blur">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <Sun className="w-5 h-5 text-yellow-200" />
                            <span className="text-[11px] font-bold tracking-widest text-white drop-shadow-lg">BEACH TENNIS</span>
                        </div>
                        {matchData.details?.arbitration?.referee && <span className="text-[10px] text-yellow-100">{matchData.details.arbitration.referee}</span>}
                    </div>
                    <button onClick={resetGame} className="p-2 bg-white/20 rounded-full backdrop-blur hover:bg-white/30">
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>

                {/* Scoreboard */}
                <div className="px-4 space-y-3">
                    {/* Sets Won */}
                    <div className="flex items-center justify-center gap-4">
                        <div className="text-center flex-1">
                            <div className="text-6xl font-black font-mono leading-none mb-1 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">{matchData.scoreHome}</div>
                            <h2 className="font-bold text-sm text-yellow-100 truncate max-w-[140px] mx-auto">{matchData.home_team?.name || 'Dupla 1'}</h2>
                        </div>
                        <div className="text-[10px] font-bold text-white/70 uppercase">Sets</div>
                        <div className="text-center flex-1">
                            <div className="text-6xl font-black font-mono leading-none mb-1 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">{matchData.scoreAway}</div>
                            <h2 className="font-bold text-sm text-yellow-100 truncate max-w-[140px] mx-auto">{matchData.away_team?.name || 'Dupla 2'}</h2>
                        </div>
                    </div>

                    {/* Current Set / Games */}
                    {!matchFinished && (
                        <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                            <div className="text-center text-[10px] font-bold text-yellow-100 mb-2 uppercase tracking-wider">Set {currentSet} - Games</div>
                            <div className="flex items-center justify-center gap-6">
                                <div className="text-3xl font-bold text-white">{gamesWon.home}</div>
                                <div className="text-sm text-white/70">-</div>
                                <div className="text-3xl font-bold text-white">{gamesWon.away}</div>
                            </div>
                        </div>
                    )}

                    {/* Current Game Score */}
                    {!matchFinished && (
                        <div className="bg-black/20 backdrop-blur rounded-xl p-3 border border-white/20">
                            <div className="text-center text-[10px] font-bold text-yellow-100 mb-2 uppercase tracking-wider">Game Atual</div>
                            <div className="flex items-center justify-center gap-8">
                                <div className="text-4xl font-black text-white drop-shadow-lg">{pointLabels[gameScore.home] || gameScore.home}</div>
                                <div className="text-lg text-white/50">:</div>
                                <div className="text-4xl font-black text-white drop-shadow-lg">{pointLabels[gameScore.away] || gameScore.away}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            {!matchFinished && (
                <div className="p-4 grid grid-cols-2 gap-4 max-w-3xl mx-auto">
                    <button
                        onClick={() => addPoint('home')}
                        className="py-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl font-black text-3xl border-b-8 border-blue-900 active:scale-95 transition-all shadow-2xl hover:from-blue-400 hover:to-blue-600"
                    >
                        PONTO<br />
                        <span className="text-lg font-bold">{matchData.home_team?.name || 'Dupla 1'}</span>
                    </button>
                    <button
                        onClick={() => addPoint('away')}
                        className="py-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl font-black text-3xl border-b-8 border-green-900 active:scale-95 transition-all shadow-2xl hover:from-green-400 hover:to-green-600"
                    >
                        PONTO<br />
                        <span className="text-lg font-bold">{matchData.away_team?.name || 'Dupla 2'}</span>
                    </button>
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
                            <span className="font-bold text-lg text-yellow-100">Set {set.set_number}</span>
                            <div className="flex items-center gap-6">
                                <span className={`text-2xl font-bold ${set.home_games > set.away_games ? 'text-green-300' : 'text-white/60'}`}>
                                    {set.home_games}
                                </span>
                                <span className="text-white/50">-</span>
                                <span className={`text-2xl font-bold ${set.away_games > set.home_games ? 'text-green-300' : 'text-white/60'}`}>
                                    {set.away_games}
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
                    <h4 className="font-bold text-xs text-yellow-200 mb-2 uppercase">ℹ️ Regras do Placar</h4>
                    <ul className="text-[11px] text-white/80 space-y-1">
                        <li>• Pontos: 0, 15, 30, 40 (vantagem após 40-40)</li>
                        <li>• Game: Primeiro a vencer 4 pontos (com 2 de diferença)</li>
                        <li>• Set: Primeiro a 6 games (com 2 de diferença) ou tiebreak 6-6</li>
                        <li>• Match: Melhor de 3 sets (primeiro a 2 vence)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
