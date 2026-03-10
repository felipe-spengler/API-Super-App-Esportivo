
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Package, User, Trophy, Calendar, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export function RaceCheckIn() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);
    const [registration, setRegistration] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadRegistration();
    }, [id]);

    async function loadRegistration() {
        try {
            const response = await api.get(`/security/validate-race-kit/${id}`);
            setRegistration(response.data.result);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Inscrição não encontrada.');
            toast.error('Erro ao carregar dados da inscrição.');
        } finally {
            setLoading(false);
        }
    }

    async function handleConfirmDelivery() {
        if (!registration) return;

        setConfirming(true);
        try {
            await api.post(`/security/confirm-kit-delivery/${id}`);
            toast.success('Kit entregue com sucesso!');
            loadRegistration(); // Recarrega para mostrar o status atualizado
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao confirmar entrega.');
        } finally {
            setConfirming(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 text-center">
                <XCircle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro na Validação</h1>
                <p className="text-gray-500 mb-6">{error}</p>
                <button
                    onClick={() => navigate('/admin')}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold"
                >
                    Voltar ao Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-indigo-600 p-6 text-center text-white">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-80" />
                        <h1 className="text-xl font-bold uppercase tracking-wider">Validação de Kit</h1>
                    </div>

                    <div className="p-6 space-y-8">
                        {/* Atleta */}
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                                {registration.user?.photo_url ? (
                                    <img src={registration.user.photo_url} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="text-gray-400 w-8 h-8" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">{registration.name || registration.user?.name}</h2>
                                <p className="text-sm text-gray-500">CPF: {registration.user?.cpf || '---'}</p>
                            </div>
                        </div>

                        {/* Detalhes Prova */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 border border-gray-100 rounded-xl">
                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Status Pagamento</p>
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${registration.status_payment === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {registration.status_payment === 'paid' ? 'PAGO' : 'PENDENTE'}
                                </span>
                            </div>
                            <div className="p-4 border border-gray-100 rounded-xl">
                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Número de Peito</p>
                                <p className="text-xl font-black text-indigo-600">#{registration.bib_number}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Trophy className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">Evento / Categoria</p>
                                    <p className="text-sm font-medium text-gray-900">{registration.race?.championship?.name} - {registration.category?.name}</p>
                                </div>
                            </div>
                        </div>

                        {/* Situação do Kit */}
                        <div className={`p-6 rounded-2xl border-2 text-center ${registration.kit_delivered ? 'bg-green-50 border-green-200' : 'bg-indigo-50 border-indigo-200'}`}>
                            {registration.kit_delivered ? (
                                <>
                                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                                    <h3 className="text-lg font-bold text-green-900">KIT JÁ ENTREGUE</h3>
                                    <p className="text-xs text-green-600 mt-1">Entregue em: {new Date(registration.kit_delivered_at).toLocaleString()}</p>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-lg font-bold text-indigo-900 mb-4">KIT DISPONÍVEL PARA ENTREGA</h3>

                                    {registration.status_payment === 'paid' ? (
                                        <button
                                            onClick={handleConfirmDelivery}
                                            disabled={confirming}
                                            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
                                        >
                                            {confirming ? <Loader2 className="animate-spin" /> : <Package className="w-5 h-5" />}
                                            Confirmar Entrega do Kit
                                        </button>
                                    ) : (
                                        <div className="bg-red-100 text-red-700 p-4 rounded-xl flex items-center justify-center gap-2">
                                            <AlertTriangle size={20} />
                                            <span className="font-bold">Pagamento Pendente: Não entregar kit!</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <button
                        onClick={() => navigate('/admin')}
                        className="text-gray-400 text-sm font-medium hover:text-gray-600"
                    >
                        Voltar ao Painel Administrativo
                    </button>
                </div>
            </div>
        </div>
    );
}
