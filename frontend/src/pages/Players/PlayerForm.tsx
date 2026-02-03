import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, User, Mail, FileText, Phone, Lock, Loader2 } from 'lucide-react';
import api from '../../services/api';

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
    const [loading, setLoading] = useState(false);

    function PhotoUploadSection({ playerId, currentPhoto }: { playerId: string, currentPhoto?: string }) {
        const [file, setFile] = useState<File | null>(null);
        const [removeBg, setRemoveBg] = useState(false);
        const [loading, setLoading] = useState(false);
        const [preview, setPreview] = useState<string | null>(currentPhoto ? `${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${currentPhoto}` : null);
        const [nobgPreview, setNobgPreview] = useState<string | null>(null);

        async function handleUpload() {
            if (!file) return;
            setLoading(true);
            const formData = new FormData();
            formData.append('photo', file);
            if (removeBg) {
                formData.append('remove_bg', '1');
            }

            try {
                // NOTE: The endpoint needs to be mapped to /admin/upload/player-photo in UI
                // Assuming endpoint is: /admin/upload/player-photo/{playerId} OR /admin/upload/player-photo with Id in body?
                // Backend Controller: public function uploadPlayerPhoto(Request $request, $playerId)
                // So Route should be POST /upload/player-photo/{playerId}
                // But api.php says: Route::post('/upload/player-photo', ...); 
                // WAIT! In api.php: Route::post('/upload/player-photo', [\App\Http\Controllers\Admin\ImageUploadController::class, 'uploadPlayerPhoto']);
                // But Controller method signature is `uploadPlayerPhoto(Request $request, $playerId)`
                // This is a mismatch in Laravel if route parameter is not in URL.
                // Let's re-read api.php carefully.

                // api.php line 154: Route::post('/upload/player-photo', ...);
                // Controller line 58: public function uploadPlayerPhoto(Request $request, $playerId)
                // If the route doesn't have {playerId}, Laravel dependency injection fails or assumes it's in request? 
                // Actually, if it's not in route, Laravel might error.
                // UNLESS the user mistakenly defined it without param in route file but controller expects it.

                // I will try to pass it as query param or check if I need to fix the backend route first.
                // Controller expects $playerId as second argument. This usually comes from Route parameter.
                // If I send POST /admin/upload/player-photo?playerId=123, it won't work automatically as $playerId argument unless explicitly bound.

                // I SHOULD FIX THE BACKEND ROUTE to be /upload/player-photo/{id} OR change controller to get ID from request.
                // Given I cannot easily verify run-time error without trying, I'll assume I need to fix backend route too.
                // For now, I will write the frontend code assuming the route will be fixed to `/admin/upload/player-photo/${playerId}`

                await api.post(`/admin/upload/player-photo/${playerId}`, formData);

                // Wait, I need to fix the backend route in the next step. I'll write the frontend code to match the PLANNED fix.

                // Actually, let's look at the response to update previews
                const res = await api.post(`/admin/upload/player-photo/${playerId}`, formData);

                if (res.data.photo_url) {
                    setPreview(`${import.meta.env.VITE_API_URL?.replace('/api', '')}${res.data.photo_url}`);
                }
                if (res.data.photo_nobg_url) {
                    setNobgPreview(`${import.meta.env.VITE_API_URL?.replace('/api', '')}${res.data.photo_nobg_url}`);
                    alert('Fundo removido com sucesso!');
                } else {
                    alert('Foto atualizada com sucesso!');
                }

                setFile(null);
            } catch (error) {
                console.error(error);
                alert('Erro ao enviar foto');
            } finally {
                setLoading(false);
            }
        }

        return (
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex gap-4">
                    {preview && (
                        <div className="text-center">
                            <p className="text-xs font-bold mb-1 text-gray-500">Original</p>
                            <img src={preview} alt="Atual" className="w-32 h-32 object-cover rounded-lg border border-gray-200" />
                        </div>
                    )}
                    {nobgPreview && (
                        <div className="text-center">
                            <p className="text-xs font-bold mb-1 text-green-600">Sem Fundo (IA)</p>
                            <img src={nobgPreview} alt="Recortada" className="w-32 h-32 object-contain bg-checkered rounded-lg border border-green-200" />
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-3">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                            setFile(e.target.files?.[0] || null);
                            if (e.target.files?.[0]) {
                                setPreview(URL.createObjectURL(e.target.files[0]));
                                setNobgPreview(null);
                            }
                        }}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={removeBg}
                            onChange={e => setRemoveBg(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Remover fundo com IA</span>
                    </label>

                    <button
                        type="button"
                        onClick={handleUpload}
                        disabled={!file || loading}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {loading ? 'Processando...' : 'Enviar Foto'}
                    </button>

                    <p className="text-xs text-gray-400">
                        Formatos: JPG, PNG. Máx 2MB. Use fotos com bom contraste para melhor recorte.
                    </p>
                </div>
            </div>
        );
    }

    export function PlayerForm() {

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
                if (isEditing) {
                    await api.put(`/admin/players/${id}`, data);
                } else {
                    await api.post('/admin/players', data);
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
                        {/* Seção 0: Foto do Perfil (Somente Edição) */}
                        {isEditing && (
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
                                <h2 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2 mb-4">
                                    <User className="w-5 h-5 text-indigo-500" />
                                    Foto do Perfil
                                </h2>
                                <PhotoUploadSection playerId={id!} currentPhoto={form.photo_path} />
                            </div>
                        )}

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
                                        required
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
                                        required
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
                                        required
                                        value={form.birth_date}
                                        onChange={e => setForm({ ...form, birth_date: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Gênero</label>
                                    <select
                                        required
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
                                        required
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
                                        required
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
                                                required={!isEditing}
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
                                                required={!isEditing || !!form.password}
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
