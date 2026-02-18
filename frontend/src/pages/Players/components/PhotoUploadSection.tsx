import { useState, useEffect } from 'react';
import { Camera, Loader2, X, Plus } from 'lucide-react';
import api from '../../../services/api';

interface PhotoUploadSectionProps {
    playerId: string;
    // We expect photoUrls array, but for backward compat we handle single string too if passed that way
    currentPhotos?: string[] | string;
}

export function PhotoUploadSection({ playerId, currentPhotos }: PhotoUploadSectionProps) {
    const [photos, setPhotos] = useState<string[]>([]);
    const [loadingIndex, setLoadingIndex] = useState<number | null>(null);

    useEffect(() => {
        // Normalize input to array
        if (Array.isArray(currentPhotos)) {
            setPhotos(currentPhotos);
        } else if (typeof currentPhotos === 'string' && currentPhotos) {
            setPhotos([currentPhotos]);
        } else {
            setPhotos([]);
        }
    }, [currentPhotos]);

    async function handleUpload(file: File, index: number) {
        setLoadingIndex(index);
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('index', index.toString());
        // Removing background is optional, let's auto-enable it for now or make it a checkbox per slot?
        // Let's assume auto-remove or keep simple. User requested "follow same logic".
        // In Step 120, there was a checkbox. Let's keep it simple here: auto remove bg? 
        // Or adds a global checkbox? Let's add a global checkbox for "Remove BG on upload"
        if (removeBg) {
            formData.append('remove_bg', '1');
        }

        try {
            const res = await api.post(`/admin/upload/player-photo/${playerId}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000
            });

            const newUrl = res.data.photo_nobg_url || res.data.photo_url;
            const absoluteUrl = newUrl.startsWith('http') ? newUrl : `${import.meta.env.VITE_API_URL?.replace('/api', '')}${newUrl}`;

            setPhotos(prev => {
                const newPhotos = [...prev];
                // Fill gaps if index > length
                while (newPhotos.length <= index) {
                    newPhotos.push('');
                }
                newPhotos[index] = absoluteUrl;
                // Clean empty slots at end if any? No, keep it stable
                return newPhotos;
            });

            // alert('Foto atualizada!'); // Optional
        } catch (error) {
            console.error(error);
            alert('Erro ao enviar foto');
        } finally {
            setLoadingIndex(null);
        }
    }

    const [removeBg, setRemoveBg] = useState(false);

    return (
        <div className="space-y-4">
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
