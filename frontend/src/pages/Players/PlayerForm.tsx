import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, User, Mail, Loader2, Plus } from 'lucide-react';
import api from '../../services/api';
import { PhotoUploadSection } from './components/PhotoUploadSection';

export function PlayerForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const [form, setForm] = useState({
        name: '',
        nickname: '',
        email: '',
        cpf: '',
        rg: '',
        mother_name: '',
        gender: '',
        birth_date: '',
        phone: '',
        address: '',
        password: '',
        password_confirmation: '',
        photo_path: ''
    });
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [removeBg, setRemoveBg] = useState(false);
    const [loading, setLoading] = useState(false);



    useEffect(() => {
        if (isEditing) {
            loadPlayer();
        }
    }, [id]);

    async function loadPlayer() {
        try {
            const response = await api.get(`/admin/players/${id}`);
            const data = response.data;

            setForm({
                ...data,
                birth_date: data.birth_date ? data.birth_date.split('T')[0] : '',
                password: '',
                password_confirmation: ''
            });
        } catch (error) {
            alert('Erro ao carregar jogador');
            navigate('/admin/players');
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const data = { ...form };
            if (isEditing && !data.password) {
                delete (data as any).password;
                delete (data as any).password_confirmation;
            }
            let playerId;
            if (isEditing) {
                await api.put(`/admin/players/${id}`, data);
                playerId = id;
            } else {
                const response = await api.post('/admin/players', data);
                playerId = response.data.id;
            }

            // Upload photo for new player if selected
            if (!isEditing && photoFile && playerId) {
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
            navigate('/admin/players');
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Erro ao salvar jogador');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="animate-in fade-in duration-500 max-w-3xl mx-auto pb-20">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors">
                <ArrowLeft className="w-5 h-5 mr-1" /> Voltar
            </button>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-indigo-600 p-8 text-white">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
                            <User className="w-10 h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">{isEditing ? 'Editar Atleta' : 'Novo Atleta'}</h1>
                            <p className="text-indigo-100 opacity-80">{isEditing ? 'Atualize as informações do perfil do jogador.' : 'Cadastre um novo atleta na plataforma.'}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Seção 0: Foto do Perfil */}
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
                        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2 mb-4">
                            <User className="w-5 h-5 text-indigo-500" />
                            Foto do Perfil
                        </h2>
                        {isEditing ? (
                            <PhotoUploadSection playerId={id!} currentPhotos={(form as any).photo_urls || form.photo_path} />
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                                        {photoPreview ? (
                                            <img
                                                src={photoPreview}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User className="w-16 h-16 text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full cursor-pointer hover:bg-indigo-700 transition-colors shadow-lg">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setPhotoFile(file);
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setPhotoPreview(reader.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                        <Plus className="w-4 h-4" />
                                    </label>
                                </div>
                                <p className="text-xs text-gray-500">Clique no ícone para adicionar uma foto</p>

                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="checkbox"
                                        id="removeBgNew"
                                        checked={removeBg}
                                        onChange={e => setRemoveBg(e.target.checked)}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <label htmlFor="removeBgNew" className="text-sm font-medium text-gray-700 cursor-pointer">
                                        Remover fundo com IA (automático ao salvar)
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Seção 1: Informações Básicas */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                            <User className="w-5 h-5 text-indigo-500" />
                            Informações Pessoais
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="João Silva"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Apelido</label>
                                <input
                                    type="text"
                                    value={form.nickname}
                                    onChange={e => setForm({ ...form, nickname: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Canhotinha"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">CPF</label>
                                <input
                                    type="text"
                                    value={form.cpf}
                                    onChange={e => setForm({ ...form, cpf: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="000.000.000-00"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">RG</label>
                                <input
                                    type="text"
                                    value={form.rg}
                                    onChange={e => setForm({ ...form, rg: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="0.000.000-0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Data de Nascimento</label>
                                <input
                                    type="date"
                                    value={form.birth_date}
                                    onChange={e => setForm({ ...form, birth_date: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Gênero</label>
                                <select
                                    value={form.gender}
                                    onChange={e => setForm({ ...form, gender: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                                >
                                    <option value="">Selecione...</option>
                                    <option value="M">Masculino</option>
                                    <option value="F">Feminino</option>
                                    <option value="O">Outro</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nome da Mãe</label>
                                <input
                                    type="text"
                                    value={form.mother_name}
                                    onChange={e => setForm({ ...form, mother_name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Nome completo da mãe"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Endereço</label>
                                <input
                                    type="text"
                                    value={form.address}
                                    onChange={e => setForm({ ...form, address: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Rua, número, bairro, cidade..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Seção 2: Contato e Acesso */}
                    <div className="space-y-4 pt-4">
                        <h2 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-indigo-500" />
                            Contato e Acesso
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="joao@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Telefone</label>
                                <input
                                    type="text"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>

                            {(!isEditing || form.password) && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">{isEditing ? 'Nova Senha (opcional)' : 'Senha'}</label>
                                        <input
                                            type="password"
                                            value={form.password}
                                            onChange={e => setForm({ ...form, password: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="******"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Confirmar Senha</label>
                                        <input
                                            type="password"
                                            required={!!form.password}
                                            value={form.password_confirmation}
                                            onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="******"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-70 text-lg"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {loading ? 'Salvando...' : (isEditing ? 'Atualizar Atleta' : 'Cadastrar Atleta')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
