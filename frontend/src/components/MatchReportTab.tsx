import React from 'react';
import { Printer } from 'lucide-react';

interface MatchReportTabProps {
    match: any;
}

export function MatchReportTab({ match }: MatchReportTabProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                <Printer size={40} className="text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Súmula Oficial</h3>
            <p className="text-gray-500 max-w-xs mb-8">
                Clique abaixo para visualizar e imprimir o documento oficial desta partida.
            </p>
            <a
                href={`/matches/${match.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95"
            >
                <Printer size={20} /> Imprimir Súmula
            </a>
        </div>
    );
}
