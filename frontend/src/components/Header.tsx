import { Menu, LogOut, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
    onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    const { signOut } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        signOut();
        navigate('/login');
    }

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <div className="hidden lg:block">
                    {/* Placeholder para breadcrumbs ou título secundário no futuro */}
                </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full hover:bg-indigo-100 transition-colors"
                    title="Ver página inicial pública"
                >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Página Pública</span>
                </button>

                <div className="w-px h-8 bg-gray-200 mx-1"></div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
                >
                    <span className="hidden sm:block">Sair</span>
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}
