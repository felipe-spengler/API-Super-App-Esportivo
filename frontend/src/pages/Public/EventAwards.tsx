import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Medal, Star, User, Image as ImageIcon, Download } from 'lucide-react';
import api from '../../services/api';

interface Player {
    id: number;
    name: string;
    nickname?: string;
    photo_url?: string;
    team_name?: string;
    team_logo?: string;
}

interface Team {
    id: number;
    name: string;
    logo_url?: string;
    players?: Player[];
}

export function EventAwards() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const specificCategoryId = searchParams.get('category_id');

    const [loading, setLoading] = useState(true);
    const [champName, setChampName] = useState('');
    const [championship, setChampionship] = useState<any>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    
    // Preview modal art
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState<string>('');
    
    // Lista unificada de todos os jogadores para pesquisa rápida
    const [allPlayersMap, setAllPlayersMap] = useState<Record<number, Player>>({});

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [champRes, teamsRes] = await Promise.all([
                    api.get(`/championships/${id}`),
                    api.get(`/championships/${id}/teams?with_players=true${specificCategoryId ? `&category_id=${specificCategoryId}` : ''}`)
                ]);

                setChampionship(champRes.data);
                setChampName(champRes.data.name);

                const teamsData = teamsRes.data || [];
                setTeams(teamsData);

                // Build a quick lookup map for players
                const playersMap: Record<number, Player> = {};
                teamsData.forEach((t: Team) => {
                    if (t.players) {
                        t.players.forEach(p => {
                            playersMap[p.id] = {
                                ...p,
                                team_name: t.name,
                                team_logo: t.logo_url
                            };
                        });
                    }
                });
                setAllPlayersMap(playersMap);

            } catch (error) {
                console.error("Erro ao carregar os dados de premiação", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [id, specificCategoryId]);

    const handlePreviewArt = (awardKey: string, categoryIdStr: string, label: string) => {
        let url = `${import.meta.env.VITE_API_URL || '/api'}/art/championship/${id}/award/${awardKey}`;
        if (categoryIdStr !== 'generic') {
            url += `?categoryId=${categoryIdStr}`; // Assuming the backend supports categoryId param
        }
        setPreviewTitle(label);
        setPreviewImage(url);
    };

    const handleDownloadArt = async (url: string, filename: string) => {
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
            console.error("Erro ao baixar. Baixe manualmente.", error);
            window.open(url, '_blank');
        }
    };

    // Função para traduzir o tipo de prêmio
    const getAwardLabel = (key: string, sportName?: string) => {
        const labels: Record<string, string> = {
            'mvp': 'MVP do Campeonato',
            'levantador': 'Melhor Levantador(a)',
            'ponteira': 'Melhor Ponteira(o)',
            'central': 'Melhor Central',
            'oposta': 'Melhor Oposta(o)',
            'libero': 'Melhor Líbero',
            'maior_pontuadora': 'Maior Pontuadora',
            'bloqueadora': 'Melhor Bloqueadora',
            'craque': 'Craque do Campeonato',
            'goleiro': 'Melhor Goleiro(a)',
            'lateral': 'Melhor Lateral',
            'lateral_direito': 'Melhor Lateral Direito',
            'lateral_esquerdo': 'Melhor Lateral Esquerdo',
            'zagueiro': 'Melhor Zagueiro(a)',
            'volante': 'Melhor Volante',
            'meia': 'Melhor Meia',
            'atacante': 'Melhor Atacante',
            'artilheiro': 'Artilheiro(a)',
            'assistencia': 'Líder de Assistências',
            'estreante': 'Atleta Revelação',
            'fixo': 'Melhor Fixo',
            'ala_direito': 'Melhor Lateral Direito',
            'ala_esquerdo': 'Melhor Lateral Esquerdo',
            'ala_direita': 'Melhor Ala Direita',
            'ala_esquerda': 'Melhor Ala Esquerda',
            'pivo': 'Melhor Pivô',
            'armador': 'Melhor Armador(a)',
            'ala_armador': 'Melhor Ala-Armador(a)',
            'ala': 'Melhor Ala',
            'ala_pivo': 'Melhor Ala-Pivô',
            'cestinha': 'Cestinha',
            'reboteiro': 'Líder em Rebotes',
            'ponta_esquerda': 'Melhor Ponta Esquerda',
            'armador_esquerdo': 'Melhor Armador(a) Esquerdo',
            'armador_direito': 'Melhor Armador(a) Direito',
            'ponta_direita': 'Melhor Ponta Direita'
        };
        return labels[key] || key.replace(/_/g, ' ').toUpperCase();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 pb-20 p-4">
                <div className="bg-white p-4 pt-8 shadow-sm flex items-center mb-8 rounded-xl">
                    <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 leading-none">Premiações</h1>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Carregando Destaques...</p>
                </div>
            </div>
        );
    }

    // Processar os prêmios do campeonato
    let targetAwards: any = {};
    if (championship?.awards) {
        if (specificCategoryId && championship.awards[specificCategoryId]) {
            targetAwards = { [specificCategoryId]: championship.awards[specificCategoryId] };
        } else if (specificCategoryId && !championship.awards[specificCategoryId]) {
            targetAwards = {};
        } else {
            targetAwards = championship.awards;
        }
    }

    const hasAnyAward = Object.keys(targetAwards).some(cat => {
        return targetAwards[cat] && typeof targetAwards[cat] === 'object' && Object.keys(targetAwards[cat]).length > 0;
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {previewImage && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden my-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-gray-900 border-l-4 border-yellow-500 pl-2">Arte Oficial: {previewTitle}</h3>
                            </div>
                            <button onClick={() => setPreviewImage(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors font-bold">✕</button>
                        </div>

                        <div className="p-6 flex flex-col items-center">
                            <div className="w-full bg-gray-100 rounded-xl overflow-hidden shadow-inner flex items-center justify-center min-h-[400px]">
                                <img
                                    src={previewImage}
                                    alt="Arte do Jogador"
                                    className="max-w-full max-h-[60vh] object-contain rounded-md"
                                    onError={(e: any) => { e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%221000%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22Arial%22%20font-size%3D%2232%22%20fill%3D%22%239ca3af%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EErro%20ao%20Gerar%20Arte%3C%2Ftext%3E%3C%2Fsvg%3E'; }}
                                />
                            </div>
                            
                            <button
                                onClick={() => handleDownloadArt(previewImage, `arte-${previewTitle.replace(/\s+/g, '-').toLowerCase()}-${id}.jpg`)}
                                className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95 text-lg"
                            >
                                <Download className="w-5 h-5" /> Baixar Imagem
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 leading-none">Destaques e Premiações</h1>
                    <p className="text-xs text-gray-500 mt-1">{champName || 'Carregando...'}</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 md:p-6 mt-4">
                {!hasAnyAward ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                            <Trophy className="w-8 h-8 text-indigo-300" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Nenhuma Premiação Definida</h2>
                        <p className="text-gray-500 max-w-xs mx-auto mt-2">Os melhores do campeonato ainda não foram anunciados pela organização.</p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {Object.keys(targetAwards).map((catKey) => {
                            const catAwards = targetAwards[catKey];
                            if (!catAwards || typeof catAwards !== 'object' || Object.keys(catAwards).length === 0) return null;

                            // Localizar nome da categoria
                            let categoryTitle = 'Geral';
                            if (catKey !== 'generic' && championship.categories) {
                                const foundCat = championship.categories.find((c: any) => c.id.toString() === catKey);
                                if (foundCat) categoryTitle = foundCat.name;
                            }

                            return (
                                <div key={catKey} className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                                    <div className="bg-gradient-to-r from-gray-900 to-indigo-900 p-6 flex items-center justify-between">
                                        <h2 className="text-xl font-black text-white italic tracking-wide">
                                            {categoryTitle}
                                        </h2>
                                        <Medal className="w-8 h-8 text-yellow-400 opacity-80" />
                                    </div>

                                    <div className="p-6 md:p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {Object.entries(catAwards).map(([awardType, data]: [string, any]) => {
                                            const playerId = data?.player_id;
                                            const player = playerId ? allPlayersMap[playerId] : null;

                                            if (!player) return null; // Ignorar prêmio sem jogador compatível nas equipes carregadas

                                            return (
                                                <div key={awardType} className="group relative bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-indigo-200 hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center overflow-hidden">
                                                    
                                                    {/* Badge de Prêmio (Fundo Decorativo) */}
                                                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-yellow-300 to-yellow-500 opacity-20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

                                                    <div className="w-10 h-10 mb-4 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center relative z-10 text-yellow-500">
                                                        <Star className="w-5 h-5 fill-current" />
                                                    </div>

                                                    <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 relative z-10 line-clamp-2 min-h-8 flex items-center justify-center w-full">
                                                        {getAwardLabel(awardType)}
                                                    </h3>

                                                    <div className="w-24 h-24 mb-4 relative z-10">
                                                        <div className="absolute inset-0 bg-transparent rounded-full z-10"></div>
                                                        <div className="w-full h-full rounded-full border-4 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center">
                                                            {player.photo_url ? (
                                                                <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <User className="w-10 h-10 text-gray-300" />
                                                            )}
                                                        </div>
                                                        {player.team_logo && (
                                                            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full p-0.5 shadow-md border-2 border-white z-20">
                                                                <img src={player.team_logo} className="w-full h-full object-contain rounded-full bg-white" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <h4 className="text-base font-black text-gray-900 leading-tight mb-1 relative z-10 line-clamp-1 w-full" title={player.nickname || player.name}>
                                                        {player.nickname || player.name}
                                                    </h4>
                                                    <span className="text-xs font-bold text-gray-500 relative z-10 line-clamp-1 w-full mb-4" title={player.team_name}>
                                                        {player.team_name}
                                                    </span>

                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handlePreviewArt(awardType, catKey, getAwardLabel(awardType)); }}
                                                        className="mt-auto relative z-20 w-full py-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 hover:from-indigo-600 hover:to-purple-700 transition-all shadow-md group-hover:shadow-indigo-500/30"
                                                    >
                                                        <ImageIcon className="w-4 h-4" /> Arte Oficial
                                                    </button>
                                                </div>
                                            );
                                        })}
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
