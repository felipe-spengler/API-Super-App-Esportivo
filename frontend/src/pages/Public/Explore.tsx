import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Calendar, Trophy } from 'lucide-react';
import api from '../../services/api';

export function Explore() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sportName = searchParams.get('sport') || 'Todos';

    // Estado para campeonatos e loading
    const [championships, setChampionships] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadChampionships() {
            setLoading(true);
            try {
                // Hardcoded Club ID 1 for now (Toledão), equal to Mobile context
                const clubId = 1;

                // Busca todos os campeonatos do clube
                const res = await api.get(`/clubs/${clubId}/championships`);

                let filtered = res.data;

                // Filtragem simples no frontend se houver parametro sport
                if (sportName && sportName !== 'Todos') {
                    filtered = filtered.filter((c: any) => {
                        // Tenta filtrar pelo slug do esporte ou nome
                        // Verifica se 'sport' existe (slug) ou se tem 'sport_name'
                        const s = c.sport || c.sport_name || '';
                        return s.toLowerCase() === sportName.toLowerCase();
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
    }, [sportName]);


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
                                className="block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all active:scale-[0.99]"
                            >
                                <div className="h-2 bg-green-500 w-full" />
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2 leading-tight">{item.name}</h3>
                                        <div className={`px-2 py-1 rounded-md shrink-0 ${item.status === 'registrations_open' ? 'bg-green-100' : 'bg-gray-100'}`}>
                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${item.status === 'registrations_open' ? 'text-green-700' : 'text-gray-600'}`}>
                                                {item.status === 'registrations_open' ? 'Inscrições Abertas' : 'Em Andamento'}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[2.5em]">
                                        {item.description || 'Sem descrição disponível para este campeonato.'}
                                    </p>

                                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                                        <div className="flex items-center text-xs text-gray-500 font-medium">
                                            <Calendar className="w-3 h-3 mr-1.5 text-indigo-500" />
                                            De {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'TBA'} a {item.end_date ? new Date(item.end_date).toLocaleDateString() : 'TBA'}
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
