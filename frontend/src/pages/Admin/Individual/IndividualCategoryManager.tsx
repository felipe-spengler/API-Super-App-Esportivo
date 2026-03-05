import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layers, Plus, Trash, Edit, Settings2 } from 'lucide-react';
import api from '../../../services/api';

export function IndividualCategoryManager() {
    const { id } = useParams();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/admin/championships/${id}/categories`).then(res => setCategories(res.data)).catch(() => { }).finally(() => setLoading(false));
    }, [id]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Categorias de Prova</h1>
                    <p className="text-slate-500 font-medium">Defina as distâncias, faixas etárias e preços por categoria.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 font-bold transition-all shadow-lg">
                    <Plus size={18} />
                    Nova Categoria
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">
                                <Layers size={24} />
                            </div>
                            <div className="flex gap-1">
                                <button className="p-2 text-slate-400 hover:text-slate-900">
                                    <Edit size={16} />
                                </button>
                                <button className="p-2 text-slate-400 hover:text-red-500">
                                    <Trash size={16} />
                                </button>
                            </div>
                        </div>
                        <h3 className="font-black text-slate-900 text-lg">{cat.name}</h3>
                        <p className="text-slate-500 text-sm mb-4">Gênero: {cat.gender || 'Ambos'} | Idade: {cat.min_age}-{cat.max_age}</p>

                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400">
                            <span>Preço Base</span>
                            <span className="text-slate-900 font-black">R$ 0,00</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
