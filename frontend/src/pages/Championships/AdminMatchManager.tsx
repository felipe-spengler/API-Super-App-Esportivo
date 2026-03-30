import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Trophy, Save, Plus, Trash2, CheckCircle, AlertCircle, List, Edit2, X, MapPin, Clock as ClockIcon, Loader2, Play, Printer, Users, Star, Shuffle, ImageIcon, Share2, Download, Mic, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { AdminGroupManager } from './components/AdminGroupManagerModal';
import { MatchAuditModal } from './components/AdminMatchAuditModal';
import { AdminMatchSummaryModal } from './components/AdminMatchSummaryModal';
import { AdminMatchCreateModal } from './components/AdminMatchCreateModal';
import { AdminMatchEditModal } from './components/AdminMatchEditModal';
import { EditRoundModal } from './components/EditRoundModal';
import { AdminMatchArbitrationModal } from './components/AdminMatchArbitrationModal';

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
    round_name?: string; // Enhanced round support
    mvp_player_id?: number | string | null;
    category_id?: number | null;
    match_details?: {
        arbitration?: {
            referee?: string;
            assistant1?: string;
            assistant2?: string;
        }
    };
    events?: any[];
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

    const [editData, setEditData] = useState({ start_time: '', location: '', round_number: 1, category_id: null as number | null, home_score: undefined as number | undefined, away_score: undefined as number | undefined, group_name: '' });
    const [showAddModal, setShowAddModal] = useState(false);
    const [newData, setNewData] = useState({ home_team_id: '', away_team_id: '', start_time: '', location: '', round_number: 1, group_name: '' });
    
    // Round editing state
    const [showEditRoundModal, setShowEditRoundModal] = useState(false);
    const [editingRound, setEditingRound] = useState<{ round: string; round_number: number; round_name: string; matchIds: number[] } | null>(null);

    // Arbitration Modal State
    const [isArbitrationOpen, setIsArbitrationOpen] = useState(false);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [arbitrationData, setArbitrationData] = useState({ referee: '', assistant1: '', assistant2: '' });
    const [savingArbitration, setSavingArbitration] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'no-category' | null>(null);
    const [legs, setLegs] = useState(1); // Number of times teams play each other (1 = single round, 2 = home & away)
    const [numGroups, setNumGroups] = useState(4); // Default groups count
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
    const [isGeneratingKnockout, setIsGeneratingKnockout] = useState(false);
    const [rosters, setRosters] = useState<{ home: any[], away: any[] }>({ home: [], away: [] });
    const [loadingRosters, setLoadingRosters] = useState(false);
    const [selectedMvpId, setSelectedMvpId] = useState<string | number>('');
    const [isSavingMvp, setIsSavingMvp] = useState(false);
    const [activeTab, setActiveTab] = useState('summary'); // Tab state for modal

    // Group Management State
    const [showGroupsModal, setShowGroupsModal] = useState(false);
    const [groupAssignments, setGroupAssignments] = useState<Record<string, string>>({}); // teamId -> groupName
    const [availableGroupNames, setAvailableGroupNames] = useState<string[]>(['A', 'B', 'C', 'D']);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [isAuditOpen, setIsAuditOpen] = useState(false);

    // IMPORTANTE: selectedMatch intencionalmente fora das deps para evitar loop:
    // fetchFullDetails → setSelectedMatch → useEffect → fetchFullDetails → ...
    useEffect(() => {
        if (!selectedMatch) return;
        if (isSummaryOpen || isAuditOpen || activeTab === 'audit') {
            fetchFullDetails(selectedMatch.id);
            setSelectedMvpId(selectedMatch.mvp_player_id || '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSummaryOpen, isAuditOpen, activeTab]); // selectedMatch excluído intencionalmente

    const fetchFullDetails = async (matchId: number) => {
        try {
            setLoadingRosters(true);
            const response = await api.get(`/admin/matches/${matchId}/full-details`);
            const data = response.data;

            // Atualiza apenas elencos — NÃO chama setSelectedMatch para não criar loop
            setRosters(data.rosters || { home: [], away: [] });
        } catch (error) {
            console.error("Erro ao carregar detalhes completos", error);
        } finally {
            setLoadingRosters(false);
        }
    };

    const fetchRosters = async (matchId: number) => {
        try {
            setLoadingRosters(true);
            const response = await api.get(`/admin/matches/${matchId}/full-details`);
            setRosters(response.data.rosters || { home: [], away: [] });
        } catch (error) {
            console.error("Erro ao carregar elencos", error);
        } finally {
            setLoadingRosters(false);
        }
    };

    const handleSaveMvp = async () => {
        if (!selectedMatch || !selectedMvpId) return;
        try {
            setIsSavingMvp(true);
            await api.post(`/admin/matches/${selectedMatch.id}/mvp`, {
                player_id: selectedMvpId
            });
            alert("Craque do Jogo definido com sucesso!");
            loadData();
            setIsSummaryOpen(false);
        } catch (error) {
            console.error("Erro ao salvar MVP", error);
            alert("Erro ao salvar Craque do Jogo.");
        } finally {
            setIsSavingMvp(false);
        }
    };


    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            // Fetch championship first to get categories
            const campRes = await api.get(`/championships/${id}`);
            const champ = campRes.data;
            setChampionship(champ);

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

            // Now fetch matches, teams, and groups in parallel for the determined category
            let teamsUrl = `/championships/${id}/teams`;
            let matchesUrl = `/admin/matches?championship_id=${id}`;
            let groupsUrl = `/admin/championships/${id}/groups`; // We might need to pass category_id to backend groups soon, but teams are filtered!

            if (categoryToUse === 'no-category') {
                teamsUrl += '?category_id=null';
                matchesUrl += '&category_id=null';
            } else if (categoryToUse) {
                teamsUrl += `?category_id=${categoryToUse}`;
                matchesUrl += `&category_id=${categoryToUse}`;
            }

            const [teamsRes, groupsRes, matchesRes] = await Promise.all([
                api.get(teamsUrl),
                api.get(groupsUrl).catch(() => ({ data: { groups: {} } })),
                api.get(matchesUrl)
            ]);

            // Handle teams
            const loadedTeams = Array.isArray(teamsRes.data) ? teamsRes.data : (teamsRes.data.data || []);
            setTeams(loadedTeams);

            // Handle groups accurately considering categories
            const groupsData = groupsRes.data.groups || {};
            const assignments: Record<string, string> = {};
            const activeGroupNames = new Set<string>();

            // 1. Check groupsData from API
            Object.entries(groupsData).forEach(([gName, teamsList]: [string, any]) => {
                if (Array.isArray(teamsList)) {
                    teamsList.forEach(team => {
                        // Ensure this team actually belongs to the current category before assigning it a group
                        if (loadedTeams.some((t: any) => t.id === team.id)) {
                            assignments[team.id] = gName;
                            activeGroupNames.add(gName);
                        }
                    });
                }
            });

            // 2. Check pivot data from teams
            loadedTeams.forEach((t: any) => {
                if (t.pivot?.group_name) {
                    assignments[t.id] = t.pivot.group_name;
                    activeGroupNames.add(t.pivot.group_name);
                }
            });

            // 3. Check existing matches
            const matchesData = Array.isArray(matchesRes.data) ? matchesRes.data : (matchesRes.data.data || Object.values(matchesRes.data) || []);
            matchesData.forEach((m: any) => {
                if (m && m.group_name) {
                    activeGroupNames.add(m.group_name);
                }
            });

            setGroupAssignments(assignments);

            const groupNames = Array.from(activeGroupNames).sort();
            if (groupNames.length > 0) {
                setNumGroups(groupNames.length);
                setAvailableGroupNames(groupNames);
            } else if (availableGroupNames.length === 0 || (availableGroupNames.length === 4 && availableGroupNames[0] === 'A')) {
                // Keep default if nothing is found to prevent empty state
                setAvailableGroupNames(['A', 'B', 'C', 'D']);
            }

            // Handle matches
            setMatches(matchesData);

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
            let matchesUrl = `/admin/matches?championship_id=${id}`;
            let teamsUrl = `/championships/${id}/teams`;

            if (selectedCategoryId === 'no-category') {
                matchesUrl += '&category_id=null';
                teamsUrl += '?category_id=null';
            } else if (selectedCategoryId) {
                matchesUrl += `&category_id=${selectedCategoryId}`;
                teamsUrl += `?category_id=${selectedCategoryId}`;
            }

            const [matchesRes, teamsRes] = await Promise.all([
                api.get(matchesUrl),
                api.get(teamsUrl)
            ]);

            const matchesData = Array.isArray(matchesRes.data) ? matchesRes.data : (matchesRes.data.data || Object.values(matchesRes.data) || []);
            setMatches(matchesData);

            const loadedTeams = Array.isArray(teamsRes.data) ? teamsRes.data : (teamsRes.data.data || []);
            setTeams(loadedTeams);

            // Recompute group assignments for the new category
            const assignments: Record<string, string> = {};
            const activeGroupNames = new Set<string>();

            loadedTeams.forEach((t: any) => {
                if (t.pivot?.group_name) {
                    assignments[t.id] = t.pivot.group_name;
                    activeGroupNames.add(t.pivot.group_name);
                }
            });

            matchesData.forEach((m: any) => {
                if (m && m.group_name) {
                    activeGroupNames.add(m.group_name);
                }
            });

            setGroupAssignments(assignments);

            const groupNames = Array.from(activeGroupNames).sort();
            if (groupNames.length > 0) {
                setNumGroups(groupNames.length);
                setAvailableGroupNames(groupNames);
            } else {
                setAvailableGroupNames(['A', 'B', 'C', 'D']);
            }

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
                legs: legs,
                num_groups: numGroups
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
            category_id: match.category_id || null,
            home_score: match.home_score !== null ? match.home_score : undefined,
            away_score: match.away_score !== null ? match.away_score : undefined,
            group_name: match.group_name || ''
        });
        setShowEditModal(true);
    };

    const toUTCString = (localDateString: string) => {
        if (!localDateString) return '';
        const date = new Date(localDateString);
        return date.toISOString().slice(0, 16);
    };

    const handleSaveAdd = async (matchesData: any[]) => {
        if (!matchesData || matchesData.length === 0) return;

        try {
            // Loop through each match and make a POST request
            for (const match of matchesData) {
                if (!match.home_team_id || !match.away_team_id || !match.start_time) {
                    continue; // Skip invalid matches if any
                }

                await api.post('/admin/matches', {
                    home_team_id: match.home_team_id,
                    away_team_id: match.away_team_id,
                    location: match.location,
                    round_number: match.round_number,
                    round_name: match.round_name || null,
                    start_time: toUTCString(match.start_time),
                    championship_id: id,
                    category_id: selectedCategoryId,
                    group_name: match.group_name || null
                });
            }

            alert('Jogo(s) criado(s) com sucesso!');
            setShowAddModal(false);
            loadMatches();
        } catch (err) {
            alert('Erro ao criar jogo(s).');
        }
    };

    // Handle saving round name for multiple matches
    const handleSaveRoundName = async (roundName: string) => {
        if (!editingRound || !editingRound.matchIds.length) return;

        try {
            // Update all matches in this round with the new round_name
            const promises = editingRound.matchIds.map(matchId =>
                api.put(`/admin/matches/${matchId}`, {
                    round_name: roundName
                })
            );
            await Promise.all(promises);
            alert(`Nome da fase atualizado para "${roundName}" em ${editingRound.matchIds.length} jogo(s)!`);
            loadMatches();
        } catch (err) {
            console.error('Error updating round name:', err);
            alert('Erro ao atualizar nome da fase.');
            throw err;
        }
    };

    const handleSaveEdit = async () => {
        if (!selectedMatch) return;
        try {
            // Using PUT to match common Laravel convention
            const payload: any = {
                start_time: toUTCString(editData.start_time),
                location: editData.location,
                round_number: editData.round_number,
                category_id: editData.category_id,
                group_name: editData.group_name || null
            };

            if (selectedMatch.status === 'finished') {
                payload.home_score = editData.home_score;
                payload.away_score = editData.away_score;
            }

            await api.put(`/admin/matches/${selectedMatch.id}`, payload);
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

    const openArbitration = (match: Match) => {
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
        else if (sportSlug === 'basquete') sumulaPath = `/admin/matches/${matchId}/sumula-basquete-voz`;
        else if (sportSlug === 'handebol') sumulaPath = `/admin/matches/${matchId}/sumula-handebol`;
        else if (sportSlug === 'beach-tennis') sumulaPath = `/admin/matches/${matchId}/sumula-beach-tennis`;
        else if (sportSlug === 'tenis') sumulaPath = `/admin/matches/${matchId}/sumula-tenis`;
        else if (sportSlug === 'futebol-7') sumulaPath = `/admin/matches/${matchId}/sumula-futebol7`;
        else if (sportSlug === 'futevolei') sumulaPath = `/admin/matches/${matchId}/sumula-futevolei`;
        else if (sportSlug === 'volei-de-praia') sumulaPath = `/admin/matches/${matchId}/sumula-volei-praia`;
        else if (sportSlug === 'tenis-de-mesa') sumulaPath = `/admin/matches/${matchId}/sumula-tenis-mesa`;
        else if (sportSlug === 'jiu-jitsu') sumulaPath = `/admin/matches/${matchId}/sumula-jiu-jitsu`;

        navigate(sumulaPath);
    };

    const openMatchSumula = (match: Match) => {
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

    // Reset tab when opening modal
    useEffect(() => {
        if (isSummaryOpen) {
            setActiveTab('summary');
        }
    }, [isSummaryOpen]);

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
        const proceed = window.confirm("Isso calculará a classificação dos grupos e gerará automaticamente os jogos da próxima fase (mata-mata). Deseja continuar?");
        if (!proceed) return;

        const legsInput = window.prompt("Deseja jogos de Ida e Volta? Digite '2' para Ida e Volta, ou deixe vazio para Jogo Único (Padrão).", "1");
        const legs = legsInput === '2' ? 2 : 1;

        setIsGeneratingKnockout(true);
        try {
            const response = await api.post(`/admin/championships/${id}/bracket/generate-from-groups`, {
                category_id: selectedCategoryId === 'no-category' ? null : selectedCategoryId,
                legs: legs
            });
            alert(`Sucesso! ${response.data.matches?.length || 0} jogos gerados para a fase ${response.data.round_name}.`);
            loadData();
        } catch (error: any) {
            console.error("Erro ao gerar mata-mata", error);
            alert(error.response?.data?.message || "Erro ao gerar mata-mata.");
        } finally {
            setIsGeneratingKnockout(false);
        }
    };

    const fetchGroups = async () => {
        setLoadingGroups(true);
        try {
            const response = await api.get(`/admin/championships/${id}/groups`);

            // Transform response to state
            // response.data.groups is { "A": [{...}, {...}], "B": [...] }
            const groupsMap = response.data.groups || {};
            const assignments: Record<string, string> = {};

            // Collect all group names found
            const foundNames = Object.keys(groupsMap).sort();

            Object.entries(groupsMap).forEach(([gName, teamsList]: [string, any]) => {
                if (Array.isArray(teamsList)) {
                    teamsList.forEach(team => {
                        assignments[team.id] = gName;
                    });
                }
            });

            setGroupAssignments(assignments);

            // Update available names if we found more/different ones, OR defaults
            if (foundNames.length > 0) {
                setAvailableGroupNames(prev => {
                    // Merge unique names
                    const combined = Array.from(new Set([...prev, ...foundNames])).sort();
                    return combined;
                });
                setNumGroups(Math.max(foundNames.length, numGroups));
            }

        } catch (error) {
            console.error("Erro ao buscar grupos", error);
            alert("Erro ao carregar configuração de grupos.");
        } finally {
            setLoadingGroups(false);
        }
    };

    const handleSaveGroups = async () => {
        setLoadingGroups(true);
        try {
            // Transform assignments local state to API format
            // API expects: { groups: { "A": [id1, id2], "B": [id3] } }

            const groupsPayload: Record<string, number[]> = {};

            Object.entries(groupAssignments).forEach(([teamId, groupName]) => {
                if (!groupsPayload[groupName]) groupsPayload[groupName] = [];
                groupsPayload[groupName].push(Number(teamId));
            });

            // Clean empty groups from payload if desired? No, send partial if exists.

            await api.post(`/admin/championships/${id}/groups`, {
                groups: groupsPayload
            });

            alert("Grupos salvos com sucesso!");
            setShowGroupsModal(false);
            setNumGroups(Object.keys(groupsPayload).length); // Update main UI counter

        } catch (error) {
            console.error(error);
            alert("Erro ao salvar grupos.");
        } finally {
            setLoadingGroups(false);
        }
    };

    const handleAutoDistribute = () => {
        // 1. Generate Group Names (A, B, C...) based on numGroups
        const count = Math.max(2, numGroups);
        const newGroupNames: string[] = [];
        for (let i = 0; i < count; i++) {
            newGroupNames.push(String.fromCharCode(65 + i));
        }

        // 2. Shuffle Teams
        const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

        // 3. Distribute Round Robin
        const newAssignments: Record<string, string> = {};

        shuffledTeams.forEach((team, index) => {
            const groupIndex = index % count;
            newAssignments[team.id] = newGroupNames[groupIndex];
        });

        // 4. Update State
        setAvailableGroupNames(newGroupNames);
        setGroupAssignments(newAssignments);
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
                            {isGeneratingKnockout ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4 hidden sm:block" />}
                            <span className="">Gerar Mata-mata</span>
                        </button>
                    )}
                    {/* Botão Gerenciar Grupos Manualmente */}
                    {(championship?.format === 'groups' || championship?.format === 'group_knockout') && matches.length === 0 && (
                        <button
                            onClick={() => {
                                fetchGroups();
                                setShowGroupsModal(true);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all shadow-sm text-sm font-bold mx-2"
                        >
                            <Users className="w-4 h-4" />
                            <span className="hidden sm:inline">Definir Grupos</span>
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
                                        round_number: maxRound + 1,
                                        group_name: ''
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
                                        round_number: 1,
                                        group_name: ''
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

                                    {(championship?.format === 'groups' || championship?.format === 'group_knockout') && (
                                        <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                            <label className="text-sm font-bold text-gray-600">Grupos:</label>
                                            <input
                                                type="number"
                                                min={2}
                                                max={16}
                                                value={numGroups}
                                                onChange={(e) => setNumGroups(parseInt(e.target.value))}
                                                className="w-16 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-bold text-center"
                                            />
                                        </div>
                                    )}
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
                                        round_number: 1,
                                        group_name: ''
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
                                            <h3 className="font-bold text-gray-800 text-lg">
                                                {(() => {
                                                    const roundName = roundMatches[0]?.round_name;
                                                    if (roundName) {
                                                        if (roundName === 'round_of_32') return '32-avos de Final';
                                                        if (roundName === 'round_of_16') return 'Oitavas de Final';
                                                        if (roundName === 'quarter') return 'Quartas de Final';
                                                        if (roundName === 'semi') return 'Semifinal';
                                                        if (roundName === 'final') return 'Final';
                                                        if (roundName === 'third_place') return 'Disputa de 3º Lugar';
                                                        return roundName; // Nome personalizado
                                                    }
                                                    return `Rodada ${round}`;
                                                })()}
                                            </h3>
                                            <span className="text-[10px] font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded-full uppercase tracking-wider">{roundMatches.length} JOGOS</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingRound({
                                                        round: round,
                                                        round_number: Number(round),
                                                        round_name: roundMatches[0]?.round_name || `Rodada ${round}`,
                                                        matchIds: roundMatches.map((m: any) => m.id)
                                                    });
                                                    setShowEditRoundModal(true);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 hover:border-gray-400 text-xs font-bold uppercase transition-all shadow-sm"
                                            >
                                                <Edit2 size={12} /> Editar Fase
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setNewData({
                                                        home_team_id: '',
                                                        away_team_id: '',
                                                        start_time: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                                                        location: championship?.location || '',
                                                        round_number: Number(round),
                                                        group_name: ''
                                                    });
                                                    setShowAddModal(true);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 text-xs font-bold uppercase transition-all shadow-sm"
                                            >
                                                <Plus className="w-3 h-3" /> Adicionar Jogo
                                            </button>
                                        </div>
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
                                                                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-center md:text-right flex-1 justify-center md:justify-end min-w-0">
                                                                    <div className="order-1 md:order-2">
                                                                        {match.home_team?.logo_url ? (
                                                                            <img src={match.home_team.logo_url} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white shadow-sm border p-0.5" />
                                                                        ) : (
                                                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-dashed">T1</div>
                                                                        )}
                                                                    </div>
                                                                    <span
                                                                        className="text-[11px] md:text-sm font-bold text-gray-900 order-2 md:order-1 truncate max-w-[80px] md:max-w-[150px] lg:max-w-[180px]"
                                                                        title={match.home_team?.name || 'Time A'}
                                                                    >
                                                                        {match.home_team?.name || 'Time A'}
                                                                    </span>
                                                                </div>

                                                                {/* Score */}
                                                                <div className="flex flex-col items-center">
                                                                    <div className="flex items-center gap-2 md:gap-4 bg-white px-3 md:px-6 py-1.5 md:py-2 rounded-xl border border-gray-200 shadow-sm min-w-[90px] md:min-w-[120px] justify-center">
                                                                        {['live', 'finished', 'ongoing'].includes(match.status) && match.home_score !== null && match.away_score !== null ? (
                                                                            <>
                                                                                <span className="text-xl md:text-2xl font-black text-gray-900">
                                                                                    {match.home_score}
                                                                                </span>
                                                                                <span className="text-gray-300 font-bold text-[10px]">X</span>
                                                                                <span className="text-xl md:text-2xl font-black text-gray-900">
                                                                                    {match.away_score}
                                                                                </span>
                                                                            </>
                                                                        ) : (
                                                                            <span className="text-gray-300 font-bold text-lg md:text-xl">VS</span>
                                                                        )}
                                                                    </div>
                                                                    {(match.home_penalty_score != null || match.away_penalty_score != null) && (match.home_penalty_score > 0 || match.away_penalty_score > 0) && (
                                                                        <span className="text-[10px] font-bold text-gray-500 mt-1">
                                                                            ({match.home_penalty_score} x {match.away_penalty_score} Pen.)
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Away Team */}
                                                                <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-center md:text-left flex-1 justify-center md:justify-start min-w-0">
                                                                    <div className="">
                                                                        {match.away_team?.logo_url ? (
                                                                            <img src={match.away_team.logo_url} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white shadow-sm border p-0.5" />
                                                                        ) : (
                                                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-dashed">T2</div>
                                                                        )}
                                                                    </div>
                                                                    <span
                                                                        className="text-[11px] md:text-sm font-bold text-gray-900 truncate max-w-[80px] md:max-w-[150px] lg:max-w-[180px]"
                                                                        title={match.away_team?.name || 'Time B'}
                                                                    >
                                                                        {match.away_team?.name || 'Time B'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="w-full md:w-auto flex justify-around md:justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0 flex-shrink-0 min-w-max">
                                                                <button
                                                                    onClick={() => openMatchSumula(match)}
                                                                    className={`flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all border ${match.status === 'finished' ? 'text-green-600 bg-green-50 border-green-100' : 'text-indigo-600 bg-indigo-50 border-indigo-100'}`}
                                                                >
                                                                    {match.status === 'finished' ? <CheckCircle className="w-4 h-4" /> : <List className="w-4 h-4" />}
                                                                    <span className="text-[10px] font-bold uppercase md:hidden">{match.status === 'finished' ? 'Resumo' : 'Súmula'}</span>
                                                                </button>

                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedMatch(match);
                                                                        setIsAuditOpen(true);
                                                                    }}
                                                                    className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 text-blue-600 bg-blue-50 border border-blue-100 rounded-lg transition-all hover:bg-blue-100"
                                                                    title="Auditoria de Voz e Logs"
                                                                >
                                                                    <ShieldCheck className="w-4 h-4" />
                                                                    <span className="text-[10px] font-bold uppercase md:hidden">Auditar</span>
                                                                </button>



                                                                <button
                                                                    onClick={() => openEditModal(match)}
                                                                    className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg transition-all"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                    <span className="text-[10px] font-bold uppercase md:hidden">Editar</span>
                                                                </button>

                                                                <button
                                                                    onClick={() => window.open(`${api.defaults.baseURL}/public/art/match/${match.id}/scheduled`, '_blank')}
                                                                    className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 text-orange-600 bg-orange-50 border border-orange-100 rounded-lg transition-all hover:bg-orange-100"
                                                                    title="Gerar Arte Jogo Programado"
                                                                >
                                                                    <ImageIcon className="w-4 h-4" />
                                                                    <span className="text-[10px] font-bold uppercase md:hidden">Arte</span>
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

            {/* Edit Modal extracted */}
            <AdminMatchEditModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                handleSaveEdit={handleSaveEdit}
                editData={editData}
                setEditData={setEditData}
                selectedMatch={selectedMatch}
                championship={championship}
                availableGroupNames={availableGroupNames}
            />

            {/* Modal de Arbitragem */}
            <AdminMatchArbitrationModal
                isOpen={isArbitrationOpen}
                onClose={() => setIsArbitrationOpen(false)}
                handleConfirmArbitration={handleConfirmArbitration}
                arbitrationData={arbitrationData}
                setArbitrationData={setArbitrationData}
                savingArbitration={savingArbitration}
            />

            {/* Modal de Resumo (Finished) extracted */}
            <AdminMatchSummaryModal
                isOpen={isSummaryOpen}
                onClose={() => setIsSummaryOpen(false)}
                match={selectedMatch}
                championship={championship}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                loadingRosters={loadingRosters}
                rosters={rosters}
                selectedMvpId={selectedMvpId}
                setSelectedMvpId={setSelectedMvpId}
                handleSaveMvp={handleSaveMvp}
                isSavingMvp={isSavingMvp}
                navigateToSumula={navigateToSumula}
                navigate={navigate}
            />
            {/* Add Modal extracted */}
            <AdminMatchCreateModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                handleSaveAdd={handleSaveAdd}
                initialData={newData}
                championship={championship}
                availableGroupNames={availableGroupNames}
                teams={teams}
                groupAssignments={groupAssignments}
                selectedCategoryId={selectedCategoryId}
            />

            {/* Groups Management Modal extracted */}
            <AdminGroupManager
                isOpen={showGroupsModal}
                onClose={() => setShowGroupsModal(false)}
                loadingGroups={loadingGroups}
                numGroups={numGroups}
                setNumGroups={setNumGroups}
                handleAutoDistribute={handleAutoDistribute}
                availableGroupNames={availableGroupNames}
                setAvailableGroupNames={setAvailableGroupNames}
                teams={teams}
                groupAssignments={groupAssignments}
                setGroupAssignments={setGroupAssignments}
                handleSaveGroups={handleSaveGroups}
            />

            {/* Edit Round Name Modal */}
            <EditRoundModal
                isOpen={showEditRoundModal}
                onClose={() => setShowEditRoundModal(false)}
                editingRound={editingRound}
                onSave={handleSaveRoundName}
            />
            {/* Modal de Auditoria Completa (Extra-Súmula) */}
            <MatchAuditModal
                isOpen={isAuditOpen}
                onClose={() => setIsAuditOpen(false)}
                match={selectedMatch}
            />
        </div>
    );
}
