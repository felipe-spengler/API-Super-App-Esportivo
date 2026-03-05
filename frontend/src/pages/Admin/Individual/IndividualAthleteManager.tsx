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
        bib_number: '',
        category_id: '',
        phone: ''
    });

    useEffect(() => {
        loadAthletes();
        loadCategories();
    }, [id]);

    async function loadAthletes() {
        try {
            setLoading(true);
            const response = await api.get(`/races/${id}/results`);
            setAthletes(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    async function loadCategories() {
        try {
            const response = await api.get(`/championships/${id}/categories-list`);
            setCategories(response.data);
        } catch (error) { }
    }

    const handleAddAthlete = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/races/${id}/results`, formData);
            setShowModal(false);
            setFormData({ name: '', bib_number: '', category_id: '', phone: '' });
            loadAthletes();
        } catch (error) {
            alert('Erro ao adicionar atleta');
        }
    };

    const handleImportCSV = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        const data = new FormData();
        data.append('file', file);
        try {
            await api.post(`/races/${id}/results/import`, data);
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
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Gestão de Inscritos</h1>
                    <p className="text-slate-500 font-medium">Gerencie atletas, números de peito e categorias.</p>
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
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold transition-all shadow-lg"
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
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500 font-medium">Carregando inscritos...</div>
                ) : filteredAthletes.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="text-slate-300" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Nenhum atleta encontrado</h3>
                        <p className="text-slate-500">Comece adicionando manualmente ou importe um arquivo.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Atleta</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Peito / Bib</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Categoria</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Artes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAthletes.map(athlete => (
                                    <tr key={athlete.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 group-hover:bg-emerald-100 transition-colors flex items-center justify-center font-bold text-slate-500 group-hover:text-emerald-600 lowercase">
                                                    {athlete.name?.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 uppercase">{athlete.name}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{athlete.phone || 'Sem telefone'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 font-black">
                                                #{athlete.bib_number || '---'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg uppercase">
                                                {athlete.category?.name || 'Geral'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <a
                                                    href={`${api.defaults.baseURL}/admin/art/championship/${id}/individual/${athlete.id}/atleta_confirmado?category_name=${athlete.category?.name || ''}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                                                    title="Arte: Confirmado"
                                                >
                                                    <Wand2 size={18} />
                                                </a>
                                                <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                                                    <Mail size={18} />
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
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900">Novo Atleta</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddAthlete} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Número de Peito</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                                        value={formData.bib_number}
                                        onChange={e => setFormData({ ...formData, bib_number: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">Categoria</label>
                                    <select
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
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
                            <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 shadow-lg">
                                Cadastrar Atleta
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
