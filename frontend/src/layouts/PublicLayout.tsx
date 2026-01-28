import { Link, Outlet } from 'react-router-dom';
import { Trophy, LogIn, Menu, X, Search } from 'lucide-react';
import { useState } from 'react';

export function PublicLayout() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">

                        {/* Logo & Desktop Nav */}
                        <div className="flex items-center gap-8">
                            <Link to="/" className="flex items-center gap-2">
                                <div className="bg-indigo-600 p-2 rounded-lg">
                                    <Trophy className="w-6 h-6 text-white" />
                                </div>
                                <span className="font-bold text-xl text-gray-900 tracking-tight">AppEsportivo</span>
                            </Link>

                            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
                                <Link to="/" className="hover:text-indigo-600 transition-colors">Início</Link>
                                <Link to="/explore" className="hover:text-indigo-600 transition-colors">Explorar</Link>
                                <Link to="/rankings" className="hover:text-indigo-600 transition-colors">Rankings</Link>
                            </div>
                        </div>

                        {/* Search & Actions */}
                        <div className="hidden md:flex items-center gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar eventos..."
                                    className="pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-full text-sm transition-all outline-none w-64"
                                />
                            </div>
                            <div className="h-6 w-px bg-gray-200"></div>
                            <Link
                                to="/login"
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                            >
                                <LogIn className="w-4 h-4" />
                                Área do Organizador
                            </Link>
                            <Link
                                to="/login?role=athlete"
                                className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-transform active:scale-95 shadow-md hover:shadow-lg"
                            >
                                Entrar como Atleta
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="flex items-center md:hidden">
                            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-gray-600">
                                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 p-4 space-y-4 shadow-xl">
                        <Link to="/" className="block px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg">Início</Link>
                        <Link to="/explore" className="block px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg">Explorar</Link>
                        <Link to="/rankings" className="block px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg">Rankings</Link>
                        <hr />
                        <Link to="/login" className="block px-4 py-2 text-indigo-600 font-bold">Sou Organizador</Link>
                        <Link to="/login?role=athlete" className="block px-4 py-2 bg-indigo-600 text-center text-white font-bold rounded-lg shadow">Sou Atleta</Link>
                    </div>
                )}
            </nav>

            {/* Page Content */}
            <main>
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-20 py-12">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-gray-500 mb-4">© 2026 AppEsportivo - Todos os direitos reservados.</p>
                    <div className="flex justify-center gap-8 text-sm font-medium text-gray-400">
                        <a href="#" className="hover:text-gray-900">Termos</a>
                        <a href="#" className="hover:text-gray-900">Privacidade</a>
                        <a href="#" className="hover:text-gray-900">Suporte</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
