import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layers, Plus, Trash, Edit, Settings2, X, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../../services/api';

interface Category {
    id: number;
    name: string;
    description: string;
    gender: string;
    min_age: number | null;
    max_age: number | null;
    price: number;
    parent_id: number | null;
    children?: Category[];
}

export function IndividualCategoryManager() {
    const { id } = useParams();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        gender: 'MISTO',
        min_age: '',
        max_age: '',
        price: '',
        parent_id: null as number | null
    });

    useEffect(() => {
        loadCategories();
    }, [id]);

    async function loadCategories() {
        try {
            setLoading(true);
            const response = await api.get(`/admin/championships/${id}/categories-list`);
            // Organizar hierarquicamente
            const all = response.data as Category[];
            const parents = all.filter(c => !c.parent_id);
            parents.forEach(p => {
                p.children = all.filter(c => c.parent_id === p.id);
            });
            setCategories(parents);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleOpenModal = (cat: Category | null = null, parentId: number | null = null) => {
        if (cat) {
            setEditingCategory(cat);
            setFormData({
                name: cat.name,
                description: cat.description || '',
                gender: cat.gender || 'MISTO',
                min_age: cat.min_age?.toString() || '',
                max_age: cat.max_age?.toString() || '',
                price: cat.price?.toString() || '0',
                parent_id: cat.parent_id
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                description: '',
                gender: 'MISTO',
                min_age: '',
                max_age: '',
                price: '',
                parent_id: parentId
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                min_age: formData.min_age ? parseInt(formData.min_age) : null,
                max_age: formData.max_age ? parseInt(formData.max_age) : null,
                price: parseFloat(formData.price) || 0
            };

            if (editingCategory) {
                await api.put(`/admin/championships/${id}/categories/${editingCategory.id}`, payload);
            } else {
                await api.post(`/admin/championships/${id}/categories-new`, payload);
            }
            setShowModal(false);
            loadCategories();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar categoria');
        }
    };

    const handleDelete = async (catId: number) => {
        if (!confirm('Deseja realmente excluir esta categoria? Subcategorias também serão afetadas.')) return;
        try {
            await api.delete(`/admin/championships/${id}/categories/${catId}`);
            loadCategories();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir categoria. Verifique se existem atletas vinculados.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Categorias de Prova</h1>
                    <p className="text-slate-500 font-medium">Defina as distâncias, faixas etárias e preços por categoria.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 font-bold transition-all shadow-lg"
                >
                    <Plus size={18} />
                    Nova Categoria
                </button>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-500 font-medium">Carregando categorias...</div>
            ) : categories.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                    <Layers className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-slate-900">Nenhuma categoria configurada</h3>
                    <p className="text-slate-500 mb-6">Crie a primeira categoria para iniciar as inscrições.</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all"
                    >
                        Adicionar Agora
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {categories.map(cat => (
                        <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-pink-100 text-pink-600 rounded-xl">
                                        <Layers size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">{cat.name}</h3>
                                        <p className="text-slate-500 text-sm font-medium">
                                            {cat.gender === 'MISTO' ? 'Misto' : cat.gender === 'M' ? 'Masculino' : 'Feminino'}
                                            {Number(cat.price || 0) > 0 && ` • R$ ${Number(cat.price || 0).toFixed(2).replace('.', ',')}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenModal(null, cat.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-xs font-bold transition-all"
                                    >
                                        <Plus size={14} />
                                        Subcategoria
                                    </button>
                                    <button
                                        onClick={() => handleOpenModal(cat)}
                                        className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash size={18} />
                                    </button>
                                </div>
                            </div>

                            {cat.children && cat.children.length > 0 && (
                                <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {cat.children.map(sub => (
                                        <div key={sub.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{sub.name}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                    {sub.min_age || '∞'} - {sub.max_age || '∞'} Anos • {sub.gender === 'MISTO' ? 'Misto' : sub.gender === 'M' ? 'Masculino' : 'Feminino'}
                                                    {Number(sub.price || 0) > 0 && ` • R$ ${Number(sub.price || 0).toFixed(2).replace('.', ',')}`}
                                                </p>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenModal(sub)}
                                                    className="p-1.5 text-slate-400 hover:text-slate-900"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(sub.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500"
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-xl font-black text-slate-900">
                                {editingCategory ? (
                                    formData.parent_id ? 'Editar Subcategoria' : 'Editar Categoria'
                                ) : (
                                    formData.parent_id ? 'Nova Subcategoria' : 'Nova Categoria'
                                )}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                    {formData.parent_id ? 'Nome da Subcategoria (Ex: 18-29 anos)' : 'Nome da Categoria (Ex: 5km, Kids...)'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-bold"
                                    placeholder={formData.parent_id ? "Ex: Masculino 18 a 29 anos" : "Ex: 5km Geral"}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {!formData.parent_id && (
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Descrição Curta / Info</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-medium"
                                        placeholder="Ex: Largada às 08h, Kit incluso..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                        {formData.parent_id ? 'Preço Específico (R$)' : 'Preço Base (R$)'}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-bold"
                                        placeholder="0,00"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    />
                                    <p className="mt-1 text-[9px] text-slate-400 font-bold uppercase italic">
                                        {formData.parent_id ? 'Se vazio, usa o preço da categoria pai' : 'Preço padrão para as subcategorias'}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Gênero</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-bold"
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                    >
                                        <option value="MISTO">Misto</option>
                                        <option value="M">Masculino</option>
                                        <option value="F">Feminino</option>
                                    </select>
                                </div>
                            </div>

                            {formData.parent_id && (
                                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0" />
                                    <p className="text-[10px] text-indigo-700 font-medium">
                                        <strong>Subcategoria:</strong> Defina abaixo a faixa etária para esta divisão específica.
                                        Deixe em branco para permitir qualquer idade.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Idade Mínima</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-bold"
                                        placeholder="Livre"
                                        value={formData.min_age}
                                        onChange={e => setFormData({ ...formData, min_age: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Idade Máxima</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none font-bold"
                                        placeholder="Livre"
                                        value={formData.max_age}
                                        onChange={e => setFormData({ ...formData, max_age: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-pink-600 text-white rounded-2xl font-bold hover:bg-pink-700 transition-all shadow-lg"
                                >
                                    Salvar Categoria
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
