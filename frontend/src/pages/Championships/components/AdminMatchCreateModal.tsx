import React, { useState } from 'react';
import { X, Plus, Trash2, Hash } from 'lucide-react';
import { PHASES, getPhaseDisplayName } from '../../../utils/phaseNames';

interface MatchData {
    id: number;
    home_team_id: string;
    away_team_id: string;
    start_time: string;
    location: string;
    round_number: number;
    round_name?: string;
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
    maxRoundNumber?: number;
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
    selectedCategoryId,
    maxRoundNumber = 1
}: MatchCreateModalProps) {
    const [matches, setMatches] = useState<MatchData[]>([
        { id: Date.now(), ...initialData, round_name: initialData.round_name || `Rodada ${initialData.round_number}` }
    ]);

    // Round type selection - same as EditRoundModal
    const [selectedType, setSelectedType] = useState<'round' | 'elimination' | 'phase'>('round');
    const [roundNumber, setRoundNumber] = useState(String(initialData.round_number || 1));
    const [eliminationNumber, setEliminationNumber] = useState('1');
    const [selectedPhase, setSelectedPhase] = useState('round_of_16');

    // NOVO: Select de rodada/fase existente
    const [existingRounds, setExistingRounds] = useState<string[]>([]);
    const [selectedExistingRound, setSelectedExistingRound] = useState<string>('');

    // Get the final round name based on selection
    const getFinalRoundName = () => {
        if (selectedExistingRound) return selectedExistingRound;
        if (selectedType === 'round') {
            return `Rodada ${roundNumber}`;
        }
        if (selectedType === 'elimination') {
            return `Eliminatória ${eliminationNumber}`;
        }
        return selectedPhase; // Returns backend value like 'round_of_16'
    };

    // Atualiza lista de rodadas/fases existentes ao abrir modal
    React.useEffect(() => {
        if (isOpen) {
            setMatches([{ id: Date.now(), ...initialData }]);
            setRoundNumber(String(initialData.round_number || 1));

            // Buscar rodadas/fases já existentes dos jogos (exceto avulsos)
            if (championship && championship.matches) {
                const uniqueRounds = Array.from(new Set(
                    championship.matches
                        .map((m: any) => m.round_name)
                        .filter((n: string | undefined) => n && n.trim() !== '')
                ));
                setExistingRounds(uniqueRounds);
            } else {
                setExistingRounds([]);
            }
            setSelectedExistingRound('');
        }
    }, [isOpen, initialData, championship]);

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
        const finalRoundName = getFinalRoundName();
        const matchesWithRoundName = matches.map(m => ({
            ...m,
            round_name: finalRoundName,
            round_number: selectedType === 'round' ? Number(roundNumber) : initialData.round_number
        }));
        handleSaveAdd(matchesWithRoundName);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 flex flex-col max-h-[90vh]">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-gray-900">Adicionar Jogos</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* NOVO: Select de rodada/fase existente */}
                    <div className="mb-4">
                        <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Vincular a Rodada/Fase Existente</label>
                        <select
                            value={selectedExistingRound}
                            onChange={e => setSelectedExistingRound(e.target.value)}
                            className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-indigo-700 text-sm"
                        >
                            <option value="">Nova Rodada/Fase</option>
                            {existingRounds.map(rn => (
                                <option key={rn} value={rn}>{rn}</option>
                            ))}
                        </select>
                    </div>

                    {/* Só mostra inputs de nova rodada/fase se não selecionou existente */}
                    {!selectedExistingRound && (
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 space-y-4">
                            <label className="block text-xs font-bold text-indigo-700 uppercase">Configurar Nome da Rodada/Fase</label>
                            {/* Type Selector */}
                            <div className="flex p-1 bg-white rounded-xl border border-indigo-200">
                                <button
                                    onClick={() => setSelectedType('round')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-bold transition-all ${
                                        selectedType === 'round' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <Hash className="w-3.5 h-3.5" />
                                    RODADA
                                </button>
                                <button
                                    onClick={() => setSelectedType('elimination')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-bold transition-all ${
                                        selectedType === 'elimination' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <span className="text-xs leading-none">⚔️</span>
                                    ELIMINATÓRIA
                                </button>
                                <button
                                    onClick={() => setSelectedType('phase')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-bold transition-all ${
                                        selectedType === 'phase' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <span className="text-xs leading-none">🏆</span>
                                    MATA-MATA
                                </button>
                            </div>

                            {/* Round Number Input */}
                            {selectedType === 'round' && (
                                <div className="space-y-2 animate-in slide-in-from-left-2 duration-200">
                                    <label className="block text-xs font-black text-indigo-600 uppercase tracking-wider">
                                        Número da Rodada
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={roundNumber}
                                            onChange={(e) => setRoundNumber(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl text-xl font-black text-indigo-700 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="Ex: 1"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-sm">
                                            ª Rodada
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Elimination Number Input */}
                            {selectedType === 'elimination' && (
                                <div className="space-y-2 animate-in slide-in-from-right-2 duration-200">
                                    <label className="block text-xs font-black text-indigo-600 uppercase tracking-wider">
                                        Número da Eliminatória
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={eliminationNumber}
                                            onChange={(e) => setEliminationNumber(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border-2 border-indigo-200 rounded-xl text-xl font-black text-indigo-700 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="Ex: 1"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-sm">
                                            ª Fase
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Phase Selection */}
                            {selectedType === 'phase' && (
                                <div className="space-y-2 animate-in fade-in duration-200">
                                    <label className="block text-xs font-black text-indigo-600 uppercase tracking-wider">
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
                                                        : 'border-gray-100 bg-white text-gray-600 hover:border-indigo-200'
                                                }`}
                                            >
                                                {phase.label}
                                                {selectedPhase === phase.value && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Preview */}
                            <div className="bg-indigo-600 rounded-xl p-3 text-white shadow-lg flex items-center justify-between">
                                <div>
                                    <p className="text-[9px] font-black uppercase opacity-60">Visualização no site</p>
                                    <p className="text-lg font-black">{getPhaseDisplayName(getFinalRoundName())}</p>
                                </div>
                                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-lg">
                                    {selectedType === 'round' ? '📅' : selectedType === 'elimination' ? '⚔️' : '🏆'}
                                </div>
                            </div>
                        </div>
                    )}

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
                                            {availableGroupNames.map(g => {
                                                const displayG = String(g).trim();
                                                const isGrupoAlready = /^grupo\s/i.test(displayG);
                                                return (
                                                    <option key={g} value={g}>{isGrupoAlready ? displayG : `Grupo ${displayG}`}</option>
                                                );
                                            })}
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
                                                .filter(t => {
                                                    if (!matchData.group_name || matchData.group_name === 'null' || matchData.group_name === '') return true;

                                                    const rawTeamGroup = String(groupAssignments[t.id] || '');
                                                    if (!rawTeamGroup) return false;

                                                    const teamG = rawTeamGroup.toLowerCase().replace(/grupo/g, '').trim();
                                                    const selG = String(matchData.group_name).toLowerCase().replace(/grupo/g, '').trim();

                                                    return teamG === selG || (teamG && selG && (teamG.includes(selG) || selG.includes(teamG)));
                                                })
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
                                                .filter(t => {
                                                    if (!matchData.group_name || matchData.group_name === 'null' || matchData.group_name === '') return true;

                                                    const rawTeamGroup = String(groupAssignments[t.id] || '');
                                                    if (!rawTeamGroup) return false;

                                                    const teamG = rawTeamGroup.toLowerCase().replace(/grupo/g, '').trim();
                                                    const selG = String(matchData.group_name).toLowerCase().replace(/grupo/g, '').trim();

                                                    return teamG === selG || (teamG && selG && (teamG.includes(selG) || selG.includes(teamG)));
                                                })
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
