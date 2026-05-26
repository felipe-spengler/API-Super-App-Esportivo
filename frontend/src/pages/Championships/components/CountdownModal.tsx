import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Square, RotateCcw, Search, Trash2 } from 'lucide-react';
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

interface CountdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    championshipId: string;
    participants: Participant[];
    times: any[];
    setTimes: React.Dispatch<React.SetStateAction<any[]>>;
    deleteTime: (id: any) => void;
    gameMatchId?: string;
}

export function CountdownModal({
    isOpen,
    onClose,
    championshipId,
    participants,
    times,
    setTimes,
    deleteTime,
    gameMatchId
}: CountdownModalProps) {
    const [countdownMinutesInput, setCountdownMinutesInput] = useState(12);
    const [countdownTimeLeft, setCountdownTimeLeft] = useState(12 * 60); // in seconds
    const [isCountdownRunning, setIsCountdownRunning] = useState(false);
    const [isCountdownFinished, setIsCountdownFinished] = useState(false);
    const countdownIntervalRef = useRef<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        return () => {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, []);

    if (!isOpen) return null;

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

    const startCountdown = () => {
        if (countdownTimeLeft <= 0) {
            setCountdownTimeLeft(countdownMinutesInput * 60);
        }
        setIsCountdownRunning(true);
        setIsCountdownFinished(false);
        countdownIntervalRef.current = setInterval(() => {
            setCountdownTimeLeft(prev => {
                if (prev <= 1) {
                    setIsCountdownRunning(false);
                    setIsCountdownFinished(true);
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
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
    };

    const addOneLap = async (competitorId: string) => {
        const participant = participants.find(p => p.competitor_id === competitorId);
        if (!participant) return;

        const competitorTimes = times.filter(t => 
            participant.user_id ? t.user_id === participant.user_id : t.team_id === participant.team_id
        );
        const nextLap = competitorTimes.length + 1;
        const elapsedMs = ((countdownMinutesInput * 60) - countdownTimeLeft) * 1000;

        const optimisticId = `optimistic-${Date.now()}`;
        const optimisticTime = {
            id: optimisticId,
            user_id: participant.user_id,
            team_id: participant.team_id,
            category_id: participant.category_id,
            time_ms: elapsedMs,
            lap: nextLap,
            status: 'completed',
            game_match_id: gameMatchId || null,
            user: participant.user_id ? { name: participant.name } : null,
            team: participant.team_id ? { name: participant.name } : null
        };

        // UI updates INSTANTLY (0ms delay!)
        setTimes(prev => [...prev, optimisticTime]);

        try {
            // Save to database in the background without blocking the main thread
            const res = await api.post(`/admin/championships/${championshipId}/times`, {
                user_id: participant.user_id,
                team_id: participant.team_id,
                category_id: participant.category_id,
                time_ms: elapsedMs,
                lap: nextLap,
                status: 'completed',
                game_match_id: gameMatchId || null
            });

            // Replace local optimistic item with the database record once returned
            setTimes(prev => prev.map(t => t.id === optimisticId ? res.data : t));
        } catch (error) {
            console.error(error);
            // Revert state if the API fails
            setTimes(prev => prev.filter(t => t.id !== optimisticId));
            alert('Erro ao salvar volta.');
        }
    };

    const getLapDuration = (record: any) => {
        if (!record.lap || record.lap === 1) {
            return record.time_ms;
        }
        const prevRecord = times.find(x => 
            (record.user_id ? x.user_id === record.user_id : x.team_id === record.team_id) && 
            x.lap === record.lap - 1
        );
        if (prevRecord) {
            return record.time_ms - prevRecord.time_ms;
        }
        const sameCompetitorTimes = times
            .filter(x => (record.user_id ? x.user_id === record.user_id : x.team_id === record.team_id) && x.lap < record.lap)
            .sort((a, b) => b.lap - a.lap);
        if (sameCompetitorTimes.length > 0) {
            return record.time_ms - sameCompetitorTimes[0].time_ms;
        }
        return record.time_ms;
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden my-4 md:my-8 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50 flex-shrink-0">
                    <h2 className="text-xl font-black text-orange-900 flex items-center gap-2">
                        <Timer className="text-orange-600 animate-pulse" />
                        Painel de Controle de Voltas (Tempo Regressivo)
                    </h2>
                    <button onClick={() => { pauseCountdown(); onClose(); }} className="text-slate-400 hover:text-slate-605 font-bold transition-colors">FECHAR</button>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100 flex-1 min-h-0 overflow-y-auto">
                    {/* Left Column: Timer & Controls (5 cols) */}
                    <div className="col-span-1 md:col-span-5 p-4 sm:p-6 flex flex-col justify-between bg-slate-50/50 md:overflow-y-auto">
                        <div>
                            {!isCountdownRunning && !isCountdownFinished && countdownTimeLeft === countdownMinutesInput * 60 && (
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
                                        className="w-24 text-center p-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    />
                                </div>
                            )}

                            <div className="text-center py-6 md:py-8 bg-white rounded-3xl border border-slate-100 shadow-sm mb-6">
                                <div className={`font-mono text-5xl md:text-7xl font-black tracking-tighter tabular-nums mb-2 transition-colors ${isCountdownFinished ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
                                    {formatCountdown(countdownTimeLeft)}
                                </div>
                                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">
                                    {isCountdownFinished ? 'Tempo Esgotado!' : 'Contagem Regressiva'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {!isCountdownRunning ? (
                                    <button 
                                        onClick={startCountdown}
                                        className="flex items-center justify-center gap-1.5 bg-emerald-500 text-white py-3 px-4 rounded-xl font-black hover:bg-emerald-600 transition-all shadow-md shadow-emerald-100 text-xs sm:text-sm"
                                    >
                                        <Play size={16} /> INICIAR
                                    </button>
                                ) : (
                                    <button 
                                        onClick={pauseCountdown}
                                        className="flex items-center justify-center gap-1.5 bg-rose-500 text-white py-3 px-4 rounded-xl font-black hover:bg-rose-600 transition-all shadow-md shadow-rose-100 text-xs sm:text-sm"
                                    >
                                        <Square size={16} /> PAUSAR
                                    </button>
                                )}
                                <button 
                                    onClick={resetCountdown}
                                    className="flex items-center justify-center gap-1.5 bg-slate-200 text-slate-600 py-3 px-4 rounded-xl font-black hover:bg-slate-300 transition-all text-xs sm:text-sm"
                                >
                                    <RotateCcw size={16} /> REINICIAR
                                </button>
                            </div>
                        </div>

                        {/* Last Laps Feed */}
                        <div className="mt-4 border-t border-slate-200 pt-6">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Últimas Voltas Salvas</h3>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {times.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic font-medium">Nenhuma volta registrada ainda nesta prova.</p>
                                ) : (
                                    [...times]
                                        .sort((a, b) => {
                                            const idA = typeof a.id === 'string' ? 999999999 + parseInt(a.id.split('-')[1] || '0') : a.id;
                                            const idB = typeof b.id === 'string' ? 999999999 + parseInt(b.id.split('-')[1] || '0') : b.id;
                                            return idB - idA;
                                        })
                                        .slice(0, 4)
                                        .map(t => (
                                            <div key={t.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-xs animate-in slide-in-from-bottom-2 duration-250">
                                                <div className="flex flex-col gap-1 min-w-0 flex-1 pr-2">
                                                    <p className="font-bold text-slate-800 leading-tight truncate">
                                                        {t.user?.name || t.team?.name || 'Competidor'}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-black leading-none">
                                                            Volta #{t.lap}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">
                                                            Acumulado: {formatTime(t.time_ms)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="font-mono font-black text-slate-900 text-xs">{formatTime(getLapDuration(t))}</span>
                                                    <button 
                                                        onClick={() => deleteTime(t.id)} 
                                                        disabled={typeof t.id === 'string'}
                                                        className="text-slate-350 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50 disabled:opacity-30"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Competitors List & Filter (7 cols) */}
                    <div className="col-span-1 md:col-span-7 p-4 sm:p-6 flex flex-col bg-white min-h-0">
                        {/* Search */}
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div className="relative flex-1">
                                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="Buscar competidor pelo nome ou peito..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all text-sm"
                                />
                            </div>
                        </div>

                        {/* Competitors List */}
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-0 h-[300px] md:h-[480px]">
                            {participants.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 font-bold">Nenhum competidor cadastrado.</div>
                            ) : (
                                <div className="space-y-2.5">
                                    {participants
                                        .filter(p => 
                                            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            (p.team?.name && p.team.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        )
                                        .map(p => {
                                            const competitorTimes = times.filter(t => 
                                                p.user_id ? t.user_id === p.user_id : t.team_id === p.team_id
                                            );
                                            const competitorLapsCount = competitorTimes.length;
                                            return (
                                                <div key={p.competitor_id} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm transition-all hover:bg-slate-100/50">
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <p className="font-black text-slate-800 truncate text-sm">{p.name}</p>
                                                        {p.team && p.team.name !== p.name && <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wider truncate mt-0.5">{p.team.name}</p>}
                                                    </div>
                                                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                                                        <div className="text-center px-2 sm:px-4 border-r border-slate-200">
                                                            <span className="block text-[8px] sm:text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Voltas</span>
                                                            <span className="block text-lg sm:text-xl font-black text-slate-700 leading-none">{competitorLapsCount}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => addOneLap(p.competitor_id || '')}
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] sm:text-xs uppercase tracking-wider px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl transition-all shadow-md shadow-indigo-150 active:scale-95 animate-in"
                                                        >
                                                            +1 Volta
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
