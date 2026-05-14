import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Timer, ArrowLeft, Play, Square, Save, RotateCcw, User, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import echo from '../../services/echo';

export function AdminChampionshipTimes() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [times, setTimes] = useState<any[]>([]);
    const [participants, setParticipants] = useState<any[]>([]);
    const [championship, setChampionship] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Stopwatch state
    const [showStopwatch, setShowStopwatch] = useState(false);
    const [selectedParticipant, setSelectedParticipant] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [timeMs, setTimeMs] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Lap state
    const [currentLap, setCurrentLap] = useState(1);

    // Global Countdown State
    const [showCountdown, setShowCountdown] = useState(false);
    const [countdownMinutesInput, setCountdownMinutesInput] = useState(12);
    const [countdownTimeLeft, setCountdownTimeLeft] = useState(12 * 60); // in seconds
    const [isCountdownRunning, setIsCountdownRunning] = useState(false);
    const [isCountdownFinished, setIsCountdownFinished] = useState(false);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Bulk Lap/Distance Input State (userId -> laps)
    const [bulkLaps, setBulkLaps] = useState<Record<string, number>>({});

    useEffect(() => {
        loadData();

        if (id) {
            const channelName = `championship.${id}`;
            const channel = echo.channel(channelName);
            channel.listen('ChampionshipTimesUpdated', () => {
                loadData(false); // reload without global loader
            });

            return () => {
                echo.leave(channelName);
            };
        }
    }, [id]);

    async function loadData(showLoader = true) {
        try {
            if (showLoader) setLoading(true);
            const [timesRes, participantsRes, champRes] = await Promise.all([
                api.get(`/admin/championships/${id}/times`),
                api.get(`/championships/${id}/participants`), // Assume this exists or we can use another route
                api.get(`/championships/${id}`)
            ]);
            setTimes(timesRes.data);
            setParticipants(participantsRes.data || []);
            setChampionship(champRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const isLapsFormat = championship?.format === 'laps';

    const startTimer = () => {
        if (!selectedParticipant) {
            alert('Selecione um competidor primeiro!');
            return;
        }
        setIsRunning(true);
        const startTime = Date.now() - timeMs;
        timerRef.current = setInterval(() => {
            setTimeMs(Date.now() - startTime);
        }, 10);
    };

    const stopTimer = () => {
        setIsRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const resetTimer = () => {
        setIsRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeMs(0);
        setCurrentLap(1);
    };

    const saveTime = async () => {
        if (!selectedParticipant) return;
        try {
            const participant = participants.find(p => p.user_id.toString() === selectedParticipant);
            await api.post(`/admin/championships/${id}/times`, {
                user_id: participant?.user_id,
                team_id: participant?.team_id,
                category_id: participant?.category_id,
                time_ms: timeMs,
                lap: currentLap,
                status: 'completed'
            });
            setShowStopwatch(false);
            resetTimer();
            setSelectedParticipant('');
            loadData();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar tempo.');
        }
    };

    const recordLap = async () => {
        if (!selectedParticipant) return;
        try {
            const participant = participants.find(p => p.user_id.toString() === selectedParticipant);
            await api.post(`/admin/championships/${id}/times`, {
                user_id: participant?.user_id,
                team_id: participant?.team_id,
                category_id: participant?.category_id,
                time_ms: timeMs,
                lap: currentLap,
                status: 'completed'
            });
            setCurrentLap(prev => prev + 1);
            // We do NOT reset the timer if it's running, so the next lap is accumulated
            // Actually, if it's LAPS format, usually "Lap" resets the timer for the NEXT lap, OR it's continuous.
            // Let's just record the current total time and increment the lap counter.
            alert(`Volta ${currentLap} salva com sucesso! O cronômetro continua rodando.`);
            loadData();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar volta.');
        }
    };

    const deleteTime = async (timeId: number) => {
        if (confirm('Deseja excluir este tempo?')) {
            try {
                await api.delete(`/admin/championships/${id}/times/${timeId}`);
                loadData();
            } catch (err) {
                alert('Erro ao excluir');
            }
        }
    };

    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    };

    // UI State for Manual Time
    const [showManualTime, setShowManualTime] = useState(false);
    const [manualTimeStr, setManualTimeStr] = useState('');
    const [manualLap, setManualLap] = useState(1);
    
    // Computed Teams
    const isTeam = participants.some(p => p.team_id !== null);
    const teams = isTeam ? Array.from(new Set(participants.map(p => p.team_id))).map(tid => {
        const p = participants.find(x => x.team_id === tid);
        return { id: tid, name: p?.team?.name || 'Equipe' };
    }) : [];

    const [selectedTeam, setSelectedTeam] = useState('');

    const availableParticipants = isTeam 
        ? participants.filter(p => p.team_id?.toString() === selectedTeam)
        : participants;

    // Helper to parse HH:MM:SS or MM:SS to milliseconds
    const parseTimeToMs = (timeStr: string) => {
        const parts = timeStr.split(':').map(Number);
        let ms = 0;
        if (parts.length === 3) {
            ms = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        } else if (parts.length === 2) {
            ms = (parts[0] * 60 + parts[1]) * 1000;
        } else if (parts.length === 1) {
            ms = parts[0] * 1000;
        }
        return ms;
    };

    const startCountdown = () => {
        if (countdownTimeLeft <= 0) {
            setCountdownTimeLeft(countdownMinutesInput * 60);
        }
        setIsCountdownRunning(true);
        setIsCountdownFinished(false);
        countdownIntervalRef.current = setInterval(() => {
            setCountdownTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(countdownIntervalRef.current!);
                    setIsCountdownRunning(false);
                    setIsCountdownFinished(true);
                    playBeep();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const pauseCountdown = () => {
        setIsCountdownRunning(false);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };

    const resetCountdown = () => {
        setIsCountdownRunning(false);
        setIsCountdownFinished(false);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setCountdownTimeLeft(countdownMinutesInput * 60);
        setBulkLaps({});
    };

    const playBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 1.5);
        } catch (e) {
            console.error("Audio beep failed", e);
        }
    };

    const formatCountdown = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const saveBulkResults = async () => {
        setLoading(true);
        try {
            const entries = Object.entries(bulkLaps).filter(([_, laps]) => laps > 0);
            
            const promises = entries.map(([userId, laps]) => {
                const participant = participants.find(p => p.user_id.toString() === userId);
                return api.post(`/admin/championships/${id}/times`, {
                    user_id: participant?.user_id,
                    team_id: participant?.team_id,
                    category_id: participant?.category_id,
                    time_ms: countdownMinutesInput * 60 * 1000,
                    lap: laps,
                    status: 'completed'
                });
            });

            await Promise.all(promises);
            
            alert('Todos os resultados foram salvos com sucesso!');
            setShowCountdown(false);
            resetCountdown();
            loadData();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar resultados em lote.');
        } finally {
            setLoading(false);
        }
    };

    const addOneLap = async (userId: string) => {
        try {
            const participant = participants.find(p => p.user_id.toString() === userId);
            const userTimes = times.filter(t => t.user_id?.toString() === userId);
            const nextLap = userTimes.length + 1;
            
            const elapsedMs = ((countdownMinutesInput * 60) - countdownTimeLeft) * 1000;

            await api.post(`/admin/championships/${id}/times`, {
                user_id: participant?.user_id,
                team_id: participant?.team_id,
                category_id: participant?.category_id,
                time_ms: elapsedMs,
                lap: nextLap,
                status: 'completed'
            });
            // Reverb vai atualizar a tela para todos
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar volta.');
        }
    };

    const saveManualTime = async () => {
        if (!selectedParticipant) {
            alert('Selecione um competidor.');
            return;
        }
        const ms = parseTimeToMs(manualTimeStr);
        if (ms <= 0) {
            alert('Digite um tempo válido (ex: 01:23:45 ou 15:30).');
            return;
        }
        
        try {
            const participant = participants.find(p => p.user_id.toString() === selectedParticipant);
            await api.post(`/admin/championships/${id}/times`, {
                user_id: participant?.user_id,
                team_id: participant?.team_id,
                category_id: participant?.category_id,
                time_ms: ms,
                lap: isLapsFormat ? manualLap : 1,
                status: 'completed'
            });
            setShowManualTime(false);
            setManualTimeStr('');
            setSelectedParticipant('');
            setManualLap(1);
            loadData();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar tempo.');
        }
    };

    const SelectorUI = () => (
        <div className="space-y-4 mb-8">
            {isTeam && (
                <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Equipe</label>
                    <select 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={selectedTeam}
                        onChange={e => { setSelectedTeam(e.target.value); setSelectedParticipant(''); }}
                        disabled={isRunning}
                    >
                        <option value="">Selecione a equipe...</option>
                        {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>
            )}
            <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Competidor</label>
                <select 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                    value={selectedParticipant}
                    onChange={e => setSelectedParticipant(e.target.value)}
                    disabled={isRunning || (isTeam && !selectedTeam)}
                >
                    <option value="">Selecione quem vai competir...</option>
                    {availableParticipants.map(p => (
                        <option key={p.user_id} value={p.user_id}>
                            {p.name} {p.bib_number ? `(Peito: ${p.bib_number})` : ''}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );

    return (
        <div className="bg-slate-50 min-h-screen pb-20">
            <div className="bg-white border-b border-slate-200 px-6 py-6 mb-8">
                <div className="max-w-4xl mx-auto">
                    <button onClick={() => navigate(`/admin/championships/${id}`)} className="flex items-center text-slate-400 hover:text-slate-900 mb-4 transition-colors text-sm font-bold">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Voltar para o Campeonato
                    </button>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                                <Timer size={28} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 leading-tight">Cronômetro / Tempos</h1>
                                <p className="text-slate-500 font-medium">Registre o tempo de cada atleta em tempo real.</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowManualTime(true)}
                                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm"
                            >
                                Definir Manual
                            </button>
                            <button
                                onClick={() => setShowStopwatch(true)}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                            >
                                <Play size={18} />
                                Cronometrar
                            </button>
                            {isLapsFormat && (
                                <button
                                    onClick={() => { resetCountdown(); setShowCountdown(true); }}
                                    className="flex items-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all"
                                >
                                    <Timer size={18} />
                                    Temporizador Fixo
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="font-bold text-slate-700">Tempos Registrados</h2>
                    </div>
                    {loading ? (
                        <div className="p-12 text-center text-slate-400 font-bold italic">Carregando...</div>
                    ) : times.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-bold">Nenhum tempo registrado ainda.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase font-black">
                                <tr>
                                    <th className="px-6 py-4">Atleta / Equipe</th>
                                    {isLapsFormat && <th className="px-6 py-4 text-center">Volta</th>}
                                    <th className="px-6 py-4">Tempo</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {times.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-900">{t.user?.name || 'Desconhecido'}</p>
                                            {t.team && <p className="text-xs text-indigo-600 font-bold uppercase">{t.team.name}</p>}
                                        </td>
                                        {isLapsFormat && (
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-amber-100 text-amber-800 font-black px-3 py-1 rounded-full text-sm">
                                                    #{t.lap || 1}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 font-mono font-black text-slate-700 text-lg">
                                            {formatTime(t.time_ms)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold uppercase flex items-center gap-1 w-max">
                                                <CheckCircle2 size={12} /> OK
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => deleteTime(t.id)} className="text-red-500 hover:text-red-700 text-sm font-bold underline">Remover</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Stopwatch Modal */}
            {showStopwatch && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Timer className="text-indigo-600" />
                                Cronômetro Real-time
                            </h2>
                            <button onClick={() => { stopTimer(); setShowStopwatch(false); }} className="text-slate-400 hover:text-slate-600 font-bold">FECHAR</button>
                        </div>
                        
                        <div className="p-8">
                            <SelectorUI />

                            <div className="text-center mb-10">
                                <div className="font-mono text-7xl font-black text-slate-900 tracking-tighter tabular-nums mb-2">
                                    {formatTime(timeMs)}
                                </div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
                                    {isLapsFormat ? `Volta Atual: ${currentLap}` : 'Minutos : Segundos . Milésimos'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {!isRunning ? (
                                    <button 
                                        onClick={startTimer}
                                        disabled={!selectedParticipant}
                                        className="flex items-center justify-center gap-2 bg-emerald-500 text-white p-4 rounded-2xl font-black text-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                    >
                                        <Play size={24} /> INICIAR
                                    </button>
                                ) : (
                                    <button 
                                        onClick={stopTimer}
                                        className="flex items-center justify-center gap-2 bg-rose-500 text-white p-4 rounded-2xl font-black text-lg hover:bg-rose-600 transition-colors shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                                    >
                                        <Square size={24} /> PARAR
                                    </button>
                                )}
                                <button 
                                    onClick={resetTimer}
                                    disabled={timeMs === 0 || isRunning}
                                    className="flex items-center justify-center gap-2 bg-slate-100 text-slate-600 p-4 rounded-2xl font-black text-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                                >
                                    <RotateCcw size={24} /> ZERAR
                                </button>
                            </div>
                            
                            {isLapsFormat && isRunning && (
                                <button 
                                    onClick={recordLap}
                                    className="w-full mt-4 flex items-center justify-center gap-2 bg-amber-500 text-white p-4 rounded-2xl font-black text-lg hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200"
                                >
                                    <Save size={24} /> MARCAR VOLTA {currentLap}
                                </button>
                            )}

                            {timeMs > 0 && !isRunning && (
                                <button 
                                    onClick={saveTime}
                                    className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 text-white p-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                                >
                                    <Save size={24} /> SALVAR TEMPO FINAL
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Time Modal */}
            {showManualTime && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <Timer className="text-indigo-600" />
                                Definir Tempo Manual
                            </h2>
                            <button onClick={() => setShowManualTime(false)} className="text-slate-400 hover:text-slate-600 font-bold">FECHAR</button>
                        </div>
                        
                        <div className="p-8">
                            <SelectorUI />

                            {isLapsFormat && (
                                <div className="mb-4">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Número da Volta</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xl font-black text-center text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={manualLap}
                                        onChange={e => setManualLap(parseInt(e.target.value) || 1)}
                                    />
                                </div>
                            )}

                            <div className="mb-8">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Tempo (Formato HH:MM:SS ou MM:SS)</label>
                                <input 
                                    type="text"
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xl font-black text-center text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="00:00:00"
                                    value={manualTimeStr}
                                    onChange={e => setManualTimeStr(e.target.value)}
                                />
                            </div>

                            <button 
                                onClick={saveManualTime}
                                disabled={!selectedParticipant || !manualTimeStr}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white p-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                <Save size={24} /> SALVAR REGISTRO
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Countdown Modal */}
            {showCountdown && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 my-8">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50 rounded-t-3xl">
                            <h2 className="text-xl font-black text-orange-900 flex items-center gap-2">
                                <Timer className="text-orange-600" />
                                Temporizador Global (Teste Fixo)
                            </h2>
                            <button onClick={() => { pauseCountdown(); setShowCountdown(false); }} className="text-slate-400 hover:text-slate-600 font-bold">FECHAR</button>
                        </div>
                        
                        <div className="p-8">
                            {!isCountdownRunning && !isCountdownFinished && countdownTimeLeft === countdownMinutesInput * 60 && (
                                <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                                    <label className="block text-sm font-black text-slate-500 uppercase tracking-wider mb-3">Definir Tempo da Prova (Minutos)</label>
                                    <input 
                                        type="number"
                                        min="1"
                                        value={countdownMinutesInput}
                                        onChange={e => {
                                            setCountdownMinutesInput(parseInt(e.target.value) || 1);
                                            setCountdownTimeLeft((parseInt(e.target.value) || 1) * 60);
                                        }}
                                        className="w-32 text-center p-3 bg-white border border-slate-300 rounded-xl font-black text-2xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                                    />
                                </div>
                            )}

                            <div className="text-center mb-10">
                                <div className={`font-mono text-8xl font-black tracking-tighter tabular-nums mb-2 transition-colors ${isCountdownFinished ? 'text-red-500 animate-pulse' : 'text-slate-900'}`}>
                                    {formatCountdown(countdownTimeLeft)}
                                </div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
                                    {isCountdownFinished ? 'Tempo Esgotado!' : 'Contagem Regressiva'}
                                </p>
                            </div>

                            {!isCountdownFinished ? (
                                <div className="grid grid-cols-2 gap-4">
                                    {!isCountdownRunning ? (
                                        <button 
                                            onClick={startCountdown}
                                            className="flex items-center justify-center gap-2 bg-emerald-500 text-white p-5 rounded-2xl font-black text-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                                        >
                                            <Play size={28} /> INICIAR PROVA
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={pauseCountdown}
                                            className="flex items-center justify-center gap-2 bg-rose-500 text-white p-5 rounded-2xl font-black text-xl hover:bg-rose-600 transition-colors shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                                        >
                                            <Square size={28} /> PAUSAR
                                        </button>
                                    )}
                                    <button 
                                        onClick={resetCountdown}
                                        className="flex items-center justify-center gap-2 bg-slate-100 text-slate-600 p-5 rounded-2xl font-black text-xl hover:bg-slate-200 transition-colors"
                                    >
                                        <RotateCcw size={28} /> REINICIAR
                                    </button>
                                </div>

                                {isCountdownRunning && (
                                    <div className="mt-8 animate-in fade-in duration-500">
                                        <h3 className="font-black text-slate-800 text-lg mb-4 text-center">Registro Rápido (+1 Volta)</h3>
                                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar text-left">
                                            {participants.map(p => {
                                                const userLaps = times.filter(t => t.user_id === p.user_id).length;
                                                return (
                                                    <div key={p.user_id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                        <div>
                                                            <p className="font-bold text-slate-900">{p.name}</p>
                                                            {p.team && <p className="text-xs text-indigo-600 font-bold uppercase">{p.team.name}</p>}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-center px-3 border-r border-slate-100">
                                                                <span className="block text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Voltas</span>
                                                                <span className="block text-xl font-black text-slate-700 leading-none">{userLaps}</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => addOneLap(p.user_id.toString())}
                                                                className="bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-3 rounded-xl font-black transition-all active:scale-95"
                                                            >
                                                                +1 VOLTA
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            ) : (
                                <div className="animate-in fade-in duration-500">
                                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-6">
                                        <h3 className="font-black text-orange-800 text-lg mb-4 text-center">Fim do Tempo! Registre o resultado de cada atleta:</h3>
                                        
                                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                                            {participants.map(p => (
                                                <div key={p.user_id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
                                                    <div>
                                                        <p className="font-bold text-slate-900">{p.name}</p>
                                                        {p.team && <p className="text-xs text-orange-600 font-bold uppercase">{p.team.name}</p>}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase leading-tight text-right">Voltas/<br/>Distância:</label>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            placeholder="0"
                                                            value={bulkLaps[p.user_id] === undefined ? '' : bulkLaps[p.user_id]}
                                                            onChange={e => setBulkLaps(prev => ({...prev, [p.user_id]: parseInt(e.target.value) || 0}))}
                                                            className="w-24 p-2 bg-slate-50 border border-slate-200 rounded-lg font-black text-center text-slate-700 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={saveBulkResults}
                                        disabled={loading}
                                        className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white p-5 rounded-2xl font-black text-xl hover:bg-orange-700 transition-colors shadow-xl shadow-orange-200 disabled:opacity-70"
                                    >
                                        <Save size={28} /> SALVAR TODOS OS RESULTADOS
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
