import { Bell, Menu, Search, LogOut, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Header() {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        signOut();
        navigate('/login');
    }

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <button className="lg:hidden text-gray-500 hover:text-gray-700">
                    <Menu className="w-6 h-6" />
                </button>
                <div className="relative hidden md:block">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar eventos, usuários..."
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-full bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white w-64 transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                <button
                    onClick={() => navigate('/home')}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full hover:bg-indigo-100 transition-colors"
                    title="Ver como usuário"
                >
                    <Eye className="w-3.5 h-3.5" />
                    Ver como Usuário
                </button>

                <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors hover:bg-gray-100 rounded-full">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <div className="w-px h-8 bg-gray-200 mx-1 hidden sm:block"></div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
                >
                    <span className="hidden sm:block">Sair</span>
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}
