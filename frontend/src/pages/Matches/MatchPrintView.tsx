import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { Printer, Loader2 } from 'lucide-react';

export function MatchPrintView() {
    const { id } = useParams();
    const [match, setMatch] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadMatch();
    }, [id]);

    const loadMatch = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/public/matches/${id}/full-details`);
            const data = response.data;
            if (data.match) {
                setMatch(data.match);
                setRosters(data.rosters || { home: [], away: [] });

                const history = (data.details?.events || []).map((e: any) => ({
                    ...e,
                    team_id: parseInt(e.team_id),
                    player_id: e.player_id ? parseInt(e.player_id) : null
                }));
                setEvents(history);
            }
        } catch (error) {
            console.error("Erro ao carregar súmula", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    if (!match) return <div className="p-10 text-center">Partida não encontrada.</div>;

    // Helper Components for the "Classic" Look
    const EditableSpan = ({ text, placeholder = '...' }: { text?: string, placeholder?: string }) => (
        <span
            contentEditable
            suppressContentEditableWarning
            className="print:bg-transparent bg-yellow-50 hover:bg-yellow-100 px-1 min-w-[20px] inline-block border-b border-gray-300 print:border-none outline-none focus:bg-white transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
            data-placeholder={placeholder}
        >
            {text}
        </span>
    );

    const TeamBlock = ({ team, players, teamSide }: { team: any, players: any[], teamSide: 'home' | 'away' }) => {
        const teamEvents = events.filter(e => e.team_id === team.id);
        const teamGoals = teamEvents.filter(e => e.type === 'goal');
        const teamFouls = teamEvents.filter(e => e.type === 'foul'); // Assuming 'foul' type exists or just mocking visualization

        // Mocking 20 rows for players like the legacy system
        const rows = Array.from({ length: 20 }, (_, i) => {
            const player = players[i];
            return {
                idx: i + 1,
                player: player,
                hasYellow: teamEvents.some(e => (e.type === 'yellow_card' || e.type === 'yellow') && e.player_id === player?.id),
                hasRed: teamEvents.some(e => (e.type === 'red_card' || e.type === 'red') && e.player_id === player?.id),
                goals: teamGoals.filter(e => e.player_id === player?.id).length
            };
        });

        // 1st Period Fouls (Mock visual)
        const foulsPeriod1 = teamFouls.filter(e => e.period === '1º Tempo').length;
        const foulsPeriod2 = teamFouls.filter(e => e.period === '2º Tempo').length;

        return (
            <div className="mb-8 break-inside-avoid">
                {/* Team Header */}
                <div className="border border-black bg-gray-100 font-bold p-1 text-lg uppercase text-center mb-1">
                    {team.name}
                </div>

                <div className="flex gap-2">
                    {/* Left: Players Table */}
                    <div className="w-[70%]">
                        <table className="w-full text-xs border-collapse border border-black">
                            <thead className="bg-gray-200 text-center font-bold">
                                <tr>
                                    <th className="border border-black w-8">Nº</th>
                                    <th className="border border-black text-left px-2">Nome</th>
                                    <th className="border border-black w-8">Camisa</th>
                                    <th className="border border-black w-24">Faltas</th>
                                    <th className="border border-black w-6">A</th>
                                    <th className="border border-black w-6">V</th>
                                    <th className="border border-black w-6">Gols</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.idx} className="h-6">
                                        <td className="border border-black text-center">{row.idx}</td>
                                        <td className="border border-black px-1 font-medium">
                                            {row.player ? row.player.name : <EditableSpan />}
                                        </td>
                                        <td className="border border-black text-center">
                                            {row.player ? row.player.number : <EditableSpan />}
                                        </td>
                                        <td className="border border-black text-center text-[8px] text-gray-400 tracking-widest leading-none pt-1">
                                            1 2 3 4 5
                                        </td>
                                        <td className="border border-black text-center font-bold">
                                            {row.hasYellow ? 'X' : ''}
                                        </td>
                                        <td className="border border-black text-center font-bold">
                                            {row.hasRed ? 'X' : ''}
                                        </td>
                                        <td className="border border-black text-center">
                                            {row.goals > 0 ? row.goals : ''}
                                        </td>
                                    </tr>
                                ))}
                                {/* Staff Rows */}
                                <tr className="h-6">
                                    <td colSpan={2} className="border border-black px-1 font-bold bg-gray-50">Técnico: <EditableSpan /></td>
                                    <td colSpan={5} className="border border-black bg-gray-50"></td>
                                </tr>
                                <tr className="h-6">
                                    <td colSpan={2} className="border border-black px-1 font-bold bg-gray-50">Auxiliar: <EditableSpan /></td>
                                    <td colSpan={5} className="border border-black bg-gray-50"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Right: Stats (Fouls, Goals, Subs) */}
                    <div className="w-[30%] flex flex-col gap-2">

                        {/* Fouls Accumulated */}
                        <table className="w-full text-xs border-collapse border border-black text-center">
                            <tbody>
                                <tr>
                                    <td colSpan={6} className="bg-gray-200 font-bold border border-black">Faltas Acumuladas</td>
                                </tr>
                                <tr>
                                    <td className="font-bold border border-black w-14">1º P</td>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <td key={n} className="border border-black w-6">{foulsPeriod1 >= n ? 'X' : ''}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="font-bold border border-black">2º P</td>
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <td key={n} className="border border-black w-6">{foulsPeriod2 >= n ? 'X' : ''}</td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>

                        {/* Timeouts */}
                        <table className="w-full text-xs border-collapse border border-black text-center">
                            <tbody>
                                <tr>
                                    <td colSpan={2} className="bg-gray-200 font-bold border border-black">Pedidos de Tempo</td>
                                </tr>
                                <tr>
                                    <td className="border border-black w-1/2">1º P</td>
                                    <td className="border border-black w-1/2">2º P</td>
                                </tr>
                                <tr className="h-6">
                                    <td className="border border-black"><EditableSpan text=":" /></td>
                                    <td className="border border-black"><EditableSpan text=":" /></td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Substitutions */}
                        <table className="w-full text-xs border-collapse border border-black text-center">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="border border-black">Substituições</th>
                                    {[1, 2, 3, 4, 5].map(n => <th key={n} className="border border-black w-5">{n}º</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="h-6">
                                    <td className="border border-black font-bold text-left px-1">Entrou</td>
                                    {[1, 2, 3, 4, 5].map(n => <td key={n} className="border border-black"><EditableSpan /></td>)}
                                </tr>
                                <tr className="h-6">
                                    <td className="border border-black font-bold text-left px-1">Saiu</td>
                                    {[1, 2, 3, 4, 5].map(n => <td key={n} className="border border-black"><EditableSpan /></td>)}
                                </tr>
                            </tbody>
                        </table>

                        {/* Goals Grid - Replicating classic grid look */}
                        <table className="w-full text-xs border-collapse border border-black text-center">
                            <tbody>
                                <tr><td colSpan={5} className="bg-gray-200 font-bold border border-black">GOLS</td></tr>
                                {Array.from({ length: 4 }).map((_, rowsIs) => (
                                    <tr key={rowsIs} className="h-8">
                                        {Array.from({ length: 5 }).map((_, colIdx) => {
                                            const goalIdx = (rowsIs * 5) + colIdx;
                                            const goal = teamGoals[goalIdx];
                                            return (
                                                <td key={colIdx} className="border border-black relative align-top">
                                                    <span className="absolute bg-gray-200 text-[8px] top-0 left-0 px-0.5 border-r border-b border-gray-300">
                                                        {goalIdx + 1}
                                                    </span>
                                                    {goal ? (
                                                        <div className="pt-2">
                                                            <div className="font-bold text-sm">{goal.player?.number || '#'}</div>
                                                            <div className="text-[9px] leading-none">{goal.minute}'</div>
                                                        </div>
                                                    ) : (
                                                        <div className="pt-3">
                                                            <EditableSpan text="" />
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white text-black min-h-screen p-4 font-sans max-w-[210mm] mx-auto print:max-w-none print:m-0 print:p-0">
            <style>
                {`
                    @media print {
                        @page { size: A4; margin: 10mm; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .no-print { display: none !important; }
                        /* Ensure background colors print */
                        td, th { border-color: black !important; }
                    }
                    .editable-placeholder:empty:before {
                        content: attr(data-placeholder);
                        color: #ccc;
                    }
                `}
            </style>

            {/* Controls */}
            <div className="no-print mb-4 flex gap-2 justify-end">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    <Printer size={16} /> Imprimir Súmula
                </button>
            </div>

            {/* Header / Info Block */}
            <div className="mb-4">
                <table className="w-full text-sm border-collapse border border-black mb-2">
                    <tbody>
                        <tr>
                            <td className="border border-black p-1 w-[80%]"><b>Competição:</b> {match.championship?.name}</td>
                            <td className="border border-black p-1"><b>Jogo Nº:</b> {match.id}</td>
                        </tr>
                    </tbody>
                </table>
                <table className="w-full text-sm border-collapse border border-black mb-2">
                    <tbody>
                        <tr>
                            <td className="border border-black p-1 w-[40%]"><b>Categoria:</b> {match.championship?.sport?.name || 'Esporte'}</td>
                            <td className="border border-black p-1 w-[30%]"><b>Fase:</b> {match.phase || 'Fase Única'}</td>
                            <td className="border border-black p-1 w-[30%]"><b>Rodada:</b> {match.round_name || '-'}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Scoreboard */}
                <table className="w-full text-lg border-collapse border border-black mb-4">
                    <tbody>
                        <tr>
                            <td className="border border-black p-2 font-bold text-right w-[40%]">{match.home_team?.name}</td>
                            <td className="border border-black p-2 font-bold text-center w-[10%] text-2xl bg-gray-50">{match.home_score ?? ''}</td>
                            <td className="border border-black p-2 font-bold text-center w-[5%] text-xl">X</td>
                            <td className="border border-black p-2 font-bold text-center w-[10%] text-2xl bg-gray-50">{match.away_score ?? ''}</td>
                            <td className="border border-black p-2 font-bold text-left w-[40%]">{match.away_team?.name}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Logistics */}
                <div className="flex gap-2 mb-4">
                    <div className="flex-1">
                        <table className="w-full text-sm border-collapse border border-black">
                            <tbody>
                                <tr>
                                    <td className="border border-black p-1">
                                        <b>Local:</b> <EditableSpan text={match.location} />
                                    </td>
                                    <td className="border border-black p-1 w-[30%]">
                                        <b>Data:</b> <EditableSpan text={match.start_time ? new Date(match.start_time).toLocaleDateString() : ''} />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-1" colSpan={2}>
                                        <b>Arbitragem:</b> <EditableSpan
                                            text={match.match_details?.arbitration?.referee}
                                            placeholder="Nome do Árbitro"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-black p-1" colSpan={2}>
                                        <b>Auxiliares:</b> <EditableSpan
                                            text={[
                                                match.match_details?.arbitration?.assistant1,
                                                match.match_details?.arbitration?.assistant2
                                            ].filter(Boolean).join(' / ')}
                                            placeholder="Nome dos Auxiliares"
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="w-[30%]">
                        <table className="w-full text-xs border-collapse border border-black text-center">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="border border-black">Cronômetro</th>
                                    <th className="border border-black">Início</th>
                                    <th className="border border-black">Fim</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-black font-bold">1º Período</td>
                                    <td className="border border-black"><EditableSpan text="" /></td>
                                    <td className="border border-black"><EditableSpan text="" /></td>
                                </tr>
                                <tr>
                                    <td className="border border-black font-bold">2º Período</td>
                                    <td className="border border-black"><EditableSpan text="" /></td>
                                    <td className="border border-black"><EditableSpan text="" /></td>
                                </tr>
                                <tr>
                                    <td className="border border-black font-bold">Extra</td>
                                    <td className="border border-black"><EditableSpan text="" /></td>
                                    <td className="border border-black"><EditableSpan text="" /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Teams Block */}
            <TeamBlock team={match.home_team || { name: 'Time Mandante' }} players={rosters.home} teamSide="home" />

            {/* Spacing for cut if needed */}
            <div className="border-t-2 border-dashed border-gray-400 my-4 no-print relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs text-gray-500">Corte Aqui (Opcional)</span>
            </div>

            <TeamBlock team={match.away_team || { name: 'Time Visitante' }} players={rosters.away} teamSide="away" />

            {/* Signatures */}
            <div className="mt-8 pt-4 border-t border-black break-inside-avoid">
                <div className="grid grid-cols-3 gap-8 text-center text-xs">
                    <div className="flex flex-col gap-1 items-center">
                        <div className="w-full border-b border-black h-8"></div>
                        <span>Árbitro Principal</span>
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                        <div className="w-full border-b border-black h-8"></div>
                        <span>Capitão {match.home_team?.name}</span>
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                        <div className="w-full border-b border-black h-8"></div>
                        <span>Capitão {match.away_team?.name}</span>
                    </div>
                </div>
            </div>

            {/* Observações */}
            <div className="mt-4 border border-black p-2 h-24 text-xs">
                <b>Observações da Partida:</b>
                <div contentEditable className="w-full h-full outline-none mt-1"></div>
            </div>
        </div>
    );
}
