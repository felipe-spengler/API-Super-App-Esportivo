import { useState, useEffect } from 'react';
import { Plus, Search, Shield, Loader2, AlertCircle, Edit2 } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

interface Team {
    id: number;
    name: string;
    city: string;
    logo_url?: string;
    category?: string;
}

export function Teams() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadTeams();
    }, []);

    async function loadTeams() {
        try {
            setLoading(true);
            const response = await api.get('/admin/teams');
            const data = Array.isArray(response.data) ? response.data : response.data.data;
            setTeams(data || []);
        } catch (err) {
            console.error(err);
            setError('Falha ao carregar equipes.');
        } finally {
            setLoading(false);
        }
    }

    const filtered = teams.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.city && t.city.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Equipes</h1>
                    <p className="text-gray-500">Gerencie os times e seus participantes.</p>
                </div>
                <Link
                    to="/admin/teams/new"
                    className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md"
                >
                    <Plus className="w-5 h-5" />
                    Nova Equipe
                </Link>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar equipe..."
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
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Nenhuma equipe encontrada</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filtered.map(team => (
                        <div key={team.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all text-center group relative">
                            <div className="w-20 h-20 mx-auto mb-4 relative rounded-full bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 group-hover:border-indigo-200 transition-colors">
                                {team.logo_url ? (
                                    <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Shield className="w-8 h-8 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{team.name}</h3>
                            <p className="text-sm text-gray-500 mb-4">{team.city || 'Sem cidade definida'}</p>

                            <div className="flex gap-2">
                                <Link
                                    to={`/admin/teams/${team.id}`}
                                    className="flex-1 py-2 px-3 rounded-lg bg-gray-50 text-indigo-600 font-bold text-xs hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1"
                                >
                                    <Shield className="w-3.5 h-3.5" />
                                    Detalhes
                                </Link>
                                <Link
                                    to={`/admin/teams/${team.id}/edit`}
                                    className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="Editar Equipe"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
