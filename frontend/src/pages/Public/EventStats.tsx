
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Target, Shield, Hand, Star, AlertTriangle, AlertOctagon, Trophy } from 'lucide-react';
import api from '../../services/api';

export function EventStats() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const categoryId = searchParams.get('category_id');
    const type = searchParams.get('type') || 'goals';
    const title = searchParams.get('title') || 'Estatísticas';
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

                const response = await api.get(`/championships/${id}/stats`, {
                    params: { type, category_id: categoryId }
                });
                setStats(response.data);

            } catch (error) {
                console.error("Erro ao carregar estatísticas", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id, type, categoryId]);

    const getIcon = () => {
        switch (type) {
            case 'goals': return <Target className="w-5 h-5 text-gray-500" />;
            case 'cards': return <AlertTriangle className="w-5 h-5 text-red-500" />;
            case 'yellow_cards': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'red_cards': return <AlertOctagon className="w-5 h-5 text-red-600" />;
            case 'assists': return <Hand className="w-5 h-5 text-blue-500" />;
            case 'blocks': return <Shield className="w-5 h-5 text-cyan-500" />;
            case 'aces': return <Star className="w-5 h-5 text-yellow-500" />;
            case 'points': return <Trophy className="w-5 h-5 text-orange-500" />;
            default: return <Target className="w-5 h-5 text-gray-500" />;
        }
    };

    const getValueLabel = () => {
        switch (type) {
            case 'goals': return 'Gols';
            case 'cards': return 'Cartões';
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
                            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-center">
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
        </div>
    );
}
