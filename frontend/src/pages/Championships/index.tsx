import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Trophy, AlertCircle, Loader2, Edit, Trash2, Power } from 'lucide-react';
import api from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';

interface Championship {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    status: 'draft' | 'registrations_open' | 'ongoing' | 'upcoming' | 'finished';
    sport: string;
    logo_url?: string;
    is_status_auto?: boolean;
}

export function Championships() {
    const navigate = useNavigate();
    const [championships, setChampionships] = useState<Championship[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadChampionships();
    }, []);

    async function loadChampionships() {
        try {
            setLoading(true);
            const response = await api.get('/admin/championships');
            // Adaptação caso a API retorne algo diferentes (ex: { data: [...] })
            const data = Array.isArray(response.data) ? response.data : response.data.data;
            setChampionships(data || []);
        } catch (err) {
            console.error(err);
            setError('Não foi possível carregar os campeonatos. Verifique sua conexão.');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id: number) {
        if (confirm('Tem certeza que deseja excluir este campeonato? Todas as partidas e estatísticas serão perdidas.')) {
            try {
                await api.delete(`/admin/championships/${id}`);
                setChampionships(championships.filter(c => c.id !== id));
            } catch (err) {
                alert('Erro ao excluir campeonato.');
            }
        }
    }

    async function handleToggleAuto(id: number, currentAuto: boolean) {
        try {
            await api.put(`/admin/championships/${id}`, { is_status_auto: !currentAuto });
            setChampionships(prev => prev.map(c => c.id === id ? { ...c, is_status_auto: !currentAuto } : c));
        } catch (err) {
            alert('Erro ao atualizar modo automático.');
        }
    }

    async function handleUpdateStatus(id: number, newStatus: string) {
        try {
            await api.put(`/admin/championships/${id}`, { status: newStatus });
            // Quando muda status manual, o backend já deve setar is_status_auto como false
            setChampionships(prev => prev.map(c => c.id === id ? { ...c, status: newStatus as any, is_status_auto: false } : c));
        } catch (err) {
            alert('Erro ao atualizar status.');
        }
    }

    const filtered = championships.filter(c =>
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.sport || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Campeonatos</h1>
                    <p className="text-gray-500">Gerencie todos os eventos esportivos do clube.</p>
                </div>
                <Link
                    to="/admin/championships/new"
                    className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md hover:shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    Novo Campeonato
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou modalidade..."
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
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900">Nenhum campeonato encontrado</h3>
                    <p className="text-gray-500">Comece criando seu primeiro evento esportivo.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filtered.map(camp => (
                        <div
                            key={camp.id}
                            className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col relative"
                        >
                            <Link to={`/admin/championships/${camp.id}`} className="h-40 bg-gray-100 relative overflow-hidden block">
                                {camp.logo_url ? (
                                    <img src={camp.logo_url} alt={camp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200">
                                        <Trophy className="w-16 h-16 opacity-50" />
                                    </div>
                                )}

                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                    <span className="text-white text-xs font-bold">Ver Detalhes</span>
                                </div>
                            </Link>

                            <div className="absolute top-3 right-3 flex flex-col items-end gap-1 z-10 pointer-events-auto">
                                <select
                                    value={camp.status}
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onChange={(e) => { e.preventDefault(); e.stopPropagation(); handleUpdateStatus(camp.id, e.target.value); }}
                                    className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-lg border-none outline-none cursor-pointer
                                    ${camp.status === 'ongoing' ? 'bg-green-500/90 text-white' :
                                            camp.status === 'finished' ? 'bg-gray-800/90 text-white' :
                                                camp.status === 'draft' ? 'bg-orange-500/90 text-white' : 'bg-blue-500/90 text-white'}`}
                                >
                                    <option value="draft">Rascunho</option>
                                    <option value="upcoming">Em Breve</option>
                                    <option value="registrations_open">Inscrições</option>
                                    <option value="ongoing">Em Andamento</option>
                                    <option value="finished">Finalizado</option>
                                </select>

                                <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleAuto(camp.id, !!camp.is_status_auto); }}
                                    className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter backdrop-blur-sm border transition-all
                                        ${camp.is_status_auto
                                            ? 'bg-indigo-500/20 text-white border-indigo-400/50 hover:bg-indigo-500/40'
                                            : 'bg-gray-500/20 text-gray-300 border-gray-400/30 hover:bg-gray-500/40'}`}
                                    title={camp.is_status_auto ? "Modo Automático Ativado" : "Modo Manual (Clique para ativar automático)"}
                                >
                                    {camp.is_status_auto ? '🤖 AUTO' : '👤 MANUAL'}
                                </button>
                            </div>

                            <div className="p-4 md:p-6 flex-1 flex flex-col">
                                <h3 className="text-lg font-black text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors leading-tight">{camp.name}</h3>
                                <p className="text-sm text-indigo-600 font-bold mb-4 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                    {typeof camp.sport === 'object' ? (camp.sport as any)?.name : camp.sport || 'Esporte não definido'}
                                </p>

                                <div className="mt-auto flex items-center text-gray-400 text-xs font-medium mb-5">
                                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                    <span>{camp.start_date ? new Date(camp.start_date).toLocaleDateString() : 'Data indefinida'}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate(`/admin/championships/${camp.id}`)}
                                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                    >
                                        Gerenciar
                                    </button>

                                    <button
                                        onClick={() => navigate(`/admin/championships/${camp.id}/edit`)}
                                        className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-gray-100"
                                        title="Editar"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={() => handleDelete(camp.id)}
                                        className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-gray-100"
                                        title="Excluir"
                                    >
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
