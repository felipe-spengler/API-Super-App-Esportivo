import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Trophy, Loader2, Plus, User as UserIcon, CheckCircle, Clock, Trash2, X } from 'lucide-react';
import api from '../../services/api';

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
    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form states
    const [newPlayerName, setNewPlayerName] = useState('');
    const [newPlayerPos, setNewPlayerPos] = useState('');
    const [newPlayerNum, setNewPlayerNum] = useState('');
    const [newPlayerEmail, setNewPlayerEmail] = useState('');
    const [newPlayerCpf, setNewPlayerCpf] = useState('');
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        loadTeam();
    }, [id]);

    async function loadTeam() {
        setLoading(true);
        try {
            const response = await api.get(`/admin/teams/${id}`);
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
            formData.append('position', newPlayerPos);
            formData.append('number', newPlayerNum);
            formData.append('email', newPlayerEmail);
            formData.append('cpf', newPlayerCpf);
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
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Erro ao adicionar jogador.');
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
        setDocumentFile(null);
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
                    onClick={() => navigate('/admin/teams')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Detalhes da equipe</h1>
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
                                    <div className="text-sm font-bold text-gray-400">
                                        #{player.number || '-'}
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
                                <div key={camp.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-sm font-medium text-gray-700">{camp.name}</span>
                                    <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">
                                        {camp.status}
                                    </span>
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

                        <form onSubmit={handleAddPlayer} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Nome do Atleta</label>
                                <input
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="Ex: João da Silva"
                                    value={newPlayerName}
                                    onChange={e => setNewPlayerName(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Posição</label>
                                    <input
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        placeholder="Ex: Goleiro"
                                        value={newPlayerPos}
                                        onChange={e => setNewPlayerPos(e.target.value)}
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Número</label>
                                    <input
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                                        placeholder="00"
                                        value={newPlayerNum}
                                        onChange={e => setNewPlayerNum(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">CPF (Opcional)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="000.000.000-00"
                                    value={newPlayerCpf}
                                    onChange={e => setNewPlayerCpf(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Email (Opcional)</label>
                                <input
                                    type="email"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    placeholder="atleta@email.com"
                                    value={newPlayerEmail}
                                    onChange={e => setNewPlayerEmail(e.target.value)}
                                />
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
        </div>
    );
}
