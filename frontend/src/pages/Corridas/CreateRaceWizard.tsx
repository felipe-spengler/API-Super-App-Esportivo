import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Trash2, Plus, Info, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Interfaces
interface Subcategory {
    name: string;
    min_age: string;
    max_age: string;
    gender: string;
}

interface Category {
    name: string;
    price: string;
    subcategories: Subcategory[];
    included_products?: Array<{
        product_id: string | number;
        quantity: number;
        required: boolean;
    }>;
}

interface RaceWizardData {
    general: {
        name: string;
        start_date: string;
        location: string;
        description: string;
        sport: string;
        kits_info: string;
    };
    categories: Category[];
    products: any[]; // Se for implementar produtos depois
}

export function CreateRaceWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);

    // Estado Gigante do Wizard
    const [formData, setFormData] = useState<RaceWizardData>({
        general: {
            name: '',
            start_date: '',
            location: '',
            description: '',
            sport: 'Running', // Running, MTB, Cycling
            kits_info: ''
        },
        categories: [],
        products: []
    });

    // Handlers Genéricos
    const updateGeneral = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, general: { ...prev.general, [field]: value } }));
    };

    // Handlers de Categoria
    const addCategory = () => {
        setFormData(prev => ({
            ...prev,
            categories: [...prev.categories, { name: '', price: '0', subcategories: [], included_products: [] }]
        }));
    };

    const updateCategory = (idx: number, field: string, value: any) => {
        const newCats = [...formData.categories];
        newCats[idx] = { ...newCats[idx], [field]: value };
        setFormData({ ...formData, categories: newCats });
    };

    const removeCategory = (idx: number) => {
        const newCats = [...formData.categories];
        newCats.splice(idx, 1);
        setFormData({ ...formData, categories: newCats });
    };

    const addSubcategory = (catIdx: number) => {
        const newCats = [...formData.categories];
        newCats[catIdx].subcategories.push({ name: '', min_age: '', max_age: '', gender: 'MISTO' });
        setFormData({ ...formData, categories: newCats });
    };

    const updateSubcategory = (catIdx: number, subIdx: number, field: string, value: any) => {
        const newCats = [...formData.categories];
        newCats[catIdx].subcategories[subIdx] = { ...newCats[catIdx].subcategories[subIdx], [field]: value };
        setFormData({ ...formData, categories: newCats });
    };

    const removeSubcategory = (catIdx: number, subIdx: number) => {
        const newCats = [...formData.categories];
        newCats[catIdx].subcategories.splice(subIdx, 1);
        setFormData({ ...formData, categories: newCats });
    };

    // Carregar produtos disponíveis
    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        try {
            const response = await api.get('/public/products');
            setAvailableProducts(response.data);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
        }
    }

    // Handlers de Produtos nas Categorias
    const addProductToCategory = (catIdx: number) => {
        const newCats = [...formData.categories];
        if (!newCats[catIdx].included_products) {
            newCats[catIdx].included_products = [];
        }
        newCats[catIdx].included_products.push({ product_id: '', quantity: 1, required: true });
        setFormData({ ...formData, categories: newCats });
    };

    const updateCategoryProduct = (catIdx: number, prodIdx: number, field: string, value: any) => {
        const newCats = [...formData.categories];
        newCats[catIdx].included_products[prodIdx] = {
            ...newCats[catIdx].included_products[prodIdx],
            [field]: value
        };
        setFormData({ ...formData, categories: newCats });
    };

    const removeCategoryProduct = (catIdx: number, prodIdx: number) => {
        const newCats = [...formData.categories];
        newCats[catIdx].included_products.splice(prodIdx, 1);
        setFormData({ ...formData, categories: newCats });
    };

    // Submit Final
    const handleFinish = async () => {
        setLoading(true);
        try {
            // Validar dados básicos antes de enviar
            if (!formData.general.name || !formData.general.start_date) {
                alert("Preencha os dados gerais do evento!");
                setStep(1);
                setLoading(false);
                return;
            }

            // Enviar JSON gigante para o endpoint novo
            await api.post('/admin/race-wizard', formData);
            alert('Evento criado com sucesso!');
            navigate('/championships');
        } catch (error) {
            console.error(error);
            alert('Erro ao criar evento. Verifique os dados.');
        } finally {
            setLoading(false);
        }
    };

    // Render Steps
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header / Progress Bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-800">Criar Novo Evento</h1>
                        <div className="w-8"></div>
                    </div>

                    {/* Stepper Visual */}
                    <div className="flex items-center justify-between relative px-8">
                        {/* Linha de fundo */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10" />

                        {[1, 2, 3].map(s => (
                            <div key={s} className={`flex flex-col items-center gap-2 bg-white px-2`}>
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                                        ${step >= s ? 'bg-indigo-600 text-white scale-110 shadow-lg' : 'bg-gray-200 text-gray-500'}
                                    `}
                                >
                                    {s}
                                </div>
                                <span className={`text-xs font-semibold uppercase tracking-wider ${step >= s ? 'text-indigo-600' : 'text-gray-400'}`}>
                                    {s === 1 ? 'Geral' : s === 2 ? 'Categorias' : 'Revisão'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* STEP 1: GERAL */}
                {step === 1 && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                            <Info className="w-6 h-6 text-indigo-500" />
                            <h2 className="text-xl font-bold text-gray-800">Informações Básicas</h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Nome do Evento *</label>
                                <input
                                    type="text"
                                    value={formData.general.name}
                                    onChange={e => updateGeneral('name', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ex: Corrida Noturna 2026"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Tipo de Evento</label>
                                <select
                                    value={formData.general.sport}
                                    onChange={e => updateGeneral('sport', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                >
                                    <option value="Running">Corrida de Rua</option>
                                    <option value="Cycling">Ciclismo / Bike</option>
                                    <option value="MTB">Mountain Bike</option>
                                    <option value="Swimming">Natação</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Data e Hora *</label>
                                <input
                                    type="datetime-local"
                                    value={formData.general.start_date}
                                    onChange={e => updateGeneral('start_date', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Local</label>
                                <input
                                    type="text"
                                    value={formData.general.location}
                                    onChange={e => updateGeneral('location', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ex: Lago Municipal"
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Descrição</label>
                                <textarea
                                    value={formData.general.description}
                                    onChange={e => updateGeneral('description', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
                                    placeholder="Informações sobre o percurso, regras, etc..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-6">
                            <button
                                onClick={() => setStep(2)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                            >
                                Próximo: Categorias <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: CATEGORIAS */}
                {step === 2 && (
                    <div className="space-y-8">
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-800">
                                <strong>Como funciona:</strong> Crie as categorias principais (ex: 5km, 10km) e dentro delas adicione as subcategorias por faixa etária (ex: 18-29 anos).
                            </p>
                        </div>

                        {formData.categories.map((cat, catIdx) => (
                            <div key={catIdx} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                                {/* Header da Categoria Pai */}
                                <div className="bg-gray-50 p-6 border-b border-gray-200 flex justify-between items-start">
                                    <div className="grid md:grid-cols-2 gap-4 flex-1 mr-8">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Nome da Distância/Modalidade</label>
                                            <input
                                                type="text"
                                                value={cat.name}
                                                onChange={e => updateCategory(catIdx, 'name', e.target.value)}
                                                placeholder="Ex: 5km Geral"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-bold text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Preço Base (R$)</label>
                                            <input
                                                type="number"
                                                value={cat.price}
                                                onChange={e => updateCategory(catIdx, 'price', e.target.value)}
                                                placeholder="0,00"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg text-gray-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeCategory(catIdx)}
                                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Subcategorias */}
                                <div className="p-6 bg-white space-y-4">
                                    <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                                        <Users className="w-4 h-4" /> Subcategorias (Faixas Etárias)
                                    </h4>

                                    {cat.subcategories.length === 0 && (
                                        <p className="text-sm text-gray-400 italic">Nenhuma subcategoria adicionada ainda.</p>
                                    )}

                                    {cat.subcategories.map((sub, subIdx) => (
                                        <div key={subIdx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors">
                                            <div className="md:col-span-3 space-y-1">
                                                <label className="text-[10px] uppercase font-bold text-gray-500">Nome</label>
                                                <input
                                                    type="text"
                                                    value={sub.name}
                                                    onChange={e => updateSubcategory(catIdx, subIdx, 'name', e.target.value)}
                                                    placeholder="Ex: 18 a 29 anos"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase font-bold text-gray-500">Idade Mín</label>
                                                <input
                                                    type="number"
                                                    value={sub.min_age}
                                                    onChange={e => updateSubcategory(catIdx, subIdx, 'min_age', e.target.value)}
                                                    placeholder="0"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] uppercase font-bold text-gray-500">Idade Máx</label>
                                                <input
                                                    type="number"
                                                    value={sub.max_age}
                                                    onChange={e => updateSubcategory(catIdx, subIdx, 'max_age', e.target.value)}
                                                    placeholder="99"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                />
                                            </div>
                                            <button
                                                onClick={() => removeSubcategory(catIdx, subIdx)}
                                                className="md:col-span-1 flex items-center justify-center h-[38px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        onClick={() => addSubcategory(catIdx)}
                                        className="mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" /> Adicionar Faixa Etária
                                    </button>

                                    {/* Produtos Inclusos */}
                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                                                🎁 Produtos Inclusos (Brindes)
                                            </h4>
                                            <button
                                                onClick={() => navigate('/admin/products')}
                                                className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 font-bold transition-colors"
                                            >
                                                + Criar Novo Produto
                                            </button>
                                        </div>

                                        {(!cat.included_products || cat.included_products.length === 0) && (
                                            <p className="text-sm text-gray-400 italic">Nenhum produto vinculado. Atletas não receberão brindes nesta categoria.</p>
                                        )}

                                        {cat.included_products?.map((prod, prodIdx) => (
                                            <div key={prodIdx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 bg-indigo-50 rounded-xl border border-indigo-100 hover:border-indigo-300 transition-colors mb-3">
                                                <div className="md:col-span-5 space-y-1">
                                                    <label className="text-[10px] uppercase font-bold text-gray-500">Produto</label>
                                                    <select
                                                        value={prod.product_id}
                                                        onChange={e => updateCategoryProduct(catIdx, prodIdx, 'product_id', parseInt(e.target.value))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                    >
                                                        <option value="">Selecione um produto...</option>
                                                        {availableProducts.map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.name} {p.variants && `(${p.variants.map((v: any) => v.name).join(', ')})`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="md:col-span-2 space-y-1">
                                                    <label className="text-[10px] uppercase font-bold text-gray-500">Quantidade</label>
                                                    <input
                                                        type="number"
                                                        value={prod.quantity}
                                                        onChange={e => updateCategoryProduct(catIdx, prodIdx, 'quantity', parseInt(e.target.value))}
                                                        min="1"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div className="md:col-span-4 space-y-1">
                                                    <label className="text-[10px] uppercase font-bold text-gray-500">Obrigatório?</label>
                                                    <div className="flex items-center gap-4 h-[38px]">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                checked={prod.required === true}
                                                                onChange={() => updateCategoryProduct(catIdx, prodIdx, 'required', true)}
                                                                className="w-4 h-4"
                                                            />
                                                            <span className="text-sm font-medium text-gray-700">Sim</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                checked={prod.required === false}
                                                                onChange={() => updateCategoryProduct(catIdx, prodIdx, 'required', false)}
                                                                className="w-4 h-4"
                                                            />
                                                            <span className="text-sm font-medium text-gray-700">Não</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeCategoryProduct(catIdx, prodIdx)}
                                                    className="md:col-span-1 flex items-center justify-center h-[38px] text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}

                                        <button
                                            onClick={() => addProductToCategory(catIdx)}
                                            className="mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                        >
                                            <Plus className="w-4 h-4" /> Adicionar Produto Incluso
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addCategory}
                            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-bold hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus className="w-5 h-5" /> Adicionar Nova Distância (Ex: 10km)
                        </button>

                        <div className="flex justify-between pt-6 border-t border-gray-200 mt-8">
                            <button
                                onClick={() => setStep(1)}
                                className="text-gray-600 font-bold px-6 py-3 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                            >
                                Próximo: Revisão <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: REVISÃO E SALVAR */}
                {step === 3 && (
                    <div className="space-y-8">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                                <Check className="w-8 h-8 text-green-500" /> Confirmar Dados
                            </h2>

                            <div className="space-y-4 text-gray-700">
                                <p><strong>Evento:</strong> {formData.general.name}</p>
                                <p><strong>Data:</strong> {formData.general.start_date ? new Date(formData.general.start_date).toLocaleString() : '-'}</p>
                                <hr />
                                <p><strong>Categorias:</strong> {formData.categories.length}</p>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                                    {formData.categories.map((c, i) => (
                                        <li key={i}>{c.name} - R$ {c.price} ({c.subcategories.length} faixas etárias)</li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="flex justify-between pt-6">
                            <button
                                onClick={() => setStep(2)}
                                className="text-gray-600 font-bold px-6 py-3 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleFinish}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-xl flex items-center gap-3 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Salvando...' : 'FINALIZAR E PUBLICAR'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
