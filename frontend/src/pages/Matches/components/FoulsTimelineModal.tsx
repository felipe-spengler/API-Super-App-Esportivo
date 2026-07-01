import React from 'react';
import { X, Trash2, Clock, ShieldAlert } from 'lucide-react';

interface FoulEvent {
    id: any;
    type: string;
    team: 'home' | 'away';
    time: string;
    period: string;
    player_name: string;
    player_id?: number | null;
    metadata?: any;
}

interface FoulsTimelineModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamName: string;
    teamKey: 'home' | 'away';
    events: FoulEvent[];
    onDeleteEvent: (eventId: any, type: string, team: 'home' | 'away') => void;
    currentPeriod: string;
}

export function FoulsTimelineModal({
    isOpen,
    onClose,
    teamName,
    teamKey,
    events,
    onDeleteEvent,
    currentPeriod
}: FoulsTimelineModalProps) {
    if (!isOpen) return null;

    // Filter only foul events for the selected team
    const teamFouls = events.filter(e => e.team === teamKey && e.type === 'foul');

    return (
        <div className="fixed inset-0 bg-[#0a0f18]/90 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-[#111827] w-full max-w-md rounded-[2.5rem] overflow-hidden border border-white/10 shadow-3xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a2234]/30">
                    <div>
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.25em] flex items-center gap-1.5 mb-1">
                            <ShieldAlert className="w-3.5 h-3.5" /> Histórico de Faltas
                        </span>
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight truncate max-w-[280px]">
                            {teamName}
                        </h3>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors border border-white/10 text-gray-400 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-[#1a2234]/40 border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Faltas neste Período</span>
                        <span className="bg-rose-500/20 text-rose-400 font-mono font-black px-3.5 py-1 rounded-full text-base border border-rose-500/20 shadow-[0_0_12px_rgba(239,68,68,0.2)]">
                            {teamFouls.filter(f => {
                                let relevantPeriods: string[] = [currentPeriod];
                                if (currentPeriod === '1º Tempo' || currentPeriod === 'Intervalo') relevantPeriods = ['1º Tempo'];
                                else if (currentPeriod === '2º Tempo' || currentPeriod === 'Fim de Tempo Normal') relevantPeriods = ['2º Tempo'];
                                else if (currentPeriod === 'Prorrogação') relevantPeriods = ['2º Tempo', 'Prorrogação'];
                                return relevantPeriods.includes(f.period);
                            }).length}
                        </span>
                    </div>

                    <div className="space-y-2">
                        <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">Linha do Tempo das Faltas</span>
                        
                        {teamFouls.length === 0 ? (
                            <div className="py-12 text-center bg-white/5 rounded-2xl border border-dashed border-white/5">
                                <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-30" />
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Nenhuma falta registrada ainda.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                                {teamFouls.map((f, idx) => (
                                    <div 
                                        key={f.id || idx} 
                                        className="flex items-center justify-between p-3 rounded-2xl bg-[#1a2234]/60 border border-white/5 hover:border-white/10 transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Time tag */}
                                            <div className="w-11 h-9 shrink-0 rounded-xl bg-black/30 flex items-center justify-center text-xs font-mono font-black text-rose-400 tabular-nums">
                                                {f.time.includes("'") ? f.time : `${f.time}`}
                                            </div>
                                            
                                            <div className="text-left">
                                                <span className="block text-xs font-black text-gray-200 uppercase tracking-wide truncate max-w-[200px]">
                                                    {f.player_name}
                                                </span>
                                                <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                                                    {f.period}
                                                </span>
                                                {f.metadata?.foul_alert_type === 'foul_limit_warning' && (
                                                    <span className="mt-1 inline-block text-[9px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                        4ª falta
                                                    </span>
                                                )}
                                                {f.metadata?.foul_alert_type === 'foul_disqualification' && (
                                                    <span className="mt-1 inline-block text-[9px] font-black text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                        fora da partida
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Button to Delete */}
                                        <button 
                                            onClick={() => onDeleteEvent(f.id, 'foul', teamKey)}
                                            className="p-2 bg-white/5 hover:bg-rose-500/10 text-gray-500 hover:text-rose-500 border border-transparent hover:border-rose-500/20 rounded-xl transition-all"
                                            title="Excluir Falta"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer info */}
                <div className="p-5 bg-[#1a2234]/20 border-t border-white/5 text-center">
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Clique no botão de lixeira para estornar/excluir qualquer falta.</p>
                </div>
            </div>
        </div>
    );
}
