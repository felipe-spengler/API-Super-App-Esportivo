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

    useEffect(() => {
        loadSettings();
    }, [id]);

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
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <CreditCard className="text-indigo-600 mb-4" size={32} />
                        <h3 className="font-black text-slate-900 mb-2">Por que usar Asaas?</h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            O Asaas permite que você receba via PIX, Boleto e Cartão de Crédito com conciliação automática. Os fundos caem diretamente na sua conta.
                        </p>
                        <a
                            href="https://www.asaas.com"
                            target="_blank"
                            className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all"
                        >
                            Ver Site do Asaas
                            <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
