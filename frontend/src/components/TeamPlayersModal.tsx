import { X, User } from 'lucide-react';

interface Player {
    id: number;
    name: string;
    nickname?: string;
    photo_url?: string;
    position?: string;
    number?: string;
}

interface TeamPlayersModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamName: string;
    teamLogo?: string;
    players: Player[];
}

export function TeamPlayersModal({ isOpen, onClose, teamName, teamLogo, players }: TeamPlayersModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-slate-900 p-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex items-center gap-4 mt-2">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border-2 border-white/20 shadow-lg">
                            {teamLogo ? (
                                <img src={teamLogo} alt={teamName} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-black text-slate-400 uppercase italic">
                                    {teamName.substring(0, 2)}
                                </span>
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase italic leading-tight">{teamName}</h3>
                            <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Elenco Oficial</p>
                        </div>
                    </div>
                </div>

                {/* Player List */}
                <div className="max-h-[60vh] overflow-y-auto p-4 bg-slate-50">
                    {players && players.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {players.map((player) => (
                                <div key={player.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-50 overflow-hidden flex items-center justify-center relative">
                                            {player.photo_url ? (
                                                <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="text-slate-300" size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 uppercase text-sm tracking-tight">{player.nickname || player.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                {player.position || 'Jogador'}
                                            </p>
                                        </div>
                                    </div>
                                    {player.number && (
                                        <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-black text-xs italic shadow-md">
                                            #{player.number}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <User className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Nenhum jogador inscrito neste time</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl"
                    >
                        Fechar Elenco
                    </button>
                </div>
            </div>
        </div>
    );
}
