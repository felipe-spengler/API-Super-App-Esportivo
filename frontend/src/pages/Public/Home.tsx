import { MapPin, ArrowRight, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PublicHome() {


    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Escolha o Clube</h1>
                        <p className="text-gray-500">Selecione sua associação esportiva para continuar</p>
                    </div>

                    <div className="space-y-4">
                        {/* Mock Data matching Mobile */}
                        {[
                            { id: 1, name: 'Clube Toledão', city: 'Toledo - PR' },
                            { id: 2, name: 'Yara Country Clube', city: 'Toledo - PR' },
                        ].map((club) => (
                            <Link
                                key={club.id}
                                to="/club-home"
                                className="flex items-center p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 rounded-xl transition-all group duration-300"
                            >
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <Trophy className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 group-hover:text-indigo-700">{club.name}</h3>
                                    <div className="flex items-center text-sm text-gray-500 mt-0.5">
                                        <MapPin className="w-3 h-3 mr-1" />
                                        {club.city}
                                    </div>
                                </div>
                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400">
                                    <ArrowRight className="w-5 h-5" />
                                </div>
                            </Link>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-400 mb-4">Ou explore eventos públicos</p>
                        <Link to="/explore" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
                            Ver todos os eventos <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
