
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Heart } from 'lucide-react';

export function Shop() {
    const navigate = useNavigate();

    const products = [
        { id: 1, name: 'Camisa Oficial 2026', price: 'R$ 149,90', image: 'bg-indigo-100' },
        { id: 2, name: 'Boné Clube', price: 'R$ 59,90', image: 'bg-gray-100' },
        { id: 3, name: 'Squeeze Térmica', price: 'R$ 49,90', image: 'bg-blue-100' },
        { id: 4, name: 'Toalha Esportiva', price: 'R$ 39,90', image: 'bg-green-100' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-800">Loja Oficial</h1>
                </div>
                <button className="p-2 rounded-full hover:bg-gray-100">
                    <ShoppingBag className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            <div className="max-w-4xl mx-auto p-4">
                <div className="grid grid-cols-2 gap-4">
                    {products.map(product => (
                        <div key={product.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all group">
                            <div className={`aspect-square rounded-lg ${product.image} mb-3 flex items-center justify-center relative`}>
                                <ShoppingBag className="w-8 h-8 text-black/10" />
                                <button className="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full hover:bg-white text-gray-400 hover:text-red-500 transition-colors">
                                    <Heart className="w-4 h-4" />
                                </button>
                            </div>
                            <h3 className="font-bold text-gray-800 text-sm mb-1">{product.name}</h3>
                            <p className="text-indigo-600 font-bold">{product.price}</p>
                            <button className="mt-3 w-full bg-gray-900 text-white text-xs font-bold py-2 rounded-lg hover:bg-gray-800 transition-colors">
                                Adicionar
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
