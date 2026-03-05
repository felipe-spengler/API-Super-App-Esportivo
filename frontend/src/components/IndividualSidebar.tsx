import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, BarChart3, Users, X, ShoppingBag, Key, Palette, Timer, Ticket, CreditCard, Layers } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';

function cn(...inputs: (string | undefined)[]) {
    return twMerge(clsx(inputs));
}

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    championshipId: string;
}

export function IndividualSidebar({ isOpen, onClose, championshipId }: SidebarProps) {
    const location = useLocation();
    const { user } = useAuth();

    const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

    const menuItems = [
        { label: 'Dashboard Evento', path: `/admin/individual/championships/${championshipId}`, icon: Home },
        { label: 'Atletas / Inscrições', path: `/admin/individual/championships/${championshipId}/athletes`, icon: Users },
        { label: 'Cronometragem', path: `/admin/individual/championships/${championshipId}/results`, icon: Timer },
        { label: 'Artes por Categoria', path: `/admin/individual/championships/${championshipId}/arts`, icon: Palette },
        { label: 'Financeiro (Asaas)', path: `/admin/individual/championships/${championshipId}/payments`, icon: CreditCard },
        { label: 'Categorias', path: `/admin/individual/championships/${championshipId}/categories`, icon: Layers },
        { label: 'Cupons', path: `/admin/individual/championships/${championshipId}/coupons`, icon: Ticket },
        { label: 'Produtos / Brindes', path: `/admin/products?championship_id=${championshipId}`, icon: ShoppingBag },
    ];

    return (
        <aside className={cn(
            "w-64 bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 h-full z-30 shadow-xl transition-transform duration-300 md:translate-x-0 border-r border-indigo-500/20",
            isOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            {/* Brand - Distinct color for Individual Area */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-indigo-500/20 bg-slate-950">
                <span className="text-lg font-bold uppercase tracking-wider text-emerald-400">
                    Individual <span className="text-white">Admin</span>
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
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 mb-4">Gestão do Evento</p>
                {menuItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => onClose()}
                        className={cn(
                            "flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 group relative",
                            isActive(item.path)
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30"
                                : "text-gray-400 hover:bg-slate-800 hover:text-white"
                        )}
                    >
                        <item.icon
                            strokeWidth={2}
                            className={cn(
                                "w-5 h-5 mr-3 transition-colors",
                                isActive(item.path) ? "text-white" : "text-gray-500 group-hover:text-emerald-300"
                            )}
                        />
                        <span>{item.label}</span>

                        {isActive(item.path) && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-300 rounded-r-full" />
                        )}
                    </Link>
                ))}

                <div className="pt-8 px-3">
                    <Link
                        to="/admin/championships"
                        className="flex items-center text-xs text-gray-500 hover:text-white transition-colors"
                    >
                        <Trophy className="w-4 h-4 mr-2" />
                        Sair do Evento
                    </Link>
                </div>
            </nav>

            {/* Footer / User Info */}
            <div className="p-4 border-t border-slate-800 bg-slate-950">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold shadow-inner ring-2 ring-slate-800">
                        {user?.name?.substring(0, 2).toUpperCase() || 'AD'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate text-left">{user?.name || 'Administrador'}</p>
                        <p className="text-[10px] text-gray-400 truncate uppercase tracking-tighter text-left">Área Individual</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
