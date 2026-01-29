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
};

export function PublicHome() {
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
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Onde você quer jogar?</h1>
                        <p className="text-gray-500">Selecione sua cidade para ver os clubes disponíveis</p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cities.map((city) => (
                                <div key={city.id} className="border border-gray-100 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => handleCityClick(city)}
                                        className={`w-full flex items-center justify-between p-4 transition-colors ${selectedCityId === city.id ? 'bg-indigo-50 text-indigo-900' : 'bg-white hover:bg-gray-50 text-gray-900'
                                            }`}
                                    >
                                        <div className="flex items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${selectedCityId === city.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-bold">{city.name}</h3>
                                                <span className="text-xs text-gray-500">{city.state}</span>
                                            </div>
                                        </div>
                                        {selectedCityId === city.id ? (
                                            <ChevronUp className="w-5 h-5 text-indigo-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </button>

                                    {selectedCityId === city.id && (
                                        <div className="bg-gray-50 p-3 space-y-2 border-t border-gray-100">
                                            {loadingClubs ? (
                                                <div className="flex justify-center py-4 text-sm text-gray-500">
                                                    Carregando clubes...
                                                </div>
                                            ) : clubs.length > 0 ? (
                                                clubs.map((club) => (
                                                    <Link
                                                        key={club.id}
                                                        to={`/club-home/${club.slug}`}
                                                        className="flex items-center p-3 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all group"
                                                    >
                                                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                            <Shield className="w-4 h-4" />
                                                        </div>
                                                        <span className="font-medium text-gray-700 group-hover:text-indigo-700">{club.name}</span>
                                                    </Link>
                                                ))
                                            ) : (
                                                <div className="text-center py-4 text-sm text-gray-400 italic">
                                                    Nenhum clube encontrado nesta cidade.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {cities.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    Nenhuma cidade encontrada.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-400 mb-4">Ou explore eventos públicos</p>
                        <Link to="/explore" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
                            Ver todos os eventos <ChevronDown className="w-4 h-4 rotate-270" style={{ transform: 'rotate(-90deg)' }} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
