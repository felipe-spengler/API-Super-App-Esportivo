import { Link } from 'react-router-dom';
import { Calendar, Clock as ClockIcon, MapPin, CheckCircle, List, ShieldCheck, Edit2, ImageIcon, Trash2 } from 'lucide-react';
import api from '../../../services/api';

interface Match {
    id: number;
    home_team: { name: string; logo_url?: string };
    away_team: { name: string; logo_url?: string };
    home_score: number | null;
    away_score: number | null;
    home_penalty_score?: number | null;
    away_penalty_score?: number | null;
    start_time: string;
    round_number: number;
    status: 'scheduled' | 'finished' | 'live' | 'canceled';
    location?: string;
    group_name?: string;
    round_name?: string;
    mvp_player_id?: number | string | null;
    perna_de_pau_player_id?: number | string | null;
    category_id?: number | null;
    match_details?: {
        arbitration?: {
            referee?: string;
            assistant1?: string;
            assistant2?: string;
        }
    };
    events?: any[];
}

interface AdminMatchCardProps {
    match: Match;
    championshipId: string;
    isTimeOrLap: boolean;
    selectedCategoryId: number | 'no-category' | null;
    openMatchSumula: (match: Match) => void;
    setSelectedMatch: (match: Match) => void;
    setIsAuditOpen: (open: boolean) => void;
    openEditModal: (match: Match) => void;
    handleDeleteMatch: (matchId: number) => void;
}

export function AdminMatchCard({
    match,
    championshipId,
    isTimeOrLap,
    selectedCategoryId,
    openMatchSumula,
    setSelectedMatch,
    setIsAuditOpen,
    openEditModal,
    handleDeleteMatch,
}: AdminMatchCardProps) {
    return (
        <div className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                {/* Date / Location */}
                <div className="w-full md:w-40 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-start border-b md:border-b-0 pb-2 md:pb-0 mb-2 md:mb-0">
                    <div>
                        <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                            <Calendar size={12} /> {new Date(match.start_time).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1">
                            <ClockIcon size={12} /> {new Date(match.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    {match.location && (
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 truncate max-w-[120px] md:max-w-[150px] bg-gray-50 px-2 py-1 rounded md:bg-transparent md:p-0">
                            <MapPin size={10} /> {match.location}
                        </div>
                    )}
                </div>

                {isTimeOrLap ? (
                    <>
                        <div className="flex-1 flex justify-center items-center">
                            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 text-xs sm:text-sm shadow-sm animate-pulse">
                                ⏱️ Disputa Simultânea / Bateria de Tempo
                            </span>
                        </div>

                        {/* Actions for Time or Lap */}
                        <div className="w-full md:w-auto flex justify-around md:justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0 flex-shrink-0 min-w-max">
                            <Link
                                to={`/admin/championships/${championshipId}/times?game_match_id=${match.id}&category_id=${selectedCategoryId === 'no-category' ? '' : selectedCategoryId}`}
                                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all font-bold text-xs shadow-md shadow-indigo-100 active:scale-95"
                            >
                                <ClockIcon className="w-4 h-4" />
                                <span>Registrar / Ver Tempos</span>
                            </Link>

                            <button
                                onClick={() => openEditModal(match)}
                                className="flex items-center justify-center p-2 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg transition-all hover:bg-gray-100"
                                title="Editar Bateria"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => handleDeleteMatch(match.id)}
                                className="flex items-center justify-center p-2 text-red-500 bg-red-50 border border-red-200 rounded-lg transition-all hover:bg-red-100"
                                title="Excluir Bateria"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Scoreboard */}
                        <div className="flex flex-row items-center gap-2 md:gap-4 flex-1 justify-center w-full px-2">
                            {/* Home Team */}
                            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-center md:text-right flex-1 justify-center md:justify-end min-w-0">
                                <div className="order-1 md:order-2">
                                    {match.home_team?.logo_url ? (
                                        <img src={match.home_team.logo_url} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white shadow-sm border p-0.5" />
                                    ) : (
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-dashed">T1</div>
                                    )}
                                </div>
                                <span
                                    className="text-[11px] md:text-sm font-bold text-gray-900 order-2 md:order-1 truncate max-w-[80px] md:max-w-[150px] lg:max-w-[180px]"
                                    title={match.home_team?.name || 'Time A'}
                                >
                                    {match.home_team?.name || 'Time A'}
                                </span>
                            </div>

                            {/* Score */}
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-2 md:gap-4 bg-white px-3 md:px-6 py-1.5 md:py-2 rounded-xl border border-gray-200 shadow-sm min-w-[90px] md:min-w-[120px] justify-center">
                                    {['live', 'finished', 'ongoing'].includes(match.status) && match.home_score !== null && match.away_score !== null ? (
                                        <>
                                            <span className="text-xl md:text-2xl font-black text-gray-900">
                                                {match.home_score}
                                            </span>
                                            <span className="text-gray-300 font-bold text-[10px]">X</span>
                                            <span className="text-xl md:text-2xl font-black text-gray-900">
                                                {match.away_score}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-gray-300 font-bold text-lg md:text-xl">VS</span>
                                    )}
                                </div>
                                {(match.home_penalty_score != null || match.away_penalty_score != null) && (match.home_penalty_score > 0 || match.away_penalty_score > 0) && (
                                    <span className="text-[10px] font-bold text-gray-500 mt-1">
                                        ({match.home_penalty_score} x {match.away_penalty_score} Pen.)
                                    </span>
                                )}
                            </div>

                            {/* Away Team */}
                            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-3 text-center md:text-left flex-1 justify-center md:justify-start min-w-0">
                                <div className="">
                                    {match.away_team?.logo_url ? (
                                        <img src={match.away_team.logo_url} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white shadow-sm border p-0.5" />
                                    ) : (
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 border border-dashed">T2</div>
                                    )}
                                </div>
                                <span
                                    className="text-[11px] md:text-sm font-bold text-gray-900 truncate max-w-[80px] md:max-w-[150px] lg:max-w-[180px]"
                                    title={match.away_team?.name || 'Time B'}
                                >
                                    {match.away_team?.name || 'Time B'}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="w-full md:w-auto flex justify-around md:justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0 flex-shrink-0 min-w-max">
                            <button
                                onClick={() => openMatchSumula(match)}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all border ${match.status === 'finished' ? 'text-green-600 bg-green-50 border-green-100' : 'text-indigo-600 bg-indigo-50 border-indigo-100'}`}
                            >
                                {match.status === 'finished' ? <CheckCircle size={16} /> : <List size={16} />}
                                <span className="text-[10px] font-bold uppercase md:hidden">{match.status === 'finished' ? 'Resumo' : 'Súmula'}</span>
                            </button>

                            <button
                                onClick={() => {
                                    setSelectedMatch(match);
                                    setIsAuditOpen(true);
                                }}
                                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 text-blue-600 bg-blue-50 border border-blue-100 rounded-lg transition-all hover:bg-blue-100"
                                title="Auditoria de Voz e Logs"
                            >
                                <ShieldCheck size={16} />
                                <span className="text-[10px] font-bold uppercase md:hidden">Auditar</span>
                            </button>

                            <button
                                onClick={() => openEditModal(match)}
                                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg transition-all"
                            >
                                <Edit2 size={16} />
                                <span className="text-[10px] font-bold uppercase md:hidden">Editar</span>
                            </button>

                            <button
                                onClick={() => window.open(`${api.defaults.baseURL}/public/art/match/${match.id}/scheduled`, '_blank')}
                                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 text-orange-600 bg-orange-50 border border-orange-100 rounded-lg transition-all hover:bg-orange-100"
                                title="Gerar Arte Jogo Programado"
                            >
                                <ImageIcon size={16} />
                                <span className="text-[10px] font-bold uppercase md:hidden">Arte</span>
                            </button>

                            <button
                                onClick={() => handleDeleteMatch(match.id)}
                                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 text-red-500 bg-red-50 border border-red-200 rounded-lg transition-all hover:bg-red-100"
                                title="Excluir Confronto"
                            >
                                <Trash2 size={16} />
                                <span className="text-[10px] font-bold uppercase md:hidden">Excluir</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
