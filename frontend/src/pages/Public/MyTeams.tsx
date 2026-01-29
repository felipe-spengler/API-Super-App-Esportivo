import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Shield, UserPlus, MoreHorizontal, Loader2 } from 'lucide-react';
import api from '../../services/api';

interface Team {
    id: number;
    name: string;
    city?: string;
    role?: 'captain' | 'player';
    club?: { name: string };
    players_count?: number; // Need to count in backend or just show icon
}

export function MyTeams() {
    const navigate = useNavigate();
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTeams();
    }, []);

    async function loadTeams() {
        try {
            const response = await api.get('/my-teams');
            setTeams(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
                <div className="flex items-center">
                    <button onClick={() => navigate('/profile')} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">Meus Times</h1>
                </div>
                <button
                    onClick={() => navigate('/profile/teams/new')}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg flex items-center gap-1 text-xs font-bold hover:bg-indigo-100"
                >
                    <UserPlus className="w-4 h-4" /> Criar Time
                </button>
            </div>

            <div className="max-w-lg mx-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                ) : teams.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">Você não possui times</h3>
                        <p className="text-gray-500 text-sm mt-1">Crie um time ou aguarde ser convidado.</p>
                    </div>
                ) : (
                    teams.map((team) => (
                        <div
                            key={team.id}
                            onClick={() => navigate(`/profile/teams/${team.id}`)}
                            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 overflow-hidden">
                                        <Shield className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 leading-tight">{team.name}</h3>
                                        <span className="text-xs text-gray-500 font-medium">{team.city || team.club?.name || 'Clube'}</span>
                                    </div>
                                </div>
                                <button className="text-gray-400 hover:text-gray-600">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${team.role === 'captain' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>
                                        {team.role === 'captain' ? 'Capitão' : 'Atleta'}
                                    </span>
                                </div>
                                <div className="flex items-center text-xs text-gray-500 font-medium">
                                    <Users className="w-4 h-4 mr-1" />
                                    Ver elenco
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
