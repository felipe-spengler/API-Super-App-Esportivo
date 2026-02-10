import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, RotateCcw, Trophy, Circle } from 'lucide-react';
import api from '../../services/api';

export function SumulaTenisMesa() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });

    // Match State
    const [sets, setSets] = useState<any[]>([]);
    const [currentSet, setCurrentSet] = useState(1);
    const [score, setScore] = useState({ home: 0, away: 0 });
    const [matchFinished, setMatchFinished] = useState(false);
    const [server, setServer] = useState<'home' | 'away'>('home'); // Quem está sacando

    const POINTS_TO_WIN = 11; // Tênis de mesa é 11 pontos
    const MIN_MARGIN = 2;
    const BEST_OF = 5; // Melhor de 5 sets (primeiro a 3)

    const fetchMatchDetails = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
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
                }

                // Recover current state from server sync
                if (data.match.match_details?.sync_state) {
                    const ss = data.match.match_details.sync_state;
                    if (ss.score) setScore(ss.score);
                    if (ss.currentSet) setCurrentSet(ss.currentSet);
                    if (ss.server) setServer(ss.server);
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
    const STORAGE_KEY = `match_state_tenis_mesa_${id}`;

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
                    if (parsed.score) setScore(parsed.score);
                    if (parsed.matchFinished) setMatchFinished(parsed.matchFinished);
                    if (parsed.server) setServer(parsed.server);
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
            score,
            matchFinished,
            server
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [id, loading, sets, currentSet, score, matchFinished, server]);

    // PING - Sync local state TO server (Every 3 seconds)
    useEffect(() => {
        if (!id || matchFinished || loading || !matchData) return;

        const pingInterval = setInterval(async () => {
            try {
                await api.patch(`/admin/matches/${id}`, {
                    match_details: {
                        ...matchData.match_details,
                        sync_state: {
                            score,
                            currentSet,
                            server,
                            updated_at: Date.now()
                        }
                    }
                });
            } catch (e) {
                console.error("State sync failed", e);
            }
        }, 3000);

        return () => clearInterval(pingInterval);
    }, [id, score, currentSet, server]);

    // Service rotation: every 2 points
    useEffect(() => {
        const totalPoints = score.home + score.away;
        if (totalPoints > 0 && totalPoints % 2 === 0) {
            setServer(prev => prev === 'home' ? 'away' : 'home');
        }
    }, [score]);

    const addPoint = async (team: 'home' | 'away') => {
        if (matchFinished) return;

        // If match is still scheduled, try to set to live on first point
        if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
            registerSystemEvent('match_start', 'Início da Partida');
        }

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
                event_type: 'point',
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

        const homeSetsWon = newSets.filter(s => s.home_score > s.away_score).length;
        const awaySetsWon = newSets.filter(s => s.away_score > s.home_score).length;

        setMatchData((prev: any) => ({
            ...prev,
            scoreHome: homeSetsWon,
            scoreAway: awaySetsWon
        }));

        try {
            await api.post(`/admin/matches/${id}/sets`, {
                set_number: currentSet,
                home_score: finalScore.home,
                away_score: finalScore.away
            });
        } catch (e) {
            console.error(e);
        }

        const setsNeededToWin = Math.ceil(BEST_OF / 2);
        if (homeSetsWon === setsNeededToWin || awaySetsWon === setsNeededToWin) {
            setMatchFinished(true);
            alert(`🏆 Partida encerrada! ${homeSetsWon > awaySetsWon ? matchData.home_team?.name : matchData.away_team?.name} venceu!`);
        } else {
            setCurrentSet(currentSet + 1);
            setScore({ home: 0, away: 0 });
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
            navigate(-1);
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

    const resetSet = () => {
        if (window.confirm('Resetar set atual?')) {
            setScore({ home: 0, away: 0 });
        }
    };

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner loading-lg"></span></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-gray-900 to-black text-white font-sans pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-pink-600 pb-3 pt-4 sticky top-0 z-10 border-b border-red-700 shadow-2xl">
                <div className="px-4 flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-black/30 rounded-full backdrop-blur">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <Circle className="w-5 h-5 text-red-200" />
                            <span className="text-[11px] font-bold tracking-widest text-white drop-shadow-lg">TÊNIS DE MESA</span>
                        </div>
                        {matchData.details?.arbitration?.referee && <span className="text-[10px] text-red-100">{matchData.details.arbitration.referee}</span>}
                    </div>
                    <button onClick={resetSet} className="p-2 bg-black/30 rounded-full backdrop-blur hover:bg-black/40" disabled={matchFinished}>
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>

                {/* Scoreboard - Sets Won */}
                <div className="px-4 mb-3">
                    <div className="flex items-center justify-center gap-4">
                        <div className="text-center flex-1">
                            <div className="text-6xl sm:text-7xl font-black font-mono leading-none mb-1 text-red-100 drop-shadow-[0_4px_8px_rgba(255,0,0,0.3)]">{matchData.scoreHome}</div>
                            <h2 className="font-bold text-sm text-red-200 truncate max-w-[140px] mx-auto">{matchData.home_team?.name || 'Jogador 1'}</h2>
                            {server === 'home' && (
                                <div className="mt-1 text-xs text-yellow-300 font-bold animate-pulse">🏓 SACANDO</div>
                            )}
                        </div>
                        <div className="text-[10px] font-bold text-white/70 uppercase">Sets</div>
                        <div className="text-center flex-1">
                            <div className="text-6xl sm:text-7xl font-black font-mono leading-none mb-1 text-red-100 drop-shadow-[0_4px_8px_rgba(255,0,0,0.3)]">{matchData.scoreAway}</div>
                            <h2 className="font-bold text-sm text-red-200 truncate max-w-[140px] mx-auto">{matchData.away_team?.name || 'Jogador 2'}</h2>
                            {server === 'away' && (
                                <div className="mt-1 text-xs text-yellow-300 font-bold animate-pulse">🏓 SACANDO</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Current Set Score */}
                {!matchFinished && (
                    <div className="px-4">
                        <div className="bg-black/40 backdrop-blur rounded-2xl p-5 border-2 border-red-500/50 shadow-2xl">
                            <div className="text-center text-[11px] font-bold text-red-100 mb-3 uppercase tracking-wider">
                                Set {currentSet} / {BEST_OF}
                            </div>
                            <div className="flex items-center justify-center gap-8">
                                <div className={`text-7xl font-black drop-shadow-[0_4px_12px_rgba(255,255,255,0.3)] ${server === 'home' ? 'text-yellow-300' : 'text-white'}`}>
                                    {score.home}
                                </div>
                                <div className="text-2xl text-white/50">-</div>
                                <div className={`text-7xl font-black drop-shadow-[0_4px_12px_rgba(255,255,255,0.3)] ${server === 'away' ? 'text-yellow-300' : 'text-white'}`}>
                                    {score.away}
                                </div>
                            </div>
                            <div className="text-center text-[10px] text-red-200 mt-2">
                                Primeiro a {POINTS_TO_WIN} pontos (diferença de {MIN_MARGIN})
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            {!matchFinished && (
                <div className="p-4 grid grid-cols-2 gap-4 max-w-3xl mx-auto">
                    <div className="space-y-2">
                        <div className="text-center text-sm font-bold text-red-300 mb-2">{matchData.home_team?.name || 'Jogador 1'}</div>
                        <button
                            onClick={() => addPoint('home')}
                            className={`w-full py-16 rounded-3xl font-black text-6xl border-b-8 active:scale-95 transition-all shadow-2xl flex items-center justify-center ${server === 'home'
                                ? 'bg-gradient-to-br from-yellow-500 to-yellow-700 border-yellow-900 hover:from-yellow-400 hover:to-yellow-600'
                                : 'bg-gradient-to-br from-blue-600 to-blue-800 border-blue-950 hover:from-blue-500 hover:to-blue-700'
                                }`}
                        >
                            <Plus size={64} strokeWidth={3} />
                        </button>
                        <button
                            onClick={() => removePoint('home')}
                            className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-sm border-b-4 border-gray-950 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Minus size={16} /> Remover
                        </button>
                    </div>

                    <div className="space-y-2">
                        <div className="text-center text-sm font-bold text-red-300 mb-2">{matchData.away_team?.name || 'Jogador 2'}</div>
                        <button
                            onClick={() => addPoint('away')}
                            className={`w-full py-16 rounded-3xl font-black text-6xl border-b-8 active:scale-95 transition-all shadow-2xl flex items-center justify-center ${server === 'away'
                                ? 'bg-gradient-to-br from-yellow-500 to-yellow-700 border-yellow-900 hover:from-yellow-400 hover:to-yellow-600'
                                : 'bg-gradient-to-br from-green-600 to-green-800 border-green-950 hover:from-green-500 hover:to-green-700'
                                }`}
                        >
                            <Plus size={64} strokeWidth={3} />
                        </button>
                        <button
                            onClick={() => removePoint('away')}
                            className="w-full py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-sm border-b-4 border-gray-950 active:scale-95 transition-all flex items-center justify-center gap-2"
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
                        <div key={idx} className="bg-black/30 backdrop-blur p-4 rounded-xl border border-red-500/30 flex items-center justify-between">
                            <span className="font-bold text-lg text-red-100">Set {set.set_number}</span>
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
                <div className="bg-black/30 backdrop-blur rounded-xl p-4 border border-red-500/30">
                    <h4 className="font-bold text-xs text-red-200 mb-2 uppercase">🏓 Regras do Tênis de Mesa</h4>
                    <ul className="text-[11px] text-white/80 space-y-1">
                        <li>• Set: Primeiro a {POINTS_TO_WIN} pontos (com {MIN_MARGIN} de diferença)</li>
                        <li>• Match: Melhor de {BEST_OF} sets (primeiro a 3 vence)</li>
                        <li>• Saque: Alterna a cada 2 pontos</li>
                        <li>• Após 10-10: Saque alterna a cada ponto</li>
                        <li>• Jogador com saque destacado em amarelo</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
