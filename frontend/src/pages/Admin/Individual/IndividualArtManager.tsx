import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Palette, Wand2, Download, Image as ImageIcon, Layers, Layout, ChevronRight, Settings2, Upload } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

export function IndividualArtManager() {
    const { id } = useParams();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedCategory, setSelectedCategory] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            setLoading(true);
            // standardized endpoint
            const response = await api.get(`/admin/championships/${id}/categories-list`);
            setCategories(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleUploadClick = (category: any) => {
        setSelectedCategory(category);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedCategory) return;

        const formData = new FormData();
        formData.append('image', file);
        formData.append('category_id', selectedCategory.id);
        formData.append('championship_id', id!);

        setUploadingId(selectedCategory.id);
        const toastId = toast.loading(`Enviando fundo para ${selectedCategory.name}...`);

        try {
            await api.post(`/admin/championships/${id}/categories/${selectedCategory.id}/art-background`, formData);
            toast.success('Fundo atualizado com sucesso!', { id: toastId });
            loadData();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao fazer upload do fundo.', { id: toastId });
        } finally {
            setUploadingId(null);
            setSelectedCategory(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase">Configuração de Artes</h1>
                    <p className="text-slate-500 font-medium font-bold italic">Configure os fundos e posições dos elementos para as artes automáticas.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to={`/admin/individual/championships/${id}/arts/editor`}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black transition-all shadow-xl uppercase tracking-widest text-xs"
                    >
                        <Layout size={18} />
                        Editor de Templates
                    </Link>
                </div>
            </div>

            {/* Global Templates Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <ImageIcon size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 uppercase">Template: Atleta Confirmado</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase italic">Usado no momento da inscrição</p>
                        </div>
                    </div>
                    <Link
                        to={`/admin/individual/championships/${id}/arts/editor?template=Atleta%20Confirmado`}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all group"
                    >
                        <span className="text-sm font-black text-slate-700 uppercase">Configurar Fundo e Posições</span>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                    </Link>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <Palette size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 uppercase">Template: Colocação</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase italic">Usado nos resultados e pódios</p>
                        </div>
                    </div>
                    <Link
                        to={`/admin/individual/championships/${id}/arts/editor?template=Colocação%20do%20Atleta`}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-all group"
                    >
                        <span className="text-sm font-black text-slate-700 uppercase">Configurar Fundo e Posições</span>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </Link>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
                <h2 className="text-lg font-black text-slate-900 mb-4 uppercase flex items-center gap-2">
                    <Settings2 size={20} className="text-indigo-500" />
                    Ajustes por Categoria
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full p-12 text-center text-slate-400 font-black uppercase italic">Carregando categorias...</div>
                    ) : categories.length === 0 ? (
                        <div className="col-span-full p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center">
                            <ImageIcon className="mx-auto text-slate-200 mb-4" size={48} />
                            <h3 className="text-lg font-bold text-slate-900 uppercase">Nenhuma categoria configurada</h3>
                            <p className="text-slate-500 font-medium italic">As categorias aparecem aqui automaticamente.</p>
                        </div>
                    ) : (
                        categories.map(category => (
                            <div key={category.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-500 transition-all">
                                {category.art_background_url && (
                                    <div className="aspect-video w-full bg-slate-100 relative overflow-hidden border-b border-slate-100">
                                        <img src={category.art_background_url} alt={category.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                onClick={() => handleUploadClick(category)}
                                                className="px-4 py-2 bg-white text-slate-900 rounded-xl font-black text-xs uppercase shadow-xl"
                                            >
                                                Alterar Fundo
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
                                            <Layers size={18} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {category.gender || 'Geral'}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 mb-4 uppercase">{category.name}</h3>

                                    <div className="space-y-2">
                                        {!category.art_background_url && (
                                            <button
                                                onClick={() => handleUploadClick(category)}
                                                disabled={uploadingId === category.id}
                                                className="w-full py-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                            >
                                                <Upload size={14} />
                                                {uploadingId === category.id ? 'Enviando...' : 'Fundo Específico'}
                                            </button>
                                        )}
                                        <p className="text-[10px] text-slate-500 text-center italic font-bold uppercase tracking-tight">
                                            {category.art_background_url ? 'Fundo personalizado ativo' : 'Usando fundo global do template'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
