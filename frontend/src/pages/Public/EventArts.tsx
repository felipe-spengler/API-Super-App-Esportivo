
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

                // Fetch all matches 
                const matchesRes = await api.get(`/championships/${id}/matches`);
                setMatches(matchesRes.data);

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

    const [artType, setArtType] = useState<'mvp' | 'scheduled' | 'faceoff'>('faceoff');

    const getArtUrl = (matchId: number, type: string) => {
        return `${import.meta.env.VITE_API_URL || '/api'}/public/art/match/${matchId}/${type}`;
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
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelectedArt(null)}>
                    <div className="relative max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden my-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-gray-900">Artes da Partida</h3>
                                <p className="text-xs text-gray-500">{selectedArt.matchLabel}</p>
                            </div>
                            <button onClick={() => setSelectedArt(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">✕</button>
                        </div>

                        <div className="p-6">
                            {/* Art Type Selector */}
                            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                                <button
                                    onClick={() => setArtType('faceoff')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${artType === 'faceoff' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Confronto
                                </button>
                                <button
                                    onClick={() => setArtType('scheduled')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${artType === 'scheduled' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Agendado
                                </button>
                                <button
                                    onClick={() => setArtType('mvp')}
                                    disabled={!selectedArt.hasMvp}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${artType === 'mvp' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'} ${!selectedArt.hasMvp ? 'opacity-30 cursor-not-allowed' : ''}`}
                                >
                                    MVP Partida
                                </button>
                            </div>

                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Preview */}
                                <div className="flex-1 bg-gray-100 rounded-xl overflow-hidden aspect-[4/5] relative group">
                                    <img
                                        src={getArtUrl(selectedArt.matchId, artType)}
                                        alt="Arte Gerada"
                                        className="w-full h-full object-contain"
                                        key={`${selectedArt.matchId}-${artType}`}
                                        onError={(e: any) => { e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%221000%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22Arial%22%20font-size%3D%2232%22%20fill%3D%22%239ca3af%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EErro%20ao%20Gerar%20Arte%3C%2Ftext%3E%3C%2Fsvg%3E'; }}
                                    />
                                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 hidden group-data-[loading=true]:block" />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="md:w-48 flex flex-col gap-3 justify-center">
                                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl mb-auto">
                                        <p className="text-xs text-indigo-700 font-medium mb-1">Dica:</p>
                                        <p className="text-[10px] text-indigo-600 leading-relaxed">
                                            {artType === 'faceoff' && 'Ideal para postar o resultado final do jogo.'}
                                            {artType === 'scheduled' && 'Use para anunciar o próximo confronto.'}
                                            {artType === 'mvp' && 'Homenageie o craque que brilhou na partida.'}
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => handleDownload(getArtUrl(selectedArt.matchId, artType), `arte-${artType}-${selectedArt.matchId}.jpg`)}
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                                    >
                                        <Download className="w-5 h-5" /> Baixar JPG
                                    </button>
                                    <button
                                        onClick={() => setSelectedArt(null)}
                                        className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all"
                                    >
                                        Fechar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        <p className="text-gray-500 font-medium animate-pulse">Carregando Galeria...</p>
                    </div>
                ) : matches.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-gray-300" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Nenhuma partida ainda</h2>
                        <p className="text-gray-500 max-w-xs mx-auto mt-2">As artes estarão disponíveis assim que as partidas forem agendadas.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {matches.map((match) => {
                            const matchLabel = `${match.home_team?.name} vs ${match.away_team?.name}`;
                            const isFinished = match.status === 'finished';

                            return (
                                <div
                                    key={match.id}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                                    onClick={() => {
                                        setArtType(isFinished ? 'faceoff' : 'scheduled');
                                        setSelectedArt({
                                            matchId: match.id,
                                            matchLabel,
                                            hasMvp: !!match.mvp_player_id
                                        });
                                    }}
                                >
                                    <div className="h-32 bg-gray-900 relative">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 z-10" />
                                        <div className="absolute inset-0 flex items-center justify-around px-4 z-20">
                                            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                                                {match.home_team?.logo_url ? <img src={match.home_team.logo_url} className="w-10 h-10 object-contain" /> : <Shield className="w-8 h-8 text-white/50" />}
                                            </div>
                                            <div className="text-white font-black text-xl italic opacity-50 px-2">VS</div>
                                            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                                                {match.away_team?.logo_url ? <img src={match.away_team.logo_url} className="w-10 h-10 object-contain" /> : <Shield className="w-8 h-8 text-white/50" />}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${isFinished ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {isFinished ? 'Finalizado' : 'Próximo Jogo'}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                {match.start_time ? new Date(match.start_time).toLocaleDateString() : 'A definir'}
                                            </span>
                                        </div>

                                        <h3 className="font-bold text-gray-800 text-sm mb-4 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                            {match.home_team?.name} {match.home_score !== null ? match.home_score : ''}
                                            <span className="mx-1 opacity-30">x</span>
                                            {match.away_score !== null ? match.away_score : ''} {match.away_team?.name}
                                        </h3>

                                        <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                                            {match.mvp_player_id ? (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                                                        <Trophy className="w-3 h-3" />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-indigo-600 truncate">
                                                        {match.mvp?.name || 'Craque Indefinido'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 flex-1 opacity-30">
                                                    <User className="w-5 h-5 text-gray-400" />
                                                    <span className="text-[11px] font-medium text-gray-400">MVP não definido</span>
                                                </div>
                                            )}
                                            <button className="bg-gray-100 group-hover:bg-indigo-600 text-gray-400 group-hover:text-white p-2 rounded-lg transition-all">
                                                <Eye className="w-4 h-4" />
                                            </button>
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

// Helper icons that were missing in initial imports
const Shield = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04a11.3 11.3 0 00-1.133 5.89c0 5.423 2.367 10.339 6.202 13.73a1.342 1.342 0 001.574 0c3.835-3.391 6.202-8.307 6.202-13.73a11.3 11.3 0 00-1.133-5.89z" /></svg>
);
const Trophy = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
);
