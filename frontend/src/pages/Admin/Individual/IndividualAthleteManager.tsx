import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
    Users, Search, Filter, Download, UserPlus, FileCheck, Mail, Wand2, 
    X, Table, Upload, AlertCircle, SlidersHorizontal, Shirt, UserCheck, Check, CreditCard, CheckCircle2 
} from 'lucide-react';
import api from '../../../services/api';
import { compressImage } from '../../../utils/imageCompressor';
import toast from 'react-hot-toast';

interface Athlete {
    id: number;
    name: string;
    team_name?: string;
    bib_number: string;
    category_id: number;
    category?: { name: string };
    phone?: string;
    status_payment: 'pending' | 'paid' | 'cancelled';
    payment_method?: string;
}

export function IndividualAthleteManager() {
    const { id } = useParams();
    const [athletes, setAthletes] = useState<Athlete[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Estados do Modal de Alteração de Pagamento (Backup Webhook)
    const [selectedAthleteForPayment, setSelectedAthleteForPayment] = useState<Athlete | null>(null);
    const [paymentModalStatus, setPaymentModalStatus] = useState<'pending' | 'paid' | 'cancelled'>('paid');
    const [paymentModalMethod, setPaymentModalMethod] = useState<string>('pix');
    const [paymentModalSendEmail, setPaymentModalSendEmail] = useState<boolean>(true);
    const [savingPayment, setSavingPayment] = useState<boolean>(false);

    // Estados do Modal de Exportação Personalizada
    const [showExportModal, setShowExportModal] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportCategory, setExportCategory] = useState<string>('all');
    const [exportPaymentStatus, setExportPaymentStatus] = useState<string>('all');
    const [exportOrderBy, setExportOrderBy] = useState<string>('category');
    const [selectedColumns, setSelectedColumns] = useState<string[]>([
        'bib_number',
        'name',
        'team_name',
        'category',
        'subcategory',
        'shirt_size',
        'gifts',
        'shop_items',
        'status_payment',
        'payment_method',
        'cpf',
        'phone',
        'birth_date',
        'age',
        'gender'
    ]);

    const EVENT_COLUMNS = [
        { id: 'bib_number', label: 'Número de Peito (BIB)', badge: 'Essencial' },
        { id: 'name', label: 'Nome do Atleta', badge: 'Essencial' },
        { id: 'team_name', label: 'Equipe / Time', badge: 'Prova' },
        { id: 'category', label: 'Categoria Principal', badge: 'Prova' },
        { id: 'subcategory', label: 'Subcategoria / Faixa Etária', badge: 'Prova' },
        { id: 'shirt_size', label: 'Tamanho da Camiseta', badge: 'Kit' },
        { id: 'gifts', label: 'Kit / Brindes Inclusos', badge: 'Kit' },
        { id: 'shop_items', label: 'Produtos Extras Comprados', badge: 'Loja' },
        { id: 'status_payment', label: 'Status do Pagamento', badge: 'Financeiro' },
        { id: 'payment_method', label: 'Forma de Pagamento', badge: 'Financeiro' },
        { id: 'kit_delivered', label: 'Kit Já Entregue?', badge: 'Logística' },
        { id: 'created_at', label: 'Data da Inscrição', badge: 'Registro' },
    ];

    const PERSONAL_COLUMNS = [
        { id: 'cpf', label: 'CPF / Documento', badge: 'Doc' },
        { id: 'phone', label: 'Telefone / WhatsApp', badge: 'Contato' },
        { id: 'email', label: 'E-mail', badge: 'Contato' },
        { id: 'birth_date', label: 'Data de Nascimento', badge: 'Pessoal' },
        { id: 'age', label: 'Idade Atual', badge: 'Pessoal' },
        { id: 'gender', label: 'Gênero / Sexo', badge: 'Pessoal' },
        { id: 'is_pcd', label: 'Atleta PCD?', badge: 'Saúde' },
        { id: 'address', label: 'Endereço Completo', badge: 'Localização' },
    ];

    const allColumnIds = [...EVENT_COLUMNS.map(c => c.id), ...PERSONAL_COLUMNS.map(c => c.id)];

    const toggleColumn = (colId: string) => {
        setSelectedColumns(prev =>
            prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
        );
    };

    const selectAllColumns = () => setSelectedColumns(allColumnIds);
    const selectEventColumnsOnly = () => setSelectedColumns(EVENT_COLUMNS.map(c => c.id));
    const selectPersonalColumnsOnly = () => setSelectedColumns(PERSONAL_COLUMNS.map(c => c.id));
    const deselectAllColumns = () => setSelectedColumns([]);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        document: '',
        birth_date: '',
        gender: '',
        team_name: '',
        category_id: '',
        remove_bg: true,
        status_payment: 'pending',
        payment_method: 'money'
    });
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadAthletes();
        loadCategories();
    }, [id]);

    async function loadAthletes() {
        try {
            setLoading(true);
            const response = await api.get(`/admin/races/${id}/results`);
            setAthletes(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function loadCategories() {
        try {
            const response = await api.get(`/admin/championships/${id}/categories-list`);
            // Organize hierarchically for the select
            const all = response.data as any[];
            const structured: any[] = [];
            const parents = all.filter(c => !c.parent_id);

            parents.forEach(p => {
                const children = all.filter(c => c.parent_id === p.id);
                if (children.length > 0) {
                    children.forEach(sub => {
                        structured.push({
                            id: sub.id,
                            name: `${p.name} > ${sub.name}`,
                            gender: sub.gender
                        });
                    });
                } else {
                    structured.push({
                        id: p.id,
                        name: p.name,
                        gender: p.gender
                    });
                }
            });

            setCategories(structured);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    }

    const handleAddAthlete = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                data.append(key, value.toString());
            });
            if (photoFile) {
                const compressed = await compressImage(photoFile, 2 * 1024 * 1024); // 2MB for athlete photos
                data.append('photo', compressed);
            }

            await api.post(`/admin/races/${id}/results`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setShowModal(false);
            setFormData({
                name: '',
                phone: '',
                document: '',
                birth_date: '',
                gender: '',
                team_name: '',
                category_id: '',
                remove_bg: true,
                status_payment: 'pending',
                payment_method: 'money'
            });
            setPhotoFile(null);
            setPhotoPreview(null);
            loadAthletes();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.error || 'Erro ao adicionar atleta');
        } finally {
            setSaving(false);
        }
    };

    const handleImportCSV = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        const data = new FormData();
        data.append('file', file);
        try {
            const res = await api.post(`/admin/races/${id}/results/import`, data);
            setShowImport(false);
            setFile(null);
            loadAthletes();

            let report = `${res.data.success_count} atletas importados com sucesso!`;
            if (res.data.errors && res.data.errors.length > 0) {
                report += `\n\nAlgumas linhas foram ignoradas:\n` + res.data.errors.join('\n');
            }
            alert(report);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao importar CSV');
        }
    };

    const handleConfirmExport = async () => {
        if (selectedColumns.length === 0) {
            toast.error('Selecione pelo menos uma coluna para exportar!');
            return;
        }

        const toastId = toast.loading('Gerando planilha personalizada...');
        setExporting(true);
        try {
            const params: any = {
                columns: selectedColumns.join(','),
                order_by: exportOrderBy
            };
            if (exportCategory && exportCategory !== 'all') {
                params.category_id = exportCategory;
            }
            if (exportPaymentStatus && exportPaymentStatus !== 'all') {
                params.status_payment = exportPaymentStatus;
            }
            if (searchTerm) {
                params.search = searchTerm;
            }

            const response = await api.get(`/admin/championships/${id}/results/export`, {
                params,
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `lista_atletas_${id}_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Lista de atletas exportada com sucesso!', { id: toastId });
            setShowExportModal(false);
        } catch (error: any) {
            console.error('Erro ao exportar:', error);
            toast.error('Erro ao exportar lista de atletas', { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    const openPaymentModal = (athlete: Athlete) => {
        setSelectedAthleteForPayment(athlete);
        setPaymentModalStatus(athlete.status_payment || 'paid');
        setPaymentModalMethod(athlete.payment_method || 'pix');
        setPaymentModalSendEmail(true);
    };

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAthleteForPayment) return;

        setSavingPayment(true);
        const toastId = toast.loading('Atualizando pagamento...');
        try {
            await api.patch(`/admin/results/${selectedAthleteForPayment.id}/payment`, {
                status_payment: paymentModalStatus,
                payment_method: paymentModalMethod,
                send_email: paymentModalSendEmail
            });

            // Atualiza na listagem local
            setAthletes(prev => prev.map(a => 
                a.id === selectedAthleteForPayment.id 
                    ? { ...a, status_payment: paymentModalStatus, payment_method: paymentModalMethod } 
                    : a
            ));

            toast.success('Status de pagamento atualizado com sucesso!', { id: toastId });
            setSelectedAthleteForPayment(null);
        } catch (error: any) {
            console.error('Erro ao atualizar pagamento:', error);
            toast.error(error.response?.data?.error || 'Erro ao atualizar pagamento', { id: toastId });
        } finally {
            setSavingPayment(false);
        }
    };

    const handleResendEmail = async (athleteId: number) => {
        try {
            const toastId = toast.loading('Enviando e-mail...');
            await api.post(`/admin/results/${athleteId}/resend-email`);
            toast.success('E-mail enviado com sucesso!', { id: toastId });
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Erro ao reenviar e-mail');
        }
    };

    const filteredAthletes = athletes.filter(a => {
        const matchesSearch = (a.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (a.team_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (a.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (a.bib_number?.includes(searchTerm));
        const matchesCategory = selectedCategory === 'all' || a.category_id?.toString() === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 leading-tight">Gestão de Inscritos</h1>
                    <p className="text-slate-500 font-medium">Gerencie atletas, números de peito e categorias para o pódio.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-slate-200">
                        <button
                            onClick={() => setShowImport(true)}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all font-bold text-sm"
                        >
                            <Upload size={18} />
                            Importar CSV
                        </button>
                        <button
                            onClick={() => {
                                setExportCategory(selectedCategory);
                                setShowExportModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all font-bold text-sm border-l border-slate-100"
                            title="Personalizar e exportar lista de atletas"
                        >
                            <SlidersHorizontal size={18} className="text-indigo-600" />
                            Exportar Lista
                        </button>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 font-black transition-all shadow-xl uppercase tracking-widest text-xs"
                    >
                        <UserPlus size={18} />
                        Cadastrar Atleta
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, número ou categoria..."
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[20px] focus:ring-2 focus:ring-indigo-500 outline-none font-bold shadow-sm transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-64 relative group">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                    <select
                        className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[20px] focus:ring-2 focus:ring-indigo-500 outline-none font-bold shadow-sm transition-all appearance-none"
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                    >
                        <option value="all">Todas Categorias</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500 font-medium italic">Carregando inscritos...</div>
                ) : filteredAthletes.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Users className="text-slate-200" size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Nenhum atleta encontrado</h3>
                        <p className="text-slate-500 font-medium">Cadastre atletas manualmente com foto e dados completos.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Atleta / Peito</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredAthletes.map(athlete => (
                                    <tr key={athlete.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center font-black text-slate-400 text-xs shrink-0 bg-slate-900 text-white">
                                                    {athlete.bib_number || '--'}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 uppercase text-sm leading-tight">{athlete.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        <p className="text-xs text-slate-400 font-medium">#{athlete.id}</p>
                                                        {athlete.team_name && (
                                                            <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded">
                                                                {athlete.team_name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg uppercase border border-indigo-100/50">
                                                {athlete.category?.name || 'Geral'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div 
                                                onClick={() => openPaymentModal(athlete)}
                                                className="flex flex-col gap-1 cursor-pointer group hover:opacity-80 transition-opacity"
                                                title="Clique para alterar pagamento"
                                            >
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${athlete.status_payment === 'paid'
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : athlete.status_payment === 'cancelled'
                                                        ? 'bg-rose-50 text-rose-600'
                                                        : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${athlete.status_payment === 'paid'
                                                        ? 'bg-emerald-500'
                                                        : athlete.status_payment === 'cancelled'
                                                            ? 'bg-rose-500'
                                                            : 'bg-amber-500'
                                                        }`} />
                                                    {athlete.status_payment === 'paid' ? 'Pago' : athlete.status_payment === 'cancelled' ? 'Cancelado' : 'Pendente'}
                                                </span>
                                                <span className="text-[9px] text-slate-400 uppercase font-bold px-2 italic group-hover:text-indigo-600 transition-colors">
                                                    {athlete.payment_method || 'N/A'} (alterar)
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button 
                                                    onClick={() => openPaymentModal(athlete)}
                                                    title="Alterar Pagamento (Backup Webhook)"
                                                    className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                >
                                                    <CreditCard size={20} />
                                                </button>
                                                <a
                                                    href={`${import.meta.env.VITE_API_URL || '/api'}/art/championship/${id}/individual/${athlete.id}/atleta_confirmado?category_name=${athlete.category?.name || ''}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                    title="Gerar Arte: Confirmado"
                                                >
                                                    <Wand2 size={20} />
                                                </a>
                                                <button 
                                                    onClick={() => handleResendEmail(athlete.id)}
                                                    title="Reenviar E-mail"
                                                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                >
                                                    <Mail size={20} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Add Manual */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
                    <div className="bg-white rounded-[24px] md:rounded-[32px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
                        <div className="p-5 md:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">Novo Atleta</h2>
                                <p className="text-slate-500 font-medium text-xs md:text-sm">Preencha os dados obrigatórios do perfil.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white hover:shadow-md rounded-full transition-all">
                                <X size={20} className="md:w-6 md:h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleAddAthlete} className="p-5 md:p-8 space-y-4 md:space-y-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                {/* Photo Side */}
                                <div className="space-y-4">
                                    <div className="relative group max-w-[200px] md:max-w-none mx-auto w-full">
                                        <div className="aspect-square bg-slate-50 rounded-[20px] md:rounded-[28px] border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                                            {photoPreview ? (
                                                <img src={photoPreview} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center p-6">
                                                    <Users className="mx-auto text-slate-200 mb-2" size={48} />
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sua Foto aqui</p>
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute -bottom-3 -right-3 p-4 bg-indigo-600 text-white rounded-2xl cursor-pointer hover:bg-indigo-700 transition-all shadow-xl hover:scale-105 active:scale-95 group-hover:rotate-6">
                                            <Upload size={24} />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                required
                                                onChange={e => {
                                                    const f = e.target.files?.[0];
                                                    if (f) {
                                                        setPhotoFile(f);
                                                        setPhotoPreview(URL.createObjectURL(f));
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="remove_bg"
                                            checked={formData.remove_bg}
                                            onChange={e => setFormData({ ...formData, remove_bg: e.target.checked })}
                                            className="w-5 h-5 accent-indigo-600 rounded-lg cursor-pointer"
                                        />
                                        <label htmlFor="remove_bg" className="text-xs font-bold text-indigo-700 cursor-pointer select-none">
                                            Remover fundo da foto automaticamente (IA)
                                        </label>
                                    </div>
                                </div>

                                {/* Form Side */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ex: João da Silva"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Celular (WhatsApp)</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">CPF ou RG</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                            value={formData.document}
                                            onChange={e => setFormData({ ...formData, document: e.target.value })}
                                            placeholder="000.000.000-00"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nascimento</label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                                value={formData.birth_date}
                                                onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sexo</label>
                                            <select
                                                required
                                                className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                                value={formData.gender}
                                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                            >
                                                <option value="">...</option>
                                                <option value="M">Masculino</option>
                                                <option value="F">Feminino</option>
                                                <option value="O">Outro</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Subcategoria / Corrida</label>
                                        <select
                                            required
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                            value={formData.category_id}
                                            onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                            Equipe <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all uppercase"
                                            value={formData.team_name}
                                            onChange={e => setFormData({ ...formData, team_name: e.target.value })}
                                            placeholder="Ex: Equipe Velozes"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status Pagto</label>
                                            <select
                                                className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                                value={formData.status_payment}
                                                onChange={e => setFormData({ ...formData, status_payment: e.target.value })}
                                            >
                                                <option value="pending">Pendente</option>
                                                <option value="paid">Pago</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Método</label>
                                            <select
                                                className="w-full px-3 py-3 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                                                value={formData.payment_method}
                                                onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                                            >
                                                <option value="money">Dinheiro</option>
                                                <option value="pix">Pix Manual</option>
                                                <option value="credit_card">Cartão</option>
                                                <option value="courtesy">Cortesia</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-4 md:py-5 bg-indigo-600 text-white rounded-2xl md:rounded-3xl font-black text-base md:text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
                            >
                                {saving ? (
                                    <>Aguarde, Processando Foto (IA)...</>
                                ) : (
                                    <>
                                        <FileCheck size={20} className="md:w-6 md:h-6" />
                                        Finalizar Cadastro
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Import CSV */}
            {showImport && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900">Importar Inscritos (CSV)</h2>
                            <button onClick={() => setShowImport(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleImportCSV} className="p-6 space-y-4">
                            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                                <Table className="mx-auto text-slate-300" size={48} />
                                <p className="text-slate-500 text-sm font-medium">Use colunas: PETO, NOME, CATEGORIA</p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="csv-file"
                                />
                                <label
                                    htmlFor="csv-file"
                                    className="inline-block px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold cursor-pointer hover:bg-indigo-100"
                                >
                                    {file ? file.name : 'Selecionar Arquivo'}
                                </label>
                            </div>
                            <button
                                disabled={!file}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Iniciar Importação
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Exportação Personalizada de Atletas */}
            {showExportModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                    <Download size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 leading-tight">Exportar Lista de Atletas</h2>
                                    <p className="text-xs text-slate-500 font-medium">Personalize as colunas, filtros e ordenação da planilha.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowExportModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body - Scrollable */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                            {/* Filtros e Ordenação */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                        Filtrar Categoria
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={exportCategory}
                                        onChange={e => setExportCategory(e.target.value)}
                                    >
                                        <option value="all">Todas as Categorias</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                        Status Pagamento
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={exportPaymentStatus}
                                        onChange={e => setExportPaymentStatus(e.target.value)}
                                    >
                                        <option value="all">Todos os Status</option>
                                        <option value="paid">Apenas Pagos (Confirmados)</option>
                                        <option value="pending">Apenas Pendentes</option>
                                        <option value="cancelled">Apenas Cancelados</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                                        Ordem da Lista
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={exportOrderBy}
                                        onChange={e => setExportOrderBy(e.target.value)}
                                    >
                                        <option value="category">Categoria &gt; Subcat. &gt; Nome (A-Z)</option>
                                        <option value="name">Ordem Alfabética (A-Z)</option>
                                        <option value="bib">Número de Peito (BIB)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Ações Rápidas de Seleção de Colunas */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <SlidersHorizontal size={14} className="text-indigo-600" />
                                    Colunas Selecionadas ({selectedColumns.length} de {allColumnIds.length})
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                                    <button
                                        type="button"
                                        onClick={selectAllColumns}
                                        className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors"
                                    >
                                        Todas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={selectEventColumnsOnly}
                                        className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                    >
                                        Apenas Prova/Kit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={selectPersonalColumnsOnly}
                                        className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                    >
                                        Apenas Pessoais
                                    </button>
                                    <button
                                        type="button"
                                        onClick={deselectAllColumns}
                                        className="px-2.5 py-1 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Desmarcar
                                    </button>
                                </div>
                            </div>

                            {/* Seção 1: Dados do Evento / Prova */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                                    <Shirt size={14} />
                                    Dados do Atleta na Prova (Evento, Kit e Camiseta)
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {EVENT_COLUMNS.map(col => {
                                        const isSelected = selectedColumns.includes(col.id);
                                        return (
                                            <div
                                                key={col.id}
                                                onClick={() => toggleColumn(col.id)}
                                                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 font-bold'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
                                                        isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                                                    }`}>
                                                        {isSelected && <Check size={12} strokeWidth={3} />}
                                                    </div>
                                                    <span className="text-xs">{col.label}</span>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                                    isSelected ? 'bg-indigo-200/60 text-indigo-800' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                    {col.badge}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Seção 2: Dados Pessoais do Atleta */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <UserCheck size={14} />
                                    Dados Pessoais do Atleta
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {PERSONAL_COLUMNS.map(col => {
                                        const isSelected = selectedColumns.includes(col.id);
                                        return (
                                            <div
                                                key={col.id}
                                                onClick={() => toggleColumn(col.id)}
                                                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950 font-bold'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center text-xs ${
                                                        isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                                                    }`}>
                                                        {isSelected && <Check size={12} strokeWidth={3} />}
                                                    </div>
                                                    <span className="text-xs">{col.label}</span>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                                    isSelected ? 'bg-indigo-200/60 text-indigo-800' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                    {col.badge}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <span className="text-xs text-slate-500 font-medium">
                                Planilha compatível com Microsoft Excel (UTF-8 com ponto e vírgula).
                            </span>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    type="button"
                                    onClick={() => setShowExportModal(false)}
                                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors w-full sm:w-auto"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmExport}
                                    disabled={exporting || selectedColumns.length === 0}
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 w-full sm:w-auto"
                                >
                                    {exporting ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Download size={16} />
                                    )}
                                    Baixar Planilha CSV
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Alterar Pagamento (Backup Webhook) */}
            {selectedAthleteForPayment && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-4 overflow-y-auto">
                    <div className="bg-white rounded-[24px] md:rounded-[32px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
                        {/* Header */}
                        <div className="p-5 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                                    <CreditCard size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg md:text-xl font-black text-slate-900 leading-tight">
                                        Alterar Pagamento
                                    </h2>
                                    <p className="text-slate-500 font-medium text-xs">
                                        Backup de webhook e alteração manual de pagamento
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedAthleteForPayment(null)}
                                className="p-2 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-400 hover:text-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSavePayment} className="p-5 md:p-6 space-y-5 overflow-y-auto">
                            {/* Card Resumo do Atleta */}
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                                            Atleta Selecionado
                                        </span>
                                        <h3 className="font-black text-slate-900 text-sm md:text-base leading-snug">
                                            {selectedAthleteForPayment.name}
                                        </h3>
                                    </div>
                                    <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 font-black text-xs rounded-xl shadow-sm">
                                        BIB: {selectedAthleteForPayment.bib_number || '--'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1 border-t border-slate-200/60">
                                    <span>
                                        <strong>Categoria:</strong> {selectedAthleteForPayment.category?.name || 'Geral'}
                                    </span>
                                    {selectedAthleteForPayment.team_name && (
                                        <>
                                            <span>•</span>
                                            <span><strong>Equipe:</strong> {selectedAthleteForPayment.team_name}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Seletor de Status */}
                            <div className="space-y-2">
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                                    Status do Pagamento
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'paid', label: 'Pago', color: 'emerald', desc: 'Confirmado' },
                                        { id: 'pending', label: 'Pendente', color: 'amber', desc: 'Aguardando' },
                                        { id: 'cancelled', label: 'Cancelado', color: 'rose', desc: 'Cancelado' }
                                    ].map(item => {
                                        const isSelected = paymentModalStatus === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setPaymentModalStatus(item.id as any)}
                                                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                                    isSelected
                                                        ? item.id === 'paid'
                                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-400/30 font-black'
                                                            : item.id === 'cancelled'
                                                                ? 'bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-400/30 font-black'
                                                                : 'bg-amber-50 border-amber-300 text-amber-800 ring-2 ring-amber-400/30 font-black'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 font-bold'
                                                }`}
                                            >
                                                <span className="text-xs">{item.label}</span>
                                                <span className="text-[9px] uppercase font-semibold opacity-75">{item.desc}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Forma de Pagamento */}
                            <div className="space-y-2">
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                                    Forma / Método de Pagamento
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {[
                                        { id: 'pix', label: 'PIX', icon: '⚡' },
                                        { id: 'credit_card', label: 'Cartão de Crédito', icon: '💳' },
                                        { id: 'boleto', label: 'Boleto Bancário', icon: '📄' },
                                        { id: 'money', label: 'Dinheiro', icon: '💵' },
                                        { id: 'courtesy', label: 'Cortesia / Grátis', icon: '🎁' },
                                        { id: 'asaas', label: 'Gateway Asaas', icon: '🌐' }
                                    ].map(m => {
                                        const isSelected = paymentModalMethod === m.id;
                                        return (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => setPaymentModalMethod(m.id)}
                                                className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between text-xs ${
                                                    isSelected
                                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-black ring-2 ring-indigo-400/30'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 font-bold'
                                                }`}
                                            >
                                                <span className="flex items-center gap-1.5 truncate">
                                                    <span>{m.icon}</span>
                                                    <span className="truncate">{m.label}</span>
                                                </span>
                                                {isSelected && <Check size={14} className="text-indigo-600 shrink-0" strokeWidth={3} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notificação por E-mail */}
                            <div 
                                onClick={() => setPaymentModalSendEmail(!paymentModalSendEmail)}
                                className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100/60 transition-colors"
                            >
                                <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 text-xs transition-colors ${
                                    paymentModalSendEmail ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                                }`}>
                                    {paymentModalSendEmail && <Check size={12} strokeWidth={3} />}
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-black text-slate-800">
                                        Enviar e-mail automático ao atleta
                                    </p>
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                        {paymentModalStatus === 'paid' 
                                            ? 'Envia o e-mail de Inscrição Confirmada com o comprovante em PDF anexo.' 
                                            : paymentModalStatus === 'pending'
                                                ? 'Reenvia os dados de pagamento (chave PIX / boleto).'
                                                : 'Apenas atualiza o registro no sistema.'}
                                    </p>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setSelectedAthleteForPayment(null)}
                                    disabled={savingPayment}
                                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingPayment}
                                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
                                >
                                    {savingPayment ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <CheckCircle2 size={16} />
                                    )}
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
