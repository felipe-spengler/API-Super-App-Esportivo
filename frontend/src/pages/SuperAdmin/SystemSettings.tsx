import { useState, useEffect } from 'react';
import { Save, Loader2, Upload, Cloud } from 'lucide-react';
import api from '../../services/api';

export function SystemSettings() {
    const [loading, setLoading] = useState(false);
    // TODO: Load existing settings

    // We will just put a simple instruction for now or upload form
    // Since backend for storing system art paths in SystemSettings table via API is generic.
    // AdminSystemSettingController.update accepts { settings: { key: value } }.

    const [bgFutebol, setBgFutebol] = useState('');
    const [bgVolei, setBgVolei] = useState('');

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
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
            // We need to fetch current settings first? 
            // The controller iterates whatever we send.

            await api.put('/admin/system-settings', {
                settings: {
                    [key]: path
                }
            });

            alert('Imagem atualizada com sucesso!');
            if (key === 'default_art_futebol_confronto') setBgFutebol(path);
            if (key === 'default_art_volei_confronto') setBgVolei(path);

        } catch (err) {
            console.error(err);
            alert('Erro ao atualizar imagem.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
                <p className="text-gray-500">Defina os padrões globais da plataforma (Super Admin).</p>
            </header>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-indigo-600" />
                    Artes Padrão (Fallbacks)
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Estas imagens serão usadas quando um clube não tiver configurado sua própria arte.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Futebol */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Padrão Futebol (Confronto)</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="mt-2">
                                <label htmlFor="upload-futebol" className="cursor-pointer text-indigo-600 font-medium hover:text-indigo-500">
                                    <span>Carregar nova imagem</span>
                                    <input id="upload-futebol" type="file" className="sr-only" onChange={(e) => handleUpload(e, 'default_art_futebol_confronto')} />
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG até 5MB</p>
                        </div>
                        {bgFutebol && <p className="text-xs text-green-600">Imagem definida!</p>}
                    </div>

                    {/* Vôlei */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Padrão Vôlei (Confronto)</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition-colors">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="mt-2">
                                <label htmlFor="upload-volei" className="cursor-pointer text-indigo-600 font-medium hover:text-indigo-500">
                                    <span>Carregar nova imagem</span>
                                    <input id="upload-volei" type="file" className="sr-only" onChange={(e) => handleUpload(e, 'default_art_volei_confronto')} />
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">PNG, JPG até 5MB</p>
                        </div>
                        {bgVolei && <p className="text-xs text-green-600">Imagem definida!</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
