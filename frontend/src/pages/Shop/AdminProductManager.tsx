import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash, Edit, Package, DollarSign, Image as ImageIcon, Box } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    description: string;
    price: number;
    stock_quantity: number;
    image_url: string | null;
}

export function AdminProductManager() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stock_quantity: '',
        image_url: ''
    });
    const [imageFile, setImageFile] = useState<File | null>(null);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const response = await api.get('/admin/products-manage');
            setProducts(response.data);
        } catch (error) {
            console.error('Erro ao carregar produtos', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja remover este produto?')) return;
        try {
            await api.delete(`/admin/products-manage/${id}`);
            loadProducts();
        } catch (error) {
            console.error('Erro ao remover', error);
        }
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description || '',
            price: product.price.toString(),
            stock_quantity: product.stock_quantity.toString(),
            image_url: product.image_url || ''
        });
        setShowModal(true);
    };

    const handleOpenCreate = () => {
        setEditingProduct(null);
        setFormData({
            name: '',
            description: '',
            price: '',
            stock_quantity: '',
            image_url: ''
        });
        setImageFile(null);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            let finalImageUrl = formData.image_url;

            // Upload de imagem se houver
            if (imageFile) {
                const data = new FormData();
                data.append('image', imageFile);
                const uploadRes = await api.post('/admin/products/upload-image', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                finalImageUrl = uploadRes.data.path;
            }

            const payload = {
                ...formData,
                price: parseFloat(formData.price),
                stock_quantity: parseInt(formData.stock_quantity),
                image_url: finalImageUrl
            };

            if (editingProduct) {
                await api.put(`/admin/products-manage/${editingProduct.id}`, payload);
            } else {
                await api.post('/admin/products-manage', payload);
            }

            setShowModal(false);
            loadProducts();
        } catch (error) {
            console.error('Erro ao salvar produto', error);
            alert('Erro ao salvar produto.');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gestão de Produtos</h1>
                    <p className="text-gray-500">Gerencie o catálogo da loja oficial do clube.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    Novo Produto
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500">Carregando catálogo...</p>
                </div>
            ) : products.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 md:p-12 text-center">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Nenhum produto cadastrado</h3>
                    <p className="text-gray-500 mb-6 max-w-sm mx-auto">Comece adicionando itens para vender na loja do clube.</p>
                    <button onClick={handleOpenCreate} className="text-indigo-600 font-medium hover:underline">
                        Adicionar primeiro produto
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {products.map(product => (
                        <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                            <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                {product.image_url ? (
                                    <img
                                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${product.image_url}`}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <ImageIcon size={48} />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(product)}
                                        className="p-2 bg-white/90 rounded-lg text-indigo-600 hover:text-indigo-800 shadow-sm backdrop-blur-sm"
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="p-2 bg-white/90 rounded-lg text-red-500 hover:text-red-700 shadow-sm backdrop-blur-sm"
                                    >
                                        <Trash size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-gray-800 truncate text-lg" title={product.name}>{product.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1">{product.description}</p>
                                <div className="flex justify-between items-center mt-auto">
                                    <span className="text-lg font-bold text-indigo-600">
                                        R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
                                        <Box size={12} />
                                        {product.stock_quantity}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Package className="text-indigo-600" />
                            {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Ex: Camisa Oficial 2026"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <textarea
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all h-24 resize-none"
                                    placeholder="Detalhes do produto..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-500 sm:text-sm">R$</span>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            required
                                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="0.00"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estoque</label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="0"
                                        value={formData.stock_quantity}
                                        onChange={e => setFormData({ ...formData, stock_quantity: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Imagem do Produto</label>
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept="image/*"
                                        onChange={e => {
                                            if (e.target.files?.[0]) {
                                                setImageFile(e.target.files[0]);
                                            }
                                        }}
                                    />

                                    {imageFile ? (
                                        <div className="flex flex-col items-center">
                                            <p className="text-sm font-medium text-indigo-600">{imageFile.name}</p>
                                            <p className="text-xs text-gray-500">Clique para alterar</p>
                                        </div>
                                    ) : formData.image_url ? (
                                        <div className="flex flex-col items-center">
                                            <img
                                                src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${formData.image_url}`}
                                                alt="Preview"
                                                className="h-20 object-contain mb-2 rounded"
                                            />
                                            <p className="text-xs text-gray-500">Clique para substituir a imagem existente</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                                            <p className="text-sm text-gray-500">Clique para enviar uma foto</p>
                                            <p className="text-xs text-gray-400 mt-1">PNG, JPG até 2MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                                >
                                    {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
