import { useState, useEffect } from 'react';
import { Save, Bell, Shield, Lock, CreditCard, Loader2, Trophy, MessageSquare, Type, Palette, Upload, Trash2, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function Settings() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'super_admin' || (user?.is_admin && !user?.club_id);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [settings, setSettings] = useState({
        name: '',
        contact_email: '',
        logo_url: '',
        banner_url: '',
        primary_color: '#4f46e5',
        secondary_color: '#ffffff',
        primary_font: 'Inter',
        secondary_font: 'Inter',
        active_modalities: [] as string[],
        art_settings: {} as any
    });

    const artConfig: any = {
        futebol: {
            name: "Futebol",
            positions: [
                { key: 'confronto', label: 'Confronto (Faceoff)', defaultFile: 'confronto_futebol.jpg' },
                { key: 'craque', label: 'Craque do Jogo (MVP)', defaultFile: 'fundo_craque_do_jogo.jpg' },
                { key: 'goleiro', label: 'Melhor Goleiro', defaultFile: 'fundo_melhor_goleiro.jpg' },
                { key: 'zagueiro', label: 'Melhor Zagueiro', defaultFile: 'fundo_melhor_zagueiro.jpg' },
                { key: 'lateral', label: 'Melhor Lateral', defaultFile: 'fundo_melhor_lateral.jpg' },
                { key: 'volante', label: 'Melhor Volante', defaultFile: 'fundo_melhor_volante.jpg' },
                { key: 'meia', label: 'Melhor Meia', defaultFile: 'fundo_melhor_meia.jpg' },
                { key: 'atacante', label: 'Melhor Atacante', defaultFile: 'fundo_melhor_atacante.jpg' },
                { key: 'artilheiro', label: 'Artilheiro', defaultFile: 'fundo_melhor_artilheiro.jpg' },
                { key: 'assistencia', label: 'Rei das Assistências', defaultFile: 'fundo_melhor_assistencia.jpg' },
                { key: 'estreante', label: 'Estreante', defaultFile: 'fundo_melhor_estreiante.jpg' },
                { key: 'jogo_programado', label: 'Jogo Programado', defaultFile: 'fundo_confronto.jpg' },
            ]
        },
        volei: {
            name: "Vôlei",
            positions: [
                { key: 'confronto', label: 'Confronto (Faceoff)', defaultFile: 'confronto_volei.jpg' },
                { key: 'melhor_quadra', label: 'Melhor em Quadra', defaultFile: 'volei_melhor_quadra.jpg' },
                { key: 'levantador', label: 'Melhor Levantador(a)', defaultFile: 'volei_melhor_levantadora.jpg' },
                { key: 'ponteira', label: 'Melhor Ponteiro(a)', defaultFile: 'volei_melhor_ponteira.jpg' },
                { key: 'central', label: 'Melhor Central', defaultFile: 'volei_melhor_central.jpg' },
                { key: 'oposta', label: 'Melhor Oposto(a)', defaultFile: 'volei_melhor_oposta.jpg' },
                { key: 'libero', label: 'Melhor Líbero', defaultFile: 'volei_melhor_libero.jpg' },
                { key: 'maior_pontuadora', label: 'Maior Pontuador(a)', defaultFile: 'volei_maior_pontuadora_geral.jpg' },
                { key: 'bloqueadora', label: 'Melhor Bloqueador(a)', defaultFile: 'volei_maior_bloqueadora.jpg' },
                { key: 'estreante', label: 'Estreante', defaultFile: 'volei_melhor_estreante.jpg' },
                { key: 'jogo_programado', label: 'Jogo Programado', defaultFile: 'volei_confronto.jpg' },
            ]
        },
        "futebol-7": {
            name: "Futebol 7",
            positions: [
                { key: 'confronto', label: 'Confronto (Faceoff)', defaultFile: 'confronto_futebol.jpg' },
                { key: 'craque', label: 'Craque do Jogo (MVP)', defaultFile: 'fundo_craque_do_jogo.jpg' },
                { key: 'goleiro', label: 'Melhor Goleiro', defaultFile: 'fundo_melhor_goleiro.jpg' },
                { key: 'fixo', label: 'Melhor Fixo', defaultFile: 'fundo_melhor_zagueiro.jpg' },
                { key: 'ala', label: 'Melhor Ala', defaultFile: 'fundo_melhor_lateral.jpg' },
                { key: 'pivo', label: 'Melhor Pivô', defaultFile: 'fundo_melhor_atacante.jpg' },
                { key: 'artilheiro', label: 'Artilheiro', defaultFile: 'fundo_melhor_artilheiro.jpg' },
                { key: 'assistencia', label: 'Rei das Assistências', defaultFile: 'fundo_melhor_assistencia.jpg' },
                { key: 'estreante', label: 'Estreante', defaultFile: 'fundo_melhor_estreiante.jpg' },
                { key: 'jogo_programado', label: 'Jogo Programado', defaultFile: 'fundo_confronto.jpg' },
            ]
        },
        "tenis": {
            name: "Tênis",
            positions: [
                { key: 'confronto', label: 'Confronto (Faceoff)', defaultFile: 'tenis_confronto.jpg' },
                { key: 'craque', label: 'Melhor da Partida', defaultFile: 'tenis_melhor_da_partida.jpg' },
                { key: 'estreante', label: 'Estreante', defaultFile: 'tenis_melhor_estreante.jpg' },
                { key: 'jogo_programado', label: 'Jogo Programado', defaultFile: 'tenis_confronto.jpg' },
            ]
        },
        "futsal": {
            name: "Futsal",
            positions: [
                { key: 'confronto', label: 'Confronto (Faceoff)', defaultFile: 'fundo_confronto.jpg' },
                { key: 'craque', label: 'Craque do Jogo (MVP)', defaultFile: 'fundo_craque_do_jogo.jpg' },
                { key: 'goleiro', label: 'Melhor Goleiro', defaultFile: 'fundo_melhor_goleiro.jpg' },
                { key: 'fixo', label: 'Melhor Fixo', defaultFile: 'fundo_melhor_zagueiro.jpg' },
                { key: 'ala', label: 'Melhor Ala', defaultFile: 'fundo_melhor_lateral.jpg' },
                { key: 'pivo', label: 'Melhor Pivô', defaultFile: 'fundo_melhor_atacante.jpg' },
                { key: 'artilheiro', label: 'Artilheiro', defaultFile: 'fundo_melhor_artilheiro.jpg' },
                { key: 'jogo_programado', label: 'Jogo Programado', defaultFile: 'fundo_confronto.jpg' },
            ]
        },
        "basquete": {
            name: "Basquete",
            positions: [
                { key: 'confronto', label: 'Confronto (Faceoff)', defaultFile: 'fundo_confronto.jpg' },
                { key: 'craque', label: 'MVP da Partida', defaultFile: 'fundo_craque_do_jogo.jpg' },
                { key: 'jogo_programado', label: 'Jogo Programado', defaultFile: 'fundo_confronto.jpg' },
            ]
        }
    };

    const [allSports, setAllSports] = useState<any[]>([]);
    const [championships, setChampionships] = useState<any[]>([]);
    const [selectedArtChampionship, setSelectedArtChampionship] = useState<string>(''); // '' = Padrão (Clube)
    const [activeTab, setActiveTab] = useState<string>('general');
    const [expandedSports, setExpandedSports] = useState<string[]>(['futebol']); // Default open football
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

            // Load Championships if needed (cached or single call)
            if (activeTab === 'art' && championships.length === 0) {
                const resChamp = await api.get('/admin/championships');
                if (resChamp.data) setChampionships(resChamp.data);
            }

            if (activeTab === 'general' || activeTab === 'modalities' || activeTab === 'art') {
                const response = await api.get('/admin/settings');
                if (response.data) {
                    setSettings({
                        name: response.data.name || '',
                        contact_email: response.data.contact_email || '',
                        logo_url: response.data.logo_url || '',
                        banner_url: response.data.banner_url || '',
                        primary_color: response.data.primary_color || '#4f46e5',
                        secondary_color: response.data.secondary_color || '#ffffff',
                        primary_font: response.data.primary_font || 'Inter',
                        secondary_font: response.data.secondary_font || 'Inter',
                        active_modalities: response.data.active_modalities || [],
                        art_settings: response.data.art_settings || {}
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

            if (activeTab === 'art' && selectedArtChampionship) {
                await loadChampionshipSettings(selectedArtChampionship);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    // New function to load specific championship settings
    async function loadChampionshipSettings(champId: string) {
        if (!champId) return;
        try {
            // We need to fetch championship details to get art_settings
            const res = await api.get(`/admin/championships/${champId}`);
            if (res.data && res.data.art_settings) {
                // We merge or replace the art_settings in local state just for display/edition
                // But wait, the main 'settings' state mirrors the CLUB settings.
                // If we edit a championship, we should probably have a separate state or be careful.
                // Strategy: If championship selected, 'settings.art_settings' will reflect THAT championship's settings.
                setSettings(prev => ({
                    ...prev,
                    art_settings: res.data.art_settings || {}
                }));
            } else {
                setSettings(prev => ({ ...prev, art_settings: {} }));
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Effect to reload settings when championship selection changes
    useEffect(() => {
        if (activeTab === 'art') {
            if (selectedArtChampionship) {
                loadChampionshipSettings(selectedArtChampionship);
            } else {
                // Reload club settings
                api.get('/admin/settings').then(res => {
                    setSettings(prev => ({ ...prev, art_settings: res.data.art_settings || {} }));
                });
            }
        }
    }, [selectedArtChampionship]);

    async function handleSave() {
        setSaving(true);
        try {
            if (activeTab === 'general' || activeTab === 'modalities') {
                await api.put('/admin/settings', settings);
            } else if (activeTab === 'art') {
                if (selectedArtChampionship) {
                    // Update Championship Settings
                    // We need a specific endpoint or update the championship
                    // Let's assume we update the championship directly with its art_settings
                    await api.put(`/admin/championships/${selectedArtChampionship}`, {
                        art_settings: settings.art_settings
                    });
                } else {
                    // Update Club Settings
                    await api.put('/admin/settings', settings);
                }
            } else if (activeTab === 'email' && isSuperAdmin) {
                await api.put('/admin/system-settings', { settings: emailSettings });
            }
            alert('Configurações salvas com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    }

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 2MB');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Apenas imagens são permitidas');
            return;
        }

        setUploadingLogo(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);

            const response = await api.post('/admin/settings/logo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setSettings({ ...settings, logo_url: response.data.logo_url });
            alert('Logo atualizado com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao fazer upload do logo');
        } finally {
            setUploadingLogo(false);
        }
    }

    async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (3MB max for banner)
        if (file.size > 3 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 3MB');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Apenas imagens são permitidas');
            return;
        }

        setUploadingBanner(true);
        try {
            const formData = new FormData();
            formData.append('banner', file);

            const response = await api.post('/admin/settings/banner', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setSettings({ ...settings, banner_url: response.data.banner_url });
            alert('Banner atualizado com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao fazer upload do banner');
        } finally {
            setUploadingBanner(false);
        }
    }

    async function handleArtUpload(e: React.ChangeEvent<HTMLInputElement>, sportKey: string, posKey: string) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit 5MB
        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('folder', 'backgrounds');

            const response = await api.post('/admin/upload/generic', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const newSettings = { ...settings };
            if (!newSettings.art_settings) newSettings.art_settings = {};
            if (!newSettings.art_settings[sportKey]) newSettings.art_settings[sportKey] = {};

            newSettings.art_settings[sportKey][posKey] = response.data.path; // Save relative path or full URL if preferred. Controller uses initImage which handles explicit paths. 
            // Note: Controller initImage logic needs to be robust for path. The controller saves 'backgrounds/xxxx.jpg'.
            // AdminSettingController expects art_settings.

            setSettings(newSettings);
            alert('Imagem enviada com sucesso! Não esqueça de Salvar.');

        } catch (error) {
            console.error(error);
            alert('Erro no upload.');
        }
    }

    const removeArt = (sportKey: string, posKey: string) => {
        const newSettings = { ...settings };
        if (newSettings.art_settings && newSettings.art_settings[sportKey]) {
            delete newSettings.art_settings[sportKey][posKey];
            setSettings(newSettings);
        }
    };



    const handleRequestModality = (sportName: string) => {
        const clubName = settings.name || 'Meu Clube';
        const message = encodeURIComponent(`o clube '${clubName}' gostaria de adicionar a modalidade '${sportName}' ao portfólio`);
        window.open(`https://wa.me/554599736078?text=${message}`, '_blank');
    };

    const toggleSportSection = (sportKey: string) => {
        if (expandedSports.includes(sportKey)) {
            setExpandedSports(expandedSports.filter(s => s !== sportKey));
        } else {
            setExpandedSports([...expandedSports, sportKey]);
        }
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
                <aside className="w-full md:w-72 bg-slate-900 md:bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 p-4 md:p-6 flex md:flex-col overflow-x-auto gap-2 md:gap-2">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`whitespace-nowrap flex-shrink-0 w-auto md:w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all ${activeTab === 'general' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 md:shadow-indigo-200' : 'text-gray-400 md:text-gray-600 hover:bg-slate-800 md:hover:bg-white md:hover:shadow-sm'}`}
                    >
                        <Shield className="w-5 h-5" />
                        Geral
                    </button>
                    <button
                        onClick={() => setActiveTab('modalities')}
                        className={`whitespace-nowrap flex-shrink-0 w-auto md:w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all ${activeTab === 'modalities' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 md:shadow-indigo-200' : 'text-gray-400 md:text-gray-600 hover:bg-slate-800 md:hover:bg-white md:hover:shadow-sm'}`}
                    >
                        <Trophy className="w-5 h-5" />
                        Modalidades
                    </button>
                    <button
                        onClick={() => setActiveTab('art')}
                        className={`whitespace-nowrap flex-shrink-0 w-auto md:w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all ${activeTab === 'art' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 md:shadow-indigo-200' : 'text-gray-400 md:text-gray-600 hover:bg-slate-800 md:hover:bg-white md:hover:shadow-sm'}`}
                    >
                        <Palette className="w-5 h-5" />
                        Artes & Fundos
                    </button>
                    {isSuperAdmin && (
                        <button
                            onClick={() => setActiveTab('email')}
                            className={`whitespace-nowrap flex-shrink-0 w-auto md:w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-all ${activeTab === 'email' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 md:shadow-indigo-200' : 'text-gray-400 md:text-gray-600 hover:bg-slate-800 md:hover:bg-white md:hover:shadow-sm'}`}
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
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">Brasão do Clube (Logo)</label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
                                                {settings.logo_url ? (
                                                    <img src={settings.logo_url} alt="Brasão" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Trophy className="w-8 h-8 text-gray-300" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                    className="hidden"
                                                    id="logo-upload"
                                                />
                                                <label
                                                    htmlFor="logo-upload"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                                                >
                                                    Selecionar Imagem
                                                </label>
                                                <p className="text-xs text-gray-400 mt-1">PNG ou JPG até 2MB (recomendado: quadrado)</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-gray-700">Banner da Página Inicial</label>
                                        <p className="text-xs text-gray-500 mb-2">Banner mostrado na home do app. Se não enviado, usa brasão + nome do clube como fallback.</p>
                                        <div className="flex flex-col gap-4">
                                            {settings.banner_url && (
                                                <div className="w-full h-32 rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-50">
                                                    <img src={settings.banner_url} alt="Banner" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleBannerUpload}
                                                    className="hidden"
                                                    id="banner-upload"
                                                    disabled={uploadingBanner}
                                                />
                                                <label
                                                    htmlFor="banner-upload"
                                                    className={`inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors cursor-pointer ${uploadingBanner ? 'opacity-50' : ''}`}
                                                >
                                                    {uploadingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                                    {uploadingBanner ? 'Enviando...' : 'Selecionar Banner'}
                                                </label>
                                                {settings.banner_url && (
                                                    <button
                                                        onClick={() => setSettings({ ...settings, banner_url: '' })}
                                                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                                                    >
                                                        Remover Banner
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400">PNG ou JPG até 3MB (recomendado: 16:9 landscape)</p>
                                        </div>
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
                                            className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${isActive ? 'border-indigo-500 bg-indigo-50 shadow-md transform -translate-y-1' : 'border-gray-100 bg-white'}`}
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


                    {activeTab === 'art' && (
                        <div className="space-y-10">
                            <header>
                                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    <Palette className="w-6 h-6 text-indigo-500" />
                                    Fundos Personalizados
                                </h2>
                                <p className="text-sm text-gray-500 mb-4">
                                    Faça upload de imagens de fundo para cada tipo de premiação.
                                    O sistema usará estas imagens ao gerar os cards dos atletas.
                                    Formatos recomendados: JPG ou PNG (1080x1350 ou similar).
                                </p>

                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs font-bold text-gray-500 block mb-1 uppercase tracking-wider">Contexto de Edição</label>
                                        <select
                                            value={selectedArtChampionship}
                                            onChange={(e) => setSelectedArtChampionship(e.target.value)}
                                            className="w-full p-2 border border-gray-200 rounded-lg text-sm font-bold bg-white text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Padrão do Clube (Todos os Campeonatos)</option>
                                            <optgroup label="Específico por Campeonato">
                                                {championships.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 max-w-xs leading-tight">
                                        <Trophy className="w-4 h-4 text-gray-300 shrink-0" />
                                        {selectedArtChampionship ?
                                            'Você está editando as artes APENAS para este campeonato. Se não definir, usará o padrão.' :
                                            'Você está editando o padrão para TODOS os campeonatos que não tiverem arte específica.'}
                                    </div>
                                </div>
                            </header>

                            {Object.entries(artConfig)
                                .filter(([sportKey]) => settings.active_modalities.includes(sportKey))
                                .map(([sportKey, config]: [string, any]) => {
                                    const isOpen = expandedSports.includes(sportKey);
                                    return (
                                        <section key={sportKey} className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                                            <div
                                                onClick={() => toggleSportSection(sportKey)}
                                                className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                                            >
                                                <h3 className="text-lg font-bold text-gray-800 capitalize flex items-center gap-2">
                                                    {sportKey === 'futebol' && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                                                    {sportKey === 'volei' && <div className="w-2 h-2 rounded-full bg-orange-500"></div>}
                                                    {config.name}
                                                </h3>
                                                {isOpen ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                                            </div>

                                            {isOpen && (
                                                <div className="p-4 md:p-6 bg-white border-t border-gray-100">
                                                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                                                        {config.positions.map((pos: any) => {
                                                            const currentBg = settings.art_settings?.[sportKey]?.[pos.key];

                                                            // Resolve URL
                                                            // If custom: /api/storage/...
                                                            // If default: /api/assets-templates/...
                                                            let displayUrl = null;

                                                            // Use configured API URL or fallback to relative root (works for same-domain deployments)
                                                            const apiUrl = import.meta.env.VITE_API_URL || '';
                                                            const rootUrl = apiUrl.replace(/\/$/, '').replace(/\/api$/, '');

                                                            if (currentBg) {
                                                                if (currentBg.startsWith('http')) {
                                                                    displayUrl = currentBg;
                                                                } else {
                                                                    displayUrl = `${rootUrl}/api/storage/${currentBg.replace(/^\//, '')}`;
                                                                }
                                                            } else if (pos.defaultFile) {
                                                                displayUrl = `${rootUrl}/api/assets-templates/${pos.defaultFile}`;
                                                            }

                                                            return (
                                                                <div key={pos.key} className="bg-gray-50 rounded-xl p-3 md:p-4 border border-gray-100 flex flex-col gap-3 transition-hover hover:shadow-md">
                                                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1">
                                                                        <span className="font-bold text-xs md:text-sm text-gray-700 leading-tight">{pos.label}</span>
                                                                        {currentBg ? (
                                                                            <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full font-medium border border-green-100 whitespace-nowrap">Personalizado</span>
                                                                        ) : (
                                                                            <span className="text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded-full border border-gray-200 whitespace-nowrap">Padrão</span>
                                                                        )}
                                                                    </div>

                                                                    <div className="relative w-full aspect-[4/5] bg-gray-200 rounded-lg overflow-hidden group border border-gray-200">
                                                                        {displayUrl ? (
                                                                            <img
                                                                                src={displayUrl}
                                                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                                                alt="Preview"
                                                                                onError={(e) => {
                                                                                    // Fallback visual if image fails to load
                                                                                    e.currentTarget.style.display = 'none';
                                                                                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                                                                    if (e.currentTarget.nextElementSibling) {
                                                                                        e.currentTarget.nextElementSibling.classList.remove('hidden');
                                                                                    }
                                                                                }}
                                                                            />
                                                                        ) : null}

                                                                        {/* Fallback element (hidden by default unless image fails or is missing) */}
                                                                        <div className={`absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4 text-center bg-gray-100 ${displayUrl ? 'hidden' : ''}`}>
                                                                            <Palette className="w-8 h-8 mb-2 opacity-20" />
                                                                            <span className="text-xs">Visualização indisponível</span>
                                                                        </div>

                                                                        {/* Hover Actions */}
                                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-sm p-4">
                                                                            {displayUrl && (
                                                                                <a
                                                                                    href={displayUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-white hover:text-indigo-200 flex items-center gap-1 text-xs font-medium mb-1"
                                                                                >
                                                                                    <Eye className="w-3 h-3" /> Ver
                                                                                </a>
                                                                            )}

                                                                            <div className="flex flex-col w-full gap-2">
                                                                                <div className="flex gap-2 justify-center">
                                                                                    <input
                                                                                        type="file"
                                                                                        id={`upload-${sportKey}-${pos.key}`}
                                                                                        className="hidden"
                                                                                        accept="image/*"
                                                                                        onChange={(e) => handleArtUpload(e, sportKey, pos.key)}
                                                                                    />
                                                                                    <label
                                                                                        htmlFor={`upload-${sportKey}-${pos.key}`}
                                                                                        className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-50 flex items-center justify-center gap-2 shadow-sm flex-1"
                                                                                    >
                                                                                        <Upload className="w-3 h-3" />
                                                                                        {currentBg ? 'Trocar' : 'Enviar'}
                                                                                    </label>
                                                                                </div>

                                                                                {currentBg && (
                                                                                    <button
                                                                                        onClick={() => removeArt(sportKey, pos.key)}
                                                                                        className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-red-600 flex items-center justify-center gap-2 shadow-sm w-full"
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3" />
                                                                                        Remover
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                    );
                                })}
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
