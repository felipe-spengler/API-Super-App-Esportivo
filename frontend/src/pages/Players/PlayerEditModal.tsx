import { useState, useEffect } from 'react';
import { X, Loader2, Upload, User } from 'lucide-react';
import api from '../../services/api';

interface PlayerEditModalProps {
    playerId: number;
    teamId?: number;
    championshipId?: number;
    onClose: () => void;
    onSuccess: () => void;
}

export function PlayerEditModal({ playerId, teamId, championshipId, onClose, onSuccess }: PlayerEditModalProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [player, setPlayer] = useState<any>(null);

    // Form states
    const [name, setName] = useState('');
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [cpf, setCpf] = useState('');
    const [phone, setPhone] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState('');
    const [address, setAddress] = useState('');
    const [position, setPosition] = useState('');
    const [number, setNumber] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [removeBg, setRemoveBg] = useState(false);

    useEffect(() => {
        loadPlayer();
    }, [playerId]);

    async function loadPlayer() {
        setLoading(true);
        try {
            const params: any = {};
            if (teamId) params.team_id = teamId;
            if (championshipId) params.championship_id = championshipId;

            const response = await api.get(`/admin/players/${playerId}`, { params });
            const data = response.data;
            setPlayer(data);

            // Populate form
            setName(data.name || '');
            setNickname(data.nickname || '');
            setEmail(data.email || '');
            setCpf(data.cpf || '');
            setPhone(data.phone || '');
            setBirthDate(data.birth_date || '');
            setGender(data.gender || '');
            setGender(data.gender || '');
            setAddress(data.address || '');
            setPosition(data.position || '');
            setNumber(data.number || '');
            setPhotoPreview(data.photo_url || null);
        } catch (error) {
            console.error('Erro ao carregar jogador:', error);
            alert('Erro ao carregar dados do jogador');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);

        try {
            // Update basic info
            await api.put(`/admin/players/${playerId}`, {
                name,
                nickname,
                email,
                cpf,
                phone,
                birth_date: birthDate,
                address,
                position,
                number,
                team_id: teamId,
                championship_id: championshipId
            });

            // Upload photo if selected
            if (photoFile) {
                const formData = new FormData();
                formData.append('file', photoFile);
                formData.append('type', 'player');
                formData.append('id', playerId.toString());
                formData.append('index', '0');



                if (removeBg) {
                    formData.append('remove_bg', '1');
                }

                await api.post('/admin/upload-image', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
            }

            alert('Jogador atualizado com sucesso!');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Erro ao atualizar jogador:', error);
            alert(error.response?.data?.message || 'Erro ao atualizar jogador');
        } finally {
            setSaving(false);
        }
    }

    function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    }

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-gray-700">Carregando...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50">
                    <h3 className="text-xl font-bold text-gray-900">Editar Jogador</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Photo Section */}
                    <div className="flex flex-col items-center gap-4 pb-6 border-b border-gray-100">
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt={name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <User className="w-16 h-16 text-gray-300" />
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full cursor-pointer hover:bg-indigo-700 transition-colors shadow-lg">
                                <Upload className="w-4 h-4" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        <p className="text-xs text-gray-500">Clique no ícone para alterar a foto</p>

                        <div className="flex items-center gap-2 mt-2">
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
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                Nome Completo
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                Apelido
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={nickname}
                                onChange={e => setNickname(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                Posição
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="Ex: Goleiro"
                                value={position}
                                onChange={e => setPosition(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                Número
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                                placeholder="00"
                                value={number}
                                onChange={e => setNumber(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                CPF
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={cpf}
                                onChange={e => setCpf(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                Data de Nascimento
                            </label>
                            <input
                                type="date"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={birthDate}
                                onChange={e => setBirthDate(e.target.value)}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                Email
                            </label>
                            <input
                                type="email"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                Telefone
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                Sexo
                            </label>
                            <select
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={gender}
                                onChange={e => setGender(e.target.value)}
                            >
                                <option value="">Selecione</option>
                                <option value="M">Masculino</option>
                                <option value="F">Feminino</option>
                                <option value="O">Outro</option>
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                                Endereço
                            </label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-75"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                'Salvar Alterações'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
