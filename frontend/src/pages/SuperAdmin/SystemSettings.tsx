import { useState, useEffect } from 'react';
import { Save, Loader2, Upload, Cloud, ChevronDown, ChevronRight, ImageIcon } from 'lucide-react';
import api from '../../services/api';

const COMMON_SOCCER_ITEMS = [
    { key: 'confronto', label: 'Confronto (Padrão)', defaultFile: 'fundo_confronto.jpg' },
    { key: 'craque', label: 'Craque / MVP', defaultFile: 'fundo_craque_do_jogo.jpg' },
    { key: 'goleiro', label: 'Melhor Goleiro', defaultFile: 'fundo_melhor_goleiro.jpg' },
    { key: 'artilheiro', label: 'Artilheiro', defaultFile: 'fundo_melhor_artilheiro.jpg' },
    { key: 'zagueiro', label: 'Melhor Zagueiro', defaultFile: 'fundo_melhor_zagueiro.jpg' },
    { key: 'lateral', label: 'Melhor Lateral', defaultFile: 'fundo_melhor_lateral.jpg' },
    { key: 'volante', label: 'Melhor Volante', defaultFile: 'fundo_melhor_volante.jpg' },
    { key: 'meia', label: 'Melhor Meia', defaultFile: 'fundo_melhor_meia.jpg' },
    { key: 'atacante', label: 'Melhor Atacante', defaultFile: 'fundo_melhor_atacante.jpg' },
    { key: 'assistencia', label: 'Líder em Assistências', defaultFile: 'fundo_melhor_assistencia.jpg' },
    { key: 'estreante', label: 'Melhor Estreante', defaultFile: 'fundo_melhor_estreiante.jpg' },
];

const ART_SECTIONS = [
    {
        title: 'Futebol',
        sportSlug: 'futebol',
        items: COMMON_SOCCER_ITEMS
    },
    {
        title: 'Futsal',
        sportSlug: 'futsal',
        items: COMMON_SOCCER_ITEMS
    },
    {
        title: 'Society / Fut7',
        sportSlug: 'society',
        items: COMMON_SOCCER_ITEMS
    },
    {
        title: 'Handebol',
        sportSlug: 'handebol',
        items: COMMON_SOCCER_ITEMS
    },
    {
        title: 'Basquete',
        sportSlug: 'basquete',
        items: [
            { key: 'confronto', label: 'Confronto (Padrão)', defaultFile: 'fundo_confronto.jpg' },
            { key: 'craque', label: 'MVP / Melhor em Quadra', defaultFile: 'fundo_craque_do_jogo.jpg' },
            { key: 'artilheiro', label: 'Cestinha (Maior Pontuador)', defaultFile: 'fundo_melhor_artilheiro.jpg' },
            { key: 'assistencia', label: 'Líder em Assistências', defaultFile: 'fundo_melhor_assistencia.jpg' },
            { key: 'estreante', label: 'Melhor Estreante', defaultFile: 'fundo_melhor_estreiante.jpg' },
        ]
    },
    {
        title: 'Vôlei',
        sportSlug: 'volei',
        items: [
            { key: 'confronto', label: 'Confronto (Padrão)', defaultFile: 'volei_confronto.jpg' },
            { key: 'craque', label: 'Melhor da Quadra / MVP', defaultFile: 'volei_melhor_quadra.jpg' },
            { key: 'levantador', label: 'Melhor Levantador(a)', defaultFile: 'volei_melhor_levantadora.jpg' },
            { key: 'libero', label: 'Melhor Líbero', defaultFile: 'volei_melhor_libero.jpg' },
            { key: 'ponteira', label: 'Melhor Ponteiro(a)', defaultFile: 'volei_melhor_ponteira.jpg' },
            { key: 'central', label: 'Melhor Central', defaultFile: 'volei_melhor_central.jpg' },
            { key: 'oposta', label: 'Melhor Oposto(a)', defaultFile: 'volei_melhor_oposta.jpg' },
            { key: 'maior_pontuadora', label: 'Maior Pontuador(a)', defaultFile: 'volei_maior_pontuadora_geral.jpg' },
            { key: 'bloqueadora', label: 'Melhor Bloqueador(a)', defaultFile: 'volei_maior_bloqueadora.jpg' },
            { key: 'estreante', label: 'Melhor Estreante', defaultFile: 'volei_melhor_estreante.jpg' },
        ]
    }
];

export function SystemSettings() {
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [expandedSports, setExpandedSports] = useState<string[]>(['futebol', 'volei']);

    useEffect(() => {
        loadSettings();
    }, []);

    async function loadSettings() {
        try {
            const res = await api.get('/admin/system-settings');
            setSettings(res.data);
        } catch (err) {
            console.error('Failed to load system settings', err);
        }
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, settingKey: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('image', file);
            formData.append('folder', 'system_defaults');

            // 1. Upload Image
            const upRes = await api.post('/admin/upload/generic', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const path = upRes.data.path;

            // 2. Save to SystemSettings
            await api.put('/admin/system-settings', {
                settings: {
                    [settingKey]: path
                }
            });

            // Update local state
            setSettings(prev => ({ ...prev, [settingKey]: path }));
            alert('Imagem atualizada com sucesso!');

        } catch (err) {
            console.error(err);
            alert('Erro ao atualizar imagem.');
        } finally {
            setLoading(false);
        }
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
            <div className="p-12 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                <p className="text-gray-500 font-medium">Carregando configurações...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
                <p className="text-gray-500">Defina as artes padrão (globais) para quando os clubes não as tiverem personalizadas.</p>
            </header>

            <div className="space-y-8">
                {ART_SECTIONS.map((section) => (
                    <div key={section.sportSlug} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <button
                            onClick={() => toggleSportSection(section.sportSlug)}
                            className="w-full bg-gray-50 px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
                        >
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Cloud className="w-5 h-5 text-indigo-600" />
                                Artes Padrão: {section.title}
                            </h2>
                            {expandedSports.includes(section.sportSlug) ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                        </button>

                        {expandedSports.includes(section.sportSlug) && (
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {section.items.map((item) => {
                                    const settingKey = `default_art_${section.sportSlug}_${item.key}`;
                                    const currentVal = settings[settingKey];
                                    const previewUrl = currentVal ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${currentVal}` : null;

                                    return (
                                        <div key={item.key} className="space-y-2 border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-gray-700 truncate block w-full" title={item.label}>{item.label}</label>
                                            </div>

                                            <div className="aspect-video bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center relative group overflow-hidden">
                                                {previewUrl ? (
                                                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-center p-2">
                                                        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                                                        <span className="text-[10px] text-gray-400 block px-1">Padrão do Sistema (Hardcoded)</span>
                                                        <span className="text-[9px] text-gray-300 font-mono">{item.defaultFile}</span>
                                                    </div>
                                                )}

                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <label className="cursor-pointer bg-white text-indigo-600 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg hover:bg-gray-100 flex items-center gap-1">
                                                        <Upload className="w-3 h-3" /> Alterar
                                                        <input type="file" className="sr-only" onChange={(e) => handleUpload(e, settingKey)} />
                                                    </label>
                                                </div>
                                            </div>
                                            {currentVal && <p className="text-[10px] text-green-600 font-bold flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span> Personalizado Global</p>}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
