import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Plus, User, Edit2, MoreHorizontal, Trash2, CheckCircle, Clock, Trophy, Copy, Loader2, ArrowRight } from 'lucide-react';
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
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [removeBg, setRemoveBg] = useState(true);
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
        setPhotoPreview(null);
        setRemoveBg(true);
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
            if (photoFile && !editingPlayer) {
                formData.append('photo_file', photoFile);
            }
            if (removeBg && photoFile && !editingPlayer) {
                formData.append('remove_bg', '1');
            }
            if (selectedChampionshipId) {
                formData.append('championship_id', String(selectedChampionshipId));
            }

            if (editingPlayer) {
                formData.append('_method', 'PUT');
                await api.post(`/teams/${id}/players/${editingPlayer.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                alert('Jogador atualizado!');
            } else {
                await api.post(`/teams/${id}/players`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
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
        setPhotoPreview(null);
        setRemoveBg(true);
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
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 pb-20 space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-bold">{editingPlayer ? 'Editar Atleta' : 'Adicionar Jogador'}</h3>
                            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">Fechar</button>
                        </div>

                        <form onSubmit={handleSavePlayer} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Nome do Atleta</label>
                                <input
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Ex: João da Silva"
                                    value={newPlayerName}
                                    onChange={e => setNewPlayerName(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Posição</label>
                                    <input
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Ex: Goleiro"
                                        value={newPlayerPos}
                                        onChange={e => setNewPlayerPos(e.target.value)}
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Número</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Camisa"
                                        value={newPlayerNum}
                                        onChange={e => setNewPlayerNum(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">CPF (Opcional - Cria usuário automático)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="000.000.000-00"
                                    value={newPlayerCpf}
                                    onChange={e => setNewPlayerCpf(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                    <h2 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2 mb-4">
                                        <User className="w-4 h-4 text-indigo-500" />
                                        Fotos do Atleta
                                    </h2>
                                    {editingPlayer ? (
                                        <div className="flex flex-col gap-4 pb-2">
                                            <TeamPlayerPhotoUploadSection
                                                playerId={editingPlayer.id.toString()}
                                                teamId={id!}
                                                currentPhotos={editingPlayer.photo_url || (editingPlayer.pivot as any)?.photo_urls}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-4 py-2">
                                            <div className="relative">
                                                <div className="w-24 h-24 rounded-full overflow-hidden bg-white border-4 border-white shadow-md">
                                                    {photoPreview ? (
                                                        <img
                                                            src={photoPreview}
                                                            alt="Preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <User className="w-10 h-10 text-gray-300" />
                                                        </div>
                                                    )}
                                                </div>
                                                <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full cursor-pointer hover:bg-indigo-700 transition-colors shadow-lg">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                setPhotoFile(file);
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => {
                                                                    setPhotoPreview(reader.result as string);
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                        className="hidden"
                                                    />
                                                    <Plus className="w-3 h-3" />
                                                </label>
                                            </div>
                                            <p className="text-[10px] text-gray-500">Clique para adicionar sua foto (ela será a principal)</p>

                                            <div className="flex items-center gap-2 mt-2">
                                                <input
                                                    type="checkbox"
                                                    id="removeBgNew"
                                                    checked={removeBg}
                                                    onChange={e => setRemoveBg(e.target.checked)}
                                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                                />
                                                <label htmlFor="removeBgNew" className="text-xs font-medium text-gray-700 cursor-pointer">
                                                    Remover fundo com IA ao salvar
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Documento (Opcional)</label>
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        onChange={e => setDocumentFile(e.target.files ? e.target.files[0] : null)}
                                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Para validação (Foto/PDF).</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Email (Opcional - p/ vincular login)</label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="email@usuario.com"
                                    value={newPlayerEmail}
                                    onChange={e => setNewPlayerEmail(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Se o email já existir na plataforma, o perfil será vinculado.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Apelido</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Ex: Canhotinha"
                                        value={newPlayerNickname}
                                        onChange={e => setNewPlayerNickname(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Telefone</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="(00) 00000-0000"
                                        value={newPlayerPhone}
                                        onChange={e => setNewPlayerPhone(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Data de Nascimento</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={newPlayerBirthDate}
                                        onChange={e => setNewPlayerBirthDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Gênero</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                        value={newPlayerGender}
                                        onChange={e => setNewPlayerGender(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="M">Masculino</option>
                                        <option value="F">Feminino</option>
                                        <option value="O">Outro</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Endereço</label>
                                <input
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Rua, número, bairro..."
                                    value={newPlayerAddress}
                                    onChange={e => setNewPlayerAddress(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={adding}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors mt-4 disabled:opacity-75"
                            >
                                {adding ? 'Salvando...' : 'Confirmar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
