import { useState, useEffect } from 'react';
import { Plus, Search, Building2, Loader2, AlertCircle, Edit2, LogIn, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Club {
    id: number;
    name: string;
    city?: { name: string; state: string };
    logo_url?: string;
    slug: string;
    is_active: boolean;
}

export function ClubList() {
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadClubs();
    }, []);

    async function loadClubs() {
        try {
            setLoading(true);
            const response = await api.get('/admin/clubs-manage');
            // Check structure
            setClubs(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error(err);
            setError('Falha ao carregar clubes.');
        } finally {
            setLoading(false);
        }
    }

    const { impersonate } = useAuth();

    async function handleImpersonate(id: number, name: string) {
        try {
            const response = await api.post(`/admin/clubs-manage/${id}/impersonate`);
            const { access_token, user } = response.data;

            impersonate(access_token, user);
            alert(`Acessando como admin do ${name}...`);
            // Redirect to dashboard (will reload sidebar as club admin)
            // Force reload might be safer for sidebar state, but React context update should trigger it.
            window.location.href = '/admin';
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'Erro ao acessar clube.');
        }
    }

    async function handleDelete(id: number, name: string) {
        if (!confirm(`Tem certeza que deseja excluir o clube "${name}"? Isso também excluirá os administradores vinculados.`)) return;

        try {
            await api.delete(`/admin/clubs-manage/${id}`);
            setClubs(clubs.filter(c => c.id !== id));
            alert('Clube excluído com sucesso.');
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'Erro ao excluir clube.');
        }
    }

    const filtered = clubs.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.slug && c.slug.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gerenciar Clubes</h1>
                    <p className="text-gray-500">Super Admin: Visualize e edite todos os clubes.</p>
                </div>
                <Link
                    to="/admin/clubs-manage/new"
                    className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md"
                >
                    <Plus className="w-5 h-5" />
                    Novo Clube
                </Link>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar clube..."
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
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Nenhum clube encontrado</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(club => (
                        <div key={club.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-start gap-4">
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100 flex-shrink-0">
                                {club.logo_url ? (
                                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Building2 className="w-8 h-8 text-gray-400" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-gray-900 truncate">{club.name}</h3>
                                <p className="text-sm text-gray-500 truncate mb-1">
                                    {club.city ? `${club.city.name} - ${club.city.state}` : 'Sem local'}
                                </p>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => handleImpersonate(club.id, club.name)}
                                        className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                    >
                                        <LogIn className="w-3 h-3" /> Acessar
                                    </button>
                                    <Link
                                        to={`/admin/clubs-manage/${club.id}/edit`}
                                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                                    >
                                        <Edit2 className="w-3 h-3" /> Editar
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(club.id, club.name)}
                                        className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" /> Excluir
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
