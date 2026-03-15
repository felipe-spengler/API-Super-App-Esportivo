import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Calendar, Trophy, MapPin, Building2 } from 'lucide-react';
import { Icon } from '@iconify/react';
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
                // Fetch all public championships with status and club filter
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
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-xl p-6 pt-10 shadow-xl shadow-slate-200/50 flex items-center sticky top-0 z-50 border-b border-slate-100">
                <button onClick={() => navigate(-1)} className="p-3 mr-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-100 active:scale-95">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {sportName !== 'Todos' ? sportName : 'Campeonatos'}
                </h1>
            </div>

            <div className="max-w-lg mx-auto p-6">
                {/* Status Tabs */}
                <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide no-scrollbar -mx-2 px-2">
                    {[
                        { id: 'active', label: 'Todos' },
                        { id: 'open', label: 'Inscrições' },
                        { id: 'ongoing', label: 'Em Andamento' },
                        { id: 'upcoming', label: 'Em Breve' },
                        { id: 'finished', label: 'Finalizados' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusTab(tab.id)}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border
                                ${statusTab === tab.id
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-200'
                                    : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Buscando eventos...</span>
                    </div>
                ) : championships.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[2.5rem] shadow-xl shadow-slate-100 border border-slate-50">
                        <Icon icon="fluent-emoji:pensive-face" className="w-16 h-16 mx-auto opacity-30 mb-6" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Nenhum campeonato encontrado</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {championships.map(item => (
                            <Link
                                key={item.id}
                                to={item.format === 'racing' ? `/races/${item.id}` : `/events/${item.id}`}
                                className="block bg-white rounded-[2rem] shadow-xl shadow-slate-100 overflow-hidden border border-slate-50 hover:shadow-2xl hover:shadow-indigo-50 hover:border-indigo-200 transition-all active:scale-[0.98] group"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex-1 pr-4">
                                            {item.club?.name && (
                                                <div className="flex items-center text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 group-hover:text-indigo-600 transition-colors">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2"></div>
                                                    {item.club.name}
                                                </div>
                                            )}
                                            <h3 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{item.name}</h3>
                                        </div>
                                        <div className={`px-4 py-2 rounded-xl shrink-0 border ${item.status === 'registrations_open' ? 'bg-green-50 border-green-100 text-green-600' :
                                            item.status === 'finished' ? 'bg-slate-50 border-slate-100 text-slate-400' :
                                                item.status === 'upcoming' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                                    'bg-yellow-50 border-yellow-100 text-yellow-600'
                                            }`}>
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {item.status === 'registrations_open' ? 'Inscrições' :
                                                    item.status === 'finished' ? 'Finalizado' :
                                                        item.status === 'upcoming' ? 'Em Breve' : 'Em Andamento'}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-slate-500 text-sm mb-6 line-clamp-2 leading-relaxed font-medium">
                                        {item.description || 'Sem descrição disponível para este campeonato.'}
                                    </p>

                                    <div className="flex items-center justify-between border-t border-slate-50 pt-6">
                                        <div className="flex flex-col gap-2.5">
                                            <div className="flex items-center text-[10px] text-slate-900 font-black uppercase tracking-widest">
                                                <MapPin className="w-4 h-4 mr-2 text-indigo-600" />
                                                {item.races?.[0]?.location_name || item.club?.city?.name || item.city || 'Local não definido'}
                                            </div>
                                            <div className="flex items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                                <Calendar className="w-4 h-4 mr-2 text-indigo-400" />
                                                {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'TBA'} • {item.end_date ? new Date(item.end_date).toLocaleDateString() : 'TBA'}
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
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
