import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Calendar, Trophy, MapPin, Building2 } from 'lucide-react';
import api from '../../services/api';

export function Explore() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sportName = searchParams.get('sport') || 'Todos';

    const [statusTab, setStatusTab] = useState('active'); // active, open, ongoing, upcoming, finished
    const [championships, setChampionships] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadChampionships() {
            setLoading(true);
            try {
                // Fetch all public championships with status filter
                const params: any = {};
                if (statusTab !== 'active') {
                    params.status = statusTab;
                }
                const res = await api.get('/public/events', { params });

                let filtered = res.data;

                if (sportName && sportName !== 'Todos') {
                    filtered = filtered.filter((c: any) => {
                        const s = c.sport?.name || c.sport?.slug || c.sport_name || '';
                        return s.toString().toLowerCase() === sportName.toLowerCase();
                    });
                }
                setChampionships(filtered);

            } catch (error) {
                console.error("Erro ao carregar campeonatos", error);
            } finally {
                setLoading(false);
            }
        }
        loadChampionships();
    }, [sportName, statusTab]);


    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Mobile-like */}
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">
                    {sportName !== 'Todos' ? sportName : 'Campeonatos'}
                </h1>
            </div>

            <div className="max-w-lg mx-auto p-4">
                {/* Status Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
                    {[
                        { id: 'active', label: 'Todos Ativos' },
                        { id: 'open', label: 'Inscrições' },
                        { id: 'ongoing', label: 'Em Andamento' },
                        { id: 'upcoming', label: 'Em Breve' },
                        { id: 'finished', label: 'Finalizados' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusTab(tab.id)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border
                                ${statusTab === tab.id
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex justify-center mt-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : championships.length === 0 ? (
                    <div className="text-center mt-10 text-gray-500">
                        <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p>Nenhum campeonato encontrado.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {championships.map(item => (
                            <Link
                                key={item.id}
                                to={item.format === 'racing' ? `/races/${item.id}` : `/events/${item.id}`}
                                className="block bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all active:scale-[0.99]"
                            >
                                <div className="h-2 bg-indigo-600 w-full" />
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 pr-2">
                                            {item.club?.name && (
                                                <div className="flex items-center text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                                                    <Building2 className="w-3 h-3 mr-1" />
                                                    {item.club.name}
                                                </div>
                                            )}
                                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{item.name}</h3>
                                        </div>
                                        <div className={`px-2 py-1 rounded-md shrink-0 ${item.status === 'registrations_open' ? 'bg-green-100' :
                                            item.status === 'finished' ? 'bg-gray-200' :
                                                item.status === 'upcoming' ? 'bg-blue-100' : 'bg-yellow-100'
                                            }`}>
                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${item.status === 'registrations_open' ? 'text-green-700' :
                                                item.status === 'finished' ? 'text-gray-600' :
                                                    item.status === 'upcoming' ? 'text-blue-700' : 'text-yellow-700'
                                                }`}>
                                                {item.status === 'registrations_open' ? 'Inscrições' :
                                                    item.status === 'finished' ? 'Finalizado' :
                                                        item.status === 'upcoming' ? 'Em Breve' : 'Em Andamento'}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[2.5em]">
                                        {item.description || 'Sem descrição disponível para este campeonato.'}
                                    </p>

                                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center text-xs text-gray-700 font-bold">
                                                <MapPin className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                                                {item.club?.city || item.city || 'Local não definido'}
                                            </div>
                                            <div className="flex items-center text-xs text-gray-500 font-medium">
                                                <Calendar className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
                                                De {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'TBA'} a {item.end_date ? new Date(item.end_date).toLocaleDateString() : 'TBA'}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
