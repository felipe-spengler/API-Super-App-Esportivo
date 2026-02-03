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
            <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-6 md:py-6 mb-4 md:mb-8">
                <div className="max-w-6xl mx-auto">
                    <button onClick={() => navigate('/admin/championships')} className="flex items-center text-gray-400 hover:text-gray-900 mb-4 transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Voltar
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100 shadow-sm">
                                {championship.logo_url ? (
                                    <img src={championship.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <Trophy className="w-6 h-6 md:w-8 md:h-8" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">{championship.name}</h1>
                                <p className="text-xs md:text-sm text-gray-500 font-medium">
                                    {typeof championship.sport === 'object' ? championship.sport.name : championship.sport}
                                    <span className="mx-1.5 opacity-30">•</span>
                                    {new Date(championship.start_date).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:flex gap-3 w-full md:w-auto">
                            <button
                                onClick={() => navigate(`/admin/championships/${id}/edit`)}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-700 hover:bg-gray-50 font-bold transition-all shadow-sm text-xs md:text-sm"
                            >
                                <Settings className="w-4 h-4 text-gray-400" />
                                Configurar
                            </button>
                            <button
                                onClick={() => navigate(`/events/${id}`)}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg shadow-indigo-100 text-xs md:text-sm"
                            >
                                <Tv className="w-4 h-4" />
                                Ver Site
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
                                onClick={() => navigate(`/admin/championships/${id}/categories`)}
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
                        <p className="text-xs text-right mt-1 text-gray-400">
                            {championship.teams_count || 0} {championship.teams_count === 1 ? 'time confirmado' : 'times confirmados'}
                        </p>
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
                    <Link to={`/events/${id}/leaderboard`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Medal className="w-5 h-5 text-yellow-500" />
                                Classificação
                            </h3>
                            <span className="text-sm text-gray-400 group-hover:text-yellow-500 transition-colors">Ver →</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Acompanhe a classificação atualizada, pontos, vitórias e saldo de gols.
                        </p>
                    </Link>

                    {/* Card Premiações */}
                    <Link to={`/admin/championships/${id}/awards`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-purple-500" />
                                Premiações
                            </h3>
                            <span className="text-sm text-gray-400 group-hover:text-purple-500 transition-colors">Gerenciar →</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Defina os melhores do campeonato (Goleiro, Artilheiro, MVP) e gere as artes automaticamente.
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

        </div>
    );
}
