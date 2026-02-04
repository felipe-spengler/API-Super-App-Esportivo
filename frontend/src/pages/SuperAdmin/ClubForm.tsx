import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

interface Sport {
    id: number;
    name: string;
    slug: string;
}

interface City {
    id: number;
    name: string;
    state: string;
}

export function ClubForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [error, setError] = useState('');

    // Auxiliary Data
    const [cities, setCities] = useState<City[]>([]);
    const [sports, setSports] = useState<Sport[]>([]);

    // Form Data
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        city_id: '',
        primary_color: '#000000',
        secondary_color: '#ffffff',
        active_modalities: [] as string[],
        is_active: true,
        // Admin Data (Only for Creation)
        admin_name: '',
        admin_email: '',
        admin_password: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            // Load Cities & Sports
            const [citiesRes, sportsRes] = await Promise.all([
                api.get('/cities'),
                api.get('/sports')
            ]);
            setCities(citiesRes.data);
            setSports(sportsRes.data);

            if (isEditing) {
                const clubRes = await api.get(`/admin/clubs-manage/${id}`);
                const club = clubRes.data;
                setFormData({
                    ...formData,
                    name: club.name,
                    slug: club.slug,
                    city_id: club.city_id,
                    primary_color: club.primary_color || '#000000',
                    secondary_color: club.secondary_color || '#ffffff',
                    active_modalities: club.active_modalities || [],
                    is_active: !!club.is_active,
                    admin_name: '', // Cannot edit admin here yet
                    admin_email: '',
                    admin_password: ''
                });
            }
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar dados.');
        } finally {
            setInitializing(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isEditing) {
                await api.put(`/admin/clubs-manage/${id}`, {
                    name: formData.name,
                    slug: formData.slug,
                    city_id: formData.city_id,
                    primary_color: formData.primary_color,
                    secondary_color: formData.secondary_color,
                    active_modalities: formData.active_modalities,
                    is_active: formData.is_active
                });
                alert('Clube atualizado!');
            } else {
                await api.post('/admin/clubs-manage', formData);
                alert('Clube criado com sucesso!');
                navigate('/admin/clubs-manage');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Erro ao salvar clube.');
        } finally {
            setLoading(false);
        }
    }

    const toggleModality = (slug: string) => {
        const current = formData.active_modalities;
        if (current.includes(slug)) {
            setFormData({ ...formData, active_modalities: current.filter(s => s !== slug) });
        } else {
            setFormData({ ...formData, active_modalities: [...current, slug] });
        }
    };

    if (initializing) {
        return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
            <div className="flex items-center gap-4 mb-8">
                <Link to="/admin/clubs-manage" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditing ? `Editar Clube: ${formData.name}` : 'Novo Clube'}
                    </h1>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Basic Info */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold mb-4">Dados Principais</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Clube</label>
                            <input
                                required
                                type="text"
                                className="w-full p-2 border rounded-lg"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                            <input
                                required
                                type="text"
                                className="w-full p-2 border rounded-lg"
                                value={formData.slug}
                                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                            <select
                                required
                                className="w-full p-2 border rounded-lg"
                                value={formData.city_id}
                                onChange={e => setFormData({ ...formData, city_id: e.target.value })}
                            >
                                <option value="">Selecione...</option>
                                {cities.map(city => (
                                    <option key={city.id} value={city.id}>{city.name} - {city.state}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-4 mt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-indigo-600 rounded"
                                    checked={formData.is_active}
                                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <span className="text-sm font-medium text-gray-700">Clube Ativo</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Colors */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold mb-4">Identidade Visual</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cor Primária</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    className="h-10 w-20 p-1 rounded border"
                                    value={formData.primary_color}
                                    onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                                />
                                <input
                                    type="text"
                                    className="flex-1 p-2 border rounded-lg"
                                    value={formData.primary_color}
                                    onChange={e => setFormData({ ...formData, primary_color: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cor Secundária</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    className="h-10 w-20 p-1 rounded border"
                                    value={formData.secondary_color}
                                    onChange={e => setFormData({ ...formData, secondary_color: e.target.value })}
                                />
                                <input
                                    type="text"
                                    className="flex-1 p-2 border rounded-lg"
                                    value={formData.secondary_color}
                                    onChange={e => setFormData({ ...formData, secondary_color: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modalities */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold mb-4">Modalidades Ativas</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {sports.map(sport => (
                            <label key={sport.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${formData.active_modalities.includes(sport.slug) ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-indigo-600 rounded"
                                    checked={formData.active_modalities.includes(sport.slug)}
                                    onChange={() => toggleModality(sport.slug)}
                                />
                                <span className="text-sm font-medium text-gray-700 capitalize">{sport.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Admin Creation (Only New) */}
                {!isEditing && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold mb-4 text-indigo-700">Administrador Inicial</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Admin</label>
                                <input
                                    required={!isEditing}
                                    type="text"
                                    className="w-full p-2 border rounded-lg"
                                    value={formData.admin_name}
                                    onChange={e => setFormData({ ...formData, admin_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    required={!isEditing}
                                    type="email"
                                    className="w-full p-2 border rounded-lg"
                                    value={formData.admin_email}
                                    onChange={e => setFormData({ ...formData, admin_email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                                <input
                                    required={!isEditing}
                                    type="password"
                                    className="w-full p-2 border rounded-lg"
                                    value={formData.admin_password}
                                    onChange={e => setFormData({ ...formData, admin_password: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/clubs-manage')}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        <Save className="w-4 h-4" />
                        Salvar Clube
                    </button>
                </div>

            </form>
        </div>
    );
}
