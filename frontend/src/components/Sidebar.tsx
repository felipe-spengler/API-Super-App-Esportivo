import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, List, BarChart3, Settings, Users, UserPlus } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined)[]) {
    return twMerge(clsx(inputs));
}

export function Sidebar() {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

    const menuItems = [
        { label: 'Dashboard', path: '/admin', icon: Home },
        { label: 'Campeonatos', path: '/admin/championships', icon: Trophy },
        { label: 'Partidas', path: '/admin/matches', icon: List },
        { label: 'Equipes', path: '/admin/teams', icon: Users },
        { label: 'Jogadores', path: '/admin/players', icon: UserPlus }, // UserPlus usado como ícone de jogador individual
        { label: 'Relatórios', path: '/admin/reports', icon: BarChart3 },
        { label: 'Configurações', path: '/admin/settings', icon: Settings },
    ];

    return (
        <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col fixed left-0 top-0 h-full z-30 shadow-xl">
            {/* Brand */}
            <div className="h-16 flex items-center justify-center border-b border-gray-800 bg-gray-950">
                <span className="text-lg font-bold uppercase tracking-wider text-indigo-400">
                    Admin <span className="text-white">Esportivo</span>
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
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

                        {/* Active Indicator Strip */}
                        {isActive(item.path) && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-300 rounded-r-full" />
                        )}
                    </Link>
                ))}
            </nav>

            {/* Footer / User Info */}
            <div className="p-4 border-t border-gray-800 bg-gray-950">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
                        JS
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">João Silva</p>
                        <p className="text-xs text-gray-500 truncate">joao@admin.com</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
