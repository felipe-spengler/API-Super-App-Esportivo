import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layers, Plus, Trash, Edit, Settings2, X, Check, AlertCircle, ChevronDown, ChevronUp, Users, UserPlus, Search, Trash2, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

interface Product {
    id: number;
    name: string;
}

interface IncludedProduct {
    product_id: number;
    quantity: number;
    required: boolean;
}

interface Category {
    id: number;
    name: string;
    description: string;
    gender: string;
    min_age: number | null;
    max_age: number | null;
    price: number;
    parent_id: number | null;
    included_products: IncludedProduct[] | null;
    athletes_count?: number;
    children?: Category[];
}

interface CategoryAthlete {
    id: number;
    name: string;
    bib_number: string;
    team_name?: string;
    status_payment: string;
    user_id: number;
    current_categories_names?: string;
    current_categories_ids?: number[];
}

export function IndividualCategoryManager() {
    const { id } = useParams();
    const [categories, setCategories] = useState<Category[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        gender: 'mixed',
        min_age: '',
        max_age: '',
        price: '',
        parent_id: null as number | null,
        included_products: [] as IncludedProduct[]
    });

    // Estados para Gestão de Participantes por Categoria
    const [showParticipantsModal, setShowParticipantsModal] = useState(false);
    const [selectedCatForParticipants, setSelectedCatForParticipants] = useState<Category | null>(null);
    const [categoryAthletes, setCategoryAthletes] = useState<CategoryAthlete[]>([]);
    const [availableAthletes, setAvailableAthletes] = useState<CategoryAthlete[]>([]);
    const [loadingAthletes, setLoadingAthletes] = useState(false);
    const [selectedAthleteToAdd, setSelectedAthleteToAdd] = useState('');
    const [savingParticipant, setSavingParticipant] = useState(false);
    const [participantSearch, setParticipantSearch] = useState('');

    useEffect(() => {
        loadCategories();
        loadClubProducts();
    }, [id]);

    async function loadClubProducts() {
        try {
            const response = await api.get('/admin/products-manage');
            setAllProducts(response.data);
        } catch (error) {
            console.error('Erro ao carregar produtos do clube', error);
        }
    }

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

    async function openParticipantsModal(cat: Category) {
        setSelectedCatForParticipants(cat);
        setShowParticipantsModal(true);
        setParticipantSearch('');
        setSelectedAthleteToAdd('');
        await loadCategoryAthletes(cat.id);
    }

    async function loadCategoryAthletes(catId: number) {
        try {
            setLoadingAthletes(true);
            const res = await api.get(`/admin/championships/${id}/categories/${catId}/athletes`);
            setCategoryAthletes(res.data.category_athletes || []);
            setAvailableAthletes(res.data.available_athletes || []);
        } catch (err: any) {
            console.error(err);
            toast.error('Erro ao carregar atletas da categoria');
        } finally {
            setLoadingAthletes(false);
        }
    }

    async function handleAddAthlete() {
        if (!selectedCatForParticipants || !selectedAthleteToAdd) return;
        try {
            setSavingParticipant(true);
            await api.post(`/admin/championships/${id}/categories/${selectedCatForParticipants.id}/athletes`, {
                athlete_id: selectedAthleteToAdd
            });
            toast.success('Atleta adicionado à categoria com sucesso!');
            setSelectedAthleteToAdd('');
            await loadCategoryAthletes(selectedCatForParticipants.id);
            loadCategories();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao adicionar atleta');
        } finally {
            setSavingParticipant(false);
        }
    }

    async function handleRemoveAthlete(athleteId: number, name: string) {
        if (!selectedCatForParticipants) return;
        if (!confirm(`Deseja remover ${name} desta categoria?`)) return;
        try {
            await api.delete(`/admin/championships/${id}/categories/${selectedCatForParticipants.id}/athletes/${athleteId}`);
            toast.success(`${name} removido da categoria!`);
            await loadCategoryAthletes(selectedCatForParticipants.id);
            loadCategories();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao remover atleta');
        }
    }

    const handleOpenModal = (cat: Category | null = null, parentId: number | null = null) => {
        if (cat) {
            setEditingCategory(cat);
            setFormData({
                name: cat.name,
                description: cat.description || '',
                gender: cat.gender || 'mixed',
                min_age: cat.min_age?.toString() || '',
                max_age: cat.max_age?.toString() || '',
                price: cat.price?.toString() || '0',
                parent_id: cat.parent_id,
                included_products: cat.included_products || []
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                description: '',
                gender: 'mixed',
                min_age: '',
                max_age: '',
                price: '',
                parent_id: parentId,
                included_products: []
            });
        }
        setShowModal(true);
    };

    const addIncludedProduct = (productId: number) => {
        if (formData.included_products.find(p => p.product_id === productId)) return;
        setFormData({
            ...formData,
            included_products: [...formData.included_products, { product_id: productId, quantity: 1, required: true }]
        });
    };

    const removeIncludedProduct = (productId: number) => {
        setFormData({
            ...formData,
            included_products: formData.included_products.filter(p => p.product_id !== productId)
        });
    };

    const updateIncludedProduct = (productId: number, field: string, value: any) => {
        setFormData({
            ...formData,
            included_products: formData.included_products.map(p =>
                p.product_id === productId ? { ...p, [field]: value } : p
            )
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                min_age: formData.min_age ? parseInt(formData.min_age) : null,
                max_age: formData.max_age ? parseInt(formData.max_age) : null,
                price: parseFloat(formData.price.toString().replace(',', '.')) || 0
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
                                            {cat.gender === 'mixed' || cat.gender === 'MISTO' ? 'Misto' : cat.gender === 'male' || cat.gender === 'M' ? 'Masculino' : 'Feminino'}
                                            {Number(cat.price || 0) > 0 && ` • R$ ${Number(cat.price || 0).toFixed(2).replace('.', ',')}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <button
                                        onClick={() => openParticipantsModal(cat)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 border border-pink-200 text-pink-700 rounded-lg hover:bg-pink-100 text-xs font-bold transition-all shadow-sm"
                                        title="Gerenciar atletas inscritos nesta categoria"
                                    >
                                        <Users size={14} />
                                        <span>{cat.athletes_count ?? 0} Inscritos</span>
                                    </button>
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
                                                    {sub.min_age || '∞'} - {sub.max_age || '∞'} Anos • {sub.gender === 'mixed' || sub.gender === 'MISTO' ? 'Misto' : sub.gender === 'male' || sub.gender === 'M' ? 'Masculino' : 'Feminino'}
                                                    {Number(sub.price || 0) > 0 && ` • R$ ${Number(sub.price || 0).toFixed(2).replace('.', ',')}`}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => openParticipantsModal(sub)}
                                                    className="flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 hover:border-pink-300 hover:text-pink-600 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                    title="Gerenciar atletas inscritos nesta subcategoria"
                                                >
                                                    <Users size={13} />
                                                    <span>{sub.athletes_count ?? 0}</span>
                                                </button>
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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
                    <div className="bg-white rounded-[24px] md:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto max-h-[95vh] flex flex-col">
                        <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
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
                        <form onSubmit={handleSave} className="p-5 md:p-6 space-y-4 overflow-y-auto">
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
                                        <option value="mixed">Misto</option>
                                        <option value="male">Masculino</option>
                                        <option value="female">Feminino</option>
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

                            {formData.parent_id && (
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
                            )}

                            {/* Produtos Inclusos (Brindes) */}
                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Produtos Inclusos / Brindes</label>

                                <div className="flex gap-2 mb-4">
                                    <select
                                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50"
                                        onChange={(e) => e.target.value && addIncludedProduct(parseInt(e.target.value))}
                                        value=""
                                    >
                                        <option value="">+ Selecionar brinde do clube...</option>
                                        {allProducts.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    {formData.included_products.map(item => {
                                        const p = allProducts.find(prod => prod.id === item.product_id);
                                        return (
                                            <div key={item.product_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-slate-900">{p?.name || 'Produto'}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <label className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                                                            Qtde:
                                                            <input
                                                                type="number"
                                                                className="w-10 px-1 border border-slate-200 rounded text-center"
                                                                value={item.quantity}
                                                                onChange={e => updateIncludedProduct(item.product_id, 'quantity', parseInt(e.target.value) || 1)}
                                                            />
                                                        </label>
                                                        <label className="flex items-center gap-1 text-[10px] text-slate-500 font-bold cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.required}
                                                                onChange={e => updateIncludedProduct(item.product_id, 'required', e.target.checked)}
                                                            />
                                                            Obrigatório
                                                        </label>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeIncludedProduct(item.product_id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
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

            {/* Modal de Gestão de Participantes da Categoria */}
            {showParticipantsModal && selectedCatForParticipants && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-pink-100 text-pink-600 rounded-2xl">
                                    <Users size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                        <span>Participantes:</span>
                                        <span className="text-pink-600 uppercase">{selectedCatForParticipants.name}</span>
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Vincule ou remova atletas inscritos no campeonato desta categoria.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowParticipantsModal(false)}
                                className="p-2 hover:bg-white text-slate-400 hover:text-slate-700 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6 overflow-y-auto">
                            {/* Card: Adicionar Atleta */}
                            <div className="p-5 bg-pink-50/50 rounded-2xl border border-pink-150 space-y-3">
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <UserPlus size={16} className="text-pink-600" />
                                    Vincular Atleta a esta Categoria
                                </label>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <select
                                        value={selectedAthleteToAdd}
                                        onChange={e => setSelectedAthleteToAdd(e.target.value)}
                                        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-pink-500"
                                    >
                                        <option value="">Selecione um atleta inscrito no campeonato...</option>
                                        {availableAthletes.map(ath => (
                                            <option key={ath.id} value={ath.id}>
                                                {ath.bib_number ? `#${ath.bib_number} - ` : ''}{ath.name}
                                                {ath.team_name ? ` (${ath.team_name})` : ''}
                                                {ath.current_categories_names ? ` [Já em: ${ath.current_categories_names}]` : ' [Sem categoria atribuída]'}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={handleAddAthlete}
                                        disabled={!selectedAthleteToAdd || savingParticipant}
                                        className="px-5 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shrink-0 shadow-md"
                                    >
                                        <UserCheck size={16} />
                                        {savingParticipant ? 'Adicionando...' : 'Adicionar'}
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium">
                                    💡 Atletas podem competir em múltiplas categorias (ex: 20m Peito e 20m Borboleta). Eles mantêm o mesmo número de peito no evento.
                                </p>
                            </div>

                            {/* Section: Listagem de Atletas na Categoria */}
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                                        <span>Atletas nesta Categoria</span>
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                                            {categoryAthletes.length}
                                        </span>
                                    </h3>
                                    {categoryAthletes.length > 3 && (
                                        <div className="relative">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Filtrar nesta lista..."
                                                value={participantSearch}
                                                onChange={e => setParticipantSearch(e.target.value)}
                                                className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-pink-500 w-44"
                                            />
                                        </div>
                                    )}
                                </div>

                                {loadingAthletes ? (
                                    <div className="p-8 text-center text-slate-400 font-medium text-sm">
                                        Carregando participantes...
                                    </div>
                                ) : categoryAthletes.length === 0 ? (
                                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                        <Users className="mx-auto text-slate-300 mb-2" size={32} />
                                        <p className="text-sm font-bold text-slate-700">Nenhum atleta nesta categoria ainda</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Selecione um atleta acima para vinculá-lo a esta prova.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
                                        {categoryAthletes
                                            .filter(ath => 
                                                !participantSearch || 
                                                ath.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
                                                (ath.bib_number && ath.bib_number.includes(participantSearch)) ||
                                                (ath.team_name && ath.team_name.toLowerCase().includes(participantSearch.toLowerCase()))
                                            )
                                            .map(ath => (
                                                <div key={ath.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono bg-slate-900 text-white px-2 py-0.5 rounded text-xs font-bold">
                                                            #{ath.bib_number || '?'}
                                                        </span>
                                                        <div>
                                                            <p className="font-bold text-slate-800 text-sm leading-tight">{ath.name}</p>
                                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                {ath.team_name && (
                                                                    <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                                                                        {ath.team_name}
                                                                    </span>
                                                                )}
                                                                {ath.current_categories_names && ath.current_categories_names.includes(',') && (
                                                                    <span className="text-[10px] font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">
                                                                        Também em: {ath.current_categories_names}
                                                                    </span>
                                                                )}
                                                                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                                                    ath.status_payment === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                                }`}>
                                                                    {ath.status_payment === 'paid' ? 'Pago' : 'Pendente'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveAthlete(ath.id, ath.name)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Remover atleta desta categoria"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowParticipantsModal(false)}
                                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
