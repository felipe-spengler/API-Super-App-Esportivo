import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Plus, Trash2, Search, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { clsx } from 'clsx';

interface Team {
    id: number;
    name: string;
    city: string;
    logo_url?: string;
    pivot?: {
        captain_id?: number | null;
        category_id?: number | null;
    };
    captain?: {
        id: number;
        name: string;
    };
}

export function AdminTeamChampionshipManager() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [championship, setChampionship] = useState<any>(null);
    const [championshipTeams, setChampionshipTeams] = useState<Team[]>([]);
    const [allTeams, setAllTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [addingTeamId, setAddingTeamId] = useState<number | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [loadingTeams, setLoadingTeams] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    useEffect(() => {
        if (championship) {
            loadTeamsForCategory(selectedCategoryId);
        }
    }, [selectedCategoryId]);

    async function loadData() {
        try {
            setLoading(true);
            const [campRes, allTeamsRes] = await Promise.all([
                api.get(`/championships/${id}`),
                api.get('/admin/teams')
            ]);

            const champ = campRes.data;
            setChampionship(champ);

            const aTeams = Array.isArray(allTeamsRes.data) ? allTeamsRes.data : (allTeamsRes.data.data || []);
            setAllTeams(aTeams);

            if (champ.categories && champ.categories.length > 0) {
                setSelectedCategoryId(champ.categories[0].id);
            } else {
                loadTeamsForCategory(null);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function loadTeamsForCategory(catId: number | null) {
        try {
            setLoadingTeams(true);
            const query = catId ? `?category_id=${catId}` : '';
            const campTeamsRes = await api.get(`/championships/${id}/teams${query}`);
            const cTeams = Array.isArray(campTeamsRes.data) ? campTeamsRes.data : (campTeamsRes.data.data || []);
            setChampionshipTeams(cTeams);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingTeams(false);
        }
    }

    async function handleAddTeam(teamId: number) {
        try {
            setAddingTeamId(teamId);
            await api.post(`/admin/teams/${teamId}/add-to-championship`, {
                championship_id: id,
                category_id: selectedCategoryId
            });
            loadTeamsForCategory(selectedCategoryId);
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Erro ao adicionar time ao campeonato.');
        } finally {
            setAddingTeamId(null);
        }
    }

    async function handleRemoveTeam(teamId: number) {
        if (!confirm('Deseja remover este time desta categoria do campeonato?')) return;

        try {
            await api.post(`/admin/teams/${teamId}/remove-from-championship`, {
                championship_id: id,
                category_id: selectedCategoryId
            });
            loadTeamsForCategory(selectedCategoryId);
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Erro ao remover time do campeonato.');
        }
    }

    const filteredAvailableTeams = allTeams.filter(team => {
        const alreadyIn = championshipTeams.some(ct => ct.id === team.id);
        const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase());
        return !alreadyIn && matchesSearch;
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center gap-4 mb-4">
                <button onClick={() => navigate(`/admin/championships/${id}`)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gerenciar Equipes do Campeonato</h1>
                    <p className="text-gray-500">{championship?.name} • Controle os times participantes.</p>
                </div>
            </div>

            {championship && championship.categories && championship.categories.length > 0 && (
                <div className="mb-8 overflow-x-auto pb-2">
                    <div className="flex items-center gap-2 border-b border-gray-200 min-w-max px-1">
                        {championship.categories.map((cat: any) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={clsx(
                                    "px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap",
                                    selectedCategoryId === cat.id
                                        ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50/50"
                                )}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Times no Campeonato */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 px-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        Equipes Confirmadas ({loadingTeams ? '...' : championshipTeams.length})
                    </h2>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y overflow-hidden">
                        {championshipTeams.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 italic">
                                Nenhuma equipe inscrita neste campeonato ainda.
                            </div>
                        ) : (
                            championshipTeams.map(team => (
                                <div key={team.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border">
                                            {team.logo_url ? (
                                                <img src={team.logo_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Shield className="w-5 h-5 text-gray-300" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{team.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-gray-500">{team.city || 'Cidade não informada'}</p>
                                                {team.pivot?.captain_id && (
                                                    <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-amber-100">
                                                        <Shield className="w-2.5 h-2.5" />
                                                        Líder vinculado
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => navigate(`/admin/teams/${team.id}`, { state: { fromChampionshipId: id } })}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                                            title="Gerenciar Jogadores"
                                        >
                                            <Users className="w-4 h-4" />
                                            <span className="hidden sm:inline">Jogadores</span>
                                        </button>
                                        <button
                                            onClick={() => handleRemoveTeam(team.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remover do campeonato"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Adicionar Times */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 px-2">
                        <Plus className="w-5 h-5 text-indigo-500" />
                        Adicionar Equipes Existentes
                    </h2>

                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar times cadastrados..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                        />
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y overflow-hidden max-h-[600px] overflow-y-auto">
                        {filteredAvailableTeams.length === 0 ? (
                            <div className="p-12 text-center text-gray-400">
                                {searchTerm ? 'Nenhuma equipe encontrada para esta busca.' : 'Todas as equipes já estão no campeonato.'}
                            </div>
                        ) : (
                            filteredAvailableTeams.map(team => (
                                <div key={team.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border">
                                            {team.logo_url ? (
                                                <img src={team.logo_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <Shield className="w-5 h-5 text-gray-300" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{team.name}</p>
                                            <p className="text-xs text-gray-500">{team.city}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleAddTeam(team.id)}
                                        disabled={addingTeamId === team.id}
                                        className="flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg transition-all text-xs font-bold disabled:opacity-50"
                                    >
                                        {addingTeamId === team.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Plus className="w-3 h-3" />
                                        )}
                                        Adicionar
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                        <p className="text-sm text-indigo-700 font-medium mb-3">Não encontrou o time desejado?</p>
                        <button
                            onClick={() => navigate('/admin/teams/new')}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            Cadastrar Novo Time Geral
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
