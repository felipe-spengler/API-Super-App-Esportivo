import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, Trophy, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

interface Championship {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    status: 'active' | 'upcoming' | 'finished';
    sport: string;
    logo_url?: string;
}

export function Championships() {
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
            // Fallback para demonstrar visualmente se a API estiver offline
            // setChampionships(MOCK_DATA); 
        } finally {
            setLoading(false);
        }
    }

    const filtered = championships.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.sport.toLowerCase().includes(searchTerm.toLowerCase())
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(camp => (
                        <Link
                            key={camp.id}
                            to={`/championships/${camp.id}`}
                            className="group bg-white rounded-xl shadow border border-gray-100 hover:border-indigo-500 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col"
                        >
                            <div className="h-32 bg-gray-100 relative overflow-hidden">
                                {camp.logo_url ? (
                                    <img src={camp.logo_url} alt={camp.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200">
                                        <Trophy className="w-16 h-16 opacity-50" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide
                                        ${camp.status === 'active' ? 'bg-green-100 text-green-700' :
                                            camp.status === 'finished' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {camp.status === 'active' ? 'Em Andamento' : camp.status === 'finished' ? 'Finalizado' : 'Próximo'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{camp.name}</h3>
                                <p className="text-sm text-indigo-600 font-medium mb-4">{camp.sport}</p>

                                <div className="mt-auto flex items-center gap-2 text-gray-500 text-sm">
                                    <Calendar className="w-4 h-4" />
                                    <span>{new Date(camp.start_date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
