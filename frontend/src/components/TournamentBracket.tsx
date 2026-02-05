
import React from 'react';
import { Trophy, Calendar, MapPin, CheckCircle } from 'lucide-react';

export interface BracketMatch {
    id: number;
    team1_name: string;
    team2_name: string;
    team1_logo?: string;
    team2_logo?: string;
    team1_score?: number | null;
    team2_score?: number | null;
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

    // 1. Group matches by round
    // We need to determine the order of rounds. Assuming higher round number = later stage? 
    // Or if strings like 'round_of_16', we need a map.

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

        // Fallback for numbered rounds from backend if any
        const num = parseInt(lower.replace(/\D/g, ''));
        return isNaN(num) ? 99 : num;
    }

    const getRoundLabel = (round: string | number): string => {
        if (typeof round === 'number') {
            // Try to guess based on match count in that round later, or just return "Rodada X"
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

    // Sort rounds
    const sortedRoundKeys = Object.keys(roundsMap).sort((a, b) => getRoundIndex(a) - getRoundIndex(b));

    return (
        <div className="overflow-x-auto pb-8 pt-4">
            <div className="flex gap-8 min-w-max px-4">
                {sortedRoundKeys.map((roundKey, roundIdx) => {
                    const roundMatches = roundsMap[roundKey];
                    // Sort matches by id or another criteria to keep them in order if needed
                    // For now, simpler is better.

                    return (
                        <div key={roundKey} className="flex flex-col min-w-[280px]">
                            {/* Round Header */}
                            <div className="bg-indigo-600 text-white py-2 px-4 rounded-t-lg text-center font-bold text-sm shadow-md mb-6 uppercase tracking-wider">
                                {getRoundLabel(roundKey) || `Fase ${roundIdx + 1}`}
                            </div>

                            {/* Matches Column */}
                            <div className="flex flex-col justify-around gap-8 flex-1">
                                {roundMatches.map((match) => (
                                    <div
                                        key={match.id}
                                        className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow relative"
                                    >
                                        {/* Status Line */}
                                        <div className={`h-1 w-full ${match.status === 'finished' ? 'bg-green-500' : 'bg-gray-200'}`}></div>

                                        <div className="p-4 flex flex-col gap-3">
                                            {/* Team 1 */}
                                            <div className={`flex items-center justify-between p-2 rounded-lg transition-colors ${match.status === 'finished' && match.team1_score !== null && match.team2_score !== null && match.team1_score > match.team2_score
                                                ? 'bg-green-50 border border-green-100'
                                                : ''
                                                }`}>
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    {match.team1_logo ? (
                                                        <img src={match.team1_logo} alt="" className="w-6 h-6 rounded-full object-cover bg-gray-100" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">?</div>
                                                    )}
                                                    <span className={`font-bold text-sm truncate ${match.status === 'finished' && match.team1_score !== null && match.team2_score !== null && match.team1_score > match.team2_score ? 'text-green-800' : 'text-gray-700'}`}>
                                                        {match.team1_name || 'A definir'}
                                                    </span>
                                                </div>
                                                <span className="font-black text-gray-900 text-lg">
                                                    {match.team1_score ?? '-'}
                                                </span>
                                            </div>

                                            {/* Team 2 */}
                                            <div className={`flex items-center justify-between p-2 rounded-lg transition-colors ${match.status === 'finished' && match.team2_score !== null && match.team1_score !== null && match.team2_score > match.team1_score
                                                ? 'bg-green-50 border border-green-100'
                                                : ''
                                                }`}>
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    {match.team2_logo ? (
                                                        <img src={match.team2_logo} alt="" className="w-6 h-6 rounded-full object-cover bg-gray-100" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">?</div>
                                                    )}
                                                    <span className={`font-bold text-sm truncate ${match.status === 'finished' && match.team2_score !== null && match.team1_score !== null && match.team2_score > match.team1_score ? 'text-green-800' : 'text-gray-700'}`}>
                                                        {match.team2_name || 'A definir'}
                                                    </span>
                                                </div>
                                                <span className="font-black text-gray-900 text-lg">
                                                    {match.team2_score ?? '-'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Match Info Footer */}
                                        <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-500 font-medium">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {match.match_date ? new Date(match.match_date).toLocaleDateString('pt-BR') : 'Data a def.'}
                                            </div>
                                            {match.location && (
                                                <div className="flex items-center gap-1 truncate max-w-[100px]">
                                                    <MapPin className="w-3 h-3" />
                                                    {match.location}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
