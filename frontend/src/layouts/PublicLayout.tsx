import { Link, Outlet, useLocation } from 'react-router-dom';
import { Trophy, Home, User, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function PublicLayout() {
    const location = useLocation();
    const { user } = useAuth();

    // Helper to check active link
    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20 md:pb-0">
            {/* Desktop Navbar (Hidden on Mobile) */}
            <nav className="hidden md:block bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo Area */}
                        <div className="flex-shrink-0 flex items-center gap-3 group cursor-pointer">
                            <Link to="/" className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform duration-300">
                                    <Trophy className="w-6 h-6 text-white" />
                                </div>
                                <span translate="no" className="font-bold text-xl text-gray-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                                    Esportes7
                                </span>
                            </Link>
                        </div>

                        {/* Desktop Menu Links - Centered */}
                        <div className="hidden md:flex items-center gap-8">
                            <Link to="/" className={`relative px-2 py-1 text-sm font-semibold transition-colors duration-300 group ${isActive('/') ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}>
                                <span translate="no">Início</span>
                                <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 transform origin-left transition-transform duration-300 ${isActive('/') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                            </Link>

                            <Link to="/explore" className={`relative px-2 py-1 text-sm font-semibold transition-colors duration-300 group ${isActive('/explore') ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}>
                                <span translate="no">Explorar</span>
                                <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 transform origin-left transition-transform duration-300 ${isActive('/explore') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                            </Link>

                            <Link to="/profile" className={`relative px-2 py-1 text-sm font-semibold transition-colors duration-300 group ${isActive('/profile') ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}>
                                <span translate="no">Perfil</span>
                                <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 transform origin-left transition-transform duration-300 ${isActive('/profile') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                            </Link>

                            {user?.is_admin && (
                                <Link to="/admin" className={`relative px-2 py-1 text-sm font-semibold transition-colors duration-300 group ${isActive('/admin') ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'}`}>
                                    <span translate="no">Admin</span>
                                    <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 transform origin-left transition-transform duration-300 ${isActive('/admin') ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
                                </Link>
                            )}
                        </div>

                        {/* Action Buuton */}
                        <div className="flex items-center gap-4">
                            {!user ? (
                                <Link to="/login" className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-full transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:scale-105 active:scale-95">
                                    Entrar / Cadastrar
                                </Link>
                            ) : (
                                <Link to="/profile" className="flex items-center gap-3 pl-2 pr-4 py-1.5 bg-white border border-gray-200 rounded-full hover:border-indigo-200 hover:shadow-md transition-all group">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border border-white shadow-sm overflow-hidden">
                                        {(user as any).photo_url ? (
                                            <img src={(user as any).photo_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-4 h-4 text-gray-500" />
                                        )}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 max-w-[100px] truncate">
                                        {user.name?.split(' ')[0]}
                                    </span>
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
                className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 border-t border-gray-200 z-[9999]"
                style={{
                    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                    WebkitTransform: 'translateZ(0)',
                    transform: 'translateZ(0)',
                    isolation: 'isolate',
                    WebkitBackdropFilter: 'blur(8px)',
                    backdropFilter: 'blur(8px)',
                }}
            >
                <div className="flex justify-around items-center py-2">
                    <Link to="/" className={`flex flex-col items-center p-2 min-w-[60px] ${isActive('/') || isActive('/club-home') ? 'text-indigo-600' : 'text-gray-400'}`}>
                        <Home className="w-6 h-6" />
                        <span translate="no" className="text-[10px] font-semibold mt-1 leading-none">Início</span>
                    </Link>

                    <Link to="/explore" className={`flex flex-col items-center p-2 min-w-[60px] ${isActive('/explore') ? 'text-indigo-600' : 'text-gray-400'}`}>
                        <Trophy className="w-6 h-6" />
                        <span translate="no" className="text-[10px] font-semibold mt-1 leading-none">Explorar</span>
                    </Link>

                    <Link to="/profile" className={`flex flex-col items-center p-2 min-w-[60px] ${isActive('/profile') ? 'text-indigo-600' : 'text-gray-400'}`}>
                        <User className="w-6 h-6" />
                        <span translate="no" className="text-[10px] font-semibold mt-1 leading-none">Perfil</span>
                    </Link>

                    {/* Admin link - only show if user is admin */}
                    {user?.is_admin && (
                        <Link to="/admin" className={`flex flex-col items-center p-2 min-w-[60px] ${isActive('/admin') ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <Lock className="w-6 h-6" />
                            <span translate="no" className="text-[10px] font-semibold mt-1 leading-none">Admin</span>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
