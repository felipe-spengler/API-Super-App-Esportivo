import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    ArrowLeft, Trophy, Users, Loader2, Shuffle, Play, Plus, X, Save,
    AlertTriangle, ChevronRight, Trash2
} from 'lucide-react';
import api from '../../services/api';

interface Team {
    id: number;
    name: string;
    logo_url?: string;
    logo_path?: string;
}

interface GroupData {
    [key: string]: Team[];
}

export function AdminGroupManager() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const selectedCategoryId = searchParams.get('category_id');
    
    const [championship, setChampionship] = useState<any>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [numGroups, setNumGroups] = useState(2);
    const [availableGroupNames, setAvailableGroupNames] = useState<string[]>(['A', 'B']);
    const [groupAssignments, setGroupAssignments] = useState<Record<string, string>>({});
    const [ungroupedTeams, setUngroupedTeams] = useState<Team[]>([]);
    const [hasMatches, setHasMatches] = useState(false);
    const [showConfirmRemove, setShowConfirmRemove] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [id, selectedCategoryId]);

    async function loadData() {
        if (!id) return;
        
        setLoading(true);
        setUngroupedTeams([]); // Reset antes de recarregar para evitar acúmulo
        try {
            // Load championship
            const champRes = await api.get(`/championships/${id}`);
            setChampionship(champRes.data);

            // Load teams
            let teamsUrl = `/championships/${id}/teams`;
            if (selectedCategoryId) {
                teamsUrl += `?category_id=${selectedCategoryId}`;
            }
            const teamsRes = await api.get(teamsUrl);
            setTeams(teamsRes.data);

            // Load groups
            let groupsUrl = `/admin/championships/${id}/groups`;
            if (selectedCategoryId) {
                groupsUrl += `?category_id=${selectedCategoryId}`;
            }
            const groupsRes = await api.get(groupsUrl).catch(() => ({ data: { groups: {}, ungrouped: [] } }));
            
            const groupsData: GroupData = groupsRes.data.groups || {};
            const ungrouped: Team[] = groupsRes.data.ungrouped || [];
            
            // Build assignments from groups
            const assignments: Record<string, string> = {};
            const activeGroupNames = new Set<string>();
            
            Object.entries(groupsData).forEach(([gName, groupTeams]) => {
                activeGroupNames.add(gName);
                (groupTeams as Team[]).forEach(team => {
                    assignments[team.id] = gName;
                });
            });
            
            // Set ungrouped teams em uma única operação
            setUngroupedTeams(ungrouped.filter((team: Team) => !assignments[team.id]));
            
            setGroupAssignments(assignments);
            
            // Update group names based on existing groups
            const sortedGroupNames = Array.from(activeGroupNames).sort();
            if (sortedGroupNames.length > 0) {
                setAvailableGroupNames(sortedGroupNames);
                setNumGroups(sortedGroupNames.length);
            }
            
            // Check if there are matches
            let matchesUrl = `/admin/matches?championship_id=${id}`;
            if (selectedCategoryId) {
                matchesUrl += `&category_id=${selectedCategoryId}`;
            }
            const matchesRes = await api.get(matchesUrl);
            setHasMatches(matchesRes.data.length > 0);

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    }

    function handleAutoDistribute() {
        const shuffled = [...teams].sort(() => Math.random() - 0.5);
        const newAssignments: Record<string, string> = {};
        
        shuffled.forEach((team, index) => {
            const groupIndex = index % numGroups;
            newAssignments[team.id] = availableGroupNames[groupIndex];
        });
        
        setGroupAssignments(newAssignments);
    }

    async function handleSaveGroups() {
        if (!id) return;
        
        setSaving(true);
        try {
            // Build payload: { "A": [id1, id2], "B": [id3, id4] }
            const groupsPayload: Record<string, number[]> = {};
            
            // Initialize all groups
            availableGroupNames.forEach(name => {
                groupsPayload[name] = [];
            });
            
            // Assign teams to groups
            Object.entries(groupAssignments).forEach(([teamId, groupName]) => {
                if (groupsPayload[groupName]) {
                    groupsPayload[groupName].push(parseInt(teamId));
                }
            });
            
            let url = `/admin/championships/${id}/groups`;
            if (selectedCategoryId) {
                url += `?category_id=${selectedCategoryId}`;
            }
            
            await api.post(url, { groups: groupsPayload });
            
            alert('Grupos salvos com sucesso!');
            navigate(`/admin/championships/${id}?category_id=${selectedCategoryId || ''}`);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Erro ao salvar grupos');
        } finally {
            setSaving(false);
        }
    }

    function removeGroup(groupName: string) {
        if (numGroups <= 1) {
            alert('É necessário manter pelo menos 1 grupo.');
            return;
        }
        
        // Move teams from removed group to first available group
        const newAssignments = { ...groupAssignments };
        const firstAvailableGroup = availableGroupNames.find(g => g !== groupName);
        
        Object.entries(newAssignments).forEach(([teamId, gName]) => {
            if (gName === groupName && firstAvailableGroup) {
                newAssignments[teamId] = firstAvailableGroup;
            }
        });
        
        setGroupAssignments(newAssignments);
        setAvailableGroupNames(prev => prev.filter(g => g !== groupName));
        setNumGroups(prev => prev - 1);
    }

    function addGroup() {
        const nextChar = String.fromCharCode(65 + availableGroupNames.length);
        setAvailableGroupNames(prev => [...prev, nextChar]);
        setNumGroups(prev => prev + 1);
    }

    function moveTeamToGroup(teamId: number | string, groupName: string) {
        setGroupAssignments(prev => ({ ...prev, [teamId]: groupName }));
        setUngroupedTeams(prev => prev.filter(t => t.id !== teamId));
    }

    function removeTeamFromGroup(teamId: number | string) {
        const newAssignments = { ...groupAssignments };
        const team = teams.find(t => t.id === teamId);
        delete newAssignments[teamId];
        setGroupAssignments(newAssignments);
        if (team) {
            setUngroupedTeams(prev => [...prev, team]);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-4" />
                    <p className="text-gray-500">Carregando dados...</p>
                </div>
            </div>
        );
    }

    if (!championship) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Campeonato não encontrado.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-6 md:py-6">
                <div className="max-w-6xl mx-auto">
                    <button 
                        onClick={() => navigate(`/admin/championships/${id}${selectedCategoryId ? `?category_id=${selectedCategoryId}` : ''}`)} 
                        className="flex items-center text-gray-400 hover:text-gray-900 mb-4 transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Voltar para o Campeonato
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100">
                                {championship.logo_url ? (
                                    <img src={championship.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <Trophy className="w-6 h-6 md:w-7 md:h-7" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-gray-900">Gerenciar Grupos</h1>
                                <p className="text-xs md:text-sm text-gray-500">
                                    {championship.name}
                                    {selectedCategoryId && <span className="text-indigo-600 ml-2">• Categoria selecionada</span>}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {hasMatches && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="font-medium">Jogos já foram criados</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
                {teams.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
                            <Users className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Nenhum time inscrito</h2>
                        <p className="text-gray-500 mb-6">Inscreva times no campeonato antes de gerenciar os grupos.</p>
                        <Link
                            to={`/admin/championships/${id}/teams${selectedCategoryId ? `?category_id=${selectedCategoryId}` : ''}`}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                        >
                            <Users className="w-5 h-5" />
                            Gerenciar Times
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Auto-Distribution Controls */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
                                        <Shuffle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Sorteio Automático</h3>
                                        <p className="text-sm text-gray-500">Defina a quantidade de grupos e o sistema distribui os times automaticamente.</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Qtd. Grupos:</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={16}
                                            value={numGroups}
                                            onChange={(e) => {
                                                const newNum = parseInt(e.target.value) || 1;
                                                setNumGroups(newNum);
                                                // Adjust available group names
                                                const newNames: string[] = [];
                                                for (let i = 0; i < newNum; i++) {
                                                    newNames.push(String.fromCharCode(65 + i));
                                                }
                                                setAvailableGroupNames(newNames);
                                            }}
                                            className="w-14 bg-transparent font-bold text-gray-900 outline-none text-center text-lg"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Isso irá redistribuir todos os times nos grupos atuais. Confirmar?')) {
                                                handleAutoDistribute();
                                            }
                                        }}
                                        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
                                    >
                                        <Play size={18} fill="currentColor" />
                                        Sortear Times
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Groups Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-600" />
                                Grupos ({teams.length} times)
                            </h2>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                    {Object.keys(groupAssignments).length} times em grupos
                                </span>
                                <button
                                    onClick={addGroup}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors"
                                >
                                    <Plus size={16} /> Adicionar Grupo
                                </button>
                            </div>
                        </div>

                        {/* Groups Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Ungrouped Teams */}
                            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-5">
                                <h4 className="font-bold text-gray-500 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" /> 
                                    Sem Grupo ({ungroupedTeams.length})
                                </h4>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {ungroupedTeams.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 text-sm">
                                            {teams.length === Object.keys(groupAssignments).length ? (
                                                <span className="text-emerald-500 font-medium">✓ Todos os times estão em grupos!</span>
                                            ) : (
                                                "Nenhum time disponível"
                                            )}
                                        </div>
                                    ) : (
                                        ungroupedTeams.map(team => (
                                            <div key={team.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                                                            {team.logo_url || team.logo_path ? (
                                                                <img src={team.logo_url || team.logo_path} className="w-full h-full object-cover" alt="" />
                                                            ) : (
                                                                <Users className="w-4 h-4 text-gray-400" />
                                                            )}
                                                        </div>
                                                        <span className="font-medium text-gray-700 text-sm truncate max-w-[120px]">{team.name}</span>
                                                    </div>
                                                    <select
                                                        className="text-xs bg-indigo-50 border border-indigo-200 rounded px-2 py-1 font-bold text-indigo-600 outline-none"
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                moveTeamToGroup(team.id, e.target.value);
                                                            }
                                                        }}
                                                        value=""
                                                    >
                                                        <option value="">+ Atribuir</option>
                                                        {availableGroupNames.map(g => (
                                                            <option key={g} value={g}>Grupo {g}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Group Columns */}
                            {availableGroupNames.map(groupName => {
                                const groupTeams = teams.filter(t => groupAssignments[t.id] === groupName);
                                
                                return (
                                    <div key={groupName} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                                                    {groupName}
                                                </div>
                                                <h4 className="font-bold text-gray-800">Grupo {groupName}</h4>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                                                    {groupTeams.length} times
                                                </span>
                                                {availableGroupNames.length > 1 && (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(`Remover Grupo ${groupName}? Os times serão movidos para outro grupo.`)) {
                                                                removeGroup(groupName);
                                                            }
                                                        }}
                                                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                        title="Remover grupo"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 space-y-2 max-h-[350px] overflow-y-auto">
                                            {groupTeams.length === 0 ? (
                                                <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
                                                    Nenhum time neste grupo
                                                </div>
                                            ) : (
                                                groupTeams.map(team => (
                                                    <div key={team.id} className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                                                                    {team.logo_url || team.logo_path ? (
                                                                        <img src={team.logo_url || team.logo_path} className="w-full h-full object-cover" alt="" />
                                                                    ) : (
                                                                        <Users className="w-4 h-4 text-gray-400" />
                                                                    )}
                                                                </div>
                                                                <span className="font-medium text-gray-700 text-sm truncate max-w-[140px]">{team.name}</span>
                                                            </div>
                                                            <button
                                                                onClick={() => removeTeamFromGroup(team.id)}
                                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                                title="Remover do grupo"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                            <Link
                                to={`/admin/championships/${id}${selectedCategoryId ? `?category_id=${selectedCategoryId}` : ''}`}
                                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all"
                            >
                                Cancelar
                            </Link>
                            <button
                                onClick={handleSaveGroups}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Salvar Grupos
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
