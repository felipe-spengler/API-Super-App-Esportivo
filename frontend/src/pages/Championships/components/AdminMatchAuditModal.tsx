import React from 'react';
import { X, ShieldCheck, Play, Users } from 'lucide-react';

interface MatchAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: any; // Type it better if 'Match' is exported, for now any is fine since it's internal
}

export function MatchAuditModal({ isOpen, onClose, match }: MatchAuditModalProps) {
    if (!isOpen || !match) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="bg-blue-600 p-4 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" />
                        <h3 className="font-bold">Auditoria: {match.home_team?.name} x {match.away_team?.name}</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-blue-700 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {match.events && match.events.length > 0 ? (
                        <div className="space-y-3">
                            {match.events.slice().reverse().map((event: any) => {
                                const isVoice = event.event_type === 'voice_debug';
                                const isTimer = event.event_type === 'timer_control';
                                const isRosterLog = event.metadata?.system_info === 'Roster Snapshot';

                                const getFriendlyEvent = (type: string) => {
                                    const t = (type || '').toLowerCase().trim();
                                    const map: any = {
                                        'field_goal_2': { label: 'Cesta de 2 Pontos', icon: '🏀' },
                                        'field_goal_3': { label: 'Cesta de 3 Pontos', icon: '🎯' },
                                        'free_throw': { label: 'Lance Livre', icon: '🗑️' },
                                        'foul': { label: 'Falta Comum', icon: '⚠️' },
                                        'technical_foul': { label: 'Falta Técnica', icon: '🟨' },
                                        'unsportsmanlike_foul': { label: 'Falta Antidesportiva', icon: '🟧' },
                                        'disqualifying_foul': { label: 'Falta Desqualificante', icon: '🟥' },
                                        'timeout': { label: 'Pedido de Tempo', icon: '⏱️' },
                                        'substitution': { label: 'Substituição', icon: '🔄' },
                                        'period_start': { label: 'Início de Período', icon: '🏁' },
                                        'period_end': { label: 'Fim de Período', icon: '🏁' },
                                        'match_start': { label: 'Início da Partida', icon: '🏀' },
                                        'match_end': { label: 'Fim da Partida', icon: '🏆' },
                                    };
                                    return map[t] || { label: type, icon: '🏀' };
                                };

                                const display = getFriendlyEvent(event.event_type);

                                return (
                                    <div key={event.id} className={`p-4 rounded-xl border flex flex-col gap-2 ${isVoice ? 'bg-white border-gray-100' :
                                        isTimer ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-gray-200 shadow-sm'
                                        }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black text-white bg-indigo-600 px-2 py-0.5 rounded shadow-sm">
                                                    {event.game_time || '00:00'}
                                                </span>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                                    {event.period}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-300">#{event.id} • {new Date(event.created_at).toLocaleTimeString('pt-BR')}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <h4 className={`text-sm font-black uppercase ${isVoice ? 'text-gray-400' : isTimer ? 'text-indigo-600' : 'text-gray-900'
                                                }`}>
                                                {isRosterLog ? '📋 Registro do Sistema' :
                                                    isVoice ? '🎙️ Entrada de Voz' :
                                                        isTimer ? '⏱️ Controle do Tempo' :
                                                            `${display.icon} Evento: ${display.label}`}
                                            </h4>
                                            {isVoice && !isRosterLog && (
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-sm ${event.metadata?.identified ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                                    }`}>
                                                    {event.metadata?.identified ? 'SUCESSO' : 'FALHA'}
                                                </span>
                                            )}
                                        </div>

                                        {event.metadata?.voice_log && (
                                            <div className="text-sm font-medium italic text-gray-600 bg-gray-100/50 p-3 rounded-lg border border-gray-200/50">
                                                "{event.metadata.voice_log}"
                                            </div>
                                        )}

                                        {event.metadata?.home_roster && (
                                            <div className="mt-2 space-y-2">
                                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                                    <div className="text-[10px] font-black text-blue-600 uppercase mb-1">Time da Casa</div>
                                                    <div className="text-xs font-bold text-blue-800 leading-relaxed">{event.metadata.home_roster}</div>
                                                </div>
                                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                                                    <div className="text-[10px] font-black text-red-600 uppercase mb-1">Time Visitante</div>
                                                    <div className="text-xs font-bold text-red-800 leading-relaxed">{event.metadata.away_roster}</div>
                                                </div>
                                            </div>
                                        )}

                                        {event.metadata?.failure_reason && (
                                            <div className="text-[10px] font-black text-red-600 bg-red-50 p-2 rounded border border-red-100 uppercase">
                                                Motivo da Falha: {event.metadata.failure_reason}
                                            </div>
                                        )}

                                        {event.metadata?.normalized_text && !event.metadata?.identified && (
                                            <div className="text-[10px] font-bold text-gray-400">
                                                O que o sistema processou: "{event.metadata.normalized_text}"
                                            </div>
                                        )}

                                        {isTimer && (
                                            <div className="text-xs font-black text-indigo-700 flex items-center gap-1">
                                                {event.metadata?.action === 'start' ? <Play size={12} fill="currentColor" /> : <X size={12} />}
                                                SISTEMA: {event.metadata?.action === 'start' ? 'CRONÔMETRO INICIADO' : 'CRONÔMETRO PAUSADO'}
                                            </div>
                                        )}

                                        {event.player_name && !isVoice && !isTimer && (
                                            <div className="text-xs font-bold text-gray-600 flex items-center gap-2">
                                                <Users size={12} /> Atleta: {event.player_name}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <ShieldCheck className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 italic">Nenhum dado auditável disponível nesta partida.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-gray-900 text-white font-black rounded-xl hover:bg-black transition-all shadow-xl active:scale-95 uppercase tracking-widest text-sm"
                    >
                        Fechar Auditoria
                    </button>
                </div>
            </div>
        </div>
    );
}
