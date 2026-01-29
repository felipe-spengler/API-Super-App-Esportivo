
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Trophy, Camera, Users } from 'lucide-react';
import api from '../../services/api';

export function RaceDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [champ, setChamp] = useState<any>(null);
    const [race, setRace] = useState<any>(null);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // Fetch championship logic similar to EventDetails 
                // In mobile they fetch both champ and race info
                const [champRes, raceRes] = await Promise.all([
                    api.get(`/championships/${id}`),
                    api.get(`/championships/${id}/race`).catch(() => ({ data: {} })) // Fallback in case race info is missing
                ]);
                setChamp(champRes.data);
                setRace(raceRes.data);
            } catch (error) {
                console.error("Erro ao carregar corrida", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!champ) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Evento não encontrado.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* Hero Image */}
            <div className="h-72 bg-gray-900 relative">
                <img
                    src="https://images.unsplash.com/photo-1552674605-4694559e5bc7?q=80&w=2673&auto=format&fit=crop"
                    alt="Race Hero"
                    className="w-full h-full object-cover opacity-60"
                />

                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-4 z-10 p-2 bg-black/40 rounded-full hover:bg-black/60 transition-colors text-white"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-black/90 to-transparent">
                    <h1 className="text-white text-3xl font-bold uppercase tracking-wide leading-tight mb-2">
                        {champ.name}
                    </h1>
                    <div className="flex items-center text-white/90 font-medium text-sm">
                        <Calendar className="w-4 h-4 text-green-500 mr-2" />
                        <span>{new Date(champ.start_date).toLocaleDateString()}</span>
                        <div className="w-1 h-1 bg-white/50 rounded-full mx-3" />
                        <MapPin className="w-4 h-4 text-green-500 mr-2" />
                        <span>{race?.location_name || 'Local a confirmar'}</span>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10">
                {/* Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98]">
                        <Users className="w-6 h-6" />
                        <span className="font-bold uppercase text-xs tracking-wider">Inscrever-se</span>
                    </button>

                    <button
                        onClick={() => navigate(`/races/${id}/results`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                        <Trophy className="w-6 h-6" />
                        <span className="font-bold uppercase text-xs tracking-wider">Resultados</span>
                    </button>

                    <button className="bg-gray-800 hover:bg-gray-700 text-white p-4 rounded-xl shadow-lg flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98]">
                        <Camera className="w-6 h-6" />
                        <span className="font-bold uppercase text-xs tracking-wider">Galeria</span>
                    </button>
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8">
                    {/* About */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-3">Sobre o Evento</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Prepare-se para o maior desafio do ano! A {champ.name} traz percursos desafiadores e uma estrutura completa para você superar seus limites. Kit atleta completo, hidratação a cada 3km e medalha finisher para todos que completarem a prova.
                        </p>
                    </div>

                    {/* Map Placeholder */}
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 mb-3">Percurso</h2>
                        <div className="w-full h-64 bg-gray-100 rounded-xl flex flex-col items-center justify-center border border-gray-200 relative overflow-hidden group">
                            {/* Static Map Image (Mock) */}
                            <img
                                src="https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-53.7431,-24.7259,13,0/600x300?access_token=YOUR_TOKEN"
                                className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all"
                                alt="Map"
                            />
                            <div className="relative z-10 flex flex-col items-center bg-white/80 p-4 rounded-xl backdrop-blur-sm">
                                <MapPin className="w-8 h-8 text-gray-500 mb-2" />
                                <span className="font-bold text-gray-700">Mapa Interativo (Em Breve)</span>
                            </div>
                        </div>
                    </div>

                    {/* Organization */}
                    <div className="border-t border-gray-100 pt-6 flex items-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-full mr-4 shrink-0"></div>
                        <div>
                            <h3 className="font-bold text-gray-800">Run Events Toledo</h3>
                            <span className="text-xs text-green-600 font-bold uppercase tracking-wide bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Verificado</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
