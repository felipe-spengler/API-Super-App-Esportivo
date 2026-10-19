import React, { useState, useMemo } from 'react';
import { X, Check, Trash2, Trophy, Users, Shield, Loader2, UserPlus, AlertCircle } from 'lucide-react';

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

    // Extrair cobranças em ordem cronológica (id crescente)
    const shootoutEvents = useMemo(() => {
        return events
            .filter(e => e.type === 'shootout_goal' || e.type === 'shootout_miss')
            .sort((a, b) => Number(a.id) - Number(b.id));
    }, [events]);

    const homeKicks = useMemo(() => shootoutEvents.filter(e => e.team === 'home'), [shootoutEvents]);
    const awayKicks = useMemo(() => shootoutEvents.filter(e => e.team === 'away'), [shootoutEvents]);

    // Determinar o próximo time a bater
    // Padrão alternado: se Mandante bateu mais que Visitante, a vez é do Visitante
    const defaultNextTeam: 'home' | 'away' = homeKicks.length <= awayKicks.length ? 'home' : 'away';

    const [selectedTeam, setSelectedTeam] = useState<'home' | 'away'>(defaultNextTeam);
    const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
    const [customPlayerName, setCustomPlayerName] = useState('');
    const [isCustomPlayer, setIsCustomPlayer] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filterQuery, setFilterQuery] = useState('');

    // Ajustar número total de slots (mínimo 5 rodadas regulamentares, expande nas alternadas)
    const maxKicks = Math.max(homeKicks.length, awayKicks.length);
    const totalRounds = Math.max(5, maxKicks + (homeKicks.length === awayKicks.length ? 1 : 0));

    // Cálculos de vencedor (Matemático nas 5 primeiras ou Morte Súbita)
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
                    desc: `Vitória garantida nas cobranças normais (${goalsHome} x ${goalsAway})`
                };
            }
            if (goalsAway > goalsHome + remainingHome) {
                return {
                    winner: 'away',
                    name: awayTeamName,
                    desc: `Vitória garantida nas cobranças normais (${goalsAway} x ${goalsHome})`
                };
            }
        }

        // Alternadas / Morte Súbita (quando ambos já cobraram 5 ou mais e têm o mesmo número de cobranças)
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

    // Elenco do time atualmente selecionado
    const currentRoster = useMemo(() => {
        const list = selectedTeam === 'home' ? (rosters.home || []) : (rosters.away || []);
        if (!filterQuery.trim()) return list;
        const q = filterQuery.toLowerCase();
        return list.filter((p: any) =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.nickname && p.nickname.toLowerCase().includes(q)) ||
            (p.number && String(p.number).includes(q))
        );
    }, [selectedTeam, rosters, filterQuery]);

    // IDs de jogadores que já cobraram para destacar
    const alreadyKickedPlayerIds = useMemo(() => {
        const kicks = selectedTeam === 'home' ? homeKicks : awayKicks;
        return new Set(kicks.map(k => k.player_id).filter(Boolean));
    }, [selectedTeam, homeKicks, awayKicks]);

    const handleSelectTeam = (team: 'home' | 'away') => {
        setSelectedTeam(team);
        setSelectedPlayer(null);
        setIsCustomPlayer(false);
        setCustomPlayerName('');
        setFilterQuery('');
    };

    const handleConfirmOutcome = async (outcome: 'score' | 'saved' | 'post' | 'out') => {
        let playerToRegister = selectedPlayer;
        if (isCustomPlayer && customPlayerName.trim()) {
            playerToRegister = { id: 'unknown', name: customPlayerName.trim(), number: '' };
        } else if (!playerToRegister) {
            const nextRoundNum = (selectedTeam === 'home' ? homeKicks.length : awayKicks.length) + 1;
            playerToRegister = { id: 'unknown', name: `Cobrador #${nextRoundNum}`, number: '' };
        }

        setIsSubmitting(true);
        try {
            await onRegisterPenalty(selectedTeam, playerToRegister, outcome);

            // Alternar automaticamente para o time adversário para agilizar
            setSelectedTeam(prev => (prev === 'home' ? 'away' : 'home'));
            setSelectedPlayer(null);
            setIsCustomPlayer(false);
            setCustomPlayerName('');
            setFilterQuery('');
        } finally {
            setIsSubmitting(false);
        }
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

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[#0b1120] w-full max-w-3xl rounded-3xl border border-indigo-500/30 shadow-2xl shadow-indigo-950/60 overflow-hidden flex flex-col my-auto max-h-[92vh]">
                
                {/* Header Superior */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xl shadow-inner">
                            ⚽
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                                    Disputa de Pênaltis
                                </h2>
                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                    Desempate
                                </span>
                            </div>
                            <p className="text-xs text-gray-400">
                                Tempo Normal: {homeScore} x {awayScore}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
                        title="Fechar modal (continuar na súmula)"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
                    
                    {/* Banner de Vencedor (se houver) */}
                    {winnerInfo && (
                        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/20 border-2 border-yellow-500/60 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300 shadow-xl shadow-yellow-900/20">
                            <div className="flex items-center gap-3 text-center sm:text-left">
                                <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-black flex items-center justify-center shrink-0 shadow-lg font-black text-2xl">
                                    <Trophy size={26} />
                                </div>
                                <div>
                                    <h4 className="font-black text-yellow-300 text-base sm:text-lg uppercase tracking-wide">
                                        🏆 {winnerInfo.name} Venceu os Pênaltis!
                                    </h4>
                                    <p className="text-xs text-yellow-200/80 font-medium">
                                        {winnerInfo.desc}
                                    </p>
                                </div>
                            </div>
                            {onFinishMatch && (
                                <button
                                    onClick={onFinishMatch}
                                    className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg active:scale-95 transition-all"
                                >
                                    Encerrar Partida
                                </button>
                            )}
                        </div>
                    )}

                    {/* Placar dos Pênaltis */}
                    <div className="bg-gradient-to-b from-white/[0.04] to-transparent rounded-3xl border border-white/10 p-4 sm:p-5">
                        <div className="grid grid-cols-5 items-center gap-2">
                            {/* Mandante */}
                            <div className="col-span-2 flex flex-col items-center sm:items-start gap-1">
                                <div className="flex items-center gap-2 max-w-full">
                                    {homeTeamLogo ? (
                                        <img src={homeTeamLogo} alt={homeTeamName} className="w-7 h-7 sm:w-9 sm:h-9 object-contain rounded-lg" />
                                    ) : (
                                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs font-black text-blue-300">
                                            {homeTeamName.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="font-black text-sm sm:text-base text-gray-100 truncate text-center sm:text-left">
                                        {homeTeamName}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    {homeKicks.length} {homeKicks.length === 1 ? 'cobrança' : 'cobranças'}
                                </span>
                            </div>

                            {/* Placar Central */}
                            <div className="col-span-1 flex flex-col items-center justify-center">
                                <div className="flex items-center gap-2 sm:gap-3 bg-black/60 px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
                                    <span className="font-black text-2xl sm:text-4xl text-emerald-400 tabular-nums">
                                        {penaltyScore.home}
                                    </span>
                                    <span className="text-gray-500 font-black text-sm">×</span>
                                    <span className="font-black text-2xl sm:text-4xl text-emerald-400 tabular-nums">
                                        {penaltyScore.away}
                                    </span>
                                </div>
                            </div>

                            {/* Visitante */}
                            <div className="col-span-2 flex flex-col items-center sm:items-end gap-1">
                                <div className="flex items-center sm:flex-row-reverse gap-2 max-w-full">
                                    {awayTeamLogo ? (
                                        <img src={awayTeamLogo} alt={awayTeamName} className="w-7 h-7 sm:w-9 sm:h-9 object-contain rounded-lg" />
                                    ) : (
                                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-xs font-black text-emerald-300">
                                            {awayTeamName.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <span className="font-black text-sm sm:text-base text-gray-100 truncate text-center sm:text-right">
                                        {awayTeamName}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    {awayKicks.length} {awayKicks.length === 1 ? 'cobrança' : 'cobranças'}
                                </span>
                            </div>
                        </div>

                        {/* Quadradinhos de Progresso das Cobranças */}
                        <div className="mt-5 pt-5 border-t border-white/10 space-y-3">
                            <div className="text-[11px] font-black uppercase tracking-wider text-gray-400 text-center flex items-center justify-center gap-2">
                                <span>Sequência das Cobranças</span>
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                                    {totalRounds > 5 ? 'Alternadas / Morte Súbita' : 'Série Regular de 5'}
                                </span>
                            </div>

                            {/* Linha Mandante */}
                            <div className="bg-black/30 p-2.5 rounded-2xl border border-white/5 flex items-center gap-3">
                                <div className="w-20 sm:w-28 text-[11px] font-bold text-gray-300 truncate shrink-0">
                                    {homeTeamName}
                                </div>
                                <div className="flex items-center gap-2 overflow-x-auto flex-1 py-1">
                                    {Array.from({ length: totalRounds }).map((_, idx) => {
                                        const kick = homeKicks[idx];
                                        const isNext = !kick && idx === homeKicks.length && selectedTeam === 'home';
                                        
                                        if (kick) {
                                            const badge = getOutcomeBadge(kick);
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${badge.bg} border ${badge.border} flex flex-col items-center justify-center shadow-lg shrink-0 transition-transform hover:scale-105`}
                                                    title={`#${idx + 1} - ${kick.player_name || 'Jogador'}: ${badge.label}`}
                                                >
                                                    <span className="text-sm leading-none">{badge.icon}</span>
                                                    <span className="text-[7px] font-black uppercase tracking-tighter opacity-90 mt-0.5">
                                                        {badge.label}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        if (isNext) {
                                            return (
                                                <div
                                                    key={idx}
                                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-500/20 text-indigo-300 flex flex-col items-center justify-center shrink-0 animate-pulse"
                                                    title="Próxima cobrança deste time"
                                                >
                                                    <span className="text-xs font-black">#{idx + 1}</span>
                                                    <span className="text-[7px] font-bold uppercase">Vez</span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={idx}
                                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-white/10 bg-white/[0.02] text-gray-600 flex items-center justify-center text-xs font-bold shrink-0"
                                            >
                                                {idx + 1}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Linha Visitante */}
                            <div className="bg-black/30 p-2.5 rounded-2xl border border-white/5 flex items-center gap-3">
                                <div className="w-20 sm:w-28 text-[11px] font-bold text-gray-300 truncate shrink-0">
                                    {awayTeamName}
                                </div>
                                <div className="flex items-center gap-2 overflow-x-auto flex-1 py-1">
                                    {Array.from({ length: totalRounds }).map((_, idx) => {
                                        const kick = awayKicks[idx];
                                        const isNext = !kick && idx === awayKicks.length && selectedTeam === 'away';
                                        
                                        if (kick) {
                                            const badge = getOutcomeBadge(kick);
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${badge.bg} border ${badge.border} flex flex-col items-center justify-center shadow-lg shrink-0 transition-transform hover:scale-105`}
                                                    title={`#${idx + 1} - ${kick.player_name || 'Jogador'}: ${badge.label}`}
                                                >
                                                    <span className="text-sm leading-none">{badge.icon}</span>
                                                    <span className="text-[7px] font-black uppercase tracking-tighter opacity-90 mt-0.5">
                                                        {badge.label}
                                                    </span>
                                                </div>
                                            );
                                        }

                                        if (isNext) {
                                            return (
                                                <div
                                                    key={idx}
                                                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-500/20 text-emerald-300 flex flex-col items-center justify-center shrink-0 animate-pulse"
                                                    title="Próxima cobrança deste time"
                                                >
                                                    <span className="text-xs font-black">#{idx + 1}</span>
                                                    <span className="text-[7px] font-bold uppercase">Vez</span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={idx}
                                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-white/10 bg-white/[0.02] text-gray-600 flex items-center justify-center text-xs font-bold shrink-0"
                                            >
                                                {idx + 1}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Área de Controle: Lançar Nova Cobrança */}
                    <div className="bg-[#111827] border border-white/10 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-400">
                                🎯 Lançar Cobrança de Pênalti
                            </span>
                            <span className="text-xs font-bold text-gray-400">
                                Cobrança #{((selectedTeam === 'home' ? homeKicks.length : awayKicks.length) + 1)}
                            </span>
                        </div>

                        {/* 1. Seleção do Time que vai Bater */}
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                                1. Selecione o Time Cobrador
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleSelectTeam('home')}
                                    className={`p-3.5 rounded-2xl border-2 font-black text-sm flex items-center justify-between transition-all ${
                                        selectedTeam === 'home'
                                            ? 'bg-blue-600/30 border-blue-500 text-white shadow-lg shadow-blue-900/30 scale-[1.01]'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    <span className="truncate">{homeTeamName}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/40 text-blue-300">
                                        {homeKicks.length} batidos
                                    </span>
                                </button>

                                <button
                                    onClick={() => handleSelectTeam('away')}
                                    className={`p-3.5 rounded-2xl border-2 font-black text-sm flex items-center justify-between transition-all ${
                                        selectedTeam === 'away'
                                            ? 'bg-emerald-600/30 border-emerald-500 text-white shadow-lg shadow-emerald-900/30 scale-[1.01]'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                    }`}
                                >
                                    <span className="truncate">{awayTeamName}</span>
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/40 text-emerald-300">
                                        {awayKicks.length} batidos
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* 2. Seleção do Jogador Cobrador */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                    2. Selecione o Jogador Cobrador
                                </label>
                                <button
                                    onClick={() => {
                                        setIsCustomPlayer(!isCustomPlayer);
                                        setSelectedPlayer(null);
                                    }}
                                    className="text-[11px] font-bold text-indigo-400 hover:underline flex items-center gap-1"
                                >
                                    <UserPlus size={12} />
                                    {isCustomPlayer ? 'Voltar para Lista' : 'Cobrador Avulso'}
                                </button>
                            </div>

                            {isCustomPlayer ? (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Nome do cobrador avulso (ex: Camisa 10, Convidado...)"
                                        value={customPlayerName}
                                        onChange={e => setCustomPlayerName(e.target.value)}
                                        className="w-full px-4 py-3 bg-black/40 border border-indigo-500/40 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        autoFocus
                                    />
                                    <p className="text-[11px] text-gray-500 italic">
                                        Digite o nome do jogador se ele não estiver no elenco oficial.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {currentRoster.length > 8 && (
                                        <input
                                            type="text"
                                            placeholder="Filtrar por nome ou número..."
                                            value={filterQuery}
                                            onChange={e => setFilterQuery(e.target.value)}
                                            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                                        />
                                    )}

                                    <div className="max-h-40 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 pr-1">
                                        {currentRoster.length === 0 ? (
                                            <div className="col-span-full py-4 text-center text-xs text-gray-500">
                                                Nenhum jogador cadastrado. Você pode bater com cobrador avulso.
                                            </div>
                                        ) : (
                                            currentRoster.map((player: any) => {
                                                const isSelected = selectedPlayer?.id === player.id;
                                                const hasKicked = alreadyKickedPlayerIds.has(player.id);
                                                return (
                                                    <button
                                                        key={player.id}
                                                        onClick={() => setSelectedPlayer(player)}
                                                        className={`p-2 rounded-xl text-left border flex items-center gap-2 transition-all ${
                                                            isSelected
                                                                ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                                                                : hasKicked
                                                                    ? 'bg-white/[0.02] border-white/5 text-gray-500 opacity-60 hover:opacity-100'
                                                                    : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                                                        }`}
                                                    >
                                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                                            isSelected ? 'bg-white text-indigo-700' : 'bg-black/40 text-gray-300'
                                                        }`}>
                                                            {player.number || '#'}
                                                        </div>
                                                        <div className="truncate flex-1">
                                                            <div className="text-xs font-bold truncate">
                                                                {player.nickname || player.name}
                                                            </div>
                                                            {hasKicked && (
                                                                <div className="text-[9px] text-amber-400 font-semibold leading-tight">
                                                                    Já cobrou
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                    {selectedPlayer && (
                                        <div className="text-xs text-indigo-300 font-bold bg-indigo-950/40 border border-indigo-800/40 px-3 py-1.5 rounded-xl flex items-center justify-between">
                                            <span>
                                                Cobrador Selecionado: <b>{selectedPlayer.number ? `#${selectedPlayer.number} ` : ''}{selectedPlayer.name}</b>
                                            </span>
                                            <button
                                                onClick={() => setSelectedPlayer(null)}
                                                className="text-gray-400 hover:text-white"
                                            >
                                                Trocar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 3. Botões Grandes de Resultado */}
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                                3. Registre o Resultado da Cobrança
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {/* GOL */}
                                <button
                                    disabled={isSubmitting}
                                    onClick={() => handleConfirmOutcome('score')}
                                    className="col-span-2 sm:col-span-1 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black text-white text-base border-b-4 border-emerald-900 shadow-lg shadow-emerald-950/50 active:scale-95 disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1"
                                >
                                    <span className="text-2xl">⚽</span>
                                    <span>GOL</span>
                                </button>

                                {/* DEFENDEU */}
                                <button
                                    disabled={isSubmitting}
                                    onClick={() => handleConfirmOutcome('saved')}
                                    className="py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black text-white text-sm border-b-4 border-indigo-900 shadow-lg shadow-indigo-950/50 active:scale-95 disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1"
                                >
                                    <span className="text-2xl">🧤</span>
                                    <span>DEFENDEU</span>
                                </button>

                                {/* NA TRAVE */}
                                <button
                                    disabled={isSubmitting}
                                    onClick={() => handleConfirmOutcome('post')}
                                    className="py-4 bg-amber-600 hover:bg-amber-500 rounded-2xl font-black text-white text-sm border-b-4 border-amber-900 shadow-lg shadow-amber-950/50 active:scale-95 disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1"
                                >
                                    <span className="text-2xl">🏁</span>
                                    <span>NA TRAVE</span>
                                </button>

                                {/* PRA FORA */}
                                <button
                                    disabled={isSubmitting}
                                    onClick={() => handleConfirmOutcome('out')}
                                    className="col-span-2 sm:col-span-1 py-4 bg-rose-600 hover:bg-rose-500 rounded-2xl font-black text-white text-sm border-b-4 border-rose-900 shadow-lg shadow-rose-950/50 active:scale-95 disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1"
                                >
                                    <span className="text-2xl">❌</span>
                                    <span>PRA FORA</span>
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Histórico das Cobranças Realizadas com Opção de Excluir */}
                    {shootoutEvents.length > 0 && (
                        <div className="bg-black/30 rounded-3xl border border-white/5 p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                                <span>Histórico Detalhado ({shootoutEvents.length} cobranças)</span>
                                <span className="text-[10px] text-gray-500 italic">Clique na lixeira para corrigir se errou</span>
                            </div>

                            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                                {shootoutEvents.map((kick, idx) => {
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
                                                <div className="truncate">
                                                    <span className="font-black text-white mr-1.5">
                                                        #{idx + 1}
                                                    </span>
                                                    <span className="font-semibold text-gray-300 mr-2">
                                                        {teamLabel}:
                                                    </span>
                                                    <span className="text-gray-400 font-medium">
                                                        {kick.player_name || 'Jogador'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                                    kick.type === 'shootout_goal' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                                                }`}>
                                                    {badge.label}
                                                </span>
                                                <button
                                                    onClick={() => onDeletePenalty(kick.id, kick.type, kick.team)}
                                                    className="p-1 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 rounded-lg transition-colors"
                                                    title="Excluir cobrança"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer do Modal */}
                <div className="p-4 bg-slate-900 border-t border-white/10 flex items-center justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
                    >
                        Voltar para a Súmula
                    </button>

                    {onFinishMatch && (
                        <button
                            onClick={onFinishMatch}
                            className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
                        >
                            Encerrar Partida
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
