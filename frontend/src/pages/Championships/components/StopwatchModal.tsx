import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Square, RotateCcw, Save } from 'lucide-react';
import api from '../../../services/api';

interface Participant {
    id: number;
    user_id: number | null;
    team_id: number | null;
    category_id?: number;
    name: string;
    bib_number?: string;
    team?: {
        name: string;
    };
    competitor_id?: string;
}

interface StopwatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    championshipId: string;
    participants: Participant[];
    isLapsFormat: boolean;
    onSaveSuccess: () => void;
    gameMatchId?: number | string;
    times: any[];
    setTimes: React.Dispatch<React.SetStateAction<any[]>>;
}

export function StopwatchModal({
    isOpen,
    onClose,
    championshipId,
    participants,
    isLapsFormat,
    onSaveSuccess,
    gameMatchId,
    times,
    setTimes
}: StopwatchModalProps) {
    const [selectedParticipant, setSelectedParticipant] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [timeMs, setTimeMs] = useState(0);
    const timerRef = useRef<any>(null);

    // Lap state
    const [currentLap, setCurrentLap] = useState(1);

    // Countdown state (for laps format)
    const [countdownMinutesInput, setCountdownMinutesInput] = useState(12);
    const [countdownTimeLeft, setCountdownTimeLeft] = useState(12 * 60); // in seconds
    const [isCountdownFinished, setIsCountdownFinished] = useState(false);

    // Relay state
    const [isRelayMode, setIsRelayMode] = useState(false);
    const [nextParticipant, setNextParticipant] = useState('');
    const [relayHistory, setRelayHistory] = useState<{ name: string; time: number }[]>([]);
    const [lastBatonTimeMs, setLastBatonTimeMs] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    if (!isOpen) return null;

    // Computed Teams
    const hasPlayers = participants.some(p => p.user_id !== null && p.user_id !== undefined);
    const isTeam = hasPlayers && participants.some(p => p.team_id !== null && p.team_id !== undefined);
    const teams = isTeam ? Array.from(new Set(participants.map(p => p.team_id).filter(Boolean))).map(tid => {
        const p = participants.find(x => x.team_id === tid);
        return { id: tid, name: p?.team?.name || 'Equipe' };
    }) : [];

    const availableParticipants = isTeam 
        ? participants.filter(p => p.team_id?.toString() === selectedTeam)
        : participants;

    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    };

    const formatCountdown = (secs: number) => {
        const minutes = Math.floor(secs / 60);
        const seconds = secs % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const startTimer = () => {
        if (!selectedParticipant) {
            alert('Selecione um competidor primeiro!');
            return;
        }
        setIsRunning(true);

        if (isLapsFormat) {
            // Countdown/Regressive Mode
            setIsCountdownFinished(false);
            if (countdownTimeLeft <= 0) {
                setCountdownTimeLeft(countdownMinutesInput * 60);
            }
            timerRef.current = setInterval(() => {
                setCountdownTimeLeft(prev => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        setIsCountdownFinished(true);
                        if (timerRef.current) clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            // Stopwatch/Progressive Mode
            const startTime = Date.now() - timeMs;
            timerRef.current = setInterval(() => {
                setTimeMs(Date.now() - startTime);
            }, 10);
        }
    };

    const stopTimer = () => {
        setIsRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);

        // In relay mode, log the final athlete's segment in history
        if (!isLapsFormat && isRelayMode && selectedParticipant) {
            const currentPart = participants.find(p => p.competitor_id === selectedParticipant);
            const segmentTime = timeMs - lastBatonTimeMs;
            setRelayHistory(prev => {
                const alreadyAdded = prev.some(h => h.name === currentPart?.name && h.time === segmentTime);
                if (alreadyAdded) return prev;
                return [...prev, { name: currentPart?.name || 'Atleta', time: segmentTime }];
            });
        }
    };

    const resetTimer = () => {
        setIsRunning(false);
        setIsCountdownFinished(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeMs(0);
        setCountdownTimeLeft(countdownMinutesInput * 60);
        setCurrentLap(1);
        setRelayHistory([]);
        setLastBatonTimeMs(0);
        setSaving(false);
    };

    const saveTime = async () => {
        if (!selectedParticipant) return;
        const participant = participants.find(p => p.competitor_id === selectedParticipant);
        if (!participant) return;

        // In relay mode, calculate the final athlete's segment time
        const finalTimeMs = isRelayMode ? (timeMs - lastBatonTimeMs) : timeMs;

        const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
        const optimisticTime = {
            id: optimisticId,
            user_id: participant.user_id,
            team_id: participant.team_id,
            category_id: participant.category_id,
            time_ms: finalTimeMs,
            lap: currentLap,
            status: 'completed',
            game_match_id: gameMatchId || null,
            user: participant.user_id ? { name: participant.name } : null,
            team: participant.team_id ? { name: participant.name } : null
        };

        // UI updates INSTANTLY (0ms delay!)
        setTimes(prev => [...prev, optimisticTime]);

        // Reset state and close modal instantly
        resetTimer();
        setSelectedParticipant('');
        setSelectedTeam('');
        onClose();

        try {
            const res = await api.post(`/admin/championships/${championshipId}/times`, {
                user_id: participant.user_id,
                team_id: participant.team_id,
                category_id: participant.category_id,
                time_ms: finalTimeMs,
                lap: currentLap,
                status: 'completed',
                game_match_id: gameMatchId || null
            });

            // Replace local optimistic item with the database record once returned
            setTimes(prev => prev.map(t => t.id === optimisticId ? res.data : t));
            onSaveSuccess();
        } catch (error) {
            console.error(error);
            // Revert state if the API fails
            setTimes(prev => prev.filter(t => t.id !== optimisticId));
            alert('Erro ao salvar tempo.');
        }
    };

    const passBaton = async () => {
        if (!selectedParticipant || !nextParticipant) return;

        const currentPart = participants.find(p => p.competitor_id === selectedParticipant);
        if (!currentPart) return;

        // Calculate individual segment time for the current athlete
        const segmentTime = timeMs - lastBatonTimeMs;

        const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
        const optimisticTime = {
            id: optimisticId,
            user_id: currentPart.user_id,
            team_id: currentPart.team_id,
            category_id: currentPart.category_id,
            time_ms: segmentTime,
            lap: currentLap,
            status: 'completed',
            game_match_id: gameMatchId || null,
            user: currentPart.user_id ? { name: currentPart.name } : null,
            team: currentPart.team_id ? { name: currentPart.name } : null
        };

        // UI updates INSTANTLY (0ms delay!)
        setTimes(prev => [...prev, optimisticTime]);

        // Add individual time to local relay history
        setRelayHistory(prev => [...prev, { name: currentPart.name || 'Atleta', time: segmentTime }]);

        // Update cumulative baseline time for next athlete
        setLastBatonTimeMs(timeMs);

        // Switch to next competitor and keep timer running!
        setSelectedParticipant(nextParticipant);
        setNextParticipant('');

        try {
            const res = await api.post(`/admin/championships/${championshipId}/times`, {
                user_id: currentPart.user_id,
                team_id: currentPart.team_id,
                category_id: currentPart.category_id,
                time_ms: segmentTime,
                lap: currentLap,
                status: 'completed',
                game_match_id: gameMatchId || null
            });

            // Replace local optimistic item with the database record once returned
            setTimes(prev => prev.map(t => t.id === optimisticId ? res.data : t));
            onSaveSuccess();
        } catch (error) {
            console.error(error);
            // Revert state if the API fails
            setTimes(prev => prev.filter(t => t.id !== optimisticId));
            alert('Erro ao passar o bastão.');
        }
    };

    const recordLap = async () => {
        if (!selectedParticipant) return;

        const participant = participants.find(p => p.competitor_id === selectedParticipant);
        if (!participant) return;

        // Calculate time in milliseconds based on current timer mode
        const elapsedMs = isLapsFormat 
            ? ((countdownMinutesInput * 60) - countdownTimeLeft) * 1000 
            : timeMs;

        const optimisticId = `optimistic-${Date.now()}-${Math.random()}`;
        const optimisticTime = {
            id: optimisticId,
            user_id: participant.user_id,
            team_id: participant.team_id,
            category_id: participant.category_id,
            time_ms: elapsedMs,
            lap: currentLap,
            status: 'completed',
            game_match_id: gameMatchId || null,
            user: participant.user_id ? { name: participant.name } : null,
            team: participant.team_id ? { name: participant.name } : null
        };

        // UI updates INSTANTLY (0ms delay!)
        setTimes(prev => [...prev, optimisticTime]);

        // Increment local lap
        const recordedLapNum = currentLap;
        setCurrentLap(prev => prev + 1);

        // Add to local history list in modal for immediate feedback
        setRelayHistory(prev => [
            ...prev,
            { name: participant.name, time: elapsedMs }
        ]);

        try {
            const res = await api.post(`/admin/championships/${championshipId}/times`, {
                user_id: participant.user_id,
                team_id: participant.team_id,
                category_id: participant.category_id,
                time_ms: elapsedMs,
                lap: recordedLapNum,
                status: 'completed',
                game_match_id: gameMatchId || null
            });

            // Replace local optimistic item with the database record once returned
            setTimes(prev => prev.map(t => t.id === optimisticId ? res.data : t));
            onSaveSuccess();
        } catch (error) {
            console.error(error);
            // Revert state if the API fails and decrement lap counter
            setTimes(prev => prev.filter(t => t.id !== optimisticId));
            setRelayHistory(prev => prev.filter(h => h.time !== elapsedMs));
            setCurrentLap(prev => Math.max(1, prev - 1));
            alert('Erro ao salvar volta.');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Timer className="text-indigo-650 animate-pulse" />
                        {isLapsFormat ? 'Temporizador Individual de Voltas' : 'Cronômetro Real-time'}
                    </h2>
                    <button onClick={() => { stopTimer(); resetTimer(); onClose(); }} className="text-slate-400 hover:text-slate-600 font-bold">FECHAR</button>
                </div>
                
                <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    {/* Relay mode is only shown in normal progressive stopwatch mode */}
                    {!isLapsFormat && (
                        <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 mb-6">
                            <div className="text-left">
                                <span className="block font-black text-slate-800 text-sm">Modo Revezamento 🏃💨</span>
                                <span className="block text-[10px] text-slate-500 font-bold">Alternar atleta sem parar o tempo</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isRelayMode} 
                                    onChange={e => setIsRelayMode(e.target.checked)} 
                                    className="sr-only peer"
                                    disabled={isRunning}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                    )}

                    {/* Countdown input is shown in Laps mode when not running and time is at start */}
                    {isLapsFormat && !isRunning && !isCountdownFinished && countdownTimeLeft === countdownMinutesInput * 60 && (
                        <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-sm">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Tempo da Prova (Minutos)</label>
                            <input 
                                type="number"
                                min="1"
                                value={countdownMinutesInput}
                                onChange={e => {
                                    const val = parseInt(e.target.value) || 1;
                                    setCountdownMinutesInput(val);
                                    setCountdownTimeLeft(val * 60);
                                }}
                                className="w-24 text-center p-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                    )}

                    {/* Selector UI */}
                    <div className="space-y-4 mb-6">
                        {isTeam && (
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Equipe</label>
                                <select 
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={selectedTeam}
                                    onChange={e => {
                                        setSelectedTeam(e.target.value);
                                        setSelectedParticipant('');
                                    }}
                                    disabled={isRunning}
                                >
                                    <option value="">Selecione uma equipe...</option>
                                    {teams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Competidor</label>
                            <select 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none disabled:opacity-50 focus:ring-2 focus:ring-indigo-500"
                                value={selectedParticipant}
                                onChange={e => setSelectedParticipant(e.target.value)}
                                disabled={isRunning || (isTeam && !selectedTeam)}
                            >
                                <option value="">Selecione quem vai competir...</option>
                                {availableParticipants.map(p => (
                                    <option key={p.competitor_id} value={p.competitor_id}>
                                        {p.name} {p.bib_number ? `(Peito: ${p.bib_number})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <div className="font-mono text-6xl md:text-7xl font-black text-slate-900 tracking-tighter tabular-nums mb-2">
                            {isLapsFormat ? formatCountdown(countdownTimeLeft) : formatTime(timeMs)}
                        </div>
                        <p className="text-slate-450 font-bold uppercase tracking-widest text-xs">
                            {isLapsFormat 
                                ? (isCountdownFinished ? 'Tempo Esgotado!' : `Volta Atual: ${currentLap}`) 
                                : 'Minutos : Segundos . Milésimos'}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {!isRunning ? (
                            <button 
                                onClick={startTimer}
                                disabled={!selectedParticipant || (isLapsFormat && isCountdownFinished)}
                                className="flex items-center justify-center gap-2 bg-emerald-500 text-white p-4 rounded-2xl font-black text-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                            >
                                <Play size={24} /> INICIAR
                            </button>
                        ) : (
                            <button 
                                onClick={stopTimer}
                                className="flex items-center justify-center gap-2 bg-rose-500 text-white p-4 rounded-2xl font-black text-lg hover:bg-rose-600 transition-colors shadow-lg shadow-rose-100"
                            >
                                <Square size={24} /> PAUSAR
                            </button>
                        )}
                        <button 
                            onClick={resetTimer}
                            disabled={(isLapsFormat ? countdownTimeLeft === countdownMinutesInput * 60 : timeMs === 0) || isRunning}
                            className="flex items-center justify-center gap-2 bg-slate-100 text-slate-600 p-4 rounded-2xl font-black text-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                        >
                            <RotateCcw size={24} /> ZERAR
                        </button>
                    </div>
                    
                    {isLapsFormat && isRunning && (
                        <button 
                            onClick={recordLap}
                            disabled={saving}
                            className="w-full mt-4 flex items-center justify-center gap-2 bg-amber-500 text-white p-4 rounded-2xl font-black text-lg hover:bg-amber-600 transition-colors shadow-lg shadow-amber-250 active:scale-95 duration-100 disabled:opacity-50"
                        >
                            <Save size={24} /> {saving ? 'MARCANDO...' : `MARCAR VOLTA ${currentLap}`}
                        </button>
                    )}

                    {isRelayMode && isRunning && !isLapsFormat && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-in slide-in-from-top-2 duration-200 text-left">
                            <label className="block text-[10px] font-black text-amber-800 uppercase tracking-wider mb-2">Próximo Atleta (Passar Bastão)</label>
                            <div className="flex gap-2">
                                <select 
                                    className="flex-1 p-3 bg-white border border-amber-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                                    value={nextParticipant}
                                    onChange={e => setNextParticipant(e.target.value)}
                                >
                                    <option value="">Selecione o próximo...</option>
                                    {availableParticipants
                                        .filter(p => p.competitor_id !== selectedParticipant)
                                        .map(p => (
                                            <option key={p.competitor_id} value={p.competitor_id}>{p.name}</option>
                                        ))
                                    }
                                </select>
                                <button
                                    onClick={passBaton}
                                    disabled={!nextParticipant || saving}
                                    className="bg-amber-500 text-white font-black px-4 py-3 rounded-xl hover:bg-amber-600 transition-all flex items-center gap-1 text-sm disabled:opacity-50"
                                >
                                    {saving ? 'Gravando...' : 'Passar Bastão 🏃'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Feed of recorded laps inside the modal */}
                    {relayHistory.length > 0 && (
                        <div className="mt-6 border-t border-slate-150 pt-4 text-left">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                                {isLapsFormat ? 'Histórico de Voltas' : 'Tempos do Revezamento'}
                            </h4>
                            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                {relayHistory.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                                        <div>
                                            <span className="font-bold text-slate-800">{item.name}</span>
                                            <span className="ml-2 bg-slate-200 text-slate-750 px-2 py-0.5 rounded-full text-[9px] font-black">
                                                {isLapsFormat ? `Volta #${idx + 1}` : `Segmento #${idx + 1}`}
                                            </span>
                                        </div>
                                        <span className="font-mono font-black text-slate-600">
                                            {formatTime(item.time)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {timeMs > 0 && !isRunning && !isLapsFormat && (
                        <button 
                            onClick={saveTime}
                            disabled={saving}
                            className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-650 text-white p-4 rounded-2xl font-black text-lg hover:bg-indigo-750 transition-colors shadow-lg shadow-indigo-150 disabled:opacity-50"
                        >
                            <Save size={24} /> {saving ? 'SALVANDO...' : 'SALVAR TEMPO FINAL'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
