
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, MapPin, ArrowLeft } from 'lucide-react';

export function Agenda() {
    const navigate = useNavigate();

    // Mock Agenda Data
    const events = [
        { id: 1, title: 'Final da Copa Verão', date: '2026-02-15', time: '16:00', location: 'Campo Principal', category: 'Futebol' },
        { id: 2, title: 'Torneio de Vôlei Misto', date: '2026-02-18', time: '19:00', location: 'Ginásio A', category: 'Vôlei' },
        { id: 3, title: 'Corrida Noturna', date: '2026-02-20', time: '20:00', location: 'Pista de Atletismo', category: 'Corrida' },
        { id: 4, title: 'Festival Infantil', date: '2026-02-25', time: '09:00', location: 'Área de Lazer', category: 'Recreação' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Agenda do Clube</h1>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4">
                {events.map((event) => (
                    <div key={event.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex gap-4">
                        <div className="flex flex-col items-center justify-center bg-indigo-50 rounded-lg w-16 h-16 shrink-0 text-indigo-700">
                            <span className="text-xs font-bold uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-2xl font-black leading-none">{new Date(event.date).getDate()}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-0.5 block">{event.category}</span>
                            <h3 className="font-bold text-gray-900 truncate">{event.title}</h3>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {event.time}
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {event.location}
                                </div>
                            </div>
                        </div>
                        <div className="self-center">
                            <ChevronRight className="w-5 h-5 text-gray-300" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
