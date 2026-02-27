import { useState, useEffect } from 'react';
import { Camera, Loader2, X, Plus } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { prepareImageForUpload } from '../../../utils/imageCompressor';

interface PhotoUploadSectionProps {
    playerId: string;
    // We expect photoUrls array, but for backward compat we handle single string too if passed that way
    currentPhotos?: string[] | string;
}

export function PhotoUploadSection({ playerId, currentPhotos }: PhotoUploadSectionProps) {
    const { user, updateUser } = useAuth();
    const [photos, setPhotos] = useState<string[]>([]);
    const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const getImageUrl = (path: string | null | undefined) => {
        if (!path) return '';
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const cleanApiUrl = apiUrl.replace(/\/$/, '');
        const apiBase = cleanApiUrl.replace(/\/api$/, '');
        let result = '';

        if (path.includes('/storage/')) {
            const storagePath = path.substring(path.indexOf('/storage/'));
            // Usar o protocolo/host atual para evitar problemas de CORS ou mismatch de porta
            result = `${apiBase}/api${storagePath}`;
        } else if (path.startsWith('http')) {
            result = path;
        } else if (path.startsWith('/')) {
            result = path;
        } else {
            result = `${cleanApiUrl}/storage/${path}`;
        }

        console.log('[PhotoUpload:getImageUrl] Path:', path, '-> Result:', result);
        return result;
    };

    useEffect(() => {
        // Normalize input to array
        if (Array.isArray(currentPhotos)) {
            setPhotos(currentPhotos.map(p => getImageUrl(p)));
        } else if (typeof currentPhotos === 'string' && currentPhotos) {
            setPhotos([getImageUrl(currentPhotos)]);
        } else {
            setPhotos([]);
        }
    }, [currentPhotos]);

    async function handleUpload(file: File, index: number) {
        setLoadingIndex(index);
        try {
            // Comprime automaticamente se necessário (limite: 4MB)
            const ready = await prepareImageForUpload(file, 4 * 1024 * 1024);
            const formData = new FormData();
            formData.append('photo', ready);
            formData.append('index', index.toString());
            if (removeBg) {
                formData.append('remove_bg', '1');
            }
            const res = await api.post(`/admin/upload/player-photo/${playerId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000
            });

            // Use the no-bg version if AI processed it, otherwise original
            const newUrl = res.data.photo_nobg_url || res.data.photo_url;
            const absoluteUrl = getImageUrl(newUrl);

            setPhotos(prev => {
                const newPhotos = [...prev];
                while (newPhotos.length <= index) {
                    newPhotos.push('');
                }
                newPhotos[index] = absoluteUrl;
                return newPhotos;
            });

            // Atualizar o contexto do usuário se for o próprio jogador
            if (user && user.id.toString() === playerId) {
                const updatedPhotos = [...(user.photos || [])];
                while (updatedPhotos.length <= index) updatedPhotos.push('');
                updatedPhotos[index] = res.data.photo_path;

                const updatedUser = {
                    ...user,
                    photos: updatedPhotos,
                    photo_path: updatedPhotos[0],
                    // Forçar atualização das URLs computadas
                    photo_url: getImageUrl(updatedPhotos[0]),
                    photo_urls: updatedPhotos.map(p => getImageUrl(p))
                };
                updateUser(updatedUser as any);
                console.log('[PhotoUpload] User context updated:', updatedUser);
            }

            // Warn if AI background removal was requested but failed
            if (removeBg && res.data.ai_error) {
                const aiErr = res.data.ai_error;
                console.warn('[PhotoUpload] AI remove_bg failed:', aiErr, res.data.ai_output);
                setUploadError(`Foto salva, mas remoção de fundo falhou: ${aiErr}`);
            } else {
                setUploadError(null);
            }
        } catch (error: any) {
            console.error('[PhotoUpload] Error:', error);

            let errorMsg = 'Erro ao enviar foto.';

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                errorMsg = 'Tempo limite excedido. A foto pode ser muito grande ou a conexão está lenta.';
            } else if (error.response) {
                const status = error.response.status;
                const data = error.response.data;

                // Try to extract a useful message from the backend
                const backendMsg =
                    data?.message ||
                    (data?.errors ? Object.values(data.errors).flat().join(' ') : null) ||
                    null;

                if (status === 413) {
                    errorMsg = 'Imagem muito grande para o servidor. Tente uma foto menor.';
                } else if (status === 422) {
                    errorMsg = backendMsg || 'Arquivo inválido. Use JPG ou PNG com até 4MB.';
                } else if (status === 403) {
                    errorMsg = 'Sem permissão para enviar esta foto.';
                } else if (status === 500) {
                    errorMsg = backendMsg
                        ? `Erro no servidor: ${backendMsg}`
                        : 'Erro interno no servidor. Tente novamente.';
                } else if (backendMsg) {
                    errorMsg = backendMsg;
                } else {
                    errorMsg = `Erro ao enviar foto (código ${status}).`;
                }
            } else if (error.request) {
                errorMsg = 'Sem resposta do servidor. Verifique sua conexão.';
            } else if (error.message) {
                errorMsg = error.message;
            }

            setUploadError(errorMsg);
            alert(`❌ ${errorMsg}`);
        } finally {
            setLoadingIndex(null);
        }
    }

    const [removeBg, setRemoveBg] = useState(false);

    return (
        <div className="space-y-4">
            {/* Error banner */}
            {uploadError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    <span className="mt-0.5 flex-shrink-0">⚠️</span>
                    <span className="flex-1">{uploadError}</span>
                    <button
                        onClick={() => setUploadError(null)}
                        className="flex-shrink-0 text-red-400 hover:text-red-600 font-bold"
                    >
                        ×
                    </button>
                </div>
            )}
            <div className="flex items-center gap-2 mb-4">
                <input
                    type="checkbox"
                    id="removeBg"
                    checked={removeBg}
                    onChange={e => setRemoveBg(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="removeBg" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Remover fundo com IA (automático ao enviar)
                </label>
            </div>

            <div className="flex gap-4 flex-wrap">
                {[0, 1, 2].map((index) => {
                    const hasPhoto = photos[index];
                    return (
                        <div key={index} className="relative w-32 h-32 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-indigo-400 transition-colors group">
                            {hasPhoto ? (
                                <>
                                    <img src={hasPhoto} alt={`Slot ${index}`} className="w-full h-full object-cover" />
                                    {loadingIndex === index && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <label className="cursor-pointer p-2 bg-white rounded-full hover:bg-gray-100">
                                            <Camera className="w-4 h-4 text-gray-700" />
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) handleUpload(e.target.files[0], index);
                                                }}
                                            />
                                        </label>
                                    </div>
                                    {index === 0 && <span className="absolute bottom-0 left-0 right-0 bg-indigo-600 text-white text-[10px] text-center py-0.5">Principal</span>}
                                </>
                            ) : (
                                <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-gray-400 hover:text-indigo-600">
                                    {loadingIndex === index ? (
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
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) handleUpload(e.target.files[0], index);
                                        }}
                                    />
                                </label>
                            )}
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
