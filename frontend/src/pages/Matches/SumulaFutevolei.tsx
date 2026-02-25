import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, RotateCcw, Trophy, Waves, AlertOctagon, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useOfflineResilience } from '../../hooks/useOfflineResilience';

export function SumulaFutevolei() {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [matchData, setMatchData] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });
    const [sets, setSets] = useState<any[]>([]);
    const [currentSet, setCurrentSet] = useState(1);
    const [score, setScore] = useState({ home: 0, away: 0 });
    const [matchFinished, setMatchFinished] = useState(false);

    const POINTS_TO_WIN = 18;
    const MIN_MARGIN = 2;
    const BEST_OF = 3;

    // 🛡️ Resilience Shield
    const { isOnline, syncing, addToQueue, registerSystemEvent, pendingCount } = useOfflineResilience(id, 'Futevôlei', async (action, data) => {
        let url = '';
        switch (action) {
            case 'event': url = `/admin/matches/${id}/events`; break;
            case 'set': url = `/admin/matches/${id}/sets`; break;
            case 'finish': url = `/admin/matches/${id}/finish`; break;
            case 'patch_match': url = `/admin/matches/${id}`; return await api.patch(url, data);
        }
        if (url) return await api.post(url, data);
    });

    const fetchMatchDetails = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const response = await api.get(`/admin/matches/${id}/full-details`);
            const data = response.data;
            if (data.match) {
                setMatchData({ ...data.match, scoreHome: parseInt(data.match.home_score || 0), scoreAway: parseInt(data.match.away_score || 0) });
                if (data.rosters) setRosters(data.rosters);
                if (data.details?.sets && data.details.sets.length > 0) setSets(data.details.sets);
                if (data.match.match_details?.sync_state) {
                    const ss = data.match.match_details.sync_state;
                    if (ss.score) setScore(ss.score);
                    if (ss.currentSet) setCurrentSet(ss.currentSet);
                }
            }
        } catch (e) { console.error(e); } finally { if (!silent) setLoading(false); }
    };

    useEffect(() => {
        if (id) {
            fetchMatchDetails();
            const syncInterval = setInterval(() => fetchMatchDetails(true), 3000);
            return () => clearInterval(syncInterval);
        }
    }, [id]);

    useEffect(() => {
        if (!id || matchFinished || loading || !matchData || !isOnline) return;
        const pingInterval = setInterval(async () => {
            try {
                await api.patch(`/admin/matches/${id}`, {
                    match_details: { ...matchData.match_details, sync_state: { score, currentSet, updated_at: Date.now() } }
                });
            } catch (e) { console.error("State sync failed", e); }
        }, 3000);
        return () => clearInterval(pingInterval);
    }, [id, score, currentSet, isOnline]);

    const addPoint = (team: 'home' | 'away') => {
        if (matchFinished) return;
        if (matchData && (matchData.status === 'scheduled' || matchData.status === 'Agendado')) {
            registerSystemEvent('match_start', 'Shark Attack autorizado! Começa o jogo!');
            setMatchData((prev: any) => ({ ...prev, status: 'live' }));
        }
        const newScore = { ...score };
        newScore[team]++;
        setScore(newScore);
        if (newScore[team] >= POINTS_TO_WIN && newScore[team] >= newScore[team === 'home' ? 'away' : 'home'] + MIN_MARGIN) {
            finishSet(newScore);
        }
        addToQueue('event', { event_type: 'point', team_id: team === 'home' ? matchData.home_team_id : matchData.away_team_id, period: `Set ${currentSet}`, value: 1 });
    };

    const removePoint = (team: 'home' | 'away') => score[team] > 0 && setScore(prev => ({ ...prev, [team]: prev[team] - 1 }));

    const finishSet = (finalScore: any) => {
        const setData = { set_number: currentSet, home_score: finalScore.home, away_score: finalScore.away };
        const newSets = [...sets, setData];
        setSets(newSets);
        const homeSetsWon = newSets.filter(s => s.home_score > s.away_score).length;
        const awaySetsWon = newSets.filter(s => s.away_score > s.home_score).length;
        setMatchData((prev: any) => ({ ...prev, scoreHome: homeSetsWon, scoreAway: awaySetsWon }));
        addToQueue('set', setData);
        const setsNeededToWin = Math.ceil(BEST_OF / 2);
        if (homeSetsWon === setsNeededToWin || awaySetsWon === setsNeededToWin) {
            setMatchFinished(true);
            alert(`🏆 Partida encerrada! ${homeSetsWon > awaySetsWon ? matchData.home_team?.name : matchData.away_team?.name} venceu!`);
            registerSystemEvent('match_end', `Show de bola! Vitória de ${homeSetsWon > awaySetsWon ? matchData.home_team?.name : matchData.away_team?.name}`);
        } else {
            setCurrentSet(currentSet + 1);
            setScore({ home: 0, away: 0 });
            registerSystemEvent('period_start', `Início do ${currentSet + 1}º Set`);
        }
    };

    const handleFinish = async () => {
        if (!window.confirm('Encerrar e salvar partida?')) return;
        addToQueue('finish', { home_score: matchData.scoreHome, away_score: matchData.scoreAway });
        registerSystemEvent('user_action', 'Finalizou partida via Futevôlei');
        navigate(-1);
    };

    if (loading || !matchData) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white"><span className="loading loading-spinner"></span></div>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-900 text-white font-sans pb-20">
            {!isOnline && (
                <div className="fixed top-0 left-0 w-full bg-red-600 text-white text-[10px] font-bold py-1 px-4 z-[9999] flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2"><AlertOctagon size={12} className="animate-pulse" /><span>SISTEMA OFFLINE</span></div>
                    <span>{pendingCount} PENDENTES</span>
                </div>
            )}
            {isOnline && pendingCount > 0 && (
                <div className="fixed top-0 left-0 w-full bg-yellow-600 text-white text-[10px] font-bold py-1 px-4 z-[9999] flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2"><RefreshCw size={12} className="animate-spin" /><span>SINCRONIZANDO...</span></div>
                    <span>{pendingCount} RESTANTES</span>
                </div>
            )}

            <div className="bg-gradient-to-r from-cyan-600 to-blue-600 pb-3 pt-4 sticky top-0 z-10 border-b border-cyan-700 shadow-2xl">
                <div className="px-4 flex items-center justify-between mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/20 rounded-full backdrop-blur"><ArrowLeft className="w-5 h-5" /></button>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2"><Waves className="w-5 h-5 text-cyan-200" /><span className="text-[11px] font-bold tracking-widest text-white">FUTEVÔLEI</span></div>
                    </div>
                    <button onClick={() => setScore({ home: 0, away: 0 })} className="p-2 bg-white/20 rounded-full backdrop-blur"><RotateCcw className="w-5 h-5" /></button>
                </div>
                <div className="px-4 mb-3">
                    <div className="flex items-center justify-center gap-4">
                        <div className="text-center flex-1">
                            <div className="text-6xl font-black text-white">{matchData.scoreHome}</div>
                            <h2 className="font-bold text-xs truncate">{matchData.home_team?.name}</h2>
                        </div>
                        <div className="text-[10px] font-bold text-white/50 uppercase">Sets</div>
                        <div className="text-center flex-1">
                            <div className="text-6xl font-black text-white">{matchData.scoreAway}</div>
                            <h2 className="font-bold text-xs truncate">{matchData.away_team?.name}</h2>
                        </div>
                    </div>
                </div>
                {!matchFinished && (
                    <div className="px-4">
                        <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20 text-center">
                            <div className="text-[10px] font-bold text-cyan-100 mb-2 uppercase">Set {currentSet}</div>
                            <div className="flex items-center justify-center gap-8 text-5xl font-black">
                                <span>{score.home}</span><span className="text-2xl text-white/30">-</span><span>{score.away}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!matchFinished && (
                <div className="p-4 grid grid-cols-2 gap-4 max-w-3xl mx-auto">
                    {[{ t: 'home', color: 'blue' }, { t: 'away', color: 'green' }].map(({ t, color }: any) => (
                        <div key={t} className="space-y-2">
                            <button onClick={() => addPoint(t)} className={`w-full py-12 bg-${color}-600 rounded-2xl font-black text-5xl border-b-8 border-${color}-900 active:scale-95 transition-all shadow-xl flex items-center justify-center`}><Plus size={48} /></button>
                            <button onClick={() => removePoint(t)} className="w-full py-3 bg-gray-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2"><Minus size={16} /> Remover</button>
                        </div>
                    ))}
                </div>
            )}

            <div className="px-4 mt-4 max-w-3xl mx-auto">
                <h3 className="text-sm font-bold uppercase mb-3 flex items-center gap-2"><Trophy size={16} /> Histórico de Sets</h3>
                <div className="space-y-2">
                    {sets.map((set, idx) => (
                        <div key={idx} className="bg-white/10 backdrop-blur p-4 rounded-xl border border-white/20 flex items-center justify-between">
                            <span className="font-bold">Set {set.set_number}</span>
                            <div className="flex items-center gap-6 font-bold text-xl">
                                <span className={set.home_score > set.away_score ? 'text-green-300' : 'text-white/40'}>{set.home_score}</span>
                                <span className="text-white/20">-</span>
                                <span className={set.away_score > set.home_score ? 'text-green-300' : 'text-white/40'}>{set.away_score}</span>
                            </div>
                        </div>
                    ))}
                </div>
                {matchFinished && <button onClick={handleFinish} className="w-full py-4 mt-6 bg-green-600 rounded-xl font-black text-xl shadow-2xl">✅ SALVAR E ENCERRAR PARTIDA</button>}
            </div>
        </div>
    );
}
