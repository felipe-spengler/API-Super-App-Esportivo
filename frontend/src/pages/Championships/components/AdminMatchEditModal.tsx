import React from 'react';
import { X, AlertCircle } from 'lucide-react';

interface MatchEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    handleSaveEdit: () => void;
    editData: {
        start_time: string;
        location: string;
        round_number: number;
        category_id: number | null;
        home_score?: number;
        away_score?: number;
        group_name: string;
    };
    setEditData: (data: any) => void;
    selectedMatch: any;
    championship: any;
    availableGroupNames: string[];
}

export function AdminMatchEditModal({
    isOpen,
    onClose,
    handleSaveEdit,
    editData,
    setEditData,
    selectedMatch,
    championship,
    availableGroupNames
}: MatchEditModalProps) {
    if (!isOpen || !selectedMatch) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Editar Jogo</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4">

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data e Hora</label>
                        <input
                            type="datetime-local"
                            value={editData.start_time}
                            onChange={e => setEditData({ ...editData, start_time: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Local (Campo/Quadra)</label>
                        <input
                            type="text"
                            value={editData.location}
                            placeholder="Ex: Arena 1, Campo B..."
                            onChange={e => setEditData({ ...editData, location: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rodada (Número)</label>
                        <input
                            type="number"
                            value={editData.round_number}
                            onChange={e => setEditData({ ...editData, round_number: parseInt(e.target.value) })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        />
                    </div>

                    {selectedMatch.status === 'finished' ? (
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="text-center">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Placar Mandante</label>
                                <input
                                    type="number"
                                    value={editData.home_score ?? ''}
                                    onChange={e => setEditData({ ...editData, home_score: parseInt(e.target.value) })}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-black text-xl text-center"
                                />
                            </div>
                            <div className="text-center">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Placar Visitante</label>
                                <input
                                    type="number"
                                    value={editData.away_score ?? ''}
                                    onChange={e => setEditData({ ...editData, away_score: parseInt(e.target.value) })}
                                    className="w-full bg-white border border-gray-300 rounded-lg px-2 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-black text-xl text-center"
                                />
                            </div>
                            <p className="col-span-2 text-[10px] text-gray-400 text-center mt-1">
                                * Alterar o placar aqui não impacta a súmula, apenas o resultado final.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                            <p className="text-xs text-amber-800 leading-relaxed">
                                O placar deve ser alterado através da <strong>Súmula Digital</strong> para garantir a consistência das estatísticas.
                            </p>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleSaveEdit} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
}
