
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ArrowLeft, Loader2, User, Plus, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

export function Register() {
    const navigate = useNavigate();
    const [step, setStep] = useState<'scan' | 'photo' | 'form'>('scan');
    const [loading, setLoading] = useState(false);

    // Photo State
    const [photos, setPhotos] = useState<File[]>([]);
    const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        cpf: '', // CPF is string in backend validation
        birthDate: '',
        documentNumber: '',
        password: '',
        confirmPassword: ''
    });

    const handleBack = () => {
        if (step === 'photo') setStep('scan');
        else if (step === 'form') setStep('photo');
        else navigate('/login');
    }

    const handleScanComplete = () => {
        // Mock scan completion for now
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setFormData(prev => ({
                ...prev,
                name: 'Usuário Identificado',
                cpf: '123.456.789-00',
                birthDate: '1995-05-20',
                documentNumber: '12.345.678-9'
            }));
            setStep('photo');
            toast.success("Documento lido com sucesso!");
        }, 1500);
    }

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);

            // Validate limits (max 3 total)
            if (photos.length + newFiles.length > 3) {
                toast.error("Você pode adicionar no máximo 3 fotos.");
                return;
            }

            const newPreviews = newFiles.map(file => URL.createObjectURL(file));

            setPhotos(prev => [...prev, ...newFiles]);
            setPhotoPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const triggerFileSelect = () => {
        if (photos.length >= 3) {
            toast.error("Limite de 3 fotos atingido.");
            return;
        }
        fileInputRef.current?.click();
    };

    const handleNextToForm = () => {
        // Optional: Require at least one photo?
        // if (photos.length === 0) {
        //     toast.error("Por favor, adicione pelo menos uma foto de perfil.");
        //     return;
        // }
        setStep('form');
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error("As senhas não coincidem.");
            return;
        }

        setLoading(true);

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('email', formData.email);
            data.append('password', formData.password);
            data.append('password_confirmation', formData.confirmPassword);

            // Handle optional fields
            if (formData.cpf) data.append('cpf', formData.cpf);
            if (formData.birthDate) data.append('birth_date', formData.birthDate);
            if (formData.documentNumber) data.append('document_number', formData.documentNumber);

            // Append photos
            photos.forEach((photo) => {
                data.append('photos[]', photo);
            });

            const response = await api.post('/register', data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Navigation with success state
            navigate('/login', {
                state: {
                    successMessage: 'Cadastro realizado com sucesso! Faça login para continuar.'
                }
            });

        } catch (error: any) {
            console.error(error);
            if (error.response && error.response.data && error.response.data.errors) {
                const errors = error.response.data.errors;
                // Show first error message
                const firstError = Object.values(errors)[0] as string[];
                toast.error(firstError[0] || "Erro na validação dos dados.");
            } else if (error.response && error.response.data && error.response.data.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error("Ocorreu um erro ao realizar o cadastro. Tente novamente.");
            }
        } finally {
            setLoading(false);
        }
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

                <div className="p-8 overflow-y-auto custom-scrollbar">
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
                            <div className="flex justify-center gap-4 flex-wrap">
                                {/* Main/Existing Photos */}
                                {photoPreviews.map((src, index) => (
                                    <div key={index} className="relative w-28 h-28">
                                        <img src={src} alt={`Preview ${index}`} className="w-full h-full object-cover rounded-xl shadow-md border-2 border-white" />
                                        <button
                                            onClick={() => removePhoto(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        {index === 0 && (
                                            <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] py-1 rounded-b-xl">Principal</span>
                                        )}
                                    </div>
                                ))}

                                {/* Add Button */}
                                {photos.length < 3 && (
                                    <button
                                        onClick={triggerFileSelect}
                                        className="w-28 h-28 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                                    >
                                        <Plus className="w-8 h-8 mb-1" />
                                        <span className="text-xs font-medium">Add Foto</span>
                                    </button>
                                )}
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={handlePhotoSelect}
                            />

                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Suas Fotos de Perfil</h2>
                                <p className="text-gray-500 mt-2 text-sm">Adicione até 3 fotos. A primeira será usada em sua carteirinha digital e súmulas.</p>
                            </div>

                            <div className="space-y-3">
                                <button onClick={triggerFileSelect} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg">
                                    <Upload className="w-5 h-5" />
                                    Selecionar Fotos
                                </button>
                                <button onClick={handleNextToForm} className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-50">
                                    Continuar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Form */}
                    {step === 'form' && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">CPF</label>
                                    <input type="text" value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="000.000.000-00" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Data Nasc.</label>
                                    <input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Senha</label>
                                    <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required minLength={6} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Confirmar</label>
                                    <input type="password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required minLength={6} />
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl mt-4 shadow-lg shadow-green-600/20 disabled:opacity-70 disabled:cursor-not-allowed">
                                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Finalizar Cadastro'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
