
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import api from '../../services/api';

export function EventParticipants() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [champName, setChampName] = useState('');

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const champRes = await api.get(`/championships/${id}`);
                setChampName(champRes.data.name);

                const response = await api.get(`/championships/${id}/teams`);
                setTeams(response.data);

            } catch (error) {
                console.error("Erro ao carregar equipes", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id]);

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

            <div className="max-w-4xl mx-auto p-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : teams.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Nenhuma equipe inscrita.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {teams.map((team) => (
                            <div key={team.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-all">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-100 mb-3">
                                    {team.logo ? (
                                        <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-bold text-gray-400">{team.name?.substring(0, 2)}</span>
                                    )}
                                </div>
                                <h3 className="font-bold text-gray-800 leading-snug">{team.name}</h3>
                                <p className="text-xs text-gray-500 mt-1">{team.city || 'Cidade não inf.'}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
