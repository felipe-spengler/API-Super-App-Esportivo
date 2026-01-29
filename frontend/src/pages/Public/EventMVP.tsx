
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Crown } from 'lucide-react';
import api from '../../services/api';

export function EventMVP() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('category_id');
    const navigate = useNavigate();

    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [champName, setChampName] = useState('');

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
                        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 text-white text-center shadow-lg relative overflow-hidden">
                            <Crown className="w-32 h-32 absolute -top-4 -right-4 text-white/20 rotate-12" />
                            <div className="w-24 h-24 bg-white rounded-full mx-auto mb-3 border-4 border-white/30 flex items-center justify-center overflow-hidden shadow-inner">
                                {stats[0].player?.photo_url ? (
                                    <img src={stats[0].player.photo_url} alt={stats[0].player.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-2xl font-bold text-yellow-600">{stats[0].player?.name?.substring(0, 2)}</span>
                                )}
                            </div>
                            <h2 className="text-2xl font-black">{stats[0].player?.name}</h2>
                            <p className="text-white/80 font-medium">{stats[0].player?.team?.name || 'Time não informado'}</p>
                            <div className="mt-4 bg-white/20 rounded-full py-1 px-4 inline-block backdrop-blur-sm">
                                <span className="font-bold text-lg">{stats[0].count}</span> <span className="text-sm opacity-90">Partidas como MVP</span>
                            </div>
                        </div>

                        {/* List Others */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-gray-500 uppercase ml-2 mt-4">Ranking Completo</h3>
                            {stats.slice(1).map((item, index) => (
                                <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center">
                                    <div className="w-8 text-center font-bold text-gray-400">{index + 2}º</div>
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-100 ml-2 mr-3">
                                        {item.player?.photo_url ? (
                                            <img src={item.player.photo_url} alt={item.player.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-bold text-gray-400">{item.player?.name?.substring(0, 2)}</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800 text-sm">{item.player?.name}</h3>
                                        <p className="text-xs text-gray-500">{item.player?.team?.name}</p>
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
        </div>
    );
}
