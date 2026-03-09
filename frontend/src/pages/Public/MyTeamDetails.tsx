import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Plus, User, Edit2, MoreHorizontal, Trash2, CheckCircle, Clock, Trophy, Copy, Loader2, ArrowRight, X } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { TeamPlayerPhotoUploadSection } from './components/TeamPlayerPhotoUploadSection';

interface Player {
    id: number;
    name: string;
    email?: string;
    position: string;
    number?: string;
    pivot?: {
        temp_player_name?: string;
        is_approved: number;
        user_id?: number | null;
        id: number; // pivot id
        number?: string;
        position?: string;
    };
    photo_url?: string;
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
        captain_id?: number | null;
        category_id?: number | null;
    };
}

interface Team {
    id: number;
    name: string;
    city?: string;
    captain_id: number;
    players: Player[];
    championships: Championship[];
}

export function MyTeamDetails() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();

    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewMode, setViewMode] = useState<'selector' | 'roster'>('selector');
    const [selectedChampionshipId, setSelectedChampionshipId] = useState<number | null>(null);
    const [isCopying, setIsCopying] = useState(false);

    // Form states
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerPos, setNewPlayerPos] = useState('');
    const [newPlayerNum, setNewPlayerNum] = useState('');
    const [newPlayerEmail, setNewPlayerEmail] = useState('');
    const [newPlayerCpf, setNewPlayerCpf] = useState('');
    const [newPlayerNickname, setNewPlayerNickname] = useState('');
    const [newPlayerPhone, setNewPlayerPhone] = useState('');
    const [newPlayerBirthDate, setNewPlayerBirthDate] = useState('');
    const [newPlayerGender, setNewPlayerGender] = useState('');
    const [newPlayerAddress, setNewPlayerAddress] = useState('');
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoFiles, setPhotoFiles] = useState<(File | null)[]>([null, null, null]);
    const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null, null]);
    const [removeBg, setRemoveBg] = useState(true);
    const [newPlayerPassword, setNewPlayerPassword] = useState('');
    const [adding, setAdding] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

    useEffect(() => {
        loadTeam();
    }, [id, selectedChampionshipId]);

    async function loadTeam() {
        try {
            const response = await api.get(`/teams/${id}`, {
                params: {
                    championship_id: selectedChampionshipId
                }
            });
            setTeam(response.data);
        } catch (error) {
            alert('Erro ao carregar time');
            navigate('/profile/teams');
        } finally {
            setLoading(false);
        }
    }

    function handleSelectChampionship(champId: number | null) {
        setSelectedChampionshipId(champId);
        setViewMode('roster');
    }

    async function handleCopyFromGeneral() {
        if (!selectedChampionshipId) return;
        if (!window.confirm('Deseja copiar todos os jogadores da base geral (sem vínculo) para este campeonato? Jogadoresjá vinculados não serão duplicados.')) return;

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

    function openEditModal(player: Player) {
        setEditingPlayer(player);
        setNewPlayerName(player.pivot?.temp_player_name || player.name);
        setNewPlayerPos(player.pivot?.position || player.position || '');
        setNewPlayerNum(player.pivot?.number || player.number || '');
        setNewPlayerEmail(player.email || '');
        // Other fields might not be available directly on the player object returned here
        // Set them to empty or fetch if needed
        setNewPlayerCpf('');
        setNewPlayerNickname('');
        setNewPlayerPhone('');
        setNewPlayerBirthDate('');
        setNewPlayerGender('');
        setNewPlayerAddress('');
        setDocumentFile(null);
        setPhotoFile(null);
        setPhotoFiles([null, null, null]);
        setPhotoPreviews([null, null, null]);
        setRemoveBg(true);
        setNewPlayerPassword('');
        setShowAddModal(true);
    }

    async function handleSavePlayer(e: React.FormEvent) {
        e.preventDefault();
        setAdding(true);
        try {
            const formData = new FormData();
            formData.append('name', newPlayerName);
            formData.append('position', newPlayerPos);
            formData.append('number', newPlayerNum);
            formData.append('email', newPlayerEmail);
            formData.append('cpf', newPlayerCpf);
            formData.append('nickname', newPlayerNickname);
            formData.append('phone', newPlayerPhone);
            formData.append('birth_date', newPlayerBirthDate);
            formData.append('gender', newPlayerGender);
            formData.append('address', newPlayerAddress);
            if (documentFile) {
                formData.append('document_file', documentFile);
            }
            if (newPlayerPassword) {
                formData.append('password', newPlayerPassword);
            }
            if (!editingPlayer) {
                if (photoFiles[0]) {
                    formData.append('photo_file', photoFiles[0]);
                    if (removeBg) formData.append('remove_bg', '1');
                }
                if (photoFiles[1]) formData.append('photo_file_1', photoFiles[1]);
                if (photoFiles[2]) formData.append('photo_file_2', photoFiles[2]);
            }
            if (selectedChampionshipId) {
                formData.append('championship_id', String(selectedChampionshipId));
            }

            if (editingPlayer) {
                formData.append('_method', 'PUT');
                await api.post(`/teams/${id}/players/${editingPlayer.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 120000 // 2 minutes for AI processing
                });
                alert('Jogador atualizado!');
            } else {
                await api.post(`/teams/${id}/players`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 120000 // 2 minutes for AI processing
                });
                alert('Jogador adicionado!');
            }

            setShowAddModal(false);
            resetForm();
            loadTeam();
        } catch (error) {
            alert('Erro ao salvar jogador.');
        } finally {
            setAdding(false);
        }
    }

    async function handleDeletePlayer(playerId: number) {
        if (!window.confirm('Deseja realmente remover este jogador do time (neste contexto)?')) return;
        try {
            await api.delete(`/teams/${id}/players/${playerId}`, {
                data: { championship_id: selectedChampionshipId }
            });
            alert('Jogador removido!');
            loadTeam();
        } catch (error) {
            alert('Erro ao remover jogador');
        }
    }

    function resetForm() {
        setNewPlayerName('');
        setNewPlayerPos('');
        setNewPlayerNum('');
        setNewPlayerEmail('');
        setNewPlayerCpf('');
        setNewPlayerNickname('');
        setNewPlayerPhone('');
        setNewPlayerBirthDate('');
        setNewPlayerGender('');
        setNewPlayerAddress('');
        setDocumentFile(null);
        setPhotoFile(null);
        setPhotoFiles([null, null, null]);
        setPhotoPreviews([null, null, null]);
        setRemoveBg(true);
        setNewPlayerPassword('');
        setEditingPlayer(null);
    }

    // Helper to evaluate if the user is a captain globally or for the specific selected championship
    const isGlobalCaptain = user?.id === team?.captain_id;
    const isChampionshipCaptain = selectedChampionshipId && team?.championships.find(c => c.id === selectedChampionshipId)?.pivot?.captain_id === user?.id;
    const isCaptain = isGlobalCaptain || isChampionshipCaptain;

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;
    if (!team) return <div className="p-8 text-center text-gray-500">Time não encontrado</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
                <div className="flex items-center">
                    <button onClick={() => navigate('/profile/teams')} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 leading-none">{team.name}</h1>
                        <span className="text-xs text-gray-500">{team.city}</span>
                    </div>
                </div>
                {isCaptain && viewMode === 'roster' && (
                    <button
                        onClick={() => {
                            resetForm();
                            setShowAddModal(true);
                        }}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg flex items-center gap-1 text-xs font-bold hover:bg-indigo-100"
                    >
                        <Plus className="w-4 h-4" /> Add Jogador
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="max-w-lg mx-auto p-4 space-y-6">

                {/*  Selector Mode */}
                {viewMode === 'selector' && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 px-1">
                            <Trophy className="w-5 h-5 text-indigo-600" />
                            <h2 className="font-bold text-gray-800">Selecione o Elenco</h2>
                        </div>

                        <div className="grid gap-4">
                            {team.championships.length === 0 && (
                                <div className="text-center p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">Este time ainda não está vinculado a nenhum campeonato.</p>
                                </div>
                            )}

                            {/* Cards: Championships */}
                            {team.championships.map(camp => (
                                <button
                                    key={camp.id}
                                    onClick={() => handleSelectChampionship(camp.id)}
                                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-100 transition-all text-left group"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex gap-2">
                                            <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${camp.status === 'active' || camp.status === 'ongoing' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {camp.status}
                                            </span>
                                            <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase">
                                                {camp.sport?.name}
                                            </span>
                                        </div>
                                    </div>
                                    <h4 className="font-black text-gray-900 leading-tight mb-1">{camp.name}</h4>
                                    {camp.category_name && <p className="text-[11px] text-gray-500 font-bold uppercase">Cat: {camp.category_name}</p>}
                                    <div className="mt-4 flex items-center text-[11px] font-black text-indigo-600 uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                                        Ver Elenco <ArrowRight className="w-3 h-3 ml-1" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Roster Mode */}
                {viewMode === 'roster' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Shield className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                                <span className="font-bold text-xs text-gray-700 truncate">
                                    {selectedChampionshipId ? (team?.championships.find(c => c.id === selectedChampionshipId)?.name || 'Campeonato') : 'Base Geral'}
                                </span>
                            </div>
                            <button
                                onClick={() => setViewMode('selector')}
                                className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-tighter"
                            >
                                ALTERAR
                            </button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Atletas ({team.players.length})
                                    </span>
                                </div>

                                {selectedChampionshipId && isCaptain && (
                                    <button
                                        onClick={handleCopyFromGeneral}
                                        disabled={isCopying}
                                        className="w-full py-2 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center gap-2 text-xs font-bold border border-emerald-100 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {isCopying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                                        SINCRONIZAR COM BASE GERAL
                                    </button>
                                )}
                            </div>

                            <div className="divide-y divide-gray-100">
                                {team.players.map(player => (
                                    <div key={player.id} className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 overflow-hidden">
                                                {player.photo_url ? <img src={player.photo_url} className="w-full h-full object-cover" /> : <User className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 text-sm">
                                                    {player.pivot?.temp_player_name || player.name}
                                                    {player.pivot?.number && <span className="ml-1 text-gray-400">#{player.pivot.number}</span>}
                                                </div>
                                                <div className="text-xs text-gray-500">{player.pivot?.position || player.position}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {player.pivot?.is_approved ? (
                                                <span className="text-emerald-500"><CheckCircle className="w-4 h-4" /></span>
                                            ) : (
                                                <span className="text-orange-500"><Clock className="w-4 h-4" /></span>
                                            )}

                                            {isCaptain && (
                                                <div className="flex gap-1">
                                                    <button onClick={() => openEditModal(player)} className="p-2 text-gray-400 hover:text-indigo-500 transition-colors">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeletePlayer(player.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {team.players.length === 0 && (
                                    <div className="p-8 text-center text-gray-400 text-sm">
                                        Nenhum jogador vinculado neste contexto.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Player Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
                            <h3 className="text-xl font-bold text-gray-900">{editingPlayer ? 'Editar Atleta' : 'Adicionar Jogador'}</h3>
                            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-2 hover:bg-white/50 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePlayer} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
                            {/* Photo Section */}
                            <div className="pb-6 border-b border-gray-100">
                                {editingPlayer ? (
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Fotos do Atleta</h4>
                                        <TeamPlayerPhotoUploadSection
                                            playerId={editingPlayer.id.toString()}
                                            teamId={id!}
                                            currentPhotos={editingPlayer.photo_url || (editingPlayer as any)?.photo_urls}
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-4">
                                            <input
                                                type="checkbox"
                                                id="removeBgPublic"
                                                checked={removeBg}
                                                onChange={e => setRemoveBg(e.target.checked)}
                                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <label htmlFor="removeBgPublic" className="text-sm font-medium text-gray-700 cursor-pointer">
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
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Nome Completo</label>
                                    <input
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="Ex: João da Silva"
                                        value={newPlayerName}
                                        onChange={e => setNewPlayerName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Posição</label>
                                    <input
                                        required
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="Ex: Atacante"
                                        value={newPlayerPos}
                                        onChange={e => setNewPlayerPos(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Número (Camisa)</label>
                                    <input
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="Ex: 10"
                                        value={newPlayerNum}
                                        onChange={e => setNewPlayerNum(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">CPF (Opcional)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                        placeholder="000.000.000-00"
                                        value={newPlayerCpf}
                                        onChange={e => setNewPlayerCpf(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Data de Nascimento</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        value={newPlayerBirthDate}
                                        onChange={e => setNewPlayerBirthDate(e.target.value)}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Email (Opcional)</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="atleta@email.com"
                                        value={newPlayerEmail}
                                        onChange={e => setNewPlayerEmail(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Apelido</label>
                                    <input
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="Ex: Canhotinha"
                                        value={newPlayerNickname}
                                        onChange={e => setNewPlayerNickname(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Telefone</label>
                                    <input
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="(00) 00000-0000"
                                        value={newPlayerPhone}
                                        onChange={e => setNewPlayerPhone(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Gênero</label>
                                    <select
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                        value={newPlayerGender}
                                        onChange={e => setNewPlayerGender(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="M">Masculino</option>
                                        <option value="F">Feminino</option>
                                        <option value="O">Outro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Documento (Opcional)</label>
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={e => setDocumentFile(e.target.files ? e.target.files[0] : null)}
                                        className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Endereço</label>
                                    <input
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="Rua, número, bairro..."
                                        value={newPlayerAddress}
                                        onChange={e => setNewPlayerAddress(e.target.value)}
                                    />
                                </div>

                                {editingPlayer && (
                                    <div className="md:col-span-2 space-y-2 pt-2 border-t border-gray-50">
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider text-indigo-600">Mudar Senha (Opcional)</label>
                                        <input
                                            type="password"
                                            className="w-full px-4 py-2.5 border border-indigo-100 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                                            placeholder="Nova senha (mínimo 6 caracteres)"
                                            value={newPlayerPassword}
                                            onChange={e => setNewPlayerPassword(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={adding}
                                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-75 mt-4"
                            >
                                {adding ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (editingPlayer ? 'Salvar Alterações' : 'Cadastrar Atleta')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
