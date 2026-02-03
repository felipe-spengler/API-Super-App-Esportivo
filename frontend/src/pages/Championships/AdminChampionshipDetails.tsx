import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Trophy, Users, Calendar, Settings,
    Tv, List, Medal, Edit, ImageIcon, ChevronRight, PlusCircle, AlertCircle
} from 'lucide-react';
import api from '../../services/api';

export function AdminChampionshipDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [championship, setChampionship] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const selectedCategoryId = searchParams.get('category_id');
    const selectedCategory = categories.find(c => c.id.toString() === selectedCategoryId);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            const [campRes, catRes] = await Promise.all([
                api.get(`/championships/${id}`),
                api.get(`/admin/championships/${id}/categories`).catch(() => ({ data: [] }))
            ]);
            setChampionship(campRes.data);
            setCategories(catRes.data);

            // If there's only one category, auto-select it? 
            // Maybe better to force standard flow or let user decide.
            // For now, adhere to explicit selection unless pre-selected.
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    function selectCategory(categoryId: number) {
        setSearchParams({ category_id: String(categoryId) });
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
    }

    if (!championship) {
        return <div className="p-8">Campeonato não encontrado.</div>;
    }

    // 1. SELECT CATEGORY VIEW
    if (!selectedCategoryId) {
        return (
            <div className="bg-gray-50 min-h-screen pb-20">
                <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-6 md:py-6 mb-8">
                    <div className="max-w-4xl mx-auto">
                        <button onClick={() => navigate('/admin/championships')} className="flex items-center text-gray-400 hover:text-gray-900 mb-4 transition-colors text-sm">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Voltar
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 border border-indigo-100">
                                {championship.logo_url ? <img src={championship.logo_url} className="w-full h-full object-cover rounded-lg" /> : <Trophy className="w-6 h-6" />}
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-gray-900">{championship.name}</h1>
                                <p className="text-gray-500 text-sm">Selecione uma categoria para gerenciar</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-6">
                    {categories.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Nenhuma categoria encontrada</h2>
                            <p className="text-gray-500 mb-6">Para gerenciar o campeonato, você precisa criar pelo menos uma categoria.</p>
                            <button
                                onClick={() => navigate(`/admin/championships/${id}/categories`)}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all inline-flex items-center gap-2"
                            >
                                <PlusCircle className="w-5 h-5" />
                                Criar Categoria
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => selectCategory(cat.id)}
                                    className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-indigo-500 hover:shadow-md transition-all text-left flex items-center justify-between group"
                                >
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">{cat.name}</h3>
                                        <p className="text-sm text-gray-500">{cat.gender === 'M' ? 'Masculino' : cat.gender === 'F' ? 'Feminino' : 'Misto'}</p>
                                    </div>
                                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </button>
                            ))}
                            <button
                                onClick={() => navigate(`/admin/championships/${id}/categories`)}
                                className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 hover:bg-gray-100 transition-all text-center flex flex-col items-center justify-center text-gray-500 hover:text-gray-700"
                            >
                                <PlusCircle className="w-6 h-6 mb-2" />
                                <span className="font-medium">Gerenciar Categorias</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. DASHBOARD VIEW (With Selected Category)
    const appendCat = (to: string) => `${to}?category_id=${selectedCategoryId}`;

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-6 md:py-6 mb-4 md:mb-8">
                <div className="max-w-6xl mx-auto">
                    <button onClick={() => setSearchParams({})} className="flex items-center text-gray-400 hover:text-gray-900 mb-4 transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Trocar Categoria
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-100 shadow-sm relative overflow-visible">
                                {championship.logo_url ? (
                                    <img src={championship.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <Trophy className="w-6 h-6 md:w-8 md:h-8" />
                                )}
                                <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border-2 border-white">
                                    {selectedCategory?.name}
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">{championship.name}</h1>
                                <p className="text-xs md:text-sm text-gray-500 font-medium flex items-center gap-2">
                                    Categoria: <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">{selectedCategory?.name}</span>
                                    <span className="opacity-30">•</span>
                                    {typeof championship.sport === 'object' ? championship.sport.name : championship.sport}
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

                    {/* Card Times */}
                    <Link to={appendCat(`/admin/championships/${id}/teams`)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-500" />
                                Times / Inscrições
                            </h3>
                            <span className="text-sm text-gray-400 group-hover:text-emerald-500 transition-colors">Gerenciar →</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            Visualize os times inscritos na categoria {selectedCategory?.name}, aprove inscrições pendentes e gerencie os elencos.
                        </p>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-1/3"></div>
                        </div>
                    </Link>

                    {/* Card Tabela / Jogos */}
                    <Link to={appendCat(`/admin/championships/${id}/matches`)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-orange-500" />
                                Tabela de Jogos
                            </h3>
                            <span className="text-sm text-gray-400 group-hover:text-orange-500 transition-colors">Acessar →</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Sorteie a tabela da {selectedCategory?.name}, defina datas e horários das partidas e lance os resultados.
                        </p>
                    </Link>

                    {/* Card Classificação */}
                    <Link to={`/events/${id}/leaderboard?category_id=${selectedCategoryId}`} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Medal className="w-5 h-5 text-yellow-500" />
                                Classificação
                            </h3>
                            <span className="text-sm text-gray-400 group-hover:text-yellow-500 transition-colors">Ver →</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Acompanhe a classificação atualizada da {selectedCategory?.name}.
                        </p>
                    </Link>

                    {/* Card Premiações */}
                    <Link to={appendCat(`/admin/championships/${id}/awards`)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-purple-500" />
                                Premiações
                            </h3>
                            <span className="text-sm text-gray-400 group-hover:text-purple-500 transition-colors">Gerenciar →</span>
                        </div>
                        <p className="text-sm text-gray-500">
                            Defina os melhores da {selectedCategory?.name} (Goleiro, Artilheiro, MVP).
                        </p>
                    </Link>

                    {/* Card Categorias (Atalho par voltar/editar) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <List className="w-5 h-5 text-indigo-500" />
                                Outras Categorias
                            </h3>
                            <button
                                onClick={() => navigate(`/admin/championships/${id}/categories`)}
                                className="text-sm text-indigo-600 font-medium hover:underline"
                            >
                                Gerenciar
                            </button>
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => setSearchParams({})}
                                className="w-full text-left text-sm text-gray-600 hover:bg-gray-50 p-2 rounded flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Trocar de Categoria
                            </button>
                        </div>
                    </div>

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
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}
