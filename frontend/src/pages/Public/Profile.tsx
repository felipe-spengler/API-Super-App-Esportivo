
import { useState } from 'react';
import { ArrowLeft, User, Shield, CreditCard, LogOut, Shirt, Users, Trophy, Camera, X, Wand2, Loader2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export function Profile() {
    const navigate = useNavigate();
    const { user, signOut, updateUser } = useAuth();

    // Modal State
    const [showEdit, setShowEdit] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [removeBg, setRemoveBg] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-gray-100">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                        <User className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Faça Login</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        Para acessar seu perfil, gerenciar seus times e ver suas inscrições, você precisa estar conectado.
                    </p>
                    <div className="space-y-3">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            Entrar na Conta
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            className="w-full bg-white text-indigo-600 font-bold py-3.5 rounded-xl border-2 border-indigo-100 hover:bg-indigo-50 hover:border-indigo-200 active:scale-[0.98] transition-all"
                        >
                            Criar Nova Conta
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    const MENU_ITEMS = [
        { label: 'Meus Times', icon: Users, route: '/profile/teams', color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Minhas Inscrições', icon: Trophy, route: '/profile/inscriptions', color: 'text-yellow-600', bg: 'bg-yellow-100' },
        { label: 'Meus Pedidos', icon: Shirt, route: '/profile/orders', color: 'text-purple-600', bg: 'bg-purple-100' },
        { label: 'Carteirinha', icon: CreditCard, route: '/wallet', color: 'text-indigo-600', bg: 'bg-indigo-100' },
    ];

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    };

    const handleSavePhoto = async () => {
        if (!selectedFile) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('photo', selectedFile);

            // Send boolean as 1 or 0 string for FormData
            if (removeBg) {
                formData.append('remove_bg', '1');
            }

            const response = await api.post('/me/photo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update local user context if possible
            // Assuming API returns updated photo URL
            let newPhotoUrl = response.data.photo_nobg_url || response.data.photo_url;

            // Hack to force refresh if needed, but context update is better
            if (response.data.photo_path) {
                const updatedUser = { ...user, photo_url: response.data.photo_url, photo_path: response.data.photo_path };
                if (response.data.photo_nobg_url) {
                    updatedUser.photo_url = response.data.photo_nobg_url;
                    updatedUser.photo_path = response.data.photo_nobg_path;
                }
                updateUser(updatedUser);
            }
            alert('Foto atualizada com sucesso!');
            setShowEdit(false);
            // window.location.reload(); // Not needed with context update

        } catch (error) {
            console.error(error);
            alert('Erro ao enviar foto.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate('/')} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Meu Perfil</h1>
            </div>

            <div className="p-4 max-w-lg mx-auto space-y-6">

                {/* Profile Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="relative group">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                            {(user as any).photo_url ? (
                                <img src={(user as any).photo_url} className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-8 h-8 text-gray-400" />
                            )}
                        </div>
                        <button
                            onClick={() => setShowEdit(true)}
                            className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-1.5 rounded-full shadow-md active:scale-95"
                        >
                            <Camera className="w-3 h-3" />
                        </button>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
                        <div className="flex items-center text-xs text-gray-500 mt-0.5">
                            <Shield className="w-3 h-3 mr-1 text-emerald-500" />
                            {user.role}
                        </div>
                    </div>
                </div>

                {/* Menu Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Admin Link if Admin */}
                    {(user.is_admin || user.role === 'admin' || user.role === 'super_admin') && (
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="col-span-2 bg-gradient-to-r from-gray-900 to-gray-800 p-4 rounded-2xl shadow-lg border border-gray-700 flex flex-col items-center justify-center gap-3 active:scale-[0.98] py-6"
                        >
                            <div className="p-3 rounded-full bg-white/10 text-white">
                                <Shield className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-white text-sm">Painel Administrativo</span>
                        </button>
                    )}

                    {MENU_ITEMS.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={idx}
                                onClick={() => navigate(item.route)}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-all active:scale-[0.98] py-8"
                            >
                                <div className={`p-3 rounded-full ${item.bg} ${item.color}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-gray-700 text-sm">{item.label}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Settings & Logout */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <button
                        onClick={() => setShowEdit(true)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 text-left border-b border-gray-50"
                    >
                        <User className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-700 font-medium">Dados Pessoais & Foto</span>
                    </button>
                    <button onClick={() => navigate('/')} className="w-full p-4 flex items-center gap-3 hover:bg-red-50 text-left text-red-600">
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Sair da Conta</span>
                    </button>
                </div>

            </div>

            {/* Edit Photo Modal */}
            {showEdit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                        <button
                            onClick={() => setShowEdit(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 mb-6">Alterar Foto de Perfil</h3>

                        <div className="flex flex-col items-center gap-6">
                            {/* Preview Circle */}
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full bg-gray-100 border-4 border-indigo-50 shadow-inner flex items-center justify-center overflow-hidden">
                                    {previewUrl ? (
                                        <img src={previewUrl} className="w-full h-full object-cover" />
                                    ) : (user as any).photo_url ? (
                                        <img src={(user as any).photo_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-12 h-12 text-gray-300" />
                                    )}
                                </div>
                                <label
                                    htmlFor="photo-upload"
                                    className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2.5 rounded-full shadow-lg cursor-pointer hover:bg-indigo-700 active:scale-90 transition-transform"
                                >
                                    <Camera className="w-4 h-4" />
                                </label>
                                <input
                                    id="photo-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                            </div>

                            {/* Options */}
                            <div className="w-full space-y-4">
                                <label className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${removeBg ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${removeBg ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}>
                                        {removeBg && <Wand2 className="w-3 h-3 text-white" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={removeBg}
                                        onChange={() => setRemoveBg(!removeBg)}
                                    />
                                    <div className="flex-1">
                                        <span className={`font-bold text-sm block ${removeBg ? 'text-indigo-900' : 'text-gray-800'}`}>
                                            Remover Fundo com IA
                                        </span>
                                        <span className="text-xs text-gray-500 mt-1 block">
                                            Recorta automaticamente apenas o seu rosto/corpo, deixando o fundo transparente. Ideal para as artes do jogo!
                                        </span>
                                    </div>
                                </label>

                                <button
                                    onClick={handleSavePhoto}
                                    disabled={uploading || !selectedFile}
                                    className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processando...
                                        </>
                                    ) : (
                                        'Salvar Nova Foto'
                                    )}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}
