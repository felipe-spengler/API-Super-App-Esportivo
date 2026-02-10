import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ShoppingBag, ArrowLeft, Search, Image as ImageIcon, Check, Loader2, X, CreditCard, QrCode } from 'lucide-react';

interface Product {
    id: number;
    name: string;
    price: number;
    image_url: string;
    description?: string;
    stock_quantity: number;
    club_id: number;
}

export function Shop() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<number | null>(null);
    const [showSuccess, setShowSuccess] = useState<any>(null);

    useEffect(() => {
        api.get('/public/products')
            .then(response => setProducts(response.data))
            .catch(err => console.error("Erro ao carregar loja", err))
            .finally(() => setLoading(false));
    }, []);

    async function handleBuy(product: Product) {
        if (!confirm(`Deseja comprar "${product.name}" por R$ ${Number(product.price).toLocaleString('pt-BR')}?`)) return;

        setProcessing(product.id);
        try {
            const res = await api.post('/checkout', {
                club_id: product.club_id,
                items: [{ product_id: product.id, quantity: 1 }],
                total_amount: product.price,
                payment_method: 'pix'
            });

            setShowSuccess({
                product,
                order: res.data.order,
                payment: res.data.payment
            });
        } catch (error) {
            console.error("Erro ao realizar checkout", error);
            alert("Falha ao processar pedido. Verifique seu login.");
            navigate('/login');
        } finally {
            setProcessing(null);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-800">Loja Oficial</h1>
                </div>
                <button
                    onClick={() => navigate('/profile/orders')}
                    className="p-2 rounded-full hover:bg-gray-100 relative"
                >
                    <ShoppingBag className="w-5 h-5 text-gray-600" />
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
                            <div key={product.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all group">
                                <div className="aspect-square rounded-xl bg-gray-50 mb-3 flex items-center justify-center relative overflow-hidden">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url.trim().startsWith('http') ? product.image_url.trim() : `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${product.image_url.trim()}`}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        <ImageIcon className="w-8 h-8 text-gray-300" />
                                    )}
                                </div>
                                <h3 className="font-bold text-gray-900 text-sm mb-1 leading-tight line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Preço</p>
                                        <p className="text-indigo-600 font-black">
                                            R$ {Number(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleBuy(product)}
                                        disabled={processing !== null}
                                        className="bg-gray-900 text-white p-2.5 rounded-xl hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {processing === product.id ? (
                                            <Loader2 size={18} className="animate-spin" />
                                        ) : (
                                            <ShoppingBag size={18} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Success Modal / QR Code */}
            {showSuccess && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                        <div className="bg-indigo-600 p-6 text-center text-white relative">
                            <button
                                onClick={() => setShowSuccess(null)}
                                className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} className="text-white" />
                            </div>
                            <h2 className="text-xl font-bold">Pedido Realizado!</h2>
                            <p className="text-indigo-100 text-sm opacity-90">Siga as instruções para pagamento</p>
                        </div>

                        <div className="p-6 text-center">
                            <p className="text-gray-500 text-sm mb-4">
                                Você pediu: <strong>{showSuccess.product.name}</strong>
                            </p>

                            {showSuccess.payment?.type === 'pix' && (
                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-2xl inline-block border-2 border-dashed border-gray-200">
                                        {showSuccess.payment.qr_code_url ? (
                                            <img src={showSuccess.payment.qr_code_url} alt="QR Code PIX" className="w-40 h-40 mx-auto" />
                                        ) : (
                                            <QrCode size={100} className="text-gray-300 mx-auto" />
                                        )}
                                    </div>
                                    <div className="text-left bg-gray-50 p-3 rounded-xl">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Copia e Cola</p>
                                        <p className="text-[10px] break-all font-mono text-gray-600 leading-tight">
                                            {showSuccess.payment.qr_code}
                                        </p>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Após o pagamento, o ticket estará disponível em <strong>Meus Pedidos</strong>.
                                    </p>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setShowSuccess(null);
                                    navigate('/profile/orders');
                                }}
                                className="mt-6 w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                            >
                                <ShoppingBag size={18} />
                                Ver Meus Pedidos
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
