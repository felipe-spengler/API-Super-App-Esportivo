import React from 'react';

export const EditableSpan = ({ text, placeholder = '...' }: { text?: string, placeholder?: string }) => (
    <span
        contentEditable
        suppressContentEditableWarning
        className="print:bg-transparent bg-yellow-50 hover:bg-yellow-100 px-1 min-w-[20px] inline-block border-b border-gray-300 print:border-none outline-none focus:bg-white transition-colors empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
        data-placeholder={placeholder}
    >
        {text}
    </span>
);

export const PrintSignatures = ({ match }: { match: any }) => (
    <div className="mt-8 pt-4 border-t border-black break-inside-avoid">
        <div className="grid grid-cols-3 gap-8 text-center text-xs">
            <div className="flex flex-col gap-1 items-center">
                <div className="w-full border-b border-black h-8"></div>
                <span>Árbitro Principal</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
                <div className="w-full border-b border-black h-8"></div>
                <span>Capitão {match.home_team?.name}</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
                <div className="w-full border-b border-black h-8"></div>
                <span>Capitão {match.away_team?.name}</span>
            </div>
        </div>
    </div>
);

export const PrintObservations = () => (
    <div className="mt-4 border border-black p-2 h-24 text-xs">
        <b>Observações da Partida:</b>
        <div contentEditable className="w-full h-full outline-none mt-1"></div>
    </div>
);

export const PrintHeaderInfo = ({ match }: { match: any }) => (
    <div className="mb-4">
        <table className="w-full text-sm border-collapse border border-black mb-2">
            <tbody>
                <tr>
                    <td className="border border-black p-1 w-[80%]"><b>Competição:</b> {match.championship?.name}</td>
                    <td className="border border-black p-1"><b>Jogo Nº:</b> {match.id}</td>
                </tr>
            </tbody>
        </table>
        <table className="w-full text-sm border-collapse border border-black mb-2">
            <tbody>
                <tr>
                    <td className="border border-black p-1 w-[40%]"><b>Categoria:</b> {match.championship?.sport?.name || 'Esporte'}</td>
                    <td className="border border-black p-1 w-[30%]"><b>Fase:</b> {match.phase || 'Fase Única'}</td>
                    <td className="border border-black p-1 w-[30%]"><b>Rodada:</b> {match.round_name || '-'}</td>
                </tr>
            </tbody>
        </table>
    </div>
);
