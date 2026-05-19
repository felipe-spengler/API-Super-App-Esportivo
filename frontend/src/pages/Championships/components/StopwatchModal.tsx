import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Square, RotateCcw, Save } from 'lucide-react';
import api from '../../../services/api';

interface Participant {
    id: number;
    user_id: number;
    team_id: number;
    name: string;
    bib_number?: string;
    team?: {
        name: string;
    };
}

interface StopwatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    championshipId: string;
    participants: Participant[];
    isLapsFormat: boolean;
    onSaveSuccess: () => void;
}

export function StopwatchModal({
    isOpen,
    onClose,
    championshipId,
    participants,
    isLapsFormat,
    onSaveSuccess
}: StopwatchModalProps) {
    const [selectedParticipant, setSelectedParticipant] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [timeMs, setTimeMs] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Lap state
    const [currentLap, setCurrentLap] = useState(1);

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
    const isTeam = participants.some(p => p.team_id !== null);
    const teams = isTeam ? Array.from(new Set(participants.map(p => p.team_id))).map(tid => {
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

        // In relay mode, log the final athlete's segment in history
        if (isRelayMode && selectedParticipant) {
            const currentPart = participants.find(p => p.user_id?.toString() === selectedParticipant);
            const segmentTime = timeMs - lastBatonTimeMs;
            // Prevent adding duplicate final entry if already added
            setRelayHistory(prev => {
                const alreadyAdded = prev.some(h => h.name === currentPart?.name && h.time === segmentTime);
                if (alreadyAdded) return prev;
                return [...prev, { name: currentPart?.name || 'Atleta', time: segmentTime }];
            });
        }
    };

    const resetTimer = () => {
        setIsRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeMs(0);
        setCurrentLap(1);
        setRelayHistory([]);
        setLastBatonTimeMs(0);
        setSaving(false);
    };

    const saveTime = async () => {
        if (!selectedParticipant || saving) return;
        setSaving(true);
        try {
            const participant = participants.find(p => p.user_id?.toString() === selectedParticipant);
            
            // In relay mode, calculate the final athlete's segment time
            const finalTimeMs = isRelayMode ? (timeMs - lastBatonTimeMs) : timeMs;

            await api.post(`/admin/championships/${championshipId}/times`, {
                user_id: participant?.user_id,
                team_id: participant?.team_id,
                category_id: participant?.category_id,
                time_ms: finalTimeMs,
                lap: currentLap,
                status: 'completed'
            });
            resetTimer();
            setSelectedParticipant('');
            setSelectedTeam('');
            onSaveSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar tempo.');
        } finally {
            setSaving(false);
        }
    };

    const passBaton = async () => {
        if (!selectedParticipant || !nextParticipant || saving) return;
        setSaving(true);

        try {
            const currentPart = participants.find(p => p.user_id?.toString() === selectedParticipant);
            
            // Calculate individual segment time for the current athlete
            const segmentTime = timeMs - lastBatonTimeMs;

            // Save individual segment time
            await api.post(`/admin/championships/${championshipId}/times`, {
                user_id: currentPart?.user_id,
                team_id: currentPart?.team_id,
                category_id: currentPart?.category_id,
                time_ms: segmentTime,
                lap: currentLap,
                status: 'completed'
            });

            // Add individual time to local relay history
            setRelayHistory(prev => [...prev, { name: currentPart?.name || 'Atleta', time: segmentTime }]);

            // Update cumulative baseline time for next athlete
            setLastBatonTimeMs(timeMs);

            // Switch to next competitor and keep timer running!
            setSelectedParticipant(nextParticipant);
            setNextParticipant('');
            
            // Trigger a data reload in the background
            onSaveSuccess();
        } catch (error) {
            console.error(error);
            alert('Erro ao passar o bastão.');
        } finally {
            setSaving(false);
        }
    };

    const recordLap = async () => {
        if (!selectedParticipant || saving) return;
        setSaving(true);
        try {
            const participant = participants.find(p => p.user_id?.toString() === selectedParticipant);
            await api.post(`/admin/championships/${championshipId}/times`, {
                user_id: participant?.user_id,
                team_id: participant?.team_id,
                category_id: participant?.category_id,
                time_ms: timeMs,
                lap: currentLap,
                status: 'completed'
            });
            setCurrentLap(prev => prev + 1);
            alert(`Volta ${currentLap} salva com sucesso! O cronômetro continua rodando.`);
            onSaveSuccess();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar volta.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Timer className="text-indigo-600" />
                        Cronômetro Real-time
                    </h2>
                    <button onClick={() => { stopTimer(); resetTimer(); onClose(); }} className="text-slate-400 hover:text-slate-600 font-bold">FECHAR</button>
                </div>
                
                <div className="p-8">
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
                                    <option key={p.user_id} value={p.user_id}>
                                        {p.name} {p.bib_number ? `(Peito: ${p.bib_number})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

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
                            disabled={saving}
                            className="w-full mt-4 flex items-center justify-center gap-2 bg-amber-500 text-white p-4 rounded-2xl font-black text-lg hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200 disabled:opacity-50"
                        >
                            <Save size={24} /> {saving ? 'MARCANDO...' : `MARCAR VOLTA ${currentLap}`}
                        </button>
                    )}

                    {isRelayMode && isRunning && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-in slide-in-from-top-2 duration-200 text-left">
                            <label className="block text-[10px] font-black text-amber-800 uppercase tracking-wider mb-2">Próximo Atleta (Passar Bastão)</label>
                            <div className="flex gap-2">
                                <select 
                                    className="flex-1 p-3 bg-white border border-amber-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                                    value={nextParticipant}
                                    onChange={e => setNextParticipant(e.target.value)}
                                >
                                    <option value="">Selecione o próximo...</option>
                                    {participants
                                        .filter(p => p.user_id?.toString() !== selectedParticipant)
                                        .map(p => (
                                            <option key={p.user_id} value={p.user_id}>{p.name}</option>
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

                    {isRelayMode && relayHistory.length > 0 && (
                        <div className="mt-6 border-t border-slate-150 pt-4 text-left">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Tempos do Revezamento</h4>
                            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                                {relayHistory.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                                        <div>
                                            <span className="font-bold text-slate-800">{item.name}</span>
                                            <span className="ml-2 bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full text-[10px] font-black">Segmento #{idx + 1}</span>
                                        </div>
                                        <span className="font-mono font-black text-slate-650">{formatTime(item.time)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {timeMs > 0 && !isRunning && (
                        <button 
                            onClick={saveTime}
                            disabled={saving}
                            className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 text-white p-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50"
                        >
                            <Save size={24} /> {saving ? 'SALVANDO...' : 'SALVAR TEMPO FINAL'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
