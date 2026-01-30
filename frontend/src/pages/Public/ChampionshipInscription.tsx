import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    CheckCircle, CreditCard, Users, User, Trophy,
    ArrowRight, ArrowLeft, Upload, Loader2, Tag
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

    useEffect(() => {
        loadData();
    }, [id]);

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
                type: inscriptionType,
                team_name: inscriptionType === 'team' ? teamName : user.name, // If individual, team name matches user? Or we handle differently.
                coupon_code: coupon
            };

            const response = await api.post('/inscriptions/team', payload); // Reuse existing endpoint or new one

            // 2. Mock Payment
            if (finalPrice > 0) {
                await new Promise(resolve => setTimeout(resolve, 1500)); // Simulating payment gateway
            }

            // 3. Success
            if (inscriptionType === 'team') {
                navigate(`/profile/teams/${response.data.team_id}`);
            } else {
                navigate('/profile/inscriptions');
            }
            alert('Inscrição realizada com sucesso!');

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
                        Passo {step} de 4
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
                                disabled={inscriptionType === 'team' && !teamName}
                                onClick={() => setStep(3)}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all"
                            >
                                Ir para Pagamento
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Payment & Coupon */}
                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Pagamento</h2>

                        <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Tag className="w-5 h-5 text-indigo-600" /> Possui Cupom?
                            </h3>
                            <div className="flex gap-2">
                                <input
                                    value={coupon}
                                    onChange={e => setCoupon(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg outline-none uppercase"
                                    placeholder="CÓDIGO"
                                />
                                <button
                                    onClick={validateCoupon}
                                    disabled={isValidatingCoupon || !coupon}
                                    className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50"
                                >
                                    {isValidatingCoupon ? '...' : 'Aplicar'}
                                </button>
                            </div>
                            {discount > 0 && (
                                <p className="text-green-600 text-sm font-bold mt-2">Desconto aplicado: R$ {discount.toFixed(2)}</p>
                            )}
                        </div>

                        <div className="bg-gray-50 p-6 rounded-xl space-y-3 mb-6">
                            <div className="flex justify-between text-gray-600">
                                <span>Inscrição ({selectedCategory.name})</span>
                                <span>{currentPrice === 0 ? 'Grátis' : `R$ ${currentPrice.toFixed(2)}`}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Desconto</span>
                                    <span>- R$ {discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="border-t border-gray-200 pt-3 flex justify-between text-xl font-bold text-gray-900">
                                <span>Total</span>
                                <span>{finalPrice === 0 ? 'Grátis' : `R$ ${finalPrice.toFixed(2)}`}</span>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button onClick={() => setStep(2)} className="text-gray-500 font-bold hover:text-gray-800">Voltar</button>
                            <button
                                onClick={handleSubmit}
                                disabled={processing}
                                className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all"
                            >
                                {processing ? <Loader2 className="animate-spin" /> : <CreditCard className="w-5 h-5" />}
                                {finalPrice === 0 ? 'Confirmar Inscrição' : 'Pagar Agora'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
