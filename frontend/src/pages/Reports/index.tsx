import { BarChart3, TrendingUp, DollarSign, Users } from 'lucide-react';

export function Reports() {
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 flex flex-col items-center gap-2 transition-colors">
                        <Users className="w-8 h-8 text-gray-400" />
                        <span className="font-bold text-gray-700">Exportar Jogadores (CSV)</span>
                    </button>
                    <button className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 flex flex-col items-center gap-2 transition-colors">
                        <BarChart3 className="w-8 h-8 text-gray-400" />
                        <span className="font-bold text-gray-700">Resultados de Jogos (PDF)</span>
                    </button>
                    <button className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 flex flex-col items-center gap-2 transition-colors">
                        <TrendingUp className="w-8 h-8 text-gray-400" />
                        <span className="font-bold text-gray-700">Relatório Financeiro (XLSX)</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
