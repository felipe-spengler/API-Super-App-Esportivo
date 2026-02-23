
import React from 'react';
import { Trophy, Calendar, MapPin } from 'lucide-react';

export interface BracketMatch {
    id: number;
    team1_name: string;
    team2_name: string;
    team1_logo?: string;
    team2_logo?: string;
    team1_score?: number | null;
    team2_score?: number | null;
    team1_penalty?: number | null;
    team2_penalty?: number | null;
    round: string | number;
    match_date?: string;
    location?: string;
    status?: 'scheduled' | 'finished' | 'live' | 'canceled';
    winner_team_id?: number | null;
}

interface TournamentBracketProps {
    matches: BracketMatch[];
    emptyMessage?: string;
}

export function TournamentBracket({ matches, emptyMessage = "Chaveamento ainda não disponível." }: TournamentBracketProps) {
    if (!matches || matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-100 shadow-sm text-center">
                <Trophy className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">{emptyMessage}</p>
            </div>
        );
    }

    // Normalizing round names to a sortable index
    const getRoundIndex = (round: string | number): number => {
        if (typeof round === 'number') return round;

        const lower = String(round).toLowerCase();
        if (lower.includes('32') || lower.includes('thirty')) return 1;
        if (lower.includes('16') || lower.includes('sixteen') || lower.includes('oitavas')) return 2;
        if (lower.includes('quarter') || lower.includes('quartas')) return 3;
        if (lower.includes('semi')) return 4;
        if (lower.includes('final') && !lower.includes('semi')) return 5;
        if (lower.includes('third') || lower.includes('3rd') || lower.includes('terceiro')) return 6;

        const num = parseInt(lower.replace(/\D/g, ''));
        return isNaN(num) ? 99 : num;
    }

    const getRoundLabel = (round: string | number): string => {
        if (typeof round === 'number') {
            return `Rodada ${round}`;
        }

        const lower = String(round).toLowerCase();
        if (lower.includes('32')) return '16 Avos de Final';
        if (lower.includes('16') || lower.includes('oitavas')) return 'Oitavas de Final';
        if (lower.includes('quarter') || lower.includes('quartas')) return 'Quartas de Final';
        if (lower.includes('semi')) return 'Semifinais';
        if (lower.includes('final') && !lower.includes('semi')) return 'Grande Final';
        if (lower.includes('third') || lower.includes('3rd') || lower.includes('terceiro')) return 'Disputa de 3º Lugar';

        return String(round);
    }

    const roundsMap = matches.reduce((acc, match) => {
        const roundKey = String(match.round);
        if (!acc[roundKey]) {
            acc[roundKey] = [];
        }
        acc[roundKey].push(match);
        return acc;
    }, {} as Record<string, BracketMatch[]>);

    const sortedRoundKeys = Object.keys(roundsMap).sort((a, b) => getRoundIndex(a) - getRoundIndex(b));

    return (
        <div className="overflow-x-auto pb-12 pt-4 -mx-4 px-4 scrollbar-hide no-scrollbar">
            <div className="flex gap-4 sm:gap-8 min-w-max px-2">
                {sortedRoundKeys.map((roundKey, roundIdx) => {
                    const roundMatches = roundsMap[roundKey];

                    return (
                        <div key={roundKey} className="flex flex-col w-[80vw] sm:w-[300px] shrink-0">
                            {/* Round Header */}
                            <div className="bg-indigo-600 text-white py-2.5 px-4 rounded-2xl text-center font-black text-[10px] shadow-lg shadow-indigo-100 mb-8 uppercase tracking-[0.2em] mx-1">
                                {getRoundLabel(roundKey) || `Fase ${roundIdx + 1}`}
                            </div>

                            {/* Matches Column */}
                            <div className="flex flex-col justify-around gap-6 flex-1 px-1">
                                {roundMatches.map((match) => {
                                    const hasPenalties = (match.team1_penalty !== null && match.team1_penalty !== undefined && (match.team1_penalty > 0 || match.team2_penalty > 0)) ||
                                        (match.team2_penalty !== null && match.team2_penalty !== undefined && (match.team1_penalty > 0 || match.team2_penalty > 0));

                                    const team1Wins = match.status === 'finished' && (
                                        (match.team1_score ?? 0) > (match.team2_score ?? 0) ||
                                        ((match.team1_score === match.team2_score) && (match.team1_penalty ?? 0) > (match.team2_penalty ?? 0))
                                    );
                                    const team2Wins = match.status === 'finished' && (
                                        (match.team2_score ?? 0) > (match.team1_score ?? 0) ||
                                        ((match.team1_score === match.team2_score) && (match.team2_penalty ?? 0) > (match.team1_penalty ?? 0))
                                    );

                                    return (
                                        <div
                                            key={match.id}
                                            className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden hover:shadow-2xl hover:border-indigo-100 transition-all active:scale-[0.98] relative"
                                        >
                                            {/* Status Line */}
                                            <div className={`h-1.5 w-full ${match.status === 'finished' ? 'bg-green-500' : match.status === 'live' ? 'bg-red-500 animate-pulse' : 'bg-slate-100'}`}></div>

                                            <div className="p-4 flex flex-col gap-2">
                                                {/* Team 1 */}
                                                <div className={`flex items-center justify-between p-3 rounded-[1.25rem] transition-all ${team1Wins ? 'bg-indigo-50/50 ring-1 ring-indigo-100' : ''}`}>
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner shrink-0 text-slate-300">
                                                            {match.team1_logo ? (
                                                                <img src={match.team1_logo} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Trophy size={14} />
                                                            )}
                                                        </div>
                                                        <span className={`font-black text-[11px] uppercase tracking-tight truncate ${team1Wins ? 'text-indigo-900' : 'text-slate-600'}`}>
                                                            {match.team1_name || 'A definir'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {hasPenalties && (
                                                            <div className="flex flex-col items-center bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                                                <span className="text-[8px] font-black text-amber-600 uppercase leading-none mb-0.5">Pen</span>
                                                                <span className="text-[12px] font-black text-amber-700 leading-none">{match.team1_penalty ?? 0}</span>
                                                            </div>
                                                        )}
                                                        <span className="font-black text-slate-900 text-xl min-w-[1.2rem] text-right">
                                                            {match.team1_score ?? '-'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Team 2 */}
                                                <div className={`flex items-center justify-between p-3 rounded-[1.25rem] transition-all ${team2Wins ? 'bg-indigo-50/50 ring-1 ring-indigo-100' : ''}`}>
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner shrink-0 text-slate-300">
                                                            {match.team2_logo ? (
                                                                <img src={match.team2_logo} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Trophy size={14} />
                                                            )}
                                                        </div>
                                                        <span className={`font-black text-[11px] uppercase tracking-tight truncate ${team2Wins ? 'text-indigo-900' : 'text-slate-600'}`}>
                                                            {match.team2_name || 'A definir'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {hasPenalties && (
                                                            <div className="flex flex-col items-center bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                                                <span className="text-[8px] font-black text-amber-600 uppercase leading-none mb-0.5">Pen</span>
                                                                <span className="text-[12px] font-black text-amber-700 leading-none">{match.team2_penalty ?? 0}</span>
                                                            </div>
                                                        )}
                                                        <span className="font-black text-slate-900 text-xl min-w-[1.2rem] text-right">
                                                            {match.team2_score ?? '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Match Info Footer */}
                                            <div className="bg-slate-50/50 px-4 py-2.5 border-t border-slate-50 flex items-center justify-between text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3 text-indigo-400" />
                                                    {match.match_date ? new Date(match.match_date).toLocaleDateString('pt-BR') : 'Data a def.'}
                                                </div>
                                                {match.location && (
                                                    <div className="flex items-center gap-1.5 truncate max-w-[100px]">
                                                        <MapPin className="w-3 h-3 text-indigo-400" />
                                                        {match.location}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
