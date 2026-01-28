import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Calendar, Trophy, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export function Explore() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSport, setFilterSport] = useState('Todos');

    useEffect(() => {
        async function loadEvents() {
            setLoading(true);
            try {
                // Usando o endpoint público de listagem
                const res = await api.get('/public/events');

                // Mapeando dados para o formato da UI
                const mapped = res.data.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    sport: c.sport,
                    date: c.start_date,
                    location: c.location || 'Local a definir',
                    image: c.cover_image || null, // Se tiver imagem no futuro
                    price: 'R$ 80,00', // Exemplo, backend precisa enviar preço
                    status: 'open' // open, closed, running
                }));

                setEvents(mapped);
            } catch (error) {
                console.error("Erro ao buscar eventos", error);
            } finally {
                setLoading(false);
            }
        }
        loadEvents();
    }, []);

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSport = filterSport === 'Todos' || event.sport === filterSport;
        return matchesSearch && matchesSport;
    });

    const categories = ['Todos', 'Corrida', 'Futebol', 'Vôlei', 'Basquete', 'Tênis'];

    return (
        <div className="min-h-screen bg-gray-50 pb-20 animate-in fade-in duration-500">
            {/* Header Search */}
            <div className="bg-indigo-900 pt-24 pb-12 px-4 shadow-lg rounded-b-[2.5rem]">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl font-bold text-white mb-6">Encontre seu próximo desafio</h1>

                    <div className="relative max-w-2xl mx-auto">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="h-6 w-6 text-indigo-300" />
                        </div>
                        <input
                            type="text"
                            className="w-full pl-14 pr-4 py-4 rounded-full bg-white/10 backdrop-blur-md border border-indigo-400/30 text-white placeholder-indigo-200 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all text-lg"
                            placeholder="Buscar por nome, cidade ou modalidade..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 -mt-6">
                {/* Filtros em Pílulas (Scroll Horizontal no Mobile) */}
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide justify-start md:justify-center">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setFilterSport(cat)}
                            className={`whitespace-nowrap px-6 py-2 rounded-full text-sm font-bold shadow-sm transition-all
                ${filterSport === cat
                                    ? 'bg-indigo-600 text-white scale-105 shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-100'}
              `}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid de Eventos */}
            <div className="max-w-7xl mx-auto px-4 mt-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-indigo-600" />
                        {filteredEvents.length} Eventos encontrados
                    </h2>
                    <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600">
                        <Filter className="w-4 h-4" /> Filtros Avançados
                    </button>
                </div>

                {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white rounded-3xl h-72 shadow-sm animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredEvents.map(event => (
                            <Link
                                to={`/events/${event.id}`}
                                key={event.id}
                                className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 flex flex-col h-full"
                            >
                                {/* Imagem / Capa */}
                                <div className="relative h-48 bg-gray-200 overflow-hidden">
                                    <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10`} />
                                    {event.image ? (
                                        <img src={event.image} alt={event.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform duration-700">
                                            <Trophy className="w-20 h-20 opacity-20 text-white" />
                                        </div>
                                    )}

                                    <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-indigo-900 shadow-lg">
                                        {event.sport}
                                    </div>

                                    <div className="absolute bottom-4 left-4 z-20 text-white">
                                        <p className="text-xs font-medium opacity-90 flex items-center gap-1 mb-1">
                                            <Calendar className="w-3 h-3" /> {new Date(event.date).toLocaleDateString()}
                                        </p>
                                        <h3 className="text-xl font-bold leading-tight shadow-black drop-shadow-md">{event.name}</h3>
                                    </div>
                                </div>

                                {/* Info Body */}
                                <div className="p-6 flex flex-col flex-1 justify-between">
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-start gap-2 text-sm text-gray-600">
                                            <MapPin className="w-4 h-4 text-indigo-500 mt-1 shrink-0" />
                                            <span className="line-clamp-2">{event.location}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between border-t border-gray-100 pt-4">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-semibold">Inscrição</p>
                                            <p className="text-lg font-bold text-indigo-600">{event.price}</p>
                                        </div>
                                        <span className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <ArrowRight className="w-5 h-5" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {!loading && filteredEvents.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <Search className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">Nenhum evento encontrado</h3>
                        <p className="text-gray-500 mt-2">Tente buscar por outro termo ou mude a categoria.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
