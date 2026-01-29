
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ArrowLeft, Loader2, User } from 'lucide-react';
import api from '../services/api';

export function Register() {
    const navigate = useNavigate();
    const [step, setStep] = useState<'scan' | 'photo' | 'form'>('scan');
    const [loading, setLoading] = useState(false);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        cpf: '',
        birthDate: '',
        password: '',
        confirmPassword: ''
    });

    const handleBack = () => {
        if (step === 'photo') setStep('scan');
        else if (step === 'form') setStep('photo');
        else navigate('/login');
    }

    const handleScanComplete = () => {
        // Mock scan completion
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setFormData(prev => ({ ...prev, name: 'Usuário Identificado', cpf: '123.456.789-00', birthDate: '1995-05-20' }));
            setStep('photo');
        }, 1500);
    }

    const handlePhotoComplete = () => {
        setStep('form');
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        // Mock registration
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            navigate('/login');
        }, 1500);
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center">
                    <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full mr-2">
                        <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">Criar Conta</h1>
                        <p className="text-xs text-gray-500">Passo {step === 'scan' ? '1' : step === 'photo' ? '2' : '3'} de 3</p>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto">
                    {/* Step 1: Scan (Mock) */}
                    {step === 'scan' && (
                        <div className="text-center space-y-6">
                            <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Camera className="w-10 h-10" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Validação de Identidade</h2>
                                <p className="text-gray-500 mt-2 text-sm">Para sua segurança e correta categorização, precisamos validar seu documento (RG ou CNH).</p>
                            </div>

                            <div className="space-y-3">
                                <button onClick={handleScanComplete} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all">
                                    {loading ? <Loader2 className="animate-spin" /> : <Camera className="w-5 h-5" />}
                                    {loading ? 'Analisando...' : 'Escanear Documento'}
                                </button>
                                <button onClick={() => setStep('photo')} className="text-gray-400 text-sm hover:text-gray-600 font-medium">
                                    Pular validação (Manual)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Photo */}
                    {step === 'photo' && (
                        <div className="text-center space-y-6">
                            <div className="w-32 h-32 bg-gray-100 rounded-full mx-auto border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                                <User className="w-12 h-12 text-gray-300" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Sua Foto de Perfil</h2>
                                <p className="text-gray-500 mt-2 text-sm">Será usada em sua carteirinha digital e súmulas.</p>
                            </div>
                            <div className="space-y-3">
                                <button onClick={handlePhotoComplete} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg">
                                    <Upload className="w-5 h-5" />
                                    Escolher Foto
                                </button>
                                <button onClick={() => setStep('form')} className="text-gray-400 text-sm hover:text-gray-600 font-medium">
                                    Pular por enquanto
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Form */}
                    {step === 'form' && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">CPF</label>
                                    <input type="text" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Data Nasc.</label>
                                    <input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Senha</label>
                                <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg" required />
                            </div>
                            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl mt-4 shadow-lg shadow-green-600/20">
                                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Finalizar Cadastro'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
