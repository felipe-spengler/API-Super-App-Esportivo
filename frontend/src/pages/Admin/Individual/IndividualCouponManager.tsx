import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Ticket, Plus, Trash, Edit, X, Check, Search, Percent, Hash, Calendar } from 'lucide-react';
import api from '../../../services/api';

interface Coupon {
    id: number;
    code: string;
    discount_type: 'fixed' | 'percentage';
    discount_value: number;
    max_uses: number | null;
    used_count: number;
    expires_at: string | null;
}

export function IndividualCouponManager() {
    const { id } = useParams();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        discount_type: 'fixed' as 'fixed' | 'percentage',
        discount_value: '',
        max_uses: '',
        expires_at: ''
    });

    useEffect(() => {
        loadCoupons();
    }, [id]);

    async function loadCoupons() {
        try {
            setLoading(true);
            const response = await api.get('/admin/coupons');
            setCoupons(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleOpenModal = (coupon: Coupon | null = null) => {
        if (coupon) {
            setEditingCoupon(coupon);
            setFormData({
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value.toString(),
                max_uses: coupon.max_uses?.toString() || '',
                expires_at: coupon.expires_at ? new Date(coupon.expires_at).toISOString().split('T')[0] : ''
            });
        } else {
            setEditingCoupon(null);
            setFormData({
                code: '',
                discount_type: 'fixed',
                discount_value: '',
                max_uses: '',
                expires_at: ''
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                discount_value: parseFloat(formData.discount_value),
                max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
                expires_at: formData.expires_at || null
            };

            if (editingCoupon) {
                await api.put(`/admin/coupons/${editingCoupon.id}`, payload);
            } else {
                await api.post('/admin/coupons', payload);
            }
            setShowModal(false);
            loadCoupons();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar cupom');
        }
    };

    const handleDelete = async (couponId: number) => {
        if (!confirm('Deseja realmente excluir este cupom?')) return;
        try {
            await api.delete(`/admin/coupons/${couponId}`);
            loadCoupons();
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir cupom');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Cupons de Desconto</h1>
                    <p className="text-slate-500 font-medium font-bold italic">Crie códigos promocionais para aumentar suas inscrições.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg"
                >
                    <Plus size={18} />
                    Novo Cupom
                </button>
            </div>

            {loading ? (
                <div className="p-12 text-center text-slate-500 font-medium uppercase font-bold italic">Carregando lista de cupons...</div>
            ) : coupons.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                    <Ticket className="mx-auto text-slate-200 mb-4" size={64} />
                    <h3 className="text-lg font-bold text-slate-900 uppercase">Nenhum cupom ativo</h3>
                    <p className="text-slate-500 mb-6 italic font-bold">Ofereça descontos fixos ou em porcentagem para seus atletas.</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all font-black uppercase tracking-widest"
                    >
                        Criar Primeiro Cupom
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coupons.map(coupon => (
                        <div key={coupon.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-500 transition-all">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                        <Ticket size={24} />
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(coupon)} className="p-2 text-slate-400 hover:text-slate-900"><Edit size={18} /></button>
                                        <button onClick={() => handleDelete(coupon.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash size={18} /></button>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-1">{coupon.code}</h3>
                                <div className="flex items-center gap-2 text-indigo-600 font-black mb-4">
                                    {coupon.discount_type === 'percentage' ? (
                                        <><Percent size={16} /> <span>{coupon.discount_value}% de desconto</span></>
                                    ) : (
                                        <span>R$ {coupon.discount_value.toFixed(2).replace('.', ',')} de desconto</span>
                                    )}
                                </div>

                                <div className="space-y-2 border-t border-slate-100 pt-4 mt-4">
                                    <div className="flex justify-between text-xs font-bold font-mono">
                                        <span className="text-slate-400 uppercase">Usos</span>
                                        <span className="text-slate-900 uppercase tracking-tighter">{coupon.used_count} / {coupon.max_uses || '∞'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold font-mono">
                                        <span className="text-slate-400 uppercase">Expira em</span>
                                        <span className="text-slate-900 uppercase tracking-tighter">
                                            {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'NUNCA'}
                                        </span>
                                    </div>
                                </div>
                            </div>
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
                                {editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Código do Cupom</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black uppercase tracking-widest placeholder:lowercase placeholder:font-bold"
                                    placeholder="Ex: CORRIDA10"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Tipo</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                        value={formData.discount_type}
                                        onChange={e => setFormData({ ...formData, discount_type: e.target.value as any })}
                                    >
                                        <option value="fixed">Valor Fixo (R$)</option>
                                        <option value="percentage">Porcentagem (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Valor do Desconto</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black"
                                        placeholder="0,00"
                                        value={formData.discount_value}
                                        onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Limite de Usos</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                        placeholder="Ilimitado"
                                        value={formData.max_uses}
                                        onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Data de Expiração</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                        value={formData.expires_at}
                                        onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all font-black uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg font-black uppercase tracking-widest"
                                >
                                    Salvar Cupom
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
