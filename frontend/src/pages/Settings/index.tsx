import { useState, useEffect } from 'react';
import { Save, Bell, Shield, Lock, CreditCard, Loader2 } from 'lucide-react';
import api from '../../services/api';

export function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        name: '',
        contact_email: '',
        primary_color: '#4f46e5',
        secondary_color: '#ffffff'
    });

    const [activeTab, setActiveTab] = useState('general');
    const [emailSettings, setEmailSettings] = useState({
        smtp_host: '',
        smtp_port: '',
        smtp_user: '',
        smtp_pass: '',
        sender_name: '',
        sender_email: ''
    });

    useEffect(() => {
        loadSettings();
    }, [activeTab]);

    async function loadSettings() {
        try {
            if (activeTab === 'general') {
                const response = await api.get('/admin/settings');
                if (response.data) {
                    setSettings({
                        name: response.data.name || '',
                        contact_email: response.data.contact_email || '',
                        primary_color: response.data.primary_color || '#4f46e5',
                        secondary_color: response.data.secondary_color || '#ffffff',
                    });
                }
            } else if (activeTab === 'email') {
                const response = await api.get('/admin/system-settings');
                if (response.data) {
                    setEmailSettings({
                        smtp_host: response.data['smtp_host'] || '',
                        smtp_port: response.data['smtp_port'] || '',
                        smtp_user: response.data['smtp_user'] || '',
                        smtp_pass: response.data['smtp_pass'] || '',
                        sender_name: response.data['sender_name'] || '',
                        sender_email: response.data['sender_email'] || ''
                    });
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            if (activeTab === 'general') {
                await api.put('/admin/settings', settings);
            } else if (activeTab === 'email') {
                await api.put('/admin/system-settings', { settings: emailSettings });
            }
            alert('Configurações salvas com sucesso!');
        } catch (error) {
            alert('Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
    }

    return (
        <div className="animate-in fade-in duration-500 max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 font-display">Configurações</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-col md:flex-row">
                    {/* Sidebar de Configurações */}
                    <div className="w-full md:w-64 bg-gray-50 border-r border-gray-100 p-4 space-y-1">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full text-left px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-3 transition-colors ${activeTab === 'general' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Shield className="w-4 h-4" />
                            Geral
                        </button>
                        <button
                            onClick={() => setActiveTab('email')}
                            className={`w-full text-left px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-3 transition-colors ${activeTab === 'email' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Bell className="w-4 h-4" />
                            Email Simplificado
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8">

                        {activeTab === 'general' && (
                            <>
                                <div className="mb-8">
                                    <h2 className="text-lg font-bold text-gray-900 mb-4">Informações da Organização</h2>
                                    <div className="grid gap-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Clube / Entidade</label>
                                            <input
                                                type="text"
                                                value={settings.name}
                                                onChange={e => setSettings({ ...settings, name: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Email de Contato</label>
                                            <input
                                                type="email"
                                                value={settings.contact_email}
                                                onChange={e => setSettings({ ...settings, contact_email: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h2 className="text-lg font-bold text-gray-900 mb-4">Aparência do App</h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Cor Primária</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={settings.primary_color}
                                                    onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                                                    className="h-10 w-10 rounded border-0 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={settings.primary_color}
                                                    onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Cor Secundária</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={settings.secondary_color}
                                                    onChange={e => setSettings({ ...settings, secondary_color: e.target.value })}
                                                    className="h-10 w-10 rounded border-0 cursor-pointer"
                                                />
                                                <input
                                                    type="text"
                                                    value={settings.secondary_color}
                                                    onChange={e => setSettings({ ...settings, secondary_color: e.target.value })}
                                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeTab === 'email' && (
                            <>
                                <div className="mb-8">
                                    <h2 className="text-lg font-bold text-gray-900 mb-4">Configuração de Email (SMTP)</h2>
                                    <div className="grid gap-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Host SMTP</label>
                                                <input
                                                    type="text"
                                                    value={emailSettings.smtp_host}
                                                    onChange={e => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    placeholder="smtp.gmail.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Porta</label>
                                                <input
                                                    type="text"
                                                    value={emailSettings.smtp_port}
                                                    onChange={e => setEmailSettings({ ...emailSettings, smtp_port: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    placeholder="587"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Usuário SMTP</label>
                                                <input
                                                    type="text"
                                                    value={emailSettings.smtp_user}
                                                    onChange={e => setEmailSettings({ ...emailSettings, smtp_user: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Senha SMTP</label>
                                                <input
                                                    type="password"
                                                    value={emailSettings.smtp_pass}
                                                    onChange={e => setEmailSettings({ ...emailSettings, smtp_pass: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Rementente</label>
                                                <input
                                                    type="text"
                                                    value={emailSettings.sender_name}
                                                    onChange={e => setEmailSettings({ ...emailSettings, sender_name: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    placeholder="App Esportivo"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-1">Email do Rementente</label>
                                                <input
                                                    type="email"
                                                    value={emailSettings.sender_email}
                                                    onChange={e => setEmailSettings({ ...emailSettings, sender_email: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    placeholder="noreply@app.com"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-70"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
