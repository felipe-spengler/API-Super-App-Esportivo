import { useState, useEffect } from 'react';
import { Plus, Search, User, AlertCircle, Loader2, Edit, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

interface Player {
    id: number;
    name: string;
    email: string;
    position?: string;
    team_name?: string;
    photo_url?: string;
    status?: 'active' | 'suspended' | 'pending';
}

export function Players() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadPlayers();
    }, []);

    async function loadPlayers() {
        try {
            setLoading(true);
            const response = await api.get('/admin/players');
            const data = Array.isArray(response.data) ? response.data : (response.data.data || []);
            setPlayers(data);
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar lista de jogadores');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: number) {
        if (!confirm('Tem certeza que deseja excluir este jogador?')) return;
        try {
            await api.delete(`/admin/players/${id}`);
            loadPlayers();
        } catch (error) {
            alert('Erro ao excluir jogador.');
        }
    }

    const filtered = players.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Jogadores</h1>
                    <p className="text-gray-500">Gerencie atletas e usuários da plataforma.</p>
                </div>
                <Link
                    to="/admin/players/new"
                    className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md"
                >
                    <Plus className="w-5 h-5" />
                    Novo Jogador
                </Link>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Nenhum atleta encontrado</h3>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Desktop View */}
                    <div className="overflow-x-auto hidden md:block">
                        <table className="w-full text-left text-sm text-gray-600">
                            <thead className="bg-gray-50 text-gray-900 font-semibold uppercase text-xs tracking-wider border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Atleta</th>
                                    <th className="px-6 py-4">Posição</th>
                                    <th className="px-6 py-4">Equipe Atual</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((player) => (
                                    <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                                    {player.photo_url ? (
                                                        <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-5 h-5 text-gray-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{player.name}</div>
                                                    <div className="text-xs text-gray-500">{player.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            {player.position || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {player.team_name ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                                    {player.team_name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Sem equipe</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${player.status === 'suspended' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}
                                             `}>
                                                {player.status === 'suspended' ? 'Suspenso' : 'Ativo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    to={`/admin/players/${player.id}/edit`}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(player.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {filtered.map((player) => (
                            <div key={player.id} className="p-4 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0 border border-gray-100">
                                        {player.photo_url ? (
                                            <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-6 h-6 text-gray-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-gray-900 truncate">{player.name}</div>
                                        <div className="text-xs text-gray-500 truncate">{player.email}</div>
                                    </div>
                                    <div className="shrink-0">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                                            ${player.status === 'suspended' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}
                                        `}>
                                            {player.status === 'suspended' ? 'Suspenso' : 'Ativo'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-xs pt-1">
                                    <div className="space-y-1">
                                        <p className="text-gray-400">Posição: <span className="text-gray-700 font-medium">{player.position || '-'}</span></p>
                                        <p className="text-gray-400">Equipe: <span className="text-indigo-600 font-bold">{player.team_name || 'Sem equipe'}</span></p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link
                                            to={`/admin/players/${player.id}/edit`}
                                            className="p-2.5 bg-gray-50 text-indigo-600 rounded-lg border border-gray-100"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(player.id)}
                                            className="p-2.5 bg-gray-50 text-red-600 rounded-lg border border-gray-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
