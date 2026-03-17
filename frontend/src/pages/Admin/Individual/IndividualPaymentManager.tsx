import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CreditCard, Save, ShieldCheck, AlertCircle, ExternalLink, RefreshCw, Key, Settings2 } from 'lucide-react';
import api from '../../../services/api';

export function IndividualPaymentManager() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        asaas_token: '',
        asaas_environment: 'sandbox',
        enabled: false
    });
    const [payments, setPayments] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [revByCategory, setRevByCategory] = useState<any[]>([]);
    const [filterCategory, setFilterCategory] = useState('');

    useEffect(() => {
        loadSettings();
        loadPayments();
    }, [id]);

    async function loadPayments() {
        try {
            const res = await api.get(`/admin/championships/${id}/payments`);
            setPayments(res.data.payments);
            setSummary(res.data.summary);
            setRevByCategory(res.data.revenue_by_category || []);
        } catch (error) {
            console.error(error);
        }
    }

    async function loadSettings() {
        try {
            setLoading(true);
            const response = await api.get('/admin/asaas/settings');
            setSettings(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.post('/admin/asaas/settings', settings);
            alert('Configurações de pagamento salvas!');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar configurações');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-black text-slate-900 leading-none">Configurações Financeiras</h1>
                <p className="text-slate-500 font-medium mt-1">Conecte sua conta Asaas para receber pagamentos das inscrições.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                    <Settings2 size={20} />
                                </div>
                                <h2 className="font-black text-slate-900">Integração Asaas</h2>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${settings.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {settings.enabled ? 'Ativo' : 'Inativo'}
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Key size={14} />
                                        Asaas Access Token
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                        placeholder="$a.1b2c3d..."
                                        value={settings.asaas_token}
                                        onChange={e => setSettings({ ...settings, asaas_token: e.target.value })}
                                    />
                                    <p className="mt-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tight italic">O token pode ser gerado em Minha Conta → Integrações no painel do Asaas.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Ambiente</label>
                                        <select
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                                            value={settings.asaas_environment}
                                            onChange={e => setSettings({ ...settings, asaas_environment: e.target.value as any })}
                                        >
                                            <option value="sandbox">Sandbox (Testes)</option>
                                            <option value="production">Produção (Real)</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-all w-full">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={settings.enabled}
                                                onChange={e => setSettings({ ...settings, enabled: e.target.checked })}
                                            />
                                            <span className="text-sm font-black text-slate-700 uppercase tracking-tight">Habilitar Pagamentos</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50"
                                >
                                    {saving ? 'Processando...' : 'Salvar Configurações'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex gap-4">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl h-fit">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-amber-900 mb-1">Configuração do Webhook</h3>
                            <p className="text-sm text-amber-700 font-medium leading-relaxed">
                                Para que os pagamentos sejam confirmados automaticamente, você deve configurar a URL de Webhook no Asaas para:
                            </p>
                            <div className="mt-3 p-3 bg-white/50 border border-amber-200 rounded-xl font-mono text-xs font-black text-amber-900 break-all">
                                {window.location.origin}/api/admin/asaas/webhook
                            </div>
                            <p className="mt-3 text-[10px] uppercase font-black text-amber-600 tracking-widest">Eventos necessários: Pagamento Recebido, Pagamento Confirmado.</p>
                        </div>
                    </div>

                    {/* Transaction List */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="font-black text-slate-900">Lista de Transações</h2>
                            
                            <select 
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                value={filterCategory}
                                onChange={e => setFilterCategory(e.target.value)}
                            >
                                <option value="">Todas as Categorias</option>
                                {revByCategory.map(cat => (
                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 italic">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atleta / Categoria</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Método</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {payments
                                        .filter(p => !filterCategory || p.category === filterCategory)
                                        .length > 0 ? (
                                        payments
                                            .filter(p => !filterCategory || p.category === filterCategory)
                                            .map(px => (
                                            <tr key={px.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 leading-tight">{px.athlete}</div>
                                                    <div className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">{px.category}</div>
                                                </td>
                                                <td className="px-6 py-4 font-black text-slate-700">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(px.value)}
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">
                                                    {px.method}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${px.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : px.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {px.status === 'paid' ? 'Pago' : px.status === 'pending' ? 'Pendente' : px.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-medium text-slate-400">
                                                    {px.date}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-medium">
                                                Nenhuma transação encontrada para este evento.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Financial Summary */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-black text-slate-900 uppercase tracking-tighter text-sm">Resumo Financeiro</h3>
                        <div className="flex justify-between items-end border-b border-slate-50 pb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase">Recebido</span>
                            <span className="text-xl font-black text-emerald-600">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.total_revenue || 0)}
                            </span>
                        </div>
                        <div className="flex justify-between items-end border-b border-slate-50 pb-3">
                            <span className="text-xs font-bold text-slate-400 uppercase">Pendente</span>
                            <span className="text-xl font-black text-amber-500">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary?.pending_revenue || 0)}
                            </span>
                        </div>
                        <div className="pt-2">
                             <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Dados baseados em {summary?.total_count || 0} inscrições</div>
                        </div>
                    </div>

                    {/* Revenue by Category Table */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-black text-slate-900 uppercase tracking-tighter text-sm">Faturamento por Categoria</h3>
                        <div className="space-y-3">
                            {revByCategory.map(cat => (
                                <div key={cat.name} className="flex flex-col gap-1 border-b border-slate-50 pb-2 last:border-0">
                                    <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                                        <span>{cat.name}</span>
                                        <span className="text-slate-900">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.revenue)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                        <span>{cat.paid_count} confirmados</span>
                                        {cat.pending > 0 && <span className="text-amber-500">+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.pending)} pendente</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <CreditCard className="text-indigo-600 mb-4" size={32} />
                        <h3 className="font-black text-slate-900 mb-2">Por que usar Asaas?</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            O Asaas permite que você receba via PIX, Boleto e Cartão de Crédito com conciliação automática.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
