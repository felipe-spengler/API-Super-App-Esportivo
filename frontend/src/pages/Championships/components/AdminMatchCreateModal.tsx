import React from 'react';
import { X } from 'lucide-react';

interface MatchCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    handleSaveAdd: () => void;
    newData: {
        home_team_id: string;
        away_team_id: string;
        start_time: string;
        location: string;
        round_number: number;
        group_name: string;
    };
    setNewData: (data: any) => void;
    championship: any;
    availableGroupNames: string[];
    teams: any[];
    groupAssignments: Record<string, string>;
    selectedCategoryId: number | 'no-category' | null;
}

export function AdminMatchCreateModal({
    isOpen,
    onClose,
    handleSaveAdd,
    newData,
    setNewData,
    championship,
    availableGroupNames,
    teams,
    groupAssignments,
    selectedCategoryId
}: MatchCreateModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Novo Jogo Avulso</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {(championship?.format === 'groups' || championship?.format === 'group_knockout') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vincular a um Grupo?</label>
                            <select
                                value={newData.group_name || ''}
                                onChange={e => setNewData({ ...newData, group_name: e.target.value, home_team_id: '', away_team_id: '' })}
                                className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-indigo-700"
                            >
                                <option value="">Nenhum (Mata-mata / Avulso)</option>
                                {availableGroupNames.map(g => (
                                    <option key={g} value={g}>Grupo {g}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Mandante</label>
                            <select
                                value={newData.home_team_id}
                                onChange={e => setNewData({ ...newData, home_team_id: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                            >
                                <option value="">Selecione...</option>
                                {(teams || [])
                                    .filter(t => !newData.group_name || String(groupAssignments[t.id]) === String(newData.group_name))
                                    .map((t: any) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Visitante</label>
                            <select
                                value={newData.away_team_id}
                                onChange={e => setNewData({ ...newData, away_team_id: e.target.value })}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                            >
                                <option value="">Selecione...</option>
                                {(teams || [])
                                    .filter(t => !newData.group_name || String(groupAssignments[t.id]) === String(newData.group_name))
                                    .map((t: any) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data e Hora</label>
                        <input
                            type="datetime-local"
                            value={newData.start_time}
                            onChange={e => setNewData({ ...newData, start_time: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Local</label>
                        <input
                            type="text"
                            value={newData.location}
                            placeholder="Campo 1, Ginásio..."
                            onChange={e => setNewData({ ...newData, location: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                        />
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <p className="text-xs text-indigo-800">
                            O jogo será criado na categoria: <strong>{championship?.categories?.find((c: any) => c.id === selectedCategoryId)?.name || 'Sem Categoria'}</strong>
                        </p>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleSaveAdd} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                        Criar Jogo
                    </button>
                </div>
            </div>
        </div>
    );
}
