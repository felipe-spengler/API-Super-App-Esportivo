import { useState, useEffect } from 'react';
import { Calendar, Trash2, Edit, Loader2, Filter, Printer, ClipboardList, X, MapPin, Clock as ClockIcon, Star, CheckCircle, Trophy } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { isSameDay, isYesterday, isThisWeek, parseISO } from 'date-fns';

export function Matches() {
    const [matches, setMatches] = useState<any[]>([]);
    const [filteredMatches, setFilteredMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterPeriod, setFilterPeriod] = useState('all'); // 'today', 'yesterday', 'week', 'all'

    // Arbitration Modal State
    const [isArbitrationOpen, setIsArbitrationOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [arbitrationData, setArbitrationData] = useState({ referee: '', assistant1: '', assistant2: '' });
    const [saving, setSaving] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({ start_time: '', location: '' });

    // MVP Summary State
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [rosters, setRosters] = useState<{ home: any[], away: any[] }>({ home: [], away: [] });
    const [loadingRosters, setLoadingRosters] = useState(false);
    const [selectedMvpId, setSelectedMvpId] = useState<string | number>('');
    const [isSavingMvp, setIsSavingMvp] = useState(false);

    // Events & Score Management
    const [matchEvents, setMatchEvents] = useState<any[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [newEvent, setNewEvent] = useState({ team_id: '', player_id: '', minute: '', event_type: 'goal' });
    const [isSavingEvent, setIsSavingEvent] = useState(false);
    const [isEditingScore, setIsEditingScore] = useState(false);
    const [tempScore, setTempScore] = useState({ home: 0, away: 0, home_penalty: 0, away_penalty: 0 });
    const [isSavingScore, setIsSavingScore] = useState(false);

    useEffect(() => {
        if (isSummaryOpen && selectedMatch) {
            fetchRosters(selectedMatch.id);
            fetchEvents(selectedMatch.id);
            // @ts-ignore
            setSelectedMvpId(selectedMatch.mvp_player_id || '');
            setTempScore({
                home: selectedMatch.home_score || 0,
                away: selectedMatch.away_score || 0,
                home_penalty: selectedMatch.home_penalty_score || 0,
                away_penalty: selectedMatch.away_penalty_score || 0
            });
            setIsEditingScore(false);
            setIsAddingEvent(false);
        }
    }, [isSummaryOpen, selectedMatch]);

    const fetchEvents = async (matchId: number) => {
        try {
            setLoadingEvents(true);
            const response = await api.get(`/admin/matches/${matchId}/events`);
            setMatchEvents(response.data);
        } catch (error) {
            console.error("Erro ao carregar eventos", error);
        } finally {
            setLoadingEvents(false);
        }
    };

    const handleAddEvent = async () => {
        if (!selectedMatch || !newEvent.team_id || !newEvent.event_type) return;
        try {
            setIsSavingEvent(true);
            await api.post(`/admin/matches/${selectedMatch.id}/events`, {
                team_id: newEvent.team_id,
                player_id: newEvent.player_id || null,
                minute: newEvent.minute,
                event_type: newEvent.event_type
            });
            // Refresh events and match data (to get updated score)
            fetchEvents(selectedMatch.id);
            loadMatches();
            setIsAddingEvent(false);
            setNewEvent({ team_id: '', player_id: '', minute: '', event_type: 'goal' });
        } catch (error) {
            console.error("Erro ao adicionar evento", error);
            alert("Erro ao adicionar evento.");
        } finally {
            setIsSavingEvent(false);
        }
    };

    const handleDeleteEvent = async (eventId: number) => {
        if (!selectedMatch || !window.confirm("Deseja realmente excluir este evento?")) return;
        try {
            await api.delete(`/admin/matches/${selectedMatch.id}/events/${eventId}`);
            fetchEvents(selectedMatch.id);
            loadMatches();
        } catch (error) {
            console.error("Erro ao excluir evento", error);
            alert("Erro ao excluir evento.");
        }
    };

    const handleSaveScore = async () => {
        if (!selectedMatch) return;
        try {
            setIsSavingScore(true);
            const response = await api.put(`/admin/matches/${selectedMatch.id}`, {
                home_score: tempScore.home,
                away_score: tempScore.away,
                home_penalty_score: tempScore.home_penalty,
                away_penalty_score: tempScore.away_penalty
            });
            setSelectedMatch(response.data);
            loadMatches();
            setIsEditingScore(false);
            alert("Placar atualizado com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar placar", error);
            alert("Erro ao salvar placar.");
        } finally {
            setIsSavingScore(false);
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
            loadMatches();
            setIsSummaryOpen(false);
        } catch (error) {
            console.error("Erro ao salvar MVP", error);
            alert("Erro ao salvar Craque do Jogo.");
        } finally {
            setIsSavingMvp(false);
        }
    };

    useEffect(() => {
        loadMatches();
    }, []);

    useEffect(() => {
        const now = new Date();
        if (filterPeriod === 'all') {
            setFilteredMatches(matches);
        } else {
            setFilteredMatches(matches.filter(match => {
                const matchDate = parseISO(match.start_time);
                if (filterPeriod === 'today') return isSameDay(matchDate, now);
                if (filterPeriod === 'yesterday') return isYesterday(matchDate);
                if (filterPeriod === 'week') return isThisWeek(matchDate);
                return true;
            }));
        }
    }, [filterPeriod, matches]);

    async function loadMatches() {
        try {
            setLoading(true);
            const response = await api.get('/admin/matches');
            // Sort by start_time ascending
            const sorted = response.data.sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
            setMatches(sorted);
            setFilteredMatches(sorted);
        } catch (error) {
            console.error("Erro ao carregar partidas", error);
        } finally {
            setLoading(false);
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'finished': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold uppercase">Finalizada</span>;
            case 'live': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold uppercase animate-pulse">Ao Vivo</span>;
            default: return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold uppercase">Agendada</span>;
        }
    };

    const openArbitration = (match: any) => {
        setSelectedMatch(match);
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
            setSaving(true);
            await api.put(`/admin/matches/${selectedMatch.id}`, {
                arbitration: arbitrationData
            });

            const sportSlug = selectedMatch.championship?.sport?.slug || 'futebol';
            const sumulaRoutes: Record<string, string> = {
                'futebol': '/sumula',
                'volei': '/sumula-volei',
                'futsal': '/sumula-futsal',
                'basquete': '/sumula-basquete',
                'handebol': '/sumula-handebol',
                'beach-tennis': '/sumula-beach-tennis',
                'futebol7': '/sumula-futebol7',
                'futevolei': '/sumula-futevolei',
                'volei-praia': '/sumula-volei-praia',
                'tenis-mesa': '/sumula-tenis-mesa',
                'jiu-jitsu': '/sumula-jiu-jitsu'
            };

            const suffix = sumulaRoutes[sportSlug] || 'sumula';
            setIsArbitrationOpen(false);
            window.location.href = `/admin/matches/${selectedMatch.id}${suffix}`;
        } catch (error) {
            console.error("Erro ao salvar arbitragem", error);
            alert("Erro ao salvar dados.");
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (match: any) => {
        setSelectedMatch(match);
        const date = new Date(match.start_time);
        const localIso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

        setEditData({
            start_time: localIso,
            location: match.location || ''
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedMatch) return;
        try {
            await api.put(`/admin/matches/${selectedMatch.id}`, {
                start_time: editData.start_time,
                location: editData.location
            });
            setShowEditModal(false);
            loadMatches();
            alert('Partida atualizada!');
        } catch (error) {
            console.error('Erro ao atualizar partida', error);
            alert('Erro ao atualizar.');
        }
    };

    return (
        <div className="animate-in fade-in duration-500 relative">
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
                                disabled={saving}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Iniciar Partida
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Modal de Edição (Hora/Local) */}
            {showEditModal && selectedMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">Editar Detalhes da Partida</h3>
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
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleSaveEdit} className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Resumo (Finished) */}
            {isSummaryOpen && selectedMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
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

                                {isEditingScore ? (
                                    <div className="flex flex-col items-center gap-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 animate-in zoom-in-95 duration-200">
                                        <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Editando Placar</div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Mandante</span>
                                                <input
                                                    type="number"
                                                    value={tempScore.home}
                                                    onChange={e => setTempScore({ ...tempScore, home: parseInt(e.target.value) || 0 })}
                                                    className="w-16 text-2xl font-black text-center border-2 border-indigo-200 rounded-xl p-2 outline-none focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                            <span className="text-gray-300 font-bold mt-4">X</span>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Visitante</span>
                                                <input
                                                    type="number"
                                                    value={tempScore.away}
                                                    onChange={e => setTempScore({ ...tempScore, away: parseInt(e.target.value) || 0 })}
                                                    className="w-16 text-2xl font-black text-center border-2 border-indigo-200 rounded-xl p-2 outline-none focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex flex-col items-center">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase">Pên.</span>
                                                <input
                                                    type="number"
                                                    value={tempScore.home_penalty}
                                                    onChange={e => setTempScore({ ...tempScore, home_penalty: parseInt(e.target.value) || 0 })}
                                                    className="w-12 text-sm text-center border rounded p-1"
                                                />
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-[8px] font-bold text-gray-400 uppercase">Pên.</span>
                                                <input
                                                    type="number"
                                                    value={tempScore.away_penalty}
                                                    onChange={e => setTempScore({ ...tempScore, away_penalty: parseInt(e.target.value) || 0 })}
                                                    className="w-12 text-sm text-center border rounded p-1"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-4 mt-4">
                                            <button onClick={() => setIsEditingScore(false)} className="px-4 py-1.5 text-xs font-bold text-gray-400 uppercase hover:text-gray-600 transition-colors">Cancelar</button>
                                            <button onClick={handleSaveScore} disabled={isSavingScore} className="px-6 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                                                {isSavingScore ? 'Salvando...' : 'Salvar Placar'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="group relative flex flex-col items-center cursor-pointer hover:bg-indigo-50/50 p-4 rounded-2xl transition-all border border-transparent hover:border-indigo-100"
                                        onClick={() => setIsEditingScore(true)}
                                        title="Clique para editar o placar"
                                    >
                                        <div className="absolute -top-2 bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-1 shadow-md uppercase tracking-tighter">Clique para editar</div>
                                        <div className="flex items-center gap-4 px-6 relative">
                                            <span className="text-5xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{selectedMatch.home_score || 0}</span>
                                            <span className="text-gray-300 font-bold">X</span>
                                            <span className="text-5xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{selectedMatch.away_score || 0}</span>
                                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-gray-200 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all">
                                                <Edit size={16} />
                                            </div>
                                        </div>
                                        {(selectedMatch.home_penalty_score != null || selectedMatch.away_penalty_score != null) && (selectedMatch.home_penalty_score > 0 || selectedMatch.away_penalty_score > 0) && (
                                            <span className="text-sm font-bold text-gray-400 group-hover:text-indigo-400 mt-2 transition-colors">
                                                ({selectedMatch.home_penalty_score} x {selectedMatch.away_penalty_score} Pênaltis)
                                            </span>
                                        )}
                                    </div>
                                )}

                                <div className="text-center flex-1">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 border">
                                        {selectedMatch.away_team?.logo_url ? <img src={selectedMatch.away_team.logo_url} className="w-12 h-12" /> : <Trophy className="text-gray-300" />}
                                    </div>
                                    <div className="font-bold text-gray-900 leading-tight">{selectedMatch.away_team?.name}</div>
                                </div>
                            </div>

                            {/* Timeline de Eventos */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <ClockIcon className="w-4 h-4" /> Timeline da Partida
                                    </h4>
                                    <button
                                        onClick={() => setIsAddingEvent(!isAddingEvent)}
                                        className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-bold uppercase hover:bg-indigo-100 transition-colors"
                                    >
                                        {isAddingEvent ? 'Fechar' : '+ Adicionar Gol/Cartão'}
                                    </button>
                                </div>

                                {isAddingEvent && (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 mb-4 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Equipe</label>
                                                <select
                                                    value={newEvent.team_id}
                                                    onChange={e => {
                                                        const tid = e.target.value;
                                                        setNewEvent({ ...newEvent, team_id: tid, player_id: '' });
                                                    }}
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="">Selecione...</option>
                                                    <option value={selectedMatch.home_team_id}>{selectedMatch.home_team?.name}</option>
                                                    <option value={selectedMatch.away_team_id}>{selectedMatch.away_team?.name}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tipo</label>
                                                <select
                                                    value={newEvent.event_type}
                                                    onChange={e => setNewEvent({ ...newEvent, event_type: e.target.value })}
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="goal">⚽ GOL</option>
                                                    <option value="yellow_card">🟨 Cartão Amarelo</option>
                                                    <option value="red_card">🟥 Cartão Vermelho</option>
                                                    <option value="blue_card">🟦 Cartão Azul</option>
                                                    <option value="assist">👟 Assistência</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Jogador (Opcional)</label>
                                                <select
                                                    value={newEvent.player_id}
                                                    onChange={e => setNewEvent({ ...newEvent, player_id: e.target.value })}
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="">Selecione...</option>
                                                    {(newEvent.team_id == selectedMatch.home_team_id ? rosters.home : rosters.away).map((p: any) => (
                                                        <option key={p.id} value={p.id}>{p.number ? `#${p.number}` : ''} {p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Minuto</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: 22', 15:30..."
                                                    value={newEvent.minute}
                                                    onChange={e => setNewEvent({ ...newEvent, minute: e.target.value })}
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleAddEvent}
                                            disabled={isSavingEvent || !newEvent.team_id}
                                            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                        >
                                            {isSavingEvent ? 'Lançando...' : 'Lançar Evento'}
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {loadingEvents ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                                        </div>
                                    ) : matchEvents.length === 0 ? (
                                        <div className="text-center py-4 text-gray-400 text-[10px] uppercase font-bold tracking-widest border border-dashed rounded-xl">Nenhum evento registrado</div>
                                    ) : (
                                        matchEvents.filter(ev => ['goal', 'yellow_card', 'red_card', 'blue_card', 'assist'].includes(ev.event_type)).map((ev: any) => (
                                            <div key={ev.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-[10px] font-bold text-gray-400 w-8">{ev.game_time || '--'}</div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                                                            {ev.event_type === 'goal' && '⚽'}
                                                            {ev.event_type === 'yellow_card' && '🟨'}
                                                            {ev.event_type === 'red_card' && '🟥'}
                                                            {ev.event_type === 'blue_card' && '🟦'}
                                                            {ev.event_type === 'assist' && '👟'}
                                                            {ev.player?.name || 'Jogador desconhecido'}
                                                            <span className="text-[9px] text-gray-400 font-normal ml-1">({ev.team?.name})</span>
                                                        </span>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleDeleteEvent(ev.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Craque do Jogo (MVP) */}
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                        <div className="text-[10px] text-amber-600 font-black uppercase tracking-wider">Craque do Jogo (MVP)</div>
                                    </div>
                                </div>

                                {loadingRosters ? (
                                    <div className="flex items-center gap-2 text-xs text-amber-400 py-2">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Carregando elencos...
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedMvpId}
                                            onChange={e => setSelectedMvpId(e.target.value)}
                                            className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-gray-700"
                                        >
                                            <option value="">Selecione o Craque...</option>
                                            {rosters.home.length > 0 && (
                                                <optgroup label={selectedMatch.home_team?.name}>
                                                    {rosters.home.map(p => (
                                                        <option key={p.id} value={p.id}>{p.number ? `#${p.number}` : ''} {p.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {rosters.away.length > 0 && (
                                                <optgroup label={selectedMatch.away_team?.name}>
                                                    {rosters.away.map(p => (
                                                        <option key={p.id} value={p.id}>{p.number ? `#${p.number}` : ''} {p.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                        <button
                                            onClick={handleSaveMvp}
                                            disabled={isSavingMvp || !selectedMvpId}
                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm transition-all disabled:opacity-50 shadow-sm shadow-amber-200 active:scale-95"
                                        >
                                            {isSavingMvp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Definir'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                            <Link
                                to={`/admin/matches/${selectedMatch.id}/sumula-print`}
                                className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-center"
                            >
                                <Printer className="w-5 h-5" /> Imprimir Súmula
                            </Link>
                            <button
                                onClick={() => {
                                    const sportSlug = (selectedMatch as any).championship?.sport?.slug || 'futebol';
                                    const sumulaRoutes: Record<string, string> = {
                                        'futebol': '/sumula',
                                        'volei': '/sumula-volei',
                                        'futsal': '/sumula-futsal',
                                        'basquete': '/sumula-basquete',
                                        'handebol': '/sumula-handebol',
                                        'beach-tennis': '/sumula-beach-tennis',
                                        'futebol7': '/sumula-futebol7',
                                        'futevolei': '/sumula-futevolei',
                                        'volei-praia': '/sumula-volei-praia',
                                        'tenis-mesa': '/sumula-tenis-mesa',
                                        'jiu-jitsu': '/sumula-jiu-jitsu'
                                    };
                                    const suffix = sumulaRoutes[sportSlug] || '/sumula';
                                    window.location.href = `/admin/matches/${selectedMatch.id}${suffix}`;
                                }}
                                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                            >
                                Ver Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Partidas</h1>
                    <p className="text-gray-500">Gerencie todos os jogos e súmulas.</p>
                </div>

                <div className="flex items-center bg-white p-1 rounded-lg border border-gray-200 shadow-sm overflow-x-auto max-w-full no-scrollbar">
                    <button
                        onClick={() => setFilterPeriod('all')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${filterPeriod === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Todas
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1 flex-shrink-0"></div>
                    <button
                        onClick={() => setFilterPeriod('today')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${filterPeriod === 'today' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Hoje
                    </button>
                    <button
                        onClick={() => setFilterPeriod('yesterday')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${filterPeriod === 'yesterday' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Ontem
                    </button>
                    <button
                        onClick={() => setFilterPeriod('week')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${filterPeriod === 'week' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        Esta Semana
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredMatches.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            Nenhuma partida encontrada para este filtro.
                        </div>
                    )}
                    {filteredMatches.map(match => (
                        <div key={match.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex flex-col items-center md:items-start min-w-[150px]">
                                    <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">
                                        {match.championship?.name}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Calendar className="w-4 h-4" />
                                        <span>{new Date(match.start_time).toLocaleDateString()} {new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="mt-2">{getStatusBadge(match.status)}</div>
                                </div>

                                <div className="flex-1 flex items-center justify-center gap-3 md:gap-8 w-full md:w-auto">
                                    <div className="text-right flex-1 min-w-0">
                                        <h3 className="text-sm md:text-lg font-bold text-gray-900 truncate">{match.home_team?.name}</h3>
                                        <span className="text-[10px] md:text-xs text-gray-400">Mandante</span>
                                    </div>

                                    <div className="flex flex-col items-center px-4 bg-gray-50 rounded-lg py-2 shrink-0">
                                        <span className="text-2xl md:text-3xl font-black text-indigo-900 font-mono">
                                            {match.home_score ?? '-'} : {match.away_score ?? '-'}
                                        </span>
                                        {(match.home_penalty_score != null || match.away_penalty_score != null) && (match.home_penalty_score > 0 || match.away_penalty_score > 0) && (
                                            <span className="text-[10px] text-gray-500 font-bold">
                                                ({match.home_penalty_score} x {match.away_penalty_score} Pen.)
                                            </span>
                                        )}
                                        <span className="text-[10px] md:text-xs text-gray-400 uppercase font-bold mt-1">Placar</span>
                                    </div>

                                    <div className="text-left flex-1 min-w-0">
                                        <h3 className="text-sm md:text-lg font-bold text-gray-900 truncate">{match.away_team?.name}</h3>
                                        <span className="text-[10px] md:text-xs text-gray-400">Visitante</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 min-w-[150px] justify-end">
                                    <button
                                        onClick={() => openEditModal(match)}
                                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Editar horário/local"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>

                                    {match.status === 'finished' ? (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => { setSelectedMatch(match); setIsSummaryOpen(true); }}
                                                className="p-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors text-amber-600 hover:bg-amber-50"
                                                title="Resumo e Craque do Jogo"
                                            >
                                                <Star className="w-4 h-4" />
                                                Resumo
                                            </button>
                                            <Link
                                                to={`/admin/matches/${match.id}/sumula-print`}
                                                className="p-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors text-gray-600 hover:bg-gray-100"
                                                title="Imprimir Súmula"
                                            >
                                                <Printer className="w-4 h-4" />
                                                Imprimir
                                            </Link>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => openArbitration(match)}
                                            className="p-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-colors text-indigo-600 hover:bg-indigo-50"
                                            title="Abrir Súmula"
                                        >
                                            <ClipboardList className="w-4 h-4" />
                                            Súmula
                                        </button>
                                    )}

                                    <button className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
