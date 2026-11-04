import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Timer, Upload, Download, Save, Search, AlertCircle, CheckCircle2, 
    Wand2, Edit3, ChevronRight, X, Filter, Trophy, Medal, RotateCcw, 
    Layers, Award, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

interface CategoryItem {
    id: number;
    name: string;
    parent_id?: number | null;
    gender?: string;
    min_age?: number | null;
    max_age?: number | null;
    price?: number;
    children?: CategoryItem[];
}

interface Result {
    id: number;
    bib_number: string;
    name: string;
    team_name?: string;
    net_time: string;
    gross_time: string;
    position_general: number;
    position_category: number;
    category_id?: number;
    category?: {
        id?: number;
        name: string;
        gender?: string;
        parent_id?: number | null;
        parent?: { id?: number; name: string };
    };
    user?: {
        id?: number;
        name?: string;
        gender?: string;
        birth_date?: string;
    };
}

export function IndividualResultManager() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Data states
    const [results, setResults] = useState<Result[]>([]);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
    const [selectedGender, setSelectedGender] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all'); // 'all', 'completed', 'pending'

    // Modal & Action states
    const [showImport, setShowImport] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [savingClassification, setSavingClassification] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            setLoading(true);
            const [resultsRes, catRes] = await Promise.all([
                api.get(`/admin/races/${id}/results`),
                api.get(`/admin/championships/${id}/categories-list`).catch(() => ({ data: [] }))
            ]);
            setResults(resultsRes.data || []);
            setCategories(catRes.data || []);
        } catch (error) {
            console.error('Erro ao carregar resultados', error);
            toast.error('Erro ao carregar resultados e categorias.');
        } finally {
            setLoading(false);
        }
    }

    // Parent categories (no parent_id)
    const parentCategories = useMemo(() => {
        return categories.filter(c => !c.parent_id);
    }, [categories]);

    // Subcategories available depending on selected parent category
    const availableSubCategories = useMemo(() => {
        if (selectedCategory !== 'all') {
            const parentId = Number(selectedCategory);
            return categories.filter(c => c.parent_id === parentId);
        }
        return categories.filter(c => c.parent_id !== null && c.parent_id !== undefined);
    }, [categories, selectedCategory]);

    // Handle change of parent category
    const handleCategoryChange = (catId: string) => {
        setSelectedCategory(catId);
        // Reset subcategory if current subcategory doesn't belong to newly selected category
        if (catId === 'all') {
            setSelectedSubCategory('all');
        } else {
            const parentId = Number(catId);
            const valid = categories.some(c => c.id === Number(selectedSubCategory) && c.parent_id === parentId);
            if (!valid) setSelectedSubCategory('all');
        }
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('all');
        setSelectedSubCategory('all');
        setSelectedGender('all');
        setSelectedStatus('all');
    };

    const hasActiveFilters = searchTerm !== '' || 
        selectedCategory !== 'all' || 
        selectedSubCategory !== 'all' || 
        selectedGender !== 'all' || 
        selectedStatus !== 'all';

    // Helper to parse time string to milliseconds for strict mathematical sorting
    const parseTimeToMs = (timeStr: string | null | undefined): number => {
        if (!timeStr) return Infinity;
        const clean = timeStr.trim();
        if (!clean || clean === '--:--:--' || clean === '-' || clean === '00:00:00') return Infinity;

        const parts = clean.split(':');
        let hours = 0;
        let minutes = 0;
        let secondsWithMs = 0;

        if (parts.length === 3) {
            hours = parseFloat(parts[0]) || 0;
            minutes = parseFloat(parts[1]) || 0;
            secondsWithMs = parseFloat(parts[2]) || 0;
        } else if (parts.length === 2) {
            minutes = parseFloat(parts[0]) || 0;
            secondsWithMs = parseFloat(parts[1]) || 0;
        } else if (parts.length === 1) {
            secondsWithMs = parseFloat(parts[0]) || 0;
        } else {
            return Infinity;
        }

        const totalMs = Math.round((hours * 3600 + minutes * 60 + secondsWithMs) * 1000);
        return isNaN(totalMs) || totalMs <= 0 ? Infinity : totalMs;
    };

    // Helper to format gap/difference relative to leader
    const formatGap = (gapMs: number): string => {
        if (gapMs <= 0) return '-';
        const totalSecs = Math.floor(gapMs / 1000);
        const msPart = Math.floor((gapMs % 1000) / 10);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        if (mins > 0) {
            return `+${mins}:${secs.toString().padStart(2, '0')}.${msPart.toString().padStart(2, '0')}`;
        }
        return `+${secs}.${msPart.toString().padStart(2, '0')}s`;
    };

    // Filter results based on selected filters
    const filteredResults = useMemo(() => {
        return results.filter(r => {
            // Text Search
            const term = searchTerm.toLowerCase().trim();
            if (term) {
                const matchesName = r.name?.toLowerCase().includes(term);
                const matchesBib = r.bib_number?.toString().includes(term);
                const matchesTeam = r.team_name?.toLowerCase().includes(term);
                const matchesCat = r.category?.name?.toLowerCase().includes(term);
                const matchesParent = r.category?.parent?.name?.toLowerCase().includes(term);
                if (!matchesName && !matchesBib && !matchesTeam && !matchesCat && !matchesParent) return false;
            }

            // Category filter
            if (selectedCategory !== 'all') {
                const catId = Number(selectedCategory);
                const isDirect = r.category?.id === catId || r.category_id === catId;
                const isChild = r.category?.parent_id === catId || r.category?.parent?.id === catId;
                if (!isDirect && !isChild) return false;
            }

            // Subcategory filter
            if (selectedSubCategory !== 'all') {
                const subId = Number(selectedSubCategory);
                const isMatch = r.category?.id === subId || r.category_id === subId;
                if (!isMatch) return false;
            }

            // Gender filter
            if (selectedGender !== 'all') {
                const rGender = r.category?.gender || r.user?.gender;
                if (rGender) {
                    const norm = rGender.toLowerCase();
                    const target = selectedGender.toLowerCase();
                    if (target === 'm' && norm !== 'm' && norm !== 'male' && norm !== 'masculino') return false;
                    if (target === 'f' && norm !== 'f' && norm !== 'female' && norm !== 'feminino') return false;
                }
            }

            // Status filter
            if (selectedStatus === 'completed') {
                if (parseTimeToMs(r.net_time) === Infinity) return false;
            } else if (selectedStatus === 'pending') {
                if (parseTimeToMs(r.net_time) !== Infinity) return false;
            }

            return true;
        });
    }, [results, searchTerm, selectedCategory, selectedSubCategory, selectedGender, selectedStatus]);

    // Dynamic Classification ("e dai classifica")
    const classifiedResults = useMemo(() => {
        // Separate completed vs pending
        const completed = filteredResults
            .filter(r => parseTimeToMs(r.net_time) !== Infinity)
            .sort((a, b) => {
                const timeDiff = parseTimeToMs(a.net_time) - parseTimeToMs(b.net_time);
                if (timeDiff !== 0) return timeDiff;
                return (Number(a.bib_number) || 0) - (Number(b.bib_number) || 0);
            });

        const pending = filteredResults
            .filter(r => parseTimeToMs(r.net_time) === Infinity)
            .sort((a, b) => (Number(a.bib_number) || 0) - (Number(b.bib_number) || 0));

        const leaderMs = completed.length > 0 ? parseTimeToMs(completed[0].net_time) : 0;

        const classifiedCompleted = completed.map((res, index) => {
            const rank = index + 1;
            const timeMs = parseTimeToMs(res.net_time);
            const gapMs = index === 0 ? 0 : timeMs - leaderMs;
            return {
                ...res,
                calculatedRank: rank,
                gapMs,
                isCompleted: true
            };
        });

        const classifiedPending = pending.map(res => ({
            ...res,
            calculatedRank: null,
            gapMs: null,
            isCompleted: false
        }));

        return [...classifiedCompleted, ...classifiedPending];
    }, [filteredResults]);

    // Active Category Title
    const activeFilterLabel = useMemo(() => {
        if (selectedSubCategory !== 'all') {
            const sub = categories.find(c => c.id === Number(selectedSubCategory));
            const parent = sub?.parent_id ? categories.find(c => c.id === sub.parent_id) : null;
            return parent ? `${parent.name} - ${sub?.name}` : (sub?.name || 'Subcategoria');
        }
        if (selectedCategory !== 'all') {
            const cat = categories.find(c => c.id === Number(selectedCategory));
            return cat?.name || 'Categoria';
        }
        return 'Geral';
    }, [categories, selectedCategory, selectedSubCategory]);

    // Save classification back to the server
    const handleSaveClassification = async () => {
        const completedOnly = classifiedResults.filter(r => r.isCompleted && r.calculatedRank !== null);
        if (completedOnly.length === 0) {
            toast.error('Nenhum atleta com tempo concluído para salvar colocação.');
            return;
        }

        const isCategorySpecific = selectedCategory !== 'all' || selectedSubCategory !== 'all';
        const fieldToUpdate = isCategorySpecific ? 'position_category' : 'position_general';

        if (!confirm(`Deseja gravar a classificação atual (${completedOnly.length} atletas) como ${isCategorySpecific ? 'Colocação na Categoria' : 'Colocação Geral'}?`)) {
            return;
        }

        try {
            setSavingClassification(true);
            const toastId = toast.loading('Salvando classificação no banco...');

            await Promise.all(
                completedOnly.map(r =>
                    api.put(`/admin/results/${r.id}`, {
                        [fieldToUpdate]: r.calculatedRank
                    })
                )
            );

            toast.success('Classificação gravada com sucesso!', { id: toastId });
            loadData();
        } catch (error) {
            console.error('Erro ao salvar classificação', error);
            toast.error('Erro ao salvar classificação.');
        } finally {
            setSavingClassification(false);
        }
    };

    // Client-side export of classified results
    const handleExportCSV = () => {
        if (classifiedResults.length === 0) {
            toast.error('Nenhum resultado para exportar.');
            return;
        }

        const headers = ['Classificação', 'Nº Peito', 'Nome', 'Equipe', 'Categoria', 'Subcategoria', 'Tempo Líquido', 'Diferença Líder', 'Status'];
        const rows = classifiedResults.map(r => [
            r.calculatedRank ? `${r.calculatedRank}º` : 'Pendente',
            r.bib_number || '',
            `"${(r.name || '').replace(/"/g, '""')}"`,
            `"${(r.team_name || '').replace(/"/g, '""')}"`,
            `"${(r.category?.parent?.name || r.category?.name || '').replace(/"/g, '""')}"`,
            `"${(r.category?.parent ? r.category?.name : '').replace(/"/g, '""')}"`,
            r.net_time || '--:--:--',
            r.gapMs !== null && r.gapMs !== undefined ? formatGap(r.gapMs) : '-',
            r.isCompleted ? 'Concluído' : 'Pendente'
        ]);

        const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `classificacao_${activeFilterLabel.toLowerCase().replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV de classificação exportado!');
    };

    const handleImportCSV = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        const data = new FormData();
        data.append('file', file);
        try {
            await api.post(`/admin/races/${id}/results/import`, data);
            toast.success('Arquivo CSV importado com sucesso!');
            setShowImport(false);
            setFile(null);
            loadData();
        } catch (error) {
            toast.error('Erro ao importar CSV de cronometragem.');
        }
    };

    // Stats calculations for cards
    const totalCount = classifiedResults.length;
    const completedCount = classifiedResults.filter(r => r.isCompleted).length;
    const pendingCount = classifiedResults.filter(r => !r.isCompleted).length;
    const bestTime = classifiedResults.find(r => r.isCompleted)?.net_time;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-black text-slate-900 leading-tight">Resultados e Cronometragem</h1>
                        {hasActiveFilters && (
                            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black uppercase rounded-full">
                                {activeFilterLabel}
                            </span>
                        )}
                    </div>
                    <p className="text-slate-500 font-medium text-sm mt-0.5">
                        Filtre por categoria/subcategoria, acompanhe a classificação em tempo real e gere artes de pódio.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all text-xs shadow-sm"
                        title="Exportar classificação atual em CSV"
                    >
                        <Download size={15} />
                        Exportar CSV
                    </button>
                    <button
                        onClick={() => setShowImport(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all text-xs shadow-sm"
                    >
                        <Upload size={15} />
                        Importar CSV
                    </button>
                    <button
                        onClick={() => navigate(`/admin/championships/${id}/times`)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all text-xs shadow-sm"
                    >
                        <Edit3 size={15} />
                        Definir Manual
                    </button>
                    <button
                        onClick={() => navigate(`/admin/championships/${id}/times`)}
                        className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-md text-xs"
                    >
                        <Timer size={16} />
                        Cronometrar
                    </button>
                </div>
            </div>

            {/* Stats Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {hasActiveFilters ? 'Total no Filtro' : 'Total de Atletas'}
                    </p>
                    <p className="text-3xl font-black text-slate-900">{totalCount}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-1">Com Tempo Final</p>
                    <p className="text-3xl font-black text-emerald-600">{completedCount}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest mb-1">Pendentes</p>
                    <p className="text-3xl font-black text-amber-500">{pendingCount}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-1">Melhor Tempo (1º)</p>
                    <p className="text-2xl font-black font-mono text-indigo-600">
                        {bestTime || '--:--:--'}
                    </p>
                </div>
            </div>

            {/* Filter Controls Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                        <Filter size={16} className="text-indigo-600" />
                        <span>Filtros de Classificação e Provas</span>
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={handleClearFilters}
                            className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-red-600 transition-colors"
                        >
                            <RotateCcw size={13} />
                            Limpar Filtros
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Categoria Principal */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Categoria / Prova
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={e => handleCategoryChange(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                            <option value="all">Todas as Categorias</option>
                            {parentCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Subcategoria */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Subcategoria / Faixa
                        </label>
                        <select
                            value={selectedSubCategory}
                            onChange={e => setSelectedSubCategory(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-50"
                        >
                            <option value="all">Todas as Subcategorias</option>
                            {availableSubCategories.map(sub => (
                                <option key={sub.id} value={sub.id}>
                                    {sub.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Gênero */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Gênero
                        </label>
                        <select
                            value={selectedGender}
                            onChange={e => setSelectedGender(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                            <option value="all">Todos os Gêneros</option>
                            <option value="M">Masculino</option>
                            <option value="F">Feminino</option>
                        </select>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Status do Tempo
                        </label>
                        <select
                            value={selectedStatus}
                            onChange={e => setSelectedStatus(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                            <option value="all">Todos os Status</option>
                            <option value="completed">Concluídos com Tempo</option>
                            <option value="pending">Pendentes</option>
                        </select>
                    </div>

                    {/* Busca por Texto */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            Busca Rápida
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Peito, Nome ou Equipe..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Classification Actions Bar */}
                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="text-slate-500 font-medium flex items-center gap-1.5">
                        <Trophy size={14} className="text-amber-500" />
                        <span>
                            Exibindo <strong>{classifiedResults.length}</strong> atletas classificados em{' '}
                            <strong className="text-slate-900">{activeFilterLabel}</strong>.
                        </span>
                    </div>
                    {completedCount > 0 && (
                        <button
                            onClick={handleSaveClassification}
                            disabled={savingClassification}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold transition-all disabled:opacity-50"
                            title="Gravar as colocações calculadas no banco de dados para certificados e relatórios"
                        >
                            <Save size={13} />
                            {savingClassification ? 'Salvando...' : 'Gravar Classificação no Banco'}
                        </button>
                    )}
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 font-bold">Carregando classificação...</div>
                ) : classifiedResults.length === 0 ? (
                    <div className="p-12 text-center">
                        <Timer className="mx-auto text-slate-200 mb-3" size={44} />
                        <h3 className="text-base font-bold text-slate-800 uppercase">Nenhum atleta encontrado</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                            Ajuste os filtros de categoria/subcategoria acima ou importe novos tempos de cronometragem.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3.5 text-center w-24">Classif.</th>
                                    <th className="px-5 py-3.5 w-20">Peito</th>
                                    <th className="px-5 py-3.5">Atleta / Equipe</th>
                                    <th className="px-5 py-3.5">Categoria / Subcategoria</th>
                                    <th className="px-5 py-3.5">Tempo Líquido</th>
                                    <th className="px-5 py-3.5 text-slate-400">Diferença (Gap)</th>
                                    <th className="px-5 py-3.5 text-right">Pódio / Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {classifiedResults.map((res) => {
                                    const rank = res.calculatedRank;
                                    const isPodium = rank !== null && rank <= 3;
                                    const podiumBadgeClass = rank === 1
                                        ? 'bg-amber-100 text-amber-900 border-amber-300 font-black'
                                        : rank === 2
                                        ? 'bg-slate-200 text-slate-800 border-slate-300 font-black'
                                        : rank === 3
                                        ? 'bg-orange-100 text-orange-950 border-orange-300 font-black'
                                        : 'bg-slate-100 text-slate-600 font-bold';

                                    const categoryNameForArt = res.category?.parent?.name
                                        ? `${res.category.parent.name} - ${res.category.name}`
                                        : (res.category?.name || activeFilterLabel);

                                    return (
                                        <tr key={res.id} className="hover:bg-slate-50/70 transition-colors">
                                            {/* Classification Column */}
                                            <td className="px-5 py-3.5 text-center">
                                                {rank !== null ? (
                                                    <span className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs border ${podiumBadgeClass}`}>
                                                        {rank === 1 && '🥇'}
                                                        {rank === 2 && '🥈'}
                                                        {rank === 3 && '🥉'}
                                                        <span>{rank}º</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                        --
                                                    </span>
                                                )}
                                            </td>

                                            {/* BIB Column */}
                                            <td className="px-5 py-3.5">
                                                <span className="font-mono bg-slate-900 text-white px-2 py-0.5 rounded text-xs font-bold">
                                                    #{res.bib_number || '?'}
                                                </span>
                                            </td>

                                            {/* Athlete & Team */}
                                            <td className="px-5 py-3.5">
                                                <p className="font-bold text-slate-900 text-sm leading-tight">{res.name}</p>
                                                {res.team_name ? (
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                                        {res.team_name}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 font-medium">Individual</span>
                                                )}
                                            </td>

                                            {/* Category & Subcategory */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-indigo-600 text-xs">
                                                        {res.category?.parent?.name || res.category?.name || 'Sem Categoria'}
                                                    </span>
                                                    {res.category?.parent && (
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            {res.category.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Net Time */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1.5 font-mono font-black text-slate-800 text-sm">
                                                    <Timer size={14} className="text-slate-400" />
                                                    <span>{res.net_time || '--:--:--'}</span>
                                                </div>
                                            </td>

                                            {/* Gap */}
                                            <td className="px-5 py-3.5 font-mono font-bold text-slate-500 text-xs">
                                                {res.isCompleted && res.gapMs !== null && res.gapMs !== undefined ? (
                                                    res.gapMs === 0 ? (
                                                        <span className="text-amber-600 font-black">Líder</span>
                                                    ) : (
                                                        formatGap(res.gapMs)
                                                    )
                                                ) : (
                                                    <span className="text-slate-300">-</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {res.net_time && rank !== null && (
                                                        <a
                                                            href={`${api.defaults.baseURL}/admin/art/championship/${id}/individual/${res.id}/colocacao?category_name=${encodeURIComponent(categoryNameForArt)}&rank=${rank}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                            title={`Gerar Arte de Pódio (${rank}º Lugar)`}
                                                        >
                                                            <Wand2 size={16} />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => navigate(`/admin/championships/${id}/times`)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title="Ver / Editar no Cronômetro"
                                                    >
                                                        <ChevronRight size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Import CSV */}
            {showImport && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-xl font-black text-slate-900">Importar Tempos (CSV)</h2>
                            <button onClick={() => setShowImport(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleImportCSV} className="p-6 space-y-4">
                            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                                <Upload className="mx-auto text-slate-300" size={44} />
                                <p className="text-slate-600 text-xs font-bold uppercase tracking-wide">
                                    Formato: PEITO, NOME, TEMPO (HH:MM:SS), CATEGORIA
                                </p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="csv-file-results"
                                />
                                <label
                                    htmlFor="csv-file-results"
                                    className="inline-block px-5 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-100 transition-colors"
                                >
                                    {file ? file.name : 'Selecionar Arquivo'}
                                </label>
                            </div>
                            <button
                                disabled={!file}
                                className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-md text-sm transition-all"
                            >
                                Iniciar Importação
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
