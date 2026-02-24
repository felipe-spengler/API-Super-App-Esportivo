import { Link, Outlet, useLocation } from 'react-router-dom';
import { Trophy, Home, User, Lock, ChevronDown } from 'lucide-react';
import { Icon } from '@iconify/react';
import { useAuth } from '../context/AuthContext';

export function PublicLayout() {
    const location = useLocation();
    const { user } = useAuth();

    // Helper to check active link
    const isActive = (path: string) => location.pathname === path;

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

        console.log('[getImageUrl] Path:', path, '-> Result:', result);
        return result;
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-20 md:pb-0">
            {/* Desktop Navbar (Hidden on Mobile) */}
            <nav className="hidden md:block bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50 transition-all duration-500 shadow-sm shadow-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-22">
                        {/* Logo Area */}
                        <div className="flex-shrink-0 flex items-center gap-3 group cursor-pointer">
                            <Link to="/" className="flex items-center gap-4">
                                <div className="p-1 group-hover:scale-110 transition-all duration-500">
                                    <img src="/logo.png" alt="Esportes7 Logo" className="w-12 h-12 object-contain" />
                                </div>
                                <div className="flex flex-col">
                                    <span translate="no" className="font-black text-2xl text-slate-900 tracking-tighter leading-none group-hover:text-indigo-600 transition-colors">
                                        Esportes7
                                    </span>
                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1">Platform</span>
                                </div>
                            </Link>
                        </div>

                        {/* Desktop Menu Links - Centered */}
                        <div className="hidden md:flex items-center gap-4">
                            <Link to="/" className={`flex items-center gap-2.5 px-5 py-2.5 text-sm font-black transition-all duration-300 rounded-2xl group ${isActive('/') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}>
                                <Icon icon="fluent-emoji:house" className={`w-5 h-5 transition-transform group-hover:scale-110`} />
                                <span translate="no" className="uppercase tracking-wide">Início</span>
                            </Link>

                            <Link to="/explore" className={`flex items-center gap-2.5 px-5 py-2.5 text-sm font-black transition-all duration-300 rounded-2xl group ${isActive('/explore') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}>
                                <Icon icon="fluent-emoji:compass" className={`w-5 h-5 transition-transform group-hover:scale-110`} />
                                <span translate="no" className="uppercase tracking-wide">Explorar</span>
                            </Link>

                            <Link to="/profile" className={`flex items-center gap-2.5 px-5 py-2.5 text-sm font-black transition-all duration-300 rounded-2xl group ${isActive('/profile') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}>
                                <Icon icon="fluent-emoji:person" className={`w-5 h-5 transition-transform group-hover:scale-110`} />
                                <span translate="no" className="uppercase tracking-wide">Perfil</span>
                            </Link>

                            {user?.is_admin && (
                                <Link to="/admin/dashboard" className={`flex items-center gap-2.5 px-5 py-2.5 text-sm font-black transition-all duration-300 rounded-2xl group ${location.pathname.startsWith('/admin') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}>
                                    <Icon icon="fluent-emoji:locked-with-key" className={`w-5 h-5 transition-transform group-hover:scale-110`} />
                                    <span translate="no" className="uppercase tracking-wide">Admin</span>
                                </Link>
                            )}
                        </div>

                        {/* Action Button */}
                        <div className="flex items-center gap-4">
                            {!user ? (
                                <Link to="/login" className="px-8 py-3 text-sm font-black text-white bg-slate-900 hover:bg-indigo-600 rounded-full transition-all shadow-xl shadow-slate-200 hover:shadow-indigo-200 hover:scale-105 active:scale-95 uppercase tracking-widest">
                                    Entrar
                                </Link>
                            ) : (
                                <Link to="/profile" className="flex items-center gap-3 pl-2 pr-5 py-2 bg-slate-50 border border-slate-100 rounded-[1.2rem] hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all group active:scale-95">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden group-hover:scale-110 transition-transform">
                                        {(user as any).photo_url || (user as any).photo_path ? (
                                            <img
                                                src={getImageUrl((user as any).photo_url || (user as any).photo_path)}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || '')}&background=6366f1&color=fff&bold=true`;
                                                }}
                                            />
                                        ) : (
                                            <User className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Bem-vindo</span>
                                        <span className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors max-w-[120px] truncate">
                                            {user.name?.split(' ')[0]}
                                        </span>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Page Content — Extra bottom padding so content never hides under bottom nav on iOS */}
            <main className="pb-safe">
                <Outlet />
            </main>

            {/*
              * Mobile Bottom Navigation
              * KEY iOS/Safari fixes applied here:
              * 1. isolate — creates an isolated stacking context, preventing z-index conflicts with page content
              * 2. transform: translateZ(0) — forces GPU compositing, fixes Safari fixed-position bleed-through
              * 3. -webkit-backdrop-filter — required prefix for Safari backdrop blur
              * 4. paddingBottom: env(safe-area-inset-bottom) — respects the iPhone notch/home bar area
              * 5. All text uses translate='no' to prevent Safari's auto-translate from replacing menu labels
              */}
            <div
                className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 border-t border-slate-100 z-[9999] shadow-[0_-8px_30px_rgb(0,0,0,0.04)]"
                style={{
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    WebkitTransform: 'translateZ(0)',
                    transform: 'translateZ(0)',
                    isolation: 'isolate',
                    WebkitBackdropFilter: 'blur(12px)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <div className="flex justify-around items-center h-16">
                    <Link to="/" className={`relative flex flex-col items-center justify-center h-full min-w-[70px] transition-all duration-300 ${isActive('/') || isActive('/club-home') ? 'scale-110 active-nav' : 'grayscale opacity-70 hover:opacity-100'}`}>
                        <Icon icon="fluent-emoji:house" className="w-6 h-6" />
                        <span translate="no" className={`text-[9px] font-black uppercase tracking-widest mt-1.5 transition-all ${isActive('/') ? 'text-indigo-600' : 'text-slate-500'}`}>Início</span>
                        {(isActive('/') || isActive('/club-home')) && <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full shadow-[0_2px_10px_rgba(79,70,229,0.4)]" />}
                    </Link>

                    <Link to="/explore" className={`relative flex flex-col items-center justify-center h-full min-w-[70px] transition-all duration-300 ${isActive('/explore') ? 'scale-110 active-nav' : 'grayscale opacity-70 hover:opacity-100'}`}>
                        <Icon icon="fluent-emoji:compass" className="w-6 h-6" />
                        <span translate="no" className={`text-[9px] font-black uppercase tracking-widest mt-1.5 transition-all ${isActive('/explore') ? 'text-indigo-600' : 'text-slate-500'}`}>Explorar</span>
                        {isActive('/explore') && <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full shadow-[0_2px_10px_rgba(79,70,229,0.4)]" />}
                    </Link>

                    <Link to="/profile" className={`relative flex flex-col items-center justify-center h-full min-w-[70px] transition-all duration-300 ${isActive('/profile') ? 'scale-110 active-nav' : 'grayscale opacity-70 hover:opacity-100'}`}>
                        <Icon icon="fluent-emoji:person" className="w-6 h-6" />
                        <span translate="no" className={`text-[9px] font-black uppercase tracking-widest mt-1.5 transition-all ${isActive('/profile') ? 'text-indigo-600' : 'text-slate-500'}`}>Perfil</span>
                        {isActive('/profile') && <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full shadow-[0_2px_10px_rgba(79,70,229,0.4)]" />}
                    </Link>

                    {user?.is_admin && (
                        <Link to="/admin/dashboard" className={`relative flex flex-col items-center justify-center h-full min-w-[70px] transition-all duration-300 ${location.pathname.startsWith('/admin') ? 'scale-110 active-nav' : 'grayscale opacity-70 hover:opacity-100'}`}>
                            <Icon icon="fluent-emoji:locked-with-key" className="w-6 h-6" />
                            <span translate="no" className={`text-[9px] font-black uppercase tracking-widest mt-1.5 transition-all ${location.pathname.startsWith('/admin') ? 'text-indigo-600' : 'text-slate-500'}`}>Admin</span>
                            {location.pathname.startsWith('/admin') && <div className="absolute top-0 w-8 h-1 bg-indigo-600 rounded-b-full shadow-[0_2px_10px_rgba(79,70,229,0.4)]" />}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
