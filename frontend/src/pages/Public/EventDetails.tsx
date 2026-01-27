import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Trophy,
    Target,
    HandMetal,
    Square,
    Crown,
    Users,
    ListOrdered,
    CalendarDays,
    MapPin,
    UserPlus,
    Star,
    Images
} from 'lucide-react';
import api from '../../services/api';

// Menu items baseados no esporte (igual ao mobile)
const SPORT_MENUS: any = {
    futebol: [
        { label: 'Jogos', icon: Trophy, route: 'matches', color: 'orange' },
        { label: 'Classificação', icon: ListOrdered, route: 'leaderboard', color: 'blue' },
        { label: 'Artilharia', icon: Target, route: 'stats', params: { type: 'goals', title: 'Artilharia' }, color: 'gray' },
        { label: 'Cartão Amarelo', icon: Square, iconColor: '#FBBF24', route: 'stats', params: { type: 'yellow_cards', title: 'Cartões Amarelos' }, color: 'yellow' },
        { label: 'Cartão Azul', icon: Square, iconColor: '#3B82F6', route: 'stats', params: { type: 'blue_cards', title: 'Cartões Azuis' }, color: 'blue' },
        { label: 'Cartão Vermelho', icon: Square, iconColor: '#EF4444', route: 'stats', params: { type: 'red_cards', title: 'Cartões Vermelhos' }, color: 'red' },
        { label: 'Melhor em Campo', icon: Crown, route: 'mvp', color: 'black' },
        { label: 'Ver Artes', icon: Images, route: 'awards', color: 'green' },
    ],
    volei: [
        { label: 'Jogos', icon: Trophy, route: 'matches', color: 'orange' },
        { label: 'Classificação', icon: ListOrdered, route: 'leaderboard', color: 'blue' },
        { label: 'Pontuador', icon: Target, route: 'stats', params: { type: 'points', title: 'Maiores Pontuadores' }, color: 'gray' },
        { label: 'Bloqueador', icon: HandMetal, route: 'stats', params: { type: 'blocks', title: 'Melhores Bloqueadores' }, color: 'cyan' },
        { label: 'Acer', icon: Star, route: 'stats', params: { type: 'aces', title: 'Melhores Sacadores' }, color: 'indigo' },
        { label: 'Melhor em Quadra', icon: Crown, route: 'mvp', color: 'purple' },
        { label: 'Equipes', icon: Users, route: 'teams', color: 'blue' },
        { label: 'Ver Artes', icon: Images, route: 'awards', color: 'green' },
    ],
    corrida: [
        { label: 'Resultados', icon: Trophy, route: 'results', color: 'orange' },
        { label: 'Inscritos', icon: Users, route: 'participants', color: 'blue' },
        { label: 'Categorias', icon: ListOrdered, route: 'categories', color: 'cyan' },
        { label: 'Ver Artes', icon: Images, route: 'awards', color: 'green' },
    ],
    futsal: [
        { label: 'Jogos', icon: Trophy, route: 'matches', color: 'orange' },
        { label: 'Classificação', icon: ListOrdered, route: 'leaderboard', color: 'blue' },
        { label: 'Artilharia', icon: Target, route: 'stats', params: { type: 'goals', title: 'Artilharia' }, color: 'gray' },
        { label: 'Cartões', icon: Square, iconColor: '#FBBF24', route: 'stats', params: { type: 'cards', title: 'Cartões' }, color: 'yellow' },
    ],
    default: [
        { label: 'Jogos', icon: Trophy, route: 'matches', color: 'orange' },
        { label: 'Classificação', icon: ListOrdered, route: 'leaderboard', color: 'blue' },
    ]
};

const COLOR_MAP: any = {
    orange: '#F97316',
    blue: '#3B82F6',
    gray: '#6B7280',
    cyan: '#06B6D4',
    yellow: '#FBBF24',
    red: '#EF4444',
    indigo: '#6366F1',
    purple: '#A855F7',
    black: '#000000',
    green: '#10B981',
};

export function EventDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [champ, setChamp] = useState<any>(null);
    const [selectedCategory, setSelectedCategory] = useState<any>(null);

    useEffect(() => {
        async function loadChampionship() {
            setLoading(true);
            try {
                const response = await api.get(`/championships/${id}`);
                setChamp(response.data);

                // Auto-select first category if available
                if (response.data.categories && response.data.categories.length > 0) {
                    setSelectedCategory(response.data.categories[0]);
                }
            } catch (error) {
                console.error("Erro ao carregar campeonato", error);
            } finally {
                setLoading(false);
            }
        }
        loadChampionship();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!champ) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-500">Campeonato não encontrado</p>
            </div>
        );
    }

    const sportSlug = champ?.sport?.slug || 'default';
    const gridItems = SPORT_MENUS[sportSlug] || SPORT_MENUS['default'];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header com gradiente azul */}
            <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 pt-8 pb-6 px-4 shadow-2xl relative">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-8 left-4 p-2 bg-black/20 rounded-full hover:bg-black/30 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-white" />
                </button>

                <div className="max-w-6xl mx-auto mt-4">
                    <div className="text-center mb-4">
                        <h1 className="text-white text-3xl font-bold mb-1">{champ.name}</h1>
                        <p className="text-blue-200 text-sm uppercase tracking-wide">{champ.sport?.name}</p>
                    </div>

                    {/* Info Row */}
                    <div className="flex flex-wrap justify-center gap-4 text-white/90 text-sm mt-4">
                        {champ.start_date && (
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4" />
                                <span>{new Date(champ.start_date).toLocaleDateString()}</span>
                            </div>
                        )}
                        {champ.location && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>Local a definir</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>{champ.categories?.length || 0} Categorias</span>
                        </div>
                    </div>

                    {/* Category Selector */}
                    {champ.categories && champ.categories.length > 0 && (
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                            {champ.categories.map((cat: any) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase whitespace-nowrap transition-all ${selectedCategory?.id === cat.id
                                            ? 'bg-white text-indigo-900 shadow-md'
                                            : 'bg-blue-800/50 text-blue-100 border border-blue-700 hover:bg-blue-700/50'
                                        }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto p-4">
                {/* CTA de Inscrição */}
                <button
                    onClick={() => navigate(`/inscription/${id}`)}
                    className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl mb-6 flex items-center justify-center gap-3 shadow-lg shadow-green-600/30 transition-all active:scale-95"
                >
                    <UserPlus className="w-5 h-5" />
                    <span className="text-lg uppercase tracking-wide">Inscrever-se Agora</span>
                </button>

                {/* Grid de Cards (igual ao mobile) */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {gridItems.map((item: any, index: number) => {
                        const Icon = item.icon;
                        const borderColor = item.iconColor || COLOR_MAP[item.color] || '#ccc';

                        return (
                            <Link
                                key={index}
                                to={`/events/${id}/${item.route}?category_id=${selectedCategory?.id || ''}&type=${item.params?.type || ''}&title=${item.params?.title || item.label}`}
                                className="bg-white rounded-xl p-4 shadow-sm border-l-4 hover:shadow-md transition-all active:scale-[0.98] group"
                                style={{ borderLeftColor: borderColor }}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-800 uppercase text-xs flex-1 mr-2 leading-tight">
                                        {item.label}
                                    </h3>
                                    <Icon
                                        className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform"
                                        style={{ color: borderColor }}
                                    />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
