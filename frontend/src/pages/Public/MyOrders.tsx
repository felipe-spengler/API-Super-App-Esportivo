import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Package, Clock, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import api from '../../services/api';

interface Order {
    id: number;
    total_amount: number;
    status: string;
    created_at: string;
    club?: {
        name: string;
    };
}

export function MyOrders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadOrders() {
            try {
                const res = await api.get('/my-orders');
                setOrders(res.data);
            } catch (error) {
                console.error("Erro ao carregar pedidos", error);
            } finally {
                setLoading(false);
            }
        }
        loadOrders();
    }, []);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending_payment':
                return { label: 'Pagamento Pendente', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock };
            case 'paid':
                return { label: 'Pago / Pronto para Retirada', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 };
            case 'completed':
                return { label: 'Entregue', color: 'text-blue-600', bg: 'bg-blue-100', icon: Package };
            case 'cancelled':
                return { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-100', icon: AlertCircle };
            default:
                return { label: status, color: 'text-gray-600', bg: 'bg-gray-100', icon: Package };
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate('/profile')} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Meus Pedidos</h1>
            </div>

            <div className="max-w-lg mx-auto p-4">
                {loading ? (
                    <div className="flex justify-center mt-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <ShoppingBag className="mx-auto h-16 w-16 text-gray-200 mb-4" />
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Sem pedidos por aqui</h2>
                        <p className="text-gray-500 mb-8">Você ainda não realizou nenhuma compra em nossa loja.</p>
                        <button
                            onClick={() => navigate('/public/products')}
                            className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                        >
                            Explorar Loja
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map(order => {
                            const status = getStatusInfo(order.status);
                            const StatusIcon = status.icon;

                            return (
                                <div
                                    key={order.id}
                                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.99]"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                                Pedido #{order.id}
                                            </p>
                                            <h3 className="font-bold text-gray-900">
                                                {order.club?.name || 'Loja Social'}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                {new Date(order.created_at).toLocaleDateString()} às {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className={`px-2 py-1 rounded-md flex items-center gap-1 ${status.bg}`}>
                                            <StatusIcon className={`w-3 h-3 ${status.color}`} />
                                            <span className={`text-[10px] font-bold uppercase ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">Total</p>
                                            <p className="font-black text-indigo-600">
                                                R$ {Number(order.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <button className="flex items-center text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors">
                                            Ver Detalhes
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
