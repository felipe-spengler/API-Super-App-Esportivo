import { useState, useEffect } from 'react';
import api from '../../services/api';
import { History, Search, Shield, Globe, User as UserIcon, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface AuditLog {
    id: number;
    user_id: number;
    club_id: number | null;
    action: string;
    description: string;
    ip_address: string;
    user_agent: string;
    metadata: any;
    created_at: string;
    user?: {
        name: string;
        email: string;
    };
    club?: {
        name: string;
    };
}

export function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, search, startDate, endDate]);

    async function fetchLogs() {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                search,
                start_date: startDate,
                end_date: endDate
            });
            const response = await api.get(`/admin/audit-logs?${params.toString()}`);
            setLogs(response.data.data);
            setLastPage(response.data.last_page);
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
            toast.error('Não foi possível carregar o histórico de ações.');
        } finally {
            setLoading(false);
        }
    }

    const getActionBadge = (action: string) => {
        const colors: Record<string, string> = {
            'team.create': 'bg-green-100 text-green-700 border-green-200',
            'team.delete': 'bg-red-100 text-red-700 border-red-200',
            'team.update': 'bg-blue-100 text-blue-700 border-blue-200',
            'team.duplicate_prevented': 'bg-amber-100 text-amber-700 border-amber-200',
            'team.championship_add': 'bg-indigo-100 text-indigo-700 border-indigo-200',
        };

        const defaultColor = 'bg-gray-100 text-gray-700 border-gray-200';
        return colors[action] || defaultColor;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <History className="w-7 h-7 text-indigo-600" />
                        Histórico de Ações (Auditoria)
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Acompanhe todas as alterações realizadas no sistema nos últimos 7 dias.
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por usuário ou ação..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <span className="text-gray-400">até</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); }}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                        Limpar Filtros
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-200">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data / Horário</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ação</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Descrição</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Origem (IP)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && logs.length === 0 ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8 h-16 bg-gray-50/30"></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        Nenhuma ação registrada no período.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {format(new Date(log.created_at), "dd 'de' MMMM", { locale: ptBR })}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {format(new Date(log.created_at), "HH:mm:ss")}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                                                    <UserIcon className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-900">{log.user?.name || 'Sistema'}</span>
                                                    <span className="text-xs text-gray-500 truncate max-w-[150px]">{log.user?.email || '-'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getActionBadge(log.action)}`}>
                                                {log.action.replace('.', ': ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-sm text-gray-600 max-w-md leading-relaxed">
                                                    {log.description}
                                                </p>
                                                {log.metadata?.is_success !== undefined && (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${log.metadata.is_success ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                            {log.metadata.is_success ? 'Sucesso' : `Falha (${log.metadata.response_status})`}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-[150px]" title={log.metadata.referer || 'Origem desconhecida'}>
                                                            Via: {log.metadata.referer ? new URL(log.metadata.referer).pathname : 'Sistema/API'}
                                                        </span>
                                                        {log.metadata.payload && (
                                                            <button
                                                                onClick={() => setSelectedLog(log)}
                                                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold underline underline-offset-2"
                                                            >
                                                                Ver detalhes técnicos
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col text-xs text-gray-500 gap-1">
                                                <div className="flex items-center gap-1">
                                                    <Globe className="w-3 h-3" />
                                                    {log.ip_address}
                                                </div>
                                                <div className="flex items-center gap-1 truncate max-w-[120px]" title={log.user_agent}>
                                                    <Shield className="w-3 h-3" />
                                                    Dispositivo
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Technical Details Modal */}
                {selectedLog && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col border border-gray-200">
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-indigo-600" />
                                    Detalhes da Transação
                                </h3>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                                <section>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payload (Enviado pelo Usuário)</h4>
                                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs overflow-x-auto font-mono leading-relaxed shadow-inner">
                                        {JSON.stringify(selectedLog.metadata.payload, null, 2)}
                                    </pre>
                                </section>
                                <section>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Resposta do Servidor</h4>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${selectedLog.metadata.is_success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                Status: {selectedLog.metadata.response_status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 font-medium italic">
                                            {selectedLog.metadata.response_message || 'Sem mensagem adicional'}
                                        </p>
                                    </div>
                                </section>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {lastPage > 1 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <button
                            disabled={page === 1 || loading}
                            onClick={() => setPage(page - 1)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            Anterior
                        </button>
                        <span className="text-sm text-gray-600 font-medium">
                            Página {page} de {lastPage}
                        </span>
                        <button
                            disabled={page === lastPage || loading}
                            onClick={() => setPage(page + 1)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            Próxima
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
