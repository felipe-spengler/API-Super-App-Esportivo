import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface MatchData {
    id: number;
    home_team_id: string;
    away_team_id: string;
    start_time: string;
    location: string;
    round_number: number;
    group_name: string;
}

interface MatchCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    handleSaveAdd: (matches: MatchData[]) => void;
    initialData: Omit<MatchData, 'id'>;
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
    initialData,
    championship,
    availableGroupNames,
    teams,
    groupAssignments,
    selectedCategoryId
}: MatchCreateModalProps) {
    const [matches, setMatches] = useState<MatchData[]>([
        { id: Date.now(), ...initialData }
    ]);

    // Update matches when modal opens with new initial data
    React.useEffect(() => {
        if (isOpen) {
            setMatches([{ id: Date.now(), ...initialData }]);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const addMatchField = () => {
        setMatches(prev => [
            ...prev,
            {
                id: Date.now(),
                ...initialData,
                group_name: prev[prev.length - 1]?.group_name || initialData.group_name,
                start_time: prev[prev.length - 1]?.start_time || initialData.start_time,
                location: prev[prev.length - 1]?.location || initialData.location,
            }
        ]);
    };

    const removeMatchField = (idToRemove: number) => {
        setMatches(prev => prev.filter(m => m.id !== idToRemove));
    };

    const updateMatchField = (idToUpdate: number, field: string, value: string) => {
        setMatches(prev => prev.map(m => m.id === idToUpdate ? { ...m, [field]: value } : m));
    };

    const handleConfirm = () => {
        // Validation could be added here
        handleSaveAdd(matches);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 flex flex-col max-h-[90vh]">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-gray-900">Adicionar Jogos: Rodada {initialData.round_number}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 mb-2">
                        <p className="text-sm font-medium text-indigo-800">
                            Categoria Base: <strong>{championship?.categories?.find((c: any) => c.id === selectedCategoryId)?.name || 'Sem Categoria'}</strong>
                        </p>
                    </div>

                    {matches.map((matchData, index) => (
                        <div key={matchData.id} className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-sm relative relative group">
                            {matches.length > 1 && (
                                <button
                                    onClick={() => removeMatchField(matchData.id)}
                                    className="absolute -right-2 -top-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-1.5 shadow-sm transition-colors border border-red-200 z-10"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}

                            <div className="text-xs font-bold text-indigo-500 uppercase mb-3 flex items-center gap-2">
                                <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center">
                                    {index + 1}
                                </span>
                                Jogo
                            </div>

                            <div className="space-y-4">
                                {(championship?.format === 'groups' || championship?.format === 'group_knockout') && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vincular a um Grupo?</label>
                                        <select
                                            value={matchData.group_name || ''}
                                            onChange={e => {
                                                updateMatchField(matchData.id, 'group_name', e.target.value);
                                                updateMatchField(matchData.id, 'home_team_id', '');
                                                updateMatchField(matchData.id, 'away_team_id', '');
                                            }}
                                            className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-indigo-700 text-sm"
                                        >
                                            <option value="">Nenhum (Mata-mata / Avulso)</option>
                                            {availableGroupNames.map(g => (
                                                <option key={g} value={g}>Grupo {g}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Mandante</label>
                                        <select
                                            value={matchData.home_team_id}
                                            onChange={e => updateMatchField(matchData.id, 'home_team_id', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                                        >
                                            <option value="">Selecione...</option>
                                            {(teams || [])
                                                .filter(t => !matchData.group_name || String(groupAssignments[t.id]) === String(matchData.group_name))
                                                .map((t: any) => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Visitante</label>
                                        <select
                                            value={matchData.away_team_id}
                                            onChange={e => updateMatchField(matchData.id, 'away_team_id', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                                        >
                                            <option value="">Selecione...</option>
                                            {(teams || [])
                                                .filter(t => !matchData.group_name || String(groupAssignments[t.id]) === String(matchData.group_name))
                                                .map((t: any) => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data e Hora</label>
                                        <input
                                            type="datetime-local"
                                            value={matchData.start_time}
                                            onChange={e => updateMatchField(matchData.id, 'start_time', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Local</label>
                                        <input
                                            type="text"
                                            value={matchData.location}
                                            placeholder="Campo 1, Ginásio..."
                                            onChange={e => updateMatchField(matchData.id, 'location', e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={addMatchField}
                        className="w-full py-4 border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-xl text-indigo-600 font-bold text-sm tracking-wide hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={18} /> INSERIR OUTRO JOGO NESTA RODADA
                    </button>

                </div>

                <div className="p-4 bg-white border-t border-gray-100 flex gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button onClick={onClose} className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleConfirm} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                        Criar Jogo(s)
                    </button>
                </div>
            </div>
        </div>
    );
}
