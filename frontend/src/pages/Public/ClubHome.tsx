import { useNavigate, useParams } from 'react-router-dom';
import { Trophy, Calendar, ShoppingBag, QrCode, Medal, X, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../services/api';

const ALL_SPORTS = [
    { id: 'futebol', name: 'Futebol', icon: 'futbol', color: 'bg-green-600' },
    { id: 'volei', name: 'Vôlei', icon: 'volleyball', color: 'bg-yellow-500' },
    { id: 'corrida', name: 'Corrida', icon: 'person-running', color: 'bg-blue-500' },
    { id: 'tenis', name: 'Tênis', icon: 'table-tennis', color: 'bg-orange-500' },
    { id: 'lutas', name: 'Lutas', icon: 'hand-fist', color: 'bg-red-600' },
    { id: 'natacao', name: 'Natação', icon: 'waves', color: 'bg-cyan-500' },
    { id: 'padel', name: 'Padel', icon: 'table-tennis', color: 'bg-blue-400' }, // Added Padel
];

export function ClubHome() {
    const navigate = useNavigate();
    const { slug } = useParams();
    const clubSlug = slug || 'toledao'; // Default to Toledão if no slug provided

    const [club, setClub] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadClub() {
            try {
                // If slug is 'club-home' directly without param (via route /club-home), 
                // we might need a way to know which club. For now default to Toledão as per request context or user 'toledao'
                // In a real app we might persist the selected club in Context/LocalStorage.
                // Assuming route is /clubs/:slug or we treat /club-home as Toledão for now.
                // But wait, the route in App.tsx is /club-home without param. 
                // Let's assume for this specific request we default to Toledão but logic supports slug.

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

    // Filter sports based on active_modalities from backend
    // Backend returns active_modalities as array of strings like ['futebol', 'volei']
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

                {/* Destaque / Banner */}
                <div className="bg-indigo-900 rounded-3xl p-6 relative h-48 flex flex-col justify-center shadow-lg overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => navigate('/explore')}>
                    {/* Background Pattern */}
                    <div className="absolute -right-4 -top-4 opacity-10">
                        <Medal size={180} color="white" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-white text-2xl font-bold mb-1">Copa Verão 2026</h2>
                        <p className="text-indigo-200 text-sm mb-6">Inscrições abertas até 30/01</p>

                        <span className="bg-white px-5 py-2.5 rounded-full text-indigo-900 font-bold text-xs inline-block hover:bg-indigo-50 transition-colors shadow-sm">
                            VER CAMPEONATOS
                        </span>
                    </div>
                </div>

                {/* Atalhos Rápidos */}
                <div>
                    <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Acesso Rápido</h2>
                    <div className="bg-white rounded-2xl p-6 flex justify-around shadow-sm border border-gray-100">
                        <button className="flex flex-col items-center gap-2 group" onClick={() => navigate('/wallet')}>
                            <div className="bg-blue-50 p-4 rounded-2xl group-hover:bg-blue-100 transition-colors">
                                <QrCode className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">Carteirinha</span>
                        </button>

                        <button className="flex flex-col items-center gap-2 group" onClick={() => navigate('/shop')}>
                            <div className="bg-emerald-50 p-4 rounded-2xl group-hover:bg-emerald-100 transition-colors">
                                <ShoppingBag className="w-6 h-6 text-emerald-600" />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">Loja</span>
                        </button>

                        <button className="flex flex-col items-center gap-2 group" onClick={() => navigate('/agenda')}>
                            <div className="bg-orange-50 p-4 rounded-2xl group-hover:bg-orange-100 transition-colors">
                                <Calendar className="w-6 h-6 text-orange-500" />
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
                                    onClick={() => navigate(`/explore?sport=${sport.name}`)}
                                >
                                    <div className={`w-12 h-12 ${sport.color} rounded-full flex items-center justify-center shadow-sm`}>
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
