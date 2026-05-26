import React, { useState } from 'react';
import { Timer, Save } from 'lucide-react';
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

interface ManualTimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    championshipId: string;
    participants: Participant[];
    isLapsFormat: boolean;
    onSaveSuccess: () => void;
    gameMatchId?: number | string;
}

export function ManualTimeModal({
    isOpen,
    onClose,
    championshipId,
    participants,
    isLapsFormat,
    onSaveSuccess,
    gameMatchId
}: ManualTimeModalProps) {
    const [selectedParticipant, setSelectedParticipant] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('');
    const [manualTimeStr, setManualTimeStr] = useState('');
    const [manualLap, setManualLap] = useState(1);
    const [saving, setSaving] = useState(false);

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

    const saveManualTime = async () => {
        if (!selectedParticipant || saving) return;
        
        const ms = parseTimeToMs(manualTimeStr);
        if (ms <= 0) {
            alert('Digite um tempo válido (ex: 01:23:45 ou 15:30).');
            return;
        }

        setSaving(true);
        try {
            const participant = participants.find(p => p.competitor_id === selectedParticipant);
            await api.post(`/admin/championships/${championshipId}/times`, {
                user_id: participant?.user_id,
                team_id: participant?.team_id,
                category_id: participant?.category_id,
                time_ms: ms,
                lap: isLapsFormat ? manualLap : 1,
                status: 'completed',
                game_match_id: gameMatchId
            });
            setManualTimeStr('');
            setSelectedParticipant('');
            setSelectedTeam('');
            setManualLap(1);
            onSaveSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar tempo.');
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
                        Definir Tempo Manual
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">FECHAR</button>
                </div>
                
                <div className="p-8">
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
                                disabled={isTeam && !selectedTeam}
                            >
                                <option value="">Selecione quem vai competir...</option>
                                {availableParticipants.map(p => (
                                    <option key={p.competitor_id} value={p.competitor_id || ''}>
                                        {p.name} {p.bib_number ? `(Peito: ${p.bib_number})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

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
                        disabled={!selectedParticipant || !manualTimeStr || saving}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white p-4 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        <Save size={24} /> {saving ? 'SALVANDO...' : 'SALVAR REGISTRO'}
                    </button>
                </div>
            </div>
        </div>
    );
}
