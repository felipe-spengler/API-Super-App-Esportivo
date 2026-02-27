import { useNavigate, useParams } from 'react-router-dom';
import { Trophy, Calendar, ShoppingBag, X, MapPin, ChevronRight, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import api from '../../services/api';

const ALL_SPORTS = [
    { id: 'futebol', name: 'Futebol', icon: 'fluent-emoji:soccer-ball' },
    { id: 'volei', name: 'Vôlei', icon: 'fluent-emoji:volleyball' },
    { id: 'basquete', name: 'Basquete', icon: 'fluent-emoji:basketball' },
    { id: 'corrida', name: 'Corrida', icon: 'fluent-emoji:running-shoe' },
    { id: 'tenis', name: 'Tênis', icon: 'fluent-emoji:tennis' },
    { id: 'lutas', name: 'Lutas', icon: 'fluent-emoji:boxing-glove' },
    { id: 'natacao', name: 'Natação', icon: 'fluent-emoji:swimmer' },
    { id: 'padel', name: 'Padel', icon: 'fluent-emoji:ping-pong' },
    { id: 'futebol-7', name: 'Futebol 7', icon: 'fluent-emoji:soccer-ball' },
];

export function ClubHome() {
    const navigate = useNavigate();
    const { slug } = useParams();
    const clubSlug = slug || 'toledao';

    const [club, setClub] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return '';
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const cleanApiUrl = apiUrl.replace(/\/$/, '');
        const apiBase = cleanApiUrl.replace(/\/api$/, '');

        if (path.includes('/storage/')) {
            const storagePath = path.substring(path.indexOf('/storage/'));
            return `${apiBase}/api${storagePath}`;
        }
        if (path.startsWith('http')) return path;
        if (path.startsWith('/')) return path;
        return `${cleanApiUrl}/storage/${path}`;
    };

    useEffect(() => {
        async function loadClub() {
            try {
                const res = await api.get(`/clubs/${clubSlug}`);
                setClub(res.data);
            } catch (error) {
                console.error("Error loading club", error);
            } finally {
                setLoading(false);
            }
        }
        loadClub();
    }, [clubSlug]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

    if (!club) return <div className="min-h-screen flex items-center justify-center">Clube não encontrado</div>;

    const primaryColor = club.primary_color || '#4f46e5';
    const secondaryColor = club.secondary_color || '#ffffff';

    console.log('Club Active Modalities:', club.active_modalities);
    const activeSports = ALL_SPORTS.filter(sport => {
        const isActive = club.active_modalities?.includes(sport.id);
        console.log(`Checking sport ${sport.id} (${sport.name}): ${isActive}`);
        return isActive;
    });

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header / Top Bar */}
            <div className="bg-white p-6 pt-10 pb-6 shadow-xl shadow-slate-200/50 border-b border-slate-100 sticky top-0 z-50 backdrop-blur-xl bg-white/90">
                <div className="flex justify-between items-center max-w-lg mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden">
                            {club.logo_url || club.logo_path ? (
                                <img
                                    src={getImageUrl(club.logo_url || club.logo_path)}
                                    className="w-full h-full object-contain p-2"
                                    alt="Logo"
                                    onError={(e) => {
                                        (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=6366f1&color=fff&bold=true`;
                                    }}
                                />
                            ) : (
                                <Trophy className="w-6 h-6 text-indigo-400" />
                            )}
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">{club.name}</h1>
                            <div className="flex items-center text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1.5">
                                <MapPin className="w-3 h-3 mr-1 text-indigo-400" />
                                {club.city?.name} • {club.city?.state}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => navigate('/')} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-95 border border-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="max-w-lg mx-auto p-4 space-y-8">

                {/* Destaque / Banner - Custom or Fallback */}
                {club.banner_url || club.banner_path ? (
                    // Custom Banner
                    <div
                        className="rounded-[2.5rem] relative h-64 shadow-2xl shadow-indigo-100 overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer border-4 border-white"
                        onClick={() => navigate(`/club-home/${clubSlug}/championships`)}
                    >
                        <img
                            src={getImageUrl(club.banner_url || club.banner_path)}
                            alt={club.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            onError={(e) => {
                                (e.target as any).src = 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=1469&auto=format&fit=crop';
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute bottom-6 left-6 right-6">
                            <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full border border-white/20 inline-block mb-2">Destaque</span>
                            <h2 className="text-white text-2xl font-black uppercase tracking-tight">Explore os Campeonatos</h2>
                        </div>
                    </div>
                ) : (
                    // Fallback: Club Branding
                    <div
                        className="bg-slate-900 rounded-[2.5rem] p-10 relative h-64 flex flex-col items-center justify-center shadow-2xl shadow-slate-200 overflow-hidden border-4 border-white group"
                    >
                        {/* Background Gradients */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-violet-900" />
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/30 to-transparent"
                            style={{ backgroundSize: '24px 24px' }}
                        />

                        <div className="relative z-10 flex flex-col items-center">
                            {/* Club Logo/Brasão */}
                            <div className="w-28 h-28 rounded-3xl bg-white flex items-center justify-center p-5 shadow-2xl mb-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                {club.logo_url || club.logo_path ? (
                                    <img
                                        src={getImageUrl(club.logo_url || club.logo_path)}
                                        alt={club.name}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=6366f1&color=fff&bold=true`;
                                        }}
                                    />
                                ) : (
                                    <Trophy size={48} className="text-indigo-600" />
                                )}
                            </div>

                            <h2 className="text-white text-3xl font-black text-center uppercase tracking-tight drop-shadow-md">{club.name}</h2>
                            <div className="w-8 h-1 bg-white/30 rounded-full mt-4"></div>
                        </div>
                    </div>
                )}

                {/* Atalhos Rápidos */}
                <div>
                    <h2 className="text-lg font-black text-slate-800 mb-5 px-1 uppercase tracking-tight">Atalhos</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <button
                            className="bg-white rounded-[2rem] p-5 flex flex-col items-center gap-3 shadow-xl shadow-slate-100 border border-slate-50 hover:shadow-2xl hover:border-indigo-100 transition-all active:scale-95 group"
                            onClick={() => navigate(`/club-home/${clubSlug}/championships`)}
                        >
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Icon icon="fluent-emoji:trophy" className="w-10 h-10" />
                            </div>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">Inscrições</span>
                        </button>

                        <button
                            className="bg-white rounded-[2rem] p-5 flex flex-col items-center gap-3 shadow-xl shadow-slate-100 border border-slate-50 hover:shadow-2xl hover:border-indigo-100 transition-all active:scale-95 group"
                            onClick={() => navigate('/shop')}
                        >
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Icon icon="fluent-emoji:shopping-bags" className="w-10 h-10" />
                            </div>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none text-center">Loja</span>
                        </button>

                        <button
                            className="bg-white rounded-[2rem] p-5 flex flex-col items-center gap-3 shadow-xl shadow-slate-100 border border-slate-50 hover:shadow-2xl hover:border-indigo-100 transition-all active:scale-95 group"
                            onClick={() => navigate(`/club-home/${clubSlug}/agenda`)}
                        >
                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Icon icon="fluent-emoji:calendar" className="w-10 h-10" />
                            </div>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-none">Agenda</span>
                        </button>
                    </div>
                </div>

                {/* Grid de Esportes */}
                <div>
                    <h2 className="text-lg font-black text-slate-800 mb-5 px-1 uppercase tracking-tight">Modalidades</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {activeSports.length > 0 ? (
                            activeSports.map((sport) => (
                                <button
                                    key={sport.id}
                                    className="bg-white rounded-[2.5rem] p-6 flex items-center justify-between shadow-xl shadow-slate-100 border border-slate-50 hover:shadow-2xl hover:border-indigo-100 transition-all active:scale-[0.98] group"
                                    onClick={() => navigate(`/club-home/${clubSlug}/explore?sport=${sport.name}`)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-slate-50 rounded-[1.25rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-inner">
                                            <Icon icon={sport.icon} className="w-10 h-10" />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="text-slate-900 font-black text-sm uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{sport.name}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Ver eventos</span>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="col-span-2 bg-white rounded-[2rem] p-10 text-center border-2 border-dashed border-slate-100">
                                <Icon icon="fluent-emoji:pensive-face" className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhuma modalidade ativa</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
