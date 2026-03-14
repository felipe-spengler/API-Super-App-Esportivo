
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Trophy, Camera, Users, FileText } from 'lucide-react';
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
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            {/* Hero Image with Dynamic Header */}
            <div className="relative h-[400px] md:h-[450px] w-full overflow-hidden bg-slate-900">
                <img
                    src={champ.cover_image_url || "https://images.unsplash.com/photo-1552674605-4694559e5bc7?q=80&w=2673&auto=format&fit=crop"}
                    alt="Race Hero"
                    className="w-full h-full object-cover opacity-60 scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />

                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-6 left-4 z-20 p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full hover:bg-white/20 transition-all text-white active:scale-95 shadow-2xl"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="absolute bottom-12 left-0 w-full px-6 z-10">
                    <div className="max-w-4xl mx-auto">
                        <span className="inline-block px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-md mb-3 shadow-lg shadow-emerald-500/20">
                            {champ.sport?.name || 'Evento Esportivo'}
                        </span>
                        <h1 className="text-white text-3xl md:text-5xl font-black uppercase tracking-tight leading-none mb-4 drop-shadow-2xl">
                            {champ.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-4 text-white/90 font-bold text-xs md:text-sm uppercase tracking-wider">
                            <div className="flex items-center bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
                                <Calendar className="w-4 h-4 text-emerald-400 mr-2" />
                                <span>{new Date(champ.start_date).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center bg-white/10 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
                                <MapPin className="w-4 h-4 text-emerald-400 mr-2" />
                                <span>{race?.location_name || 'Local a confirmar'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-20">
                {/* Actions Grid with Richer Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <button
                        onClick={() => navigate(`/races/${id}/register`)}
                        className="group relative overflow-hidden bg-emerald-600 hover:bg-emerald-500 text-white p-5 rounded-3xl shadow-2xl transition-all active:scale-[0.98] border-b-4 border-emerald-800"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-125 transition-transform">
                            <Users size={40} />
                        </div>
                        <Users className="w-7 h-7 mb-2 drop-shadow-lg" />
                        <span className="font-black uppercase text-[10px] tracking-widest block">Inscrever-se</span>
                    </button>

                    <button
                        onClick={() => navigate(`/races/${id}/results`)}
                        className="group relative overflow-hidden bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-3xl shadow-2xl transition-all active:scale-[0.98] border-b-4 border-blue-800"
                    >
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-125 transition-transform">
                            <Trophy size={40} />
                        </div>
                        <Trophy className="w-7 h-7 mb-2 drop-shadow-lg" />
                        <span className="font-black uppercase text-[10px] tracking-widest block">Resultados</span>
                    </button>

                    {champ.regulation_path && (
                        <a 
                            href={`${window.location.origin}/api/storage/${champ.regulation_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative overflow-hidden bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-3xl shadow-2xl transition-all active:scale-[0.98] border-b-4 border-indigo-800 flex flex-col items-center md:items-start"
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-125 transition-transform">
                                <FileText size={40} />
                            </div>
                            <FileText className="w-7 h-7 mb-2 drop-shadow-lg" />
                            <span className="font-black uppercase text-[10px] tracking-widest block">Regulamento</span>
                        </a>
                    )}

                    <button className="relative overflow-hidden bg-slate-800 text-slate-400 p-5 rounded-3xl shadow-2xl transition-all opacity-80 cursor-not-allowed grayscale border-b-4 border-slate-900">
                        <Camera className="w-7 h-7 mb-2" />
                        <span className="font-black uppercase text-[10px] tracking-widest block">Galeria</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                        {/* About Section */}
                        {champ.description && (
                            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
                                <h2 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tight flex items-center gap-3">
                                    <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                                    Informações do Evento
                                </h2>
                                <p className="text-slate-600 leading-relaxed font-medium">
                                    {champ.description}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar / Org Info */}
                    <div className="space-y-6">
                        {champ.club && (
                            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-6">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Organização</h3>
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl p-1 shrink-0 flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden">
                                        {champ.club.logo_url ? (
                                            <img src={champ.club.logo_url} className="w-full h-full object-contain" />
                                        ) : (
                                            <Users className="text-slate-300" size={24} />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 uppercase text-sm leading-tight">{champ.club.name}</h4>
                                        <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-50 rounded-md inline-block mt-1">Verificado</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Social Share / Placeholder */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-6 text-white shadow-2xl">
                            <h4 className="font-black text-xs uppercase tracking-widest mb-2 opacity-60">Status do Evento</h4>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                                <span className="font-black uppercase text-sm">Inscrições Abertas</span>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">Prepare-se para o desafio e garanta sua vaga agora mesmo.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
