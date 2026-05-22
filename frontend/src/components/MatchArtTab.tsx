import React from 'react';
import { Share2 } from 'lucide-react';
import api from '../services/api';

interface MatchArtTabProps {
    match: any;
}

export function MatchArtTab({ match }: MatchArtTabProps) {
    return (
        <div className="flex flex-col items-center justify-center py-6">
            <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                <a
                    href={`${api.defaults.baseURL}/public/art/match/${match.id}/scheduled?download=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative w-full aspect-video bg-gray-200 rounded-2xl overflow-hidden shadow-xl border border-white hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
                >
                    <img
                        src={`${api.defaults.baseURL}/public/art/match/${match.id}/scheduled?t=${Date.now()}`}
                        className="w-full h-full object-cover"
                        alt="Arte do Jogo Programado"
                        onError={(e: any) => {
                            e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22225%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22Arial%22%20font-size%3D%2220%22%20fill%3D%22%239ca3af%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3ECarregando%20Arte...%3C%2Ftext%3E%3C%2Fsvg%3E';
                        }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-gray-800 shadow-lg">
                            🔍 Clique para ampliar
                        </div>
                    </div>
                </a>
                <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                        Arte de Divulgação
                    </h3>
                    <p className="text-gray-500 text-sm mb-4">Compartilhe as informações do jogo!</p>
                    <a
                        href={`${api.defaults.baseURL}/public/art/match/${match.id}/scheduled?download=true`}
                        download={`jogo-${match.id}.jpg`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 text-sm"
                    >
                        <Share2 size={16} /> Baixar Imagem
                    </a>
                    {/* @ts-ignore */}
                    {navigator.share && (
                        <button
                            onClick={async () => {
                                try {
                                    const response = await fetch(`${api.defaults.baseURL}/public/art/match/${match.id}/scheduled`);
                                    const blob = await response.blob();
                                    const file = new File([blob], `jogo-${match.id}.jpg`, { type: 'image/jpeg' });
                                    await navigator.share({
                                        title: `Jogo: ${match.home_team?.name} vs ${match.away_team?.name}`,
                                        text: 'Confira os detalhes da nossa próxima partida!',
                                        files: [file]
                                    });

                                } catch (err) {
                                    console.error('Error sharing:', err);
                                }
                            }}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95 text-sm mt-2"
                        >
                            <Share2 size={16} /> Compartilhar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
