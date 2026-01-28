import { useEffect, useState } from 'react';
import { Calendar, MapPin, ArrowRight, Trophy, Users, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export function PublicHome() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadPublicEvents() {
            setLoading(true);
            try {
                const res = await api.get('/public/events');
                // Adapter: mapeia formato do banco para formato da Home
                const mapped = res.data.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    sport: c.sport,
                    date: c.start_date,
                    location: c.location || 'Local a definir',
                    teams: 0, // Backend ainda não traz count de inscritos na listagem simples
                    type: ['Corrida de Rua', 'Ciclismo', 'MTB', 'Natação'].includes(c.sport) ? 'race' : 'team'
                }));
                setEvents(mapped);
            } catch (error) {
                console.error("Erro ao carregar eventos públicos", error);
            } finally {
                setLoading(false);
            }
        }
        loadPublicEvents();
    }, []);

    return (
        <div className="animate-in fade-in duration-700">
            {/* Hero Section */}
            <section className="relative bg-indigo-900 py-20 overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center" />
                <div className="relative max-w-7xl mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                        Viva a paixão do esporte.<br />
                        <span className="text-indigo-400">Em tempo real.</span>
                    </h1>
                    <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
                        Acompanhe campeonatos, estatísticas, resultados ao vivo e inscreva-se nos melhores eventos esportivos da região.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/explore" className="px-8 py-4 bg-white text-indigo-900 font-bold rounded-full hover:bg-indigo-50 transition transform hover:scale-105 shadow-xl">
                            Explorar Eventos
                        </Link>
                        <Link to="/login?role=organizer" className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-500 transition transform hover:scale-105 shadow-xl border border-indigo-400">
                            Organizar Campeonato
                        </Link>
                    </div>
                </div>
            </section>

            {/* Destaques */}
            <section className="max-w-7xl mx-auto px-4 py-16">
                <div className="flex items-center justify-between mb-10">
                    <h2 className="text-3xl font-bold text-gray-900">Eventos em Destaque</h2>
                    <Link to="/explore" className="text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1">
                        Ver todos <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>

                {loading ? (
                    <div className="grid md:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-8">
                        {events.map(event => (
                            <Link key={event.id} to={`/ events / ${event.id} `} className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className="h-48 bg-gray-200 relative">
                                    {/* Placeholder de Imagem */}
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-100">
                                        {event.type === 'race' ? <Timer className="w-16 h-16 opacity-30" /> : <Trophy className="w-16 h-16 opacity-30" />}
                                    </div>
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-gray-800 shadow-sm">
                                        {event.sport}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{event.name}</h3>

                                    <div className="space-y-2 text-sm text-gray-500 mb-6">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-indigo-500" />
                                            {new Date(event.date).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-indigo-500" />
                                            {event.location}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-indigo-500" />
                                            {event.teams} {event.type === 'race' ? 'Participantes' : 'Equipes'}
                                        </div>
                                    </div>

                                    <div className="block w-full text-center py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        Ver Detalhes
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Features Section */}
            <section className="bg-gray-900 text-white py-20 mt-10">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid md:grid-cols-3 gap-12 text-center">
                        <div className="space-y-4">
                            <div className="bg-indigo-600 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center rotate-3 hover:rotate-6 transition-transform">
                                <Trophy className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold">Gestão Profissional</h3>
                            <p className="text-gray-400 leading-relaxed">Organize campeonatos completos com chaves, tabelas e estatísticas automatizadas.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-emerald-500 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center -rotate-3 hover:-rotate-6 transition-transform">
                                <Timer className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold">Cronometragem & Súmula</h3>
                            <p className="text-gray-400 leading-relaxed">Resultados em tempo real para corridas e súmula digital para esportes coletivos.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-purple-500 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center rotate-3 hover:rotate-6 transition-transform">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold">Comunidade Ativa</h3>
                            <p className="text-gray-400 leading-relaxed">Perfis de atletas, histórico de partidas e engajamento para o seu clube.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
