import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, AlertTriangle, CheckCircle, Mail, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

export function DeletarConta() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Info, 2: Form (se não logado) ou Confirmação (se logado), 3: Success

    const [identifier, setIdentifier] = useState('');
    const [reason, setReason] = useState('');

    const handleDelete = async () => {
        if (!window.confirm('Tem certeza absoluta? Esta ação não pode ser desfeita.')) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const apiUrl = import.meta.env.VITE_API_URL;

            await axios.delete(`${apiUrl}/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Sua conta foi anonimizada com sucesso.');
            setStep(3);
            setTimeout(() => {
                signOut();
                navigate('/');
            }, 5000);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao excluir conta.');
        } finally {
            setLoading(false);
        }
    };

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const apiUrl = import.meta.env.VITE_API_URL;
            await axios.post(`${apiUrl}/public/request-deletion`, {
                identifier,
                reason
            });
            setStep(3);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao enviar solicitação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            <div className="bg-white/90 backdrop-blur-xl p-6 pt-10 shadow-sm flex items-center border-b border-slate-100">
                <button onClick={() => navigate(-1)} className="p-3 mr-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all border border-slate-100">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Exclusão de Conta</h1>
            </div>

            <div className="p-6 max-w-lg mx-auto mt-8">
                {step === 1 && (
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
                        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto">
                            <Trash2 className="w-10 h-10" />
                        </div>

                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-black text-slate-900 uppercase">Solicitar Exclusão</h2>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                De acordo com as políticas da Google Play, você tem o direito de solicitar a exclusão de sua conta e dos dados pessoais associados a ela.
                            </p>
                        </div>

                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-4">
                            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                            <div className="text-xs text-amber-800 leading-tight">
                                <strong>Atenção:</strong> Seus dados pessoais (Email, CPF, Telefone, Fotos) serão permanentemente excluídos. O seu nome permanecerá no histórico de partidas por integridade dos dados esportivos.
                            </div>
                        </div>

                        {user ? (
                            <button
                                onClick={() => setStep(2)}
                                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-slate-800 transition-all uppercase tracking-widest text-sm"
                            >
                                Continuar para Exclusão
                            </button>
                        ) : (
                            <button
                                onClick={() => setStep(2)}
                                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-slate-800 transition-all uppercase tracking-widest text-sm"
                            >
                                Preencher Formulário
                            </button>
                        )}

                        <p className="text-center text-[10px] text-slate-400 uppercase font-bold">
                            Esta ação é irreversível.
                        </p>
                    </div>
                )}

                {step === 2 && user && (
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
                        <h2 className="text-xl font-black text-slate-900 text-center uppercase">Confirme sua Identidade</h2>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                <User className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Usuário Logado</p>
                                <p className="text-sm font-black text-slate-900 leading-none">{user.name}</p>
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            onClick={handleDelete}
                            className="w-full bg-red-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-red-700 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm disabled:opacity-50"
                        >
                            {loading ? 'Processando...' : <><Trash2 className="w-5 h-5" /> Excluir Permanentemente</>}
                        </button>

                        <button
                            onClick={() => setStep(1)}
                            className="w-full text-slate-400 font-bold text-sm uppercase"
                        >
                            Voltar
                        </button>
                    </div>
                )}

                {step === 2 && !user && (
                    <form onSubmit={handleRequest} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
                        <h2 className="text-xl font-black text-slate-900 text-center uppercase tracking-tight">Solicitação via Email/CPF</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail ou CPF da Conta</label>
                                <div className="relative mt-1">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                    <input
                                        required
                                        type="text"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="Seu email ou CPF cadastrado"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Motivo (Opcional)</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm min-h-[100px] outline-none"
                                    placeholder="Conte por que deseja sair..."
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-slate-800 transition-all uppercase tracking-widest text-sm disabled:opacity-50"
                        >
                            {loading ? 'Enviando...' : 'Enviar Solicitação'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full text-slate-400 font-bold text-sm uppercase"
                        >
                            Voltar
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 text-center space-y-6 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto">
                            <CheckCircle className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase">Solicitação Recebida</h2>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            {user
                                ? 'Sua conta foi processada com sucesso. Você será desconectado em instantes.'
                                : 'Recebemos seu pedido. Processaremos a exclusão dos seus dados pessoais em até 48 horas úteis.'
                            }
                        </p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest text-sm"
                        >
                            Voltar para o Início
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
