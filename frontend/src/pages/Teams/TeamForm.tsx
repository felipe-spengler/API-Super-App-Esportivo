import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Shield, Camera } from 'lucide-react';
import api from '../../services/api';
import { prepareImageForUpload } from '../../utils/imageCompressor';

export function TeamForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // Image Upload State
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [selectedLogo, setSelectedLogo] = useState<File | null>(null);

    const isEditing = Boolean(id);

    useEffect(() => {
        if (isEditing) {
            loadTeam();
        }
    }, [id]);

    async function loadTeam() {
        try {
            setFetching(true);
            const response = await api.get(`/admin/teams/${id}`);
            const team = response.data;
            setName(team.name || '');
            setCity(team.city || '');

            if (team.logo_url) {
                setLogoPreview(team.logo_url);
            }
        } catch (error) {
            console.error('Erro ao carregar equipe', error);
            alert('Erro ao carregar dados da equipe.');
            navigate('/admin/teams');
        } finally {
            setFetching(false);
        }
    }

    function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedLogo(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                name,
                city,
                captain_id: null // De-coupling global captain, leader is context-specific now
            };

            let teamId = id;

            if (isEditing) {
                await api.put(`/admin/teams/${id}`, payload);
            } else {
                const response = await api.post('/admin/teams', payload);
                teamId = response.data.id;
            }

            // Upload Logo if selected
            if (selectedLogo && teamId) {
                const ready = await prepareImageForUpload(selectedLogo, 4 * 1024 * 1024);
                const formData = new FormData();
                formData.append('logo', ready);

                await api.post(`/admin/upload/team-logo/${teamId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            alert(isEditing ? 'Equipe atualizada com sucesso!' : 'Equipe criada com sucesso!');
            navigate('/admin/teams');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar equipe.');
        } finally {
            setLoading(false);
        }
    }

    if (fetching) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500 max-w-2xl mx-auto">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors">
                <ArrowLeft className="w-5 h-5 mr-1" /> Voltar
            </button>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <div className="flex items-center gap-6 mb-8">
                    <div className="relative group">
                        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border-2 border-indigo-100 overflow-hidden shadow-sm">
                            {logoPreview ? (
                                <img
                                    src={logoPreview}
                                    alt="Logo Preview"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Shield className="w-10 h-10" />
                            )}
                        </div>

                        <label className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors shadow-md border-2 border-white">
                            <Camera className="w-4 h-4" />
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleLogoChange}
                            />
                        </label>
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isEditing ? 'Editar Equipe' : 'Nova Equipe'}
                        </h1>
                        <p className="text-gray-500">
                            {isEditing ? 'Atualize os dados e o brasão da equipe.' : 'Cadastre um novo time para os campeonatos.'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Equipe</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="Ex: Toledão FC"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Cidade Base</label>
                        <input
                            type="text"
                            required
                            value={city}
                            onChange={e => setCity(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="Ex: Toledo - PR"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            <Save className="w-5 h-5" />
                            {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Cadastrar Equipe')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
