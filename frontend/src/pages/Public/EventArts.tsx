
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Eye, Calendar, User } from 'lucide-react';
import api from '../../services/api';

export function EventArts() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [champName, setChampName] = useState('');
    const [selectedArt, setSelectedArt] = useState<any>(null); // Se selecionado, mostra modal

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const champRes = await api.get(`/championships/${id}`);
                setChampName(champRes.data.name);

                // Fetch matches and filter by those having MVP
                const matchesRes = await api.get(`/championships/${id}/matches`);
                const matchesWithMvp = matchesRes.data.filter((m: any) => m.mvp_player_id);
                setMatches(matchesWithMvp);

            } catch (error) {
                console.error("Erro ao carregar artes", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id]);

    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Erro ao baixar", error);
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
                    <h1 className="text-xl font-bold text-gray-800 leading-none">Galeria de Artes</h1>
                    <p className="text-xs text-gray-500 mt-1">{champName}: Cards Oficiais</p>
                </div>
            </div>

            {selectedArt && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedArt(null)}>
                    <div className="relative max-w-lg w-full bg-white rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-3 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Card Oficial</h3>
                            <button onClick={() => setSelectedArt(null)} className="text-gray-500 hover:text-gray-800">✕</button>
                        </div>
                        <div className="bg-gray-200">
                            <img
                                src={selectedArt.url}
                                alt="Arte Gerada"
                                className="w-full h-auto object-contain"
                                onError={(e: any) => { e.target.src = 'https://via.placeholder.com/800x1000?text=Erro+ao+Gerar+Arte'; }}
                            />
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3">
                            <button onClick={() => setSelectedArt(null)} className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-lg">
                                Fechar
                            </button>
                            <button
                                onClick={() => handleDownload(selectedArt.url, `card-mvp-${selectedArt.matchId}.jpg`)}
                                className="w-full py-3 bg-green-600 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" /> Baixar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto p-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-gray-100">
                        <p className="text-gray-500">Nenhuma arte disponível (nenhum MVP definido ainda).</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {matches.map((match) => {
                            // Construct public Image URL
                            const artUrl = `${import.meta.env.VITE_API_URL || '/api'}/public/art/match/${match.id}/mvp`;

                            return (
                                <div key={match.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                                    {/* Preview Fake (could be valid image if cached, but using small layout) */}
                                    <div className="h-40 bg-gray-800 relative flex items-center justify-center overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                                        <img
                                            src={artUrl}
                                            loading="lazy"
                                            className="w-full h-full object-cover opacity-50 blur-sm scale-110"
                                            alt="Preview"
                                        />
                                        <div className="absolute inset-0 z-20 flex items-center justify-center">
                                            <button
                                                onClick={() => setSelectedArt({ url: artUrl, matchId: match.id })}
                                                className="bg-white/20 backdrop-blur-md border border-white/50 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-white/30 transition-all"
                                            >
                                                <Eye className="w-4 h-4" />
                                                Ver Arte
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                MVP DA PARTIDA
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(match.start_time).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-gray-800 text-sm mb-1">
                                            {match.home_team?.name} {match.home_score}x{match.away_score} {match.away_team?.name}
                                        </h3>

                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden">
                                                {match.mvp_player?.photo_url ? (
                                                    <img src={match.mvp_player.photo_url} className="w-full h-full object-cover" />
                                                ) : <User className="w-4 h-4 m-1 text-gray-400" />}
                                            </div>
                                            <span className="text-xs font-medium text-gray-600 truncate flex-1">
                                                {match.mvp_player?.name || 'Desconhecido'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
