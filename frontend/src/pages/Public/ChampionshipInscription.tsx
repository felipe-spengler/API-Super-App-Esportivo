import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    CheckCircle, CreditCard, Users, User, Trophy,
    ArrowRight, ArrowLeft, Upload, Loader2, Tag,
    FileText, Smartphone
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export function ChampionshipInscription() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, signIn } = useAuth();

    // States
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [championship, setChampionship] = useState<any>(null);

    // Form Data
    const [selectedCategory, setSelectedCategory] = useState<any>(null);
    const [inscriptionType, setInscriptionType] = useState<'individual' | 'team'>('team');

    // Team Data
    const [teamName, setTeamName] = useState('');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Payment Data
    const [coupon, setCoupon] = useState('');
    const [discount, setDiscount] = useState(0);
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    // Product/Variants Data
    const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
    const [giftSelections, setGiftSelections] = useState<Record<number, string>>({});
    const [couponInfo, setCouponInfo] = useState<any>(null);
    const [chosenMethod, setChosenMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX');
    const [registrationData, setRegistrationData] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, [id]);

    useEffect(() => {
        if (selectedCategory?.included_products) {
            loadCategoryProducts();
        } else {
            setCategoryProducts([]);
        }
    }, [selectedCategory]);

    async function loadData() {
        try {
            const response = await api.get(`/championships/${id}`);
            setChampionship(response.data);

            // Set default type from championship settings if enforced
            if (response.data.registration_type) {
                setInscriptionType(response.data.registration_type);
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao carregar campeonato");
            navigate('/explore');
        } finally {
            setLoading(false);
        }
    }

    async function loadCategoryProducts() {
        if (!selectedCategory?.included_products || selectedCategory.included_products.length === 0) {
            return;
        }

        try {
            const productIds = selectedCategory.included_products.map((item: any) => item.product_id);
            const response = await api.get('/public/products', { params: { ids: productIds.join(',') } });

            // Combinar produtos com informações da categoria
            const productsWithInfo = selectedCategory.included_products.map((item: any) => {
                const product = response.data.find((p: any) => p.id === item.product_id);
                return product ? {
                    ...item,
                    product
                } : null;
            }).filter(Boolean);

            setCategoryProducts(productsWithInfo);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    }



    const currentPrice = selectedCategory?.price || 0;
    const finalPrice = Math.max(0, currentPrice - discount);

    async function validateCoupon() {
        if (!coupon) return;
        setIsValidatingCoupon(true);
        try {
            const res = await api.post('/cupom/validate', { code: coupon, championship_id: id });
            if (res.data.valid) {
                setDiscount(res.data.discount);
                alert('Cupom aplicado com sucesso!');
            } else {
                setDiscount(0);
                alert('Cupom inválido.');
            }
        } catch (error) {
            console.error(error);
            setDiscount(0);
            alert('Erro ao validar cupom.');
        } finally {
            setIsValidatingCoupon(false);
        }
    }

    async function handleSubmit() {
        if (!user) {
            alert('Faça login para continuar');
            navigate('/login', { state: { from: `/inscription/${id}` } });
            return;
        }

        setProcessing(true);
        try {
            // 1. Create Inscription / Team
            const payload = {
                championship_id: id,
                category_id: selectedCategory.id,
                team_name: teamName,
                coupon_code: coupon,
                payment_method: chosenMethod,
                gifts: Object.entries(giftSelections).map(([productId, variant]) => ({
                    product_id: productId,
                    variant: variant
                }))
            };

            const response = await api.post('/inscriptions/team', payload); // Reuse existing endpoint or new one

            // 2. Mock Payment
            setRegistrationData(response.data);
            setStep(6);
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.message || 'Erro ao realizar inscrição.');
        } finally {
            setProcessing(false);
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Steps Header */}
            <div className="bg-white border-b border-gray-200 p-4">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(-1)}><ArrowLeft className="text-gray-500" /></button>
                        <span className="font-bold text-lg text-gray-800">Inscrição</span>
                    </div>
                    <div className="text-sm font-medium text-indigo-600">
                        Passo {step} de 5
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-6">

                {/* Step 1: Category Selection */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Escolha a Categoria</h2>
                        <p className="text-gray-500 mb-6">Selecione onde você deseja competir.</p>

                        <div className="grid gap-4">
                            {championship.categories?.map((cat: any) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`p-6 rounded-xl border-2 text-left transition-all flex items-center justify-between ${selectedCategory?.id === cat.id
                                        ? 'border-indigo-600 bg-indigo-50 shadow-md transform scale-[1.02]'
                                        : 'border-gray-100 bg-white hover:border-indigo-200'
                                        }`}
                                >
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{cat.name}</h3>
                                        <p className="text-sm text-gray-500">{cat.description || 'Sem descrição'}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-bold text-indigo-700 text-lg">
                                            {cat.price ? `R$ ${cat.price}` : 'Grátis'}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button
                                disabled={!selectedCategory}
                                onClick={() => setStep(2)}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                            >
                                Continuar <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Inscription Data (Auto-detected based on Championship Type) */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dados da Inscrição</h2>

                        {inscriptionType === 'team' ? (
                            <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4">
                                <div className="p-4 bg-indigo-50 text-indigo-900 rounded-lg mb-4 text-sm">
                                    <p><strong>Inscrição de Equipe:</strong> Você será o capitão responsável por gerenciar o elenco.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Time</label>
                                    <input
                                        type="text"
                                        value={teamName}
                                        onChange={e => setTeamName(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Ex: Os Boleiros FC"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Escudo (Opcional)</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors cursor-pointer">
                                        <Upload className="w-8 h-8 mb-2" />
                                        <span className="text-sm">Clique para upload</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-6 rounded-xl border border-gray-200">
                                <p className="text-gray-600">
                                    Você está se inscrevendo como <strong>Atleta Individual</strong>.
                                    Seus dados serão enviados para a organização e você poderá ser alocado em um time via sorteio.
                                </p>
                                <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                                    <span className="font-bold">Atenção:</span> Verifique se seu perfil está completo com documentos para agilizar a aprovação.
                                </div>
                            </div>
                        )}



                        <div className="mt-8 flex justify-between">
                            <button onClick={() => setStep(1)} className="text-gray-500 font-bold hover:text-gray-800">Voltar</button>
                            <button
                                disabled={!teamName}
                                onClick={() => {
                                    if (selectedCategory?.included_products?.length > 0) {
                                        setStep(3);
                                    } else {
                                        setStep(4);
                                    }
                                }}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                Continuar <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Gifts */}
                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 italic uppercase tracking-tight">
                                <Trophy className="w-5 h-5 text-indigo-600" /> Escolha seus Brindes
                            </h3>

                            <div className="space-y-8">
                                {championship.categories?.find((c: any) => c.id === selectedCategory.id)?.products_details?.map((item: any) => (
                                    <div key={item.product.id} className="space-y-4">
                                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div>
                                                <h4 className="font-bold text-gray-900 uppercase text-sm">{item.product.name}</h4>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">{item.quantity} unidade(s)</p>
                                            </div>
                                            {item.required && <span className="bg-amber-50 text-amber-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Obrigatório</span>}
                                        </div>

                                        {item.product.variants && (
                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                {item.product.variants.map((v: string) => (
                                                    <button
                                                        key={v}
                                                        onClick={() => setGiftSelections({ ...giftSelections, [item.product.id]: v })}
                                                        className={`py-2 px-3 rounded-lg border-2 font-bold text-xs uppercase transition-all ${giftSelections[item.product.id] === v
                                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                                            }`}
                                                    >
                                                        {v}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button onClick={() => setStep(2)} className="text-gray-500 font-bold hover:text-gray-800">Voltar</button>
                            <button
                                onClick={() => setStep(4)}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                            >
                                Continuar <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Coupon */}
                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Possui um Cupom?</h2>

                        <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                            <div className="flex gap-2">
                                <input
                                    value={coupon}
                                    onChange={e => {
                                        setCoupon(e.target.value.toUpperCase());
                                        setCouponInfo(null);
                                    }}
                                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg outline-none uppercase font-bold"
                                    placeholder="CÓDIGO"
                                />
                                <button
                                    onClick={async () => {
                                        setIsValidatingCoupon(true);
                                        try {
                                            const res = await api.post('/cupom/validate', { code: coupon, club_id: championship.club_id });
                                            setCouponInfo(res.data);
                                        } catch (err) {
                                            alert("Cupom inválido ou expirado.");
                                        } finally {
                                            setIsValidatingCoupon(false);
                                        }
                                    }}
                                    disabled={isValidatingCoupon || !coupon}
                                    className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50"
                                >
                                    {isValidatingCoupon ? <Loader2 className="animate-spin w-4 h-4" /> : 'Aplicar'}
                                </button>
                            </div>
                            {couponInfo && (
                                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="text-sm font-bold uppercase transition-all">
                                        Cupom Ativo: -{couponInfo.discount_type === 'percentage' ? `${couponInfo.discount_value}%` : `R$ ${couponInfo.discount_value}`}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between">
                            <button onClick={() => selectedCategory?.included_products?.length > 0 ? setStep(3) : setStep(2)} className="text-gray-500 font-bold hover:text-gray-800">Voltar</button>
                            <button
                                onClick={() => setStep(5)}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                            >
                                Revisar Pedido <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 5: Payment Selection */}
                {step === 5 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6 uppercase italic tracking-tight italic">Forma de Pagamento</h2>

                        <div className="grid gap-3 mb-6">
                            <button
                                onClick={() => setChosenMethod('PIX')}
                                className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${chosenMethod === 'PIX' ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-gray-100 bg-white'}`}
                            >
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${chosenMethod === 'PIX' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    <Users size={24} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900 uppercase text-sm italic">PIX Instantâneo</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Liberação imediata da inscrição</p>
                                </div>
                            </button>

                            <button
                                onClick={() => setChosenMethod('CREDIT_CARD')}
                                className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${chosenMethod === 'CREDIT_CARD' ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-gray-100 bg-white'}`}
                            >
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${chosenMethod === 'CREDIT_CARD' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    <CreditCard size={24} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900 uppercase text-sm italic">Cartão de Crédito</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Parcele em até 12x via Asaas</p>
                                </div>
                            </button>

                            <button
                                onClick={() => setChosenMethod('BOLETO')}
                                className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${chosenMethod === 'BOLETO' ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-gray-100 bg-white'}`}
                            >
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${chosenMethod === 'BOLETO' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    <FileText size={24} />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-900 uppercase text-sm italic">Boleto Bancário</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">Liberação em até 2 dias úteis</p>
                                </div>
                            </button>
                        </div>

                        <div className="bg-gray-100 p-6 rounded-xl space-y-3 mb-8">
                            <div className="flex justify-between text-gray-600 font-medium">
                                <span className="uppercase text-xs font-bold">Inscrição Sugerida</span>
                                <span>R$ {Number(selectedCategory.price).toFixed(2)}</span>
                            </div>
                            {couponInfo && (
                                <div className="flex justify-between text-emerald-600 font-bold">
                                    <span className="uppercase text-xs">Desconto Cupom</span>
                                    <span>
                                        -{couponInfo.discount_type === 'percentage'
                                            ? `R$ ${(Number(selectedCategory.price) * (couponInfo.discount_value / 100)).toFixed(2)}`
                                            : `R$ ${Number(couponInfo.discount_value).toFixed(2)}`}
                                    </span>
                                </div>
                            )}
                            <div className="border-t-2 border-dashed border-gray-300 pt-3 flex justify-between items-center">
                                <span className="font-black text-gray-900 uppercase text-lg italic">Total a Pagar</span>
                                <span className="font-black text-indigo-600 text-2xl italic tracking-tight">
                                    R$ {Math.max(0, (
                                        Number(selectedCategory.price) -
                                        (couponInfo ? (couponInfo.discount_type === 'percentage' ? Number(selectedCategory.price) * (couponInfo.discount_value / 100) : Number(couponInfo.discount_value)) : 0)
                                    )).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button onClick={() => setStep(4)} className="text-gray-500 font-bold hover:text-gray-800">Voltar</button>
                            <button
                                onClick={handleSubmit}
                                disabled={processing}
                                className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-indigo-100 transition-all"
                            >
                                {processing ? <Loader2 className="animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                {finalPrice === 0 ? 'Concluir Inscrição' : 'Confirmar e Pagar'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 6: Success */}
                {step === 6 && (
                    <div className="animate-in zoom-in-95 duration-500 text-center py-12 space-y-8">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-50">
                            <CheckCircle size={40} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-gray-900 uppercase italic">Inscrição realizada!</h2>
                            <p className="text-gray-500 font-medium">
                                {registrationData?.requires_payment
                                    ? `Equipe reservada. Conclua o pagamento via ${chosenMethod} para oficializar.`
                                    : 'Parabéns! Sua equipe já está confirmada no campeonato.'}
                            </p>
                        </div>

                        {registrationData?.requires_payment && (
                            <div className="max-w-xs mx-auto space-y-6">
                                {registrationData?.payment_data?.pix_qr_code && chosenMethod === 'PIX' && (
                                    <div className="bg-white p-6 rounded-2xl border border-dashed border-gray-200 shadow-sm flex flex-col items-center gap-4">
                                        <img
                                            src={`data:image/png;base64,${registrationData.payment_data.pix_qr_code}`}
                                            alt="PIX QR Code"
                                            className="w-48 h-48"
                                        />
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(registrationData.payment_data.pix_copy_paste);
                                                alert('Copiado!');
                                            }}
                                            className="w-full py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-100 transition-all"
                                        >
                                            Copia e Cola PIX
                                        </button>
                                    </div>
                                )}

                                {registrationData?.payment_data?.invoice_url && (chosenMethod === 'CREDIT_CARD' || chosenMethod === 'BOLETO') && (
                                    <a
                                        href={registrationData.payment_data.invoice_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full py-4 bg-indigo-600 text-white rounded-xl font-bold uppercase text-sm tracking-widest text-center hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
                                    >
                                        {chosenMethod === 'CREDIT_CARD' ? 'Pagar com Cartão' : 'Ver Boleto'}
                                    </a>
                                )}
                            </div>
                        )}

                        <div className="pt-8 flex flex-col gap-3">
                            <button
                                onClick={() => navigate(`/profile/teams/${registrationData?.team_id}`)}
                                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-gray-800 transition-all"
                            >
                                Gerenciar Meu Time
                            </button>
                            <button
                                onClick={() => navigate('/profile/inscriptions')}
                                className="w-full py-4 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-gray-50 transition-all"
                            >
                                Minhas Inscrições
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
