import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, ArrowLeft, Trophy, Loader2 } from 'lucide-react';
import api from '../../services/api';

export function ChampionshipForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!!id);
    const [formData, setFormData] = useState({
        name: '',
        sport: 'Futebol',
        start_date: '',
        end_date: '',
        description: '',
        format: 'pontos_corridos'
    });

    const sports = [
        'Futebol', 'Futsal', 'Vôlei', 'Basquete', 'Handebol',
        'Futebol 7', 'Futevôlei', 'Beach Tennis', 'Tênis de Mesa', 'Lutas'
    ];

    useEffect(() => {
        if (id) {
            loadChampionship();
        }
    }, [id]);

    async function loadChampionship() {
        try {
            const response = await api.get(`/championships/${id}`); // Assuming public endpoint has details or admin specific
            // Actually, we should probably use the list from Admin mostly, or a specific admin show.
            // But since previous steps showed Route::get('/championships/{id}', [EventController::class, 'championshipDetails']); is public, we can use it.
            // Or better, check if there is an admin specific one. AdminChampionshipController doesn't have 'show'.
            // Can use the public one for now as it contains the data needed.
            const data = response.data;
            setFormData({
                name: data.name,
                sport: data.sport,
                start_date: data.start_date ? data.start_date.split('T')[0] : '',
                end_date: data.end_date ? data.end_date.split('T')[0] : '',
                description: data.description || '',
                format: data.format || 'pontos_corridos'
            });
        } catch (err) {
            console.error(err);
            alert('Erro ao carregar dados do campeonato.');
            navigate('/admin/championships');
        } finally {
            setFetching(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEditing) {
                await api.put(`/admin/championships/${id}`, formData);
            } else {
                await api.post('/admin/championships', formData);
            }
            navigate('/admin/championships');
        } catch (err) {
            console.error(err);
            alert('Erro ao salvar campeonato. Verifique os dados.');
        } finally {
            setLoading(false);
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
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8">
                <Link to="/admin/championships" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar Campeonato' : 'Novo Campeonato'}</h1>
                    <p className="text-gray-500">Preencha os dados para {isEditing ? 'editar o' : 'criar um novo'} evento.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-700">Modalidade</label>
                                <select
                                    value={formData.sport}
                                    onChange={e => setFormData({ ...formData, sport: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                                >
                                    {sports.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Datas */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Início</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700">Fim</label>
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

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Descrição (Opcional)</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-32 resize-none"
                                placeholder="Detalhes sobre o campeonato..."
                            />
                        </div>

                        {/* Format Selection based on User Request */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Formato de Disputa</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, format: 'pontos_corridos' })}
                                    className={`p-4 rounded-xl border text-left transition-all ${formData.format === 'pontos_corridos' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <span className={`block font-bold mb-1 ${formData.format === 'pontos_corridos' ? 'text-indigo-700' : 'text-gray-900'}`}>Pontos Corridos</span>
                                    <span className="text-xs text-gray-500">Todos contra todos. Quem somar mais pontos vence.</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, format: 'mata_mata' })}
                                    className={`p-4 rounded-xl border text-left transition-all ${formData.format === 'mata_mata' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <span className={`block font-bold mb-1 ${formData.format === 'mata_mata' ? 'text-indigo-700' : 'text-gray-900'}`}>Mata-mata</span>
                                    <span className="text-xs text-gray-500">Eliminatória simples. Perdeu, saiu. (Chaves)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, format: 'grupos_mata_mata' })}
                                    className={`p-4 rounded-xl border text-left transition-all ${formData.format === 'grupos_mata_mata' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <span className={`block font-bold mb-1 ${formData.format === 'grupos_mata_mata' ? 'text-indigo-700' : 'text-gray-900'}`}>Grupos + Mata-mata</span>
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
