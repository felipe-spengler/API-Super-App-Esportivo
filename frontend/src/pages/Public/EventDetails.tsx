import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Trophy, ChevronLeft, Timer, Medal, Search, Download } from 'lucide-react';
import api from '../../services/api';

export function EventDetails() {
    const { id } = useParams();
    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview'); // overview, matches, leaderboard, stats, results

    // Data States
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [stats, setStats] = useState<any[]>([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadEventDetails();
    }, [id]);

    async function loadEventDetails() {
        setLoading(true);
        try {
            const res = await api.get(`/championships/${id}`);
            setEvent(res.data);

            // Load initial data based on type
            if (['Futebol', 'Futsal', 'Vôlei'].includes(res.data.sport?.name)) {
                loadTeamData(res.data.id);
            } else {
                loadRaceData(res.data.id);
            }

        } catch (error) {
            console.error("Erro ao carregar detalhes", error);
        } finally {
            setLoading(false);
        }
    }

    async function loadTeamData(eventId: string) {
        try {
            const [resLeaderboard, resMatches, resStats] = await Promise.all([
                api.get(`/championships/${eventId}/leaderboard`),
                api.get(`/championships/${eventId}/matches`),
                api.get(`/championships/${eventId}/stats/top-scorers`)
            ]);
            setLeaderboard(resLeaderboard.data);
            setMatches(resMatches.data);
            setStats(resStats.data);
        } catch (err) {
            console.error("Erro ao carregar dados do campeonato", err);
        }
    }

    async function loadRaceData(eventId: string) {
        try {
            const res = await api.get(`/championships/${eventId}/race-results`);
            setResults(res.data);
        } catch (err) {
            console.error("Erro ao carregar resultados da corrida", err);
        }
    }

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-900"></div></div>;
    if (!event) return <div className="min-h-screen flex items-center justify-center">Evento não encontrado</div>;

    const isRace = ['Corrida', 'Ciclismo', 'MTB', 'Natação'].includes(event.sport?.name);

    return (
        <div className="min-h-screen bg-gray-50 animate-in fade-in pb-20">
            {/* Header / Hero */}
            <div className="bg-indigo-900 relative">
                <div className="absolute inset-0 bg-black/20" />
                <div className="max-w-7xl mx-auto px-4 py-10 relative z-10">
                    <Link to="/explore" className="text-indigo-200 hover:text-white flex items-center gap-2 mb-6 transition-colors">
                        <ChevronLeft className="w-5 h-5" /> Voltar para Eventos
                    </Link>

                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                        {/* Cover Image */}
                        <div className="w-32 h-32 md:w-48 md:h-48 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-xl overflow-hidden">
                            {event.cover_image ? (
                                <img src={event.cover_image} alt={event.name} className="w-full h-full object-cover" />
                            ) : (
                                <Trophy className="w-16 h-16 text-indigo-200 opacity-50" />
                            )}
                        </div>

                        <div className="text-center md:text-left text-white space-y-4 flex-1">
                            <div className="inline-block px-3 py-1 bg-indigo-500/30 backdrop-blur rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-400/30">
                                {event.sport?.name || 'Evento'}
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tight">{event.name}</h1>

                            <div className="flex flex-wrap justify-center md:justify-start gap-6 text-indigo-100/80 text-sm md:text-base">
                                <span className="flex items-center gap-2"><Calendar className="w-5 h-5" /> {new Date(event.start_date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-2"><MapPin className="w-5 h-5" /> {event.location || 'Local a definir'}</span>
                                <span className="flex items-center gap-2"><Users className="w-5 h-5" /> {isRace ? `${results.length} Participantes` : `${leaderboard.length} Equipes`}</span>
                            </div>
                        </div>

                        <div className="shrink-0">
                            <button className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-full shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-105 active:scale-95">
                                Inscrever-se Agora
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm overflow-x-auto">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex space-x-8">
                        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Visão Geral" />
                        {!isRace && (
                            <>
                                <TabButton active={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} label="Classificação" />
                                <TabButton active={activeTab === 'matches'} onClick={() => setActiveTab('matches')} label="Jogos" />
                                <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} label="Estatísticas" />
                            </>
                        )}
                        {isRace && (
                            <TabButton active={activeTab === 'results'} onClick={() => setActiveTab('results')} label="Resultados" />
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 py-8">

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-8">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Sobre o Evento</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {event.description || "Descrição detalhada do evento, regras e informações adicionais ainda não foram disponibilizadas pela organização."}
                                </p>
                            </div>

                            {!isRace && matches.length > 0 && (
                                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">Próximos Jogos</h3>
                                    <div className="space-y-4">
                                        {matches.filter(m => m.status !== 'finished').slice(0, 3).map(match => (
                                            <MatchCard key={match.id} match={match} />
                                        ))}
                                        {matches.filter(m => m.status !== 'finished').length === 0 && <p className="text-gray-500">Nenhum jogo agendado.</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-4">Status</h3>
                                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl">
                                    <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                                    <span className="font-medium">Inscrições Abertas</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* LEADERBOARD TAB (Teams) */}
                {activeTab === 'leaderboard' && (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="px-6 py-4">Pos</th>
                                        <th className="px-6 py-4">Equipe</th>
                                        <th className="px-6 py-4 text-center">P</th>
                                        <th className="px-6 py-4 text-center">J</th>
                                        <th className="px-6 py-4 text-center">V</th>
                                        <th className="px-6 py-4 text-center">E</th>
                                        <th className="px-6 py-4 text-center">D</th>
                                        <th className="px-6 py-4 text-center">SG</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {leaderboard.map((team: any, index: number) => (
                                        <tr key={team.id} className="hover:bg-gray-50/50">
                                            <td className="px-6 py-4 font-bold text-gray-400">#{index + 1}</td>
                                            <td className="px-6 py-4 font-bold text-gray-900">{team.name}</td>
                                            <td className="px-6 py-4 text-center font-bold text-indigo-600 bg-indigo-50/30">{team.stats.points}</td>
                                            <td className="px-6 py-4 text-center">{team.stats.played}</td>
                                            <td className="px-6 py-4 text-center text-emerald-600">{team.stats.wins}</td>
                                            <td className="px-6 py-4 text-center text-gray-400">{team.stats.draws}</td>
                                            <td className="px-6 py-4 text-center text-red-500">{team.stats.losses}</td>
                                            <td className="px-6 py-4 text-center font-medium">{team.stats.goals_for - team.stats.goals_against}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* RESULTS TAB (Race) */}
                {activeTab === 'results' && (
                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar atleta ou número..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 flex items-center gap-2 font-medium">
                                <Download className="w-4 h-4" /> Exportar
                            </button>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 uppercase font-bold text-xs">
                                    <tr>
                                        <th className="px-6 py-4">Pos</th>
                                        <th className="px-6 py-4">Atleta</th>
                                        <th className="px-6 py-4">Número</th>
                                        <th className="px-6 py-4">Categoria</th>
                                        <th className="px-6 py-4 text-right">Tempo Líquido</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {results
                                        .filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.bib_number?.toString().includes(searchTerm))
                                        .map((res: any, index: number) => (
                                            <tr key={res.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4">
                                                    {index < 3 ? (
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold
                                       ${index === 0 ? 'bg-yellow-400 shadow-yellow-200' : index === 1 ? 'bg-gray-300' : 'bg-orange-400'}`}>
                                                            {index + 1}
                                                        </div>
                                                    ) : (
                                                        <span className="font-bold text-gray-400 ml-2">#{index + 1}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900">{res.name}</div>
                                                    <div className="text-xs text-gray-500">{res.team || 'Avulso'}</div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-gray-500">{res.bib_number}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">{res.category}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-indigo-600">
                                                    {res.net_time}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                            {results.length === 0 && (
                                <div className="p-12 text-center text-gray-400">
                                    Nenhum resultado encontrado.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MATCHES/GAMES TAB */}
                {activeTab === 'matches' && (
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {matches.length > 0 ? matches.map(match => (
                            <MatchCard key={match.id} match={match} />
                        )) : (
                            <div className="text-center py-12 text-gray-500">Nenhuma partida encontrada para este campeonato.</div>
                        )}
                    </div>
                )}

                {/* STATS TAB */}
                {activeTab === 'stats' && (
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Medal className="w-5 h-5 text-yellow-500" /> Artilheiros / Destaques</h3>
                        <div className="space-y-4">
                            {stats.map((stat: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="text-2xl font-black text-gray-300 w-8">{index + 1}</div>
                                        <div>
                                            <p className="font-bold text-gray-900">{stat.player_name}</p>
                                            <p className="text-xs text-gray-500">{stat.team_name}</p>
                                        </div>
                                    </div>
                                    <div className="text-xl font-black text-indigo-600">{stat.value}</div>
                                </div>
                            ))}
                            {stats.length === 0 && <p className="text-gray-500">Nenhuma estatística disponível.</p>}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`py-4 text-sm font-bold border-b-2 transition-all ${active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-indigo-900 hover:border-gray-200'}`}
        >
            {label}
        </button>
    );
}

function MatchCard({ match }: { match: any }) {
    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 flex-1 justify-end">
                <span className="font-bold text-gray-900 text-right">{match.home_team?.name}</span>
                <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
            </div>
            <div className="mx-6 text-center">
                {match.status === 'finished' ? (
                    <div className="text-2xl font-black text-gray-900 tracking-widest bg-gray-100 px-3 py-1 rounded-lg">
                        {match.home_score} - {match.away_score}
                    </div>
                ) : (
                    <div className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">
                        {new Date(match.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-4 flex-1 justify-start">
                <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
                <span className="font-bold text-gray-900">{match.away_team?.name}</span>
            </div>
        </div>
    )
}
