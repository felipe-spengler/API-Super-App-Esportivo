import { Link, Outlet, useLocation } from 'react-router-dom';
import { Trophy, Home, User, CreditCard, Lock } from 'lucide-react';

export function PublicLayout() {
    const location = useLocation();

    // Helper to check active link
    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20 md:pb-0">
            {/* Desktop Navbar (Hidden on Mobile) */}
            <nav className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-8">
                            <Link to="/" className="flex items-center gap-2">
                                <div className="bg-indigo-600 p-2 rounded-lg">
                                    <Trophy className="w-6 h-6 text-white" />
                                </div>
                                <span className="font-bold text-xl text-gray-900 tracking-tight">AppEsportivo</span>
                            </Link>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-all shadow-md">
                                Área do Cliente / Admin
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Page Content */}
            <main>
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation (Visible only on Mobile) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 py-2 safe-area-pb">
                <div className="flex justify-around items-center">
                    <Link to="/" className={`flex flex-col items-center p-2 ${isActive('/') || isActive('/club-home') ? 'text-indigo-600' : 'text-gray-400'}`}>
                        <Home className="w-6 h-6" />
                        <span className="text-[10px] font-medium mt-1">Início</span>
                    </Link>

                    <Link to="/profile" className={`flex flex-col items-center p-2 ${isActive('/profile') ? 'text-indigo-600' : 'text-gray-400'}`}>
                        <User className="w-6 h-6" />
                        <span className="text-[10px] font-medium mt-1">Perfil</span>
                    </Link>

                    {/* Carteirinha Placeholder - só funciona se logado, mas aqui é mockup visual */}
                    <Link to="/wallet" className={`flex flex-col items-center p-2 ${isActive('/wallet') ? 'text-indigo-600' : 'text-gray-400'}`}>
                        <CreditCard className="w-6 h-6" />
                        <span className="text-[10px] font-medium mt-1">Carteira</span>
                    </Link>

                    <Link to="/login" className={`flex flex-col items-center p-2 ${isActive('/login') ? 'text-indigo-600' : 'text-gray-400'}`}>
                        <Lock className="w-6 h-6" />
                        <span className="text-[10px] font-medium mt-1">Admin</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
