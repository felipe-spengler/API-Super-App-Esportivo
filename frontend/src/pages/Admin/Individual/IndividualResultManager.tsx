import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Timer, Upload, Download, Save, Search, Table, AlertCircle, CheckCircle2, Wand2, Edit3, ChevronRight, X } from 'lucide-react';
import api from '../../../services/api';

interface Result {
    id: number;
    bib_number: string;
    name: string;
    net_time: string;
    gross_time: string;
    position_general: number;
    position_category: number;
    category?: { name: string; parent?: { name: string } };
}

export function IndividualResultManager() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showImport, setShowImport] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        loadResults();
    }, [id]);

    async function loadResults() {
        try {
            setLoading(true);
            const response = await api.get(`/races/${id}/results`);
            setResults(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleImportCSV = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        const data = new FormData();
        data.append('file', file);
        try {
            await api.post(`/races/${id}/results/import`, data);
            setShowImport(false);
            setFile(null);
            loadResults();
        } catch (error) {
            alert('Erro ao importar CSV');
        }
    };

    const filteredResults = results.filter(r =>
        (r.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.bib_number?.includes(searchTerm)) ||
        (r.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Resultados e Cronometragem</h1>
                    <p className="text-slate-500 font-medium">Importe arquivos de cronometragem ou defina manualmente.</p>
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
                        onClick={() => navigate(`/admin/individual/championships/${id}/results/manual`)}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg"
                    >
                        <Edit3 size={18} />
                        Definir Manual
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total de Atletas</p>
                    <p className="text-3xl font-black text-slate-900">{results.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Com Tempo Final</p>
                    <p className="text-3xl font-black text-emerald-600">{results.filter(r => r.net_time).length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pendente</p>
                    <p className="text-3xl font-black text-amber-500">{results.filter(r => !r.net_time).length}</p>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-4">
                    <div className="flex-1 relative font-medium">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por peito ou nome..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-500 font-medium font-bold">Processando listagem...</div>
                ) : filteredResults.length === 0 ? (
                    <div className="p-12 text-center">
                        <Timer className="mx-auto text-slate-200 mb-4" size={48} />
                        <h3 className="text-lg font-bold text-slate-900 uppercase">Nenhum resultado processado</h3>
                        <p className="text-slate-500 max-w-xs mx-auto mt-1">Importe o arquivo da cronometragem para exibir os tempos e classificações.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Geral</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Peito</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Atleta / Categoria</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Tempo Líquido</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 uppercase">
                                {filteredResults.map((res, index) => (
                                    <tr key={res.id} className="hover:bg-slate-50/50 transition-colors group italic">
                                        <td className="px-6 py-4 font-black text-slate-400">
                                            {res.position_general || index + 1}º
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono bg-slate-900 text-white px-2 py-1 rounded text-sm font-bold">
                                                #{res.bib_number}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-900">{res.name}</p>
                                            <p className="text-[10px] text-indigo-600 font-black">{res.category?.name}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 font-mono font-black text-slate-700 text-lg">
                                                <Timer size={16} className="text-slate-400" />
                                                {res.net_time || '--:--:--'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {res.net_time && (
                                                    <a
                                                        href={`${api.defaults.baseURL}/admin/art/championship/${id}/individual/${res.id}/colocacao?category_name=${res.category?.name || ''}&rank=${res.position_general || index + 1}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                                                        title="Gerar Arte de Pódio"
                                                    >
                                                        <Wand2 size={18} />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/admin/individual/championships/${id}/results/manual`)}
                                                    className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                                                >
                                                    <ChevronRight size={20} />
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

            {/* Modal: Import CSV */}
            {showImport && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900">Importar Tempos (CSV)</h2>
                            <button onClick={() => setShowImport(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleImportCSV} className="p-6 space-y-4">
                            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                                <Upload className="mx-auto text-slate-300" size={48} />
                                <p className="text-slate-500 text-sm font-medium italic font-bold uppercase">Formato: PETO, NOME, TEMPO (HH:MM:SS), CATEGORIA</p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="csv-file-results"
                                />
                                <label
                                    htmlFor="csv-file-results"
                                    className="inline-block px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold cursor-pointer hover:bg-indigo-100"
                                >
                                    {file ? file.name : 'Selecionar Arquivo'}
                                </label>
                            </div>
                            <button
                                disabled={!file}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-xl"
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
