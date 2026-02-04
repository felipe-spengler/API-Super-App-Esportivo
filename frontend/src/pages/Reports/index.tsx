import { useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Loader2 } from 'lucide-react';
import api from '../../services/api';

export function Reports() {
    const [loading, setLoading] = useState(false);

    async function handleExport(type: string) {
        try {
            setLoading(true);
            const response = await api.get(`/admin/export?type=${type}`, {
                responseType: 'blob', // Important for file download
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `export_${type}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error(error);
            alert('Erro ao exportar relatório.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="animate-in fade-in duration-500">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 font-display">Relatórios e Estatísticas</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Crescimento de Usuários</h3>
                            <p className="text-sm text-gray-500">Novos cadastros nos últimos 30 dias</p>
                        </div>
                    </div>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <span className="text-gray-400 font-medium text-sm">Gráfico em desenvolvimento (Chart.js)</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-100 rounded-lg text-green-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Receita Financeira</h3>
                            <p className="text-sm text-gray-500">Inscrições e Vendas</p>
                        </div>
                    </div>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <span className="text-gray-400 font-medium text-sm">Gráfico em desenvolvimento</span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Exportar Dados</h3>
                    {loading && <div className="flex items-center gap-2 text-indigo-600 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Gerando arquivo...</div>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => handleExport('players')}
                        disabled={loading}
                        className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 flex flex-col items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <Users className="w-8 h-8 text-gray-400" />
                        <span className="font-bold text-gray-700">Exportar Jogadores (CSV)</span>
                    </button>
                    <button
                        onClick={() => handleExport('matches')}
                        disabled={loading}
                        className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 flex flex-col items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <BarChart3 className="w-8 h-8 text-gray-400" />
                        <span className="font-bold text-gray-700">Resultados de Jogos (CSV)</span>
                    </button>
                    <button
                        onClick={() => handleExport('teams')}
                        disabled={loading}
                        className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 flex flex-col items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        <Users className="w-8 h-8 text-gray-400" />
                        <span className="font-bold text-gray-700">Exportar Equipes/Times (CSV)</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
