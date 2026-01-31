import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, Trophy, Users, Calendar, Settings,
    Tv, List, Medal, Edit, ImageIcon, Plus, Trash2
} from 'lucide-react';
import api from '../../services/api';

export function AdminChampionshipDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [championship, setChampionship] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            const [campRes, catRes] = await Promise.all([
                api.get(`/championships/${id}`), // Using public endpoint for details for now
                api.get(`/admin/championships/${id}/categories`).catch(() => ({ data: [] })) // Handle if not implemented yet
            ]);
            setChampionship(campRes.data);
            setCategories(catRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
    }

    if (!championship) {
        return <div className="p-8">Campeonato não encontrado.</div>;
    }

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-6 mb-8">
                <div className="max-w-6xl mx-auto">
                    <button onClick={() => navigate('/admin/championships')} className="flex items-center text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        Voltar para Campeonatos
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                                {championship.logo_url ? (
                                    <img src={championship.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                                ) : (
                                    <Trophy className="w-8 h-8" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{championship.name}</h1>
                                <p className="text-gray-500">{typeof championship.sport === 'object' ? championship.sport.name : championship.sport} • {new Date(championship.start_date).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate(`/admin/championships/${id}/edit`)}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 font-medium"
                            >
                                <Settings className="w-4 h-4" />
                                Configurações
                            </button>
                            <button
                                onClick={() => navigate(`/events/${id}`)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                            >
                                <Tv className="w-4 h-4" />
                                Ver Página Pública
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Card Categorias */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <List className="w-5 h-5 text-indigo-500" />
                                Categorias
                            </h3>
                            <button
                                onClick={() => alert('Funcionalidade de adicionar categoria em desenvolvimento. Por enquanto, adicione via Configurações do Campeonato.')}
                                className="text-sm text-indigo-600 font-medium hover:underline"
                            >
                                + Adicionar
                            </button>
                        </div>
                        <div className="space-y-3">
                            {categories.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">Nenhuma categoria cadastrada.</p>
                            ) : (
                                categories.map((cat: any) => (
                                    <div key={cat.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                        <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                                        <span className="text-xs text-gray-400">{cat.gender}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Card Times */}
                    <Link to={`/admin/championships/${id}/teams`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-500" />
                                Times / Inscrições
                            </h3>
                            <span className="text-sm text-gray-400 group-hover:text-emerald-500 transition-colors">Gerenciar →</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            Visualize os times inscritos, aprove inscrições pendentes e gerencie os elencos.
                        </p>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-1/3"></div>
                        </div>
                        <p className="text-xs text-right mt-1 text-gray-400">8 times confirmados</p>
                    </Link>

                    {/* Card Tabela / Jogos */}
                    <Link to={`/admin/championships/${id}/matches`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-orange-500" />
                                Tabela de Jogos
                            </h3>
                            <span className="text-sm text-gray-400 group-hover:text-orange-500 transition-colors">Acessar →</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Sorteie a tabela, defina datas e horários das partidas e lance os resultados.
                        </p>
                    </Link>

                    {/* Card Classificação */}
                    <Link to={`/admin/championships/${id}/standings`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Medal className="w-5 h-5 text-yellow-500" />
                                Classificação
                            </h3>
                            <span className="text-sm text-gray-400 group-hover:text-yellow-500 transition-colors">Ver →</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Acompanhe a tabela de classificação atualizada automaticamente conforme os resultados.
                        </p>
                    </Link>

                    {/* Card Personalização */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-pink-500" />
                                Personalização
                            </h3>
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => navigate(`/admin/championships/${id}/edit`)}
                                className="w-full text-left text-sm text-gray-600 hover:bg-gray-50 p-2 rounded flex items-center gap-2"
                            >
                                <Edit className="w-4 h-4" /> Alterar Logo/Capa
                            </button>
                            <button
                                onClick={() => navigate(`/events/${id}`)}
                                className="w-full text-left text-sm text-gray-600 hover:bg-gray-50 p-2 rounded flex items-center gap-2"
                            >
                                <Tv className="w-4 h-4" /> Ver Página Pública
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div >
    );
}
