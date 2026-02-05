import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ShoppingBag, ArrowLeft, Heart, Search, Image as ImageIcon } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    price: number;
    image_url: string;
    description?: string;
    stock_quantity: number;
}

export function Shop() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/public/products')
            .then(response => setProducts(response.data))
            .catch(err => console.error("Erro ao carregar loja", err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-800">Loja Oficial</h1>
                </div>
                <button className="p-2 rounded-full hover:bg-gray-100 relative">
                    <ShoppingBag className="w-5 h-5 text-gray-600" />
                    {/* Badge carrinho opcional */}
                </button>
            </div>

            <div className="max-w-4xl mx-auto p-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <ShoppingBag className="mx-auto h-12 w-12 opacity-20 mb-3" />
                        <p>Nenhum produto disponível no momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {products.map(product => (
                            <div key={product.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all group">
                                <div className="aspect-square rounded-lg bg-gray-50 mb-3 flex items-center justify-center relative overflow-hidden">
                                    {product.image_url ? (
                                        <img
                                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${product.image_url}`}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-gray-300" />
                                    )}
                                    <button className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full hover:bg-white text-gray-400 hover:text-red-500 transition-colors shadow-sm">
                                        <Heart className="w-4 h-4" />
                                    </button>
                                </div>
                                <h3 className="font-bold text-gray-800 text-sm mb-1 leading-tight line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                                <p className="text-indigo-600 font-bold">
                                    R$ {Number(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <button className="mt-3 w-full bg-gray-900 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                                    <ShoppingBag size={14} />
                                    Adicionar
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
