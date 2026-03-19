import React from 'react';
import { EditableSpan } from './PrintBase';

export const PrintBasketball = ({ match, rosters, events }: { match: any, rosters: any, events: any[] }) => {
    const TeamBlock = ({ team, players }: { team: any, players: any[] }) => {
        const teamEvents = events.filter((e: any) => e.team_id === team.id);
        
        const rows = Array.from({ length: 15 }, (_, i) => {
            const player = players[i];
            const pId = player?.id;
            const pEvents = teamEvents.filter(e => e.player_id === pId);
            const participatedSets = player?.participated_sets || [];

            return {
                idx: i + 1,
                player,
                fouls: pEvents.filter(e => e.type === 'foul' || e.type === 'falta').length,
                p1: pEvents.filter(e => e.metadata?.points === 1).length,
                p2: pEvents.filter(e => e.metadata?.points === 2 || e.type === 'field_goal_2').length,
                p3: pEvents.filter(e => e.metadata?.points === 3 || e.type === 'field_goal_3').length,
                total: pEvents.reduce((acc, e) => acc + (parseInt(e.metadata?.points || 0)), 0),
                participation: [1, 2, 3, 4].map(n => participatedSets.includes(n))
            };
        });

        return (
            <div className="mb-6 break-inside-avoid">
                <div className="border border-black bg-gray-100 font-bold p-1 text-lg uppercase text-center mb-1">
                    {team?.name}
                </div>
                <table className="w-full text-[10px] border-collapse border border-black">
                    <thead className="bg-gray-200 text-center font-bold">
                        <tr>
                            <th className="border border-black w-6">Nº</th>
                            <th className="border border-black text-left px-1">Nome / Atleta</th>
                            <th className="border border-black w-8">Cam.</th>
                            <th className="border border-black" colSpan={4}>Participação (Q)</th>
                            <th className="border border-black w-20">Faltas Pessoais</th>
                            <th className="border border-black w-6">1</th>
                            <th className="border border-black w-6">2</th>
                            <th className="border border-black w-6">3</th>
                            <th className="border border-black w-8 bg-gray-300">Total</th>
                        </tr>
                        <tr className="text-[8px]">
                            <th colSpan={3}></th>
                            {[1, 2, 3, 4].map(n => <th key={n} className="border border-black w-5">{n}º</th>)}
                            <th></th>
                            <th colSpan={4}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.idx} className="h-5">
                                <td className="border border-black text-center">{row.idx}</td>
                                <td className="border border-black px-1 font-medium truncate max-w-[150px]">
                                    {row.player ? (row.player.nickname || row.player.name) : <EditableSpan />}
                                </td>
                                <td className="border border-black text-center">
                                    {row.player ? row.player.number : <EditableSpan />}
                                </td>
                                {row.participation.map((p, idx) => (
                                    <td key={idx} className="border border-black text-center font-bold">{p ? 'X' : ''}</td>
                                ))}
                                <td className="border border-black text-center text-[8px] tracking-[3px] font-bold">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <span key={i} className={row.fouls > i ? 'text-black' : 'text-gray-200'}>●</span>
                                    ))}
                                </td>
                                <td className="border border-black text-center font-bold">{row.p1 || ''}</td>
                                <td className="border border-black text-center font-bold">{row.p2 || ''}</td>
                                <td className="border border-black text-center font-bold">{row.p3 || ''}</td>
                                <td className="border border-black text-center font-bold bg-gray-50">{row.total || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-2">
            <table className="w-full text-lg border-collapse border border-black">
                <tbody>
                    <tr>
                        <td className="border border-black p-2 font-bold text-right w-[40%] text-xl uppercase">{(match.home_team || match.homeTeam)?.name}</td>
                        <td className="border border-black p-2 font-bold text-center w-[20%] bg-gray-50">
                            <div className="flex items-center justify-center gap-4 text-3xl">
                                <span>{match.home_score ?? '0'}</span>
                                <span className="text-gray-300 text-xl">X</span>
                                <span>{match.away_score ?? '0'}</span>
                            </div>
                            <div className="text-[9px] font-normal uppercase text-orange-600 mt-1">Pontos Totais</div>
                        </td>
                        <td className="border border-black p-2 font-bold text-left w-[40%] text-xl uppercase">{(match.away_team || match.awayTeam)?.name}</td>
                    </tr>
                </tbody>
            </table>

            <div className="grid grid-cols-2 gap-4">
                <table className="w-full text-[10px] border-collapse border border-black">
                    <tbody>
                        <tr><td className="border border-black p-1"><b>Local:</b> <EditableSpan text={match.location} /></td></tr>
                        <tr><td className="border border-black p-1"><b>Data:</b> <EditableSpan text={match.start_time ? new Date(match.start_time).toLocaleDateString() : ''} /></td></tr>
                        <tr><td className="border border-black p-1"><b>Árbitro Principal:</b> <EditableSpan text={match.match_details?.arbitration?.referee} /></td></tr>
                    </tbody>
                </table>
                <table className="w-full text-[9px] border-collapse border border-black text-center">
                    <thead className="bg-gray-100 font-bold">
                        <tr><th className="border border-black">Período</th><th className="border border-black">Placar</th><th className="border border-black">Início</th><th className="border border-black">Fim</th></tr>
                    </thead>
                    <tbody>
                        {[1, 2, 3, 4, 5].map(n => {
                            const label = n <= 4 ? `${n}º Q` : 'Extra';
                            const setData = (match.match_details?.sets || []).find((s: any) => s.set_number === n);
                            const formatTime = (timeStr: string) => {
                                if (!timeStr) return '';
                                const d = new Date(timeStr);
                                return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            };
                            return (
                                <tr key={n}>
                                    <td className="border border-black font-bold">{label}</td>
                                    <td className="border border-black bg-gray-50">{setData ? `${setData.home_score} x ${setData.away_score}` : '- x -'}</td>
                                    <td className="border border-black"><EditableSpan text={formatTime(setData?.start_time)} /></td>
                                    <td className="border border-black"><EditableSpan text={formatTime(setData?.end_time)} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2">
                <TeamBlock team={(match.home_team || match.homeTeam)} players={rosters.home} />
                <TeamBlock team={(match.away_team || match.awayTeam)} players={rosters.away} />
            </div>
        </div>
    );
};
