import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, RotateCcw, Trophy, Sun, AlertOctagon, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useOfflineResilience } from '../../hooks/useOfflineResilience';

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

    // 🛡️ Resilience Shield
    const { isOnline, syncing, addToQueue, registerSystemEvent, pendingCount } = useOfflineResilience(id, 'BeachTennis', async (action, data) => {
        let url = '';
        switch (action) {
            case 'event': url = `/admin/matches/${id}/events`; break;
            case 'set': url = `/admin/matches/${id}/sets`; break;
            case 'finish': url = `/admin/matches/${id}/finish`; break;
            case 'patch_match': url = `/admin/matches/${id}`; return await api.patch(url, data);
        }
        if (url) return await api.post(url, data);
    });

    const stateRef = useRef({ gameScore, gamesWon, currentSet, matchData, matchFinished });
    useEffect(() => {
        stateRef.current = { gameScore, gamesWon, currentSet, matchData, matchFinished };
    }, [gameScore, gamesWon, currentSet, matchData, matchFinished]);

    const fetchMatchDetails = async (isInitial = false) => {
        try {
            if (isInitial) setLoading(true);
            const response = await api.get(`/admin/matches/${id}/full-details`);
            const data = response.data;
            if (data.match) {
                if (isInitial) {
                    setMatchData({ ...data.match, scoreHome: parseInt(data.match.home_score || 0), scoreAway: parseInt(data.match.away_score || 0) });
                    if (data.rosters) setRosters(data.rosters);
                    if (data.details?.sets) setSets(data.details.sets);
                    if (data.match.match_details?.sync_state) {
                        const ss = data.match.match_details.sync_state;
                        if (ss.gameScore) setGameScore(ss.gameScore);
                        if (ss.gamesWon) setGamesWon(ss.gamesWon);
                        if (ss.currentSet) setCurrentSet(ss.currentSet);
                    }
                } else {
                    const ss = data.match.match_details?.sync_state;
                    if (ss && ss.updated_at > (stateRef.current.matchData?.match_details?.sync_state?.updated_at || 0)) {
                        setGameScore(ss.gameScore);
                        setGamesWon(ss.gamesWon);
                        setCurrentSet(ss.currentSet);
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (isInitial) setLoading(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        fetchMatchDetails(true);
        const interval = setInterval(() => {
            if (!pendingCount || pendingCount === 0) {
                fetchMatchDetails();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [id, pendingCount]);

    useEffect(() => {
        if (!id || !isOnline || matchFinished) return;
        const pingInterval = setInterval(async () => {
            const { gameScore: gs, gamesWon: gw, currentSet: cs, matchData: md } = stateRef.current;
            if (!md) return;
            try {
                await api.patch(`/admin/matches/${id}`, {
                    match_details: { ...md.match_details, sync_state: { gameScore: gs, gamesWon: gw, currentSet: cs, updated_at: Date.now() } }
                });
            } catch (e) { }
        }, 5000);
        return () => clearInterval(pingInterval);
    }, [id, isOnline, matchFinished]);

    const pointLabels = ['0', '15', '30', '40'];

    const addPoint = (team: 'home' | 'away') => {
        if (matchFinished) return;
        if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
            registerSystemEvent('match_start', 'Iniciado!');
            setMatchData((prev: any) => ({ ...prev, status: 'live' }));
        }

        const newScore = { ...gameScore };
        newScore[team]++;

        if (newScore[team] >= 4 && newScore[team] >= newScore[team === 'home' ? 'away' : 'home'] + 2) {
            const newGames = { ...gamesWon };
            newGames[team]++;
            setGamesWon(newGames);
            setGameScore({ home: 0, away: 0 });

            if (newGames[team] >= 6 && newGames[team] >= newGames[team === 'home' ? 'away' : 'home'] + 2) {
                finishSet(newGames);
            } else if (newGames.home === 6 && newGames.away === 6) {
                alert('Tiebreak!');
            }
        } else {
            setGameScore(newScore);
        }

        addToQueue('event', {
            event_type: 'point',
            team_id: team === 'home' ? matchData.home_team_id : matchData.away_team_id,
            period: `Set ${currentSet}`,
            metadata: { game_score: `${newScore.home}-${newScore.away}`, system_period: `Set ${currentSet}` }
        });
    };

    const finishSet = (finalGames: any) => {
        const setData = { set_number: currentSet, home_games: finalGames.home, away_games: finalGames.away };
        const newSets = [...sets, setData];
        setSets(newSets);

        const homeSetsWon = newSets.filter(s => s.home_games > s.away_games).length;
        const awaySetsWon = newSets.filter(s => s.away_games > s.home_games).length;

        setMatchData((prev: any) => ({ ...prev, scoreHome: homeSetsWon, scoreAway: awaySetsWon }));

        addToQueue('set', { set_number: currentSet, home_score: finalGames.home, away_score: finalGames.away });

        if (homeSetsWon === 2 || awaySetsWon === 2) {
            setMatchFinished(true);
            registerSystemEvent('match_end', `Vitória de ${homeSetsWon > awaySetsWon ? matchData.home_team?.name : matchData.away_team?.name}`);
        } else {
            setCurrentSet(currentSet + 1);
            setGamesWon({ home: 0, away: 0 });
            setGameScore({ home: 0, away: 0 });
            registerSystemEvent('period_start', `Início do ${currentSet + 1}º Set`);
        }
    };

    const handleFinish = async () => {
        if (!window.confirm('Encerrar partida?')) return;
        addToQueue('finish', { home_score: matchData.scoreHome, away_score: matchData.scoreAway });
        navigate(-1);
    };

    const resetGame = () => { if (window.confirm('Resetar game?')) setGameScore({ home: 0, away: 0 }); };

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner"></span></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-600 via-orange-500 to-pink-600 text-white font-sans pb-20">


            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 pb-3 pt-4 sticky top-0 z-10 border-b border-yellow-600 shadow-2xl">
                <div className="px-4 flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/20 rounded-full backdrop-blur"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="flex flex-col items-center relative">
                        {(!isOnline || pendingCount > 0) && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap">
                                {!isOnline ? (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 border border-red-500/50 rounded-full text-[8px] font-black text-red-500 animate-pulse uppercase">
                                        Offline
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-[8px] font-black text-yellow-500 uppercase">
                                        <RefreshCw size={10} className="animate-spin" /> {pendingCount}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-2"><Sun className="w-5 h-5 text-yellow-200" /><span className="text-[11px] font-bold tracking-widest text-white drop-shadow-lg uppercase">Beach Tennis</span></div>
                    </div>
                    <button onClick={resetGame} className="p-2 bg-white/20 rounded-full backdrop-blur"><RotateCcw className="w-5 h-5" /></button>
                </div>

                <div className="px-4 space-y-3 max-w-lg mx-auto">
                    <div className="flex items-center justify-center gap-4">
                        <div className="text-center flex-1"><div className="text-6xl font-black font-mono leading-none mb-1 drop-shadow-lg">{matchData.scoreHome}</div><h2 className="font-bold text-sm text-yellow-100 truncate">{matchData.home_team?.name}</h2></div>
                        <div className="text-[10px] font-bold text-white/70 uppercase tracking-tighter">Sets</div>
                        <div className="text-center flex-1"><div className="text-6xl font-black font-mono leading-none mb-1 drop-shadow-lg">{matchData.scoreAway}</div><h2 className="font-bold text-sm text-yellow-100 truncate">{matchData.away_team?.name}</h2></div>
                    </div>

                    {!matchFinished && (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/10 backdrop-blur rounded-xl p-2 border border-white/20 text-center">
                                <div className="text-[8px] font-black text-yellow-100 uppercase mb-1">Set {currentSet}</div>
                                <div className="text-2xl font-black">{gamesWon.home} - {gamesWon.away}</div>
                            </div>
                            <div className="bg-black/20 backdrop-blur rounded-xl p-2 border border-white/20 text-center">
                                <div className="text-[8px] font-black text-yellow-100 uppercase mb-1">Game</div>
                                <div className="text-2xl font-black">{pointLabels[gameScore.home] || gameScore.home} : {pointLabels[gameScore.away] || gameScore.away}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {!matchFinished && (
                <div className="p-4 grid grid-cols-2 gap-4 max-w-3xl mx-auto">
                    <button onClick={() => addPoint('home')} className="py-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl font-black text-3xl border-b-8 border-blue-900 active:scale-95 transition-all shadow-xl">PONTO<br /><span className="text-[10px]">{matchData.home_team?.name}</span></button>
                    <button onClick={() => addPoint('away')} className="py-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl font-black text-3xl border-b-8 border-green-900 active:scale-95 transition-all shadow-xl">PONTO<br /><span className="text-[10px]">{matchData.away_team?.name}</span></button>
                </div>
            )}

            <div className="px-4 mt-4 max-w-3xl mx-auto space-y-4">
                <h3 className="text-xs font-black uppercase flex items-center gap-2"><Trophy size={14} /> Histórico de Sets</h3>
                {sets.map((set, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/20 flex items-center justify-between shadow-lg">
                        <span className="font-bold text-sm text-yellow-100">Set {set.set_number}</span>
                        <div className="text-2xl font-black">{set.home_games} - {set.away_games}</div>
                    </div>
                ))}

                {matchFinished && <button onClick={handleFinish} className="w-full py-5 bg-gradient-to-r from-green-600 to-green-800 rounded-2xl font-black text-lg shadow-xl uppercase tracking-widest border-b-4 border-green-900 active:scale-95">Salvar Resultado</button>}
            </div>
        </div>
    );
}
