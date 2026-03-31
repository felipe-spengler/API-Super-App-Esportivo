
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Crown, X, Calendar } from 'lucide-react';
import api from '../../services/api';

export function EventMVP() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('category_id');
    const navigate = useNavigate();

    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [champName, setChampName] = useState('');
    const [selectedStat, setSelectedStat] = useState<any | null>(null);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const champRes = await api.get(`/championships/${id}`);
                setChampName(champRes.data.name);

                const response = await api.get(`/championships/${id}/mvp`, {
                    params: { category_id: categoryId }
                });
                setStats(response.data);

            } catch (error) {
                console.error("Erro ao carregar MVP", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id, categoryId]);

    const getPhaseLabel = (round: string | number) => {
        if (!round) return 'Fase de Grupos';
        const str = String(round);
        if (str === 'round_of_32') return '32-avos de Final';
        if (str === 'round_of_16') return 'Oitavas de Final';
        if (str === 'quarter') return 'Quartas de Final';
        if (str === 'semi') return 'Semifinal';
        if (str === 'final') return 'Final';
        if (str === 'third_place') return '3º Lugar';
        // Check if numeric
        if (!isNaN(Number(str)) && Number(str) < 50) return `Rodada ${str}`;
        return str; // Fallback
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 leading-none">MVP da Galera</h1>
                    <p className="text-xs text-gray-500 mt-1">{champName || 'Carregando...'}</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : stats.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                        <p className="text-gray-500">Nenhum MVP registrado ainda.</p>
                    </div>
                ) : (
                    <>
                        {/* Top 1 Highlight */}
                        <div
                            onClick={() => setSelectedStat(stats[0])}
                            className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white text-center shadow-lg relative overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                        >
                            <Crown className="w-32 h-32 absolute -top-4 -right-4 text-white/20 rotate-12" />
                            <div className="w-24 h-24 bg-white rounded-full mx-auto mb-3 border-4 border-white/30 flex items-center justify-center overflow-hidden shadow-inner">
                                {stats[0].photo_url || stats[0].player?.photo_url ? (
                                    <img src={stats[0].photo_url || stats[0].player.photo_url} alt={stats[0].player_name || stats[0].player.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-yellow-600">{(stats[0].player_name || stats[0].player?.name)?.substring(0, 2)}</span>
                                )}
                            </div>
                            <h2 className="text-2xl font-black">{stats[0].player_name || stats[0].player?.name}</h2>
                            <p className="text-white/80 font-medium">{stats[0].team_name || stats[0].player?.team?.name || 'Time não informado'}</p>
                            <div className="mt-4 bg-white/20 rounded-full py-1 px-4 inline-block backdrop-blur-sm">
                                <span className="font-bold text-lg">{stats[0].count}</span> <span className="text-sm opacity-90">Partidas como MVP</span>
                            </div>
                        </div>

                        {/* List Others */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-gray-500 uppercase ml-2 mt-4">Ranking Completo</h3>
                            {stats.slice(1).map((item, index) => (
                                <div
                                    key={index}
                                    onClick={() => setSelectedStat(item)}
                                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <div className="w-8 text-center font-bold text-gray-400">{index + 2}º</div>
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-100 ml-2 mr-3">
                                        {item.photo_url || item.player?.photo_url ? (
                                            <img src={item.photo_url || item.player.photo_url} alt={item.player_name || item.player.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-gray-400">{(item.player_name || item.player?.name)?.substring(0, 2)}</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800 text-sm">{item.player_name || item.player?.name}</h3>
                                        <p className="text-xs text-gray-500">{item.team_name || item.player?.team?.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-black text-gray-900 mx-1">{item.count}</span>
                                        <span className="text-xs text-gray-400">x</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {selectedStat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedStat(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-orange-600 p-4 text-white flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/30">
                                    {selectedStat.photo_url || selectedStat.player?.photo_url ? (
                                        <img src={selectedStat.photo_url || selectedStat.player.photo_url} alt={selectedStat.player_name || selectedStat.player.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-bold">{(selectedStat.player_name || selectedStat.player?.name)?.substring(0, 2)}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">{selectedStat.player_name || selectedStat.player?.name}</h3>
                                    <p className="text-orange-200 text-sm">{selectedStat.team_name || selectedStat.player?.team?.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStat(null)} className="text-white/70 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-5 max-h-[60vh] overflow-y-auto">
                            <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 pb-2 border-b border-gray-100">
                                Detalhamento ({selectedStat.count} {selectedStat.count === 1 ? 'Partida' : 'Partidas'} como MVP)
                            </h4>

                            {!selectedStat.details || selectedStat.details.length === 0 ? (
                                <p className="text-gray-500 text-base text-center py-6">Detalhes não disponíveis.</p>
                            ) : (
                                <div className="space-y-3">
                                    {selectedStat.details.map((detail: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-slate-100 mb-2 hover:bg-white hover:shadow-lg hover:shadow-orange-100/30 transition-all">
                                            {/* Time & Period Box */}
                                            <div className="bg-orange-600 p-1.5 rounded-xl font-black text-white shadow-lg shadow-orange-100 min-w-[3.5rem] text-center flex flex-col justify-center h-12 shrink-0">
                                                <span className="text-[10px] text-white/80 uppercase tracking-tighter leading-none">MVP</span>
                                            </div>

                                            {/* Match Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">
                                                        {getPhaseLabel(detail.round)}
                                                    </span>
                                                    {detail.phase && (detail.phase !== detail.round) && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                                                 {detail.phase}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <p className="font-extrabold text-slate-900 text-[13px] leading-tight mb-1 whitespace-pre-wrap">
                                                    {detail.match_label || 'Partida'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3 text-orange-300" />
                                                    {detail.match_date ? new Date(detail.match_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Data a def.'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
