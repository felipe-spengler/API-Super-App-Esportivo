import { MapPin, Trophy, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../../services/api';

type City = {
    id: number;
    name: string;
    state: string;
    slug: string;
};

type Club = {
    id: number;
    name: string;
    city_id: number;
    slug: string;
    colors: any;
    logo_url?: string;
    logo_path?: string;
};

export function PublicHome() {
    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${baseUrl}${cleanPath}`;
    };
    const navigate = useNavigate();
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(true);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loadingClubs, setLoadingClubs] = useState(false);
    const [selectedCityId, setSelectedCityId] = useState<number | null>(null);

    useEffect(() => {
        fetchCities();
    }, []);

    const fetchCities = async () => {
        try {
            const response = await api.get('/cities');
            setCities(response.data);
        } catch (error) {
            console.error('Erro ao buscar cidades', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClubs = async (citySlug: string, cityId: number) => {
        setLoadingClubs(true);
        try {
            const response = await api.get(`/cities/${citySlug}/clubs`);
            setClubs(response.data);
            setSelectedCityId(cityId);
        } catch (error) {
            console.error('Erro ao buscar clubes', error);
        } finally {
            setLoadingClubs(false);
        }
    };

    const handleCityClick = (city: City) => {
        if (selectedCityId === city.id) {
            setSelectedCityId(null);
            setClubs([]);
        } else {
            fetchClubs(city.slug, city.id);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 p-10 border border-slate-100 relative overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-50 rounded-full -ml-16 -mb-16 blur-3xl opacity-50"></div>

                    <div className="mb-10 text-center relative z-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-200 mb-6 transform hover:rotate-6 transition-transform">
                            <Trophy className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">
                            Onde você quer <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">jogar?</span>
                        </h1>
                        <p className="text-slate-500 font-medium">Selecione sua cidade para ver os clubes</p>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                            <span className="text-slate-400 font-semibold animate-pulse text-sm">Buscando cidades...</span>
                        </div>
                    ) : (
                        <div className="space-y-4 relative z-10">
                            {cities.map((city) => (
                                <div key={city.id} className={`rounded-3xl transition-all duration-500 ${selectedCityId === city.id ? 'ring-4 ring-indigo-500/10' : ''}`}>
                                    <button
                                        onClick={() => handleCityClick(city)}
                                        className={`w-full flex items-center justify-between p-5 rounded-[1.5rem] transition-all duration-300 ${selectedCityId === city.id
                                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-200'
                                            : 'bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-100 text-slate-900 border border-transparent hover:border-slate-100'
                                            }`}
                                    >
                                        <div className="flex items-center">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 shadow-sm transition-all ${selectedCityId === city.id ? 'bg-white/20 scale-110' : 'bg-white text-slate-400'
                                                }`}>
                                                <MapPin className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-extrabold text-lg leading-tight uppercase tracking-tight">{city.name}</h3>
                                                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${selectedCityId === city.id ? 'text-white/70' : 'text-slate-400'}`}>{city.state}</span>
                                            </div>
                                        </div>
                                        {selectedCityId === city.id ? (
                                            <ChevronUp className="w-6 h-6 text-white animate-bounce-subtle" />
                                        ) : (
                                            <ChevronDown className="w-6 h-6 text-slate-300" />
                                        )}
                                    </button>

                                    {selectedCityId === city.id && (
                                        <div className="mt-3 px-2 pb-2 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                                            {loadingClubs ? (
                                                <div className="flex items-center justify-center py-8 gap-3">
                                                    <div className="w-5 h-5 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                                    <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Convocando clubes...</span>
                                                </div>
                                            ) : clubs.length > 0 ? (
                                                clubs.map((club) => (
                                                    <Link
                                                        key={club.id}
                                                        to={`/club-home/${club.slug}`}
                                                        className="flex items-center p-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-50 transition-all group active:scale-95"
                                                    >
                                                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mr-4 border border-slate-100 overflow-hidden shadow-sm group-hover:bg-indigo-50 transition-all group-hover:scale-105">
                                                            {club.logo_url || club.logo_path ? (
                                                                <img
                                                                    src={getImageUrl(club.logo_url || club.logo_path)}
                                                                    alt={club.name}
                                                                    className="w-full h-full object-contain p-1.5"
                                                                    onError={(e) => {
                                                                        (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=6366f1&color=fff&bold=true`;
                                                                    }}
                                                                />
                                                            ) : (
                                                                <Shield className="w-6 h-6 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col flex-1">
                                                            <span className="font-extrabold text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{club.name}</span>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Clube Ativo</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-slate-50 p-2 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                            <ChevronDown className="w-4 h-4 -rotate-90" />
                                                        </div>
                                                    </Link>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum clube encontrado</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-12 pt-10 border-t border-slate-100 text-center relative z-10">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-6">Exploração Global</p>
                        <Link to="/explore" className="group relative inline-flex items-center justify-center px-8 py-3 font-extrabold text-white transition-all duration-300 bg-slate-900 rounded-full hover:bg-indigo-600 shadow-lg shadow-slate-200 hover:shadow-indigo-200 active:scale-95 overflow-hidden">
                            <span className="relative z-10 flex items-center gap-2">
                                Ver todos os eventos
                                <Trophy className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
