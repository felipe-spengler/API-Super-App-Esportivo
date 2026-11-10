import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, Compass, Calendar, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function PublicLayout() {
    const location = useLocation();
    const { user } = useAuth();

    const isActive = (path: string) => {
        if (path === '/') {
            return location.pathname === '/' || location.pathname.startsWith('/club-home');
        }
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return '';
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const cleanApiUrl = apiUrl.replace(/\/$/, '');
        const apiBase = cleanApiUrl.replace(/\/api$/, '');

        if (path.includes('/storage/')) {
            const storagePath = path.substring(path.indexOf('/storage/'));
            return `${apiBase}/api${storagePath}`;
        }
        if (path.startsWith('http')) return path;
        if (path.startsWith('/')) return path;
        return `${cleanApiUrl}/storage/${path}`;
    };

    const navItems = [
        { to: '/', label: 'Início', icon: Home, active: isActive('/') },
        { to: '/explore', label: 'Explorar', icon: Compass, active: isActive('/explore') },
        { to: '/agenda', label: 'Agenda', icon: Calendar, active: isActive('/agenda') },
        { to: '/profile', label: 'Perfil', icon: User, active: isActive('/profile') },
        ...(user?.is_admin
            ? [{ to: '/admin/dashboard', label: 'Admin', icon: ShieldCheck, active: location.pathname.startsWith('/admin') }]
            : []),
    ];

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 pb-20 md:pb-0">
            {/* Desktop Navbar (Hidden on Mobile) */}
            <nav className="hidden md:block bg-white/85 backdrop-blur-xl border-b border-slate-200/70 sticky top-0 z-50 transition-all duration-300">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo Area */}
                        <div className="flex-shrink-0 flex items-center gap-3">
                            <Link to="/" className="flex items-center gap-3.5 group">
                                <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 group-hover:scale-105 transition-transform duration-300 bg-slate-900 flex items-center justify-center">
                                    <img src="/logo.png" alt="Esportes7 Logo" className="w-full h-full object-contain" />
                                </div>
                                <div className="flex flex-col">
                                    <span translate="no" className="font-bold text-xl text-slate-900 tracking-tight leading-none group-hover:text-indigo-600 transition-colors">
                                        Esportes7
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-400 tracking-normal mt-1">
                                        Gestão & Eventos Esportivos
                                    </span>
                                </div>
                            </Link>
                        </div>

                        {/* Desktop Menu Links */}
                        <div className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60">
                            {navItems.map((item) => {
                                const IconComponent = item.icon;
                                return (
                                    <Link
                                        key={item.to}
                                        to={item.to}
                                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all duration-200 rounded-xl ${
                                            item.active
                                                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                        }`}
                                    >
                                        <IconComponent className="w-4 h-4" strokeWidth={item.active ? 2.4 : 2} />
                                        <span translate="no">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Action Button */}
                        <div className="flex items-center gap-3">
                            {!user ? (
                                <Link
                                    to="/login"
                                    className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-200 active:scale-95"
                                >
                                    Entrar
                                </Link>
                            ) : (
                                <Link
                                    to="/profile"
                                    className="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-white border border-slate-200/80 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all group active:scale-95"
                                >
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200/60 overflow-hidden">
                                        {(user as any).photo_url || (user as any).photo_path ? (
                                            <img
                                                src={getImageUrl((user as any).photo_url || (user as any).photo_path)}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || '')}&background=4f46e5&color=fff&bold=true`;
                                                }}
                                            />
                                        ) : (
                                            <User className="w-4 h-4 text-slate-500" />
                                        )}
                                    </div>
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-[11px] font-medium text-slate-400 mb-0.5">Olá,</span>
                                        <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors max-w-[120px] truncate">
                                            {user.name?.split(' ')[0]}
                                        </span>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Page Content */}
            <main className="pb-safe">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation (iOS Human Interface Guidelines compliant Tab Bar) */}
            <div
                className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 border-t border-slate-200/80 z-40 shadow-[0_-4px_24px_rgba(15,23,42,0.04)]"
                style={{
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    WebkitTransform: 'translateZ(0)',
                    transform: 'translateZ(0)',
                    isolation: 'isolate',
                    WebkitBackdropFilter: 'blur(16px)',
                    backdropFilter: 'blur(16px)',
                }}
            >
                <div className="flex justify-around items-center h-16 px-2">
                    {navItems.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`relative flex flex-col items-center justify-center h-full min-w-[64px] px-2 transition-colors duration-200 ${
                                    item.active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {item.active && (
                                    <div className="absolute top-0 w-7 h-0.5 bg-indigo-600 rounded-b-full" />
                                )}
                                <div className={`p-1 rounded-xl transition-transform duration-200 ${item.active ? 'scale-105' : ''}`}>
                                    <IconComponent className="w-[22px] h-[22px]" strokeWidth={item.active ? 2.4 : 1.9} />
                                </div>
                                <span
                                    translate="no"
                                    className={`text-[11px] leading-none mt-1 tracking-tight ${
                                        item.active ? 'font-semibold text-indigo-600' : 'font-medium text-slate-500'
                                    }`}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
