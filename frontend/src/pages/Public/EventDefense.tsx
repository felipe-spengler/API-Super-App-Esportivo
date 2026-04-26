
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Download, Image as ImageIcon } from 'lucide-react';
import api from '../../services/api';

export function EventDefense() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [champName, setChampName] = useState('');
    const [generatingArt, setGeneratingArt] = useState(false);
    const [selectedArtUrl, setSelectedArtUrl] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const champRes = await api.get(`/championships/${id}`);
                setChampName(champRes.data.name);
                setCategories(champRes.data.categories || []);
                
                if (champRes.data.categories?.length > 0 && !selectedCategory) {
                    setSelectedCategory(champRes.data.categories[0].id.toString());
                }

                const res = await api.get(`/championships/${id}/stats`, {
                    params: { 
                        type: 'defense',
                        category_id: selectedCategory 
                    }
                });
                setStats(res.data);
            } catch (error) {
                console.error("Erro ao carregar defesa", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id, selectedCategory]);

    const handleShowArt = (teamId?: number) => {
        const url = `${import.meta.env.VITE_API_URL || '/api'}/public/art/championship/${id}/defense?category_id=${selectedCategory}${teamId ? `&team_id=${teamId}` : ''}`;
        setSelectedArtUrl(url);
    };

    const handleDownloadBlob = async (url: string) => {
        try {
            setGeneratingArt(true);
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.body.appendChild(document.createElement('a'));
            link.href = downloadUrl;
            link.download = `melhor-defesa-${Date.now()}.jpg`;
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Erro ao baixar", error);
        } finally {
            setGeneratingArt(false);
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
                    <h1 className="text-xl font-bold text-gray-800 leading-none">Melhor Defesa</h1>
                    <p className="text-xs text-gray-500 mt-1">{champName}</p>
                </div>
            </div>

            {/* Modal de Visualização */}
            {selectedArtUrl && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedArtUrl(null)}>
                    <div className="relative max-w-lg w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">Visualizar Arte</h3>
                            <button onClick={() => setSelectedArtUrl(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">✕</button>
                        </div>
                        <div className="p-6">
                            <div className="aspect-[4/5] bg-gray-100 rounded-2xl overflow-hidden mb-6 border border-gray-100 shadow-inner">
                                <img 
                                    src={selectedArtUrl} 
                                    alt="Melhor Defesa" 
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => handleDownloadBlob(selectedArtUrl)}
                                    disabled={generatingArt}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Download className="w-5 h-5" /> 
                                    {generatingArt ? 'Baixando...' : 'Baixar Imagem'}
                                </button>
                                <button 
                                    onClick={() => setSelectedArtUrl(null)}
                                    className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-all"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-2xl mx-auto p-4">
                {/* Categories Filter */}
                {categories.length > 1 && (
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id.toString())}
                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat.id.toString() ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-105' : 'bg-white text-gray-500 border border-gray-100'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="text-gray-500 font-medium animate-pulse">Calculando estatísticas...</p>
                    </div>
                ) : stats.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-8 h-8 text-gray-300" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Sem dados ainda</h2>
                        <p className="text-gray-500 max-w-xs mx-auto mt-2">As estatísticas de defesa serão exibidas assim que os jogos terminarem.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Summary Card for 1st place */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl shadow-blue-100 mb-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Shield className="w-32 h-32" />
                            </div>
                            <div className="relative z-10">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Líder em Defesa</span>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                                        {stats[0].team_logo ? (
                                            <img src={stats[0].team_logo} className="w-10 h-10 object-contain" />
                                        ) : (
                                            <Shield className="w-8 h-8 text-white/50" />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black truncate max-w-[200px]">{stats[0].team_name}</h2>
                                        <p className="text-sm font-medium opacity-80">{stats[0].value} gols sofridos em {stats[0].matches_played} jogos</p>
                                    </div>
                                </div>
                                <div className="mt-6 flex gap-2">
                                    <button 
                                        onClick={() => handleShowArt(stats[0].id)}
                                        className="flex-1 bg-white text-blue-700 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors shadow-lg active:scale-95"
                                    >
                                        <ImageIcon className="w-4 h-4" /> 
                                        Visualizar Arte (Story)
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Full Ranking */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                <h3 className="font-bold text-gray-800 text-sm">Ranking de Defesa</h3>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Gols Sofridos</span>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {stats.map((item, index) => (
                                    <div key={item.id} className="p-4 flex items-center hover:bg-gray-50 transition-colors">
                                        <div className={`w-6 text-xs font-black ${index === 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                            {index + 1}º
                                        </div>
                                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 mx-3">
                                            {item.team_logo ? (
                                                <img src={item.team_logo} className="w-6 h-6 object-contain" />
                                            ) : (
                                                <Shield className="w-4 h-4 text-gray-300" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800 text-sm">{item.team_name}</h4>
                                            <p className="text-[10px] text-gray-400">{item.matches_played} partidas</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-black text-gray-800 leading-none">{item.value}</div>
                                            <div className="text-[9px] text-gray-400 font-bold uppercase mt-1">Gols</div>
                                        </div>
                                        <button 
                                            onClick={() => handleShowArt(item.id)}
                                            className="ml-4 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                            title="Visualizar Arte"
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
