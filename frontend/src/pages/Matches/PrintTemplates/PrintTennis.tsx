import React from 'react';
import { EditableSpan } from './PrintBase';

export const PrintTennis = ({ match, rosters, events }: { match: any, rosters: any, events: any[] }) => {
    const sets = (match?.match_details?.sets || []).sort((a: any, b: any) => (a.set_number || 0) - (b.set_number || 0));

    const TeamBlock = ({ team, players }: { team: any, players: any[] }) => {
        const teamEvents = events.filter((e: any) => e.team_id === team.id);
        
        const rows = Array.from({ length: 20 }, (_, i) => {
            const player = players[i];
            return {
                idx: i + 1,
                player,
                aces: teamEvents.filter(e => e.type === 'ace' && e.player_id === player?.id).length,
                winners: teamEvents.filter(e => e.type === 'winner' && e.player_id === player?.id).length,
                games: teamEvents.filter(e => e.type === 'game' && e.player_id === player?.id).length,
            };
        });

        return (
            <div className="mb-8 break-inside-avoid">
                <div className="border border-black bg-gray-100 font-bold p-1 text-lg uppercase text-center mb-1">
                    {team.name}
                </div>
                <div className="flex gap-2">
                    <div className="w-full">
                        <table className="w-full text-xs border-collapse border border-black">
                            <thead className="bg-gray-200 text-center font-bold">
                                <tr>
                                    <th className="border border-black w-8">Nº</th>
                                    <th className="border border-black text-left px-2">Nome</th>
                                    <th className="border border-black w-8">Camisa</th>
                                    <th className="border border-black w-24">Sets</th>
                                    <th className="border border-black w-10">Aces</th>
                                    <th className="border border-black w-10">Wnr</th>
                                    <th className="border border-black w-10">Games</th>
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
                                        <td className="border border-black text-center font-bold">{row.aces > 0 ? row.aces : ''}</td>
                                        <td className="border border-black text-center font-bold">{row.winners > 0 ? row.winners : ''}</td>
                                        <td className="border border-black text-center font-bold">{row.games > 0 ? row.games : ''}</td>
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
                        <td className="border border-black p-2 font-bold text-right w-[40%] flex-col">
                            <div>{match.home_team?.name}</div>
                            <div className="text-[10px] text-gray-400 font-normal">Mandante</div>
                        </td>
                        <td className="border border-black p-2 font-bold text-center w-[10%] text-2xl bg-gray-50 flex flex-col items-center">
                            <div>{match.home_score ?? '0'}</div>
                            <div className="text-[9px] font-normal uppercase text-blue-600">Sets</div>
                        </td>
                        <td className="border border-black p-2 font-bold text-center w-[5%] text-xl">X</td>
                        <td className="border border-black p-2 font-bold text-center w-[10%] text-2xl bg-gray-50 flex flex-col items-center">
                            <div>{match.away_score ?? '0'}</div>
                            <div className="text-[9px] font-normal uppercase text-blue-600">Sets</div>
                        </td>
                        <td className="border border-black p-2 font-bold text-left w-[40%]">
                            <div>{match.away_team?.name}</div>
                            <div className="text-[10px] text-gray-400 font-normal">Visitante</div>
                        </td>
                    </tr>
                    {sets.length > 0 && (
                        <tr>
                            <td colSpan={5} className="bg-gray-50 p-1 border border-black">
                                <div className="flex items-center justify-center gap-4 text-xs font-bold text-gray-600">
                                    {sets.map((s: any) => (
                                        <div key={s.id} className="flex gap-2 bg-white px-2 py-0.5 border rounded border-gray-200">
                                            <span className="text-gray-400">Set {s.set_number}:</span>
                                            <span>{s.home_score} x {s.away_score}</span>
                                        </div>
                                    ))}
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Logistics */}
            <div className="mb-4">
                <table className="w-full text-sm border-collapse border border-black">
                    <tbody>
                        <tr>
                            <td className="border border-black p-1"><b>Local:</b> <EditableSpan text={match.location} /></td>
                            <td className="border border-black p-1 w-[30%]"><b>Data:</b> <EditableSpan text={match.start_time ? new Date(match.start_time).toLocaleDateString() : ''} /></td>
                        </tr>
                        <tr><td className="border border-black p-1" colSpan={2}><b>Arbitragem:</b> <EditableSpan text={match.match_details?.arbitration?.referee} placeholder="Nome do Árbitro" /></td></tr>
                    </tbody>
                </table>
            </div>

            <TeamBlock team={match.home_team || { name: 'Time Mandante' }} players={rosters.home} />
            <div className="border-t-2 border-dashed border-gray-400 my-4 no-print relative"><span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-xs text-gray-500">Corte Aqui (Opcional)</span></div>
            <TeamBlock team={match.away_team || { name: 'Time Visitante' }} players={rosters.away} />
        </>
    );
};
