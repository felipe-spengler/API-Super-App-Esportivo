import React from 'react';
import { EditableSpan } from './PrintBase';

const formatSafeTime = (time: string) => {
    if (!time || time.includes('-') || time.length > 6) return '--:--';
    return time;
};

export const PrintVolley = ({ match, rosters, events }: { match: any, rosters: any, events: any[] }) => {
    const sets = (match?.match_details?.sets || []).sort((a: any, b: any) => (a.set_number || 0) - (b.set_number || 0));

    // Sort events chronologically by ID (or created_at if available)
    const sortedEvents = [...events].sort((a, b) => a.id - b.id);

    const TeamBlock = ({ team, players, side }: { team: any, players: any[], side: 'home' | 'away' }) => {
        const teamEvents = sortedEvents.filter((e: any) => e.team_id === team.id);
        
        const rows = Array.from({ length: 16 }, (_, i) => {
            const player = players[i];
            const pId = player?.id;
            
            // Check participation in each set using events
            const participation = [1, 2, 3, 4, 5].map(setNum => {
                return sortedEvents.some(e => e.player_id === pId && (e.period === `${setNum}º Set` || e.period === `Set ${setNum}`));
            });

            return {
                idx: i + 1,
                player,
                participation,
                atq: teamEvents.filter(e => (e.type === 'ataque' || e.metadata?.volley_type === 'ataque') && e.player_id === pId).length,
                blq: teamEvents.filter(e => (e.type === 'bloqueio' || e.metadata?.volley_type === 'bloqueio') && e.player_id === pId).length,
                sqe: teamEvents.filter(e => (e.type === 'saque' || e.type === 'ace' || e.metadata?.volley_type === 'saque') && e.player_id === pId).length,
            };
        });

        return (
            <div className="mb-6 break-inside-avoid">
                <div className="border border-black bg-gray-100 font-bold p-1 text-base uppercase text-center mb-1">
                    {team?.name}
                </div>
                <div className="flex gap-2">
                    <div className="w-full">
                        <table className="w-full text-[10px] border-collapse border border-black">
                            <thead className="bg-gray-200 text-center font-bold">
                                <tr>
                                    <th className="border border-black w-6">Nº</th>
                                    <th className="border border-black text-left px-1">Nome</th>
                                    <th className="border border-black w-8">Camisa</th>
                                    <th className="border border-black border-r-2" colSpan={5}>Participação (Set)</th>
                                    <th className="border border-black w-8">Atq</th>
                                    <th className="border border-black w-8">Blq</th>
                                    <th className="border border-black w-8">Sqe</th>
                                </tr>
                                <tr className="text-[8px]">
                                    <th className="border border-black" colSpan={3}></th>
                                    {[1,2,3,4,5].map(n => <th key={n} className="border border-black w-5">{n}</th>)}
                                    <th className="border border-black" colSpan={3}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row) => (
                                    <tr key={row.idx} className="h-5">
                                        <td className="border border-black text-center">{row.idx}</td>
                                        <td className="border border-black px-1 font-medium truncate max-w-[120px]">
                                            {row.player ? (row.player.nickname || row.player.name) : <EditableSpan />}
                                        </td>
                                        <td className="border border-black text-center">
                                            {row.player ? row.player.number : <EditableSpan />}
                                        </td>
                                        {row.participation.map((p, idx) => (
                                            <td key={idx} className={`border border-black text-center font-bold ${idx === 4 ? 'border-r-2' : ''}`}>
                                                {p ? 'X' : ''}
                                            </td>
                                        ))}
                                        <td className="border border-black text-center font-bold">{row.atq > 0 ? row.atq : ''}</td>
                                        <td className="border border-black text-center font-bold">{row.blq > 0 ? row.blq : ''}</td>
                                        <td className="border border-black text-center font-bold">{row.sqe > 0 ? row.sqe : ''}</td>
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
        <div className="flex flex-col gap-2">
            {/* Scoreboard */}
            <table className="w-full text-lg border-collapse border border-black">
                <tbody>
                    <tr>
                        <td className="border border-black p-2 font-bold text-right w-[40%] flex-col">
                            <div className="text-xl">{(match.home_team || match.homeTeam)?.name}</div>
                            <div className="text-[10px] text-gray-400 font-normal uppercase">Mandante</div>
                        </td>
                        <td className="border border-black p-2 font-bold text-center w-[20%] bg-gray-50">
                            <div className="flex items-center justify-center gap-4">
                                <span className="text-3xl">{match.home_score ?? '0'}</span>
                                <span className="text-xl text-gray-400">X</span>
                                <span className="text-3xl">{match.away_score ?? '0'}</span>
                            </div>
                            <div className="text-[9px] font-normal uppercase text-blue-600 mt-1 tracking-widest">Sets Finalizados</div>
                        </td>
                        <td className="border border-black p-2 font-bold text-left w-[40%]">
                            <div className="text-xl">{(match.away_team || match.awayTeam)?.name}</div>
                            <div className="text-[10px] text-gray-400 font-normal uppercase">Visitante</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Logistics & Chronometer */}
            <div className="grid grid-cols-2 gap-4">
                <table className="w-full text-[10px] border-collapse border border-black">
                    <tbody>
                        <tr>
                            <td className="border border-black p-1"><b>Local:</b> <EditableSpan text={match.location} /></td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1"><b>Data:</b> <EditableSpan text={match.start_time ? new Date(match.start_time).toLocaleDateString() : ''} /></td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1"><b>Arbitragem:</b> <EditableSpan text={match.match_details?.arbitration?.referee} /></td>
                        </tr>
                    </tbody>
                </table>
                <table className="w-full text-[9px] border-collapse border border-black text-center">
                    <thead className="bg-gray-100 font-bold">
                        <tr><th className="border border-black">Set</th><th className="border border-black">Placar</th><th className="border border-black">Início</th><th className="border border-black">Fim</th></tr>
                    </thead>
                    <tbody>
                        {[1, 2, 3, 4, 5].map(n => {
                            const setData = sets.find((s: any) => s.set_number === n);
                            return (
                                <tr key={n}>
                                    <td className="border border-black font-bold">{n}º</td>
                                    <td className="border border-black bg-gray-50">{setData ? `${setData.home_score} x ${setData.away_score}` : '- x -'}</td>
                                    <td className="border border-black"><EditableSpan text="" /></td>
                                    <td className="border border-black"><EditableSpan text="" /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Rosters Section */}
            <div className="grid grid-cols-2 gap-4">
                <TeamBlock team={(match.home_team || match.homeTeam)} players={rosters.home} side="home" />
                <TeamBlock team={(match.away_team || match.awayTeam)} players={rosters.away} side="away" />
            </div>

            {/* Timeline for Audit (Lançamentos) */}
            <div className="mt-2 border border-black">
                <div className="bg-gray-800 text-white text-center font-bold py-1 text-xs uppercase tracking-widest">
                    Lançamentos da Partida (Auditoria)
                </div>
                <div className="max-h-[800px] overflow-visible">
                    <table className="w-full text-[9px] border-collapse">
                        <thead className="bg-gray-100 border-b border-black sticky top-0">
                            <tr>
                                <th className="p-1 border-r border-black w-12 text-center">Tempo</th>
                                <th className="p-1 border-r border-black w-16 text-center">Set</th>
                                <th className="p-1 border-r border-black text-left">Evento / Jogador</th>
                                <th className="p-1 border-r border-black w-24 text-center">Equipe</th>
                                <th className="p-1 w-16 text-center">Placar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedEvents.map((e, idx) => {
                                const isHome = e.team_id === match.home_team_id;
                                const typeInfo = e.label || e.type;
                                const pName = e.player_name || (e.player ? (e.player.nickname || e.player.name) : '-');
                                
                                return (
                                    <tr key={idx} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                        <td className="p-1 border-r border-gray-300 text-center">{formatSafeTime(e.minute)}</td>
                                        <td className="p-1 border-r border-gray-300 text-center font-bold">{e.period?.replace('Set', '') || '-'}</td>
                                        <td className="p-1 border-r border-gray-300">
                                            <span className="inline-block w-4 mr-1 text-center">{e.icon || '🏐'}</span>
                                            <span className="font-bold uppercase mr-1">{typeInfo}:</span>
                                            <span>{pName}</span>
                                        </td>
                                        <td className={`p-1 border-r border-gray-300 text-center font-medium ${isHome ? 'text-blue-700' : 'text-red-700'}`}>
                                            {isHome ? 'MANDANTE' : 'VISITANTE'}
                                        </td>
                                        <td className="p-1 text-center font-black bg-gray-100">
                                            {e.metadata?.score || '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {sortedEvents.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-gray-400 italic">Nenhum lançamento registrado nesta partida.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Timeouts & Subs summary if needed */}
            <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="border border-black p-1 text-[9px]">
                    <b>Pedidos de Tempo:</b> T1: [  :  ]  T2: [  :  ] (Mandante) | T1: [  :  ]  T2: [  :  ] (Visitante)
                </div>
                <div className="border border-black p-1 text-[9px] text-right">
                    <b>Súmula gerada em:</b> {new Date().toLocaleString()}
                </div>
            </div>
        </div>
    );
};
