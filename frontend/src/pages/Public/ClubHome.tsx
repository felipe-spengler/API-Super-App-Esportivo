import { useNavigate, useParams } from 'react-router-dom';
import { Trophy, Calendar, ShoppingBag, X, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../services/api';

const ALL_SPORTS = [
    { id: 'futebol', name: 'Futebol', icon: 'futbol', color: 'bg-green-600' },
    { id: 'volei', name: 'Vôlei', icon: 'volleyball', color: 'bg-yellow-500' },
    { id: 'corrida', name: 'Corrida', icon: 'person-running', color: 'bg-blue-500' },
    { id: 'tenis', name: 'Tênis', icon: 'table-tennis', color: 'bg-orange-500' },
    { id: 'lutas', name: 'Lutas', icon: 'hand-fist', color: 'bg-red-600' },
    { id: 'natacao', name: 'Natação', icon: 'waves', color: 'bg-cyan-500' },
    { id: 'padel', name: 'Padel', icon: 'table-tennis', color: 'bg-blue-400' },
    { id: 'futebol-7', name: 'Futebol 7', icon: 'futbol', color: 'bg-green-500' },
];

export function ClubHome() {
    const navigate = useNavigate();
    const { slug } = useParams();
    const clubSlug = slug || 'toledao';

    const [club, setClub] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
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
                    <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Acesso Rápido</h2>
                    <div className="bg-white rounded-2xl p-6 flex justify-around shadow-sm border border-gray-100">
                        <button className="flex flex-col items-center gap-2 group" onClick={() => navigate('/inscricoes')}>
                            <div className="bg-gray-50 p-4 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                                <Trophy className="w-6 h-6 text-indigo-600" />
                            </div>
                            <span className="text-xs text-gray-600 font-medium group-hover:text-indigo-600 transition-colors">Inscrições</span>
                        </button>

                        <button className="flex flex-col items-center gap-2 group" onClick={() => navigate('/shop')}>
                            <div className="bg-gray-50 p-4 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                                <ShoppingBag className="w-6 h-6 text-indigo-600" />
                            </div>
                            <span className="text-xs text-gray-600 font-medium group-hover:text-indigo-600 transition-colors">Loja</span>
                        </button>

                        <button className="flex flex-col items-center gap-2 group" onClick={() => navigate('/agenda')}>
                            <div className="bg-gray-50 p-4 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                                <Calendar className="w-6 h-6 text-indigo-600" />
                            </div>
                            <span className="text-xs text-gray-600 font-medium group-hover:text-indigo-600 transition-colors">Agenda</span>
                        </button>
                    </div>
                </div>

                {/* Grid de Esportes */}
                <div>
                    <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Modalidades</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {activeSports.length > 0 ? (
                            activeSports.map((sport) => (
                                <button
                                    key={sport.id}
                                    className="aspect-square bg-white rounded-2xl flex flex-col items-center justify-center gap-3 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all group"
                                    onClick={() => navigate(`/club-home/${clubSlug}/explore?sport=${sport.name}`)}
                                >
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm bg-indigo-600 group-hover:bg-indigo-700 transition-colors"
                                    >
                                        <Trophy className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-gray-700 font-medium text-xs group-hover:text-indigo-700 transition-colors">{sport.name}</span>
                                </button>
                            ))
                        ) : (
                            <div className="col-span-3 text-center py-8 text-gray-500">
                                Nenhuma modalidade encontrada para este clube.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
