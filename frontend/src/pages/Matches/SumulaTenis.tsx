import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, RotateCcw, Trophy, Activity, X, Wifi, WifiOff } from 'lucide-react';
import api from '../../services/api';
import { useOfflineResilience } from '../../hooks/useOfflineResilience';
import { useCallback } from 'react';

export function SumulaTenis() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });

    // Match State
    const [sets, setSets] = useState<any[]>([]);
    const [currentSet, setCurrentSet] = useState(1);
    const [gameScore, setGameScore] = useState({ home: 0, away: 0 }); // Pontos no game atual (0, 1, 2, 3...)
    const [gamesWon, setGamesWon] = useState({ home: 0, away: 0 }); // Games vencidos no set atual
    const [matchFinished, setMatchFinished] = useState(false);
    const [isQuickMode, setIsQuickMode] = useState(false); // Alterna entre marcar pontos ou games direto
    const [events, setEvents] = useState<any[]>([]);

    // 🛡️ Offline Resilience
    const { isOnline, addToQueue, pendingCount } = useOfflineResilience(id, 'Tenis', async (action, data) => {
        let url = '';
        switch (action) {
            case 'event': url = `/admin/matches/${id}/events`; break;
            case 'sets': url = `/admin/matches/${id}/sets`; break;
            case 'finish': url = `/admin/matches/${id}/finish`; break;
            case 'patch_match': return await api.patch(`/admin/matches/${id}`, data);
        }
        if (url) return await api.post(url, data);
    });

    // Helper: tenta chamada direta; se falhar offline, enfileira
    const apiPost = useCallback(async (action: 'event' | 'sets' | 'finish' | 'patch_match', data: any) => {
        if (isOnline) {
            try {
                const url = action === 'event' ? `/admin/matches/${id}/events`
                    : action === 'sets' ? `/admin/matches/${id}/sets`
                        : action === 'finish' ? `/admin/matches/${id}/finish` : '';

                if (action === 'patch_match') return await api.patch(`/admin/matches/${id}`, data);
                return await api.post(url, data);
            } catch (e: any) {
                if (!e.response) { addToQueue(action, data); return null; }
                throw e;
            }
        } else {
            addToQueue(action, data);
            return null;
        }
    }, [isOnline, id, addToQueue]);

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

                if (data.details?.events) {
                    const sortedEvents = [...data.details.events].sort((a, b) => b.id - a.id);
                    setEvents(sortedEvents);
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
    const STORAGE_KEY = `match_state_tenis_${id}`;

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
                await apiPost('patch_match', {
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

    // Scoring system: 0, 15, 30, 40, Game
    const isTiebreak = gamesWon.home === 6 && gamesWon.away === 6;
    const pointLabels = isTiebreak ? [] : ['0', '15', '30', '40', 'Vant.'];

    const addGame = async (team: 'home' | 'away') => {
        if (matchFinished) return;

        // If match is still scheduled, try to set to live on first action
        if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
            registerSystemEvent('match_start', 'Início da partida! Placar aberto!');
        }

        const newGames = { ...gamesWon };
        const opponent = team === 'home' ? 'away' : 'home';
        newGames[team]++;

        setGamesWon(newGames);
        setGameScore({ home: 0, away: 0 }); // Limpa pontos se ganhar o game direto

        // Save game event
        try {
            const resp = await apiPost('event', {
                event_type: 'game_won',
                team_id: team === 'home' ? matchData.home_team_id : matchData.away_team_id,
                minute: '00:00',
                period: `Set ${currentSet}`,
                metadata: {
                    result: `${newGames.home}-${newGames.away}`,
                    system_period: `Set ${currentSet}`
                }
            });
            setEvents(prev => [{
                id: resp?.data?.event?.id || resp?.data?.id || Date.now(),
                type: 'game_won',
                team_id: team === 'home' ? matchData.home_team_id : matchData.away_team_id,
                period: `Set ${currentSet}`,
                minute: '00:00',
                metadata: { result: `${newGames.home}-${newGames.away}` }
            }, ...prev]);
        } catch (e) {
            console.error(e);
        }

        // Check if set won
        if (newGames[team] >= 6 && newGames[team] >= newGames[opponent] + 2) {
            await finishSet(newGames);
        } else if (newGames[team] === 7) {
            await finishSet(newGames);
        }
    };

    const addPoint = async (team: 'home' | 'away') => {
        if (matchFinished) return;

        // If match is still scheduled, try to set to live on first point
        if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
            registerSystemEvent('match_start', 'Saque inicial! Começa o duelo!');
        }

        const newScore = { ...gameScore };
        const opponent = team === 'home' ? 'away' : 'home';

        newScore[team]++;

        // Logic for Deuce (40-40)
        // 0=0, 1=15, 2=30, 3=40
        // If both are 3 (40-40)
        // If one reaches 4, they get "Vantagem" if opponent is at 3.
        // If one is at 4 and other is at 4, it goes back to 3-3 (Deuce).
        // If one reaches 4 and other is <= 2, Game won.

        let gameWon = false;

        if (isTiebreak) {
            // Tiebreak logic: First to 7, lead by 2
            if (newScore[team] >= 7 && newScore[team] >= newScore[opponent] + 2) {
                gameWon = true;
            }
        } else {
            // Standard game logic (0, 15, 30, 40, Vant)
            if (newScore[team] >= 4) {
                if (newScore[team] >= newScore[opponent] + 2) {
                    gameWon = true;
                } else if (newScore[team] === 4 && newScore[opponent] === 4) {
                    // Both reached 4 (V-V), back to deuce (3-3)
                    newScore.home = 3;
                    newScore.away = 3;
                }
            }
        }

        if (gameWon) {
            // Game won
            const newGames = { ...gamesWon };
            newGames[team]++;
            setGamesWon(newGames);
            setGameScore({ home: 0, away: 0 });

            // Check if set won
            // Standard: 6 games with lead of 2, OR reaching 7 in any case (7-5 or 7-6 tiebreak)
            if (newGames[team] >= 6 && newGames[team] >= newGames[opponent] + 2) {
                await finishSet(newGames);
            } else if (newGames[team] === 7) {
                // Won 7-5 or 7-6
                await finishSet(newGames);
            } else if (newGames.home === 6 && newGames.away === 6) {
                registerSystemEvent('period_start', 'Início do Tie-break!');
            }
        } else {
            setGameScore(newScore);
        }

        // Save point event
        try {
            const resp = await apiPost('event', {
                event_type: 'point',
                team_id: team === 'home' ? matchData.home_team_id : matchData.away_team_id,
                minute: '00:00',
                period: `Set ${currentSet}`,
                metadata: {
                    game_score: `${newScore.home}-${newScore.away}`,
                    system_period: `Set ${currentSet}`
                }
            });

            setEvents(prev => [{
                id: resp?.data?.event?.id || resp?.data?.id || Date.now(),
                type: 'point',
                team_id: team === 'home' ? matchData.home_team_id : matchData.away_team_id,
                period: `Set ${currentSet}`,
                minute: '00:00',
                metadata: { game_score: `${newScore.home}-${newScore.away}` }
            }, ...prev]);
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
            await apiPost('sets', {
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
            registerSystemEvent('match_end', `Game, Set and Match! Vitória de ${homeSetsWon > awaySetsWon ? matchData.home_team?.name : matchData.away_team?.name}`);
        } else {
            // Start new set
            setCurrentSet(currentSet + 1);
            setGamesWon({ home: 0, away: 0 });
            setGameScore({ home: 0, away: 0 });
            registerSystemEvent('period_start', `Início do ${currentSet + 1}º Set`);
        }
    };

    const handleFinish = async () => {
        if (!window.confirm('Encerrar e salvar partida?')) return;
        try {
            await registerSystemEvent('match_end', 'Partida Finalizada. Que jogo!');

            await apiPost('finish', {
                home_score: matchData.scoreHome,
                away_score: matchData.scoreAway
            });

            localStorage.removeItem(STORAGE_KEY);
            navigate(-1);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteEvent = async (eventId: number) => {
        const eventToDelete = events.find(e => e.id === eventId);
        if (!eventToDelete) return;

        if (!window.confirm('Excluir este lançamento e reverter o placar?')) return;

        try {
            await api.delete(`/admin/matches/${id}/events/${eventId}`);

            // Se o evento deletado for um que finalizou o set, precisamos deletar o set também
            // (Assumindo que deletar o evento que fecha o jogo/set deve reverter o estado)
            const isSetFinisher = events.indexOf(eventToDelete) === 0 && sets.length > 0;
            // No tênis, um point ou game_won pode fechar um set.

            // Recalcular estado local é arriscado só decrementando, então vamos recarregar tudo do zero
            // Mas primeiro, se deletou um fim de set, deleta o registro do set no backend
            if (eventToDelete.metadata?.is_set_finisher || (eventToDelete.type === 'game_won' && sets.some(s => s.set_number === currentSet))) {
                // Tenta achar o set e deletar
                const lastSet = sets[sets.length - 1];
                if (lastSet) {
                    await api.delete(`/admin/matches/${id}/sets/${lastSet.id}`);
                }
            }

            // Recarrega tudo do backend para garantir consistência
            fetchMatchDetails();
            // Limpa estados locais que não vem do sync se necessário
            if (sets.length > 0) setSets(sets.filter((_, i) => i !== sets.length - 1));

        } catch (e) {
            console.error(e);
            alert('Erro ao excluir evento');
        }
    };

    const registerSystemEvent = async (type: string, label: string) => {
        if (!matchData) return;
        try {
            await apiPost('event', {
                event_type: type,
                team_id: matchData.home_team_id || matchData.away_team_id,
                minute: '00:00',
                period: `Set ${currentSet}`,
                metadata: {
                    label,
                    system_period: `Set ${currentSet}`
                }
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
        <div className="min-h-screen bg-gradient-to-br from-green-800 via-emerald-700 to-lime-600 text-white font-sans pb-20">
            {/* Header */}
            <div className="bg-black/20 pb-3 pt-4 sticky top-0 z-10 border-b border-white/10 backdrop-blur-md shadow-2xl">
                <div className="px-4 flex items-center justify-between mb-2">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full backdrop-blur">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-lime-400" />
                            <span className="text-[11px] font-bold tracking-widest text-white drop-shadow-lg uppercase">Súmula Tênis</span>
                        </div>
                        {matchData.details?.arbitration?.referee && <span className="text-[10px] text-green-100">{matchData.details.arbitration.referee}</span>}
                    </div>
                    <button onClick={resetGame} className="p-2 bg-white/10 rounded-full backdrop-blur hover:bg-white/20">
                        <RotateCcw className="w-5 h-5" />
                    </button>
                </div>

                {/* ── OFFLINE BANNER ── */}
                {(!isOnline || pendingCount > 0) && (
                    <div className={`mx-4 mb-3 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-bold border ${!isOnline ? 'bg-orange-950/80 border-orange-500/50 text-orange-200' : 'bg-blue-950/80 border-blue-500/50 text-blue-200'
                        }`}>
                        {!isOnline ? <WifiOff size={12} /> : <Wifi size={12} />}
                        {!isOnline ? `Offline — ${pendingCount} evento(s) aguardando` : `Sincronizando ${pendingCount} evento(s)...`}
                    </div>
                )}

                {/* Scoreboard */}
                <div className="px-4 space-y-3">
                    {/* Sets Won */}
                    <div className="flex items-center justify-center gap-4">
                        <div className="text-center flex-1 min-w-0">
                            <div className="text-6xl font-black font-mono leading-none mb-1 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">{matchData.scoreHome}</div>
                            <h2 className="font-bold text-sm text-green-100 truncate w-full px-2" title={matchData.home_team?.name}>
                                {matchData.home_team?.name || 'Jogador 1'}
                            </h2>
                        </div>
                        <div className="flex flex-col items-center shrink-0">
                            <span className="text-[10px] font-bold text-white/50 uppercase">Sets</span>
                            <div className="h-px w-8 bg-white/20 my-1"></div>
                        </div>
                        <div className="text-center flex-1 min-w-0">
                            <div className="text-6xl font-black font-mono leading-none mb-1 text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">{matchData.scoreAway}</div>
                            <h2 className="font-bold text-sm text-green-100 truncate w-full px-2" title={matchData.away_team?.name}>
                                {matchData.away_team?.name || 'Jogador 2'}
                            </h2>
                        </div>
                    </div>

                    {/* Current Set / Games */}
                    {!matchFinished && (
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10 shadow-lg">
                            <div className="text-center text-[10px] font-black text-lime-400 mb-2 uppercase tracking-widest">Set {currentSet} - Placar de Games</div>
                            <div className="flex items-center justify-center gap-6">
                                <div className="text-4xl font-black text-white">{gamesWon.home}</div>
                                <div className="text-xl text-white/30 font-light">vs</div>
                                <div className="text-4xl font-black text-white">{gamesWon.away}</div>
                            </div>
                        </div>
                    )}

                    {/* Current Game Score */}
                    {!matchFinished && (
                        <div className="bg-black/30 backdrop-blur rounded-2xl p-4 border border-lime-500/30 shadow-inner">
                            <div className="text-center text-[10px] font-black text-white/40 mb-3 uppercase tracking-tighter">
                                {isTiebreak ? '🔥 PONTOS DO TIE-BREAK 🔥' : 'Pontuação do Game'}
                            </div>
                            <div className="flex items-center justify-center gap-10">
                                <div className="flex flex-col items-center">
                                    <div className="text-5xl font-black text-white drop-shadow-lg font-mono">
                                        {isTiebreak ? gameScore.home : (pointLabels[gameScore.home] || gameScore.home)}
                                    </div>
                                </div>
                                <div className="text-2xl text-lime-500/50 font-black">:</div>
                                <div className="flex flex-col items-center">
                                    <div className="text-5xl font-black text-white drop-shadow-lg font-mono">
                                        {isTiebreak ? gameScore.away : (pointLabels[gameScore.away] || gameScore.away)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Action Selection Toggle */}
            <div className="px-4 mt-6 max-w-3xl mx-auto flex justify-center">
                <div className="bg-white/10 p-1 rounded-xl border border-white/20 flex gap-1">
                    <button
                        onClick={() => setIsQuickMode(false)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${!isQuickMode ? 'bg-lime-500 text-black' : 'text-white/60 hover:text-white'}`}
                    >
                        Ponto a Ponto
                    </button>
                    <button
                        onClick={() => setIsQuickMode(true)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${isQuickMode ? 'bg-lime-500 text-black' : 'text-white/60 hover:text-white'}`}
                    >
                        Marcar Games Direto
                    </button>
                </div>
            </div>

            {/* Action Buttons */}
            {!matchFinished && (
                <div className="p-4 grid grid-cols-2 gap-4 max-w-3xl mx-auto">
                    {isQuickMode ? (
                        <>
                            <button
                                onClick={() => addGame('home')}
                                className="py-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl font-black text-2xl border-b-8 border-blue-950 active:scale-95 transition-all shadow-2xl hover:from-blue-500 hover:to-blue-700 flex flex-col items-center justify-center gap-2 overflow-hidden px-2"
                            >
                                <span className="bg-white/20 px-3 py-1 rounded-full text-xs uppercase tracking-widest text-white shrink-0">+ Game</span>
                                <div className="text-center w-full leading-tight truncate text-sm uppercase px-1">
                                    {matchData.home_team?.name || 'Jogador 1'}
                                </div>
                            </button>
                            <button
                                onClick={() => addGame('away')}
                                className="py-16 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl font-black text-2xl border-b-8 border-indigo-950 active:scale-95 transition-all shadow-2xl hover:from-indigo-500 hover:to-indigo-700 flex flex-col items-center justify-center gap-2 overflow-hidden px-2"
                            >
                                <span className="bg-white/20 px-3 py-1 rounded-full text-xs uppercase tracking-widest text-white shrink-0">+ Game</span>
                                <div className="text-center w-full leading-tight truncate text-sm uppercase px-1">
                                    {matchData.away_team?.name || 'Jogador 2'}
                                </div>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => addPoint('home')}
                                className="py-12 bg-gradient-to-br from-green-600 to-green-800 rounded-3xl font-black text-2xl border-b-8 border-green-950 active:scale-95 transition-all shadow-2xl hover:from-green-500 hover:to-green-700 flex flex-col items-center justify-center gap-2 overflow-hidden px-2"
                            >
                                <span className="bg-white/20 px-3 py-1 rounded-full text-xs uppercase tracking-widest text-white shrink-0">+ Ponto</span>
                                <div className="text-center w-full leading-tight truncate text-sm uppercase px-1">
                                    {matchData.home_team?.name || 'Jogador 1'}
                                </div>
                            </button>
                            <button
                                onClick={() => addPoint('away')}
                                className="py-12 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl font-black text-2xl border-b-8 border-emerald-950 active:scale-95 transition-all shadow-2xl hover:from-emerald-500 hover:to-emerald-700 flex flex-col items-center justify-center gap-2 overflow-hidden px-2"
                            >
                                <span className="bg-white/20 px-3 py-1 rounded-full text-xs uppercase tracking-widest text-white shrink-0">+ Ponto</span>
                                <div className="text-center w-full leading-tight truncate text-sm uppercase px-1">
                                    {matchData.away_team?.name || 'Jogador 2'}
                                </div>
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Event Log / Undo Section */}
            <div className="px-4 mt-8 max-w-3xl mx-auto">
                <h3 className="text-xs font-black text-white/50 uppercase mb-4 flex items-center gap-2 tracking-[0.2em]">
                    <Activity size={14} /> Histórico de Lançamentos
                </h3>
                <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                    {events.slice(0, 5).map((ev, i) => (
                        <div key={ev.id} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${ev.team_id === matchData.home_team_id ? 'bg-blue-600' : 'bg-green-600'}`}>
                                    {ev.team_id === matchData.home_team_id ? matchData.home_team?.name?.substring(0, 2).toUpperCase() : matchData.away_team?.name?.substring(0, 2).toUpperCase()}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold uppercase">{ev.type === 'point' ? 'Ponto' : ev.type === 'game_won' ? 'Game' : ev.type}</span>
                                    <span className="text-[10px] text-white/40">{ev.period}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDeleteEvent(ev.id)}
                                className="p-2 text-white/20 hover:text-red-400 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                    {events.length === 0 && (
                        <div className="p-8 text-center text-white/20 text-xs font-bold uppercase tracking-widest">
                            Sem lançamentos recentes
                        </div>
                    )}
                </div>
            </div>

            {/* Sets History */}
            <div className="px-4 mt-4 max-w-3xl mx-auto">
                <h3 className="text-xs font-black text-white/50 uppercase mb-4 flex items-center gap-2 tracking-[0.2em]">
                    <Trophy size={14} /> Histórico de Sets
                </h3>
                <div className="grid grid-cols-1 gap-3">
                    {sets.map((set, idx) => (
                        <div key={idx} className="bg-black/20 backdrop-blur p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-black/30 transition-colors">
                            <span className="font-black text-lg text-lime-400">SET {set.set_number}</span>
                            <div className="flex items-center gap-8">
                                <div className="flex flex-col items-center">
                                    <span className={`text-3xl font-black ${set.home_games > set.away_games ? 'text-white' : 'text-white/20'}`}>
                                        {set.home_games}
                                    </span>
                                </div>
                                <span className="text-white/10 font-light text-2xl">|</span>
                                <div className="flex flex-col items-center">
                                    <span className={`text-3xl font-black ${set.away_games > set.home_games ? 'text-white' : 'text-white/20'}`}>
                                        {set.away_games}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {sets.length === 0 && (
                        <div className="text-center py-10 bg-black/10 rounded-3xl border border-dashed border-white/10">
                            <p className="text-sm font-bold text-white/20 uppercase tracking-widest">Aguardando fim do set 1</p>
                        </div>
                    )}
                </div>

                {matchFinished && (
                    <div className="mt-8">
                        <button onClick={handleFinish} className="w-full py-5 bg-gradient-to-r from-lime-500 to-green-600 text-white font-black text-xl rounded-2xl border-b-4 border-green-800 active:scale-95 transition-all shadow-[0_10px_40px_rgba(101,163,13,0.3)]">
                            SALVAR RESULTADO FINAL
                        </button>
                    </div>
                )}
            </div>

            {/* Tennis Rules Hint */}
            <div className="px-4 mt-8 max-w-3xl mx-auto mb-10">
                <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                    <h4 className="font-black text-xs text-lime-300 mb-3 uppercase tracking-wider">ℹ️ Sistema de Pontuação</h4>
                    <div className="grid grid-cols-2 gap-4 text-[10px] text-white/50 font-bold uppercase">
                        <div>
                            <p className="text-white mb-1">Pontos do Game</p>
                            <p>0, 15, 30, 40, Vantagem</p>
                        </div>
                        <div>
                            <p className="text-white mb-1">Formato do Set</p>
                            <p>Melhor de 6 games (margem 2)</p>
                        </div>
                        <div className="col-span-2 pt-2 border-t border-white/5">
                            <p className="text-white mb-1">Formato da Partida</p>
                            <p>Melhor de 3 sets (vence quem fizer 2)</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
