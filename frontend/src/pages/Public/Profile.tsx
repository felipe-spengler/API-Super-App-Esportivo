
import { useState, useRef } from 'react';
import { ArrowLeft, User, Shield, CreditCard, LogOut, Shirt, Users, Trophy, Camera, X, Wand2, Loader2, Upload, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export function Profile() {
    const navigate = useNavigate();
    const { user, signOut, updateUser } = useAuth();

    // Modal State
    const [showEdit, setShowEdit] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [debugMode, setDebugMode] = useState(true); // Temporary Debug Toggle
    const uploadingRef = useRef(false);
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

    const handleSavePhoto = async (file?: File, index: number = 0) => {
        if (uploadingRef.current) return;

        // If file is passed, use it. Otherwise, use selectedFile (legacy/fallback if needed)
        // In the new UI, we always pass file.
        const fileToUpload = file || selectedFile;
        // Skip check if we want to allow removing? But here it is upload.
        if (!fileToUpload) return;

        setUploading(true);
        uploadingRef.current = true;

        try {
            const formData = new FormData();
            formData.append('photo', fileToUpload);
            formData.append('index', index.toString());

            // Send boolean as 1 or 0 string for FormData
            if (removeBg) {
                formData.append('remove_bg', '1');
            }

            const response = await api.post('/me/photo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000 // 5 minutes timeout for IA processing
            });

            console.log('Upload response:', response.data);

            // Update local user context
            // API now filters through uploadPlayerPhoto -> returns { ..., photos: [...] }
            if (response.data.photos) {
                // Construct URL logic similar to SystemSettings to avoid proxy/backend URL issues
                let newPhotoUrl = '';
                const path = response.data.photo_nobg_path || response.data.photo_path;

                if (path) {
                    const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
                    // Ensure no double slash if path starts with /
                    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
                    newPhotoUrl = `${baseUrl}/storage/${cleanPath}`;
                } else {
                    // Fallback to backend URL
                    newPhotoUrl = response.data.photo_nobg_url || response.data.photo_url || '';
                }

                console.log('Selected New URL (Frontend Constructed):', newPhotoUrl);

                if (response.data.ai_error) {
                    console.warn('AI Error:', response.data.ai_error);
                    alert(`Atenção: A foto foi salva, mas houve um erro ao remover o fundo: ${response.data.ai_error}`);
                    // Fallback if AI failed
                    if (response.data.photo_path) {
                        const baseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
                        const cleanPath = response.data.photo_path.startsWith('/') ? response.data.photo_path.substring(1) : response.data.photo_path;
                        newPhotoUrl = `${baseUrl}/storage/${cleanPath}`;
                    } else {
                        newPhotoUrl = response.data.photo_url;
                    }
                }

                // Create a copy of current photos
                const currentPhotos = [...((user as any).photo_urls || [])];

                // Ensure size
                while (currentPhotos.length <= index) currentPhotos.push('');

                // Update specific slot
                if (newPhotoUrl) {
                    currentPhotos[index] = newPhotoUrl;
                }

                console.log('Current Photos (After):', currentPhotos);

                const updatedUser = {
                    ...user,
                    photo_urls: currentPhotos,
                    // Update main photo if index 0
                    ...(index === 0 ? { photo_url: newPhotoUrl, photo_path: response.data.photo_path } : {})
                };

                console.log('Updating User Context:', updatedUser);

                updateUser(updatedUser);
            } else {
                // Fallback for old response type? 
                // If success, just force reload or minor update
                // But we should try to support the new multiple photos
            }

            // alert('Foto atualizada com sucesso!');
            // setShowEdit(false); // Don't close, allow uploading more
        } catch (error: any) {
            console.error(error);
            if (error.code === 'ECONNABORTED') {
                alert('A remoção de fundo está demorando muito. A operação pode ter sido concluída no servidor, mas a resposta não chegou a tempo.');
            } else {
                alert('Erro ao enviar foto.');
            }
        } finally {
            setUploading(false);
            uploadingRef.current = false;
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
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setShowEdit(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Suas Fotos de Perfil</h3>
                            <button
                                onClick={() => setDebugMode(!debugMode)}
                                className={`text-xs px-2 py-1 rounded border ${debugMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-500'}`}
                            >
                                {debugMode ? 'Modo Debug ATIVO' : 'Ativar Debug'}
                            </button>
                        </div>

                        {debugMode ? (
                            <TestUploadEmbed user={user} />
                        ) : (
                            <div className="space-y-6">

                                {/* Remove Background Option */}
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
                                            Recorta automaticamente apenas o seu rosto/corpo.
                                        </span>
                                    </div>
                                </label>

                                {/* 3 Slots */}
                                <div className="flex gap-4 justify-center flex-wrap">
                                    {[0, 1, 2].map(index => {
                                        let currentUrl = null;
                                        if ((user as any).photo_urls && (user as any).photo_urls[index]) {
                                            currentUrl = (user as any).photo_urls[index];
                                        } else if (index === 0 && (user as any).photo_url) {
                                            currentUrl = (user as any).photo_url;
                                        }

                                        return (
                                            <div key={index} className="relative w-28 h-28 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-indigo-400 transition-colors group">
                                                {currentUrl ? (
                                                    <>
                                                        <img src={currentUrl} className="w-full h-full object-cover" />
                                                        {uploading && (
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <label className="cursor-pointer p-2 bg-white rounded-full hover:bg-gray-100 shadow-lg active:scale-95 transition-transform">
                                                                <Camera className="w-4 h-4 text-gray-700" />
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept="image/*"
                                                                    disabled={uploading}
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) handleSavePhoto(file, index);
                                                                    }}
                                                                />
                                                            </label>
                                                        </div>
                                                        {index === 0 && <span className="absolute bottom-0 left-0 right-0 bg-indigo-600 text-white text-[10px] text-center py-0.5">Principal</span>}
                                                    </>
                                                ) : (
                                                    <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-indigo-600">
                                                        {uploading ? (
                                                            <Loader2 className="w-6 h-6 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Plus className="w-6 h-6 mb-1" />
                                                                <span className="text-[10px] uppercase font-bold">Adicionar</span>
                                                            </>
                                                        )}
                                                        <input
                                                            type="file"
                                                            className="hidden"
                                                            accept="image/*"
                                                            disabled={uploading}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleSavePhoto(file, index);
                                                            }}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                <p className="text-xs text-center text-gray-500">
                                    A foto "Principal" será usada na sua carteirinha e perfil público.
                                </p>

                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    )
}

function TestUploadEmbed({ user }: { user: any }) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [removeBg, setRemoveBg] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);

    const addLog = (msg: string, data?: any) => {
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, data }]);
    };

    const handleUpload = async () => {
        if (!file) return alert('Selecione um arquivo');
        setLoading(true);
        setLogs([]);
        addLog('Iniciando upload...');

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('index', '0'); // Forcing index 0 for test

        if (removeBg) {
            formData.append('remove_bg', '1');
            addLog('Flag remove_bg=1 adicionada');
        }

        const endpoint = '/me/photo';
        addLog(`Enviando para ${endpoint}...`);

        const startTime = Date.now();

        try {
            const response = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000 // 5 min
            });
            const duration = (Date.now() - startTime) / 1000;
            addLog(`Sucesso! Tempo total (Rede + Server): ${duration}s`);

            if (response.data.ai_time) {
                addLog(`Tempo de Processamento IA (Backend): ${response.data.ai_time}`);
            }

            if (response.data.photo_nobg_url) {
                setResultImage(response.data.photo_nobg_url);
                addLog('URL da Imagem Sem Fundo:', response.data.photo_nobg_url);
            } else if (response.data.photo_url) {
                setResultImage(response.data.photo_url);
                addLog('URL da Imagem (Sem IA):', response.data.photo_url);
            }

            if (response.data.ai_logs && Array.isArray(response.data.ai_logs)) {
                addLog('Logs do Servidor (Python Output):', response.data.ai_logs);
            }

            addLog('Resposta Completa:', response.data);

            // Force reload to see changes if success
            // window.location.reload();
        } catch (error: any) {
            const duration = (Date.now() - startTime) / 1000;
            addLog(`Erro após ${duration}s`);
            if (error.response) {
                addLog('Status:', error.response.status);
                addLog('Data:', error.response.data);
            } else {
                addLog('Erro:', error.message || error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm">
                <p>Modo de Debug embutido para testar falhas de rede/timeout.</p>
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Selecionar Foto</label>
                <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    onChange={e => {
                        const f = e.target.files?.[0];
                        setFile(f || null);
                        if (f) setPreview(URL.createObjectURL(f));
                        setResultImage(null);
                    }}
                />
            </div>

            <div className="flex gap-4">
                {preview && (
                    <div className="flex-1">
                        <p className="text-xs font-bold mb-1 text-gray-500">Original:</p>
                        <div className="h-32 bg-gray-100 rounded flex items-center justify-center overflow-hidden border">
                            <img src={preview} className="h-full object-contain" />
                        </div>
                    </div>
                )}
                {resultImage && (
                    <div className="flex-1">
                        <p className="text-xs font-bold mb-1 text-green-600">Resultado (Backend):</p>
                        <div className="h-32 bg-gray-100 rounded flex items-center justify-center overflow-hidden border border-green-200 relative bg-[url('https://media.istockphoto.com/id/1145176885/vector/transparent-background-checkered-seamless-pattern.jpg?s=612x612&w=0&k=20&c=6-6qgT0rBf5f3F4p6i7a_0k3_2k_5_4_1_7_9')]">
                            <img src={resultImage} className="h-full object-contain relative z-10" />
                        </div>
                        <a href={resultImage} target="_blank" className="text-[10px] text-blue-600 underline block text-center mt-1">Abrir Link</a>
                    </div>
                )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={removeBg} onChange={e => setRemoveBg(e.target.checked)} />
                <span className="font-bold text-gray-700 text-sm">Ativar Remoção de Fundo (IA)</span>
            </label>

            <button
                onClick={handleUpload}
                disabled={loading}
                className={`w-full py-2.5 rounded-lg font-bold text-white shadow-md ${loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
                {loading ? 'Enviando (Aguarde)...' : 'Enviar Teste'}
            </button>

            <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs h-40 overflow-auto shadow-inner">
                {logs.length === 0 && <span className="text-gray-500 italic">Logs aparecerão aqui...</span>}
                {logs.map((log, i) => (
                    <div key={i} className="mb-1 border-b border-gray-800 pb-1 last:border-0">
                        <span className="text-emerald-400">[{log.time}]</span> {log.msg}
                        {log.data && <pre className="mt-1 text-[10px] text-gray-400">{JSON.stringify(log.data)}</pre>}
                    </div>
                ))}
            </div>
        </div>
    );
}
