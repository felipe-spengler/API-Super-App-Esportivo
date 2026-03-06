import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Search, Filter, Download, UserPlus, FileCheck, Mail, Wand2, X, Table, Upload, AlertCircle } from 'lucide-react';
import api from '../../../services/api';

interface Athlete {
    id: number;
    name: string;
    bib_number: string;
    category_id: number;
    category?: { name: string };
    phone?: string;
    status_payment?: string;
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

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        document: '',
        birth_date: '',
        gender: '',
        category_id: '',
        remove_bg: true
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
                data.append('photo', photoFile);
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
                category_id: '',
                remove_bg: true
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
            await api.post(`/admin/races/${id}/results/import`, data);
            setShowImport(false);
            setFile(null);
            loadAthletes();
        } catch (error) {
            alert('Erro ao importar CSV');
        }
    };

    const filteredAthletes = athletes.filter(a =>
        (a.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.bib_number?.includes(searchTerm))
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 leading-tight">Gestão de Inscritos</h1>
                    <p className="text-slate-500 font-medium">Gerencie atletas, números de peito e categorias para o pódio.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all shadow-sm"
                    >
                        <Upload size={18} />
                        Importar CSV
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg"
                    >
                        <UserPlus size={18} />
                        Novo Atleta
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, categoria ou peito..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
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
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atleta / Perfil</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Número de Peito</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAthletes.map(athlete => (
                                    <tr key={athlete.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-full bg-slate-100 border-2 border-slate-50 overflow-hidden flex items-center justify-center">
                                                    {(athlete as any).user?.photo_url ? (
                                                        <img src={(athlete as any).user.photo_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="font-black text-slate-300 uppercase">{athlete.name?.substring(0, 2)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 uppercase text-sm leading-tight">{athlete.name}</p>
                                                    <p className="text-xs text-indigo-500 font-black mt-0.5">{athlete.phone || 'Sem contato'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-xl text-white">
                                                <span className="text-[10px] font-black uppercase text-slate-400">BIB</span>
                                                <span className="text-lg font-black font-mono">{(athlete.bib_number || '---').padStart(3, '0')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg uppercase border border-indigo-100/50">
                                                {athlete.category?.name || 'Geral'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1">
                                                <a
                                                    href={`${api.defaults.baseURL}/admin/art/championship/${id}/individual/${athlete.id}/atleta_confirmado?category_name=${athlete.category?.name || ''}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                    title="Gerar Arte: Confirmado"
                                                >
                                                    <Wand2 size={20} />
                                                </a>
                                                <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
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
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 leading-tight">Novo Atleta</h2>
                                <p className="text-slate-500 font-medium text-sm">Preencha os dados obrigatórios do perfil.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white hover:shadow-md rounded-full transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddAthlete} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Photo Side */}
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <div className="w-full aspect-square bg-slate-50 rounded-[28px] border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
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
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>Aguarde, Processando Foto (IA)...</>
                                ) : (
                                    <>
                                        <FileCheck size={24} />
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
        </div>
    );
}
