
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Target, Shield, Hand, Star, AlertTriangle, AlertOctagon, Trophy, X } from 'lucide-react';
import api from '../../services/api';

export function EventStats() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('category_id');
    const initialType = searchParams.get('type') || 'goals';
    const title = searchParams.get('title') || 'Estatísticas';
    const navigate = useNavigate();

    // Map 'cards' generic type to specific 'yellow_cards' default
    const [activeTab, setActiveTab] = useState(initialType === 'cards' ? 'yellow_cards' : initialType);
    const [selectedStat, setSelectedStat] = useState<any | null>(null);

    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [champName, setChampName] = useState('');

    const isCardStats = ['cards', 'yellow_cards', 'red_cards', 'blue_cards'].includes(initialType);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const champRes = await api.get(`/championships/${id}`);
                setChampName(champRes.data.name);

                const response = await api.get(`/championships/${id}/stats`, {
                    params: { type: activeTab, category_id: categoryId }
                });
                setStats(response.data);

            } catch (error) {
                console.error("Erro ao carregar estatísticas", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id, activeTab, categoryId]);

    const getIcon = () => {
        switch (activeTab) {
            case 'goals': return <Target className="w-5 h-5 text-gray-500" />;
            case 'cards': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'yellow_cards': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'red_cards': return <AlertOctagon className="w-5 h-5 text-red-600" />;
            case 'blue_cards': return <Shield className="w-5 h-5 text-blue-600" />;
            case 'assists': return <Hand className="w-5 h-5 text-blue-500" />;
            case 'blocks': return <Shield className="w-5 h-5 text-cyan-500" />;
            case 'aces': return <Star className="w-5 h-5 text-yellow-500" />;
            case 'points': return <Trophy className="w-5 h-5 text-orange-500" />;
            default: return <Target className="w-5 h-5 text-gray-500" />;
        }
    };

    const getValueLabel = () => {
        switch (activeTab) {
            case 'goals': return 'Gols';
            case 'cards': return 'Cartões';
            case 'yellow_cards': return 'Amarelos';
            case 'red_cards': return 'Vermelhos';
            case 'blue_cards': return 'Azuis';
            case 'assists': return 'Assis.';
            case 'blocks': return 'Bloq.';
            case 'aces': return 'Aces';
            case 'points': return 'Pts';
            default: return 'Total';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 leading-none">{title}</h1>
                    <p className="text-xs text-gray-500 mt-1">{champName || 'Carregando...'}</p>
                </div>
            </div>

            {/* Tabs for Cards */}
            {isCardStats && (
                <div className="bg-white border-b border-gray-200 px-4">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('yellow_cards')}
                            className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'yellow_cards' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Amarelos
                        </button>
                        <button
                            onClick={() => setActiveTab('red_cards')}
                            className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'red_cards' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Vermelhos
                        </button>
                        <button
                            onClick={() => setActiveTab('blue_cards')}
                            className={`py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'blue_cards' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Azuis
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-3xl mx-auto p-4 space-y-2">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : stats.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                        <p className="text-gray-500">Nenhum dado encontrado para esta estatística.</p>
                    </div>
                ) : (
                    <>
                        {/* List Header */}
                        <div className="flex px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            <div className="w-8 text-center">#</div>
                            <div className="flex-1">Atleta</div>
                            <div className="w-24 text-right">{getValueLabel()}</div>
                        </div>

                        {stats.map((item, index) => (
                            <div key={index} onClick={() => setSelectedStat(item)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center cursor-pointer hover:bg-gray-50 transition-colors">
                                {/* Rank */}
                                <div className={`w-8 text-center font-bold text-lg ${index < 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                    {index + 1}º
                                </div>

                                {/* Avatar */}
                                <div className="ml-2 mr-3 relative">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-100">
                                        {item.photo_url ? (
                                            <img src={item.photo_url} alt={item.player_name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-gray-400">{item.player_name?.substring(0, 2)}</span>
                                        )}
                                    </div>
                                    {index < 3 && (
                                        <div className="absolute -top-1 -right-1">
                                            <Star className={`w-4 h-4 ${index === 0 ? 'text-yellow-400 fill-yellow-400' : index === 1 ? 'text-gray-400 fill-gray-400' : 'text-orange-400 fill-orange-400'}`} />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-800 text-sm truncate">{item.player_name}</h3>
                                    <p className="text-xs text-gray-500 truncate">{item.team_name}</p>
                                </div>

                                {/* Value */}
                                <div className="text-right w-24 flex items-center justify-end gap-2">
                                    <span className="text-xl font-black text-gray-900">{item.value}</span>
                                    {getIcon()}
                                </div>
                            </div>
                        ))}
                    </>
                )}

            </div>

            {/* Detail Modal */}
            {selectedStat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedStat(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-600 p-4 text-white flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden border-2 border-white/30">
                                    {selectedStat.photo_url ? (
                                        <img src={selectedStat.photo_url} alt={selectedStat.player_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-bold">{selectedStat.player_name?.substring(0, 2)}</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight">{selectedStat.player_name}</h3>
                                    <p className="text-indigo-200 text-sm">{selectedStat.team_name}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStat(null)} className="text-white/70 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                Detalhamento ({selectedStat.value} {getValueLabel()})
                            </h4>

                            {!selectedStat.details || selectedStat.details.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">Detalhes não disponíveis.</p>
                            ) : (
                                <div className="space-y-3">
                                    {selectedStat.details.map((detail: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100 mb-2">
                                            <div className="bg-white p-2 rounded-md font-bold text-indigo-600 shadow-sm border border-gray-100 min-w-[3.5rem] text-center text-sm flex flex-col justify-center">
                                                <span>{detail.game_time || detail.minute || "-"}</span>
                                                <span className="text-[9px] font-normal text-gray-400">{detail.period === '1º Tempo' ? '1ºT' : detail.period === '2º Tempo' ? '2ºT' : detail.period}</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5 tracking-wider">
                                                    {detail.phase ? <span className="text-indigo-600">{detail.phase}</span> : null}
                                                    {detail.phase && detail.round ? ' • ' : ''}
                                                    {detail.round ? <span>{detail.round}</span> : null}
                                                </p>
                                                <p className="font-bold text-gray-800 text-sm leading-tight">{detail.match_label || 'Partida'}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {detail.match_date ? new Date(detail.match_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
