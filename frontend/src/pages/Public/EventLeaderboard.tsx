
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../services/api';

export function EventLeaderboard() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('category_id');
    const navigate = useNavigate();

    const [standings, setStandings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [champName, setChampName] = useState('');

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                // Fetch championship info
                const champRes = await api.get(`/championships/${id}`);
                setChampName(champRes.data.name);

                // Fetch standings
                // Endpoint hypothesis: /championships/:id/standings?category_id=X
                const response = await api.get(`/championships/${id}/standings${categoryId ? `?category_id=${categoryId}` : ''}`);
                setStandings(response.data);

            } catch (error) {
                console.error("Erro ao carregar classificação", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id, categoryId]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 leading-none">Classificação</h1>
                    <p className="text-xs text-gray-500 mt-1">{champName || 'Carregando...'}</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : standings.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                        <p className="text-gray-500">Classificação não disponível.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 font-bold">#</th>
                                        <th className="px-4 py-3 font-bold w-full">Time</th>
                                        <th className="px-4 py-3 font-bold text-center" title="Pontos">P</th>
                                        <th className="px-4 py-3 font-bold text-center" title="Jogos">J</th>
                                        <th className="px-4 py-3 font-bold text-center" title="Vitórias">V</th>
                                        <th className="px-4 py-3 font-bold text-center hidden sm:table-cell" title="Empates">E</th>
                                        <th className="px-4 py-3 font-bold text-center hidden sm:table-cell" title="Derrotas">D</th>
                                        <th className="px-4 py-3 font-bold text-center hidden sm:table-cell" title="Saldo de Gols">SG</th>
                                    </tr>
                                </thead>
                                <tbody>

                                    {standings.map((team, index) => {
                                        // Check if we need to render a Group Header
                                        const showGroupHeader = index === 0 || team.group_name !== standings[index - 1].group_name;

                                        return (
                                            <>
                                                {showGroupHeader && team.group_name && team.group_name !== 'Geral' && (
                                                    <tr className="bg-gray-100">
                                                        <td colSpan={8} className="px-4 py-2 font-bold text-gray-700 text-xs uppercase tracking-wider">
                                                            {team.group_name}
                                                        </td>
                                                    </tr>
                                                )}
                                                <tr key={team.id || index} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${index < 4 ? 'bg-indigo-50/10' : ''}`}>
                                                    <td className="px-4 py-3 font-bold text-gray-500">
                                                        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs ${team.position === 1 ? 'bg-yellow-100 text-yellow-700' :
                                                            team.position === 2 ? 'bg-gray-100 text-gray-700' :
                                                                team.position === 3 ? 'bg-orange-100 text-orange-800' : ''
                                                            }`}>
                                                            {team.position}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            {team.team_logo && <img src={team.team_logo} alt="" className="w-6 h-6 rounded-full object-cover bg-gray-100" />}
                                                            <span className="font-bold text-gray-800">{team.team_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-black text-center text-indigo-900">{team.points}</td>
                                                    <td className="px-4 py-3 text-center text-gray-600">{team.played}</td>
                                                    <td className="px-4 py-3 text-center text-gray-600">{team.won}</td>
                                                    <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{team.drawn}</td>
                                                    <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{team.lost}</td>
                                                    <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{team.goal_difference}</td>
                                                </tr>
                                            </>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
