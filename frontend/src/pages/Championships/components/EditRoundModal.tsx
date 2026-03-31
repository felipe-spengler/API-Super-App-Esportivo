import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Hash } from 'lucide-react';
import { PHASES, getPhaseDisplayName } from '../../../utils/phaseNames';

interface EditRoundModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingRound: {
        round: string;
        round_number: number;
        round_name: string;
        matchIds: number[];
    } | null;
    onSave: (roundName: string) => Promise<void>;
}

export function EditRoundModal({
    isOpen,
    onClose,
    editingRound,
    onSave
}: EditRoundModalProps) {
    const [selectedType, setSelectedType] = useState<'round' | 'elimination' | 'phase'>('round');
    const [roundNumber, setRoundNumber] = useState('1');
    const [eliminationNumber, setEliminationNumber] = useState('1');
    const [selectedPhase, setSelectedPhase] = useState('round_of_16');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editingRound && isOpen) {
            const currentName = editingRound.round_name || '';
            
            // Tenta identificar se o nome atual é uma Rodada X
            const roundMatch = currentName.match(/Rodada\s+(\d+)/i);
            const elimMatch = currentName.match(/Eliminatória\s+(\d+)/i);
            
            if (roundMatch) {
                setSelectedType('round');
                setRoundNumber(roundMatch[1]);
            } else if (elimMatch) {
                setSelectedType('elimination');
                setEliminationNumber(elimMatch[1]);
            } else if (PHASES.some(p => p.value === currentName)) {
                setSelectedType('phase');
                setSelectedPhase(currentName);
            } else if (!currentName) {
                // Se estiver vazio, usa o número da rodada vindo do banco
                setSelectedType('round');
                setRoundNumber(String(editingRound.round_number || editingRound.round || 1));
            } else {
                // Fallback para fase se for um texto qualquer
                setSelectedType('phase');
                setSelectedPhase(currentName);
            }
        }
    }, [editingRound, isOpen]);

    if (!isOpen || !editingRound) return null;

    const getFinalName = () => {
        if (selectedType === 'round') {
            return `Rodada ${roundNumber}`;
        }
        if (selectedType === 'elimination') {
            return `Eliminatória ${eliminationNumber}`;
        }
        return selectedPhase;
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(getFinalName());
            onClose();
        } catch (error) {
            console.error('Error saving round name:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-gray-800">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900">Configurar Nome da Fase</h3>
                        <p className="text-sm text-gray-500">
                            Aplicar à {editingRound.matchIds.length} jogo(s) desta rodada
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    
                    {/* Seletor de Tipo */}
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                            onClick={() => setSelectedType('round')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-bold transition-all ${
                                selectedType === 'round' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Hash className="w-3.5 h-3.5" />
                            RODADA
                        </button>
                        <button
                            onClick={() => setSelectedType('elimination')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-bold transition-all ${
                                selectedType === 'elimination' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span className="text-xs leading-none">⚔️</span>
                            ELIMINATÓRIA
                        </button>
                        <button
                            onClick={() => setSelectedType('phase')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-bold transition-all ${
                                selectedType === 'phase' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span className="text-xs leading-none">🏆</span>
                            MATA-MATA
                        </button>
                    </div>

                    {selectedType === 'round' ? (
                        <div className="space-y-3 animate-in slide-in-from-left-2 duration-200">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">
                                Número da Rodada
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={roundNumber}
                                    onChange={(e) => setRoundNumber(e.target.value)}
                                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-2xl font-black text-gray-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                    placeholder="Ex: 1"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                    ª Rodada
                                </div>
                            </div>
                        </div>
                    ) : selectedType === 'elimination' ? (
                        <div className="space-y-3 animate-in slide-in-from-right-2 duration-200">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">
                                Número da Eliminatória
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={eliminationNumber}
                                    onChange={(e) => setEliminationNumber(e.target.value)}
                                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-2xl font-black text-gray-800 focus:border-indigo-500 focus:bg-white outline-none transition-all"
                                    placeholder="Ex: 1"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                    ª Fase
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 animate-in fade-in duration-200">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-wider">
                                Selecionar Fase
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {PHASES.map((phase) => (
                                    <button
                                        key={phase.value}
                                        onClick={() => setSelectedPhase(phase.value)}
                                        className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all text-left flex items-center justify-between ${
                                            selectedPhase === phase.value
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                                : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                                        }`}
                                    >
                                        {phase.label}
                                        {selectedPhase === phase.value && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Final Preview Overlay */}
                    <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-xl shadow-indigo-100 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase opacity-60">Visualização no site</p>
                            <p className="text-xl font-black">{getPhaseDisplayName(getFinalName())}</p>
                        </div>
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">
                            {selectedType === 'round' ? '📅' : selectedType === 'elimination' ? '⚔️' : '🏆'}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || (selectedType === 'round' && !roundNumber)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Aplicar Nome
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
