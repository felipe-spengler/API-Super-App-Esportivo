import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Timer, Upload, Download, Save, Search, Table, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../../services/api';

export function IndividualResultManager() {
    const { id } = useParams();
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [importMode, setImportMode] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        loadResults();
    }, [id]);

    async function loadResults() {
        try {
            const response = await api.get(`/races/${id}/results`);
            setResults(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('csv_file', file);

        try {
            await api.post(`/races/${id}/results/import`, formData);
            alert('Resultados importados com sucesso!');
            setImportMode(false);
            loadResults();
        } catch (error) {
            console.error(error);
            alert('Erro ao importar resultados.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Resultados e Cronometragem</h1>
                    <p className="text-slate-500 font-medium">Lance os tempos manualmente ou importe via arquivo CSV.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setImportMode(!importMode)}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg"
                    >
                        <Upload size={18} />
                        {importMode ? 'Cancelar' : 'Importar CSV'}
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold transition-all shadow-lg">
                        <Save size={18} />
                        Salvar Alterações
                    </button>
                </div>
            </div>

            {importMode && (
                <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                    <div className="max-w-xl mx-auto text-center space-y-4">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-indigo-600">
                            <Table size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Importação de Resultados</h2>
                        <p className="text-slate-500 text-sm">
                            O arquivo deve conter as colunas: <b>bib_number</b> (Número do Peito), <b>time_finish</b> (HH:MM:SS) e <b>rank</b> (opcional).
                        </p>
                        <form onSubmit={handleImport} className="space-y-4">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={e => setFile(e.target.files?.[0] || null)}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                            />
                            <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all">
                                Confirmar Importação
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest">
                        <Timer size={16} />
                        Tabela de Classificação
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-500">Carregando tempos...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Rank</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Atleta / Peito</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Tempo Bruto</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Tempo Líquido</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {results.map(res => (
                                    <tr key={res.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                                                {res.rank || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-slate-900">{res.athlete_name || 'Atleta #' + res.bib_number}</p>
                                                <p className="text-xs text-slate-500 font-bold">Peito: {res.bib_number}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-slate-600">
                                            {res.time_finish}
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                                            {res.time_net || res.time_finish}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs uppercase">
                                                <CheckCircle2 size={14} />
                                                Validado
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
