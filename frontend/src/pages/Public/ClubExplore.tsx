import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Calendar, Trophy, MapPin, Building2 } from 'lucide-react';
import api from '../../services/api';

export function ClubExplore() {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sportName = searchParams.get('sport') || 'Todos';

    const [club, setClub] = useState<any>(null);
    const [statusTab, setStatusTab] = useState('active'); // active, open, ongoing, upcoming, finished
    const [championships, setChampionships] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // 1. Load Club Data (to get ID and branding)
                let clubData = club;
                if (!clubData) {
                    const clubRes = await api.get(`/clubs/${slug}`);
                    clubData = clubRes.data;
                    setClub(clubData);
                }
                console.log('Club Data:', clubData);

                // 2. Fetch championships filtered by club
                const params: any = {
                    club_id: clubData.id
                };
                if (statusTab !== 'active') {
                    params.status = statusTab;
                }

                console.log('Fetching events with params:', params);
                const res = await api.get('/public/events', { params });
                console.log('API Response:', res.data);

                let filtered = res.data;

                // 3. Client-side filter for sport name (consistent with Explore.tsx)
                console.log('Filtering by sportName:', sportName);
                console.log('URL Search Params:', searchParams.toString());
                if (sportName && sportName !== 'Todos') {
                    console.log('Full filtered list before filter:', filtered);
                    filtered = filtered.filter((c: any) => {
                        const s = c.sport?.name || c.sport?.slug || c.sport_name || '';
                        console.log('Championship item:', c);
                        console.log(`Checking champ ${c.name} sport: '${s}' vs '${sportName}'`);
                        return s.toString().toLowerCase() === sportName.toLowerCase();
                    });
                }
                setChampionships(filtered);

            } catch (error) {
                console.error("Erro ao carregar dados", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [slug, statusTab, sportName]);

    const primaryColor = club?.primary_color || '#4f46e5';

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Mobile-like with Club Branding */}
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 leading-tight">
                        {sportName !== 'Todos' ? sportName : 'Campeonatos'}
                    </h1>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{club?.name}</p>
                </div>
            </div>

            <div className="max-w-lg mx-auto p-4">
                {/* Status Tabs */}
                {statusTab && (
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
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
                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border shadow-sm ${statusTab === tab.id
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center mt-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : championships.length === 0 ? (
                    <div className="text-center mt-10 text-gray-400 py-10 bg-white rounded-2xl border border-dashed border-gray-200">
                        <Trophy className="w-12 h-12 mx-auto text-gray-200 mb-2" />
                        <p className="text-sm font-medium">Nenhum campeonato encontrado.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {championships.map(item => (
                            <Link
                                key={item.id}
                                to={item.format === 'racing' ? `/races/${item.id}` : `/events/${item.id}`}
                                className="block bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all active:scale-[0.99]"
                            >
                                <div className="h-2 w-full bg-indigo-600" />
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1 pr-2">
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
                                                <Calendar className="w-3.5 h-3.5 mr-1.5 opacity-50" />
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
