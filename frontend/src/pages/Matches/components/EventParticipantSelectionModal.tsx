import { useState, useMemo } from 'react';
import { X, Search, Users, Briefcase, AlertTriangle, Flag, ShieldAlert, AlertCircle } from 'lucide-react';

export interface Participant {
    id?: number | string | null;
    name: string;
    nickname?: string;
    number?: string | number;
    position?: string;
    role?: string;
    is_staff?: boolean;
    isOwnGoal?: boolean;
    isOpponent?: boolean;
}

export interface EventParticipantSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamName: string;
    teamId?: number;
    eventType: string | null;
    roster: any[];
    staff?: any[];
    events: any[];
    onSelect: (participant: Participant, alsoApplyRed?: boolean) => void;
    onToggleOwnGoal?: () => void;
    isSelectingOwnGoal?: boolean;
    allowTeamFoul?: boolean;
    onSelectTeamFoul?: () => void;
}

export function EventParticipantSelectionModal({
    isOpen,
    onClose,
    teamName,
    eventType,
    roster = [],
    staff = [],
    events = [],
    onSelect,
    onToggleOwnGoal,
    isSelectingOwnGoal = false,
    allowTeamFoul = false,
    onSelectTeamFoul,
}: EventParticipantSelectionModalProps) {
    const [activeTab, setActiveTab] = useState<'players' | 'staff'>('players');
    const [searchTerm, setSearchTerm] = useState('');
    const [pendingExpulsion, setPendingExpulsion] = useState<{ participant: Participant; currentYellows: number } | null>(null);

    if (!isOpen) return null;

    // Helper to compute participant match stats from events
    const getParticipantStats = (participant: any, isStaff: boolean) => {
        let yellowCards = 0;
        let redCards = 0;
        let blueCards = 0;
        let fouls = 0;
        let suspensions = 0;

        const partId = participant.id ? Number(participant.id) : null;
        const partName = (participant.name || '').trim().toLowerCase();
        const partNick = (participant.nickname || '').trim().toLowerCase();

        for (const ev of events) {
            const evPlayerId = ev.player_id ? Number(ev.player_id) : null;
            const evPlayerName = (ev.player_name || '').trim().toLowerCase();
            const evStaffName = (ev.metadata?.staff_name || '').trim().toLowerCase();
            const isEvStaff = ev.metadata?.is_staff === true || !!ev.metadata?.staff_name;

            let matches = false;

            if (isStaff) {
                // Must match staff
                if (isEvStaff) {
                    if (evStaffName && evStaffName === partName) matches = true;
                    else if (evPlayerName && evPlayerName.includes(partName)) matches = true;
                } else if (!evPlayerId && evPlayerName && evPlayerName.includes(partName)) {
                    matches = true;
                }
            } else {
                // Athlete matching
                if (!isEvStaff) {
                    if (partId && evPlayerId && partId === evPlayerId) matches = true;
                    else if (partName && evPlayerName === partName) matches = true;
                    else if (partNick && evPlayerName === partNick) matches = true;
                }
            }

            if (matches) {
                if (ev.type === 'yellow_card') yellowCards++;
                else if (ev.type === 'red_card') redCards++;
                else if (ev.type === 'blue_card') blueCards++;
                else if (['foul', 'tiro_7m', 'tiro_livre', 'technical_foul'].includes(ev.type)) fouls++;
                else if (ev.type === 'suspension_2min') suspensions++;
            }
        }

        return { yellowCards, redCards, blueCards, fouls, suspensions };
    };

    const filteredPlayers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return (roster || []).filter((p: any) => {
            if (!query) return true;
            const name = (p.name || '').toLowerCase();
            const nick = (p.nickname || '').toLowerCase();
            const num = String(p.number || p.pivot?.number || '');
            const pos = (p.position || '').toLowerCase();
            return name.includes(query) || nick.includes(query) || num.includes(query) || pos.includes(query);
        });
    }, [roster, searchTerm]);

    const filteredStaff = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return (staff || []).filter((s: any) => {
            if (!query) return true;
            const name = (s.name || '').toLowerCase();
            const role = (s.role || '').toLowerCase();
            return name.includes(query) || role.includes(query);
        });
    }, [staff, searchTerm]);

    const handleParticipantClick = (participant: any, isStaff: boolean) => {
        const stats = getParticipantStats(participant, isStaff);
        const formatted: Participant = isStaff
            ? {
                id: null,
                name: participant.name,
                role: participant.role || 'Comissão Técnica',
                is_staff: true,
            }
            : {
                ...participant,
                is_staff: false,
                isOwnGoal: isSelectingOwnGoal,
            };

        // If launching a yellow card and participant already has 1 yellow card -> trigger Expulsion Dialog
        if (eventType === 'yellow_card' && stats.yellowCards >= 1) {
            setPendingExpulsion({
                participant: formatted,
                currentYellows: stats.yellowCards,
            });
            return;
        }

        onSelect(formatted, false);
    };

    const eventTitleMap: Record<string, { label: string; color: string; icon: string }> = {
        goal: { label: 'Gol', color: 'text-emerald-400', icon: '⚽' },
        yellow_card: { label: 'Cartão Amarelo', color: 'text-yellow-400', icon: '🟨' },
        red_card: { label: 'Cartão Vermelho', color: 'text-red-500', icon: '🟥' },
        blue_card: { label: 'Cartão Azul', color: 'text-blue-400', icon: '🟦' },
        foul: { label: 'Falta', color: 'text-amber-400', icon: '🚩' },
        assist: { label: 'Assistência', color: 'text-indigo-400', icon: '👟' },
        suspension_2min: { label: 'Exclusão 2 Min', color: 'text-cyan-400', icon: '⏱️' },
        tiro_7m: { label: 'Tiro de 7m', color: 'text-purple-400', icon: '🎯' },
        tiro_livre: { label: 'Tiro Livre', color: 'text-gray-300', icon: '⚡' },
        mvp: { label: 'Craque / MVP', color: 'text-yellow-300', icon: '⭐' },
    };

    const currentEventInfo = eventType ? (eventTitleMap[eventType] || { label: eventType.replace('_', ' '), color: 'text-white', icon: '📋' }) : null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-[#111827] w-full max-w-lg sm:rounded-3xl rounded-t-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]">
                
                {/* Header */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-900 via-gray-850 to-gray-900 border-b border-white/10 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        {currentEventInfo && (
                            <span className="text-2xl sm:text-3xl p-2 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center shadow-inner">
                                {currentEventInfo.icon}
                            </span>
                        )}
                        <div>
                            <h3 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                                {isSelectingOwnGoal ? (
                                    <span className="text-red-400 flex items-center gap-1.5">
                                        <AlertCircle size={18} /> Gol Contra — Quem marcou?
                                    </span>
                                ) : (
                                    <span>
                                        Lançar <span className={currentEventInfo?.color || 'text-indigo-400'}>{currentEventInfo?.label || 'Evento'}</span>
                                    </span>
                                )}
                            </h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                                {teamName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-2xl transition-colors border border-white/5"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs: Jogadores vs Comissão Técnica */}
                <div className="px-4 pt-3 pb-2 border-b border-white/5 bg-[#0e1420]">
                    <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
                        <button
                            type="button"
                            onClick={() => setActiveTab('players')}
                            className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                activeTab === 'players'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                            }`}
                        >
                            <Users size={15} />
                            <span>Jogadores</span>
                            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${activeTab === 'players' ? 'bg-indigo-700 text-white' : 'bg-white/10 text-gray-400'}`}>
                                {roster.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('staff')}
                            className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                activeTab === 'staff'
                                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                            }`}
                        >
                            <Briefcase size={15} />
                            <span>Comissão Técnica</span>
                            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono ${activeTab === 'staff' ? 'bg-amber-700 text-white' : 'bg-white/10 text-gray-400'}`}>
                                {staff.length}
                            </span>
                        </button>
                    </div>

                    {/* Search bar */}
                    <div className="relative mt-2.5">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={activeTab === 'players' ? 'Buscar jogador por nome, apelido ou número...' : 'Buscar membro da comissão por nome ou cargo...'}
                            className="w-full pl-9 pr-4 py-2 bg-black/30 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Sub-actions (e.g. Gol Contra or Falta Coletiva) */}
                <div className="px-4 pt-3">
                    {eventType === 'goal' && onToggleOwnGoal && (
                        <button
                            onClick={onToggleOwnGoal}
                            className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all active:scale-[0.99] font-bold text-xs uppercase mb-1 ${
                                isSelectingOwnGoal
                                    ? 'bg-red-950/60 border-red-700 text-red-300'
                                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-400 hover:text-white'
                            }`}
                        >
                            <AlertCircle size={15} className={isSelectingOwnGoal ? 'text-red-400' : 'text-gray-500'} />
                            <span>{isSelectingOwnGoal ? 'Selecionando Gol Contra (Clique para Voltar)' : 'Marcar como Gol Contra'}</span>
                        </button>
                    )}

                    {eventType === 'foul' && allowTeamFoul && onSelectTeamFoul && (
                        <button
                            onClick={onSelectTeamFoul}
                            className="w-full py-2.5 px-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 text-gray-300 hover:text-white transition-all active:scale-[0.99] font-bold text-xs uppercase mb-1"
                        >
                            <Users size={15} className="text-amber-400" />
                            <span>Falta Coletiva / da Equipe</span>
                        </button>
                    )}
                </div>

                {/* Main List */}
                <div className="overflow-y-auto p-4 flex-1 space-y-1.5 custom-scrollbar">
                    {activeTab === 'players' ? (
                        filteredPlayers.length === 0 ? (
                            <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <Users className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-40" />
                                <p className="text-sm font-bold text-gray-400">Nenhum jogador encontrado.</p>
                                <p className="text-xs text-gray-600 mt-1">Verifique os filtros de busca ou o elenco do time.</p>
                            </div>
                        ) : (
                            filteredPlayers.map((player: any) => {
                                const stats = getParticipantStats(player, false);
                                const isSuspended = stats.redCards > 0;
                                const isHanging = stats.yellowCards === 1;

                                return (
                                    <button
                                        key={player.id || player.name}
                                        onClick={() => handleParticipantClick(player, false)}
                                        className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group border text-left active:scale-[0.99] ${
                                            isSelectingOwnGoal
                                                ? 'bg-red-950/30 hover:bg-red-900/40 border-red-800/30 hover:border-red-600/50'
                                                : isSuspended
                                                    ? 'bg-red-950/20 border-red-900/40 opacity-75'
                                                    : isHanging
                                                        ? 'bg-yellow-950/20 hover:bg-yellow-950/40 border-yellow-700/30 hover:border-yellow-600/60'
                                                        : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-indigo-600/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {/* Number */}
                                            <div
                                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 font-mono transition-colors shadow-inner ${
                                                    isSelectingOwnGoal
                                                        ? 'bg-red-700/60 text-red-100'
                                                        : isSuspended
                                                            ? 'bg-red-900/60 text-red-200'
                                                            : isHanging
                                                                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                                                : 'bg-white/10 text-gray-300 group-hover:bg-indigo-600 group-hover:text-white'
                                                }`}
                                            >
                                                {player.number || player.pivot?.number || '#'}
                                            </div>

                                            {/* Name & Position */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-sm text-gray-100 group-hover:text-white truncate">
                                                        {player.name}
                                                    </span>
                                                    {player.nickname && (
                                                        <span className="text-[11px] font-medium text-gray-400 truncate">
                                                            ({player.nickname})
                                                        </span>
                                                    )}
                                                    {isHanging && (
                                                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-1">
                                                            <AlertTriangle size={10} /> 1 Amarelo
                                                        </span>
                                                    )}
                                                    {isSuspended && (
                                                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-red-600/20 text-red-300 border border-red-600/30 flex items-center gap-1">
                                                            <ShieldAlert size={10} /> Expulso
                                                        </span>
                                                    )}
                                                </div>
                                                {player.position && (
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-tight block">
                                                        {player.position}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Icons of Match Stats (Fouls & Cards) */}
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                            {/* Fouls */}
                                            {stats.fouls > 0 && (
                                                <div
                                                    className="flex items-center gap-0.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400"
                                                    title={`${stats.fouls} falta(s) cometida(s) no jogo`}
                                                >
                                                    {stats.fouls <= 4 ? (
                                                        Array.from({ length: stats.fouls }).map((_, i) => (
                                                            <span key={i} className="text-xs">🚩</span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs font-black flex items-center gap-0.5">
                                                            🚩 <span className="font-mono text-[11px]">x{stats.fouls}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Yellow Cards */}
                                            {stats.yellowCards > 0 && (
                                                <div
                                                    className="flex items-center gap-0.5 px-1.5 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                                                    title={`${stats.yellowCards} cartão(ões) amarelo(s)`}
                                                >
                                                    {Array.from({ length: Math.min(stats.yellowCards, 2) }).map((_, i) => (
                                                        <span key={i} className="text-sm">🟨</span>
                                                    ))}
                                                    {stats.yellowCards > 2 && (
                                                        <span className="text-[10px] font-mono font-bold text-yellow-300">x{stats.yellowCards}</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Blue Cards */}
                                            {stats.blueCards > 0 && (
                                                <div
                                                    className="flex items-center gap-0.5 px-1.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg"
                                                    title={`${stats.blueCards} cartão(ões) azul`}
                                                >
                                                    <span className="text-sm">🟦</span>
                                                </div>
                                            )}

                                            {/* 2min Suspensions (Handball) */}
                                            {stats.suspensions > 0 && (
                                                <div
                                                    className="px-1.5 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-[10px] font-black font-mono text-cyan-300"
                                                    title={`${stats.suspensions} exclusão(ões) de 2 min`}
                                                >
                                                    ⏱️ {stats.suspensions}x2'
                                                </div>
                                            )}

                                            {/* Red Cards */}
                                            {stats.redCards > 0 && (
                                                <div
                                                    className="flex items-center gap-0.5 px-1.5 py-1 bg-red-600/15 border border-red-600/40 rounded-lg"
                                                    title="Cartão Vermelho (Expulso)"
                                                >
                                                    <span className="text-sm">🟥</span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )
                    ) : (
                        filteredStaff.length === 0 ? (
                            <div className="p-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <Briefcase className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-40" />
                                <p className="text-sm font-bold text-gray-400">Nenhum membro da comissão técnica.</p>
                                <p className="text-xs text-gray-600 mt-1 max-w-xs mx-auto">
                                    Cadastre técnico, assistente, massagista ou preparador no gerenciamento de equipes.
                                </p>
                            </div>
                        ) : (
                            filteredStaff.map((member: any) => {
                                const stats = getParticipantStats(member, true);
                                const isSuspended = stats.redCards > 0;
                                const isHanging = stats.yellowCards === 1;

                                return (
                                    <button
                                        key={member.id || member.name}
                                        onClick={() => handleParticipantClick(member, true)}
                                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all group border text-left active:scale-[0.99] ${
                                            isSuspended
                                                ? 'bg-red-950/20 border-red-900/40 opacity-75'
                                                : isHanging
                                                    ? 'bg-yellow-950/20 hover:bg-yellow-950/40 border-yellow-700/30 hover:border-yellow-600/60'
                                                    : 'bg-white/5 hover:bg-amber-950/20 border-white/5 hover:border-amber-600/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {/* Staff Icon Badge */}
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-lg shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                                                👔
                                            </div>

                                            {/* Name & Role */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-sm text-gray-100 group-hover:text-amber-200 truncate">
                                                        {member.name}
                                                    </span>
                                                    {isHanging && (
                                                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-1">
                                                            <AlertTriangle size={10} /> 1 Amarelo
                                                        </span>
                                                    )}
                                                    {isSuspended && (
                                                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-red-600/20 text-red-300 border border-red-600/30 flex items-center gap-1">
                                                            <ShieldAlert size={10} /> Expulso
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                                        {member.role || 'Comissão Técnica'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Icons of Match Stats */}
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                            {stats.fouls > 0 && (
                                                <div
                                                    className="flex items-center gap-0.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400"
                                                    title={`${stats.fouls} falta(s)`}
                                                >
                                                    {stats.fouls <= 3 ? (
                                                        Array.from({ length: stats.fouls }).map((_, i) => (
                                                            <span key={i} className="text-xs">🚩</span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs font-black">🚩 x{stats.fouls}</span>
                                                    )}
                                                </div>
                                            )}

                                            {stats.yellowCards > 0 && (
                                                <div
                                                    className="flex items-center gap-0.5 px-1.5 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                                                    title={`${stats.yellowCards} cartão(ões) amarelo(s)`}
                                                >
                                                    {Array.from({ length: Math.min(stats.yellowCards, 2) }).map((_, i) => (
                                                        <span key={i} className="text-sm">🟨</span>
                                                    ))}
                                                </div>
                                            )}

                                            {stats.blueCards > 0 && (
                                                <div
                                                    className="flex items-center gap-0.5 px-1.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg"
                                                    title={`${stats.blueCards} cartão(ões) azul`}
                                                >
                                                    <span className="text-sm">🟦</span>
                                                </div>
                                            )}

                                            {stats.redCards > 0 && (
                                                <div
                                                    className="flex items-center gap-0.5 px-1.5 py-1 bg-red-600/15 border border-red-600/40 rounded-lg"
                                                    title="Cartão Vermelho (Expulso)"
                                                >
                                                    <span className="text-sm">🟥</span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        )
                    )}
                </div>
            </div>

            {/* EXPULSION CONFIRMATION DIALOG (2º Cartão Amarelo -> Expulsão) */}
            {pendingExpulsion && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-[#151c2d] w-full max-w-md rounded-3xl border-2 border-red-600/50 shadow-2xl p-6 text-center space-y-4">
                        <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 mx-auto flex items-center justify-center text-3xl shadow-lg shadow-red-950/50">
                            ⚠️
                        </div>

                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-950/60 border border-red-800/40 px-3 py-1 rounded-full">
                                2º Cartão Amarelo Detectado
                            </span>
                            <h3 className="text-xl font-black text-white mt-2">
                                Expulsão de {pendingExpulsion.participant.name}
                            </h3>
                            <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                                Este {pendingExpulsion.participant.is_staff ? 'membro da comissão' : 'atleta'} <b>já possui 1 cartão amarelo</b> nesta partida.
                                Segundo a regra, o 2º cartão amarelo resulta em <b>Cartão Vermelho (Expulsão)</b>.
                            </p>
                        </div>

                        <div className="p-3 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center gap-3">
                            <span className="text-2xl">🟨</span>
                            <span className="text-gray-400 font-bold text-sm">➔</span>
                            <span className="text-2xl">🟥</span>
                            <span className="text-xs font-bold text-red-300 ml-1">Expulsão da Partida</span>
                        </div>

                        <div className="space-y-2 pt-2">
                            {/* Option 1: Apply Yellow + Automatically Apply Red */}
                            <button
                                type="button"
                                onClick={() => {
                                    const p = pendingExpulsion.participant;
                                    setPendingExpulsion(null);
                                    onSelect(p, true); // true = alsoApplyRed
                                }}
                                className="w-full py-4 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-red-950/50 border border-red-500/40 flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                <span>🟥 Confirmar 2º Amarelo + Lançar Vermelho</span>
                            </button>

                            {/* Option 2: Apply Yellow only */}
                            <button
                                type="button"
                                onClick={() => {
                                    const p = pendingExpulsion.participant;
                                    setPendingExpulsion(null);
                                    onSelect(p, false);
                                }}
                                className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-yellow-400 border border-yellow-500/30 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
                            >
                                <span>🟨 Registrar apenas o 2º Amarelo</span>
                            </button>

                            {/* Option 3: Cancel */}
                            <button
                                type="button"
                                onClick={() => setPendingExpulsion(null)}
                                className="w-full py-2.5 text-gray-500 hover:text-gray-300 font-bold text-xs uppercase tracking-widest transition-colors"
                            >
                                Cancelar Lançamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
