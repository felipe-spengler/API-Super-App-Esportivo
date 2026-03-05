import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Users, Trophy, Timer, Palette, CreditCard, Ticket,
    Layers, ShoppingBag, Settings, Tv, ArrowLeft,
    ChevronRight, AlertCircle, PlusCircle
} from 'lucide-react';
import api from '../../../services/api';

export function IndividualChampionshipDetails() {
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
                api.get(`/championships/${id}`),
                api.get(`/admin/championships/${id}/categories`).catch(() => ({ data: [] }))
            ]);
            setChampionship(campRes.data);
            setCategories(catRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="h-96 flex items-center justify-center">Carregando...</div>;
    if (!championship) return <div className="p-8">Evento não encontrado.</div>;

    const stats = [
        { label: 'Inscritos', value: '0', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Confirmados', value: '0', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Categorias', value: categories.length, icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    const cards = [
        {
            title: 'Atletas / Inscrições',
            desc: 'Gerencie os inscritos, valide documentos e aprove pagamentos.',
            icon: Users,
            color: 'text-blue-500',
            link: `/admin/individual/championships/${id}/athletes`
        },
        {
            title: 'Gestão de Resultados',
            desc: 'Lance os tempos/resultados e publique a classificação.',
            icon: Timer,
            color: 'text-emerald-500',
            link: `/admin/individual/championships/${id}/results`
        },
        {
            title: 'Artes por Categoria',
            desc: 'Personalize templates de artes exclusivos para cada categoria.',
            icon: Palette,
            color: 'text-purple-500',
            link: `/admin/individual/championships/${id}/arts`
        },
        {
            title: 'Cupons de Desconto',
            desc: 'Crie e gerencie códigos promocionais para as inscrições.',
            icon: Ticket,
            color: 'text-orange-500',
            link: `/admin/individual/championships/${id}/coupons`
        },
        {
            title: 'Financeiro (Asaas)',
            desc: 'Acompanhe as taxas, boletos e o status das vendas.',
            icon: CreditCard,
            color: 'text-indigo-500',
            link: `/admin/individual/championships/${id}/payments`
        },
        {
            title: 'Categorias',
            desc: 'Defina preços, idades e sexos por categoria de prova.',
            icon: Layers,
            color: 'text-pink-500',
            link: `/admin/individual/championships/${id}/categories`
        }
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header / Banner */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-slate-900 to-slate-800 relative">
                    {championship.cover_image_url && (
                        <img src={championship.cover_image_url} className="w-full h-full object-cover opacity-50" />
                    )}
                </div>
                <div className="px-8 pb-8 -mt-12 relative flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-end gap-6">
                        <div className="w-32 h-32 bg-white rounded-2xl shadow-xl p-2 border border-slate-100 shrink-0">
                            {championship.logo_url ? (
                                <img src={championship.logo_url} className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-300">
                                    <Trophy size={48} />
                                </div>
                            )}
                        </div>
                        <div className="pb-2">
                            <h1 className="text-3xl font-black text-slate-900">{championship.name}</h1>
                            <p className="text-slate-500 font-medium flex items-center gap-2">
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Evento Individual</span>
                                • {championship.sport?.name || 'Corrida'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => navigate(`/events/${id}`)} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all shadow-sm">
                            <Tv size={18} />
                            Página Pública
                        </button>
                        <button onClick={() => navigate(`/admin/championships/${id}/edit`)} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold transition-all shadow-lg">
                            <Settings size={18} />
                            Configurar
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map(s => (
                    <div key={s.label} className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
                        <div className={`p-4 rounded-xl ${s.bg} ${s.color}`}>
                            <s.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
                            <p className="text-2xl font-black text-slate-900">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map(card => (
                    <Link
                        key={card.title}
                        to={card.link}
                        className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col h-full"
                    >
                        <div className={`w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-emerald-50 transition-colors`}>
                            <card.icon className={`w-7 h-7 ${card.color} group-hover:text-emerald-500`} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">{card.title}</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-1">
                            {card.desc}
                        </p>
                        <div className="flex items-center text-emerald-600 text-sm font-black uppercase tracking-wider">
                            Gerenciar
                            <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
