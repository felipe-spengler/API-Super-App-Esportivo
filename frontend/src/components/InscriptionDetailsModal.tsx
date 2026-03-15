import React, { useState } from 'react';
import { X, Trophy, Calendar, FileText, Share2, Camera, Loader2, Download, CheckCircle2, User } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface InscriptionDetailsModalProps {
    inscription: any;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export function InscriptionDetailsModal({ inscription, isOpen, onClose, onUpdate }: InscriptionDetailsModalProps) {
    const [activeTab, setActiveTab] = useState<'details' | 'art'>('details');
    const [uploading, setUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    if (!isOpen || !inscription) return null;

    const isConfirmed = inscription.status_payment === 'paid';
    const championship = inscription.race?.championship || {};
    const category = inscription.category || {};

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload — respeita configuração do campeonato para remoção de fundo
        const removeBg = championship?.remove_bg_on_art ? 'true' : 'false';
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('remove_bg', removeBg);

        setUploading(true);
        try {
            await api.post('/me/photo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Foto atualizada com sucesso!');
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao atualizar foto');
        } finally {
            setUploading(false);
        }
    };

    const artUrl = `${api.defaults.baseURL}/art/championship/${championship.id}/individual/${inscription.id}/atleta_confirmado`;

    const getUserPhoto = () => {
        if (imagePreview) return imagePreview;
        
        const photoPath = inscription.user?.photo_path || (inscription.user?.photos && inscription.user.photos[0]);
        if (photoPath) {
            if (photoPath.startsWith('http')) return photoPath;
            return `${api.defaults.baseURL}/storage/${photoPath.replace('/storage/', '')}`;
        }
        return null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg h-[85vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-20">
                    <h2 className="text-lg font-bold text-gray-900">Detalhes da Inscrição</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 shrink-0 bg-white">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        Informações
                    </button>
                    {isConfirmed && (
                        <button
                            onClick={() => setActiveTab('art')}
                            className={`flex-1 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeTab === 'art' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                        >
                            🎨 Arte Confirmado
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/50">
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            {/* Inscribed Card */}
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4">
                                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 overflow-hidden relative group">
                                    {getUserPhoto() ? (
                                        <img 
                                            src={getUserPhoto()!} 
                                            className="w-full h-full object-cover" 
                                            alt="Sua foto"
                                        />
                                    ) : (
                                        <User className="w-8 h-8 text-indigo-200" />
                                    )}
                                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <Camera className="text-white w-5 h-5" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} disabled={uploading} />
                                    </label>
                                    {uploading && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 truncate">{championship.name}</h3>
                                    <p className="text-sm text-gray-500 font-medium">
                                        {category.parent?.name ? `${category.parent.name} — ` : ''}
                                        {category.name || 'Individual'}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isConfirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {isConfirmed ? 'Inscrição Confirmada' : 'Pendente de Pagamento'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info — Movi para cima para aparecer melhor no mobile */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <span className="text-[10px] uppercase text-gray-400 font-black block mb-1 tracking-wider text-center">Peito</span>
                                    <span className="text-2xl font-black text-indigo-600 block text-center leading-none">{inscription.bib_number || '--'}</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
                                    <span className="text-[10px] uppercase text-gray-400 font-black block mb-1 tracking-wider text-center">Inscrito em</span>
                                    <span className="text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5">
                                        <Calendar size={12} className="text-gray-400" />
                                        {new Date(inscription.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {/* Photo Update Section */}
                            <div className="space-y-3 pt-2 border-t border-gray-100">
                                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <Camera size={16} className="text-indigo-500" />
                                    Sua Foto do Evento
                                </h4>
                                <p className="text-xs text-gray-500 font-medium">
                                    Esta foto será usada para gerar sua arte de confirmação e nos resultados. Recomendamos uma foto de rosto com boa iluminação.
                                </p>
                                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group bg-white">
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                            <span className="text-xs font-medium text-gray-500">Enviando foto...</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                                <Camera className="w-6 h-6 text-gray-400 group-hover:text-indigo-600" />
                                            </div>
                                            <span className="text-xs font-bold text-gray-600">Alterar Minha Foto</span>
                                            <span className="text-[10px] text-gray-400">Toque para selecionar uma imagem da galeria</span>
                                        </div>
                                    )}
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} disabled={uploading} />
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'art' && (
                        <div className="flex flex-col items-center justify-center space-y-4 py-4 animate-in fade-in zoom-in duration-300">
                            <div className="relative w-full aspect-[4/5] bg-gray-200 rounded-2xl overflow-hidden shadow-lg border border-gray-100 group">
                                <img 
                                    src={`${artUrl}?t=${Date.now()}`} 
                                    className="w-full h-full object-contain" 
                                    alt="Arte de Confirmado"
                                    onError={(e: any) => {
                                        e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22500%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%23f3f4f6%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20font-family%3D%22Arial%22%20font-size%3D%2216%22%20fill%3D%22%239ca3af%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%3ECarregando%20sua%20Arte...%3C%2Ftext%3E%3C%2Fsvg%3E';
                                    }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-gray-800 shadow-lg">
                                        🔍 Clique abaixo para baixar
                                    </div>
                                </div>
                            </div>

                            <div className="w-full flex flex-col gap-2">
                                <a 
                                    href={`${artUrl}?download=true`}
                                    download={`confirmado-${inscription.id}.jpg`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                                >
                                    <Download size={20} />
                                    Baixar Arte de Confirmado
                                </a>
                                <button
                                    onClick={() => {
                                        if (navigator.share) {
                                            fetch(artUrl)
                                                .then(res => res.blob())
                                                .then(blob => {
                                                    const file = new File([blob], 'confirmado.jpg', { type: 'image/jpeg' });
                                                    navigator.share({
                                                        title: 'Confirmado no Evento!',
                                                        text: `Acabei de me inscrever no evento ${championship.name}!`,
                                                        files: [file]
                                                    });
                                                });
                                        } else {
                                            toast.error('Compartilhamento não disponível neste navegador');
                                        }
                                    }}
                                    className="flex items-center justify-center gap-2 w-full py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm"
                                >
                                    <Share2 size={20} />
                                    Compartilhar com Amigos
                                </button>
                                <p className="text-[10px] text-gray-400 text-center font-medium mt-2">
                                    Se a arte estiver com a foto errada, volte na aba "Informações" e altere sua foto.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
