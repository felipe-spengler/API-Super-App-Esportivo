import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    User, Phone, FileText, Camera, Calendar, Mail, CreditCard,
    ArrowLeft, ArrowRight, Loader2, CheckCircle2,
    Check, Smartphone, AlertCircle, RefreshCw, Search, Activity, ShieldQuestion, Download, Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
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
        remove_bg: false,
        is_pcd: false,
        gifts: [] as any[],
        coupon_code: '',
        payment_method: 'PIX'
    });

    const [chosenMethod, setChosenMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');

    const [giftSelections, setGiftSelections] = useState<Record<number, string>>({});
    const [couponValidating, setCouponValidating] = useState(false);
    const [couponInfo, setCouponInfo] = useState<any>(null);

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [pcdFile, setPcdFile] = useState<File | null>(null);

    const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
    const [selectingSubcategory, setSelectingSubcategory] = useState(false);

    const [shopProducts, setShopProducts] = useState<any[]>([]);
    const [shopItems, setShopItems] = useState<any[]>([]);

    const [trackingCpf, setTrackingCpf] = useState('');
    const [trackingBirthDate, setTrackingBirthDate] = useState('');
    const [isTracking, setIsTracking] = useState(false);

    async function handleTrack() {
        if (!trackingCpf || !trackingBirthDate) {
            toast.error('Preencha CPF e Data de Nascimento');
            return;
        }
        try {
            setSaving(true);
            const response = await api.post(`/championships/${id}/race/track`, {
                document: trackingCpf,
                birth_date: trackingBirthDate
            });
            setRegistrationData(response.data);

            // Detectar o método anterior
            if (response.data.payment_data?.pix_qr_code) {
                setChosenMethod('PIX');
            } else if (response.data.payment_data?.invoice_url) {
                // Se só tiver invoice_url, pode ser cartão ou boleto. 
                // No frontend geralmente o usuário escolhe, mas vamos manter o que estiver
            }

            setStep(7);
            toast.success('Inscrição recuperada!');
            setIsTracking(false);
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Inscrição não encontrada');
        } finally {
            setSaving(false);
        }
    }

    useEffect(() => {
        loadData();
    }, [id]);

    // Auto-refresh payment status every 7 seconds
    useEffect(() => {
        let interval: any;

        if (step === 7 && registrationData?.requires_payment) {
            interval = setInterval(async () => {
                try {
                    const response = await api.post(`/championships/${id}/race/track`, {
                        document: formData.document,
                        birth_date: formData.birth_date
                    });

                    if (response.data.result.status_payment === 'paid') {
                        setRegistrationData(response.data);
                        toast.success('Pagamento confirmado!');
                    }
                } catch (error) {
                    console.error('Erro ao verificar status:', error);
                }
            }, 7000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [step, registrationData?.requires_payment, id, formData.document, formData.birth_date]);

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

    const getGiftsSurcharge = () => {
        let surcharges = 0;
        selectedCategory?.products_details?.forEach((item: any) => {
            const selectedValue = giftSelections[item.product.id];
            if (selectedValue && item.product.variants) {
                const variant = item.product.variants.find((v: any) =>
                    typeof v === 'object' ? v.value === selectedValue : v === selectedValue
                );
                if (variant && typeof variant === 'object' && variant.surcharge) {
                    surcharges += Number(variant.surcharge);
                }
            }
        });
        return surcharges;
    };

    const getShopTotal = () => {
        let total = 0;
        shopItems.forEach(item => {
            const product = shopProducts.find(p => p.id === item.product_id);
            if (product) {
                let price = Number(product.price);
                if (item.variant && product.variants) {
                    const v = product.variants.find((v: any) => (typeof v === 'object' ? v.value === item.variant : v === item.variant));
                    if (v && typeof v === 'object' && v.surcharge) {
                        price += Number(v.surcharge);
                    }
                }
                total += price * item.quantity;
            }
        });
        return total;
    };

    const calculateTotal = () => {
        let base = Number(selectedCategory?.price || 0);
        let surcharge = getGiftsSurcharge();

        let regTotal = base + surcharge;

        if (formData.is_pcd) {
            regTotal *= 0.5;
        }

        let shopTotal = getShopTotal();
        let currentTotal = regTotal + shopTotal;

        if (couponInfo) {
            if (couponInfo.discount_type === 'percentage') {
                currentTotal -= currentTotal * (Number(couponInfo.discount_value) / 100);
            } else {
                currentTotal -= Number(couponInfo.discount_value);
            }
        }

        return Math.max(0, currentTotal);
    };

    async function loadData() {
        try {
            const response = await api.get(`/championships/${id}`);
            const champ = response.data;
            setChampionship(champ);

            // Fetch Club Products
            const productsRes = await api.get(`/shop/products/${champ.club_id}`);
            setShopProducts(productsRes.data || []);

            // Verificar se usuário já está inscrito
            if (user) {
                const myInscriptions = await api.get('/my-inscriptions');
                const existing = myInscriptions.data.find((ins: any) => ins.race?.championship_id === Number(id));
                if (existing) {
                    setRegistrationData({
                        result: existing,
                        requires_payment: existing.status_payment === 'pending',
                        payment_data: existing.payment_info
                    });

                    // Tentar determinar o método que estava sendo exibido
                    if (existing.payment_info?.pix_qr_code) {
                        setChosenMethod('PIX');
                    } else if (existing.payment_info?.invoice_url) {
                        // Poderia ser cartão ou boleto. Vamos deixar como PIX se houver opção ou o que estiver no state
                    }

                    setStep(7); // Ir direto para a tela de sucesso/pagamento
                }
            }
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
            if (photoFile) {
                data.append('photo', photoFile);
            }
            data.append('is_pcd', formData.is_pcd ? '1' : '0');
            if (formData.is_pcd && pcdFile) {
                data.append('pcd_document', pcdFile);
            }

            // Gifts
            const selectedGifts = Object.entries(giftSelections).map(([productId, variant]) => ({
                product_id: productId,
                variant: variant
            }));
            data.append('gifts', JSON.stringify(selectedGifts));

            // Shop Items
            data.append('shop_items', JSON.stringify(shopItems));

            if (formData.coupon_code) {
                data.append('coupon_code', formData.coupon_code);
            }
            data.append('payment_method', chosenMethod);

            const response = await api.post(`/championships/${id}/race/register`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Se a categoria for paga, podemos guardar a info de que precisa pagar
            setRegistrationData(response.data);
            setStep(7); // Success step
        } catch (error: any) {
            console.error(error);
            const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Erro ao realizar inscrição. Verifique os dados e tente novamente.';
            alert(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    async function handleRecreatePayment(newMethod: 'PIX' | 'CREDIT_CARD' | 'BOLETO') {
        try {
            setSaving(true);
            const response = await api.post(`/inscriptions/${registrationData.result.id}/recreate-payment`, {
                payment_method: newMethod,
                document: formData.document,
                birth_date: formData.birth_date
            });
            setRegistrationData({
                ...registrationData,
                payment_data: response.data.payment_data
            });
            setChosenMethod(newMethod);
            toast.success('Forma de pagamento atualizada!');
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || 'Erro ao atualizar pagamento');
        } finally {
            setSaving(false);
        }
    }

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
                    {step < 6 && (
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                            Passo {step} de 5
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 mt-8">
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                        {!selectingSubcategory ? (
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Selecione sua Categoria</h2>

                                <div className="space-y-6">
                                    <div className="grid gap-4">
                                        {mainCategories.map((cat: any) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => {
                                                    setParentCategoryId(cat.id);
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
                                                    {!championship?.categories?.some((c: any) => c.parent_id === cat.id) && (
                                                        <div className="text-right">
                                                            <span className="block font-black text-indigo-600 text-xl italic leading-none">
                                                                {Number(cat.price) > 0 ? `R$ ${cat.price}` : 'GRÁTIS'}
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
                                </div>
                                <button
                                    disabled={!parentCategoryId}
                                    onClick={() => {
                                        if (subCategories.length > 0) {
                                            setSelectingSubcategory(true);
                                        } else {
                                            if (parentCategoryId) {
                                                setFormData(prev => ({ ...prev, category_id: parentCategoryId.toString() }));
                                            }
                                            setStep(2);
                                        }
                                    }}
                                    className="w-full mt-6 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 shadow-xl flex items-center justify-center gap-3 group transition-all"
                                >
                                    Próximo Passo
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </button>

                                {/* Tracking Section */}
                                <div className="mt-8 pt-8 border-t border-slate-100">
                                    {!isTracking ? (
                                        <button
                                            onClick={() => setIsTracking(true)}
                                            className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Search size={14} />
                                            Já se inscreveu? Acompanhe aqui
                                        </button>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Activity size={12} className="text-indigo-600" />
                                                    Consultar Inscrição
                                                </h3>
                                                <button onClick={() => setIsTracking(false)} className="text-[10px] font-black text-indigo-600 uppercase">Cancelar</button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">CPF do Atleta</label>
                                                    <div className="relative">
                                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input
                                                            value={trackingCpf}
                                                            onChange={e => setTrackingCpf(e.target.value)}
                                                            placeholder="000.000.000-00"
                                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl text-sm font-bold transition-all outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data de Nascimento</label>
                                                    <div className="relative">
                                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                        <input
                                                            type="date"
                                                            value={trackingBirthDate}
                                                            onChange={e => setTrackingBirthDate(e.target.value)}
                                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl text-sm font-bold transition-all outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleTrack}
                                                disabled={saving || !trackingCpf || !trackingBirthDate}
                                                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 transition-all"
                                            >
                                                {saving ? <Loader2 className="animate-spin" /> : <Search size={18} />}
                                                Localizar Minha Inscrição
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <button
                                        onClick={() => {
                                            setSelectingSubcategory(false);
                                            setFormData({ ...formData, category_id: '' });
                                        }}
                                        className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0"
                                    >
                                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                                    </button>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">Escolha a Subcategoria</h2>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                                            {mainCategories.find((c: any) => c.id === parentCategoryId)?.name}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {subCategories.map((sub: any) => (
                                        <button
                                            key={sub.id}
                                            onClick={() => setFormData({ ...formData, category_id: sub.id })}
                                            className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col justify-between items-start gap-3 h-full ${formData.category_id === sub.id
                                                ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                                : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="w-full">
                                                <span className={`font-black uppercase text-sm block leading-tight ${formData.category_id === sub.id ? 'text-indigo-600' : 'text-slate-700'}`}>
                                                    {sub.name}
                                                </span>
                                                {sub.description && <p className="text-[10px] text-slate-400 uppercase mt-1 leading-tight">{sub.description}</p>}
                                            </div>
                                            <div className="flex w-full items-center justify-between mt-auto pt-2 border-t border-slate-100/50">
                                                <span className="font-black text-slate-900 text-sm italic">
                                                    {Number(sub.price) > 0 ? `R$ ${sub.price}` : (Number(sub.price) === 0 ? '' : (Number(selectedCategory?.price) > 0 ? `R$ ${selectedCategory?.price}` : ''))}
                                                </span>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${formData.category_id === sub.id ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 bg-white'}`}>
                                                    {formData.category_id === sub.id && <Check size={10} className="text-white" />}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    disabled={!formData.category_id}
                                    onClick={() => setStep(2)}
                                    className="w-full mt-6 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 shadow-xl flex items-center justify-center gap-3 group transition-all"
                                >
                                    Confirmar {formData.category_id ? 'Subcategoria' : ''}
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Dados do Atleta</h2>

                            {/* Photo Upload */}
                            <div className="flex flex-col items-center py-4">
                                <label className="relative group cursor-pointer">
                                    <div className={`w-36 h-36 rounded-full border-4 ${photoPreview ? 'border-indigo-600' : 'border-indigo-300 border-dashed'} overflow-hidden bg-slate-50 flex items-center justify-center transition-all`}>
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

                                {(championship?.has_pcd_discount == 1 || championship?.has_pcd_discount === true) && (
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
                                onClick={() => {
                                    if (!formData.category_id || !formData.name || !formData.email || !formData.document || !formData.phone || !formData.birth_date || !formData.gender) {
                                        alert('Por favor, preencha todos os campos obrigatórios.');
                                        return;
                                    }

                                    if (formData.is_pcd && !pcdFile) {
                                        alert('Você declarou ser PCD. É obrigatório anexar o documento comprobatório para receber o desconto.');
                                        return;
                                    }

                                    // Check if category has gifts
                                    if (selectedCategory?.products_details?.length > 0) {
                                        setStep(3);
                                    } else if (championship.allow_shopping_registration) {
                                        setStep(4);
                                    } else {
                                        setStep(5);
                                    }
                                }}
                                className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 shadow-xl flex items-center justify-center gap-3 transition-all"
                            >
                                Próximo Passo
                                <ArrowRight />
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 italic">Escolha seus Brindes</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest border-b border-slate-100 pb-4">
                                Estes itens estão inclusos na sua inscrição
                            </p>

                            <div className="space-y-8">
                                {selectedCategory?.products_details?.map((item: any) => (
                                    <div key={item.product.id} className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-black text-slate-900 uppercase text-sm">{item.product.name}</h3>
                                                <p className="text-[10px] text-slate-500 font-medium uppercase">{item.quantity} unidade(s)</p>
                                            </div>
                                            {item.required && <span className="bg-amber-50 text-amber-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Obrigatório</span>}
                                        </div>

                                        {item.product.variants && item.product.variants.length > 0 && (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                                                {item.product.variants.map((v: any) => {
                                                    const val = typeof v === 'object' ? v.value : v;
                                                    const surcharge = typeof v === 'object' ? v.surcharge : 0;
                                                    return (
                                                        <button
                                                            key={val}
                                                            onClick={() => setGiftSelections({ ...giftSelections, [item.product.id]: val })}
                                                            className={`py-2 px-1 rounded-lg border-2 font-black text-[10px] uppercase transition-all flex flex-col items-center justify-center ${giftSelections[item.product.id] === val
                                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                                }`}
                                                        >
                                                            <span>{val}</span>
                                                            {surcharge > 0 && (
                                                                <span className={giftSelections[item.product.id] === val ? 'text-indigo-200' : 'text-emerald-500'}>
                                                                    +R$ {surcharge}
                                                                </span>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setStep(2)} className="px-8 py-5 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-colors">Voltar</button>
                            <button
                                onClick={() => {
                                    // Validar se todos os obrigatórios com variações foram selecionados
                                    const missing = selectedCategory.products_details.filter((item: any) =>
                                        item.required &&
                                        item.product.variants?.length > 0 &&
                                        !giftSelections[item.product.id]
                                    );

                                    if (missing.length > 0) {
                                        alert(`Por favor, selecione o tamanho para: ${missing.map((m: any) => m.product.name).join(', ')}`);
                                        return;
                                    }
                                    if (championship.allow_shopping_registration) {
                                        setStep(4);
                                    } else {
                                        setStep(5);
                                    }
                                }}
                                className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl flex items-center justify-center gap-3 transition-all"
                            >
                                Próximo Passo
                                <ArrowRight />
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 italic">Loja do Clube</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest border-b border-slate-100 pb-4">
                                Deseja adicionar mais algum item ao seu pedido?
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto px-1">
                                {shopProducts.filter(p => p.stock_quantity === null || p.stock_quantity > 0).map(product => {
                                    const inCart = shopItems.find(item => item.product_id === product.id);
                                    return (
                                        <div key={product.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 relative group transition-all hover:border-indigo-100 hover:bg-white overflow-hidden">
                                            {product.image_url && (
                                                <img src={product.image_url} alt={product.name} className="w-full h-32 object-contain rounded-xl bg-white p-2" />
                                            )}
                                            <div>
                                                <h3 className="font-black text-slate-900 uppercase text-xs line-clamp-1">{product.name}</h3>
                                                <p className="text-indigo-600 font-black text-sm mt-1">
                                                    R$ {Number(product.price).toFixed(2)}
                                                </p>
                                            </div>

                                            {product.variants && product.variants.length > 0 && (
                                                <select
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                                                    value={inCart?.variant || ''}
                                                    onChange={(e) => {
                                                        const variant = e.target.value;
                                                        if (!variant) return;
                                                        setShopItems(prev => {
                                                            const exists = prev.find(i => i.product_id === product.id);
                                                            if (exists) {
                                                                return prev.map(i => i.product_id === product.id ? { ...i, variant } : i);
                                                            }
                                                            return [...prev, { product_id: product.id, variant, quantity: 1 }];
                                                        });
                                                    }}
                                                >
                                                    <option value="">Selecione Tam.</option>
                                                    {product.variants.map((v: any) => {
                                                        const val = typeof v === 'object' ? v.value : v;
                                                        const sur = typeof v === 'object' ? v.surcharge : 0;
                                                        return <option key={val} value={val}>{val} {sur > 0 ? `(+R$ ${sur})` : ''}</option>;
                                                    })}
                                                </select>
                                            )}

                                            <div className="flex items-center gap-2">
                                                <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden">
                                                    <button
                                                        onClick={() => {
                                                            setShopItems(prev => {
                                                                const it = prev.find(i => i.product_id === product.id);
                                                                if (!it) return prev;
                                                                if (it.quantity === 1) return prev.filter(i => i.product_id !== product.id);
                                                                return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity - 1 } : i);
                                                            });
                                                        }}
                                                        className="px-2 py-1 hover:bg-slate-100 text-slate-400 font-bold"
                                                    >-</button>
                                                    <span className="px-2 py-1 font-black text-[10px] text-slate-900 min-w-[24px] text-center flex items-center justify-center">
                                                        {inCart?.quantity || 0}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setShopItems(prev => {
                                                                const it = prev.find(i => i.product_id === product.id);
                                                                if (it) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
                                                                return [...prev, { product_id: product.id, variant: product.variants?.[0]?.value || product.variants?.[0] || '', quantity: 1 }];
                                                            });
                                                        }}
                                                        className="px-2 py-1 hover:bg-slate-100 text-slate-400 font-bold"
                                                    >+</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {shopItems.length > 0 && (
                                <div className="bg-indigo-50 p-4 rounded-2xl space-y-2">
                                    <p className="text-[10px] font-black text-indigo-900 uppercase italic">Seu Carrinho</p>
                                    <div className="space-y-1">
                                        {shopItems.map(item => {
                                            const p = shopProducts.find(prod => prod.id === item.product_id);
                                            return (
                                                <div key={item.product_id} className="flex justify-between text-[10px] font-bold">
                                                    <span className="text-slate-600 italic">{item.quantity}x {p?.name} {item.variant}</span>
                                                    <span className="text-indigo-600">R$ {(item.quantity * Number(p?.price || 0)).toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="pt-2 border-t border-indigo-100 flex justify-between items-center font-black text-xs text-indigo-900 uppercase">
                                        <span>Total Adicional</span>
                                        <span>R$ {getShopTotal().toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => selectedCategory?.products_details?.length > 0 ? setStep(3) : setStep(2)} className="px-8 py-5 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-colors">Voltar</button>
                            <button
                                onClick={() => setStep(5)}
                                className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl flex items-center justify-center gap-3 transition-all"
                            >
                                Próximo Passo
                                <ArrowRight />
                            </button>
                        </div>
                    </div>
                )}

                {step === 5 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 italic">Cupom de Desconto</h2>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Tem um cupom?</label>
                                <div className="flex gap-2">
                                    <input
                                        className="flex-1 px-4 py-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold uppercase text-sm"
                                        placeholder="CÓDIGO"
                                        value={formData.coupon_code}
                                        onChange={e => {
                                            setFormData({ ...formData, coupon_code: e.target.value.toUpperCase() });
                                            setCouponInfo(null);
                                        }}
                                        disabled={!!couponInfo}
                                    />
                                    {!couponInfo ? (
                                        <button
                                            onClick={async () => {
                                                if (!formData.coupon_code) return;
                                                try {
                                                    setCouponValidating(true);
                                                    const response = await api.post('/cupom/validate', {
                                                        code: formData.coupon_code,
                                                        club_id: championship.club_id
                                                    });
                                                    setCouponInfo(response.data);
                                                } catch (err) {
                                                    alert("Cupom não encontrado ou expirado.");
                                                } finally {
                                                    setCouponValidating(false);
                                                }
                                            }}
                                            disabled={couponValidating || !formData.coupon_code}
                                            className="px-6 py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 disabled:opacity-50"
                                        >
                                            {couponValidating ? <Loader2 className="animate-spin w-4 h-4" /> : 'Aplicar'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setCouponInfo(null);
                                                setFormData({ ...formData, coupon_code: '' });
                                            }}
                                            className="px-6 py-4 bg-red-50 text-red-600 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-red-100"
                                        >
                                            Remover
                                        </button>
                                    )}
                                </div>

                                {couponInfo && (
                                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                                        <CheckCircle2 className="text-emerald-600" size={20} />
                                        <div>
                                            <p className="text-emerald-800 font-black text-xs uppercase">Cupom Aplicado!</p>
                                            <p className="text-emerald-600 text-[10px] font-bold">
                                                -{couponInfo.discount_type === 'percentage' ? `${couponInfo.discount_value}%` : `R$ ${couponInfo.discount_value}`} de desconto.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-slate-100 space-y-3">
                                <h3 className="font-black text-slate-900 uppercase text-xs italic">Resumo do Pedido</h3>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 font-bold uppercase">Inscrição ({selectedCategory?.name})</span>
                                    <span className="font-black text-slate-900">R$ {Number(selectedCategory?.price || 0).toFixed(2)}</span>
                                </div>
                                {getGiftsSurcharge() > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 font-bold uppercase italic border-l-2 border-slate-100 pl-2">Adicional Brindes (Variantes)</span>
                                        <span className="font-black text-slate-900">+ R$ {getGiftsSurcharge().toFixed(2)}</span>
                                    </div>
                                )}
                                {getShopTotal() > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 font-bold uppercase italic border-l-2 border-indigo-100 pl-2">Produtos Extra</span>
                                        <span className="font-black text-indigo-600">+ R$ {getShopTotal().toFixed(2)}</span>
                                    </div>
                                )}
                                {formData.is_pcd && (
                                    <div className="flex justify-between text-sm text-indigo-600 italic">
                                        <span className="font-bold uppercase">Desconto PCD (50%)</span>
                                        <span className="font-black">- R$ {((Number(selectedCategory?.price || 0) + getGiftsSurcharge()) * 0.5).toFixed(2)}</span>
                                    </div>
                                )}
                                {couponInfo && (
                                    <div className="flex justify-between text-sm text-emerald-600">
                                        <span className="font-bold uppercase">Desconto Cupom</span>
                                        <span className="font-black italic">
                                            -{couponInfo.discount_type === 'percentage'
                                                ? `R$ ${(((Number(selectedCategory?.price || 0) + getGiftsSurcharge()) * (formData.is_pcd ? 0.5 : 1) + getShopTotal()) * (couponInfo.discount_value / 100)).toFixed(2)}`
                                                : `R$ ${Number(couponInfo.discount_value).toFixed(2)}`}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-3 border-t-2 border-slate-900 border-dashed">
                                    <span className="font-black text-slate-900 uppercase text-lg italic">Total a Pagar</span>
                                    <span className="font-black text-indigo-600 text-2xl italic">
                                        R$ {calculateTotal().toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    if (championship.allow_shopping_registration) setStep(4);
                                    else if (selectedCategory?.products_details?.length > 0) setStep(3);
                                    else setStep(2);
                                }}
                                className="px-8 py-5 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={() => setStep(6)}
                                className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl flex items-center justify-center gap-3 transition-all"
                            >
                                Revisar Pedido
                                <ArrowRight />
                            </button>
                        </div>
                    </div>
                )}

                {step === 6 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 italic">Forma de Pagamento</h2>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => setChosenMethod('PIX')}
                                    className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${chosenMethod === 'PIX' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${chosenMethod === 'PIX' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <Smartphone size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-slate-900 uppercase text-xs">PIX (Instantâneo)</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Liberação imediata da inscrição</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setChosenMethod('CREDIT_CARD')}
                                    className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${chosenMethod === 'CREDIT_CARD' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${chosenMethod === 'CREDIT_CARD' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <CreditCard size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-slate-900 uppercase text-xs">Cartão de Crédito</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Parcele sua inscrição em até 12x</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setChosenMethod('BOLETO')}
                                    className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${chosenMethod === 'BOLETO' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${chosenMethod === 'BOLETO' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        <FileText size={24} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-black text-slate-900 uppercase text-xs">Boleto Bancário</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">Liberação em até 2 dias úteis</p>
                                    </div>
                                </button>
                            </div>

                            <div className="pt-6 border-t border-slate-100 space-y-3">
                                <h3 className="font-black text-slate-900 uppercase text-xs italic">Resumo Final</h3>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 font-bold uppercase">Total Geral</span>
                                    <span className="font-black text-indigo-600 text-xl italic">
                                        R$ {calculateTotal().toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={() => setStep(5)} className="px-8 py-5 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-colors">Voltar</button>
                            <button
                                onClick={handleRegister}
                                disabled={saving || !chosenMethod}
                                className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 shadow-xl flex items-center justify-center gap-3 transition-all"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        Gerando Cobrança...
                                    </>
                                ) : (
                                    <>
                                        {chosenMethod === 'PIX' ? 'Gerar PIX Agora' : 'Finalizar Pedido'}
                                        <ArrowRight />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {step === 7 && (
                    <div className="animate-in zoom-in-95 duration-500 text-center py-12 space-y-6">
                        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-100/50">
                            <CheckCircle2 size={48} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black text-slate-900 uppercase italic leading-none">
                                {registrationData?.status_payment === 'paid' ? 'Inscrição Confirmada!' :
                                    registrationData?.requires_payment ? 'Quase lá!' : 'Inscrição Confirmada!'}
                            </h2>
                            <p className="text-slate-500 font-medium max-w-sm mx-auto text-sm">
                                {registrationData?.discount_applied > 0 && (
                                    <span className="block text-green-600 font-bold mb-2">Desconto de {registrationData.discount_applied}% aplicado com sucesso!</span>
                                )}
                                {registrationData?.status_payment === 'paid'
                                    ? 'Sua vaga está garantida. Agora é só se preparar para o grande dia!'
                                    : registrationData?.requires_payment
                                        ? `Sua inscrição foi reservada. Para garantir sua vaga, realize o pagamento de R$ ${registrationData.price.toFixed(2)} via ${chosenMethod} abaixo.`
                                        : 'Sua vaga está garantida. Agora é só se preparar para o grande dia!'}
                            </p>
                        </div>

                        {registrationData?.status_payment === 'paid' && (
                            <div className="mt-8 animate-in zoom-in-95 duration-700">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic mb-4">Sua Arte de Confirmado</p>
                                <div className="max-w-[280px] mx-auto group">
                                    <div className="aspect-[4/5] bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 shadow-2xl shadow-indigo-200/50 relative">
                                        <img
                                            src={`${import.meta.env.VITE_API_URL || '/api'}/art/championship/${id}/individual/${registrationData.user_id}/atleta_confirmado`}
                                            alt="Atleta Confirmado"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-6">
                                        <button
                                            onClick={async () => {
                                                const url = `${import.meta.env.VITE_API_URL || '/api'}/art/championship/${id}/individual/${registrationData.user_id}/atleta_confirmado`;
                                                try {
                                                    const response = await fetch(url);
                                                    const blob = await response.blob();
                                                    const link = document.createElement('a');
                                                    link.href = window.URL.createObjectURL(blob);
                                                    link.download = `confirmacao-${registrationData.user_id}.jpg`;
                                                    link.click();
                                                } catch (e) { toast.error("Erro ao baixar arte"); }
                                            }}
                                            className="py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                                        >
                                            <Download size={16} /> Baixar
                                        </button>
                                        <button
                                            onClick={() => {
                                                const url = `${import.meta.env.VITE_API_URL || '/api'}/art/championship/${id}/individual/${registrationData.user_id}/atleta_confirmado`;
                                                if (navigator.share) {
                                                    navigator.share({
                                                        title: 'Estou confirmado!',
                                                        text: `Confirmado no ${championship?.name}!`,
                                                        url: url
                                                    });
                                                } else { window.open(url, '_blank'); }
                                            }}
                                            className="py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95"
                                        >
                                            <Share2 size={16} /> Postar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {registrationData?.status_payment !== 'paid' && registrationData?.requires_payment && (
                            <div className="max-w-xs mx-auto space-y-4">
                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center gap-3">
                                    <div className="animate-pulse bg-amber-400 w-2 h-2 rounded-full"></div>
                                    <p className="text-amber-800 text-[10px] font-black uppercase italic">Verificando pagamento...</p>
                                </div>
                                {registrationData?.payment_data?.pix_qr_code && chosenMethod === 'PIX' && (
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center gap-4">
                                        <img
                                            src={registrationData.payment_data.pix_qr_code.startsWith('data:')
                                                ? registrationData.payment_data.pix_qr_code
                                                : `data:image/png;base64,${registrationData.payment_data.pix_qr_code}`}
                                            alt="PIX QR Code"
                                            className="w-48 h-48 rounded-lg shadow-sm"
                                        />
                                        <div className="w-full space-y-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Código Copia e Cola</p>
                                            <div className="flex gap-2">
                                                <input
                                                    readOnly
                                                    value={registrationData.payment_data.pix_copy_paste}
                                                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-mono truncate"
                                                />
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(registrationData.payment_data.pix_copy_paste);
                                                        alert('Código copiado!');
                                                    }}
                                                    className="px-3 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase"
                                                >
                                                    Copiar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {chosenMethod === 'CREDIT_CARD' && registrationData?.payment_data?.invoice_url && (
                                    <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl flex flex-col items-center gap-4">
                                        <CreditCard className="text-indigo-600 w-12 h-12" />
                                        <div className="text-center">
                                            <p className="text-indigo-900 font-black text-sm uppercase">Pagamento via Cartão</p>
                                            <p className="text-indigo-600/70 text-[10px] font-bold uppercase mt-1">Clique no botão abaixo para ir ao checkout seguro</p>
                                        </div>
                                        <a
                                            href={registrationData.payment_data.invoice_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest text-center hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                                        >
                                            Pagar com Cartão
                                        </a>
                                    </div>
                                )}

                                {chosenMethod === 'BOLETO' && registrationData?.payment_data?.invoice_url && (
                                    <div className="bg-slate-900 p-6 rounded-2xl flex flex-col items-center gap-4">
                                        <FileText className="text-white w-12 h-12" />
                                        <div className="text-center">
                                            <p className="text-white font-black text-sm uppercase">Pagamento via Boleto</p>
                                            <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">O boleto foi gerado com sucesso</p>
                                        </div>
                                        <a
                                            href={registrationData.payment_data.invoice_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full py-4 bg-white text-slate-900 rounded-xl font-black uppercase text-xs tracking-widest text-center hover:bg-slate-100 transition-all"
                                        >
                                            Imprimir Boleto
                                        </a>
                                    </div>
                                )}

                                {/* Opções de Troca de Método */}
                                {registrationData?.requires_payment && !saving && (
                                    <div className="pt-4 border-t border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Alterar forma de pagamento</p>
                                        <div className="flex justify-center gap-2">
                                            {chosenMethod !== 'PIX' && (
                                                <button
                                                    onClick={() => handleRecreatePayment('PIX')}
                                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                                >
                                                    Pagar via PIX
                                                </button>
                                            )}
                                            {chosenMethod !== 'CREDIT_CARD' && (
                                                <button
                                                    onClick={() => handleRecreatePayment('CREDIT_CARD')}
                                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                                >
                                                    Pagar com Cartão
                                                </button>
                                            )}
                                            {chosenMethod !== 'BOLETO' && (
                                                <button
                                                    onClick={() => handleRecreatePayment('BOLETO')}
                                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                                >
                                                    Pagar com Boleto
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {saving && (
                                    <div className="flex items-center justify-center gap-2 py-4">
                                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                                        <span className="text-[10px] font-black uppercase text-indigo-600">Atualizando forma de pagamento...</span>
                                    </div>
                                )}
                                {registrationData?.payment_data?.expiration && (
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">
                                        Vence em: {new Date(registrationData.payment_data.expiration).toLocaleDateString()}
                                    </p>
                                )}

                                {registrationData?.requires_payment && !registrationData?.payment_data && (
                                    <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center">
                                        <AlertCircle className="text-amber-600 mx-auto mb-2" />
                                        <p className="text-amber-800 font-bold text-sm">Houve um atraso na geração do seu pagamento.</p>
                                        <p className="text-amber-600 text-[10px] mt-1">Sua inscrição foi reservada. Você receberá os dados de pagamento em seu e-mail em instantes ou pode tentar novamente na área do atleta.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="pt-8 flex flex-col gap-3 max-w-xs mx-auto">
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

export default RaceRegister;
