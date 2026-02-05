import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Trophy, Save, Plus, Trash2, CheckCircle, AlertCircle, List, Edit2, X, MapPin, Clock as ClockIcon, Loader2, Play, Printer, Users } from 'lucide-react';
import api from '../../services/api';

interface Match {
    id: number;
    home_team: { name: string; logo_url?: string };
    away_team: { name: string; logo_url?: string };
    home_score: number | null;
    away_score: number | null;
    home_penalty_score?: number | null;
    away_penalty_score?: number | null;
    start_time: string;
    round_number: number;
    status: 'scheduled' | 'finished' | 'live' | 'canceled';
    location?: string;
    group_name?: string;
}

export function AdminMatchManager() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [matches, setMatches] = useState<Match[]>([]);
    const [teams, setTeams] = useState<any[]>([]); // Added teams state
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [championship, setChampionship] = useState<any>(null);
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({ start_time: '', location: '', round_number: 1, category_id: null as number | null });
    const [showAddModal, setShowAddModal] = useState(false);
    const [newData, setNewData] = useState({ home_team_id: '', away_team_id: '', start_time: '', location: '', round_number: 1 });

    // Arbitration Modal State
    const [isArbitrationOpen, setIsArbitrationOpen] = useState(false);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [arbitrationData, setArbitrationData] = useState({ referee: '', assistant1: '', assistant2: '' });
    const [savingArbitration, setSavingArbitration] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'no-category' | null>(null);
    const [legs, setLegs] = useState(1); // Number of times teams play each other (1 = single round, 2 = home & away)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
    const [isGeneratingKnockout, setIsGeneratingKnockout] = useState(false);


    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            // Load championship and teams in parallel
            const [campRes, teamsRes] = await Promise.all([
                api.get(`/championships/${id}`),
                api.get(`/championships/${id}/teams`)
            ]);

            const champ = campRes.data;
            setChampionship(champ);

            // Handle teams response (could be array or paginated object)
            const loadedTeams = Array.isArray(teamsRes.data) ? teamsRes.data : (teamsRes.data.data || []);
            setTeams(loadedTeams);

            // Determine category to use
            let categoryToUse = selectedCategoryId;

            // 1. Try from URL
            const urlCategoryId = searchParams.get('category_id');
            if (urlCategoryId) {
                categoryToUse = urlCategoryId === 'null' ? 'no-category' : parseInt(urlCategoryId);
            }

            // 2. If still null, default to first category if available
            if (!categoryToUse && champ.categories && champ.categories.length > 0) {
                categoryToUse = champ.categories[0].id;
            }

            setSelectedCategoryId(categoryToUse);

            let url = `/admin/matches?championship_id=${id}`;
            if (categoryToUse === 'no-category') {
                url += '&category_id=null';
            } else if (categoryToUse) {
                url += `&category_id=${categoryToUse}`;
            }

            const matchesRes = await api.get(url);
            setMatches(matchesRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    // Effect to reload matches when category changes
    useEffect(() => {
        if (id && championship) {
            // Update URL without reloading page to reflect state (optional but good for UX)
            const newUrl = new URL(window.location.href);
            if (selectedCategoryId === 'no-category') {
                newUrl.searchParams.set('category_id', 'null');
            } else if (selectedCategoryId) {
                newUrl.searchParams.set('category_id', selectedCategoryId.toString());
            } else {
                newUrl.searchParams.delete('category_id');
            }
            window.history.replaceState({}, '', newUrl.toString());

            loadMatches();
        }
    }, [selectedCategoryId]);

    async function loadMatches() {
        try {
            let url = `/admin/matches?championship_id=${id}`;

            // Three cases:
            // 1. null = show all matches
            // 2. 'no-category' = show only matches without category
            // 3. number = show matches of specific category
            if (selectedCategoryId === 'no-category') {
                url += '&category_id=null';
            } else if (selectedCategoryId) {
                url += `&category_id=${selectedCategoryId}`;
            }

            const res = await api.get(url);
            setMatches(res.data);
        } catch (error) {
            console.error(error);
        }
    }

    async function handleGenerate(format: string) {
        if (!confirm("Isso irá gerar a tabela de jogos com os times inscritos. Deseja continuar?")) return;

        setGenerating(true);
        try {
            const data = await api.post(`/admin/championships/${id}/bracket/generate`, {
                format: format, // 'league', 'knockout'
                start_date: championship.start_date,
                match_interval_days: 7,
                category_id: selectedCategoryId,
                legs: legs
            });
            const res = data.data;
            alert(`Tabela gerada com sucesso!\n\nForam criados ${res.matches_created} jogos para ${res.teams_count} equipes:\n${res.teams_list?.join(', ') || ''}`);
            loadData();
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'Erro ao gerar tabela.');
        } finally {
            setGenerating(false);
        }
    }

    async function updateScore(match_id: number, home: string, away: string) {
        try {
            await api.post(`/admin/matches/${match_id}/finish`, {
                home_score: parseInt(home),
                away_score: parseInt(away)
            });
            // Update local state without reload
            setMatches(prev => prev.map(m => m.id === match_id ? { ...m, home_score: parseInt(home), away_score: parseInt(away), status: 'finished' } : m));
        } catch (err) {
            alert('Erro ao salvar placar.');
        }
    }

    const openEditModal = (match: Match) => {
        setSelectedMatch(match);
        // Format date for datetime-local input
        const date = new Date(match.start_time);

        // Adjust for timezone offset to show correct local time in input
        const timezoneOffset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - timezoneOffset);
        const formattedDate = localDate.toISOString().slice(0, 16);

        setEditData({
            start_time: formattedDate,
            location: match.location || '',
            round_number: match.round_number || 1,
            category_id: (match as any).category_id || null
        });
        setShowEditModal(true);
    };

    const toUTCString = (localDateString: string) => {
        if (!localDateString) return '';
        const date = new Date(localDateString);
        return date.toISOString().slice(0, 16);
    };

    const handleSaveAdd = async () => {
        if (!newData.home_team_id || !newData.away_team_id || !newData.start_time) {
            alert('Preencha os campos obrigatórios.');
            return;
        }
        try {
            await api.post('/admin/matches', {
                ...newData,
                start_time: toUTCString(newData.start_time),
                championship_id: id,
                category_id: selectedCategoryId
            });
            alert('Jogo criado com sucesso!');
            setShowAddModal(false);
            loadMatches();
        } catch (err) {
            alert('Erro ao criar jogo.');
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedMatch) return;
        try {
            // Using PUT to match common Laravel convention
            await api.put(`/admin/matches/${selectedMatch.id}`, {
                start_time: toUTCString(editData.start_time),
                location: editData.location,
                round_number: editData.round_number,
                category_id: editData.category_id
            });
            alert('Jogo atualizado com sucesso!');
            setShowEditModal(false);
            loadData();
        } catch (err) {
            alert('Erro ao atualizar jogo.');
        }
    };

    const handleDeleteMatch = async (matchId: number) => {
        if (!confirm('Tem certeza que deseja excluir este confronto?')) return;

        try {
            await api.delete(`/admin/matches/${matchId}`);
            alert('Confronto excluído com sucesso!');
            loadMatches();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir confronto.');
        }
    };

    const openArbitration = (match: any) => {
        setSelectedMatch(match);
        // Pre-fill if exists
        const currentRef = match.match_details?.arbitration || {};
        setArbitrationData({
            referee: currentRef.referee || '',
            assistant1: currentRef.assistant1 || '',
            assistant2: currentRef.assistant2 || ''
        });
        setIsArbitrationOpen(true);
    };

    const handleConfirmArbitration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMatch) return;

        try {
            setSavingArbitration(true);
            // Save to backend
            await api.put(`/admin/matches/${selectedMatch.id}`, {
                arbitration: arbitrationData
            });

            // Close and navigate
            setIsArbitrationOpen(false);
            navigateToSumula(selectedMatch.id, championship?.sport?.slug);
        } catch (error) {
            console.error("Erro ao salvar arbitragem", error);
            alert("Erro ao salvar dados.");
        } finally {
            setSavingArbitration(false);
        }
    };

    const navigateToSumula = (matchId: number, sportSlug: string) => {
        let sumulaPath = `/admin/matches/${matchId}/sumula`;

        if (sportSlug === 'volei') sumulaPath = `/admin/matches/${matchId}/sumula-volei`;
        else if (sportSlug === 'futsal') sumulaPath = `/admin/matches/${matchId}/sumula-futsal`;
        else if (sportSlug === 'basquete') sumulaPath = `/admin/matches/${matchId}/sumula-basquete`;
        else if (sportSlug === 'handebol') sumulaPath = `/admin/matches/${matchId}/sumula-handebol`;
        else if (sportSlug === 'beach-tennis') sumulaPath = `/admin/matches/${matchId}/sumula-beach-tennis`;
        else if (sportSlug === 'futebol-7') sumulaPath = `/admin/matches/${matchId}/sumula-futebol7`;
        else if (sportSlug === 'futevolei') sumulaPath = `/admin/matches/${matchId}/sumula-futevolei`;
        else if (sportSlug === 'volei-de-praia') sumulaPath = `/admin/matches/${matchId}/sumula-volei-praia`;
        else if (sportSlug === 'tenis-de-mesa') sumulaPath = `/admin/matches/${matchId}/sumula-tenis-mesa`;
        else if (sportSlug === 'jiu-jitsu') sumulaPath = `/admin/matches/${matchId}/sumula-jiu-jitsu`;

        navigate(sumulaPath);
    };

    const openMatchSumula = (match: any) => {
        setSelectedMatch(match);
        if (match.status === 'finished') {
            setIsSummaryOpen(true);
            return;
        }

        // Se já tem árbitro, vai direto
        if (match.match_details?.arbitration?.referee) {
            navigateToSumula(match.id, championship?.sport?.slug);
            return;
        }

        openArbitration(match);
    };

    // Group matches by round and sort them by date
    const rounds = matches.reduce((acc, match) => {
        const round = match.round_number || 1;
        if (!acc[round]) acc[round] = [];
        acc[round].push(match);
        return acc;
    }, {} as Record<number, Match[]>);

    // Sort matches within each round
    Object.keys(rounds).forEach(round => {
        rounds[Number(round)].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    });



    const handleGenerateFromGroups = async () => {
        if (!window.confirm("Isso calculará a classificação dos grupos e gerará automaticamente os jogos da próxima fase (mata-mata). Deseja continuar?")) {
            return;
        }
        setIsGeneratingKnockout(true);
        try {
            const response = await api.post(`/championships/${id}/bracket/generate-from-groups`, {
                category_id: selectedCategoryId === 'no-category' ? null : selectedCategoryId
            });
            alert(`Sucesso! ${response.data.matches?.length || 0} jogos gerados.`);
            loadData(); // Reusing loadData instead of loadMatches which doesn't exist
        } catch (error: any) {
            console.error("Erro ao gerar mata-mata", error);
            alert(error.response?.data?.message || "Erro ao gerar mata-mata.");
        } finally {
            setIsGeneratingKnockout(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Carregando...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-6 border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(`/admin/championships/${id}`)} className="p-2 hover:bg-gray-100 rounded-full">
                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Gerenciar Jogos</h1>
                            <p className="text-gray-500">{championship?.name}</p>

                        </div>
                    </div>
                    {/* Botão para Encerrar Grupos -> Gerar Mata-mata */}
                    {(championship?.format === 'groups' || championship?.format === 'group_knockout') && matches.length > 0 && (
                        <button
                            onClick={handleGenerateFromGroups}
                            disabled={isGeneratingKnockout}
                            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all shadow-sm text-sm font-bold disabled:opacity-50 mx-2"
                            title="Calcula classificação e gera próxima fase"
                        >
                            {isGeneratingKnockout ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                            <span className="hidden sm:inline">Gerar Mata-mata</span>
                        </button>
                    )}
                    {(matches.length > 0 || teams.length > 0) && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    const maxRound = matches.length > 0 ? Math.max(...matches.map(m => m.round_number || 1)) : 0;
                                    setNewData({
                                        home_team_id: '',
                                        away_team_id: '',
                                        start_time: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                                        location: championship?.location || '',
                                        round_number: maxRound + 1
                                    });
                                    setShowAddModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" /> Nova Rodada (+{matches.length > 0 ? Math.max(...matches.map(m => m.round_number || 1)) + 1 : 1})
                            </button>

                            <button
                                onClick={() => {
                                    setNewData({
                                        home_team_id: '',
                                        away_team_id: '',
                                        start_time: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                                        location: championship?.location || '',
                                        round_number: 1
                                    });
                                    setShowAddModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" /> Novo Jogo Avulso
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-6">
                {/* Category Selector */}
                {championship?.categories && championship.categories.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-6">
                        <button
                            onClick={() => setSelectedCategoryId(null)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase whitespace-nowrap transition-all border-2 ${selectedCategoryId === null
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300 hover:text-gray-600'
                                }`}
                        >
                            Todos
                        </button>

                        {championship.categories.map((cat: any) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold uppercase whitespace-nowrap transition-all border-2 ${selectedCategoryId === cat.id
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                    : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300 hover:text-gray-600'
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}



                {/* Empty State / Generator */}
                {matches.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center border border-gray-200 shadow-sm">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Calendar className="w-10 h-10 text-indigo-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Nenhum jogo criado ainda</h2>
                        <p className="text-gray-500 max-w-md mx-auto mb-8">
                            {championship?.format
                                ? `O campeonato está configurado como "${championship.format}". Clique no botão abaixo para gerar a tabela de jogos automaticamente ou crie jogos manualmente.`
                                : "O campeonato ainda não possui partidas. Configure o formato nas configurações do campeonato ou adicione jogos manualmente."}
                        </p>

                        <div className="flex flex-col md:flex-row gap-4 justify-center">
                            {championship?.format && (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                        <label className="text-sm font-bold text-gray-600">Confrontos por adversário:</label>
                                        <select
                                            value={legs}
                                            onChange={(e) => setLegs(parseInt(e.target.value))}
                                            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-bold"
                                        >
                                            <option value={1}>1 (Turno Único)</option>
                                            <option value={2}>2 (Ida e Volta)</option>
                                            <option value={3}>3 Turnos</option>
                                            <option value={4}>4 Turnos</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => handleGenerate(championship.format)}
                                        disabled={generating}
                                        className="px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                                    >
                                        {generating ? 'Gerando...' : 'Gerar Tabela de Jogos'}
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setNewData({
                                        home_team_id: '',
                                        away_team_id: '',
                                        start_time: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                                        location: championship?.location || '',
                                        round_number: 1
                                    });
                                    setShowAddModal(true);
                                }}
                                className="px-8 py-4 bg-white border-2 border-indigo-600 text-indigo-600 font-bold text-lg rounded-lg hover:bg-indigo-50 transition-all"
                            >
                                Criar Primeiro Jogo
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(rounds).sort((a, b) => Number(a[0]) - Number(b[0])).map(([round, roundMatches]) => {
                            // Group matches by group_name within the round
                            const matchesByGroup = roundMatches.reduce((acc, match) => {
                                const group = match.group_name || 'Unico';
                                if (!acc[group]) acc[group] = [];
                                acc[group].push(match);
                                return acc;
                            }, {} as Record<string, Match[]>);

                            const sortedGroups = Object.keys(matchesByGroup).sort();
                            const hasMultipleGroups = sortedGroups.length > 1 || sortedGroups[0] !== 'Unico';

                            return (
                                <div key={round} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-gray-800 text-lg">Rodada {round}</h3>
                                            <span className="text-[10px] font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded-full uppercase tracking-wider">{roundMatches.length} JOGOS</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setNewData({
                                                    home_team_id: '',
                                                    away_team_id: '',
                                                    start_time: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                                                    location: championship?.location || '',
                                                    round_number: Number(round)
                                                });
                                                setShowAddModal(true);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 text-xs font-bold uppercase transition-all shadow-sm"
                                        >
                                            <Plus className="w-3 h-3" /> Adicionar Jogo Nesta Rodada
                                        </button>
                                    </div>

                                    <div>
                                        {sortedGroups.map(groupName => (
                                            <div key={groupName}>
                                                {hasMultipleGroups && (
                                                    <div className="px-6 py-2 bg-indigo-50/50 border-b border-indigo-100 font-bold text-indigo-800 text-sm flex items-center gap-2">
                                                        <Users className="w-4 h-4" /> {groupName.includes('Grupo') ? groupName : `Grupo ${groupName}`}
                                                    </div>
                                                )}

                                                {matchesByGroup[groupName].map((match) => (
                                                    <div key={match.id} className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                                                            {/* Date / Location */}
                                                            <div className="w-full md:w-40 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start border-b md:border-b-0 pb-2 md:pb-0 mb-2 md:mb-0">
                                                                <div>
                                                                    <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                                                                        <Calendar size={12} /> {new Date(match.start_time).toLocaleDateString('pt-BR')}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                                        <ClockIcon size={12} /> {new Date(match.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>
                                                                {match.location && (
                                                                    <div className="text-[10px] text-gray-400 flex items-center gap-1 truncate max-w-[120px] md:max-w-[150px] bg-gray-50 px-2 py-1 rounded md:bg-transparent md:p-0">
                                                                        <MapPin size={10} /> {match.location}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Scoreboard */}
                                                            <div className="flex flex-row items-center gap-2 md:gap-4 flex-1 justify-center w-full px-2">
                                                                {/* Home Team */}
                                                                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-center md:text-right flex-1 justify-center md:justify-end">
                                                                    <div className="order-1 md:order-2">
                                                                        {match.home_team?.logo_url ? (
                                                                            <img src={match.home_team.logo_url} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white shadow-sm border p-0.5" />
                                                                        ) : (
                                                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-dashed">T1</div>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[11px] md:text-sm font-bold text-gray-900 order-2 md:order-1 truncate max-w-[80px] md:max-w-none">
                                                                        {match.home_team?.name || 'Time A'}
                                                                    </span>
                                                                </div>

                                                                {/* Score */}
                                                                <div className="flex flex-col items-center">
                                                                    <div className="flex items-center gap-2 md:gap-4 bg-white px-3 md:px-6 py-1.5 md:py-2 rounded-xl border border-gray-200 shadow-sm min-w-[90px] md:min-w-[120px] justify-center">
                                                                        <span className={`text-xl md:text-2xl font-black ${match.home_score !== null ? 'text-gray-900' : 'text-gray-300'}`}>
                                                                            {match.home_score ?? 0}
                                                                        </span>
                                                                        <span className="text-gray-300 font-bold text-[10px]">X</span>
                                                                        <span className={`text-xl md:text-2xl font-black ${match.away_score !== null ? 'text-gray-900' : 'text-gray-300'}`}>
                                                                            {match.away_score ?? 0}
                                                                        </span>
                                                                    </div>
                                                                    {(match.home_penalty_score != null || match.away_penalty_score != null) && (match.home_penalty_score > 0 || match.away_penalty_score > 0) && (
                                                                        <span className="text-[10px] font-bold text-gray-500 mt-1">
                                                                            ({match.home_penalty_score} x {match.away_penalty_score} Pen.)
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Away Team */}
                                                                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-center md:text-left flex-1 justify-center md:justify-start">
                                                                    <div className="">
                                                                        {match.away_team?.logo_url ? (
                                                                            <img src={match.away_team.logo_url} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white shadow-sm border p-0.5" />
                                                                        ) : (
                                                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-dashed">T2</div>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[11px] md:text-sm font-bold text-gray-900 truncate max-w-[80px] md:max-w-none">
                                                                        {match.away_team?.name || 'Time B'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="w-full md:w-auto flex justify-around md:justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
                                                                <button
                                                                    onClick={() => openMatchSumula(match)}
                                                                    className={`flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all border ${match.status === 'finished' ? 'text-green-600 bg-green-50 border-green-100' : 'text-indigo-600 bg-indigo-50 border-indigo-100'}`}
                                                                >
                                                                    {match.status === 'finished' ? <CheckCircle className="w-4 h-4" /> : <List className="w-4 h-4" />}
                                                                    <span className="text-[10px] font-bold uppercase md:hidden">{match.status === 'finished' ? 'Resumo' : 'Súmula'}</span>
                                                                </button>

                                                                <button
                                                                    onClick={() => openEditModal(match)}
                                                                    className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg transition-all"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                    <span className="text-[10px] font-bold uppercase md:hidden">Editar</span>
                                                                </button>

                                                                <button
                                                                    onClick={() => handleDeleteMatch(match.id)}
                                                                    className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 text-red-500 bg-red-50 border border-red-200 rounded-lg transition-all hover:bg-red-100"
                                                                    title="Excluir Confronto"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    <span className="text-[10px] font-bold uppercase md:hidden">Excluir</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {showEditModal && selectedMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Editar Jogo</h3>
                            <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
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

                            {/* Category selection removed as per user request (teams belong to categories) */}

                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    O placar deve ser alterado através da <strong>Súmula Digital</strong> para garantir a consistência das estatísticas.
                                </p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleSaveEdit} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Arbitragem */}
            {isArbitrationOpen && (
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
                                onClick={() => setIsArbitrationOpen(false)}
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
            )}

            {/* Modal de Resumo (Finished) */}
            {isSummaryOpen && selectedMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 bg-green-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                <h3 className="font-bold">Resumo da Partida</h3>
                            </div>
                            <button onClick={() => setIsSummaryOpen(false)} className="p-1 hover:bg-green-700 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="text-center flex-1">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 border">
                                        {selectedMatch.home_team?.logo_url ? <img src={selectedMatch.home_team.logo_url} className="w-12 h-12" /> : <Trophy className="text-gray-300" />}
                                    </div>
                                    <div className="font-bold text-gray-900 leading-tight">{selectedMatch.home_team?.name}</div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-4 px-6">
                                        <span className="text-5xl font-black text-gray-900">{selectedMatch.home_score || 0}</span>
                                        <span className="text-gray-300 font-bold">X</span>
                                        <span className="text-5xl font-black text-gray-900">{selectedMatch.away_score || 0}</span>
                                    </div>
                                    {(selectedMatch.home_penalty_score != null || selectedMatch.away_penalty_score != null) && (selectedMatch.home_penalty_score > 0 || selectedMatch.away_penalty_score > 0) && (
                                        <span className="text-sm font-bold text-gray-500 mt-2">
                                            ({selectedMatch.home_penalty_score} x {selectedMatch.away_penalty_score} Pênaltis)
                                        </span>
                                    )}
                                </div>
                                <div className="text-center flex-1">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 border">
                                        {selectedMatch.away_team?.logo_url ? <img src={selectedMatch.away_team.logo_url} className="w-12 h-12" /> : <Trophy className="text-gray-300" />}
                                    </div>
                                    <div className="font-bold text-gray-900 leading-tight">{selectedMatch.away_team?.name}</div>
                                </div>
                            </div>

                            <div className="space-y-4 border-t pt-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Status</div>
                                        <div className="text-sm font-bold text-green-600 self-center">Finalizado</div>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Data</div>
                                        <div className="text-sm font-bold text-gray-900">{new Date(selectedMatch.start_time).toLocaleDateString('pt-BR')}</div>
                                    </div>
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <div className="text-[10px] text-indigo-400 font-bold uppercase mb-2">Equipe de Arbitragem</div>
                                    <div className="text-sm font-medium text-indigo-900">
                                        {/* @ts-ignore */}
                                        <b>Árbitro:</b> {selectedMatch.match_details?.arbitration?.referee || 'Não informado'}
                                    </div>
                                    {(selectedMatch as any).match_details?.arbitration?.assistant1 && (
                                        <div className="text-sm text-indigo-700 mt-1">
                                            {/* @ts-ignore */}
                                            <b>Assistentes:</b> {(selectedMatch as any).match_details?.arbitration?.assistant1} {(selectedMatch as any).match_details?.arbitration?.assistant2 ? ` / ${(selectedMatch as any).match_details?.arbitration?.assistant2}` : ''}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={() => navigate(`/admin/matches/${selectedMatch.id}/sumula-print`)}
                                className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Printer className="w-5 h-5" /> Imprimir Súmula
                            </button>
                            <button
                                onClick={() => navigateToSumula(selectedMatch.id, championship?.sport?.slug)}
                                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                            >
                                Ver Detalhes Completos
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Novo Jogo Avulso</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Mandante</label>
                                    <select
                                        value={newData.home_team_id}
                                        onChange={e => setNewData({ ...newData, home_team_id: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                    >
                                        <option value="">Selecione...</option>
                                        {(teams || []).map((t: any) => (
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
                                        {(teams || []).map((t: any) => (
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
                            <button onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleSaveAdd} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                                Criar Jogo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
