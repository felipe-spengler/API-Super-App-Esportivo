import React, { useRef, useState, useEffect } from 'react';
import { Trophy, Calendar, MapPin, ChevronLeft, ChevronRight, Move } from 'lucide-react';

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

// Auxiliar: Normaliza o índice de ordenação de cada rodada
const getRoundIndex = (round: string | number): number => {
    if (typeof round === 'number') return round;

    const lower = String(round).toLowerCase();
    if (lower.includes('32')) return 1;
    if (lower.includes('16') || lower.includes('oitavas')) return 2;
    if (lower.includes('quarter') || lower.includes('quartas')) return 3;
    if (lower.includes('semi')) return 4;
    if (lower.includes('final') && !lower.includes('semi')) return 5;
    if (lower.includes('third') || lower.includes('terceiro')) return 6;

    const num = parseInt(lower.replace(/\D/g, ''));
    return isNaN(num) ? 99 : num;
};

// Auxiliar: Gera o rótulo legível da rodada
const getRoundLabel = (round: string | number): string => {
    if (typeof round === 'number') return `Rodada ${round}`;

    const lower = String(round).toLowerCase();
    if (lower.includes('32')) return '16 Avos de Final';
    if (lower.includes('16') || lower.includes('oitavas')) return 'Oitavas de Final';
    if (lower.includes('quarter') || lower.includes('quartas')) return 'Quartas de Final';
    if (lower.includes('semi')) return 'Semifinais';
    if (lower.includes('final') && !lower.includes('semi')) return 'Grande Final';
    if (lower.includes('third') || lower.includes('terceiro')) return 'Disputa de 3º Lugar';

    return String(round);
};

export function TournamentBracket({ matches, emptyMessage = "Chaveamento ainda não disponível." }: TournamentBracketProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [showLeftBtn, setShowLeftBtn] = useState(false);
    const [showRightBtn, setShowRightBtn] = useState(false);

    const checkScroll = () => {
        const container = containerRef.current;
        if (container) {
            const { scrollLeft, scrollWidth, clientWidth } = container;
            setShowLeftBtn(scrollLeft > 10);
            setShowRightBtn(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        checkScroll();
        container.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);

        // Lógica de arrastar para rolar (Desktop)
        let isDown = false;
        let startX: number;
        let scrollLeft: number;

        const onMouseDown = (e: MouseEvent) => {
            isDown = true;
            container.style.cursor = 'grabbing';
            startX = e.pageX - container.offsetLeft;
            scrollLeft = container.scrollLeft;
        };

        const onMouseLeaveOrUp = () => {
            if (!isDown) return;
            isDown = false;
            container.style.cursor = 'grab';
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const walk = (x - startX) * 1.5;
            container.scrollLeft = scrollLeft - walk;
        };

        container.style.cursor = 'grab';
        container.style.userSelect = 'none';
        
        container.addEventListener('mousedown', onMouseDown);
        container.addEventListener('mouseleave', onMouseLeaveOrUp);
        container.addEventListener('mouseup', onMouseLeaveOrUp);
        container.addEventListener('mousemove', onMouseMove);

        const timer = setTimeout(checkScroll, 150);

        return () => {
            container.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
            container.removeEventListener('mousedown', onMouseDown);
            container.removeEventListener('mouseleave', onMouseLeaveOrUp);
            container.removeEventListener('mouseup', onMouseLeaveOrUp);
            container.removeEventListener('mousemove', onMouseMove);
            clearTimeout(timer);
        };
    }, [matches]);

    const handleScroll = (direction: 'left' | 'right') => {
        const container = containerRef.current;
        if (container) {
            const scrollAmount = direction === 'left' ? -340 : 340;
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    if (!matches || matches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-100 shadow-sm text-center">
                <Trophy className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">{emptyMessage}</p>
            </div>
        );
    }

    // Agrupa e ordena as rodadas
    const roundsMap = matches.reduce((acc, match) => {
        const roundKey = String(match.round);
        if (!acc[roundKey]) acc[roundKey] = [];
        acc[roundKey].push(match);
        return acc;
    }, {} as Record<string, BracketMatch[]>);

    const sortedRoundKeys = Object.keys(roundsMap).sort((a, b) => getRoundIndex(a) - getRoundIndex(b));

    return (
        <div className="relative w-full group/bracket">
            <div className="hidden md:flex items-center justify-end gap-2 text-[10px] font-bold text-slate-400 mb-2 px-1 uppercase tracking-widest select-none">
                <Move className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
                <span>Segure e arraste para navegar</span>
            </div>

            {showLeftBtn && <ScrollButton direction="left" onClick={() => handleScroll('left')} />}
            {showRightBtn && <ScrollButton direction="right" onClick={() => handleScroll('right')} />}

            <div 
                ref={containerRef}
                className="overflow-x-auto pb-12 pt-4 -mx-4 px-4 custom-scrollbar select-none active:cursor-grabbing"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                <div className="flex gap-4 sm:gap-8 min-w-max px-2">
                    {sortedRoundKeys.map((roundKey, roundIdx) => (
                        <RoundColumn 
                            key={roundKey} 
                            roundKey={roundKey} 
                            roundIdx={roundIdx} 
                            matches={roundsMap[roundKey]} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

/* --- SUBCOMPONENTES DE APOIO --- */

interface ScrollButtonProps {
    direction: 'left' | 'right';
    onClick: () => void;
}

function ScrollButton({ direction, onClick }: ScrollButtonProps) {
    const isLeft = direction === 'left';
    const Icon = isLeft ? ChevronLeft : ChevronRight;
    const positionClass = isLeft ? '-left-4' : '-right-4';
    const transformHover = isLeft ? '-translate-x-1' : 'translate-x-1';

    return (
        <button
            onClick={onClick}
            className={`hidden md:flex absolute ${positionClass} top-[110px] z-30 items-center justify-center w-12 h-12 rounded-full bg-white shadow-xl shadow-indigo-900/10 border border-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:scale-110 hover:${transformHover} transition-all duration-300 active:scale-95 group`}
            aria-label={`Scroll ${direction}`}
        >
            <Icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
        </button>
    );
}

interface RoundColumnProps {
    roundKey: string;
    roundIdx: number;
    matches: BracketMatch[];
}

function RoundColumn({ roundKey, roundIdx, matches }: RoundColumnProps) {
    return (
        <div className="flex flex-col w-[80vw] sm:w-[300px] shrink-0">
            <div className="bg-indigo-600 text-white py-2.5 px-4 rounded-2xl text-center font-black text-[10px] shadow-lg shadow-indigo-100 mb-8 uppercase tracking-[0.2em] mx-1">
                {getRoundLabel(roundKey) || `Fase ${roundIdx + 1}`}
            </div>

            <div className="flex flex-col justify-around gap-6 flex-1 px-1">
                {matches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                ))}
            </div>
        </div>
    );
}

function MatchCard({ match }: { match: BracketMatch }) {
    const isFinished = match.status === 'finished';
    const isLive = match.status === 'live';
    
    const team1Score = match.team1_score ?? 0;
    const team2Score = match.team2_score ?? 0;
    const team1Pen = match.team1_penalty ?? 0;
    const team2Pen = match.team2_penalty ?? 0;

    const hasPenalties = (match.team1_penalty != null || match.team2_penalty != null) && (team1Pen > 0 || team2Pen > 0);

    const team1Wins = isFinished && (team1Score > team2Score || (team1Score === team2Score && team1Pen > team2Pen));
    const team2Wins = isFinished && (team2Score > team1Score || (team1Score === team2Score && team2Pen > team1Pen));

    const statusIndicatorColor = isFinished ? 'bg-green-500' : isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-100';

    return (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden hover:shadow-2xl hover:border-indigo-100 transition-all active:scale-[0.98] relative">
            <div className={`h-1.5 w-full ${statusIndicatorColor}`} />

            <div className="p-4 flex flex-col gap-2">
                <TeamRow 
                    name={match.team1_name} 
                    logo={match.team1_logo} 
                    score={match.team1_score} 
                    penalty={match.team1_penalty} 
                    isWinner={team1Wins} 
                    showPenalty={hasPenalties} 
                />
                <TeamRow 
                    name={match.team2_name} 
                    logo={match.team2_logo} 
                    score={match.team2_score} 
                    penalty={match.team2_penalty} 
                    isWinner={team2Wins} 
                    showPenalty={hasPenalties} 
                />
            </div>

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
}

interface TeamRowProps {
    name: string;
    logo?: string;
    score?: number | null;
    penalty?: number | null;
    isWinner: boolean;
    showPenalty: boolean;
}

function TeamRow({ name, logo, score, penalty, isWinner, showPenalty }: TeamRowProps) {
    return (
        <div className={`flex items-center justify-between p-3 rounded-[1.25rem] transition-all ${isWinner ? 'bg-indigo-50/50 ring-1 ring-indigo-100' : ''}`}>
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner shrink-0 text-slate-300">
                    {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : <Trophy size={14} />}
                </div>
                <span className={`font-black text-[11px] uppercase tracking-tight truncate ${isWinner ? 'text-indigo-900' : 'text-slate-600'}`}>
                    {name || 'A definir'}
                </span>
            </div>
            
            <div className="flex items-center gap-3">
                {showPenalty && (
                    <div className="flex flex-col items-center bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                        <span className="text-[8px] font-black text-amber-600 uppercase leading-none mb-0.5">Pen</span>
                        <span className="text-[12px] font-black text-amber-700 leading-none">{penalty ?? 0}</span>
                    </div>
                )}
                <span className="font-black text-slate-900 text-xl min-w-[1.2rem] text-right">
                    {score ?? '-'}
                </span>
            </div>
        </div>
    );
}
