import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, MapPin, ArrowLeft, Filter, Calendar as CalendarIcon } from 'lucide-react';
import api from '../../services/api';

export function Agenda() {
    const navigate = useNavigate();

    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [status, setStatus] = useState('agendado');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        loadEvents();
    }, [status, startDate, endDate]);

    async function loadEvents() {
        setLoading(true);
        try {
            // Using Club ID 1 as default for the main context
            const clubId = 1;
            const params: any = { status };

            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const response = await api.get(`/clubs/${clubId}/agenda`, { params });
            setEvents(response.data);
        } catch (error) {
            console.error('Erro ao carregar agenda:', error);
        } finally {
            setLoading(false);
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return {
            day: date.getDate(),
            month: date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''),
            weekday: date.toLocaleString('pt-BR', { weekday: 'long' }),
        };
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 pt-8 shadow-sm sticky top-0 z-10 border-b border-gray-100">
                <div className="flex items-center mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">Agenda do Clube</h1>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setStatus('agendado')}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${status === 'agendado' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                            Jogos Agendados
                        </button>
                        <button
                            onClick={() => setStatus('ao_vivo')}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${status === 'ao_vivo' ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-100 text-gray-600'}`}
                        >
                            Ao Vivo
                        </button>
                        <button
                            onClick={() => setStatus('concluido')}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${status === 'concluido' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                            Concluídos
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" /> De:
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" /> Até:
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-md mx-auto p-4 space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-400">Carregando jogos...</div>
                ) : events.length === 0 ? (
                    <div className="text-center py-10">
                        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CalendarIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">Nenhum evento encontrado para este filtro.</p>
                        <button
                            onClick={() => { setStartDate(''); setEndDate(''); setStatus('agendado'); }}
                            className="mt-2 text-indigo-600 text-sm font-bold hover:underline"
                        >
                            Limpar filtros
                        </button>
                    </div>
                ) : (
                    events.map((event) => {
                        const dateInfo = formatDate(event.date);
                        return (
                            <div key={event.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex gap-4">
                                <div className="flex flex-col items-center justify-center bg-indigo-50 rounded-lg w-16 h-16 shrink-0 text-indigo-700">
                                    <span className="text-xs font-bold uppercase">{dateInfo.month}</span>
                                    <span className="text-2xl font-black leading-none">{dateInfo.day}</span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-0.5 block">{event.category}</span>
                                    <h3 className="font-bold text-gray-900 truncate">{event.title}</h3>

                                    {event.status === 'finished' && (
                                        <div className="mt-1 text-sm font-black text-gray-800">
                                            {event.home_score} x {event.away_score}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {event.time}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {event.location}
                                        </div>
                                        {event.status === 'live' && (
                                            <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold animate-pulse">AO VIVO</span>
                                        )}
                                    </div>
                                </div>
                                <div className="self-center">
                                    <ChevronRight className="w-5 h-5 text-gray-300" />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
