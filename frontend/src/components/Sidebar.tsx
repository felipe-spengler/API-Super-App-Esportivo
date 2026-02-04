import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, List, BarChart3, Settings, Users, UserPlus, X, Building2, Settings2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';

function cn(...inputs: (string | undefined)[]) {
    return twMerge(clsx(inputs));
}

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const location = useLocation();
    const { user } = useAuth();
    const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

    const menuItems = [
        { label: 'Dashboard', path: '/admin', icon: Home },
        { label: 'Campeonatos', path: '/admin/championships', icon: Trophy },
        { label: 'Partidas', path: '/admin/matches', icon: List },
        { label: 'Equipes', path: '/admin/teams', icon: Users },
        { label: 'Jogadores', path: '/admin/players', icon: UserPlus },
        { label: 'Relatórios', path: '/admin/reports', icon: BarChart3 },
        { label: 'Configurações', path: '/admin/settings', icon: Settings },
    ];

    // Super Admin Items
    if (user?.is_admin && !user.club_id) {
        menuItems.push(
            { label: 'Gerenciar Clubes', path: '/admin/clubs-manage', icon: Building2 }, // Building2 needs import
            { label: 'Sistema', path: '/admin/system-settings', icon: Settings2 } // Settings2 needs import
        );
    }

    return (
        <aside className={cn(
            "w-64 bg-gray-900 text-white min-h-screen flex flex-col fixed left-0 top-0 h-full z-30 shadow-xl transition-transform duration-300 md:translate-x-0",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            {/* Brand */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800 bg-gray-950">
                <span className="text-lg font-bold uppercase tracking-wider text-indigo-400">
                    Admin <span className="text-white">Esportes7</span>
                </span>
                <button
                    onClick={onClose}
                    className="md:hidden p-2 text-gray-400 hover:text-white"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => onClose()}
                        className={cn(
                            "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative",
                            isActive(item.path)
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                                : "text-gray-400 hover:bg-gray-800 hover:text-white"
                        )}
                    >
                        <item.icon
                            strokeWidth={2}
                            className={cn(
                                "w-5 h-5 mr-3 transition-colors",
                                isActive(item.path) ? "text-white" : "text-gray-500 group-hover:text-indigo-300"
                            )}
                        />
                        <span>{item.label}</span>

                        {isActive(item.path) && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-300 rounded-r-full" />
                        )}
                    </Link>
                ))}
            </nav>

            {/* Footer / User Info */}
            <div className="p-4 border-t border-gray-800 bg-gray-950">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold shadow-inner ring-2 ring-gray-800">
                        {user?.name?.substring(0, 2).toUpperCase() || 'AD'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{user?.name || 'Administrador'}</p>
                        <p className="text-[10px] text-gray-500 truncate uppercase tracking-tighter">{user?.email || 'admin@sistema.com'}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
