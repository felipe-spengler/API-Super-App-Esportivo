import { useState } from 'react';
import { ArrowLeft, User, Shield, LogOut, Camera, X, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useAuth } from '../../context/AuthContext';
import { PhotoUploadSection } from '../Players/components/PhotoUploadSection';


export function Profile() {
    const navigate = useNavigate();
    const { user, signOut, updateUser } = useAuth();
    const [showEdit, setShowEdit] = useState(false);

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return '';
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const cleanApiUrl = apiUrl.replace(/\/$/, '');
        const apiBase = cleanApiUrl.replace(/\/api$/, '');
        let result = '';

        if (path.includes('/storage/')) {
            const storagePath = path.substring(path.indexOf('/storage/'));
            result = `${apiBase}/api${storagePath}`;
        } else if (path.startsWith('http')) {
            result = path;
        } else if (path.startsWith('/')) {
            result = path;
        } else {
            result = `${cleanApiUrl}/storage/${path}`;
        }

        console.log('[Profile:getImageUrl] Path:', path, '-> Result:', result);
        return result;
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-gray-100">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                        <User className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Faça Login</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        Para acessar seu perfil, gerenciar seus times e ver suas inscrições, você precisa estar conectado.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            Entrar na Conta
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            className="w-full bg-white text-indigo-600 font-bold py-3.5 rounded-xl border-2 border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200 active:scale-[0.98] transition-all"
                        >
                            Criar Nova Conta
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const MENU_ITEMS = [
        { label: 'Meus Times', icon: 'fluent-emoji:busts-in-silhouette', route: '/profile/teams' },
        { label: 'Inscrições', icon: 'fluent-emoji:trophy', route: '/profile/inscriptions' },
        { label: 'Meus Pedidos', icon: 'fluent-emoji:package', route: '/profile/orders' },
        // { label: 'Carteirinha', icon: 'fluent-emoji:identification-card', route: '/wallet' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-xl p-6 pt-10 shadow-xl shadow-slate-200/50 flex items-center sticky top-0 z-10 border-b border-slate-100">
                <button onClick={() => navigate('/')} className="p-3 mr-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-100 active:scale-95">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Meu Perfil</h1>
            </div>

            <div className="p-6 max-w-lg mx-auto space-y-8">

                {/* Profile Card */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-slate-100 flex flex-col items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50"></div>

                    <div className="relative group scale-100 hover:scale-105 transition-transform duration-500">
                        <div className="w-28 h-28 bg-slate-50 rounded-[2rem] flex items-center justify-center border-4 border-white shadow-2xl overflow-hidden group-hover:rotate-3 transition-all">
                            {(user as any).photo_url || (user as any).photo_path ? (
                                <img
                                    src={getImageUrl((user as any).photo_url || (user as any).photo_path)}
                                    className="w-full h-full object-cover"
                                    alt="Profile"
                                    onError={(e) => {
                                        (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || '')}&background=6366f1&color=fff&bold=true`;
                                    }}
                                />
                            ) : (
                                <User className="w-12 h-12 text-slate-300" />
                            )}
                        </div>
                        <button
                            onClick={() => setShowEdit(true)}
                            className="absolute -bottom-1 -right-1 bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-2.5 rounded-2xl shadow-xl shadow-indigo-200 active:scale-90 transition-all border-4 border-white"
                        >
                            <Camera className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="text-center">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{user.name}</h2>
                        <div className="flex justify-center mt-2.5">
                            <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-100/50 flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5" />
                                {user.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Dashboard Link for Admins */}
                {(user.is_admin || user.role === 'admin' || user.role === 'super_admin') && (
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="w-full relative group overflow-hidden bg-slate-900 p-8 rounded-[2rem] shadow-2xl shadow-slate-300 flex flex-col items-center gap-4 active:scale-[0.98] transition-all"
                    >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                        <div className="p-4 rounded-2xl bg-white/10 text-white group-hover:scale-110 transition-transform">
                            <Shield className="w-8 h-8" />
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="font-black text-white text-lg uppercase tracking-widest">Painel Admin</span>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Gerenciar Plataforma</p>
                        </div>
                    </button>
                )}

                {/* Menu Grid */}
                <div className="grid grid-cols-2 gap-5">
                    {MENU_ITEMS.map((item, idx) => {
                        return (
                            <button
                                key={idx}
                                onClick={() => navigate(item.route)}
                                className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center justify-center gap-4 hover:shadow-indigo-50 hover:border-indigo-200 transition-all active:scale-95 group"
                            >
                                <div className={`w-20 h-20 flex items-center justify-center bg-slate-50 rounded-[1.5rem] group-hover:scale-110 transition-transform`}>
                                    <Icon icon={item.icon} className="w-12 h-12" />
                                </div>
                                <span className="font-black text-slate-700 text-[10px] uppercase tracking-widest text-center group-hover:text-indigo-600 whitespace-nowrap">{item.label}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Settings & Logout */}
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <button
                        onClick={() => setShowEdit(true)}
                        className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-all group border-b border-slate-50"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                <User className="w-5 h-5" />
                            </div>
                            <span className="text-slate-800 font-extrabold uppercase tracking-widest text-sm">Dados e Fotos</span>
                        </div>
                        <ArrowLeft className="w-5 h-5 text-slate-200 group-hover:text-indigo-400 rotate-180 transition-all" />
                    </button>
                    <button
                        onClick={() => navigate('/deletar-conta')}
                        className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-all group border-b border-slate-50"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <span className="text-slate-800 font-extrabold uppercase tracking-widest text-sm group-hover:text-red-600">Excluir Minha Conta</span>
                        </div>
                        <ArrowLeft className="w-5 h-5 text-slate-200 group-hover:text-red-400 rotate-180 transition-all" />
                    </button>
                    <button
                        onClick={() => { signOut(); navigate('/'); }}
                        className="w-full p-6 flex items-center justify-between hover:bg-red-50 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                                <LogOut className="w-5 h-5" />
                            </div>
                            <span className="text-red-600 font-extrabold uppercase tracking-widest text-sm">Sair da Conta</span>
                        </div>
                    </button>
                </div>

            </div>

            {/* Edit Photo Modal */}
            {showEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowEdit(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 mb-6">Suas Fotos de Perfil</h3>

                        <div className="space-y-6">
                            <PhotoUploadSection
                                playerId={user.id.toString()}
                                currentPhotos={(user as any).photo_urls || (user as any).photo_url}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
