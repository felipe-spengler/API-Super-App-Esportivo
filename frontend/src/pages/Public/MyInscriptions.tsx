
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Calendar, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import api from '../../services/api';

export function MyInscriptions() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [inscriptions, setInscriptions] = useState<any[]>([]);

    useEffect(() => {
        loadInscriptions();
    }, []);

    async function loadInscriptions() {
        try {
            const response = await api.get('/my-inscriptions');
            setInscriptions(response.data);
        } catch (error) {
            console.error(error);
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
                <h1 className="text-xl font-bold text-gray-800">Minhas Inscrições</h1>
            </div>

            <div className="max-w-lg mx-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-indigo-600" />
                    </div>
                ) : inscriptions.map((ins) => (
                    <div key={ins.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Trophy className="w-4 h-4 text-indigo-500" />
                                <h3 className="font-bold text-gray-900">{ins.race?.championship?.name || 'Evento'}</h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">{ins.category?.name || 'Geral'}</p>

                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ins.status_payment === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {ins.status_payment === 'paid' ? 'Confirmada' : 'Pendente Pagamento'}
                                </span>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {new Date(ins.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            {ins.status_payment !== 'paid' && (
                                <p className="text-[10px] text-indigo-600 font-bold mt-2 flex items-center gap-1">
                                    <AlertCircle size={10} /> Toque para pagar e confirmar sua vaga
                                </p>
                            )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                ))}

                {!loading && inscriptions.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-medium">Você ainda não participou de nenhum evento.</p>
                        <button
                            onClick={() => navigate('/explore')}
                            className="mt-4 text-indigo-600 font-bold text-sm"
                        >
                            Explorar Eventos
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
