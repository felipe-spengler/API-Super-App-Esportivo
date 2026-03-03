import React from 'react';
import { X, CheckCircle, Trophy, Star, Loader2, ImageIcon, ShieldCheck, Printer, Play, Users } from 'lucide-react';
import api from '../../../services/api';

interface MatchSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    match: any;
    championship: any;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    loadingRosters: boolean;
    rosters: { home: any[], away: any[] };
    selectedMvpId: string | number;
    setSelectedMvpId: (id: string | number) => void;
    handleSaveMvp: () => void;
    isSavingMvp: boolean;
    navigateToSumula: (matchId: number, sportSlug: string) => void;
    navigate: (path: string) => void;
}

export function AdminMatchSummaryModal({
    isOpen,
    onClose,
    match,
    championship,
    activeTab,
    setActiveTab,
    loadingRosters,
    rosters,
    selectedMvpId,
    setSelectedMvpId,
    handleSaveMvp,
    isSavingMvp,
    navigateToSumula,
    navigate
}: MatchSummaryModalProps) {
    if (!isOpen || !match) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 bg-green-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        <h3 className="font-bold">Resumo da Partida</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-green-700 rounded-full">
                        <X size={20} />
                    </button>
                </div>


                {/* Tabs Navigation */}
                <div className="flex border-b border-gray-100 bg-gray-50/50">
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'summary' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Resumo
                    </button>
                    <button
                        onClick={() => setActiveTab('art')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'art' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <ImageIcon className="w-4 h-4" /> Arte
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'audit' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <ShieldCheck className="w-4 h-4" /> Auditoria
                        </span>
                    </button>
                </div>

                {activeTab === 'summary' && (
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="text-center flex-1">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 border">
                                    {match.home_team?.logo_url ? <img src={match.home_team.logo_url} className="w-12 h-12" /> : <Trophy className="text-gray-300" />}
                                </div>
                                <div className="font-bold text-gray-900 leading-tight">{match.home_team?.name}</div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-4 px-6">
                                    <span className="text-5xl font-black text-gray-900">{match.home_score || 0}</span>
                                    <span className="text-gray-300 font-bold">X</span>
                                    <span className="text-5xl font-black text-gray-900">{match.away_score || 0}</span>
                                </div>
                                {(match.home_penalty_score != null || match.away_penalty_score != null) && (match.home_penalty_score > 0 || match.away_penalty_score > 0) && (
                                    <span className="text-sm font-bold text-gray-500 mt-2">
                                        ({match.home_penalty_score} x {match.away_penalty_score} Pênaltis)
                                    </span>
                                )}
                            </div>
                            <div className="text-center flex-1">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 border">
                                    {match.away_team?.logo_url ? <img src={match.away_team.logo_url} className="w-12 h-12" /> : <Trophy className="text-gray-300" />}
                                </div>
                                <div className="font-bold text-gray-900 leading-tight">{match.away_team?.name}</div>
                            </div>
                        </div>

                        <div className="space-y-4 border-t pt-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                                    <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Status</div>
                                    <div className="text-sm font-bold text-green-600 self-center">Finalizado</div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                                    <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Data</div>
                                    <div className="text-sm font-bold text-gray-900">{new Date(match.start_time).toLocaleDateString('pt-BR')}</div>
                                </div>
                            </div>
                        </div>

                        {/* Craque do Jogo (MVP) */}
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    <div className="text-[10px] text-amber-600 font-black uppercase tracking-wider">Craque do Jogo (MVP)</div>
                                </div>
                            </div>

                            {loadingRosters ? (
                                <div className="flex items-center gap-2 text-xs text-amber-400 py-2">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Carregando elencos...
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <select
                                        value={selectedMvpId}
                                        onChange={e => setSelectedMvpId(e.target.value)}
                                        className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-gray-700"
                                    >
                                        <option value="">Selecione o Craque...</option>
                                        {rosters.home.length > 0 && (
                                            <optgroup label={match.home_team?.name}>
                                                {rosters.home.map(p => (
                                                    <option key={p.id} value={p.id}>{p.number ? `#${p.number}` : ''} {p.name}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                        {rosters.away.length > 0 && (
                                            <optgroup label={match.away_team?.name}>
                                                {rosters.away.map(p => (
                                                    <option key={p.id} value={p.id}>{p.number ? `#${p.number}` : ''} {p.name}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                    <button
                                        onClick={handleSaveMvp}
                                        disabled={isSavingMvp || !selectedMvpId}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm transition-all disabled:opacity-50 shadow-sm shadow-amber-200 active:scale-95"
                                    >
                                        {isSavingMvp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Definir'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                            <div className="text-[10px] text-indigo-400 font-bold uppercase mb-2">Equipe de Arbitragem</div>
                            <div className="text-sm font-medium text-indigo-900">
                                <b>Árbitro:</b> {match.match_details?.arbitration?.referee || 'Não informado'}
                            </div>
                            {match.match_details?.arbitration?.assistant1 && (
                                <div className="text-sm text-indigo-700 mt-1">
                                    <b>Assistentes:</b> {match.match_details?.arbitration?.assistant1} {match.match_details?.arbitration?.assistant2 ? ` / ${match.match_details?.arbitration?.assistant2}` : ''}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'art' && (
                    <div className="p-8 pb-12 flex flex-col items-center justify-center bg-gray-50 min-h-[300px]">
                        <div className="bg-orange-100 p-4 rounded-full mb-4">
                            <ImageIcon className="w-8 h-8 text-orange-600" />
                        </div>
                        <h4 className="font-bold text-gray-900 mb-2 text-center">Arte de Resultado da Partida</h4>
                        <p className="text-sm text-gray-500 text-center mb-6 max-w-sm">Você pode gerar a arte e enviar diretamente para o WhatsApp ou salvar a imagem.</p>
                        <button
                            onClick={() => window.open(`${api.defaults.baseURL}/public/art/match/${match.id}/faceoff`, '_blank')}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <ImageIcon className="w-5 h-5" /> Abrir Arte Oficial
                        </button>
                    </div>
                )}

                {activeTab === 'audit' && (
                    <div className="p-0 flex-1 overflow-y-auto max-h-[500px] bg-gray-50">
                        <div className="p-4 space-y-3">
                            {match.events && match.events.length > 0 ? (
                                match.events.slice().reverse().map((event: any) => {
                                    const etype = (event.event_type || '').toLowerCase().trim();
                                    const isVoice = etype === 'voice_debug';
                                    const isTimer = etype === 'timer_control';
                                    const isError = etype === 'system_error' || etype === 'sync_error';
                                    const isUserAction = etype === 'user_action';
                                    const isBlocked = etype === 'user_action_blocked';
                                    const isRosterLog = event.metadata?.system_info === 'Roster Snapshot';

                                    const getFriendlyEvent = (type: string) => {
                                        const t = (type || '').toLowerCase().trim();
                                        const map: any = {
                                            // Basquete
                                            'field_goal_2': { label: 'Cesta de 2 Pontos', icon: '🏀' },
                                            'field_goal_3': { label: 'Cesta de 3 Pontos', icon: '🎯' },
                                            'free_throw': { label: 'Lance Livre', icon: '🗑️' },
                                            'technical_foul': { label: 'Falta Técnica', icon: '🟨' },
                                            'unsportsmanlike_foul': { label: 'Falta Antidesportiva', icon: '🟧' },
                                            'disqualifying_foul': { label: 'Falta Desqualificante', icon: '🟥' },
                                            'block': { label: championship?.sport?.slug === 'volei' ? 'Bloqueio' : 'Toco', icon: championship?.sport?.slug === 'volei' ? '🛡️' : '✋' },
                                            'rebound': { label: 'Rebote', icon: '🔁' },
                                            'steal': { label: 'Roubo de Bola', icon: '💨' },
                                            'assist': { label: 'Assistência', icon: '👟' },
                                            // Futebol / Futsal / Futebol7
                                            'goal': { label: 'Gol', icon: '⚽' },
                                            'yellow_card': { label: 'Cartão Amarelo', icon: '🟨' },
                                            'red_card': { label: 'Cartão Vermelho', icon: '🟥' },
                                            'blue_card': { label: 'Cartão Azul', icon: '🟦' },
                                            'foul': { label: 'Falta', icon: '⚠️' },
                                            'shootout_goal': { label: 'Pênalti Convertido', icon: '🥅' },
                                            'shootout_miss': { label: 'Pênalti Perdido', icon: '❌' },
                                            // Vôlei / Beach Tênis
                                            'point': { label: 'Ponto', icon: '🏐' },
                                            'set_end': { label: 'Fim de Set', icon: '🏆' },
                                            'ace': { label: 'Ace', icon: '🎯' },
                                            'erro': { label: 'Erro Cometido', icon: '⚠️' },
                                            // Tênis
                                            'game': { label: 'Game', icon: '🎾' },
                                            // Gerais
                                            'user_action': { label: 'Ação do Operador', icon: '👆' },
                                            'user_action_blocked': { label: 'Ação Bloqueada', icon: '🚫' },
                                            'system_error': { label: 'Erro de Sistema', icon: '🔴' },
                                            'sync_error': { label: 'Erro de Sincronia', icon: '📡' },
                                            'substitution': { label: 'Substituição', icon: '🔄' },
                                            'timeout': { label: 'Pedido de Tempo', icon: '⏱️' },
                                            'pedido de tempo': { label: 'Pedido de Tempo', icon: '⏱️' },
                                            'match_start': { label: 'Início da Partida', icon: '🏁' },
                                            'match_end': { label: 'Fim de Jogo', icon: '🛑' },
                                            'period_start': { label: 'Início de Período/Set', icon: '▶️' },
                                            'period_end': { label: 'Fim de Período/Set', icon: '⏸️' },
                                        };
                                        return map[t] || { label: type.replace(/_/g, ' '), icon: '📋' };
                                    };

                                    const display = getFriendlyEvent(event.event_type);

                                    return (
                                        <div key={event.id} className={`p-4 rounded-xl border flex flex-col gap-2 ${isError ? 'bg-red-50 border-red-200' :
                                            isBlocked ? 'bg-orange-50 border-orange-200' :
                                                isUserAction ? 'bg-green-50 border-green-200' :
                                                    isVoice ? 'bg-white border-gray-100' :
                                                        isTimer ? 'bg-indigo-50 border-indigo-100' :
                                                            'bg-white border-gray-200 shadow-sm'
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

                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className={`text-sm font-black uppercase ${isError ? 'text-red-600' :
                                                    isBlocked ? 'text-orange-600' :
                                                        isUserAction ? 'text-green-700' :
                                                            isVoice ? 'text-gray-400' :
                                                                isTimer ? 'text-indigo-600' :
                                                                    'text-gray-900'
                                                    }`}>
                                                    {isRosterLog ? '📋 Registro do Sistema' :
                                                        isError ? '🔴 Erro de Sistema' :
                                                            isBlocked ? '🚫 Ação Bloqueada' :
                                                                isUserAction ? '👆 Ação do Operador' :
                                                                    isVoice ? '🎙️ Entrada de Voz' :
                                                                        isTimer ? '⏱️ Controle do Tempo' :
                                                                            `${display.icon} ${display.label}`}
                                                </h4>
                                                {isVoice && !isRosterLog && (
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded shadow-sm ${event.metadata?.identified ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                        {event.metadata?.identified ? 'SUCESSO' : 'FALHA'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Label / Descrição do evento */}
                                            {event.metadata?.label && (
                                                <div className={`text-xs font-medium p-2 rounded-lg border ${isError ? 'bg-red-100/50 border-red-200 text-red-800' :
                                                    isBlocked ? 'bg-orange-100/50 border-orange-200 text-orange-800' :
                                                        isUserAction ? 'bg-green-100/50 border-green-200 text-green-800' :
                                                            'bg-gray-100/50 border-gray-200/50 text-gray-600'
                                                    }`}>
                                                    {event.metadata.label}
                                                </div>
                                            )}

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
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12 text-gray-400 text-sm italic">
                                    Nenhum registro de auditoria disponível.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={() => navigate(`/admin/matches/${match.id}/sumula-print`)}
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Printer className="w-5 h-5" /> Imprimir Súmula
                    </button>
                    <button
                        onClick={() => navigateToSumula(match.id, championship?.sport?.slug)}
                        className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                    >
                        Ver Detalhes Completos
                    </button>
                </div>
            </div>
        </div >
    );
}
