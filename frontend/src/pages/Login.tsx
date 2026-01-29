
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Loader2, User, Trophy } from 'lucide-react';

export function Login() {
    const [loginType, setLoginType] = useState<'admin' | 'athlete'>('admin');

    // Auth States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { signIn } = useAuth(); // Assuming signIn handles both or just admin for now
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Mock Athlete Login for now until backend supports it fully via verify
            if (loginType === 'athlete') {
                // Simulate delay
                await new Promise(r => setTimeout(r, 1000));
                // TODO: Store token
                navigate('/profile'); // Redirect to profile
            } else {
                await signIn(email, password);
                navigate('/admin');
            }
        } catch (err: any) {
            console.error(err);
            setError('Falha no login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 font-sans">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">

                {/* Tabs Switcher */}
                <div className="bg-gray-100 p-1.5 flex gap-1 rounded-t-3xl border-b border-gray-200">
                    <button
                        onClick={() => setLoginType('admin')}
                        className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${loginType === 'admin' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:bg-white/50'}`}
                    >
                        <Lock className="w-4 h-4" />
                        Admin / Organização
                    </button>
                    <button
                        onClick={() => setLoginType('athlete')}
                        className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${loginType === 'athlete' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:bg-white/50'}`}
                    >
                        <Trophy className="w-4 h-4" />
                        Área do Atleta
                    </button>
                </div>

                <div className="p-8 pt-6">
                    <div className="text-center mb-8">
                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${loginType === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                            {loginType === 'admin' ? <Lock className="w-8 h-8" /> : <User className="w-8 h-8" />}
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {loginType === 'admin' ? 'Portal da Organização' : 'Portal do Atleta'}
                        </h1>
                        <p className="text-gray-500 mt-2 text-sm">
                            {loginType === 'admin' ? 'Gerencie campeonatos e súmulas' : 'Acompanhe seus jogos e inscrições'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 block ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent font-medium
                                    focus:ring-indigo-500" // Dynamic color could be nice
                                    placeholder="seu@email.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-bold text-gray-700 block">Senha</label>
                                <a href="#" className="text-xs text-indigo-600 font-bold hover:underline">Esqueceu?</a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent font-medium focus:ring-indigo-500"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full text-white font-bold py-4 px-4 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed
                                ${loginType === 'admin' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'}
                            `}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Entrar
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {loginType === 'athlete' && (
                        <div className="mt-8 text-center">
                            <p className="text-gray-500 text-sm">
                                Não tem uma conta?{' '}
                                <Link to="/register" className="text-emerald-600 font-bold hover:underline">
                                    Cadastre-se agora
                                </Link>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
