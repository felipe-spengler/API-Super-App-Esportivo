import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Trophy, Loader2 } from 'lucide-react';
import api from '../../services/api';

interface Player {
    id: number;
    name: string;
    position: string;
    number: string;
}

interface Championship {
    id: number;
    name: string;
    status: string;
}

interface Team {
    id: number;
    name: string;
    city: string;
    logo_url?: string;
    primary_color?: string;
    players: Player[];
    championships: Championship[];
}

export function TeamDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [team, setTeam] = useState<Team | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/admin/teams/${id}`)
            .then(response => setTeam(response.data))
            .catch(error => console.error("Erro ao carregar time:", error))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!team) {
        return <div className="text-center p-8">Time não encontrado</div>;
    }

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/admin/teams')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-800">Detalhes da equipe</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-6">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center border-2 border-indigo-100 overflow-hidden">
                    {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                    ) : (
                        <Shield className="w-10 h-10 text-indigo-300" />
                    )}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-900">{team.name}</h2>
                    <p className="text-gray-500">{team.city || 'Cidade não informada'}</p>
                    <div className="flex gap-2 mt-2">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
                            {team.players.length} Jogadores
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Elenco */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-gray-900">Elenco Atual</h3>
                    </div>

                    <div className="space-y-3">
                        {team.players.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">Nenhum jogador cadastrado</p>
                        ) : (
                            team.players.map(player => (
                                <div key={player.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-50 hover:border-gray-100 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
                                            {player.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{player.name}</p>
                                            <p className="text-xs text-gray-500">{player.position}</p>
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold text-gray-400">
                                        #{player.number || '-'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Campeonatos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <h3 className="font-bold text-gray-900">Campeonatos</h3>
                    </div>

                    <div className="space-y-3">
                        {team.championships.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">Nenhuma participação recente</p>
                        ) : (
                            team.championships.map(camp => (
                                <div key={camp.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-sm font-medium text-gray-700">{camp.name}</span>
                                    <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">
                                        {camp.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
