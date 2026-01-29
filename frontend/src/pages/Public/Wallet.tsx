
import { QrCode, User, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Wallet() {
    const navigate = useNavigate();

    // Mock User Data
    const user = {
        name: 'Felipe Silva',
        memberId: '123.456.789-00',
        plan: 'Sócio Titular',
        validity: 'Dez/2026',
        club: 'Clube Toledão',
        avatar: null
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 p-4 flex flex-col items-center">
            <div className="w-full max-w-md space-y-6">
                <h1 className="text-2xl font-bold text-gray-900 mt-4 text-center">Carteirinha Digital</h1>

                {/* Card */}
                <div className="bg-gradient-to-br from-indigo-900 to-blue-800 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden aspect-[1.58/1]">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white/20 rounded-lg">
                                    <ShieldCheck className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold tracking-wide text-sm">{user.club}</span>
                            </div>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                                {user.plan}
                            </span>
                        </div>

                        <div className="flex items-center gap-4 my-4">
                            <div className="w-16 h-16 rounded-full bg-gray-200 border-2 border-white/30 flex items-center justify-center overflow-hidden">
                                {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-gray-400" />}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold leading-tight">{user.name}</h2>
                                <p className="text-xs text-indigo-200 mt-0.5">ID: {user.memberId}</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] text-indigo-300 uppercase tracking-widest mb-0.5">Validade</p>
                                <p className="text-sm font-bold font-mono">{user.validity}</p>
                            </div>
                            <QrCode className="w-12 h-12 text-white/90" />
                        </div>
                    </div>
                </div>

                {/* Info Text */}
                <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
                    <p className="text-gray-500 text-sm">
                        Esta carteirinha é pessoal e intransferível. Apresente este QR Code na portaria do clube para liberar seu acesso.
                    </p>
                </div>

                <button
                    onClick={() => navigate(-1)}
                    className="w-full py-4 text-gray-500 font-medium hover:text-gray-800 transition-colors"
                >
                    Voltar
                </button>
            </div>
        </div>
    );
}
