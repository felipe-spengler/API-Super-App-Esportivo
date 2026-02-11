import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Trophy, Loader2, Plus, User as UserIcon, CheckCircle, Clock, Trash2, X, Edit } from 'lucide-react';
import api from '../../services/api';
import { PlayerEditModal } from '../Players/PlayerEditModal';
import { useAuth } from '../../context/AuthContext';

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
    const [adding, setAdding] = useState(false);
    const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);

    useEffect(() => {
        loadTeam();
    }, [id]);

    async function loadTeam() {
        setLoading(true);
        try {
            const response = await api.get(`/admin/teams/${id}`, {
                params: {
                    championship_id: fromChampionshipId
                }
            });
            setTeam(response.data);
        } catch (error) {
            console.error("Erro ao carregar time:", error);
        } finally {
            setLoading(false);
        }
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
            if (photoFile) {
                formData.append('photo_file', photoFile);
            }

            if (fromChampionshipId) {
                formData.append('championship_id', fromChampionshipId);
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
    }

    async function handleRemovePlayer(playerId: number) {
        if (!window.confirm('Remover jogador da equipe?')) return;
        try {
            await api.delete(`/admin/teams/${id}/players/${playerId}`, {
                params: {
                    championship_id: fromChampionshipId
                }
            });
            loadTeam();
        } catch (error) {
            console.error(error);
            alert('Erro ao remover jogador.');
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
                <button
                    onClick={() => navigate(`/admin/teams/${id}/edit`)}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center gap-2 shadow-sm"
                >
                    <Shield className="w-4 h-4 text-indigo-500" />
                    Editar Dados
                </button>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Elenco */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            <h3 className="font-bold text-gray-900">Elenco Atual</h3>
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="p-2 bg-indigo-50 text-indigo-600 rounded-lg flex items-center gap-1 text-xs font-bold hover:bg-indigo-100 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Add
                        </button>
                    </div>

                    <div className="space-y-3">
                        {team.players.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">Nenhum jogador cadastrado</p>
                        ) : (
                            team.players.map(player => (
                                <div key={player.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-50 hover:border-gray-100 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
                                            {player.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{player.name}</p>
                                            <p className="text-xs text-gray-500">{player.position}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
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

                {/* Campeonatos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <h3 className="font-bold text-gray-900">Campeonatos</h3>
                    </div>

                    <div className="space-y-3">
                        {team.championships.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">Nenhuma participação recente</p>
                        ) : (
                            team.championships.map(camp => (
                                <div key={camp.id} className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-sm font-bold text-gray-900 line-clamp-1">{camp.name}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">
                                                    {camp.sport?.name || 'Esporte'}
                                                </span>
                                                {camp.category_name && (
                                                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">
                                                        Cat: {camp.category_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded text-gray-500 font-bold uppercase tracking-wider">
                                            {camp.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Add Player Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">Adicionar Jogador</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleAddPlayer} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Foto (Opcional)</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => setPhotoFile(e.target.files?.[0] || null)}
                                        className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Doc (PDF/Img)</label>
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
            )}

            {/* Player Edit Modal */}
            {editingPlayerId && (
                <PlayerEditModal
                    playerId={editingPlayerId}
                    onClose={() => setEditingPlayerId(null)}
                    onSuccess={() => {
                        loadTeam();
                        setEditingPlayerId(null);
                    }}
                />
            )}
        </div>
    );
}
