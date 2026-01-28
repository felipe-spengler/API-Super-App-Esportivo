import { useNavigate, useParams } from 'react-router-dom';
import { Trophy, Calendar, ShoppingBag, QrCode, Medal, X } from 'lucide-react';

const MOCK_MENU = [
    { id: 1, name: 'Futebol', icon: 'futbol', color: 'bg-green-600' },
    { id: 2, name: 'Vôlei', icon: 'volleyball', color: 'bg-yellow-500' },
    { id: 3, name: 'Corrida', icon: 'person-running', color: 'bg-blue-500' },
    { id: 4, name: 'Tênis', icon: 'table-tennis', color: 'bg-orange-500' },
    { id: 5, name: 'Lutas', icon: 'hand-fist', color: 'bg-red-600' },
    { id: 6, name: 'Natação', icon: 'waves', color: 'bg-cyan-500' },
];

export function ClubHome() {
    const navigate = useNavigate();
    const { slug } = useParams(); // To support future slug usage
    const clubName = slug === 'yara' ? 'Yara Country Clube' : 'Clube Toledão'; // Simple mock logic

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header / Top Bar */}
            <div className="bg-white p-6 pt-8 pb-4 shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="flex justify-between items-center max-w-lg mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{clubName}</h1>
                        <p className="text-gray-500 text-sm">Bem-vindo ao seu clube!</p>
                    </div>
                    <button onClick={() => navigate('/')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="max-w-lg mx-auto p-4 space-y-6">

                {/* Destaque / Banner */}
                <div className="bg-indigo-900 rounded-3xl p-6 relative h-48 flex flex-col justify-center shadow-lg overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => navigate('/explore')}>
                    {/* Background Pattern */}
                    <div className="absolute -right-4 -top-4 opacity-10">
                        <Medal size={180} color="white" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-white text-2xl font-bold mb-1">Copa Verão 2026</h2>
                        <p className="text-indigo-200 text-sm mb-6">Inscrições abertas até 30/01</p>

                        <span className="bg-white px-5 py-2.5 rounded-full text-indigo-900 font-bold text-xs inline-block hover:bg-indigo-50 transition-colors shadow-sm">
                            VER CAMPEONATOS
                        </span>
                    </div>
                </div>

                {/* Atalhos Rápidos */}
                <div>
                    <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Acesso Rápido</h2>
                    <div className="bg-white rounded-2xl p-6 flex justify-around shadow-sm border border-gray-100">
                        <button className="flex flex-col items-center gap-2 group" onClick={() => navigate('/wallet')}>
                            <div className="bg-blue-50 p-4 rounded-2xl group-hover:bg-blue-100 transition-colors">
                                <QrCode className="w-6 h-6 text-blue-600" />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">Carteirinha</span>
                        </button>

                        <button className="flex flex-col items-center gap-2 group" onClick={() => navigate('/shop')}>
                            <div className="bg-emerald-50 p-4 rounded-2xl group-hover:bg-emerald-100 transition-colors">
                                <ShoppingBag className="w-6 h-6 text-emerald-600" />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">Loja</span>
                        </button>

                        <button className="flex flex-col items-center gap-2 group">
                            <div className="bg-orange-50 p-4 rounded-2xl group-hover:bg-orange-100 transition-colors">
                                <Calendar className="w-6 h-6 text-orange-500" />
                            </div>
                            <span className="text-xs text-gray-600 font-medium">Agenda</span>
                        </button>
                    </div>
                </div>

                {/* Grid de Esportes */}
                <div>
                    <h2 className="text-lg font-bold text-gray-800 mb-4 px-1">Modalidades</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {MOCK_MENU.map((sport) => (
                            <button
                                key={sport.id}
                                className="aspect-square bg-white rounded-2xl flex flex-col items-center justify-center gap-3 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all"
                                onClick={() => navigate(`/explore?sport=${sport.name}`)}
                            >
                                <div className={`w-12 h-12 ${sport.color} rounded-full flex items-center justify-center shadow-sm`}>
                                    <Trophy className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-gray-700 font-medium text-xs">{sport.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
