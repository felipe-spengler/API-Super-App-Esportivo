import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Palette, Wand2, Download, RefreshCw, AlertCircle, Image as ImageIcon, ChevronRight, Layers } from 'lucide-react';
import api from '../../../services/api';

export function IndividualArtManager() {
    const { id } = useParams();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            const response = await api.get(`/admin/championships/${id}/categories`);
            setCategories(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Artes por Categoria</h1>
                    <p className="text-slate-500 font-medium">Gere artes personalizadas com templates exclusivos para cada prova.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-bold transition-all shadow-lg">
                    <RefreshCw size={18} />
                    Gerar em Massa
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full p-12 text-center text-slate-400">Carregando categorias...</div>
                ) : categories.length === 0 ? (
                    <div className="col-span-full p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center">
                        <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-slate-900">Nenhuma categoria configurada</h3>
                        <p className="text-slate-500">Configure as categorias do evento para começar a gerar artes.</p>
                    </div>
                ) : (
                    categories.map(category => (
                        <div key={category.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-xl transition-all">
                            <div className="aspect-video bg-slate-100 relative group-hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-300">
                                <ImageIcon size={48} />
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-slate-900 text-[10px] font-black rounded-full uppercase shadow-sm">
                                        {category.gender || 'Geral'} • {category.min_age}-{category.max_age} anos
                                    </span>
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-lg font-black text-slate-900 mb-1">{category.name}</h3>
                                <p className="text-slate-500 text-sm mb-6 flex items-center gap-1">
                                    <Layers size={14} />
                                    {category.subcategories_count || 0} subcategorias
                                </p>

                                <div className="grid grid-cols-2 gap-2">
                                    <button className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all">
                                        <Wand2 size={14} />
                                        Gerar Arte
                                    </button>
                                    <button className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all">
                                        <Download size={14} />
                                        Baixar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
