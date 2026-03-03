import React from 'react';
import { Loader2, Play } from 'lucide-react';

interface MatchArbitrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    handleConfirmArbitration: (e: React.FormEvent) => void;
    arbitrationData: {
        referee: string;
        assistant1: string;
        assistant2: string;
    };
    setArbitrationData: (data: any) => void;
    savingArbitration: boolean;
}

export function AdminMatchArbitrationModal({
    isOpen,
    onClose,
    handleConfirmArbitration,
    arbitrationData,
    setArbitrationData,
    savingArbitration
}: MatchArbitrationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <form onSubmit={handleConfirmArbitration} className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-indigo-600 p-4 text-white">
                    <h3 className="font-bold text-lg">Iniciar Súmula</h3>
                    <p className="text-indigo-100 text-xs">Informe a equipe de arbitragem</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Árbitro Principal</label>
                        <input
                            required
                            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={arbitrationData.referee}
                            onChange={e => setArbitrationData({ ...arbitrationData, referee: e.target.value })}
                            placeholder="Nome do Árbitro"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assistente 1</label>
                            <input
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={arbitrationData.assistant1}
                                onChange={e => setArbitrationData({ ...arbitrationData, assistant1: e.target.value })}
                                placeholder="Opcional"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Assistente 2</label>
                            <input
                                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={arbitrationData.assistant2}
                                onChange={e => setArbitrationData({ ...arbitrationData, assistant2: e.target.value })}
                                placeholder="Opcional"
                            />
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 flex justify-end gap-3 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={savingArbitration}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {savingArbitration ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {savingArbitration ? 'Salvando...' : 'Iniciar Partida'}
                    </button>
                </div>
            </form>
        </div>
    );
}
