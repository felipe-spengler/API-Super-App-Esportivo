import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { PrintHeaderInfo, PrintSignatures, PrintObservations } from './PrintTemplates/PrintBase';
import { PrintFootball } from './PrintTemplates/PrintFootball';
import { PrintVolley } from './PrintTemplates/PrintVolley';
import { PrintTennis } from './PrintTemplates/PrintTennis';

export function MatchPrintView() {
    const { id } = useParams();
    const [match, setMatch] = useState<any>(null);
    const [rosters, setRosters] = useState<any>({ home: [], away: [] });
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) loadMatch();
    }, [id]);

    const loadMatch = async () => {
        try {
            const response = await api.get(`/matches/${id}/operation-details`);
            const data = response.data;
            setMatch(data.match);
            setRosters(data.rosters);
            setEvents(data.events);
        } catch (error) {
            console.error('Error fetching match details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center uppercase font-bold text-gray-400">Carregando súmula...</div>;
    if (!match) return <div className="p-8 text-center uppercase font-bold text-red-400">Partida não encontrada</div>;

    const sportSlug = match?.championship?.sport?.slug || '';

    const renderTemplate = () => {
        if (sportSlug === 'volei') {
            return <PrintVolley match={match} rosters={rosters} events={events} />;
        }
        if (sportSlug.includes('tenis')) {
            return <PrintTennis match={match} rosters={rosters} events={events} />;
        }
        return <PrintFootball match={match} rosters={rosters} events={events} />;
    };

    return (
        <div className="bg-white text-black min-h-screen p-4 font-sans max-w-[210mm] mx-auto print:max-w-none print:m-0 print:p-0">
            {/* Header / Logo */}
            <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
                <div className="flex items-center gap-4">
                    <img 
                        src={match.championship?.logo || "/logo.png"} 
                        alt="Logo" 
                        className="w-20 h-20 object-contain"
                        onError={(e: any) => e.target.src = "https://via.placeholder.com/80?text=LOGO"}
                    />
                    <div>
                        <h1 className="text-2xl font-black uppercase leading-tight">Súmula de Partida</h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Gerado via Super App Esportivo</p>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <button 
                        onClick={() => window.print()} 
                        className="no-print bg-black text-white px-4 py-1 text-xs font-bold uppercase transition-transform hover:scale-105 active:scale-95 mb-2"
                    >
                        Imprimir / Salvar PDF
                    </button>
                    <div className="text-[10px] font-bold border border-black px-2 py-0.5 bg-gray-50 uppercase">
                        Cód: {match.id?.toString().padStart(6, '0')}
                    </div>
                </div>
            </div>

            <PrintHeaderInfo match={match} />
            
            {renderTemplate()}

            <PrintObservations />
            <PrintSignatures match={match} />
            
            <div className="mt-8 text-[10px] text-gray-400 text-center italic">
                Este documento é uma representação oficial da partida realizada em {match.start_time ? new Date(match.start_time).toLocaleString() : 'N/A'}.
            </div>
        </div>
    );
}
