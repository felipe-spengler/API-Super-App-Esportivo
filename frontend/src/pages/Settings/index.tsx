import { useState, useEffect } from 'react';
import { Save, Bell, Shield, Lock, CreditCard, Loader2, Trophy, MessageSquare, Type } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function Settings() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'super_admin' || (user?.is_admin && !user?.club_id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        name: '',
        contact_email: '',
        primary_color: '#4f46e5',
        secondary_color: '#ffffff',
        primary_font: 'Inter',
        secondary_font: 'Inter',
        active_modalities: [] as string[]
    });

    const [allSports, setAllSports] = useState<any[]>([]);
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
            setLoading(true);
            if (activeTab === 'general' || activeTab === 'modalities') {
                const response = await api.get('/admin/settings');
                if (response.data) {
                    setSettings({
                        name: response.data.name || '',
                        contact_email: response.data.contact_email || '',
                        primary_color: response.data.primary_color || '#4f46e5',
                        secondary_color: response.data.secondary_color || '#ffffff',
                        primary_font: response.data.primary_font || 'Inter',
                        secondary_font: response.data.secondary_font || 'Inter',
                        active_modalities: response.data.active_modalities || []
                    });
                    setAllSports(response.data.all_sports || []);
                }
            } else if (activeTab === 'email' && isSuperAdmin) {
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
            if (activeTab === 'general' || activeTab === 'modalities') {
                await api.put('/admin/settings', settings);
            } else if (activeTab === 'email' && isSuperAdmin) {
                await api.put('/admin/system-settings', { settings: emailSettings });
            }
            alert('Configurações salvas com sucesso!');
        } catch (error) {
            alert('Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    }

    const toggleModality = (sportSlug: string) => {
        const current = [...settings.active_modalities];
        if (current.includes(sportSlug)) {
            setSettings({
                ...settings,
                active_modalities: current.filter(s => s !== sportSlug)
            });
        } else {
            setSettings({
                ...settings,
                active_modalities: [...current, sportSlug]
            });
        }
    };

    const handleRequestModality = (sportName: string) => {
        const clubName = settings.name || 'Meu Clube';
        const message = encodeURIComponent(`o clube '${clubName}' gostaria de adicionar a modalidade '${sportName}' ao portfólio`);
        window.open(`https://wa.me/554599736078?text=${message}`, '_blank');
    };

    if (loading) {
        return (
            <div className="p-12 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
                <p className="text-gray-500 font-medium">Carregando configurações...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 font-display">Configurações</h1>
                <p className="text-gray-500">Gerencie as preferências e a identidade da sua organização.</p>
            </header>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col md:flex-row">
                {/* Sidebar Navigation */}
                <aside className="w-full md:w-72 bg-gray-50 border-r border-gray-100 p-6 space-y-2">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all ${activeTab === 'general' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                    >
                        <Shield className="w-5 h-5" />
                        Geral
                    </button>
                    <button
                        onClick={() => setActiveTab('modalities')}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all ${activeTab === 'modalities' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                    >
                        <Trophy className="w-5 h-5" />
                        Modalidades
                    </button>
                    {isSuperAdmin && (
                        <button
                            onClick={() => setActiveTab('email')}
                            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all ${activeTab === 'email' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                        >
                            <Bell className="w-5 h-5" />
                            Servidor de Email
                        </button>
                    )}
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 p-8 md:p-12">
                    {activeTab === 'general' && (
                        <div className="space-y-10">
                            <section>
                                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Shield className="w-6 h-6 text-indigo-500" />
                                    Informações da Organização
                                </h2>
                                <div className="grid gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">Nome do Clube / Entidade</label>
                                        <input
                                            type="text"
                                            value={settings.name}
                                            onChange={e => setSettings({ ...settings, name: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="Ex: Clube de Futebol Esperança"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">Email de Contato</label>
                                        <input
                                            type="email"
                                            value={settings.contact_email}
                                            onChange={e => setSettings({ ...settings, contact_email: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="contato@clube.com"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <div className="flex justify-between items-end mb-6">
                                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                        <CreditCard className="w-6 h-6 text-indigo-500" />
                                        Identidade Visual
                                    </h2>
                                    <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-medium">Define as cores do seu App</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                        <label className="block text-sm font-bold text-gray-700 mb-4">Cor Primária</label>
                                        <div className="flex items-center gap-4">
                                            <div className="relative group">
                                                <div
                                                    className="h-14 w-14 rounded-xl shadow-lg border-4 border-white shrink-0 transition-transform group-hover:scale-110"
                                                    style={{ backgroundColor: settings.primary_color }}
                                                />
                                                <input
                                                    type="color"
                                                    value={settings.primary_color}
                                                    onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={settings.primary_color}
                                                onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-lg font-mono uppercase focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                        <label className="block text-sm font-bold text-gray-700 mb-4">Cor Secundária</label>
                                        <div className="flex items-center gap-4">
                                            <div className="relative group">
                                                <div
                                                    className="h-14 w-14 rounded-xl shadow-lg border-4 border-white shrink-0 transition-transform group-hover:scale-110"
                                                    style={{ backgroundColor: settings.secondary_color }}
                                                />
                                                <input
                                                    type="color"
                                                    value={settings.secondary_color}
                                                    onChange={e => setSettings({ ...settings, secondary_color: e.target.value })}
                                                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                value={settings.secondary_color}
                                                onChange={e => setSettings({ ...settings, secondary_color: e.target.value })}
                                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-lg font-mono uppercase focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                placeholder="#FFFFFF"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Type className="w-6 h-6 text-indigo-500" />
                                    Fontes Customizadas
                                </h2>
                                <div className="space-y-12">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                        {/* Fonte Principal */}
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-bold text-gray-700">Fonte Principal (Títulos)</label>
                                                <select
                                                    value={settings.primary_font}
                                                    onChange={e => setSettings({ ...settings, primary_font: e.target.value })}
                                                    className="w-full px-4 py-4 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white font-medium text-lg shadow-sm hover:border-gray-200"
                                                >
                                                    <optgroup label="Modernas (Sans-serif)">
                                                        <option value="Inter" style={{ fontFamily: 'Inter' }}>Inter (Padrão)</option>
                                                        <option value="Montserrat" style={{ fontFamily: 'Montserrat' }}>Montserrat</option>
                                                        <option value="Poppins" style={{ fontFamily: 'Poppins' }}>Poppins</option>
                                                        <option value="Roboto" style={{ fontFamily: 'Roboto' }}>Roboto</option>
                                                        <option value="Lexend" style={{ fontFamily: 'Lexend' }}>Lexend</option>
                                                    </optgroup>
                                                    <optgroup label="Impacto & Esportiva">
                                                        <option value="Bebas Neue" style={{ fontFamily: 'Bebas Neue' }}>Bebas Neue (Impacto)</option>
                                                        <option value="Anton" style={{ fontFamily: 'Anton' }}>Anton (Ultra Negrito)</option>
                                                        <option value="Oswald" style={{ fontFamily: 'Oswald' }}>Oswald (Condensada)</option>
                                                        <option value="Archivo Black" style={{ fontFamily: 'Archivo Black' }}>Archivo Black</option>
                                                        <option value="Teko" style={{ fontFamily: 'Teko' }}>Teko (Tech/Sport)</option>
                                                    </optgroup>
                                                    <optgroup label="Clássicas & Elegantes">
                                                        <option value="Playfair Display" style={{ fontFamily: 'Playfair Display' }}>Playfair Display (Serifada)</option>
                                                        <option value="Cinzel" style={{ fontFamily: 'Cinzel' }}>Cinzel (Tradicional)</option>
                                                        <option value="Ubuntu" style={{ fontFamily: 'Ubuntu' }}>Ubuntu</option>
                                                    </optgroup>
                                                </select>
                                            </div>
                                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 min-h-[100px] flex items-center justify-center text-center overflow-hidden">
                                                <p className="text-3xl break-all" style={{ fontFamily: settings.primary_font, color: settings.primary_color }}>
                                                    Esse é um texto teste mesmo
                                                </p>
                                            </div>
                                        </div>

                                        {/* Fonte Secundária */}
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-bold text-gray-700">Fonte Secundária (Textos)</label>
                                                <select
                                                    value={settings.secondary_font}
                                                    onChange={e => setSettings({ ...settings, secondary_font: e.target.value })}
                                                    className="w-full px-4 py-4 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white font-medium text-lg shadow-sm hover:border-gray-200"
                                                >
                                                    <optgroup label="Sans-serif (Leitura)">
                                                        <option value="Inter" style={{ fontFamily: 'Inter' }}>Inter (Padrão)</option>
                                                        <option value="Open Sans" style={{ fontFamily: 'Open Sans' }}>Open Sans</option>
                                                        <option value="Lato" style={{ fontFamily: 'Lato' }}>Lato</option>
                                                        <option value="Roboto" style={{ fontFamily: 'Roboto' }}>Roboto</option>
                                                        <option value="Source Sans 3" style={{ fontFamily: 'Source Sans 3' }}>Source Sans</option>
                                                        <option value="Work Sans" style={{ fontFamily: 'Work Sans' }}>Work Sans</option>
                                                    </optgroup>
                                                    <optgroup label="Serif (Clássica)">
                                                        <option value="Merriweather" style={{ fontFamily: 'Merriweather' }}>Merriweather</option>
                                                        <option value="Lora" style={{ fontFamily: 'Lora' }}>Lora</option>
                                                        <option value="Montserrat" style={{ fontFamily: 'Montserrat' }}>Montserrat</option>
                                                    </optgroup>
                                                </select>
                                            </div>
                                            <div
                                                className="p-6 rounded-2xl border border-gray-100 min-h-[100px] flex items-center justify-center text-center overflow-hidden"
                                                style={{ backgroundColor: settings.secondary_color.toLowerCase() === '#ffffff' ? '#1a1a1a' : '#f9fafb' }}
                                            >
                                                <p className="text-xl" style={{ fontFamily: settings.secondary_font, color: settings.secondary_color }}>
                                                    Esse é um texto teste mesmo
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'modalities' && (
                        <div className="space-y-8">
                            <header className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">Modalidades Associadas</h2>
                                    <p className="text-sm text-gray-500">Selecione as modalidades que seu clube oferece. As modalidades marcadas aparecerão para seus usuários.</p>
                                </div>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {allSports.map((sport) => {
                                    const isActive = settings.active_modalities.includes(sport.slug);
                                    return (
                                        <div
                                            key={sport.id}
                                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${isActive ? 'border-indigo-500 bg-indigo-50 shadow-md transform -translate-y-1' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                            onClick={() => isActive ? toggleModality(sport.slug) : null}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'}`}>
                                                    <Trophy className="w-5 h-5" />
                                                </div>
                                                <span className={`font-bold ${isActive ? 'text-indigo-900' : 'text-gray-500'}`}>{sport.name}</span>
                                            </div>

                                            {isActive ? (
                                                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                                                    <div className="w-2 h-2 rounded-full bg-white shadow-inner animate-pulse"></div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRequestModality(sport.name); }}
                                                    className="text-xs bg-indigo-600 text-white py-1.5 px-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                                                >
                                                    <MessageSquare className="w-3 h-3" />
                                                    Solicitar
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mt-12 flex items-start gap-4">
                                <div className="p-3 bg-amber-100 rounded-full text-amber-600">
                                    <Bell className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-amber-900 mb-1">Dica de Ativação</h3>
                                    <p className="text-sm text-amber-800 leading-relaxed">As modalidades que não estão habilitadas exigem autorização da equipe técnica do App Esportivo. Clique em "Solicitar" para enviar uma mensagem via WhatsApp.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'email' && isSuperAdmin && (
                        <div className="space-y-10">
                            <section>
                                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Bell className="w-6 h-6 text-indigo-500" />
                                    Configuração de Email (SMTP)
                                </h2>
                                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8 text-indigo-800 text-sm italic">
                                    Esta seção é visível apenas para administradores globais do sistema.
                                </div>
                                <div className="grid gap-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Host SMTP</label>
                                            <input
                                                type="text"
                                                value={emailSettings.smtp_host}
                                                onChange={e => setEmailSettings({ ...emailSettings, smtp_host: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="smtp.gmail.com"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Porta</label>
                                            <input
                                                type="text"
                                                value={emailSettings.smtp_port}
                                                onChange={e => setEmailSettings({ ...emailSettings, smtp_port: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="587"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Usuário SMTP</label>
                                            <input
                                                type="text"
                                                value={emailSettings.smtp_user}
                                                onChange={e => setEmailSettings({ ...emailSettings, smtp_user: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Senha SMTP</label>
                                            <input
                                                type="password"
                                                value={emailSettings.smtp_pass}
                                                onChange={e => setEmailSettings({ ...emailSettings, smtp_pass: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Nome do Remetente</label>
                                            <input
                                                type="text"
                                                value={emailSettings.sender_name}
                                                onChange={e => setEmailSettings({ ...emailSettings, sender_name: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="App Esportivo"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700">Email do Remetente</label>
                                            <input
                                                type="email"
                                                value={emailSettings.sender_email}
                                                onChange={e => setEmailSettings({ ...emailSettings, sender_email: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                                placeholder="noreply@appesportivo.com"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-gray-500">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full md:w-auto bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] disabled:opacity-70"
                        >
                            {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                            {saving ? 'Guardando Alterações...' : 'Salvar todas as Alterações'}
                        </button>
                    </div>
                </div>
            </div >
        </div >
    );
}
