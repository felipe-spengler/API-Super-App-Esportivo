import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../services/api';

// Icons/Indicators for top 3
const getMedalClass = (position: number) => {
    if (position === 1) return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-md';
    if (position === 2) return 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md';
    if (position === 3) return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md';
    return '';
};

interface Standing {
    id: number;
    team_name: string;
    team_logo?: string;
    position: number;
    points: number;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goal_difference: number;
    group_name?: string;
}

interface Match {
    id: number;
    team1_name: string;
    team2_name: string;
    team1_logo?: string;
    team2_logo?: string;
    team1_score?: number;
    team2_score?: number;
    round: string; // 'final', 'semi', 'quarter', 'round_of_16'
    match_date?: string;
    winner_team_id?: number;
}

export function EventLeaderboard() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('category_id');
    const navigate = useNavigate();

    const [standings, setStandings] = useState<Standing[]>([]);
    const [knockoutMatches, setKnockoutMatches] = useState<Match[]>([]);
    const [championshipFormat, setChampionshipFormat] = useState('league');
    const [loading, setLoading] = useState(true);
    const [champName, setChampName] = useState('');

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const champRes = await api.get(`/championships/${id}`);
                setChampName(champRes.data.name);
                setChampionshipFormat(champRes.data.format || 'league');

                if (champRes.data.format === 'knockout') {
                    // Load bracket matches
                    const matchesRes = await api.get(`/championships/${id}/knockout-bracket${categoryId ? `?category_id=${categoryId}` : ''}`);
                    setKnockoutMatches(matchesRes.data);
                } else {
                    // Load standings (for league or groups)
                    const response = await api.get(`/championships/${id}/leaderboard${categoryId ? `?category_id=${categoryId}` : ''}`);
                    setStandings(response.data);
                }
            } catch (error) {
                console.error("Erro ao carregar classificação", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id, categoryId]);

    // Render functions for each format
    const renderLeagueTable = () => (
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
                        {standings.map((team, index) => (
                            <tr key={team.id || index} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${index < 4 ? 'bg-indigo-50/10' : ''}`}>
                                <td className="px-4 py-3 font-bold text-gray-500">
                                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${getMedalClass(team.position)}`}>
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
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderGroupStage = () => {
        // Group teams by group_name
        const groups: { [key: string]: Standing[] } = {};
        standings.forEach((team) => {
            const groupName = team.group_name || 'Grupo A';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push(team);
        });

        return (
            <div className="space-y-6">
                {Object.entries(groups).map(([groupName, teams]) => (
                    <div key={groupName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
                            <h3 className="font-bold text-white text-sm uppercase tracking-wide">{groupName}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-2 font-bold">#</th>
                                        <th className="px-4 py-2 font-bold text-left">Time</th>
                                        <th className="px-3 py-2 font-bold text-center" title="Pontos">P</th>
                                        <th className="px-3 py-2 font-bold text-center" title="Jogos">J</th>
                                        <th className="px-3 py-2 font-bold text-center hidden sm:table-cell" title="Vitórias">V</th>
                                        <th className="px-3 py-2 font-bold text-center hidden sm:table-cell" title="Empates">E</th>
                                        <th className="px-3 py-2 font-bold text-center hidden sm:table-cell" title="Derrotas">D</th>
                                        <th className="px-3 py-2 font-bold text-center hidden sm:table-cell" title="Saldo">SG</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teams.map((team, idx) => (
                                        <tr key={team.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-2 font-bold text-gray-600 text-center">{idx + 1}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-2">
                                                    {team.team_logo && <img src={team.team_logo} alt="" className="w-5 h-5 rounded-full object-cover" />}
                                                    <span className="font-semibold text-gray-800 text-sm">{team.team_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-center font-bold text-indigo-900">{team.points}</td>
                                            <td className="px-3 py-2 text-center text-gray-600">{team.played}</td>
                                            <td className="px-3 py-2 text-center text-gray-600 hidden sm:table-cell">{team.won}</td>
                                            <td className="px-3 py-2 text-center text-gray-600 hidden sm:table-cell">{team.drawn}</td>
                                            <td className="px-3 py-2 text-center text-gray-600 hidden sm:table-cell">{team.lost}</td>
                                            <td className="px-3 py-2 text-center text-gray-600 hidden sm:table-cell">{team.goal_difference}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderKnockoutBracket = () => {
        // Organizar partidas por rodada
        const rounds: { [key: string]: Match[] } = {
            final: [],
            semi: [],
            quarter: [],
            round_of_16: []
        };

        knockoutMatches.forEach((match) => {
            if (rounds[match.round]) {
                rounds[match.round].push(match);
            }
        });

        const roundLabels: { [key: string]: string } = {
            round_of_16: 'Oitavas',
            quarter: 'Quartas',
            semi: 'Semifinais',
            final: 'Final'
        };

        return (
            <div className="overflow-x-auto pb-6">
                <div className="min-w-[800px] flex gap-4 justify-center items-start">
                    {['round_of_16', 'quarter', 'semi', 'final'].map((roundKey) => {
                        const matchesInRound = rounds[roundKey];
                        if (!matchesInRound || matchesInRound.length === 0) return null;

                        return (
                            <div key={roundKey} className="flex flex-col gap-3">
                                <h3 className="text-sm font-bold text-center text-indigo-600 uppercase tracking-wide mb-2">
                                    {roundLabels[roundKey]}
                                </h3>
                                {matchesInRound.map((match) => (
                                    <div key={match.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden w-48">
                                        {/* Team 1 */}
                                        <div className={`flex items-center justify-between px-3 py-2 ${match.winner_team_id === match.id ? 'bg-green-50 border-l-4 border-green-500' : 'hover:bg-gray-50'}`}>
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {match.team1_logo && <img src={match.team1_logo} alt="" className="w-5 h-5 rounded-full object-cover" />}
                                                <span className="font-semibold text-gray-800 text-xs truncate">{match.team1_name}</span>
                                            </div>
                                            <span className="font-bold text-gray-900 text-sm ml-2">{match.team1_score ?? '-'}</span>
                                        </div>
                                        <div className="h-px bg-gray-200"></div>
                                        {/* Team 2 */}
                                        <div className={`flex items-center justify-between px-3 py-2 ${match.winner_team_id !== match.id && match.team2_score !== undefined && match.team2_score > (match.team1_score ?? 0) ? 'bg-green-50 border-l-4 border-green-500' : 'hover:bg-gray-50'}`}>
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                {match.team2_logo && <img src={match.team2_logo} alt="" className="w-5 h-5 rounded-full object-cover" />}
                                                <span className="font-semibold text-gray-800 text-xs truncate">{match.team2_name}</span>
                                            </div>
                                            <span className="font-bold text-gray-900 text-sm ml-2">{match.team2_score ?? '-'}</span>
                                        </div>
                                        {match.match_date && (
                                            <div className="bg-gray-50 px-3 py-1 text-center">
                                                <span className="text-[10px] text-gray-500">{new Date(match.match_date).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 leading-none">Classificação</h1>
                    <p className="text-xs text-gray-500 mt-1">{champName || 'Carregando...'}</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <>
                        {championshipFormat === 'knockout' && knockoutMatches.length === 0 && (
                            <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                                <p className="text-gray-500">Chaveamento não disponível.</p>
                            </div>
                        )}
                        {championshipFormat === 'knockout' && knockoutMatches.length > 0 && renderKnockoutBracket()}

                        {(championshipFormat === 'league' || championshipFormat === 'racing') && standings.length === 0 && (
                            <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                                <p className="text-gray-500">Classificação não disponível.</p>
                            </div>
                        )}
                        {(championshipFormat === 'league' || championshipFormat === 'racing') && standings.length > 0 && renderLeagueTable()}

                        {championshipFormat === 'group_knockout' && standings.length === 0 && (
                            <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                                <p className="text-gray-500">Classificação dos grupos não disponível.</p>
                            </div>
                        )}
                        {championshipFormat === 'group_knockout' && standings.length > 0 && renderGroupStage()}
                    </>
                )}
            </div>
        </div>
    );
}
