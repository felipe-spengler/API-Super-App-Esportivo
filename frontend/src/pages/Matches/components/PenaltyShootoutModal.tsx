import React, { useState, useMemo, useEffect } from 'react';
import { 
    X, 
    Trash2, 
    Trophy, 
    UserPlus, 
    Search, 
    History, 
    Check, 
    ArrowRight,
    Users,
    AlertCircle,
    RotateCcw
} from 'lucide-react';

export interface PenaltyShootoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    homeTeamName: string;
    awayTeamName: string;
    homeTeamLogo?: string | null;
    awayTeamLogo?: string | null;
    homeTeamId: number;
    awayTeamId: number;
    homeScore: number;
    awayScore: number;
    penaltyScore: { home: number; away: number };
    rosters: { home: any[]; away: any[] };
    events: any[];
    onRegisterPenalty: (
        team: 'home' | 'away',
        player: any,
        outcome: 'score' | 'saved' | 'post' | 'out'
    ) => Promise<void>;
    onDeletePenalty: (eventId: number, type: string, team: 'home' | 'away') => Promise<void>;
    onFinishMatch?: () => void;
}

export function PenaltyShootoutModal({
    isOpen,
    onClose,
    homeTeamName,
    awayTeamName,
    homeTeamLogo,
    awayTeamLogo,
    homeScore,
    awayScore,
    penaltyScore,
    rosters,
    events,
    onRegisterPenalty,
    onDeletePenalty,
    onFinishMatch
}: PenaltyShootoutModalProps) {
    if (!isOpen) return null;

    // Cobranças em ordem cronológica
    const shootoutEvents = useMemo(() => {
        return events
            .filter(e => e.type === 'shootout_goal' || e.type === 'shootout_miss')
            .sort((a, b) => Number(a.id) - Number(b.id));
    }, [events]);

    const homeKicks = useMemo(() => shootoutEvents.filter(e => e.team === 'home'), [shootoutEvents]);
    const awayKicks = useMemo(() => shootoutEvents.filter(e => e.team === 'away'), [shootoutEvents]);

    // Próximo time sugerido (alternância automática: se mandante tem menos ou igual, é mandante)
    const suggestedNextTeam: 'home' | 'away' = homeKicks.length <= awayKicks.length ? 'home' : 'away';

    const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>(suggestedNextTeam);
    const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modais secundários
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [playerFilter, setPlayerFilter] = useState('');
    const [customPlayerName, setCustomPlayerName] = useState('');
    const [customPlayerNumber, setCustomPlayerNumber] = useState('');
    const [isAddingCustomPlayer, setIsAddingCustomPlayer] = useState(false);

    // Atualiza automaticamente o time sugerido quando o número de cobranças muda
    useEffect(() => {
        setSelectedTeam(suggestedNextTeam);
        setSelectedPlayer(null);
    }, [shootoutEvents.length]);

    // Número total de rodadas a exibir (mínimo 5, expande se morte súbita)
    const maxKicks = Math.max(homeKicks.length, awayKicks.length);
    const totalRounds = Math.max(5, maxKicks + (homeKicks.length === awayKicks.length ? 1 : 0));

    // Cálculos de vencedor matemático ou morte súbita
    const winnerInfo = useMemo(() => {
        const goalsHome = penaltyScore.home;
        const goalsAway = penaltyScore.away;
        const kicksHome = homeKicks.length;
        const kicksAway = awayKicks.length;

        // Rodadas regulares (até 5 cobranças cada)
        if (kicksHome <= 5 && kicksAway <= 5) {
            const remainingHome = 5 - kicksHome;
            const remainingAway = 5 - kicksAway;

            if (goalsHome > goalsAway + remainingAway) {
                return {
                    winner: 'home',
                    name: homeTeamName,
                    desc: `Vitória garantida nas 5 cobranças (${goalsHome} x ${goalsAway})`
                };
            }
            if (goalsAway > goalsHome + remainingHome) {
                return {
                    winner: 'away',
                    name: awayTeamName,
                    desc: `Vitória garantida nas 5 cobranças (${goalsAway} x ${goalsHome})`
                };
            }
        }

        // Morte Súbita (quando ambos já cobraram 5 ou mais e têm mesmo número de cobranças)
        if (kicksHome >= 5 && kicksAway >= 5 && kicksHome === kicksAway) {
            if (goalsHome > goalsAway) {
                return {
                    winner: 'home',
                    name: homeTeamName,
                    desc: `Vitória na morte súbita (${goalsHome} x ${goalsAway})`
                };
            }
            if (goalsAway > goalsHome) {
                return {
                    winner: 'away',
                    name: awayTeamName,
                    desc: `Vitória na morte súbita (${goalsAway} x ${goalsHome})`
                };
            }
        }

        return null;
    }, [penaltyScore, homeKicks, awayKicks, homeTeamName, awayTeamName]);

    // Elenco do time selecionado
    const currentRoster = useMemo(() => {
        const list = selectedTeam === 'home'
            ? (rosters?.home || (rosters as any)?.home_players || [])
            : (rosters?.away || (rosters as any)?.away_players || []);
        return Array.isArray(list) ? list : [];
    }, [selectedTeam, rosters]);

    // Filtragem de jogadores no modal de escolha
    const filteredRoster = useMemo(() => {
        if (!playerFilter.trim()) return currentRoster;
        const q = playerFilter.toLowerCase().trim();
        return currentRoster.filter((p: any) => {
            const name = (p.name || '').toLowerCase();
            const nick = (p.nickname || '').toLowerCase();
            const num = String(p.number ?? p.pivot?.number ?? '');
            return name.includes(q) || nick.includes(q) || num.includes(q);
        });
    }, [currentRoster, playerFilter]);

    // Mapeamento de jogadores que já cobraram pênalti neste time (com o número da rodada)
    const alreadyKickedInfo = useMemo(() => {
        const kicks = selectedTeam === 'home' ? homeKicks : awayKicks;
        const map = new Map<string | number, number>();
        kicks.forEach((k, idx) => {
            if (k.player_id) {
                map.set(Number(k.player_id), idx + 1);
                map.set(String(k.player_id), idx + 1);
            }
        });
        return map;
    }, [selectedTeam, homeKicks, awayKicks]);

    const handleSelectTeam = (team: 'home' | 'away') => {
        setSelectedTeam(team);
        setSelectedPlayer(null);
    };

    const handleConfirmOutcome = async (outcome: 'score' | 'saved' | 'post' | 'out') => {
        // Se ainda não escolheu o jogador, abre o modal de seleção para o usuário escolher da lista!
        if (!selectedPlayer) {
            setShowPlayerModal(true);
            return;
        }

        setIsSubmitting(true);
        try {
            await onRegisterPenalty(selectedTeam, selectedPlayer, outcome);
            setSelectedPlayer(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectPlayerFromModal = (player: any) => {
        setSelectedPlayer(player);
        setShowPlayerModal(false);
        setPlayerFilter('');
        setIsAddingCustomPlayer(false);
    };

    const handleAddCustomPlayer = () => {
        if (!customPlayerName.trim()) return;
        const custom = {
            id: 'unknown',
            name: customPlayerName.trim(),
            number: customPlayerNumber.trim() || ''
        };
        setSelectedPlayer(custom);
        setCustomPlayerName('');
        setCustomPlayerNumber('');
        setIsAddingCustomPlayer(false);
        setShowPlayerModal(false);
    };

    const handleSkipPlayerIdentification = () => {
        const nextRoundNum = (selectedTeam === 'home' ? homeKicks.length : awayKicks.length) + 1;
        setSelectedPlayer({
            id: 'unknown',
            name: `Cobrador #${nextRoundNum}`,
            number: ''
        });
        setShowPlayerModal(false);
    };

    const getOutcomeBadge = (kick: any) => {
        const outcome = kick.metadata?.outcome || (kick.type === 'shootout_goal' ? 'score' : 'out');
        if (kick.type === 'shootout_goal' || outcome === 'score') {
            return {
                label: 'GOL',
                icon: '⚽',
                bg: 'bg-emerald-500',
                border: 'border-emerald-400',
                text: 'text-white'
            };
        }
        if (outcome === 'saved') {
            return {
                label: 'DEFENDEU',
                icon: '🧤',
                bg: 'bg-indigo-600',
                border: 'border-indigo-400',
                text: 'text-white'
            };
        }
        if (outcome === 'post') {
            return {
                label: 'TRAVE',
                icon: '🏁',
                bg: 'bg-amber-500',
                border: 'border-amber-300',
                text: 'text-white'
            };
        }
        return {
            label: 'FORA',
            icon: '❌',
            bg: 'bg-rose-600',
            border: 'border-rose-400',
            text: 'text-white'
        };
    };

    const currentTeamName = selectedTeam === 'home' ? homeTeamName : awayTeamName;
    const currentTeamKicksCount = selectedTeam === 'home' ? homeKicks.length : awayKicks.length;
    const nextKickNumber = currentTeamKicksCount + 1;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-2.5 sm:p-4 overflow-y-auto">
            {/* Modal Principal Compacto - Feito para caber na tela do celular sem rolagem */}
            <div className="bg-[#0b1120] w-full max-w-lg rounded-3xl border border-indigo-500/30 shadow-2xl shadow-indigo-950/60 overflow-hidden flex flex-col my-auto max-h-[96vh]">
                
                {/* 1. Header Superior Compacto */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-base shadow-inner">
                            ⚽
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h2 className="text-sm sm:text-base font-black text-white tracking-tight uppercase">
                                    Disputa de Pênaltis
                                </h2>
                                <span className="text-[9px] uppercase font-black px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                    {homeScore}x{awayScore}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400">
                                Total: {shootoutEvents.length} cobranças registradas
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {shootoutEvents.length > 0 && (
                            <button
                                onClick={() => setShowHistoryModal(true)}
                                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors border border-white/10 flex items-center gap-1 text-[11px] font-bold"
                                title="Ver Histórico de Cobranças"
                            >
                                <History size={13} />
                                <span className="hidden xs:inline">Histórico</span>
                                <span className="bg-white/10 px-1.5 py-0.2 rounded-full text-[9px]">
                                    {shootoutEvents.length}
                                </span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
                            title="Voltar para a Súmula"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Corpo do Painel Principal */}
                <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3 overflow-y-auto flex-1">
                    
                    {/* Banner de Vencedor (quando garantido) */}
                    {winnerInfo && (
                        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border-2 border-yellow-500/60 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-lg shadow-yellow-900/20">
                            <div className="flex items-center gap-2 truncate">
                                <div className="w-8 h-8 rounded-xl bg-yellow-400 text-black flex items-center justify-center shrink-0 shadow font-black">
                                    <Trophy size={16} />
                                </div>
                                <div className="truncate">
                                    <div className="font-black text-yellow-300 text-xs sm:text-sm uppercase tracking-wide truncate">
                                        🏆 {winnerInfo.name} Venceu!
                                    </div>
                                    <div className="text-[10px] text-yellow-200/80 truncate">
                                        {winnerInfo.desc}
                                    </div>
                                </div>
                            </div>
                            {onFinishMatch && (
                                <button
                                    onClick={onFinishMatch}
                                    className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-[11px] uppercase tracking-wider rounded-xl shadow active:scale-95 transition-all shrink-0"
                                >
                                    Encerrar
                                </button>
                            )}
                        </div>
                    )}

                    {/* Placar & Pontos das Cobranças */}
                    <div className="bg-gradient-to-b from-white/[0.04] to-transparent rounded-2xl border border-white/10 p-2.5 sm:p-3">
                        <div className="grid grid-cols-5 items-center gap-1.5">
                            {/* Mandante */}
                            <div className="col-span-2 flex flex-col items-center sm:items-start text-center sm:text-left">
                                <div className="flex items-center gap-1.5 max-w-full truncate">
                                    {homeTeamLogo ? (
                                        <img src={homeTeamLogo} alt={homeTeamName} className="w-5 h-5 sm:w-6 sm:h-6 object-contain rounded" />
                                    ) : (
                                        <div className="w-5 h-5 rounded bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-[10px] font-black text-blue-300">
                                            {homeTeamName.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="font-black text-xs sm:text-sm text-gray-100 truncate">
                                        {homeTeamName}
                                    </span>
                                </div>
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                    {homeKicks.length} {homeKicks.length === 1 ? 'batido' : 'batidos'}
                                </span>
                            </div>

                            {/* Placar Central */}
                            <div className="col-span-1 flex flex-col items-center justify-center">
                                <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-xl border border-white/10 shadow-inner">
                                    <span className="font-black text-xl sm:text-2xl text-emerald-400 tabular-nums">
                                        {penaltyScore.home}
                                    </span>
                                    <span className="text-gray-500 font-bold text-xs">×</span>
                                    <span className="font-black text-xl sm:text-2xl text-emerald-400 tabular-nums">
                                        {penaltyScore.away}
                                    </span>
                                </div>
                            </div>

                            {/* Visitante */}
                            <div className="col-span-2 flex flex-col items-center sm:items-end text-center sm:text-right">
                                <div className="flex items-center sm:flex-row-reverse gap-1.5 max-w-full truncate">
                                    {awayTeamLogo ? (
                                        <img src={awayTeamLogo} alt={awayTeamName} className="w-5 h-5 sm:w-6 sm:h-6 object-contain rounded" />
                                    ) : (
                                        <div className="w-5 h-5 rounded bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-[10px] font-black text-emerald-300">
                                            {awayTeamName.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="font-black text-xs sm:text-sm text-gray-100 truncate">
                                        {awayTeamName}
                                    </span>
                                </div>
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                    {awayKicks.length} {awayKicks.length === 1 ? 'batido' : 'batidos'}
                                </span>
                            </div>
                        </div>

                        {/* Sequência Compacta de Cobranças (Bolinhas) */}
                        <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5">
                            {/* Linha Mandante */}
                            <div className="flex items-center gap-2">
                                <span className="w-14 sm:w-16 text-[10px] font-bold text-gray-400 truncate shrink-0">
                                    {homeTeamName}
                                </span>
                                <div className="flex items-center gap-1.5 overflow-x-auto flex-1 py-0.5">
                                    {Array.from({ length: totalRounds }).map((_, idx) => {
                                        const kick = homeKicks[idx];
                                        const isNext = !kick && idx === homeKicks.length && selectedTeam === 'home';
                                        
                                        if (kick) {
                                            const badge = getOutcomeBadge(kick);
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${badge.bg} border ${badge.border} flex items-center justify-center text-[11px] font-black text-white shrink-0 shadow`}
                                                    title={`#${idx + 1} ${kick.player_name || 'Jogador'}: ${badge.label}`}
                                                >
                                                    {badge.icon}
                                                </div>
                                            );
                                        }

                                        if (isNext) {
                                            return (
                                                <div
                                                    key={idx}
                                                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px] font-black shrink-0 animate-pulse"
                                                    title="Próxima cobrança do mandante"
                                                >
                                                    #{idx + 1}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={idx}
                                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg border border-white/10 bg-white/[0.02] text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0"
                                            >
                                                {idx + 1}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Linha Visitante */}
                            <div className="flex items-center gap-2">
                                <span className="w-14 sm:w-16 text-[10px] font-bold text-gray-400 truncate shrink-0">
                                    {awayTeamName}
                                </span>
                                <div className="flex items-center gap-1.5 overflow-x-auto flex-1 py-0.5">
                                    {Array.from({ length: totalRounds }).map((_, idx) => {
                                        const kick = awayKicks[idx];
                                        const isNext = !kick && idx === awayKicks.length && selectedTeam === 'away';
                                        
                                        if (kick) {
                                            const badge = getOutcomeBadge(kick);
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg ${badge.bg} border ${badge.border} flex items-center justify-center text-[11px] font-black text-white shrink-0 shadow`}
                                                    title={`#${idx + 1} ${kick.player_name || 'Jogador'}: ${badge.label}`}
                                                >
                                                    {badge.icon}
                                                </div>
                                            );
                                        }

                                        if (isNext) {
                                            return (
                                                <div
                                                    key={idx}
                                                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg border-2 border-dashed border-emerald-400 bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px] font-black shrink-0 animate-pulse"
                                                    title="Próxima cobrança do visitante"
                                                >
                                                    #{idx + 1}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={idx}
                                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg border border-white/10 bg-white/[0.02] text-gray-600 flex items-center justify-center text-[10px] font-bold shrink-0"
                                            >
                                                {idx + 1}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Área de Ação Principal: 1. Time -> 2. Jogador -> 3. Resultado */}
                    <div className="bg-[#111827] border border-white/10 rounded-2xl p-3 sm:p-3.5 space-y-2.5 shadow-xl">
                        
                        {/* 1. Escolha do Time Cobrador */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                                    1. Time que vai bater
                                </label>
                                <span className="text-[10px] font-bold text-gray-400">
                                    Cobrança #{nextKickNumber}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleSelectTeam('home')}
                                    className={`py-2 px-3 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center justify-between transition-all ${
                                        selectedTeam === 'home'
                                            ? 'bg-blue-600/30 border-blue-500 text-white shadow-lg shadow-blue-900/30'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    <span className="truncate">{homeTeamName}</span>
                                    {selectedTeam === 'home' && (
                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-blue-500 text-white shrink-0 ml-1">
                                            VEZ
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={() => handleSelectTeam('away')}
                                    className={`py-2 px-3 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center justify-between transition-all ${
                                        selectedTeam === 'away'
                                            ? 'bg-emerald-600/30 border-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    <span className="truncate">{awayTeamName}</span>
                                    {selectedTeam === 'away' && (
                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500 text-white shrink-0 ml-1">
                                            VEZ
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* 2. Escolha do Jogador Cobrador (Abre em Modal!) */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                                    2. Jogador Batedor
                                </label>
                                <span className="text-[10px] text-gray-400">
                                    {currentRoster.length} jogador(es) no time
                                </span>
                            </div>

                            {selectedPlayer ? (
                                <div className="w-full p-2.5 rounded-xl border border-indigo-500/60 bg-indigo-950/40 text-white flex items-center justify-between shadow-md">
                                    <div className="flex items-center gap-2.5 truncate">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-600 border border-indigo-400 flex items-center justify-center font-black text-xs text-white shrink-0 shadow">
                                            {selectedPlayer.number ? `#${selectedPlayer.number}` : '⚽'}
                                        </div>
                                        <div className="truncate text-left">
                                            <div className="text-xs font-black text-white truncate">
                                                {selectedPlayer.nickname || selectedPlayer.name}
                                            </div>
                                            <div className="text-[9px] text-indigo-300 font-bold">
                                                {selectedPlayer.number ? `Camisa #${selectedPlayer.number}` : 'Cobrador Selecionado'}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowPlayerModal(true)}
                                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-gray-200 transition-colors shrink-0 ml-2"
                                    >
                                        Trocar
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowPlayerModal(true)}
                                    className="w-full p-3 rounded-xl border-2 border-dashed border-indigo-500/50 bg-indigo-500/10 hover:bg-indigo-500/20 text-white flex items-center justify-between transition-all group active:scale-[0.99]"
                                >
                                    <div className="flex items-center gap-2.5 truncate">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform shrink-0">
                                            <UserPlus size={16} />
                                        </div>
                                        <div className="text-left truncate">
                                            <div className="text-xs font-black text-white truncate">
                                                Escolher Batedor ({currentTeamName})
                                            </div>
                                            <div className="text-[9px] text-indigo-300 font-medium">
                                                Toque para abrir a lista de jogadores
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-lg shrink-0">
                                        <span>Lista</span>
                                        <ArrowRight size={12} />
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* 3. Botões Grandes de Resultado da Cobrança */}
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block mb-1.5">
                                3. Resultado da Cobrança
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {/* GOL */}
                                <button
                                    disabled={isSubmitting}
                                    onClick={() => handleConfirmOutcome('score')}
                                    className="py-3 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-black text-white text-sm border-b-4 border-emerald-900 shadow-md shadow-emerald-950/40 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="text-xl">⚽</span>
                                    <span>GOL</span>
                                </button>

                                {/* DEFENDEU */}
                                <button
                                    disabled={isSubmitting}
                                    onClick={() => handleConfirmOutcome('saved')}
                                    className="py-3 px-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 rounded-xl font-black text-white text-xs sm:text-sm border-b-4 border-indigo-900 shadow-md shadow-indigo-950/40 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <span className="text-xl">🧤</span>
                                    <span>DEFENDEU</span>
                                </button>

                                {/* NA TRAVE */}
                                <button
                                    disabled={isSubmitting}
                                    onClick={() => handleConfirmOutcome('post')}
                                    className="py-3 px-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 rounded-xl font-black text-white text-xs sm:text-sm border-b-4 border-amber-900 shadow-md shadow-amber-950/40 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <span className="text-xl">🏁</span>
                                    <span>NA TRAVE</span>
                                </button>

                                {/* PRA FORA */}
                                <button
                                    disabled={isSubmitting}
                                    onClick={() => handleConfirmOutcome('out')}
                                    className="py-3 px-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-xl font-black text-white text-xs sm:text-sm border-b-4 border-rose-900 shadow-md shadow-rose-950/40 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <span className="text-xl">❌</span>
                                    <span>PRA FORA</span>
                                </button>
                            </div>
                        </div>

                    </div>

                </div>

                {/* Footer do Modal Principal */}
                <div className="px-3.5 py-2.5 bg-slate-900 border-t border-white/10 flex items-center justify-between gap-2 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                    >
                        Voltar para a Súmula
                    </button>

                    {onFinishMatch && (
                        <button
                            onClick={onFinishMatch}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg active:scale-95 transition-all"
                        >
                            Encerrar Partida
                        </button>
                    )}
                </div>

            </div>

            {/* ========================================================= */}
            {/* MODAL 1: ESCOLHA DO BATEDOR DA LISTA DE JOGADORES DO TIME */}
            {/* ========================================================= */}
            {showPlayerModal && (
                <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4">
                    <div className="bg-[#0f172a] w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-indigo-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in slide-in-from-bottom-6 duration-200">
                        
                        {/* Header do Modal de Jogadores */}
                        <div className="p-3.5 sm:p-4 border-b border-white/10 bg-slate-900 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 truncate">
                                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-black shrink-0">
                                    <Users size={16} />
                                </div>
                                <div className="truncate text-left">
                                    <h3 className="font-black text-sm text-white uppercase tracking-tight truncate">
                                        Escolha o Batedor
                                    </h3>
                                    <p className="text-[10px] text-emerald-400 font-bold uppercase truncate">
                                        {currentTeamName}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowPlayerModal(false);
                                    setPlayerFilter('');
                                    setIsAddingCustomPlayer(false);
                                }}
                                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Campo de Busca Rápida */}
                        {currentRoster.length > 5 && (
                            <div className="p-2.5 bg-black/30 border-b border-white/5 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        placeholder="Filtrar por nome ou número..."
                                        value={playerFilter}
                                        onChange={e => setPlayerFilter(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                                    />
                                    {playerFilter && (
                                        <button
                                            onClick={() => setPlayerFilter('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Lista de Jogadores do Elenco */}
                        <div className="p-3 overflow-y-auto space-y-1.5 flex-1 max-h-[55vh]">
                            {filteredRoster.length === 0 ? (
                                <div className="py-8 text-center text-gray-400 text-xs space-y-2">
                                    <p>Nenhum jogador encontrado para {currentTeamName}.</p>
                                    <button
                                        onClick={() => setIsAddingCustomPlayer(true)}
                                        className="text-xs text-indigo-400 underline font-bold"
                                    >
                                        Cadastrar batedor avulso
                                    </button>
                                </div>
                            ) : (
                                filteredRoster.map((player: any) => {
                                    const number = player.number ?? player.pivot?.number ?? '';
                                    const name = player.nickname || player.name || 'Jogador';
                                    const isSelected = selectedPlayer?.id === player.id;
                                    const roundKicked = alreadyKickedInfo.get(player.id) ?? alreadyKickedInfo.get(String(player.id));

                                    return (
                                        <button
                                            key={player.id}
                                            onClick={() => handleSelectPlayerFromModal(player)}
                                            className={`w-full p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all active:scale-[0.99] text-left ${
                                                isSelected
                                                    ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-md'
                                                    : roundKicked
                                                        ? 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/5'
                                                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 truncate">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                                    isSelected ? 'bg-indigo-500 text-white' : 'bg-black/40 text-gray-300 border border-white/5'
                                                }`}>
                                                    {number ? `#${number}` : '•'}
                                                </div>
                                                <div className="truncate">
                                                    <div className="text-xs font-black truncate">
                                                        {name}
                                                    </div>
                                                    {player.nickname && player.name && player.nickname !== player.name && (
                                                        <div className="text-[10px] text-gray-400 truncate">
                                                            {player.name}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex items-center gap-1.5">
                                                {roundKicked ? (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                        Já cobrou (#{roundKicked})
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                                                        Selecionar
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Rodapé do Modal de Jogadores: Cobrador Avulso ou Pular */}
                        <div className="p-3 bg-slate-900 border-t border-white/10 space-y-2 shrink-0">
                            {isAddingCustomPlayer ? (
                                <div className="space-y-2 p-2.5 bg-black/40 rounded-xl border border-indigo-500/40">
                                    <div className="text-[11px] font-bold text-indigo-300">
                                        Cobrador Não Listado:
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Nº"
                                            value={customPlayerNumber}
                                            onChange={e => setCustomPlayerNumber(e.target.value)}
                                            className="w-16 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs text-center focus:outline-none focus:border-indigo-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Nome do batedor..."
                                            value={customPlayerName}
                                            onChange={e => setCustomPlayerName(e.target.value)}
                                            className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingCustomPlayer(false)}
                                            className="px-2.5 py-1 text-[11px] text-gray-400 hover:text-white"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!customPlayerName.trim()}
                                            onClick={handleAddCustomPlayer}
                                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg"
                                        >
                                            Confirmar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between text-xs">
                                    <button
                                        onClick={() => setIsAddingCustomPlayer(true)}
                                        className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 text-[11px]"
                                    >
                                        <UserPlus size={12} />
                                        <span>Batedor não listado</span>
                                    </button>

                                    <button
                                        onClick={handleSkipPlayerIdentification}
                                        className="text-gray-400 hover:text-white font-bold text-[11px] underline"
                                    >
                                        Cobrador #{nextKickNumber} (sem nome)
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 2: HISTÓRICO DETALHADO E CORREÇÃO DE COBRANÇAS     */}
            {/* ========================================================= */}
            {showHistoryModal && (
                <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4">
                    <div className="bg-[#0f172a] w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-indigo-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in slide-in-from-bottom-6 duration-200">
                        
                        <div className="p-3.5 sm:p-4 border-b border-white/10 bg-slate-900 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
                                    <History size={16} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-black text-sm text-white uppercase tracking-tight">
                                        Histórico das Cobranças
                                    </h3>
                                    <p className="text-[10px] text-gray-400">
                                        {shootoutEvents.length} cobranças registradas
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-3 overflow-y-auto space-y-1.5 flex-1 max-h-[60vh]">
                            {shootoutEvents.length === 0 ? (
                                <div className="py-8 text-center text-gray-500 text-xs">
                                    Nenhuma cobrança registrada ainda.
                                </div>
                            ) : (
                                shootoutEvents.map((kick, idx) => {
                                    const badge = getOutcomeBadge(kick);
                                    const teamLabel = kick.team === 'home' ? homeTeamName : awayTeamName;
                                    return (
                                        <div
                                            key={kick.id || idx}
                                            className="flex items-center justify-between p-2.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl border border-white/5 text-xs transition-colors"
                                        >
                                            <div className="flex items-center gap-2.5 truncate">
                                                <div className={`w-6 h-6 rounded-lg ${badge.bg} flex items-center justify-center text-xs shrink-0`}>
                                                    {badge.icon}
                                                </div>
                                                <div className="truncate text-left">
                                                    <div className="font-black text-white truncate">
                                                        #{idx + 1} {kick.player_name || 'Jogador'}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400 truncate">
                                                        {teamLabel}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                    kick.type === 'shootout_goal' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                                                }`}>
                                                    {badge.label}
                                                </span>
                                                <button
                                                    onClick={() => onDeletePenalty(kick.id, kick.type, kick.team)}
                                                    className="p-1.5 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 rounded-lg transition-colors"
                                                    title="Excluir esta cobrança (corrigir erro)"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="p-3 bg-slate-900 border-t border-white/10 flex justify-end shrink-0">
                            <button
                                onClick={() => setShowHistoryModal(false)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                            >
                                Fechar
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
