import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Ticket, Plus, Trash, Edit, AlertCircle } from 'lucide-react';
import api from '../../../services/api';

export function IndividualCouponManager() {
    const { id } = useParams();
    const [coupons, setCoupons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mocking or searching for real endpoint
        api.get(`/admin/championships/${id}/coupons`).then(res => setCoupons(res.data)).catch(() => { }).finally(() => setLoading(false));
    }, [id]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Cupons de Desconto</h1>
                    <p className="text-slate-500 font-medium">Crie códigos promocionais para incentivar as inscrições.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-bold transition-all shadow-lg">
                    <Plus size={18} />
                    Novo Cupom
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Ticket size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Nenhum cupom ativo</h3>
                <p className="text-slate-500 mb-6">Você ainda não criou nenhum cupom para este evento.</p>
            </div>
        </div>
    );
}
