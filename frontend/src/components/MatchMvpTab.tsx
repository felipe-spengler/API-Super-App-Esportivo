import React from 'react';
import { Share2, User } from 'lucide-react';
import api from '../services/api';

interface MatchMvpTabProps {
    match: any;
}

export function MatchMvpTab({ match }: MatchMvpTabProps) {
    return (
        <div className="flex flex-col items-center justify-center py-6">
            {match?.mvp ? (
                <div className="w-full max-w-sm flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                    <a
                        href={`${api.defaults.baseURL}/public/art/match/${match.id}/mvp`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative w-full aspect-[4/5] bg-gray-200 rounded-2xl overflow-hidden shadow-xl border border-white hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] group cursor-pointer"
                    >
                        <img
                            src={`${api.defaults.baseURL}/public/art/match/${match.id}/mvp`}
                            className="w-full h-full object-cover"
                            alt="Arte do Craque do Jogo"
                            onError={(e: any) => {
                                e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22500%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22Arial%22%20font-size%3D%2224%22%20fill%3D%22%239ca3af%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3EArte%20do%20Craque%3C%2Ftext%3E%3C%2Fsvg%3E';
                            }}
                        />
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-gray-800 shadow-lg">
                                🔍 Clique para ampliar
                            </div>
                        </div>
                    </a>
                    <div className="text-center">
                        <h3 className="text-xl font-black text-indigo-900 uppercase italic tracking-tighter">
                            {match.mvp.name}
                        </h3>
                        <p className="text-gray-500 text-sm font-medium mb-3">Eleito o melhor da partida</p>
                        <a
                            href={`${api.defaults.baseURL}/public/art/match/${match.id}/mvp`}
                            download={`craque-${match.id}-${match.mvp.name}.jpg`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 text-sm"
                        >
                            <Share2 size={16} /> Baixar Arte
                        </a>
                    </div>
                </div>
            ) : (
                <div className="text-center py-20">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <User size={32} className="text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">Nenhum craque definido ainda.</p>
                </div>
            )}
        </div>
    );
}
