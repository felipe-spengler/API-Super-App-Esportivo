
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { ArrowLeft, Shuffle, Save, Users } from 'lucide-react';
import api from '../../services/api';

// Mock Interfaces
interface Team {
    id: string;
    name: string;
    logo_url?: string;
}

interface Group {
    id: string;
    name: string;
    teams: Team[];
}

export function GroupDraw() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // State for Teams Pool (Unassigned)
    const [pool, setPool] = useState<Team[]>([]);

    // State for Groups
    const [groups, setGroups] = useState<Group[]>([]);

    useEffect(() => {
        loadTeams();
    }, [id]);

    async function loadTeams() {
        try {
            const response = await api.get(`/championships/${id}/teams`);
            const teamsData = Array.isArray(response.data) ? response.data : [];
            setPool(teamsData.map((t: any) => ({ ...t, id: String(t.id) })));
        } catch (err) {
            console.error("Failed to load teams", err);
            if (pool.length === 0) {
                const mockTeams = Array.from({ length: 16 }).map((_, i) => ({
                    id: `team-${i + 1}`,
                    name: `Equipe ${i + 1}`,
                }));
                // Only use mock if really needed or empty
                // setPool(mockTeams); 
            }
        }
    }

    // Format Helpers
    const handleCreateGroups = (count: number) => {
        const newGroups: Group[] = Array.from({ length: count }).map((_, i) => ({
            id: `group-${String.fromCharCode(65 + i)}`,
            name: `Grupo ${String.fromCharCode(65 + i)}`, // A, B, C...
            teams: []
        }));
        setGroups(newGroups);
    };

    const handleAutoDraw = () => {
        if (pool.length === 0 && groups.every(g => g.teams.length === 0)) return alert("Sem times para sortear.");

        // Reset
        const allTeams = [...pool, ...groups.flatMap(g => g.teams)];
        const shuffled = [...allTeams].sort(() => Math.random() - 0.5);

        const newGroups = [...groups];
        // Clear groups first
        newGroups.forEach(g => g.teams = []);

        // Distribute
        let groupIndex = 0;
        shuffled.forEach(team => {
            newGroups[groupIndex].teams.push(team);
            groupIndex = (groupIndex + 1) % newGroups.length;
        });

        setPool([]);
        setGroups(newGroups);
    };

    const handleSave = async () => {
        if (groups.length === 0) return alert("Defina os grupos primeiro.");
        if (pool.length > 0) {
            if (!confirm("Ainda há times sem grupo. Deseja prosseguir e deixá-los de fora?")) return;
        }

        setLoading(true);
        try {
            const customGroups = groups.map(g => g.teams.map(t => parseInt(t.id.replace('team-', '')) || parseInt(t.id)));

            await api.post(`/admin/championships/${id}/bracket/generate`, {
                format: 'groups',
                start_date: new Date().toISOString().split('T')[0],
                custom_groups: customGroups
            });

            alert('Chaveamento e Grupos salvos com sucesso!');
            navigate('/championships');
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar grupos.');
        } finally {
            setLoading(false);
        }
    };

    // Drag and Drop Logic
    const onDragEnd = (result: any) => {
        const { source, destination } = result;

        if (!destination) return;

        // Helper to find list by ID
        const getList = (id: string) => {
            if (id === 'pool') return pool;
            return groups.find(g => g.id === id)?.teams || [];
        };

        const setList = (id: string, list: Team[]) => {
            if (id === 'pool') setPool(list);
            else {
                setGroups(prev => prev.map(g => g.id === id ? { ...g, teams: list } : g));
            }
        };

        const sourceList = getList(source.droppableId);
        const destList = getList(destination.droppableId);

        const [movedItem] = sourceList.splice(source.index, 1);
        destList.splice(destination.index, 0, movedItem);

        // Update states - dirty way for simplicity (in prod use immutable patterns properly)
        // If source and dest are different, we need to update both
        if (source.droppableId === destination.droppableId) {
            setList(source.droppableId, sourceList); // sourceList already mutated
        } else {
            // Since we mutated the arrays returned by getList directly if they were references from state (which they are for groups teams, but pool is state), 
            // we need to be careful. The `groups` is an array of objects. 
            // Let's do a proper clean update to avoid React reconciliation bugs.

            // Re-calc specific lists
            if (source.droppableId === 'pool') setPool([...sourceList]);
            if (destination.droppableId === 'pool') setPool([...destList]);

            setGroups(prev => prev.map(g => {
                if (g.id === source.droppableId) return { ...g, teams: [...sourceList] };
                if (g.id === destination.droppableId) return { ...g, teams: [...destList] };
                return g;
            }));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-6 border-b border-gray-200">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Sorteio de Grupos</h1>
                            <p className="text-gray-500">Defina os grupos para a primeira fase.</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleAutoDraw}
                            className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-100 transition-colors"
                        >
                            <Shuffle className="w-5 h-5" /> Sorteio Automático
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20"
                        >
                            {loading ? <span className="loading loading-spinner loading-sm"></span> : <Save className="w-5 h-5" />}
                            Salvar Grupos
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">

                {/* Configuration Bar */}
                {groups.length === 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 text-center">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Quantos grupos este campeonato terá?</h3>
                        <div className="flex justify-center gap-4">
                            {[2, 4, 8].map(num => (
                                <button
                                    key={num}
                                    onClick={() => handleCreateGroups(num)}
                                    className="px-6 py-3 bg-gray-100 hover:bg-indigo-600 hover:text-white rounded-xl font-bold text-lg transition-all"
                                >
                                    {num} Grupos
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-8 items-start">

                        {/* Pool (Side Panel) */}
                        <div className="w-80 bg-white p-4 rounded-xl shadow-sm border border-gray-200 sticky top-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                    <Users className="w-5 h-5" /> Times Disponíveis
                                </h3>
                                <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{pool.length}</span>
                            </div>

                            <Droppable droppableId="pool">
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="bg-gray-50 p-2 rounded-lg min-h-[300px] max-h-[70vh] overflow-y-auto space-y-2 border border-gray-100"
                                    >
                                        {pool.map((team, index) => (
                                            <Draggable key={team.id} draggableId={team.id} index={index}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className="bg-white p-3 rounded shadow-sm border border-gray-200 flex items-center gap-2 hover:border-indigo-400 group"
                                                    >
                                                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                                                            {team.name.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-sm">{team.name}</span>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>

                        {/* Groups Grid */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                            {groups.map((group) => (
                                <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
                                        <h3 className="font-bold text-lg text-gray-800">{group.name}</h3>
                                        <span className="text-xs font-bold text-gray-400">{group.teams.length} Times</span>
                                    </div>

                                    <Droppable droppableId={group.id}>
                                        {(provided) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className="p-4 min-h-[200px] flex-1 bg-white"
                                            >
                                                {group.teams.length === 0 && (
                                                    <div className="h-full flex items-center justify-center text-gray-300 text-sm border-2 border-dashed border-gray-100 rounded-lg">
                                                        Arraste times aqui
                                                    </div>
                                                )}
                                                <div className="space-y-2">
                                                    {group.teams.map((team, index) => (
                                                        <Draggable key={team.id} draggableId={team.id} index={index}>
                                                            {(provided) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between group hover:border-indigo-500 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">
                                                                            {index + 1}
                                                                        </div>
                                                                        <span className="font-medium text-gray-800">{team.name}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                </div>
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            ))}
                        </div>

                    </div>
                </DragDropContext>
            </div>
        </div>
    );
}
