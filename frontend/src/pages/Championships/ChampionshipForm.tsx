import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, ArrowLeft, Trophy, Loader2, ImageIcon, Upload, X, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

interface Sport {
    id: number;
    name: string;
}

export function ChampionshipForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true); // Default true until initial load
    const [sports, setSports] = useState<Sport[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        sport_id: '', // Will hold ID as string for select
        start_date: '',
        end_date: '',
        registration_start_date: '',
        registration_end_date: '',
        registration_type: 'team', // 'individual' | 'team'
        description: '',
        format: 'league' // Default to league
    });

    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, [id]);

    async function loadInitialData() {
        try {
            // Fetch Club Settings for restrictions
            const settingsResponse = await api.get('/admin/settings');
            const allowedIds = settingsResponse.data.active_modalities;

            // Fetch Sports
            const sportsResponse = await api.get('/sports');
            let availableSports = sportsResponse.data;

            // Filter if restrictions exist
            console.log('DEBUG: AllowedIDs:', allowedIds);
            console.log('DEBUG: Sports:', availableSports);

            if (allowedIds && Array.isArray(allowedIds) && allowedIds.length > 0) {
                availableSports = availableSports.filter((s: any) =>
                    allowedIds.includes(s.id) ||
                    allowedIds.includes(String(s.id)) ||
                    (s.slug && allowedIds.includes(s.slug))
                );
                console.log('DEBUG: Filtered:', availableSports);
            }

            setSports(availableSports.sort((a: any, b: any) => a.name.localeCompare(b.name)));

            if (id) {
                const response = await api.get(`/championships/${id}`);
                const data = response.data;
                setFormData({
                    name: data.name,
                    sport_id: data.sport_id.toString(),
                    start_date: data.start_date ? data.start_date.split('T')[0] : '',
                    end_date: data.end_date ? data.end_date.split('T')[0] : '',
                    registration_start_date: data.registration_start_date ? data.registration_start_date.split('T')[0] : '',
                    registration_end_date: data.registration_end_date ? data.registration_end_date.split('T')[0] : '',
                    registration_type: data.registration_type || 'team',
                    description: data.description || '',
                    format: data.format || 'league'
                });
                setLogoUrl(data.logo_url);
                setCoverImageUrl(data.cover_image_url);
            } else {
                // Set default sport if available
                if (sportsResponse.data.length > 0) {
                    setFormData(prev => ({ ...prev, sport_id: sportsResponse.data[0].id.toString() }));
                }
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao carregar dados.');
            if (id) navigate('/admin/championships');
        } finally {
            setFetching(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        // Ensure we send numbers where expected
        const payload = {
            ...formData,
            sport_id: parseInt(formData.sport_id),
        };

        try {
            if (isEditing) {
                await api.put(`/admin/championships/${id}`, payload);
                navigate(`/admin/championships/${id}`);
            } else {
                const response = await api.post('/admin/championships', payload);
                navigate(`/admin/championships/${response.data.id}`);
            }
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || 'Erro ao salvar campeonato. Verifique os dados.';
            // If validation errors are present, show them
            if (err.response?.data?.errors) {
                const errors = Object.values(err.response.data.errors).flat().join('\n');
                alert(`Erro:\n${errors}`);
            } else {
                alert(msg);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        const isLogo = type === 'logo';
        if (isLogo) setUploadingLogo(true);
        else setUploadingBanner(true);

        const formDataUpload = new FormData();
        formDataUpload.append(type, file);

        try {
            const endpoint = isLogo ? `/admin/upload/championship-logo/${id}` : `/admin/upload/championship-banner/${id}`;
            console.log(`[UPLOAD] Uploading ${type} to ${endpoint}`, { fileType: file.type, fileSize: file.size });

            const response = await api.post(endpoint, formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            console.log(`[UPLOAD] Response:`, response.data);

            if (isLogo) {
                setLogoUrl(response.data.logo_url);
                console.log('[UPLOAD] Logo URL set to:', response.data.logo_url);
            } else {
                setCoverImageUrl(response.data.banner_url || response.data.cover_image_url);
                console.log('[UPLOAD] Cover URL set to:', response.data.banner_url || response.data.cover_image_url);
            }

            // Reload championship data to ensure UI is in sync
            const refreshResponse = await api.get(`/championships/${id}`);
            const updatedData = refreshResponse.data;
            setLogoUrl(updatedData.logo_url);
            setCoverImageUrl(updatedData.cover_image_url);
            console.log('[UPLOAD] Reloaded data:', { logo_url: updatedData.logo_url, cover_image_url: updatedData.cover_image_url });

            alert(`${isLogo ? 'Logo' : 'Capa'} atualizada com sucesso!`);
        } catch (err: any) {
            console.error('[UPLOAD] Error:', err);
            console.error('[UPLOAD] Error response:', err.response?.data);
            alert(`Erro ao fazer upload do arquivo: ${err.response?.data?.message || err.message}`);
        } finally {
            if (isLogo) setUploadingLogo(false);
            else setUploadingBanner(false);
        }
    }

    if (fetching) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
            <div className="flex items-center gap-4 mb-8">
                <Link to="/admin/championships" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar Campeonato' : 'Novo Campeonato'}</h1>
                    <p className="text-gray-500">Preencha os dados (Modalidade, Datas, Formato) para {isEditing ? 'editar o' : 'criar um novo'} evento.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* 1. Details */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">1. Detalhes Básicos</h2>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Nome do Campeonato</label>
                                <div className="relative">
                                    <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        placeholder="Ex: Copa Verão 2026"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Modalidade</label>
                                <select
                                    value={formData.sport_id}
                                    onChange={e => setFormData({ ...formData, sport_id: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                                    required
                                >
                                    <option value="" disabled>Selecione um esporte</option>
                                    {sports.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Descrição (Opcional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none"
                                    placeholder="Detalhes sobre o campeonato..."
                                />
                            </div>
                        </div>

                        {/* 2. Datas */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">2. Calendário</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Início do Evento</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Fim do Evento</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Inscrições */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">3. Configuração de Inscrições</h2>

                            <div className="space-y-3">
                                <label className="text-sm font-semibold text-gray-700">Tipo de Inscrição</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, registration_type: 'individual' })}
                                        className={`p-4 rounded-xl border text-left transition-all ${formData.registration_type === 'individual' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <span className={`block font-bold mb-1 ${formData.registration_type === 'individual' ? 'text-indigo-700' : 'text-gray-900'}`}>Individual (Sorteio)</span>
                                        <span className="text-xs text-gray-500">Atletas se inscrevem individualmente e o sistema sorteia os times.</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, registration_type: 'team' })}
                                        className={`p-4 rounded-xl border text-left transition-all ${formData.registration_type === 'team' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <span className={`block font-bold mb-1 ${formData.registration_type === 'team' ? 'text-indigo-700' : 'text-gray-900'}`}>Por Equipes</span>
                                        <span className="text-xs text-gray-500">Um líder inscreve o time completo.</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Início das Inscrições</label>
                                    <input
                                        type="date"
                                        value={formData.registration_start_date}
                                        onChange={e => setFormData({ ...formData, registration_start_date: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                    <p className="text-xs text-gray-400">Deixe em branco se não aplicável.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Fim das Inscrições</label>
                                    <input
                                        type="date"
                                        value={formData.registration_end_date}
                                        onChange={e => setFormData({ ...formData, registration_end_date: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 4. Formato */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">4. Formato de Disputa</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, format: 'league' })}
                                    className={`p-4 rounded-xl border text-left transition-all ${formData.format === 'league' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <span className={`block font-bold mb-1 ${formData.format === 'league' ? 'text-indigo-700' : 'text-gray-900'}`}>Pontos Corridos</span>
                                    <span className="text-xs text-gray-500">Todos contra todos. Quem somar mais pontos vence.</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, format: 'knockout' })}
                                    className={`p-4 rounded-xl border text-left transition-all ${formData.format === 'knockout' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <span className={`block font-bold mb-1 ${formData.format === 'knockout' ? 'text-indigo-700' : 'text-gray-900'}`}>Mata-mata</span>
                                    <span className="text-xs text-gray-500">Eliminatória simples. Perdeu, saiu. (Chaves)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, format: 'group_knockout' })}
                                    className={`p-4 rounded-xl border text-left transition-all ${formData.format === 'group_knockout' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <span className={`block font-bold mb-1 ${formData.format === 'group_knockout' ? 'text-indigo-700' : 'text-gray-900'}`}>Grupos + Mata-mata</span>
                                    <span className="text-xs text-gray-500">Fase de grupos seguida de eliminatórias (Copa do Mundo).</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, format: 'league_playoffs' })}
                                    className={`p-4 rounded-xl border text-left transition-all ${formData.format === 'league_playoffs' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <span className={`block font-bold mb-1 ${formData.format === 'league_playoffs' ? 'text-indigo-700' : 'text-gray-900'}`}>Liga + Playoffs</span>
                                    <span className="text-xs text-gray-500">Temporada regular seguida de finais (NBA/Superliga).</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, format: 'double_elimination' })}
                                    className={`p-4 rounded-xl border text-left transition-all ${formData.format === 'double_elimination' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <span className={`block font-bold mb-1 ${formData.format === 'double_elimination' ? 'text-indigo-700' : 'text-gray-900'}`}>Dupla Eliminação</span>
                                    <span className="text-xs text-gray-500">Precisa perder duas vezes para sair. (Winners/Losers)</span>
                                </button>
                            </div>
                        </div>

                        {/* 5. Identidade Visual */}
                        {isEditing && (
                            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">5. Identidade Visual do Campeonato</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Logo Upload */}
                                    <div className="space-y-4">
                                        <label className="text-sm font-semibold text-gray-700 block">Logo do Campeonato (1:1)</label>
                                        <div className="flex items-center gap-6">
                                            <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0 relative group">
                                                {logoUrl ? (
                                                    <>
                                                        <img src={logoUrl} className="w-full h-full object-cover" alt="Logo" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Upload className="text-white w-6 h-6" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <Trophy className="w-8 h-8 text-gray-300" />
                                                )}
                                                {uploadingLogo && (
                                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="file"
                                                    id="logo-upload"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileUpload(e, 'logo')}
                                                />
                                                <label
                                                    htmlFor="logo-upload"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                                                >
                                                    <Upload size={16} /> Selecionar Logo
                                                </label>
                                                <p className="text-[11px] text-gray-400">PNG ou JPG até 2MB. Recomendado 512x512px.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Banner Upload */}
                                    <div className="space-y-4">
                                        <label className="text-sm font-semibold text-gray-700 block">Capa/Banner do Campeonato (16:9)</label>
                                        <div className="space-y-3">
                                            <div className="w-full h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group">
                                                {coverImageUrl ? (
                                                    <>
                                                        <img src={coverImageUrl} className="w-full h-full object-cover" alt="Banner" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Upload className="text-white w-6 h-6" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <ImageIcon className="w-8 h-8 text-gray-300" />
                                                )}
                                                {uploadingBanner && (
                                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                id="banner-upload"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => handleFileUpload(e, 'banner')}
                                            />
                                            <label
                                                htmlFor="banner-upload"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                                            >
                                                <Upload size={16} /> Selecionar Capa
                                            </label>
                                            <p className="text-[11px] text-gray-400">Recomendado 1920x1080px para melhor visualização.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-6 border-t border-gray-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-70"
                            >
                                <Save className="w-5 h-5" />
                                {loading ? 'Salvando...' : (isEditing ? 'Atualizar Campeonato' : 'Criar Campeonato')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
