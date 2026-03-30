import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

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

// Preset round names for knockout phases - backend values
const KNOCKOUT_PRESETS = [
    { value: 'Rodada 1', label: 'Rodada 1' },
    { value: 'Rodada 2', label: 'Rodada 2' },
    { value: 'Rodada 3', label: 'Rodada 3' },
    { value: 'Oitavas de Final', label: 'Oitavas de Final', backendValue: 'round_of_16' },
    { value: 'Quartas de Final', label: 'Quartas de Final', backendValue: 'quarter' },
    { value: 'Semifinal', label: 'Semifinal', backendValue: 'semi' },
    { value: 'Disputa 3º Lugar', label: 'Disputa 3º Lugar', backendValue: 'third_place' },
    { value: 'Final', label: 'Final', backendValue: 'final' },
    { value: 'Grande Final', label: 'Grande Final' },
];

export function EditRoundModal({
    isOpen,
    onClose,
    editingRound,
    onSave
}: EditRoundModalProps) {
    const [roundName, setRoundName] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editingRound) {
            setRoundName(editingRound.round_name || `Rodada ${editingRound.round}`);
            // Check if it's a preset
            const isPreset = KNOCKOUT_PRESETS.some(p => p.value === editingRound.round_name);
            setIsCustom(!isPreset);
        }
    }, [editingRound]);

    if (!isOpen || !editingRound) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(roundName);
            onClose();
        } catch (error) {
            console.error('Error saving round name:', error);
        } finally {
            setSaving(false);
        }
    };

    const handlePresetSelect = (value: string) => {
        setRoundName(value);
        setIsCustom(false);
    };

    const handleCustomChange = (value: string) => {
        setRoundName(value);
        setIsCustom(true);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900">Editar Fase/Rodada</h3>
                        <p className="text-sm text-gray-500">
                            Alterar o nome da {editingRound.matchIds.length} jogo(s) nesta fase
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Current Name */}
                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                        <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Nome Atual</p>
                        <p className="font-bold text-indigo-900">{editingRound.round_name || `Rodada ${editingRound.round}`}</p>
                    </div>

                    {/* Preset Selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Selecionar Fase (Recomendado)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {KNOCKOUT_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => handlePresetSelect(preset.value)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                        roundName === preset.value && !isCustom
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Name */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                            Ou Digitar Nome Personalizado
                        </label>
                        <input
                            type="text"
                            value={roundName}
                            onChange={(e) => handleCustomChange(e.target.value)}
                            placeholder="Ex: Final do Municipal, Decisão..."
                            className={`w-full px-4 py-3 rounded-xl border-2 transition-all outline-none font-medium ${
                                isCustom
                                    ? 'border-indigo-500 bg-indigo-50 focus:ring-2 focus:ring-indigo-200'
                                    : 'border-gray-200 bg-gray-50 focus:border-indigo-300'
                            }`}
                        />
                    </div>

                    {/* Preview */}
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Preview</p>
                        <p className="font-bold text-emerald-900 text-lg">{roundName}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !roundName.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Salvar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
