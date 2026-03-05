import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import { TournamentBracket } from '../../components/TournamentBracket';
import type { BracketMatch } from '../../components/TournamentBracket';
import { TeamPlayersModal } from '../../components/TeamPlayersModal';

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
    goals_for: number;
    goals_against: number;
    group_name?: string;
}

export function EventLeaderboard() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('category_id');
    const navigate = useNavigate();

    const [standings, setStandings] = useState<Standing[]>([]);
    const [knockoutMatches, setKnockoutMatches] = useState<BracketMatch[]>([]);
    const [championshipFormat, setChampionshipFormat] = useState('league');
    const [loading, setLoading] = useState(true);

    const [champ, setChamp] = useState<any>(null);
    const [champName, setChampName] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<any>(null);
    const [isFetchingTeam, setIsFetchingTeam] = useState(false);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const champRes = await api.get(`/championships/${id}`);
                setChamp(champRes.data);
                setChampName(champRes.data.name);
                const format = champRes.data.format || 'league';
                setChampionshipFormat(format);

                // Load Bracket if applicable
                if (['knockout', 'group_knockout'].includes(format)) {
                    const matchesRes = await api.get(`/championships/${id}/knockout-bracket${categoryId ? `?category_id=${categoryId}` : ''}`);
                    setKnockoutMatches(matchesRes.data);
                }

                // Always try to load standings if there's any chance they exist
                const response = await api.get(`/championships/${id}/leaderboard${categoryId ? `?category_id=${categoryId}` : ''}`);
                setStandings(response.data);
            } catch (error) {
                console.error("Erro ao carregar classificação", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id, categoryId]);

    async function handleTeamClick(teamId: number, teamName: string, teamLogo?: string) {
        setIsFetchingTeam(true);
        try {
            const response = await api.get(`/championships/${id}/teams`, {
                params: {
                    team_id: teamId,
                    with_players: 'true'
                }
            });

            if (response.data && response.data.length > 0) {
                setSelectedTeam(response.data[0]);
                setIsModalOpen(true);
            }
        } catch (error) {
            console.error("Erro ao carregar modal do time", error);
        } finally {
            setIsFetchingTeam(false);
        }
    }

    const renderLeagueTable = (data: Standing[] = standings) => {
        const sport = champ?.sport?.name?.toLowerCase() || 'futebol';
        const isBasquete = sport.includes('basquete');
        const isVolei = sport.includes('volei');

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 font-bold">#</th>
                                <th className="px-4 py-3 font-bold w-full">Time</th>
                                <th className="px-3 py-3 font-bold text-center" title="Pontos">P</th>
                                <th className="px-3 py-3 font-bold text-center" title="Jogos">J</th>
                                <th className="px-3 py-3 font-bold text-center" title="Vitórias">V</th>
                                {!isBasquete && !isVolei && (
                                    <th className="px-3 py-3 font-bold text-center hidden sm:table-cell" title="Empates">E</th>
                                )}
                                <th className="px-3 py-3 font-bold text-center hidden sm:table-cell" title="Derrotas">D</th>
                                <th className="px-3 py-3 font-bold text-center hidden md:table-cell" title={isBasquete ? "Pontos Pró" : (isVolei ? "Sets Pró" : "Gols Pró")}>
                                    {isBasquete ? "PF" : (isVolei ? "SP" : "GP")}
                                </th>
                                <th className="px-3 py-3 font-bold text-center hidden md:table-cell" title={isBasquete ? "Pontos Contra" : (isVolei ? "Sets Contra" : "Gols Contra")}>
                                    {isBasquete ? "PC" : (isVolei ? "SC" : "GC")}
                                </th>
                                <th className="px-3 py-3 font-bold text-center hidden sm:table-cell" title={isBasquete ? "Saldo de Pontos" : (isVolei ? "Saldo de Sets" : "Saldo de Gols")}>
                                    {isBasquete ? "SP" : (isVolei ? "SS" : "SG")}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((team, index) => (
                                <tr key={team.id || index} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${index < 4 ? 'bg-indigo-50/10' : ''}`}>
                                    <td className="px-4 py-3 font-bold text-gray-500">
                                        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${getMedalClass(team.position)}`}>
                                            {team.position}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleTeamClick(team.id, team.team_name, team.team_logo)}
                                            className="flex items-center gap-3 hover:text-indigo-600 transition-colors text-left"
                                        >
                                            {team.team_logo && <img src={team.team_logo} alt="" className="w-6 h-6 rounded-full object-cover bg-gray-100" />}
                                            <span className="font-bold text-gray-800">{team.team_name}</span>
                                        </button>
                                    </td>
                                    <td className="px-3 py-3 font-black text-center text-indigo-900">{team.points}</td>
                                    <td className="px-3 py-3 text-center text-gray-600">{team.played}</td>
                                    <td className="px-3 py-3 text-center text-gray-600">{team.won}</td>
                                    {!isBasquete && !isVolei && (
                                        <td className="px-3 py-3 text-center text-gray-600 hidden sm:table-cell">{team.drawn}</td>
                                    )}
                                    <td className="px-3 py-3 text-center text-gray-600 hidden sm:table-cell">{team.lost}</td>
                                    <td className="px-3 py-3 text-center text-gray-600 hidden md:table-cell">{team.goals_for}</td>
                                    <td className="px-3 py-3 text-center text-gray-600 hidden md:table-cell">{team.goals_against}</td>
                                    <td className="px-3 py-3 text-center text-gray-600 hidden sm:table-cell">{team.goal_difference}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

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
                {Object.entries(groups).sort().map(([groupName, teams]) => (
                    <div key={groupName} className="space-y-3">
                        <div className="flex items-center gap-3 px-2">
                            <div className="h-6 w-1 rounded-full bg-indigo-600" />
                            <h3 className="font-black text-gray-900 text-base uppercase tracking-tight">{groupName}</h3>
                        </div>
                        {renderLeagueTable(teams)}
                    </div>
                ))}
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
                    <h1 translate="no" className="text-xl font-bold text-gray-800 leading-none">Classificação</h1>
                    <p className="text-xs text-gray-500 mt-1">{champName || 'Carregando...'}</p>
                </div>
                {isFetchingTeam && (
                    <div className="ml-auto animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                )}
            </div>

            <div className="max-w-6xl mx-auto p-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <>
                        {/* Show Standings Table if we have data, regardless of format name */}
                        {standings.length > 0 && (
                            <div className="mb-8">
                                {(['groups', 'group_knockout'].includes(championshipFormat) || standings.some(s => s.group_name && s.group_name !== 'Geral')) ? (
                                    <>
                                        <h3 className="text-xl font-bold text-gray-800 mb-4 px-2 border-l-4 border-indigo-600">
                                            {championshipFormat === 'group_knockout' ? 'Fase de Grupos' : 'Classificação'}
                                        </h3>
                                        {renderGroupStage()}
                                    </>
                                ) : (
                                    renderLeagueTable()
                                )}
                            </div>
                        )}

                        {/* PONTOS CORRIDOS (LEAGUE / RUNNING_POINTS / RACING) - Fallback if no standings */}
                        {['league', 'racing', 'running_points'].includes(championshipFormat) && standings.length === 0 && (
                            <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                                <p className="text-gray-500">Classificação não disponível.</p>
                            </div>
                        )}

                        {/* FASE DE GRUPOS (GROUPS / GROUP_KNOCKOUT) */}
                        {['groups', 'group_knockout'].includes(championshipFormat) && (
                            <>
                                {standings.length === 0 && (
                                    <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
                                        <p className="text-gray-500">Fase de Grupos ainda não iniciada ou sem times.</p>
                                    </div>
                                )}

                                {/* Somente mostra Mata-Mata se for Group_Knockout */}
                                {championshipFormat === 'group_knockout' && (
                                    <div className="mt-12">
                                        <h3 className="text-xl font-bold text-gray-800 mb-4 px-2 border-l-4 border-indigo-600">Fase Final (Mata-mata)</h3>
                                        {knockoutMatches.length > 0 ? (
                                            <TournamentBracket matches={knockoutMatches} />
                                        ) : (
                                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <span className="text-3xl">🏆</span>
                                                </div>
                                                <h4 className="text-lg font-bold text-gray-800 mb-2">Chaveamento Indefinido</h4>
                                                <p className="text-gray-500 max-w-sm mx-auto">
                                                    O chaveamento da fase final será gerado automaticamente após o término da fase de grupos.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </>
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
