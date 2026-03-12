import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Timer, Search, Medal, Trophy, Download, Eye, X, Share2, Award, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface RaceResult {
    id: number;
    user_id: number;
    bib_number: string;
    name: string;
    category?: {
        id: number;
        name: string;
        parent_id?: number;
        parent?: { name: string }
    };
    net_time: string;
    position_general: number;
    position_category: number;
}

export function PublicRaceResults() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState<RaceResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [championship, setChampionship] = useState<any>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showArtModal, setShowArtModal] = useState<RaceResult | null>(null);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            setLoading(true);
            const [champRes, resultsRes] = await Promise.all([
                api.get(`/championships/${id}`),
                api.get(`/races/${id}/results`)
            ]);
            setChampionship(champRes.data);
            setResults(resultsRes.data);
        } catch (error) {
            console.error("Erro ao carregar resultados", error);
            toast.error("Erro ao carregar os resultados.");
        } finally {
            setLoading(false);
        }
    }

    // Get unique categories for filtering
    const categories = Array.from(new Set(results.map(r => {
        const cat = r.category;
        if (!cat) return null;
        return cat.parent?.name ? `${cat.parent.name} - ${cat.name}` : cat.name;
    }).filter(Boolean))) as string[];

    const filtered = results.filter(r => {
        const matchesSearch = (r.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (r.bib_number?.toString() || '').includes(searchTerm);

        const catName = r.category?.parent?.name ? `${r.category.parent.name} - ${r.category.name}` : r.category?.name;
        const matchesCategory = selectedCategory === 'all' || catName === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    const getArtUrl = (athlete: RaceResult) => {
        const catName = athlete.category?.parent?.name ? `${athlete.category.parent.name} - ${athlete.category.name}` : athlete.category?.name;
        const rank = athlete.position_category || athlete.position_general || 0;
        return `${import.meta.env.VITE_API_URL || '/api'}/art/championship/${id}/individual/${athlete.user_id}/colocacao?rank=${rank}&category_name=${encodeURIComponent(catName || '')}`;
    };

    const handleDownload = async (athlete: RaceResult) => {
        try {
            const url = getArtUrl(athlete);
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `resultado-${athlete.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Erro ao baixar art", error);
            toast.error("Erro ao gerar imagem.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            {/* Header / Hero */}
            <div className="bg-indigo-600 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-indigo-600 to-indigo-800 opacity-90"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>

                <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors mb-6 backdrop-blur-md inline-flex items-center gap-2 text-xs font-black uppercase tracking-tighter">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-white text-indigo-600 px-3 py-1 rounded-full mb-3 inline-block shadow-lg shadow-black/10">Resultados Oficiais</span>
                            <h1 className="text-4xl md:text-5xl font-black uppercase italic leading-none tracking-tight">{championship?.name || 'Carregando...'}</h1>
                            <p className="text-indigo-100 font-bold mt-2 uppercase text-xs tracking-widest opacity-80 flex items-center gap-2">
                                <Timer className="w-4 h-4" /> {new Date(championship?.start_date).toLocaleDateString()} • {championship?.location || 'Local a definir'}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center flex-1 md:flex-none min-w-[120px]">
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Total Inscritos</p>
                                <p className="text-2xl font-black italic">{results.length}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-center flex-1 md:flex-none min-w-[120px]">
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Categorias</p>
                                <p className="text-2xl font-black italic">{categories.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 -mt-8 relative z-20">
                {/* Controls */}
                <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por número ou nome do atleta..."
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="md:w-64">
                            <select
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                                className="w-full py-4 px-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm appearance-none cursor-pointer"
                            >
                                <option value="all">Todas as Categorias</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                        <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em] animate-pulse">Cruzando a linha de chegada...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Award className="text-slate-300 w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 uppercase italic">Nenhum atleta encontrado</h3>
                        <p className="text-slate-400 max-w-xs mx-auto mt-2 font-medium">Os resultados podem não estar publicados ou sua busca não retornou dados.</p>
                        <button onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }} className="mt-6 text-indigo-600 font-black uppercase text-xs tracking-widest">Limpar Filtros</button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Highlighting Category Header if filtered */}
                        {selectedCategory !== 'all' && (
                            <div className="flex items-center gap-4 mb-2">
                                <div className="h-[2px] flex-1 bg-slate-200"></div>
                                <h2 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] italic">{selectedCategory}</h2>
                                <div className="h-[2px] flex-1 bg-slate-200"></div>
                            </div>
                        )}

                        <div className="grid gap-4">
                            {filtered.map((r, index) => {
                                // Determinamos a posição relativa para o estilo (se houver filtro de categoria é a real da categoria, se não é a geral)
                                const displayRank = selectedCategory !== 'all' ? r.position_category : r.position_general;
                                const isTop3 = displayRank <= 3;

                                return (
                                    <div
                                        key={r.id}
                                        className={`group relative bg-white p-5 rounded-[1.5rem] border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden
                                            ${isTop3 ? 'border-amber-200 shadow-lg shadow-amber-100/50' : 'border-slate-100 hover:border-indigo-200 shadow-sm'}
                                        `}
                                    >
                                        {/* Rank Badge Floating for Top 3 background */}
                                        {isTop3 && (
                                            <div className={`absolute -right-8 -top-8 w-32 h-32 opacity-5 rotate-12 transition-transform group-hover:rotate-0
                                                ${displayRank === 1 ? 'text-amber-500' : displayRank === 2 ? 'text-slate-400' : 'text-orange-500'}
                                            `}>
                                                <Trophy size={128} />
                                            </div>
                                        )}

                                        <div className="flex items-center gap-5 flex-1">
                                            {/* Rank Circle */}
                                            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black transition-all shrink-0
                                                ${displayRank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-200 scale-110' :
                                                    displayRank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-lg shadow-slate-200 scale-105' :
                                                        displayRank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-200' :
                                                            'bg-slate-50 text-slate-400 border border-slate-100'}
                                            `}>
                                                <span className="text-xl italic leading-none">{displayRank}º</span>
                                                <Medal size={14} className="mt-1 opacity-50" />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tight truncate group-hover:text-indigo-600 transition-colors">
                                                        {r.name}
                                                    </h3>
                                                    <span className="bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded italic">#{String(r.bib_number).padStart(3, '0')}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest line-clamp-1">
                                                        {r.category?.parent?.name ? `${r.category.parent.name} - ${r.category.name}` : r.category?.name}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between md:justify-end gap-6 pl-16 md:pl-0">
                                            <div className="text-left md:text-right">
                                                <div className="flex items-center gap-2 font-mono font-black text-2xl text-slate-900 italic leading-none">
                                                    <Timer size={18} className="text-indigo-600" />
                                                    {r.net_time || '--:--:--'}
                                                </div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Tempo Líquido Oficinal</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setShowArtModal(r)}
                                                    className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                    title="Ver Foto do Resultado"
                                                >
                                                    <Share2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(r)}
                                                    className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-black transition-all shadow-sm md:hidden lg:flex"
                                                    title="Baixar Card"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ART PREVIEW MODAL */}
            {showArtModal && (
                <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden relative shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowArtModal(null)}
                            className="absolute top-6 right-6 z-20 w-10 h-10 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center backdrop-blur-md text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="p-8 pb-4">
                            <h3 className="text-2xl font-black text-slate-900 uppercase italic leading-none">Seu Resultado Estampado</h3>
                            <p className="text-slate-500 text-sm mt-2 font-medium">Gere seu card oficial e compartilhe sua conquista!</p>
                        </div>

                        <div className="flex-1 p-8 pt-2">
                            <div className="aspect-[4/5] bg-slate-100 rounded-[2rem] overflow-hidden relative shadow-inner group">
                                <img
                                    src={getArtUrl(showArtModal)}
                                    className="w-full h-full object-contain"
                                    alt="Arte de Resultado"
                                />
                                <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 transition-colors flex items-center justify-center pointer-events-none">
                                    <div className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity scale-90 group-hover:scale-100">
                                        <Eye size={32} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <button
                                    onClick={() => handleDownload(showArtModal)}
                                    className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 transition-all active:scale-95"
                                >
                                    <Download size={20} /> Baixar JPG
                                </button>
                                <button
                                    onClick={() => {
                                        const url = getArtUrl(showArtModal);
                                        if (navigator.share) {
                                            navigator.share({
                                                title: `Meu resultado no ${championship.name}`,
                                                text: `Fiquei em ${showArtModal.position_category}º lugar na minha categoria!`,
                                                url: url
                                            });
                                        } else {
                                            window.open(url, '_blank');
                                        }
                                    }}
                                    className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95"
                                >
                                    <Share2 size={20} /> Compartilhar
                                </button>
                            </div>
                        </div>

                        <div className="px-8 pb-8 text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aumente sua foto de perfil na área do atleta para melhores resultados</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
