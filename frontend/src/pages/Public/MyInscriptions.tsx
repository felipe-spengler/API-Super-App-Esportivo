
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Calendar, MapPin, ChevronRight, Clock } from 'lucide-react';

export function MyInscriptions() {
    const navigate = useNavigate();

    // Mock Data
    const inscriptions = [
        { id: 101, event: 'Copa Verão 2026', category: 'Futebol - Livre', status: 'confirmed', date: '2026-02-15' },
        { id: 102, event: 'Corrida Noturna', category: '5km Geral', status: 'pending', date: '2026-02-20' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Minhas Inscrições</h1>
            </div>

            <div className="max-w-lg mx-auto p-4 space-y-4">
                {inscriptions.map((ins) => (
                    <div key={ins.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Trophy className="w-4 h-4 text-indigo-500" />
                                <h3 className="font-bold text-gray-900">{ins.event}</h3>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">{ins.category}</p>

                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ins.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {ins.status === 'confirmed' ? 'Confirmada' : 'Pendente Pagamento'}
                                </span>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {new Date(ins.date).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                ))}

                {inscriptions.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                        <p>Você ainda não participou de nenhum evento.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
