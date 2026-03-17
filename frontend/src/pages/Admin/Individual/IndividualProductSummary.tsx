import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingBag, Package, ChevronRight, BarChart3, Info } from 'lucide-react';
import api from '../../../services/api';

export function IndividualProductSummary() {
    const { id } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            setLoading(true);
            const res = await api.get(`/admin/championships/${id}/products-summary`);
            setData(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-12 text-center text-slate-500 font-medium">Carregando contagem de produtos...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Resumo de Produtos</h1>
                    <p className="text-slate-500 font-medium">Quantidades totais por variante (tamanhos, etc) para fabricação.</p>
                </div>
                <div className="bg-indigo-50 px-4 py-2 rounded-xl flex items-center gap-2 border border-indigo-100">
                    <Info size={18} className="text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-tight">Apenas inscrições pagas</span>
                </div>
            </div>

            {!data?.products || data.products.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                    <Package className="mx-auto text-slate-200 mb-4" size={64} />
                    <h3 className="text-lg font-bold text-slate-900">Nenhum produto encontrado</h3>
                    <p className="text-slate-500">Certifique-se de que existem inscrições confirmadas com kits vinculados.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {data.products.map((prod: any) => (
                        <div key={prod.product_id} className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-indigo-600">
                                        <ShoppingBag size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 uppercase tracking-tighter">{prod.name}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{prod.variants.length} Variantes escolhidas</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-indigo-600 leading-none">{prod.total}</div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UNID. TOTAL</div>
                                </div>
                            </div>
                            
                            <div className="p-6 flex-1">
                                <div className="space-y-2">
                                    {prod.variants.sort((a: any, b: any) => b.count - a.count).map((variant: any) => (
                                        <div key={variant.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group hover:bg-indigo-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600 group-hover:border-indigo-200 group-hover:text-indigo-600 shadow-sm">
                                                    {variant.name.substring(0, 3).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-slate-700">{variant.name}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                                                    <div 
                                                        className="h-full bg-indigo-500 rounded-full" 
                                                        style={{ width: `${(variant.count / prod.total) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-black text-slate-900">{variant.count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 mt-auto border-t border-slate-100 flex items-center justify-center">
                                <button 
                                    onClick={() => window.print()}
                                    className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center gap-2"
                                >
                                    <BarChart3 size={14} />
                                    Gerar Relatório de Fábrica
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
