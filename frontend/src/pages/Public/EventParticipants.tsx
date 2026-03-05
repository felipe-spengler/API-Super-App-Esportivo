
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import api from '../../services/api';
import { TeamPlayersModal } from '../../components/TeamPlayersModal';

export function EventParticipants() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('category_id');

    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [champName, setChampName] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<any>(null);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const champRes = await api.get(`/championships/${id}`);
                setChampName(champRes.data.name);

                // Fetch teams with players relationship
                const response = await api.get(`/championships/${id}/teams`, {
                    params: {
                        category_id: categoryId,
                        with_players: 'true'
                    }
                });
                setTeams(response.data);

            } catch (error) {
                console.error("Erro ao carregar equipes", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id, categoryId]);

    function handleTeamClick(team: any) {
        setSelectedTeam(team);
        setIsModalOpen(true);
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 leading-none">Equipes</h1>
                    <p className="text-xs text-gray-500 mt-1">{champName || 'Carregando...'}</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : teams.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 uppercase font-black text-xs tracking-widest">Nenhuma equipe inscrita nesta categoria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {teams.map((team) => (
                            <button
                                key={team.id}
                                onClick={() => handleTeamClick(team)}
                                className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-xl hover:border-indigo-100 transition-all group active:scale-95"
                            >
                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center overflow-hidden border-2 border-slate-50 mb-4 group-hover:scale-110 transition-transform shadow-inner">
                                    {team.logo_url || team.logo ? (
                                        <img src={team.logo_url || team.logo} alt={team.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-2xl font-black text-slate-300 uppercase italic">{team.name?.substring(0, 2)}</span>
                                    )}
                                </div>
                                <h3 className="font-black text-slate-800 uppercase italic tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">{team.name}</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 bg-slate-50 px-3 py-1 rounded-full group-hover:bg-indigo-50 group-hover:text-indigo-400 transition-all">Ver Elenco</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Team Players Modal */}
            <TeamPlayersModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                teamName={selectedTeam?.name || ''}
                teamLogo={selectedTeam?.logo_url || selectedTeam?.logo}
                players={selectedTeam?.players || []}
            />
        </div>
    );
}
