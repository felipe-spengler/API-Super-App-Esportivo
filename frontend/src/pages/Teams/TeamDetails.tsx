import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Trophy, Loader2, Plus, User as UserIcon, CheckCircle, Clock, Trash2, X, Edit, Copy } from 'lucide-react';
import api from '../../services/api';
import { PlayerEditModal } from '../Players/PlayerEditModal';
import { useAuth } from '../../context/AuthContext';
import { clsx } from 'clsx';

interface Player {
    id: number;
    name: string;
    position: string;
    number: string;
}

interface Championship {
    id: number;
    name: string;
    status: string;
    category_name?: string;
    sport?: {
        name: string;
    };
    pivot?: {
        category_id?: number | null;
        captain_id?: number | null;
    };
}

interface Team {
    id: number;
    name: string;
    city: string;
    logo_url?: string;
    primary_color?: string;
    captain_id: number;
    players: Player[];
    championships: Championship[];
}

export function TeamDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const fromChampionshipId = location.state?.fromChampionshipId;

    // State to toggle between Championship Selector and Roster View
    // If we came from a specific championship, start in roster view. Otherwise selector.
    const [viewMode, setViewMode] = useState<'selector' | 'roster'>(fromChampionshipId ? 'roster' : 'selector');
    const [selectedChampionshipId, setSelectedChampionshipId] = useState<number | null>(fromChampionshipId || null);

    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.is_admin || user?.role === 'super_admin';

    // Form states
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerNickname, setNewPlayerNickname] = useState('');
    const [newPlayerPos, setNewPlayerPos] = useState('');
    const [newPlayerNum, setNewPlayerNum] = useState('');
    const [newPlayerEmail, setNewPlayerEmail] = useState('');
    const [newPlayerCpf, setNewPlayerCpf] = useState('');
    const [newPlayerBirthDate, setNewPlayerBirthDate] = useState('');
    const [newPlayerGender, setNewPlayerGender] = useState('');
    const [newPlayerPhone, setNewPlayerPhone] = useState('');
    const [newPlayerAddress, setNewPlayerAddress] = useState('');
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoFiles, setPhotoFiles] = useState<(File | null)[]>([null, null, null]);
    const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null, null]);
    const [removeBg, setRemoveBg] = useState(true);
    const [adding, setAdding] = useState(false);
    const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
    const [isCopying, setIsCopying] = useState(false);

    useEffect(() => {
        loadTeam();
    }, [id, selectedChampionshipId]); // Reload when ID or selected context changes

    async function loadTeam() {
        setLoading(true);
        try {
            // If in selector mode, we still need basic team info + championships list.
            // Getting global players (null) is fine as default.
            const response = await api.get(`/admin/teams/${id}`, {
                params: {
                    championship_id: selectedChampionshipId
                }
            });
            setTeam(response.data);
        } catch (error) {
            console.error("Erro ao carregar time:", error);
        } finally {
            setLoading(false);
        }
    }

    function handleSelectChampionship(champId: number | null) {
        setSelectedChampionshipId(champId);
        setViewMode('roster');
    }

    async function handleAddPlayer(e: React.FormEvent) {
        e.preventDefault();
        setAdding(true);
        try {
            const formData = new FormData();
            formData.append('name', newPlayerName);
            formData.append('nickname', newPlayerNickname);
            formData.append('position', newPlayerPos);
            formData.append('number', newPlayerNum);
            formData.append('email', newPlayerEmail);
            formData.append('cpf', newPlayerCpf);
            formData.append('birth_date', newPlayerBirthDate);
            formData.append('gender', newPlayerGender);
            formData.append('phone', newPlayerPhone);
            formData.append('address', newPlayerAddress);

            if (documentFile) {
                formData.append('document_file', documentFile);
            }
            if (photoFiles[0]) {
                formData.append('photo_file', photoFiles[0]);
                if (removeBg) formData.append('remove_bg', '1');
            }
            if (photoFiles[1]) formData.append('photo_file_1', photoFiles[1]);
            if (photoFiles[2]) formData.append('photo_file_2', photoFiles[2]);

            if (selectedChampionshipId) {
                formData.append('championship_id', String(selectedChampionshipId));
            }

            await api.post(`/teams/${id}/players`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setShowAddModal(false);
            resetForm();
            loadTeam();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Erro ao adicionar jogador.');
        } finally {
            setAdding(false);
        }
    }

    function resetForm() {
        setNewPlayerName('');
        setNewPlayerNickname('');
        setNewPlayerPos('');
        setNewPlayerNum('');
        setNewPlayerEmail('');
        setNewPlayerCpf('');
        setNewPlayerBirthDate('');
        setNewPlayerGender('');
        setNewPlayerPhone('');
        setNewPlayerAddress('');
        setDocumentFile(null);
        setPhotoFile(null);
        setPhotoFiles([null, null, null]);
        setPhotoPreviews([null, null, null]);
        setRemoveBg(true);
    }

    async function handleSetChampionshipCaptain(playerId: number | null) {
        if (!selectedChampionshipId) return;
        const msg = playerId ? 'Definir este jogador como líder/capitão para este campeonato?' : 'Remover líder atual deste campeonato?';
        if (!window.confirm(msg)) return;

        try {
            await api.patch(`/admin/teams/${id}/championship-captain`, {
                championship_id: selectedChampionshipId,
                category_id: team?.championships.find(c => c.id === selectedChampionshipId)?.pivot?.category_id,
                captain_id: playerId
            });
            loadTeam();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Erro ao definir capitão.');
        }
    }

    async function handleRemovePlayer(playerId: number) {
        if (!window.confirm('Remover jogador da equipe?')) return;
        try {
            await api.delete(`/admin/teams/${id}/players/${playerId}`, {
                params: {
                    championship_id: selectedChampionshipId
                }
            });
            loadTeam();
        } catch (error) {
            console.error(error);
            alert('Erro ao remover jogador.');
        }
    }

    async function handleCopyFromGeneral() {
        if (!selectedChampionshipId) return;
        if (!window.confirm('Deseja copiar todos os jogadores da base geral (sem vínculo) para este campeonato? Jogadores já vinculados não serão duplicados.')) return;

        setIsCopying(true);
        try {
            const response = await api.post(`/admin/teams/${id}/copy-roster`, {
                championship_id: selectedChampionshipId
            });
            alert(response.data.message || 'Sincronização concluída!');
            loadTeam();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Erro ao copiar jogadores.');
        } finally {
            setIsCopying(false);
        }
    }

    async function handleDeleteTeam() {
        if (!window.confirm('Tem certeza que deseja excluir esta equipe permanentemente? Esta ação não pode ser desfeita.')) return;
        try {
            await api.delete(`/admin/teams/${id}`);
            navigate('/admin/teams');
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Erro ao excluir equipe.');
        }
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!team) {
        return <div className="text-center p-8">Time não encontrado</div>;
    }

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => {
                        if (fromChampionshipId) {
                            navigate(`/admin/championships/${fromChampionshipId}/teams`);
                        } else {
                            navigate('/admin/teams');
                        }
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800 flex-1">
                    Detalhes da equipe
                    {fromChampionshipId && <span className="text-sm font-normal text-gray-500 ml-2">(Contexto: Campeonato)</span>}
                </h1>
                <div className="flex items-center gap-2">
                    {isAdmin && team?.championships.length === 0 && team?.players.length === 0 && (
                        <button
                            onClick={handleDeleteTeam}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors font-bold flex items-center gap-2 shadow-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                            Excluir Equipe
                        </button>
                    )}
                    <button
                        onClick={() => navigate(`/admin/teams/${id}/edit`)}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2 shadow-sm"
                    >
                        <Shield className="w-4 h-4 text-indigo-500" />
                        Editar Dados
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-6">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center border-2 border-indigo-100 overflow-hidden">
                    {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                    ) : (
                        <Shield className="w-10 h-10 text-indigo-300" />
                    )}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{team.name}</h2>
                    <p className="text-gray-500">{team.city || 'Cidade não informada'}</p>
                    <div className="flex gap-2 mt-2">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
                            {team.players.length} Jogadores
                        </span>
                    </div>
                </div>
            </div>


            {/*  Selector Mode */}
            {
                team && viewMode === 'selector' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-indigo-600" />
                            Selecione o Contexto
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Card: Base de Atletas (Global) */}
                            <div
                                onClick={() => handleSelectChampionship(null)}
                                className="bg-white p-6 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-gray-50 cursor-pointer transition-all group"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-colors">
                                        <Users className="w-6 h-6 text-gray-500 group-hover:text-indigo-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800">Base Geral</h4>
                                        <p className="text-xs text-gray-500">Atletas sem vínculo específico</p>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                                    Acesso ao elenco padrão
                                </div>
                            </div>

                            {/* Cards: Championships */}
                            {team.championships.map(camp => (
                                <div
                                    key={camp.id}
                                    onClick={() => handleSelectChampionship(camp.id)}
                                    className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 cursor-pointer transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-2 opacity-50">
                                        <Trophy className="w-24 h-24 text-gray-50 -rotate-12 translate-x-8 -translate-y-8" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${camp.status === 'active' || camp.status === 'ongoing' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {camp.status}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                                                {camp.sport?.name}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">{camp.name}</h4>
                                        {camp.category_name && (
                                            <p className="text-sm text-gray-500 mb-4">Categoria: {camp.category_name}</p>
                                        )}
                                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
                                            Gerenciar Elenco <ArrowLeft className="w-3 h-3 rotate-180 ml-1" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Roster Mode */}
            {
                viewMode === 'roster' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="col-span-1 md:col-span-2 flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-600" />
                                <span className="font-bold text-gray-700">
                                    Contexto: {selectedChampionshipId ? (team?.championships.find(c => c.id === selectedChampionshipId)?.name || 'Campeonato') : 'Base Geral (Sem Vínculo)'}
                                </span>
                            </div>
                            <button
                                onClick={() => setViewMode('selector')}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                            >
                                Trocar Contexto
                            </button>
                        </div>

                        {/* Elenco */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                    <h3 className="font-bold text-gray-900">Elenco Atual</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedChampionshipId && (
                                        <button
                                            onClick={handleCopyFromGeneral}
                                            disabled={isCopying}
                                            className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50 shadow-sm border border-emerald-100"
                                            title="Copiar jogadores cadastrados na Base Geral para este campeonato"
                                        >
                                            {isCopying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                            Copiar da Base Geral
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg flex items-center gap-1 text-xs font-bold hover:bg-indigo-100 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> Add
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {team.players.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center py-4">Nenhum jogador cadastrado</p>
                                ) : (
                                    team.players.map(player => (
                                        <div key={player.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-50 hover:border-gray-100 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700 relative">
                                                    {player.name.substring(0, 2).toUpperCase()}
                                                    {selectedChampionshipId && team?.championships.find(c => c.id === selectedChampionshipId)?.pivot?.captain_id === player.id && (
                                                        <div className="absolute -top-1 -right-1 bg-amber-400 text-[8px] text-white p-0.5 rounded-full shadow-sm" title="Líder do Time">
                                                            <Shield className="w-2.5 h-2.5 fill-current" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                                                        {player.name}
                                                        {team.captain_id === player.id && (
                                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded" title="Capitão Global">G</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{player.position}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {selectedChampionshipId && (
                                                    <button
                                                        onClick={() => handleSetChampionshipCaptain(team?.championships.find(c => c.id === selectedChampionshipId)?.pivot?.captain_id === player.id ? null : player.id)}
                                                        className={clsx(
                                                            "p-1.5 rounded-md transition-colors",
                                                            team?.championships.find(c => c.id === selectedChampionshipId)?.pivot?.captain_id === player.id
                                                                ? "text-amber-500 bg-amber-50"
                                                                : "text-gray-400 hover:text-amber-500 hover:bg-amber-50"
                                                        )}
                                                        title={team?.championships.find(c => c.id === selectedChampionshipId)?.pivot?.captain_id === player.id ? "Remover de Líder" : "Tornar Líder do Campeonato"}
                                                    >
                                                        <Shield className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <div className="text-sm font-bold text-gray-400 mr-2">
                                                    #{player.number || '-'}
                                                </div>
                                                <button
                                                    onClick={() => setEditingPlayerId(player.id)}
                                                    className="p-1.5 text-indigo-400 hover:bg-indigo-50 rounded-md transition-colors"
                                                    title="Editar Jogador"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleRemovePlayer(player.id)}
                                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Remover Jogador"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Hidden Championships List in Roster Mode (Use Selector to view them) */}
            {/* We hide the Championships card in roster mode to focus on the roster */}

            {/* Removed the small Championships card from here as it is now the main selector */}

            {/* Add Player Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
                                <h3 className="text-xl font-bold text-gray-900">Adicionar Jogador</h3>
                                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleAddPlayer} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                                {/* Photo Boxes Section */}
                                <div className="space-y-4 pb-6 border-b border-gray-100">
                                    <div className="flex items-center gap-2 mb-4">
                                        <input
                                            type="checkbox"
                                            id="removeBgAdd"
                                            checked={removeBg}
                                            onChange={e => setRemoveBg(e.target.checked)}
                                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                        />
                                        <label htmlFor="removeBgAdd" className="text-sm font-medium text-gray-700 cursor-pointer">
                                            Remover fundo com IA (automático na principal ao salvar)
                                        </label>
                                    </div>

                                    <div className="flex gap-4 flex-wrap">
                                        {[0, 1, 2].map((index) => (
                                            <div key={index} className="relative w-28 h-28 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden hover:border-indigo-400 transition-colors group">
                                                {photoPreviews[index] ? (
                                                    <>
                                                        <img src={photoPreviews[index]!} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newFiles = [...photoFiles];
                                                                const newPreviews = [...photoPreviews];
                                                                newFiles[index] = null;
                                                                newPreviews[index] = null;
                                                                setPhotoFiles(newFiles);
                                                                setPhotoPreviews(newPreviews);
                                                            }}
                                                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-indigo-600">
                                                        <Plus className="w-6 h-6 mb-1" />
                                                        <span className="text-[10px] uppercase font-bold">Foto {index + 1}</span>
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const newFiles = [...photoFiles];
                                                                    const newPreviews = [...photoPreviews];
                                                                    newFiles[index] = file;
                                                                    setPhotoFiles(newFiles);

                                                                    const reader = new FileReader();
                                                                    reader.onloadend = () => {
                                                                        newPreviews[index] = reader.result as string;
                                                                        setPhotoPreviews(newPreviews);
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                )}
                                                {index === 0 && <span className="absolute bottom-0 left-0 right-0 bg-indigo-600 text-white text-[9px] text-center py-0.5">Principal</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Nome do Atleta</label>
                                        <input
                                            required
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                            placeholder="Ex: João da Silva"
                                            value={newPlayerName}
                                            onChange={e => setNewPlayerName(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Apelido (Opcional)</label>
                                        <input
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                            placeholder="Ex: Canhotinha"
                                            value={newPlayerNickname}
                                            onChange={e => setNewPlayerNickname(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Posição</label>
                                        <input
                                            required={!isAdmin}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                            placeholder="Ex: Goleiro"
                                            value={newPlayerPos}
                                            onChange={e => setNewPlayerPos(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Número</label>
                                        <input
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center text-sm"
                                            placeholder="00"
                                            value={newPlayerNum}
                                            onChange={e => setNewPlayerNum(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Data Nasc.</label>
                                        <input
                                            required={!isAdmin}
                                            type="date"
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                            value={newPlayerBirthDate}
                                            onChange={e => setNewPlayerBirthDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Sexo</label>
                                        <select
                                            required={!isAdmin}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                            value={newPlayerGender}
                                            onChange={e => setNewPlayerGender(e.target.value)}
                                        >
                                            <option value="">Selecione</option>
                                            <option value="M">Masculino</option>
                                            <option value="F">Feminino</option>
                                            <option value="O">Outro</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">CPF</label>
                                        <input
                                            required={!isAdmin}
                                            type="text"
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                            placeholder="000.000.000-00"
                                            value={newPlayerCpf}
                                            onChange={e => setNewPlayerCpf(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Email</label>
                                        <input
                                            required={!isAdmin}
                                            type="email"
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                            placeholder="atleta@email.com"
                                            value={newPlayerEmail}
                                            onChange={e => setNewPlayerEmail(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Telefone (Opcional)</label>
                                        <input
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                            placeholder="(00) 00000-0000"
                                            value={newPlayerPhone}
                                            onChange={e => setNewPlayerPhone(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Endereço (Opcional)</label>
                                        <input
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                                            placeholder="Rua, número, bairro..."
                                            value={newPlayerAddress}
                                            onChange={e => setNewPlayerAddress(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Documento (Opcional - PDF/Img)</label>
                                        <input
                                            type="file"
                                            accept=".pdf,image/*"
                                            onChange={e => setDocumentFile(e.target.files?.[0] || null)}
                                            className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={adding}
                                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-75"
                                    >
                                        {adding ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Adicionando...
                                            </>
                                        ) : (
                                            'Cadastrar Atleta'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Player Edit Modal */}
            {
                editingPlayerId && (
                    <PlayerEditModal
                        playerId={editingPlayerId}
                        teamId={team?.id}
                        championshipId={selectedChampionshipId || undefined}
                        onClose={() => setEditingPlayerId(null)}
                        onSuccess={() => {
                            loadTeam();
                            setEditingPlayerId(null);
                        }}
                    />
                )
            }
        </div >
    );
}
