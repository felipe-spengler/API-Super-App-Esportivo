import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Plus, User, MoreHorizontal, Trash2, CheckCircle, Clock } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

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

interface Team {
    id: number;
    name: string;
    city?: string;
    captain_id: number;
    players: Player[];
}

export function MyTeamDetails() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();

    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

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
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        loadTeam();
    }, [id]);

    async function loadTeam() {
        try {
            const response = await api.get(`/teams/${id}`);
            setTeam(response.data);
        } catch (error) {
            alert('Erro ao carregar time');
            navigate('/profile/teams');
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

            await api.post(`/teams/${id}/players`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setShowAddModal(false);
            resetForm();
            loadTeam();
            alert('Jogador adicionado!');
        } catch (error) {
            alert('Erro ao adicionar jogador.');
        } finally {
            setAdding(false);
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
    }

    const isCaptain = user?.id === team?.captain_id;

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
                {isCaptain && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg flex items-center gap-1 text-xs font-bold hover:bg-indigo-100"
                    >
                        <Plus className="w-4 h-4" /> Add Jogador
                    </button>
                )}
            </div>

            {/* Content */}
            <div className="max-w-lg mx-auto p-4">

                {/* Team Stats/Banner could go here */}

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Elenco ({team.players.length})
                        </span>
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
                                        <button className="p-2 text-gray-400 hover:text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {team.players.length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                Nenhum jogador cadastrado. Adicione atletas para começar.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Player Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 pb-20 space-y-4 max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-bold">Adicionar Jogador</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">Fechar</button>
                        </div>

                        <form onSubmit={handleAddPlayer} className="space-y-3">
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
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Documento (Foto/PDF - Opcional)</label>
                                <input
                                    type="file"
                                    onChange={e => setDocumentFile(e.target.files ? e.target.files[0] : null)}
                                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Para validação de idade e autenticidade (Futuro OCR).</p>
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
                                {adding ? 'Adicionando...' : 'Confirmar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
