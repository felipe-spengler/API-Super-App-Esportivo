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

    const activeSports = ALL_SPORTS.filter(sport =>
        club.active_modalities?.includes(sport.id)
    );

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header / Top Bar */}
            <div className="bg-white p-6 pt-8 pb-4 shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="flex justify-between items-center max-w-lg mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{club.name}</h1>
                        <div className="flex items-center text-gray-500 text-sm mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            {club.city?.name} - {club.city?.state}
                        </div>
                    </div>
                    <button onClick={() => navigate('/')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="max-w-lg mx-auto p-4 space-y-6">

                {/* Destaque / Banner - Custom or Fallback */}
                {club.banner_url ? (
                    // Custom Banner
                    <div
                        className="rounded-3xl relative h-56 shadow-lg overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer"
                        onClick={() => navigate(`/club-home/${clubSlug}/championships`)}
                    >
                        <img
                            src={club.banner_url}
                            alt={club.name}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>
                ) : (
                    // Fallback: Club Branding
                    <div
                        style={{ backgroundColor: primaryColor }}
                        className="rounded-3xl p-8 relative h-56 flex flex-col items-center justify-center shadow-lg overflow-hidden group hover:scale-[1.02] transition-transform"
                    >
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-5"
                            style={{
                                backgroundImage: `radial-gradient(circle at 20% 50%, ${secondaryColor} 1px, transparent 1px), radial-gradient(circle at 80% 80%, ${secondaryColor} 1px, transparent 1px)`,
                                backgroundSize: '50px 50px'
                            }}
                        />

                        <div className="relative z-10 flex flex-col items-center">
                            {/* Club Logo/Brasão */}
                            {club.logo_url ? (
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white flex items-center justify-center p-4 shadow-2xl mb-4">
                                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-contain" />
                                </div>
                            ) : (
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center shadow-2xl mb-4">
                                    <Trophy size={48} className="text-white" />
                                </div>
                            )}

                            <h2 className="text-white text-2xl md:text-3xl font-bold text-center drop-shadow-lg">{club.name}</h2>
                            <p className="text-white/90 text-sm mt-2 text-center font-medium">Bem-vindo ao App Esportivo</p>
                        </div>
                    </div>
                )}

                {/* Atalhos Rápidos */}
                <div>
                    <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Acesso Rápido</h2>
                    <div className="bg-white rounded-2xl p-6 flex justify-around shadow-sm border border-gray-100">
                        <button className="flex flex-col items-center gap-2 group" onClick={() => navigate('/inscricoes')}>
                            <div className="bg-gray-50 p-4 rounded-2xl group-hover:bg-gray-100 transition-colors">
                                <Trophy className="w-6 h-6" style={{ color: primaryColor }} />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">Inscrições</span>
                        </button>

                        <button className="flex flex-col items-center gap-2 group" onClick={() => navigate('/shop')}>
                            <div className="bg-gray-50 p-4 rounded-2xl group-hover:bg-gray-100 transition-colors">
                                <ShoppingBag className="w-6 h-6" style={{ color: primaryColor }} />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">Loja</span>
                        </button>

                        <button className="flex flex-col items-center gap-2 group" onClick={() => navigate('/agenda')}>
                            <div className="bg-gray-50 p-4 rounded-2xl group-hover:bg-gray-100 transition-colors">
                                <Calendar className="w-6 h-6" style={{ color: primaryColor }} />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">Agenda</span>
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
                                    className="aspect-square bg-white rounded-2xl flex flex-col items-center justify-center gap-3 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all"
                                    onClick={() => navigate(`/club-home/${clubSlug}/explore?sport=${sport.name}`)}
                                >
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <Trophy className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-gray-700 font-medium text-xs">{sport.name}</span>
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
