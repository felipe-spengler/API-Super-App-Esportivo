import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2, List, Loader2, AlertCircle, Save, X } from 'lucide-react';
import api from '../../services/api';

interface Category {
    id: number;
    name: string;
    gender: string;
    min_age?: number;
    max_age?: number;
    price?: number;
}

export function AdminCategoryManager() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [championship, setChampionship] = useState<any>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        gender: 'mixed',
        min_age: '',
        max_age: '',
        price: '0'
    });

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            setLoading(true);
            const [campRes, catRes] = await Promise.all([
                api.get(`/championships/${id}`),
                api.get(`/admin/championships/${id}/categories-list`)
            ]);
            setChampionship(campRes.data);
            setCategories(Array.isArray(catRes.data) ? catRes.data : (catRes.data.data || []));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    function handleOpenModal(category: Category | null = null) {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                gender: category.gender,
                min_age: category.min_age?.toString() || '',
                max_age: category.max_age?.toString() || '',
                price: category.price?.toString() || '0'
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                gender: 'mixed',
                min_age: '',
                max_age: '',
                price: '0'
            });
        }
        setShowModal(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            ...formData,
            min_age: formData.min_age ? parseInt(formData.min_age) : null,
            max_age: formData.max_age ? parseInt(formData.max_age) : null,
            price: parseFloat(formData.price)
        };

        try {
            if (editingCategory) {
                await api.put(`/admin/championships/${id}/categories/${editingCategory.id}`, payload);
            } else {
                await api.post(`/admin/championships/${id}/categories-new`, payload);
            }
            setShowModal(false);
            loadData();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar categoria.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(categoryId: number) {
        if (!confirm('Deseja excluir esta categoria?')) return;

        try {
            await api.delete(`/admin/championships/${id}/categories/${categoryId}`);
            loadData();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir categoria.');
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate(`/admin/championships/${id}`)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gerenciar Categorias</h1>
                    <p className="text-gray-500">{championship?.name} • Configure as divisões do evento.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <List className="w-5 h-5 text-indigo-500" />
                        Categorias Cadastradas
                    </h2>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Categoria
                    </button>
                </div>

                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-bold text-gray-500">Nome</th>
                                <th className="px-6 py-4 font-bold text-gray-500">Gênero</th>
                                <th className="px-6 py-4 font-bold text-gray-500">Faixa Etária</th>
                                <th className="px-6 py-4 font-bold text-gray-500">Valor Inscrição</th>
                                <th className="px-6 py-4 font-bold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {categories.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">
                                        Nenhuma categoria cadastrada.
                                    </td>
                                </tr>
                            ) : (
                                categories.map((cat) => (
                                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{cat.name}</td>
                                        <td className="px-6 py-4 capitalize text-sm text-gray-600">
                                            {cat.gender === 'male' ? 'Masculino' : cat.gender === 'female' ? 'Feminino' : 'Misto'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {cat.min_age || cat.max_age ? `${cat.min_age || 0} - ${cat.max_age || '∞'} anos` : 'Livre'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-emerald-600">
                                            {cat.price ? `R$ ${parseFloat(cat.price.toString()).toFixed(2)}` : 'Grátis'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(cat)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View - Cards */}
                <div className="md:hidden divide-y divide-gray-100">
                    {categories.length === 0 ? (
                        <div className="px-6 py-10 text-center text-gray-400 italic">
                            Nenhuma categoria cadastrada.
                        </div>
                    ) : (
                        categories.map((cat) => (
                            <div key={cat.id} className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{cat.name}</h3>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded">
                                                {cat.gender === 'male' ? 'Masculino' : cat.gender === 'female' ? 'Feminino' : 'Misto'}
                                            </span>
                                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase rounded">
                                                {cat.min_age || cat.max_age ? `${cat.min_age || 0}-${cat.max_age || '∞'} anos` : 'Livre'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="font-bold text-emerald-600">
                                        {cat.price ? `R$ ${parseFloat(cat.price.toString()).toFixed(2)}` : 'Grátis'}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        onClick={() => handleOpenModal(cat)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> Editar
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cat.id)}
                                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Excluir
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome da Categoria</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Ex: Masculino Pró, Sub-15, veteranos..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Gênero</label>
                                <select
                                    value={formData.gender}
                                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    <option value="male">Masculino</option>
                                    <option value="female">Feminino</option>
                                    <option value="mixed">Misto / Outros</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Idade Mínima</label>
                                    <input
                                        type="number"
                                        value={formData.min_age}
                                        onChange={e => setFormData({ ...formData, min_age: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Idade Máxima</label>
                                    <input
                                        type="number"
                                        value={formData.max_age}
                                        onChange={e => setFormData({ ...formData, max_age: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="99"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Preço da Inscrição (R$)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 disabled:opacity-70 flex items-center justify-center gap-2 transition-all"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
