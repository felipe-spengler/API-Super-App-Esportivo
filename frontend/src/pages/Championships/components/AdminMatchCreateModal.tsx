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
    const [step, setStep] = useState<1 | 2>(1);
    const [matches, setMatches] = useState<MatchData[]>([
        { id: Date.now(), ...initialData, round_name: initialData.round_name || `Rodada ${initialData.round_number}` }
    ]);

    // Round type selection
    const [selectedType, setSelectedType] = useState<'round' | 'elimination' | 'phase'>('round');
    const [roundNumber, setRoundNumber] = useState(String(initialData.round_number || 1));
    const [eliminationNumber, setEliminationNumber] = useState('1');
    const [selectedPhase, setSelectedPhase] = useState('round_of_16');
    const [existingRounds, setExistingRounds] = useState<string[]>([]);
    const [selectedExistingRound, setSelectedExistingRound] = useState<string>('');

    const isLeague = championship?.format === 'league';

    const getFinalRoundName = () => {
        if (selectedExistingRound) return selectedExistingRound;
        if (selectedType === 'round') {
            return `Rodada ${roundNumber}`;
        }
        if (selectedType === 'elimination') {
            return `Eliminatória ${eliminationNumber}`;
        }
        return selectedPhase; 
    };

    React.useEffect(() => {
        if (isOpen) {
            setStep(1);
            setMatches([{ id: Date.now(), ...initialData }]);
            setRoundNumber(String(initialData.round_number || 1));
            setSelectedType('round');
            
            if (championship && championship.matches) {
                const uniqueRounds = Array.from(new Set(
                    championship.matches
                        .map((m: any) => m.round_name)
                        .filter((n: string | undefined) => n && n.trim() !== '')
                ));
                setExistingRounds(uniqueRounds as string[]);
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
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 flex flex-col max-h-[90vh] min-h-[500px]">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                            {step}
                        </span>
                        {step === 1 ? 'Configurar Rodada / Fase' : 'Adicionar Jogos'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/30">
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-left-4">
                            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 mb-2">
                                <p className="text-sm font-medium text-indigo-800">
                                    Categoria Base: <strong>{championship?.categories?.find((c: any) => c.id === selectedCategoryId)?.name || 'Sem Categoria'}</strong>
                                </p>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-xs font-bold text-indigo-700 uppercase mb-1">Vincular a Rodada/Fase Existente</label>
                                <select
                                    value={selectedExistingRound}
                                    onChange={e => setSelectedExistingRound(e.target.value)}
                                    className="w-full bg-white border-2 border-indigo-100 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-bold text-gray-700 text-sm shadow-sm"
                                >
                                    <option value="">+ Criar Nova Rodada/Fase</option>
                                    {existingRounds.map(rn => (
                                        <option key={rn} value={rn}>{rn}</option>
                                    ))}
                                </select>
                            </div>

                            {!selectedExistingRound && (
                                <div className="bg-white p-5 rounded-2xl border-2 border-indigo-50 shadow-sm space-y-5">
                                    <label className="block text-xs font-bold text-indigo-700 uppercase">Qual o tipo da nova fase?</label>
                                    
                                    <div className="flex flex-col sm:flex-row p-1 bg-gray-100 rounded-xl gap-1 sm:gap-0">
                                        <button
                                            onClick={() => setSelectedType('round')}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-bold transition-all ${
                                                selectedType === 'round' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            <Hash className="w-4 h-4" /> RODADA
                                        </button>
                                        {!isLeague && (
                                            <>
                                                <button
                                                    onClick={() => setSelectedType('elimination')}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-bold transition-all ${
                                                        selectedType === 'elimination' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    <span className="text-base leading-none">⚔️</span> ELIMINATÓRIA
                                                </button>
                                                <button
                                                    onClick={() => setSelectedType('phase')}
                                                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-bold transition-all ${
                                                        selectedType === 'phase' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                                >
                                                    <span className="text-base leading-none">🏆</span> MATA-MATA
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {selectedType === 'round' && (
                                        <div className="space-y-2 animate-in fade-in">
                                            <label className="block text-xs font-black text-gray-500 uppercase">Número da Rodada</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={roundNumber}
                                                    onChange={(e) => setRoundNumber(e.target.value)}
                                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-xl font-black focus:border-indigo-500 outline-none transition-all"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">ª Rodada</div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedType === 'elimination' && !isLeague && (
                                        <div className="space-y-2 animate-in fade-in">
                                            <label className="block text-xs font-black text-gray-500 uppercase">Número da Eliminatória</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={eliminationNumber}
                                                    onChange={(e) => setEliminationNumber(e.target.value)}
                                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-xl font-black focus:border-indigo-500 outline-none transition-all"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">ª Fase</div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedType === 'phase' && !isLeague && (
                                        <div className="space-y-2 animate-in fade-in">
                                            <label className="block text-xs font-black text-gray-500 uppercase">Selecionar Fase</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                                                        <span className="truncate">{phase.label}</span>
                                                        {selectedPhase === phase.value && <div className="w-2 h-2 rounded-full bg-indigo-600 flex-shrink-0" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-indigo-600 rounded-xl p-4 text-white shadow-lg flex items-center justify-between mt-4">
                                <div>
                                    <p className="text-xs font-bold uppercase opacity-80">Rodada Definida:</p>
                                    <p className="text-2xl font-black">{getPhaseDisplayName(getFinalRoundName())}</p>
                                </div>
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                                    {selectedExistingRound ? '✅' : selectedType === 'round' ? '📅' : selectedType === 'elimination' ? '⚔️' : '🏆'}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="bg-indigo-100 text-indigo-800 p-3 rounded-xl font-bold flex items-center justify-center shadow-sm">
                                Adicionando jogos em: {getPhaseDisplayName(getFinalRoundName())}
                            </div>

                            {matches.map((matchData, index) => (
                                <div key={matchData.id} className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm relative group">
                                    {matches.length > 1 && (
                                        <button
                                            onClick={() => removeMatchField(matchData.id)}
                                            className="absolute -right-3 -top-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-2 shadow-sm transition-colors border border-red-200 z-10"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}

                                    <div className="text-sm font-black text-indigo-400 uppercase mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                        <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center leading-none">
                                            {index + 1}
                                        </span>
                                        JOGO
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
                                                    className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-indigo-700 text-sm"
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
                                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-bold text-gray-700 text-sm"
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
                                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-bold text-gray-700 text-sm"
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
                                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-bold text-gray-700 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Local</label>
                                                <input
                                                    type="text"
                                                    value={matchData.location}
                                                    placeholder="Campo 1, Ginásio..."
                                                    onChange={e => updateMatchField(matchData.id, 'location', e.target.value)}
                                                    className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-all font-bold text-gray-700 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={addMatchField}
                                className="w-full py-4 border-2 border-dashed border-indigo-300 bg-indigo-50/80 rounded-2xl text-indigo-600 font-bold text-sm tracking-wide hover:bg-indigo-100 hover:border-indigo-400 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={18} /> IMPLANTAR MAIS UM JOGO NESTA FASE
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-gray-100 flex flex-col sm:flex-row gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    {step === 1 ? (
                        <>
                            <button onClick={onClose} className="w-full sm:flex-1 px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all order-2 sm:order-1">
                                Cancelar
                            </button>
                            <button onClick={() => setStep(2)} className="w-full sm:flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all order-1 sm:order-2">
                                Avançar para Jogos &raquo;
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setStep(1)} className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all order-2 sm:order-1">
                                &laquo; Voltar
                            </button>
                            <button onClick={handleConfirm} className="w-full sm:flex-1 px-4 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all text-base sm:text-lg order-1 sm:order-2">
                                Confirmar {matches.length} Jogo(s)
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
