
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, Send, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/forgot-password', { email });
            setSubmitted(true);
            toast.success('Instruções enviadas para seu e-mail!');
        } catch (err: any) {
            const message = err.response?.data?.message || 'Erro ao processar solicitação.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 font-sans">
                <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 bg-green-100 text-green-600">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifique seu e-mail</h1>
                    <p className="text-gray-500 mb-8">
                        Enviamos um código de recuperação para <strong>{email}</strong>.
                        Verifique sua caixa de entrada e spam.
                    </p>

                    <button
                        onClick={() => navigate('/reset-password', { state: { email } })}
                        className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 mb-4"
                    >
                        Inserir Código agora
                    </button>

                    <Link to="/login" className="text-sm text-gray-500 hover:text-indigo-600 font-medium">
                        Voltar para o Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4 font-sans">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8">

                <button
                    onClick={() => navigate('/login')}
                    className="mb-4 flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Voltar</span>
                </button>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-indigo-100 text-indigo-600">
                        <Mail className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Recuperar Senha</h1>
                    <p className="text-gray-500 mt-2 text-sm text-balance">
                        Insira seu e-mail e enviaremos um código para você criar uma nova senha.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 block ml-1">E-mail cadastrado</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-opacity-50 outline-none transition-all focus:border-transparent font-medium focus:ring-indigo-500"
                                placeholder="exemplo@email.com"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full text-white font-bold py-4 px-4 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <span>Enviar código</span>
                                <Send className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
