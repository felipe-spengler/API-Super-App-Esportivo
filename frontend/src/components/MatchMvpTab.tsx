import React, { useState, useEffect } from 'react';
import { Share2, User, Vote, Smartphone, Award, ShieldAlert, CheckCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface MatchMvpTabProps {
    match: any;
    rosters?: any;
    onVoteSubmitted?: () => void;
}

export function MatchMvpTab({ match, rosters, onVoteSubmitted }: MatchMvpTabProps) {
    const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewTime, setViewTime] = useState<number>(0);
    const [hasVotedLocal, setHasVotedLocal] = useState(false);

    const isLive = match?.status === 'live';
    const isFinished = match?.status === 'finished';
    const isMobile = window.innerWidth < 768;
    const syncTimer = match?.match_details?.sync_timer;
    const matchTime = syncTimer?.time ?? 0;
    const isPast10Min = matchTime >= 600; // 10 minutos (600 segundos)

    const sessionKey = `mvp_view_time_${match?.id}`;
    const voteKey = `mvp_voted_${match?.id}`;

    // Track active viewing time on mobile for live matches
    useEffect(() => {
        if (!isLive || !isMobile || !match?.id) return;

        // Check if already voted
        if (localStorage.getItem(voteKey)) {
            setHasVotedLocal(true);
            return;
        }

        const stored = sessionStorage.getItem(sessionKey);
        let current = stored ? parseInt(stored) : 0;
        setViewTime(current);

        const interval = setInterval(() => {
            // Only count if match is past 10 minutes
            if (matchTime >= 600) {
                current += 1;
                setViewTime(current);
                sessionStorage.setItem(sessionKey, current.toString());
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isLive, isMobile, match?.id, matchTime]);

    // Handle vote submission
    const handleVote = async () => {
        if (!selectedPlayerId) {
            toast.error("Por favor, selecione um jogador.");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(`/public/matches/${match.id}/votes/mvp`, {
                voted_player_id: selectedPlayerId
            });
            toast.success("Seu voto foi registrado com sucesso!");
            localStorage.setItem(voteKey, 'true');
            setHasVotedLocal(true);
            if (onVoteSubmitted) onVoteSubmitted();
        } catch (error: any) {
            const msg = error.response?.data?.message || "Erro ao registrar seu voto.";
            toast.error(msg);
            if (error.response?.status === 403) {
                localStorage.setItem(voteKey, 'true');
                setHasVotedLocal(true);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const secondsRemaining = Math.max(0, 300 - viewTime);
    const minutesRemaining = Math.ceil(secondsRemaining / 60);
    const progressPercentage = Math.min(100, (viewTime / 300) * 100);

    return (
        <div className="flex flex-col items-center justify-center py-6 px-4">
            {/* 1. SE A PARTIDA ESTIVER FINALIZADA E TIVER MVP DEFINIDO */}
            {match?.mvp && (
                <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                    <a
                        href={`${api.defaults.baseURL}/public/art/match/${match.id}/mvp`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative w-full aspect-[4/5] bg-gray-200 rounded-2xl overflow-hidden shadow-xl border border-white hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
                    >
                        <img
                            src={`${api.defaults.baseURL}/public/art/match/${match.id}/mvp`}
                            className="w-full h-full object-cover"
                            alt="Arte do Craque do Jogo"
                            onError={(e: any) => {
                                e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22500%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22Arial%22%20font-size%3D%2224%22%20fill%3D%22%239ca3af%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EArte%20do%20Craque%3C%2Ftext%3E%3C%2Fsvg%3E';
                            }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-gray-800 shadow-lg">
                                🔍 Clique para ampliar
                            </div>
                        </div>
                    </a>
                    <div className="text-center">
                        <h3 className="text-xl font-black text-indigo-900 uppercase italic tracking-tighter">
                            {match.mvp.name}
                        </h3>
                        <p className="text-gray-500 text-sm font-medium mb-3">Eleito o Craque da Partida</p>
                        <a
                            href={`${api.defaults.baseURL}/public/art/match/${match.id}/mvp`}
                            download={`craque-${match.id}-${match.mvp.name}.jpg`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 text-sm"
                        >
                            <Share2 size={16} /> Baixar Arte
                        </a>
                    </div>
                </div>
            )}

            {/* 2. SE A PARTIDA ESTIVER ATIVA (AO VIVO) E O USUÁRIO JÁ TIVER VOTADO */}
            {!match?.mvp && isLive && hasVotedLocal && (
                <div className="w-full max-w-md bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center shadow-sm">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <h4 className="text-lg font-bold text-emerald-900 mb-1">Obrigado pelo seu voto!</h4>
                    <p className="text-sm text-emerald-700">Seu voto foi registrado com sucesso. O Craque do Jogo final será anunciado ao término da partida.</p>
                </div>
            )}

            {/* 3. SE A PARTIDA ESTIVER ATIVA (AO VIVO), NÃO FOR DISPOSITIVO MÓVEL */}
            {!match?.mvp && isLive && !hasVotedLocal && !isMobile && (
                <div className="w-full max-w-md bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center shadow-sm">
                    <Smartphone className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                    <h4 className="text-lg font-bold text-yellow-900 mb-1">Votação disponível no celular</h4>
                    <p className="text-sm text-yellow-700">Acesse este jogo pelo seu celular para votar no Craque do Jogo após acompanhar 5 minutos de partida.</p>
                </div>
            )}

            {/* 4. SE A PARTIDA ESTIVER ATIVA (AO VIVO), FOR DISPOSITIVO MÓVEL, MAS JOGO TEM MENOS DE 10 MIN */}
            {!match?.mvp && isLive && !hasVotedLocal && isMobile && !isPast10Min && (
                <div className="w-full max-w-md bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center shadow-sm">
                    <Vote className="w-12 h-12 text-indigo-500 mx-auto mb-3 animate-pulse" />
                    <h4 className="text-lg font-bold text-indigo-900 mb-1">Aguardando início da votação</h4>
                    <p className="text-sm text-indigo-700">A votação de MVP do público iniciará automaticamente a partir dos 10 minutos de partida.</p>
                    <div className="mt-4 text-xs font-semibold text-indigo-500 uppercase tracking-wider">
                        Tempo atual: {Math.floor(matchTime / 60)}m
                    </div>
                </div>
            )}

            {/* 5. SE A PARTIDA ESTIVER ATIVA (AO VIVO), FOR CELULAR, JOGO > 10 MIN, MAS AINDA NÃO COMPLETOU 5 MIN DE TELA */}
            {!match?.mvp && isLive && !hasVotedLocal && isMobile && isPast10Min && viewTime < 300 && (
                <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <Smartphone className="w-8 h-8 text-indigo-650 shrink-0" />
                        <div>
                            <h4 className="font-bold text-gray-800 text-sm">Validando presença no jogo</h4>
                            <p className="text-xs text-gray-500">Mantenha a tela aberta para habilitar seu voto.</p>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-gray-700">
                            <span>Acompanhando partida...</span>
                            <span>Faltam {minutesRemaining} min</span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200/55">
                            <div 
                                className="h-full bg-indigo-600 transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 6. VOTAÇÃO DESBLOQUEADA E PRONTA PARA SELEÇÃO */}
            {!match?.mvp && isLive && !hasVotedLocal && isMobile && isPast10Min && viewTime >= 300 && (
                <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-5 shadow-lg animate-in fade-in slide-in-from-bottom duration-300">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
                        <Award className="text-yellow-500 shrink-0" />
                        <div>
                            <h4 className="font-black text-gray-800 text-base">Quem foi o Craque do Jogo?</h4>
                            <p className="text-[11px] text-gray-400">Escolha o melhor atleta da partida</p>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                        {/* Rosters list */}
                        {['home', 'away'].map((side) => {
                            const team = side === 'home' ? match?.home_team : match?.away_team;
                            const players = side === 'home' ? rosters?.home : rosters?.away;
                            if (!players || players.length === 0) return null;

                            return (
                                <div key={side} className="space-y-2">
                                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 bg-gray-50 px-3 py-1 rounded">
                                        {team?.name}
                                    </h5>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {players.map((player: any) => (
                                            <button
                                                key={player.id}
                                                onClick={() => setSelectedPlayerId(player.id)}
                                                className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] ${
                                                    selectedPlayerId === player.id
                                                        ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                                                        : 'bg-white border-gray-100 hover:border-indigo-150'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                                    selectedPlayerId === player.id ? 'bg-indigo-650 text-white' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {player.number || '#'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-gray-850 text-xs truncate">{player.name}</p>
                                                    {player.position && (
                                                        <p className="text-[9px] text-gray-400 uppercase font-medium">{player.position}</p>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleVote}
                        disabled={isSubmitting || !selectedPlayerId}
                        className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-100"
                    >
                        {isSubmitting ? "Computando..." : "Confirmar Voto"}
                    </button>
                </div>
            )}

            {/* 7. SEM MVP AINDA E PARTIDA FINALIZADA */}
            {!match?.mvp && isFinished && (
                <div className="text-center py-20">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-300">
                        <User size={32} className="text-gray-300" />
                    </div>
                    <h4 className="text-gray-800 font-bold text-base mb-1">Aguardando resultado oficial</h4>
                    <p className="text-gray-500 text-xs max-w-xs mx-auto">O Craque oficial da partida está sendo definido pelos organizadores e árbitros.</p>
                </div>
            )}
        </div>
    );
}
