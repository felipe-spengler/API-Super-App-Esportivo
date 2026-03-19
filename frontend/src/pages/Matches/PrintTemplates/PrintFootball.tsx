import React from 'react';
import { EditableSpan } from './PrintBase';

export const PrintFootball = ({ match, rosters, events }: { match: any, rosters: any, events: any[] }) => {
    const TeamBlock = ({ team, players }: { team: any, players: any[] }) => {
        const teamEvents = events.filter((e: any) => e.team_id === team.id);
        const teamGoals = teamEvents.filter((e: any) => e.type === 'goal');
        const teamFouls = teamEvents.filter((e: any) => e.type === 'foul');
        
        const rows = Array.from({ length: 20 }, (_, i) => {
            const player = players[i];
            return {
                idx: i + 1,
                player,
                hasYellow: teamEvents.some(e => ['yellow_card', 'yellow'].includes(e.type) && e.player_id === player?.id),
                hasRed: teamEvents.some(e => ['red_card', 'red'].includes(e.type) && e.player_id === player?.id),
                goals: teamGoals.filter(e => e.player_id === player?.id).length
            };
        });

        const foulsPeriod1 = teamFouls.filter(e => e.period === '1º Tempo').length;
        const foulsPeriod2 = teamFouls.filter(e => e.period === '2º Tempo').length;

        return (
            <div className="mb-8 break-inside-avoid">
                <div className="border border-black bg-gray-100 font-bold p-1 text-lg uppercase text-center mb-1">
                    {team.name}
                </div>
                <div className="flex gap-2">
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
                                            {row.player ? (row.player.nickname || row.player.name) : <EditableSpan />}
                                        </td>
                                        <td className="border border-black text-center">
                                            {row.player ? row.player.number : <EditableSpan />}
                                        </td>
                                        <td className="border border-black text-center text-[8px] text-gray-400 tracking-widest leading-none pt-1">
                                            1 2 3 4 5
                                        </td>
                                        <td className="border border-black text-center font-bold">{row.hasYellow ? 'X' : ''}</td>
                                        <td className="border border-black text-center font-bold">{row.hasRed ? 'X' : ''}</td>
                                        <td className="border border-black text-center">{row.goals > 0 ? row.goals : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="w-[30%] flex flex-col gap-2">
                        <table className="w-full text-xs border-collapse border border-black text-center">
                            <tbody>
                                <tr><td colSpan={6} className="bg-gray-200 font-bold border border-black">Faltas Acumuladas</td></tr>
                                <tr>
                                    <td className="font-bold border border-black w-14">1º P</td>
                                    {[1, 2, 3, 4, 5].map(n => <td key={n} className="border border-black w-6">{foulsPeriod1 >= n ? 'X' : ''}</td>)}
                                </tr>
                                <tr>
                                    <td className="font-bold border border-black">2º P</td>
                                    {[1, 2, 3, 4, 5].map(n => <td key={n} className="border border-black w-6">{foulsPeriod2 >= n ? 'X' : ''}</td>)}
                                </tr>
                            </tbody>
                        </table>
                        <table className="w-full text-xs border-collapse border border-black text-center">
                            <tbody>
                                <tr><td colSpan={2} className="bg-gray-200 font-bold border border-black">Pedidos de Tempo</td></tr>
                                <tr><td className="border border-black w-1/2">1º P</td><td className="border border-black w-1/2">2º P</td></tr>
                                <tr className="h-6"><td className="border border-black"><EditableSpan text=":" /></td><td className="border border-black"><EditableSpan text=":" /></td></tr>
                            </tbody>
                        </table>
                        <table className="w-full text-xs border-collapse border border-black text-center">
                            <thead className="bg-gray-200">
                                <tr><th className="border border-black">Substituições</th>{[1,2,3,4,5].map(n => <th key={n} className="border border-black w-5">{n}º</th>)}</tr>
                            </thead>
                            <tbody>
                                <tr className="h-6"><td className="border border-black font-bold text-left px-1">Entrou</td>{[1,2,3,4,5].map(n => <td key={n} className="border border-black"><EditableSpan /></td>)}</tr>
                                <tr className="h-6"><td className="border border-black font-bold text-left px-1">Saiu</td>{[1,2,3,4,5].map(n => <td key={n} className="border border-black"><EditableSpan /></td>)}</tr>
                            </tbody>
                        </table>
                        <table className="w-full text-xs border-collapse border border-black text-center">
                            <tbody>
                                <tr><td colSpan={5} className="bg-gray-200 font-bold border border-black">GOLS</td></tr>
                                {Array.from({ length: 4 }).map((_, rIdx) => (
                                    <tr key={rIdx} className="h-8">
                                        {Array.from({ length: 5 }).map((_, cIdx) => {
                                            const gIdx = (rIdx * 5) + cIdx;
                                            const goal = teamGoals[gIdx];
                                            return (
                                                <td key={cIdx} className="border border-black relative align-top">
                                                    <span className="absolute bg-gray-200 text-[8px] top-0 left-0 px-0.5 border-r border-b border-gray-300">{gIdx + 1}</span>
                                                    {goal ? <div className="pt-2"><div className="font-bold text-sm">{goal.player?.number || '#'}</div><div className="text-[9px] leading-none">{goal.minute}'</div></div> : <div className="pt-3"><EditableSpan text="" /></div>}
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
        <>
            {/* Scoreboard */}
            <table className="w-full text-lg border-collapse border border-black mb-4">
                <tbody>
                    <tr>
                        <td className="border border-black p-2 font-bold text-right w-[40%]">{match.home_team?.name}</td>
                        <td className="border border-black p-2 font-bold text-center w-[10%] text-2xl bg-gray-50">{match.home_score ?? '0'}</td>
                        <td className="border border-black p-2 font-bold text-center w-[5%] text-xl">X</td>
                        <td className="border border-black p-2 font-bold text-center w-[10%] text-2xl bg-gray-50">{match.away_score ?? '0'}</td>
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
                                <td className="border border-black p-1"><b>Local:</b> <EditableSpan text={match.location} /></td>
                                <td className="border border-black p-1 w-[30%]"><b>Data:</b> <EditableSpan text={match.start_time ? new Date(match.start_time).toLocaleDateString() : ''} /></td>
                            </tr>
                            <tr><td className="border border-black p-1" colSpan={2}><b>Arbitragem:</b> <EditableSpan text={match.match_details?.arbitration?.referee} placeholder="Nome do Árbitro" /></td></tr>
                            <tr><td className="border border-black p-1" colSpan={2}><b>Auxiliares:</b> <EditableSpan text={[match.match_details?.arbitration?.assistant1, match.match_details?.arbitration?.assistant2].filter(Boolean).join(' / ')} placeholder="Nome dos Auxiliares" /></td></tr>
                        </tbody>
                    </table>
                </div>
                <div className="w-[30%]">
                    <table className="w-full text-xs border-collapse border border-black text-center">
                        <thead className="bg-gray-200"><tr><th className="border border-black">Cronômetro</th><th className="border border-black">Início</th><th className="border border-black">Fim</th></tr></thead>
                        <tbody>
                            {['1º Período', '2º Período', 'Extra'].map(label => (
                                <tr key={label}>
                                    <td className="border border-black font-bold">{label}</td>
                                    <td className="border border-black"><EditableSpan text="" /></td>
                                    <td className="border border-black"><EditableSpan text="" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <TeamBlock team={match.home_team || { name: 'Time Mandante' }} players={rosters.home} />
            <div className="border-t-2 border-dashed border-gray-400 my-4 no-print relative"><span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs text-gray-500">Corte Aqui (Opcional)</span></div>
            <TeamBlock team={match.away_team || { name: 'Time Visitante' }} players={rosters.away} />
        </>
    );
};
