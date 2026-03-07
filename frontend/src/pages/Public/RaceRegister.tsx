import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    User, Phone, FileText, Camera, Calendar, Mail, CreditCard,
    ArrowLeft, ArrowRight, Loader2, CheckCircle2,
    Check
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function RaceRegister() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [registrationData, setRegistrationData] = useState<any>(null);
    const [championship, setChampionship] = useState<any>(null);
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        document: '',
        birth_date: '',
        gender: '',
        category_id: '',
        remove_bg: true,
        is_pcd: false
    });

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [pcdFile, setPcdFile] = useState<File | null>(null);

    const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [id]);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                document: user.cpf || user.rg || '',
                birth_date: user.birth_date ? new Date(user.birth_date).toISOString().split('T')[0] : '',
                gender: user.gender || ''
            }));
        }
    }, [user]);

    // Filter main categories (no parent)
    const mainCategories = championship?.categories?.filter((cat: any) => !cat.parent_id) || [];

    // Get subcategories for the selected parent
    const subCategories = championship?.categories?.filter((cat: any) => cat.parent_id === parentCategoryId) || [];

    const selectedCategory = championship?.categories?.find((cat: any) => cat.id === (formData.category_id || parentCategoryId));

    async function loadData() {
        try {
            const response = await api.get(`/championships/${id}`);
            setChampionship(response.data);
        } catch (error) {
            console.error(error);
            alert("Erro ao carregar evento");
        } finally {
            setLoading(false);
        }
    }

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleRegister = async () => {
        if (!formData.category_id || !formData.name || !formData.email || !formData.document || !formData.phone || !formData.birth_date || !formData.gender) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        if (!photoFile) {
            alert('Por favor, envie uma foto para o seu perfil de atleta.');
            return;
        }

        if (formData.is_pcd && !pcdFile) {
            alert('Você declarou ser PCD. É obrigatório anexar o documento comprobatório para receber o desconto.');
            return;
        }

        try {
            setSaving(true);
            const data = new FormData();
            data.append('name', formData.name);
            data.append('email', formData.email);
            data.append('phone', formData.phone);
            data.append('document', formData.document);
            data.append('birth_date', formData.birth_date);
            data.append('gender', formData.gender);
            data.append('category_id', formData.category_id);
            data.append('remove_bg', formData.remove_bg ? '1' : '0');
            data.append('photo', photoFile);
            data.append('is_pcd', formData.is_pcd ? '1' : '0');
            if (formData.is_pcd && pcdFile) {
                data.append('pcd_document', pcdFile);
            }

            const response = await api.post(`/championships/${id}/race/register`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Se a categoria for paga, podemos guardar a info de que precisa pagar
            setRegistrationData(response.data);
            setStep(3); // Success step
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Erro ao realizar inscrição. Verifique os dados e tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 uppercase leading-tight italic">Inscrição</h1>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{championship?.name}</p>
                        </div>
                    </div>
                    {step < 3 && (
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                            Passo {step} de 2
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 mt-8">
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Selecione sua Categoria</h2>

                            <div className="space-y-6">
                                {/* Main Categories */}
                                <div className="grid gap-4">
                                    {mainCategories.map((cat: any) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setParentCategoryId(cat.id);
                                                // Reset child category selection if parent changes
                                                setFormData({ ...formData, category_id: '' });
                                            }}
                                            className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${parentCategoryId === cat.id
                                                ? 'border-indigo-600 bg-indigo-50/50 shadow-md'
                                                : 'border-slate-100 bg-white hover:border-slate-200'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-black text-slate-900 uppercase text-lg italic">{cat.name}</h3>
                                                    <p className="text-slate-500 text-xs font-medium uppercase mt-1">{cat.description || 'Categoria Principal'}</p>
                                                </div>
                                                {/* Se não tiver filhos, mostra o preço aqui */}
                                                {!championship?.categories?.some((c: any) => c.parent_id === cat.id) && (
                                                    <div className="text-right">
                                                        <span className="block font-black text-indigo-600 text-xl italic leading-none">
                                                            {cat.price ? `R$ ${cat.price}` : 'GRÁTIS'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {parentCategoryId === cat.id && (
                                                <div className="absolute top-2 right-2">
                                                    <div className="bg-indigo-600 text-white p-1 rounded-full">
                                                        <Check size={12} />
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Subcategories (Only if main category has children) */}
                                {parentCategoryId && subCategories.length > 0 && (
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4 pt-4 border-t border-slate-100">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Escolha a Subcategoria</h3>
                                        <div className="grid gap-3">
                                            {subCategories.map((sub: any) => (
                                                <button
                                                    key={sub.id}
                                                    onClick={() => setFormData({ ...formData, category_id: sub.id })}
                                                    className={`p-5 rounded-xl border-2 text-left transition-all flex justify-between items-center ${formData.category_id === sub.id
                                                        ? 'border-indigo-600 bg-indigo-50'
                                                        : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div>
                                                        <span className={`font-bold uppercase text-sm ${formData.category_id === sub.id ? 'text-indigo-600' : 'text-slate-700'}`}>
                                                            {sub.name}
                                                        </span>
                                                        {sub.description && <p className="text-[10px] text-slate-400 uppercase mt-0.5">{sub.description}</p>}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-black text-slate-900 text-sm italic">
                                                            {sub.price ? `R$ ${sub.price}` : selectedCategory?.price ? `R$ ${selectedCategory.price}` : 'GRÁTIS'}
                                                        </span>
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.category_id === sub.id ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 bg-white'}`}>
                                                            {formData.category_id === sub.id && <Check size={10} className="text-white" />}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            disabled={!formData.category_id && (!parentCategoryId || subCategories.length > 0)}
                            onClick={() => {
                                // Se a categoria principal não tiver filhos, salvamos o ID dela como category_id para o próximo passo
                                if (subCategories.length === 0 && parentCategoryId) {
                                    setFormData(prev => ({ ...prev, category_id: parentCategoryId.toString() }));
                                }
                                setStep(2);
                            }}
                            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 shadow-xl flex items-center justify-center gap-3 group transition-all"
                        >
                            Próximo Passo
                            <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Dados do Atleta</h2>

                            {/* Photo Upload */}
                            <div className="flex flex-col items-center py-4">
                                <label className="relative group cursor-pointer">
                                    <div className={`w-36 h-36 rounded-full border-4 ${photoPreview ? 'border-indigo-600' : 'border-slate-200 border-dashed'} overflow-hidden bg-slate-50 flex items-center justify-center transition-all group-hover:border-indigo-400`}>
                                        {photoPreview ? (
                                            <img src={photoPreview} className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera className="text-slate-300" size={48} />
                                        )}
                                    </div>
                                    <div className="absolute bottom-1 right-1 bg-indigo-600 text-white p-2 rounded-full shadow-lg">
                                        <Camera size={18} />
                                    </div>
                                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                                </label>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-4">Sua foto será usada nas artes oficiais</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Nome Completo</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold uppercase text-sm"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="NOME"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">E-mail</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="email"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="exemplo@email.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Celular / WhatsApp</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">RG ou CPF</label>
                                    <div className="relative">
                                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                                            value={formData.document}
                                            onChange={e => setFormData({ ...formData, document: e.target.value })}
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Data de Nascimento</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            type="date"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                                            value={formData.birth_date}
                                            onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Sexo</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['M', 'F', 'O'].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setFormData({ ...formData, gender: s })}
                                                className={`py-3 rounded-xl border-2 font-black text-sm uppercase transition-all ${formData.gender === s
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                                                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                    }`}
                                            >
                                                {s === 'M' ? 'Masculino' : s === 'F' ? 'Feminino' : 'Outro'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {championship?.has_pcd_discount && (
                                    <div className="md:col-span-2 space-y-3 pt-6 border-t border-slate-100">
                                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                                            <label className="flex items-start gap-3 cursor-pointer mb-4">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.is_pcd}
                                                    onChange={e => setFormData({ ...formData, is_pcd: e.target.checked })}
                                                    className="w-5 h-5 text-indigo-600 rounded border-slate-300 mt-1"
                                                />
                                                <div>
                                                    <span className="font-black text-slate-800 uppercase block">Sou Pessoa com Deficiência (PCD)</span>
                                                    <span className="text-xs text-slate-500 font-medium pt-1 block">Marcando esta opção, você pode ter direito a desconto conforme as regras do evento.</span>
                                                </div>
                                            </label>

                                            {formData.is_pcd && (
                                                <div className="pl-8 space-y-2 animate-in fade-in slide-in-from-top-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Documento Comprobatório (Obrigatório)</label>
                                                    <input
                                                        type="file"
                                                        accept="image/*,.pdf"
                                                        onChange={e => setPcdFile(e.target.files?.[0] || null)}
                                                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                                                        ⚠️ Tratamos seus dados de acordo com a LGPD. Seu laudo/documento será utilizado única e exclusivamente para validar seu desconto nesta inscrição, sendo armazenado com privacidade e segurança.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setStep(1)} className="px-8 py-5 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-colors">Voltar</button>
                            <button
                                onClick={handleRegister}
                                disabled={saving}
                                className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 shadow-xl flex items-center justify-center gap-3 transition-all"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        Sincronizando...
                                    </>
                                ) : (
                                    <>
                                        Finalizar Inscrição
                                        <CheckCircle2 />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in zoom-in-95 duration-500 text-center py-12 space-y-6">
                        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100/50">
                            <CheckCircle2 size={48} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-slate-900 uppercase italic">
                                {registrationData?.requires_payment ? 'Quase lá!' : 'Inscrição Confirmada!'}
                            </h2>
                            <p className="text-slate-500 font-medium max-w-sm mx-auto">
                                {registrationData?.discount_applied > 0 && (
                                    <span className="block text-green-600 font-bold mb-2">Desconto de {registrationData.discount_applied}% aplicado com sucesso!</span>
                                )}
                                {registrationData?.requires_payment
                                    ? `Sua inscrição foi reservada. Para garantir sua vaga, realize o pagamento de R$ ${registrationData.price.toFixed(2)} via PIX abaixo ou escolha outra forma de pagamento.`
                                    : 'Sua vaga está garantida. Agora é só se preparar para o grande dia!'}
                            </p>
                        </div>

                        {registrationData?.payment_data?.pix_qr_code && (
                            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 max-w-xs mx-auto animate-in fade-in zoom-in duration-700">
                                <div className="bg-white p-2 rounded-2xl shadow-inner mb-4">
                                    <img
                                        src={`data:image/png;base64,${registrationData.payment_data.pix_qr_code}`}
                                        alt="PIX QR Code"
                                        className="w-full aspect-square rounded-xl"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            if (registrationData?.payment_data?.pix_copy_paste) {
                                                navigator.clipboard.writeText(registrationData.payment_data.pix_copy_paste);
                                                alert("Código PIX copiado!");
                                            }
                                        }}
                                        className="w-full py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"
                                    >
                                        <FileText size={14} />
                                        Copiar Código PIX
                                    </button>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">
                                        Vence em: {new Date(registrationData.payment_data.expiration).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="pt-8 flex flex-col gap-3 max-w-xs mx-auto">
                            {registrationData?.requires_payment && (
                                <>
                                    {registrationData?.payment_data?.invoice_url && (
                                        <a
                                            href={registrationData.payment_data.invoice_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CreditCard size={20} />
                                            Pagar com Cartão
                                        </a>
                                    )}
                                    {!registrationData?.payment_data?.invoice_url && (
                                        <button
                                            onClick={() => navigate('/profile/inscriptions')}
                                            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CreditCard size={20} />
                                            Pagar Inscrição
                                        </button>
                                    )}
                                </>
                            )}
                            <button
                                onClick={() => navigate('/profile/inscriptions')}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all"
                            >
                                Ver Minhas Inscrições
                            </button>
                            <button
                                onClick={() => navigate(`/races/${id}`)}
                                className="w-full py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                            >
                                Voltar para o Evento
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
