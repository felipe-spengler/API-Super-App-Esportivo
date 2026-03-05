import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Timer, Search, Medal, Trophy } from 'lucide-react';
import api from '../../services/api';

interface RaceResult {
    id: number;
    bib_number: string;
    name: string;
    category?: { name: string; parent?: { name: string } };
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

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            setLoading(true);
            const [champRes, resultsRes] = await Promise.all([
                api.get(`/championships/${id}`),
                api.get(`/races/${id}/results`) // Using the same endpoint as admin if it's public enough, or a specific public one
            ]);
            setChampionship(champRes.data);
            setResults(resultsRes.data);
        } catch (error) {
            console.error("Erro ao carregar resultados", error);
        } finally {
            setLoading(false);
        }
    }

    const filtered = results.filter(r =>
        (r.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (r.bib_number?.toString() || '').includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 uppercase leading-tight italic">Resultados</h1>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{championship?.name || 'Carregando...'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 mt-8">
                {/* Search */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por peito ou nome..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Processando Rankings...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
                        <Timer className="mx-auto text-slate-200 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-slate-900 uppercase">Nenhum resultado disponível</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-1 text-sm">Os resultados serão publicados assim que o evento for concluído.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filtered.map((r, index) => (
                            <div key={r.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm italic ${index === 0 ? 'bg-amber-100 text-amber-600' :
                                            index === 1 ? 'bg-slate-100 text-slate-600' :
                                                index === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                                        }`}>
                                        {index + 1}º
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{r.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded leading-none">#{r.bib_number}</span>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                {r.category?.name} {r.category?.parent?.name ? `(${r.category.parent.name})` : ''}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1.5 font-mono font-black text-slate-900 text-lg italic leading-none">
                                        <Timer size={14} className="text-indigo-600" />
                                        {r.net_time || '--:--:--'}
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Tempo Líquido</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
