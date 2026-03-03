import React from 'react';
import { X, Loader2, Shuffle, Play, Plus, AlertCircle } from 'lucide-react';

interface AdminGroupManagerProps {
    isOpen: boolean;
    onClose: () => void;
    loadingGroups: boolean;
    numGroups: number;
    setNumGroups: (num: number) => void;
    handleAutoDistribute: () => void;
    availableGroupNames: string[];
    setAvailableGroupNames: React.Dispatch<React.SetStateAction<string[]>>;
    teams: any[];
    groupAssignments: Record<string, string>;
    setGroupAssignments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    handleSaveGroups: () => void;
}

export function AdminGroupManager({
    isOpen,
    onClose,
    loadingGroups,
    numGroups,
    setNumGroups,
    handleAutoDistribute,
    availableGroupNames,
    setAvailableGroupNames,
    teams,
    groupAssignments,
    setGroupAssignments,
    handleSaveGroups
}: AdminGroupManagerProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Gerenciar Grupos</h3>
                        <p className="text-sm text-gray-500">Distribua as equipes nos grupos manualmente ou faça um sorteio.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {loadingGroups ? (
                        <div className="text-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-4" />
                            <p className="text-gray-500">Carregando grupos...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Auto-Distribution / Shuffle Controls */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                                        <Shuffle size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">Sorteio Automático</h4>
                                        <p className="text-xs text-gray-500">Defina a quantidade e o sistema distribui.</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                        <span className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Qtd. Grupos:</span>
                                        <input
                                            type="number"
                                            min={2}
                                            max={16}
                                            value={numGroups}
                                            onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)}
                                            className="w-12 bg-transparent font-bold text-gray-900 outline-none text-center"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Isso irá redistribuir todos os times e apagar a organização atual. Confirmar?')) {
                                                handleAutoDistribute();
                                            }
                                        }}
                                        className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Play size={16} fill="currentColor" />
                                        Sortear Times
                                    </button>
                                </div>
                            </div>

                            {/* Manual Controls */}
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Grupos Disponíveis</label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableGroupNames.map(name => (
                                            <div key={name} className="px-3 py-1 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-indigo-600 shadow-sm flex items-center gap-2">
                                                Grupo {name}
                                                {name === availableGroupNames[availableGroupNames.length - 1] && availableGroupNames.length > 2 && (
                                                    <button
                                                        onClick={() => setAvailableGroupNames(prev => prev.slice(0, -1))}
                                                        className="text-indigo-300 hover:text-red-500"
                                                        title="Remover Grupo"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const nextChar = String.fromCharCode(65 + availableGroupNames.length); // A=65
                                                if (availableGroupNames.length < 16) {
                                                    setAvailableGroupNames(prev => [...prev, nextChar]);
                                                }
                                            }}
                                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1"
                                        >
                                            <Plus size={14} /> Adicionar
                                        </button>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-indigo-900">{teams.length}</div>
                                    <div className="text-xs font-bold text-indigo-600 uppercase">Equipes</div>
                                </div>
                            </div>

                            {/* Assignment Table */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Unassigned Column */}
                                <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-4">
                                    <h4 className="font-bold text-gray-500 mb-4 flex items-center gap-2">
                                        <AlertCircle size={16} /> Sem Grupo / Disponíveis
                                    </h4>
                                    <div className="space-y-2">
                                        {teams.filter(t => !groupAssignments[t.id]).map(team => (
                                            <div key={team.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between group">
                                                <span className="font-medium text-gray-700">{team.name}</span>
                                                <div className="flex gap-1 opacity-100 transition-opacity">
                                                    {availableGroupNames.slice(0, 4).map(group => (
                                                        <button
                                                            key={group}
                                                            onClick={() => setGroupAssignments(prev => ({ ...prev, [team.id]: group }))}
                                                            className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600 rounded text-xs font-bold transition-colors"
                                                            title={`Mover para Grupo ${group}`}
                                                        >
                                                            {group}
                                                        </button>
                                                    ))}
                                                    {availableGroupNames.length > 4 && (
                                                        <select
                                                            className="w-6 h-6 bg-gray-100 rounded text-xs font-bold outline-none"
                                                            onChange={(e) => {
                                                                if (e.target.value) setGroupAssignments(prev => ({ ...prev, [team.id]: e.target.value }))
                                                            }}
                                                        >
                                                            <option value="">+</option>
                                                            {availableGroupNames.slice(4).map(g => <option key={g} value={g}>{g}</option>)}
                                                        </select>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {teams.filter(t => !groupAssignments[t.id]).length === 0 && (
                                            <div className="text-center py-8 text-gray-400 text-sm italic">
                                                Todas as equipes foram atribuídas!
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Group Columns */}
                                {availableGroupNames.map(groupName => {
                                    const groupTeams = teams.filter(t => groupAssignments[t.id] === groupName);
                                    return (
                                        <div key={groupName} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 h-fit">
                                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                                                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                                    <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded text-xs">
                                                        {groupName}
                                                    </span>
                                                    Grupo {groupName}
                                                </h4>
                                                <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{groupTeams.length}</span>
                                            </div>
                                            <div className="space-y-2 min-h-[50px]">
                                                {groupTeams.map(team => (
                                                    <div key={team.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <span className="text-sm font-medium text-gray-700">{team.name}</span>
                                                        <button
                                                            onClick={() => {
                                                                const newAssignments = { ...groupAssignments };
                                                                delete newAssignments[team.id];
                                                                setGroupAssignments(newAssignments);
                                                            }}
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                            title="Remover do grupo"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {groupTeams.length === 0 && (
                                                    <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                                                        Arraste ou selecione times
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSaveGroups}
                        disabled={loadingGroups}
                        className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                    >
                        {loadingGroups ? 'Salvando...' : 'Salvar Grupos'}
                    </button>
                </div>
            </div>
        </div>
    );
}

