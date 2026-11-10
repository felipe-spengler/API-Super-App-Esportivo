import { MapPin, Trophy, ChevronDown, ChevronRight, Shield, Search, Calendar, Award, Sparkles, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
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

function formatDisplayName(text: string): string {
    if (!text) return '';
    const lowerWords = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em']);
    return text
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((word, index) => {
            if (index > 0 && lowerWords.has(word)) return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

export function PublicHome() {
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

    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(true);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loadingClubs, setLoadingClubs] = useState(false);
    const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchCities();
    }, []);

    const fetchCities = async () => {
        try {
            const response = await api.get('/cities');
            const cityList: City[] = Array.isArray(response.data) ? response.data : [];
            setCities(cityList);
            if (cityList.length === 1) {
                fetchClubs(cityList[0].slug, cityList[0].id);
            }
        } catch (error) {
            console.error('Erro ao buscar cidades', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClubs = async (citySlug: string, cityId: number) => {
        setLoadingClubs(true);
        setSelectedCityId(cityId);
        try {
            const response = await api.get(`/cities/${citySlug}/clubs`);
            setClubs(Array.isArray(response.data) ? response.data : []);
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

    const filteredCities = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return cities;
        return cities.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.state.toLowerCase().includes(q)
        );
    }, [cities, searchQuery]);

    return (
        <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-slate-50 via-white to-slate-50/80 py-6 px-4 sm:px-6 flex flex-col items-center">
            <div className="w-full max-w-md mx-auto space-y-6">
                {/* Main Hero & City Selection Card */}
                <div className="bg-white rounded-3xl shadow-[0_12px_40px_-12px_rgba(15,23,42,0.08)] border border-slate-200/70 p-6 sm:p-8 relative overflow-hidden">
                    {/* Subtle Top Gradient Accent */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Brand Header */}
                    <div className="text-center relative z-10 mb-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 mb-4 rounded-[1.35rem] shadow-md shadow-slate-900/10 overflow-hidden bg-slate-950 border border-slate-800/20">
                            <img src="/logo.png" alt="Esportes7" className="w-full h-full object-contain" />
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-indigo-600 text-xs font-semibold mb-3">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Plataforma Esportiva Oficial</span>
                        </div>

                        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight leading-snug">
                            Onde você quer{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                                jogar hoje?
                            </span>
                        </h1>
                        <p className="text-sm text-slate-500 font-normal mt-1.5 leading-relaxed">
                            Escolha sua cidade para acessar clubes, campeonatos, súmulas ao vivo e inscrições.
                        </p>
                    </div>

                    {/* Search Bar (when there are cities) */}
                    {cities.length > 2 && (
                        <div className="relative z-10 mb-5">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar cidade..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-50/90 hover:bg-slate-50 focus:bg-white text-sm text-slate-800 placeholder:text-slate-400 rounded-2xl border border-slate-200/80 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                            />
                        </div>
                    )}

                    {/* Cities Accordion List */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <div className="w-9 h-9 border-[3px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-slate-400 font-medium text-sm">Carregando cidades disponíveis...</span>
                        </div>
                    ) : filteredCities.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-slate-200/60">
                            <p className="text-sm font-medium text-slate-500">Nenhuma cidade encontrada para "{searchQuery}".</p>
                        </div>
                    ) : (
                        <div className="space-y-3 relative z-10">
                            {filteredCities.map((city) => {
                                const isSelected = selectedCityId === city.id;
                                return (
                                    <div
                                        key={city.id}
                                        className={`rounded-2xl transition-all duration-300 ${
                                            isSelected
                                                ? 'bg-slate-50/70 ring-1 ring-indigo-500/20 p-1.5'
                                                : ''
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => handleCityClick(city)}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-200 text-left ${
                                                isSelected
                                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
                                                    : 'bg-slate-50/90 hover:bg-white text-slate-800 border border-slate-200/70 hover:border-indigo-200 hover:shadow-sm'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0 pr-2">
                                                <div
                                                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                        isSelected
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-white text-indigo-600 border border-slate-200/70 shadow-2xs'
                                                    }`}
                                                >
                                                    <MapPin className="w-5 h-5" strokeWidth={2.1} />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-[16px] leading-snug tracking-tight truncate">
                                                        {formatDisplayName(city.name)}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span
                                                            className={`text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                                                                isSelected
                                                                    ? 'bg-white/20 text-white'
                                                                    : 'bg-slate-200/70 text-slate-600'
                                                            }`}
                                                        >
                                                            {city.state}
                                                        </span>
                                                        <span
                                                            className={`text-xs font-normal ${
                                                                isSelected ? 'text-indigo-100' : 'text-slate-400'
                                                            }`}
                                                        >
                                                            • Toque para ver clubes
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                                                    isSelected
                                                        ? 'bg-white/15 text-white rotate-180'
                                                        : 'text-slate-400'
                                                }`}
                                            >
                                                <ChevronDown className="w-5 h-5" />
                                            </div>
                                        </button>

                                        {isSelected && (
                                            <div className="mt-2.5 space-y-2 px-1 pb-1 animate-in fade-in duration-200">
                                                {loadingClubs ? (
                                                    <div className="flex items-center justify-center py-6 gap-2.5">
                                                        <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                                        <span className="text-xs font-medium text-slate-500">
                                                            Carregando clubes de {formatDisplayName(city.name)}...
                                                        </span>
                                                    </div>
                                                ) : clubs.length > 0 ? (
                                                    clubs.map((club) => (
                                                        <Link
                                                            key={club.id}
                                                            to={`/club-home/${club.slug}`}
                                                            className="flex items-center p-3.5 bg-white rounded-xl border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition-all group active:scale-[0.99]"
                                                        >
                                                            <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center mr-3.5 border border-slate-100 overflow-hidden shrink-0">
                                                                {club.logo_url || club.logo_path ? (
                                                                    <img
                                                                        src={getImageUrl(club.logo_url || club.logo_path)}
                                                                        alt={club.name}
                                                                        className="w-full h-full object-contain p-1"
                                                                        onError={(e) => {
                                                                            (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(club.name)}&background=4f46e5&color=fff&bold=true`;
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <Shield className="w-5 h-5 text-indigo-500" />
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col flex-1 min-w-0 pr-2">
                                                                <span className="font-semibold text-[15px] text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                                                                    {formatDisplayName(club.name)}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                    <span className="text-xs font-medium text-slate-500">
                                                                        Clube disponível
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                                                                <ChevronRight className="w-4 h-4" />
                                                            </div>
                                                        </Link>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-200">
                                                        <p className="text-xs font-medium text-slate-400">
                                                            Nenhum clube cadastrado nesta cidade no momento.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Quick Access Section */}
                    <div className="mt-7 pt-6 border-t border-slate-100 relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Acesso Rápido
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <Link
                                to="/explore"
                                className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/90 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 transition-all group active:scale-[0.98]"
                            >
                                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                    <Trophy className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 truncate">
                                        Campeonatos
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate">
                                        Ver todos os eventos
                                    </div>
                                </div>
                            </Link>

                            <Link
                                to="/agenda"
                                className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/90 hover:bg-indigo-50/60 border border-slate-200/70 hover:border-indigo-200 transition-all group active:scale-[0.98]"
                            >
                                <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-800 group-hover:text-violet-600 truncate">
                                        Agenda
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate">
                                        Jogos e calendário
                                    </div>
                                </div>
                            </Link>
                        </div>

                        <Link
                            to="/explore"
                            className="mt-3 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-sm text-white transition-all duration-200 bg-slate-900 rounded-2xl hover:bg-indigo-600 shadow-sm active:scale-[0.99]"
                        >
                            <Award className="w-4 h-4" />
                            <span>Explorar Todos os Eventos</span>
                        </Link>
                    </div>
                </div>

                {/* Footer Links (Apple App Store & Privacy Compliance) */}
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400 font-medium px-2 pb-4">
                    <Link to="/privacy-policy" className="hover:text-slate-600 transition-colors flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Política de Privacidade</span>
                    </Link>
                    <span>•</span>
                    <Link to="/profile" className="hover:text-slate-600 transition-colors">
                        Minha Conta
                    </Link>
                    <span>•</span>
                    <Link to="/deletar-conta" className="hover:text-slate-600 transition-colors">
                        Exclusão de Dados
                    </Link>
                </div>
            </div>
        </div>
    );
}
