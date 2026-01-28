import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Clock, Search } from 'lucide-react';
import api from '../../services/api';

interface RaceResult {
    id: number;
    bib_number: string;
    name: string;
    category_name: string; // Vem do backend com join ou algo assim
    net_time: string;
    position_general: number;
    category?: { name: string };
}

export function RaceResults() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState<RaceResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');

    // Modal Edit
    const [editingResult, setEditingResult] = useState<RaceResult | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadResults();
    }, [id]);

    async function loadResults() {
        try {
            setLoading(true);
            const response = await api.get(`/admin/races/${id}/results`);
            setResults(response.data);
        } catch (error) {
            console.error("Erro ao carregar resultados", error);
            // alert('Erro ao carregar dados. Verifique se o evento é uma corrida válida.');
        } finally {
            setLoading(false);
        }
    }

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        setImporting(true);
        try {
            await api.post(`/admin/races/${id}/results/import`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Importação concluída com sucesso!');
            loadResults();
        } catch (error) {
            console.error(error);
            alert('Erro na importação.');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    async function handleSaveEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingResult) return;

        try {
            await api.put(`/admin/results/${editingResult.id}`, {
                net_time: editingResult.net_time,
                bib_number: editingResult.bib_number
            });
            setEditingResult(null);
            loadResults();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar.');
        }
    }

    const filtered = results.filter(r =>
        (r.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (r.bib_number?.toString() || '').includes(searchTerm)
    );

    return (
        <div className="max-w-7xl mx-auto p-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/championships')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestão de Resultados</h1>
                        <p className="text-gray-500">Cronometragem e Classificação</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all"
                    >
                        {importing ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                        Importar CSV
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv,.txt,.xlsx"
                        onChange={handleImport}
                    />

                    {/* Botão para adicionar manual (Futuro) */}
                    {/* <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg">
                        <UserPlus className="w-4 h-4" />
                        Adicionar Atleta
                    </button> */}
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou número..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="text-sm text-gray-500">
                        {filtered.length} atletas listados
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                <th className="p-4 font-semibold">Pos</th>
                                <th className="p-4 font-semibold">Num</th>
                                <th className="p-4 font-semibold">Atleta</th>
                                <th className="p-4 font-semibold">Categoria</th>
                                <th className="p-4 font-semibold">Tempo Líquido</th>
                                <th className="p-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        Carregando...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        Nenhum resultado encontrado. Importe uma planilha ou adicione manualmente.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((r, index) => (
                                    <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="p-4 font-medium text-gray-500">#{index + 1}</td>
                                        <td className="p-4 font-bold text-gray-900">{r.bib_number || '-'}</td>
                                        <td className="p-4 font-medium text-gray-900">{r.name}</td>
                                        <td className="p-4 text-gray-600">
                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-bold">
                                                {r.category?.name || 'Geral'}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-lg text-indigo-600">
                                            {r.net_time || '--:--:--'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => setEditingResult(r)}
                                                className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                                            >
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingResult && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Editar Resultado</h3>
                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Atleta</label>
                                <input disabled value={editingResult.name} className="w-full px-3 py-2 bg-gray-100 rounded-lg text-gray-500" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Número de Peito</label>
                                <input
                                    value={editingResult.bib_number || ''}
                                    onChange={e => setEditingResult({ ...editingResult, bib_number: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Tempo (HH:MM:SS)</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="00:00:00"
                                        value={editingResult.net_time || ''}
                                        onChange={e => setEditingResult({ ...editingResult, net_time: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setEditingResult(null)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
