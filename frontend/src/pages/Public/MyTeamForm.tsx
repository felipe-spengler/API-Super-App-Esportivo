import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Save, Loader2 } from 'lucide-react';
import api from '../../services/api';

export function MyTeamForm() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            // Removed incorrect call to /inscriptions/team

            // Wait, InscriptionController usually links to a championship. 
            // We need a generic Create Team endpoint for User.
            // Let's check api routes again.
            // Route::post('/inscriptions/team', [InscriptionController::class, 'registerTeam']);
            // Route::post('/teams', ...AdminController)

            // I should double check if there is a 'create personal team' endpoint.
            // AdminTeamController stores teams.
            // TeamController had addPlayer but not 'store'.
            // I might need to add 'store' to TeamController for users.

            // For now, let's assume we will add a 'store' method to TeamController or use the Admin one if permitted (usually not).
            // Let's try adding it to TeamController since users create teams.

            await api.post('/my-teams', { name, city });
            navigate('/profile/teams');

        } catch (error) {
            alert('Erro ao criar equipe. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Criar Nova Equipe</h1>
            </div>

            <div className="max-w-md mx-auto p-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                        <Shield className="w-8 h-8" />
                    </div>
                    <p className="text-center text-gray-500 text-sm mb-6">
                        Crie seu time para participar dos campeonatos. Você será o capitão.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Time</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Ex: Galáticos FC"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Cidade Base</label>
                            <input
                                type="text"
                                required
                                value={city}
                                onChange={e => setCity(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Ex: Toledo"
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {loading ? 'Criando...' : 'Criar Equipe'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
