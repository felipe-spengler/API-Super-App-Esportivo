
import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, KeyRound } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export function ResetPassword() {
    const location = useLocation();
    const navigate = useNavigate();

    const [email, setEmail] = useState(location.state?.email || '');
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (password !== passwordConfirmation) {
            return toast.error('As senhas não coincidem!');
        }

        if (token.length !== 6) {
            return toast.error('O código deve ter 6 dígitos!');
        }

        setLoading(true);

        try {
            await api.post('/reset-password', {
                email,
                token,
                password,
                password_confirmation: passwordConfirmation
            });
            setSuccess(true);
            toast.success('Senha alterada com sucesso!');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            const message = err.response?.data?.message || 'Erro ao redefinir senha. Verifique o código e tente novamente.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 font-sans">
                <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 bg-green-100 text-green-600">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Tudo pronto!</h1>
                    <p className="text-gray-500 mb-8">
                        Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.
                    </p>
                    <Link
                        to="/login"
                        className="w-full inline-block bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg"
                    >
                        Fazer Login Agora
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 font-sans">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8">

                <button
                    onClick={() => navigate('/forgot-password')}
                    className="mb-4 flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Voltar</span>
                </button>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-indigo-100 text-indigo-600">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Nova Senha</h1>
                    <p className="text-gray-500 mt-2 text-sm">
                        Insira o código enviado para seu e-mail e escolha sua nova senha.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 block ml-1">E-mail</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-opacity-50 outline-none transition-all font-medium focus:ring-indigo-500"
                            placeholder="exemplo@email.com"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 block ml-1">Código de 6 dígitos</label>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={token}
                                onChange={e => setToken(e.target.value.replace(/\D/g, '').substring(0, 6))}
                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-opacity-50 outline-none transition-all font-bold tracking-[0.5em] text-center text-xl focus:ring-indigo-500"
                                placeholder="000000"
                                maxLength={6}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 block ml-1">Nova Senha</label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-opacity-50 outline-none transition-all font-medium focus:ring-indigo-500"
                                placeholder="Mínimo 6 caracteres"
                                minLength={6}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 block ml-1">Confirmar Nova Senha</label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="password"
                                value={passwordConfirmation}
                                onChange={e => setPasswordConfirmation(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-opacity-50 outline-none transition-all font-medium focus:ring-indigo-500"
                                placeholder="Repita a senha"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full text-white font-bold py-4 px-4 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20 mt-4"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <span>Redefinir Senha</span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
