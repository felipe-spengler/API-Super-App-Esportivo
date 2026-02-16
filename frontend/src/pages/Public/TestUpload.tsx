import { useState } from 'react';
import api from '../../services/api';

export function TestUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [useAiEndpoint, setUseAiEndpoint] = useState(false); // Toggle
    const [removeBg, setRemoveBg] = useState(false); // Flag for /me/photo

    const addLog = (msg: string, data?: any) => {
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, data }]);
    };

    const handleUpload = async () => {
        if (!file) return alert('Selecione um arquivo');
        setLoading(true);
        setLogs([]); // Clear logs
        addLog('Iniciando upload...');

        const formData = new FormData();
        formData.append('photo', file);

        if (!useAiEndpoint && removeBg) {
            formData.append('remove_bg', '1');
            addLog('Flag remove_bg=1 adicionada');
        }

        const endpoint = useAiEndpoint ? '/test-remove-bg' : '/me/photo';
        addLog(`Enviando para ${endpoint}...`);

        const startTime = Date.now();

        try {
            const response = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 300000 // 5 min
            });
            const duration = (Date.now() - startTime) / 1000;
            addLog(`Sucesso! Tempo total: ${duration}s`);
            addLog('Resposta completa:', response.data);
        } catch (error: any) {
            const duration = (Date.now() - startTime) / 1000;
            addLog(`Erro após ${duration}s`);
            addLog('Detalhes do erro:', error);
            if (error.response) {
                addLog('Status:', error.response.status);
                addLog('Data:', error.response.data);
            } else if (error.code === 'ECONNABORTED') {
                addLog('Erro: Timeout (O servidor demorou mais que 5min para responder)');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen bg-gray-50">
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Laboratório de Upload (Debug)</h1>
            <p className="mb-6 text-gray-600">Use esta tela para testar uploads e o funcionamento da IA de remoção de fundo com logs detalhados.</p>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-6">
                <div>
                    <label className="block font-bold text-gray-700 mb-2">1. Escolha o Método de Teste</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${!useAiEndpoint ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-gray-50'}`}>
                            <input type="radio" className="w-5 h-5 text-indigo-600" checked={!useAiEndpoint} onChange={() => setUseAiEndpoint(false)} />
                            <div>
                                <span className="font-bold block text-gray-900">Upload de Perfil Real</span>
                                <span className="text-sm text-gray-500">Rota: /me/photo (Salva no seu perfil)</span>
                            </div>
                        </label>
                        <label className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${useAiEndpoint ? 'bg-indigo-50 border-indigo-500' : 'hover:bg-gray-50'}`}>
                            <input type="radio" className="w-5 h-5 text-indigo-600" checked={useAiEndpoint} onChange={() => setUseAiEndpoint(true)} />
                            <div>
                                <span className="font-bold block text-gray-900">Teste Isolado de IA</span>
                                <span className="text-sm text-gray-500">Rota: /test-remove-bg (Apenas processa a imagem)</span>
                            </div>
                        </label>
                    </div>
                </div>

                {!useAiEndpoint && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-5 h-5 text-yellow-600 rounded" checked={removeBg} onChange={e => setRemoveBg(e.target.checked)} />
                            <span className="font-bold text-yellow-800">Ativar Remoção de Fundo com IA</span>
                        </label>
                        <p className="text-xs text-yellow-700 mt-1 ml-7">Se desmarcado, o upload deve ser instantâneo.</p>
                    </div>
                )}

                <div>
                    <label className="block font-bold text-gray-700 mb-2">2. Selecione a Imagem</label>
                    <input
                        type="file"
                        accept="image/*"
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                    />
                </div>

                <button
                    onClick={handleUpload}
                    disabled={loading}
                    className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
                >
                    {loading ? 'Processando... (Aguarde, pode demorar até 5min)' : 'Iniciar Teste de Upload'}
                </button>
            </div>

            {loading && (
                <div className="mb-4 text-center text-indigo-600 animate-pulse font-bold">
                    Aguardando resposta do servidor...
                </div>
            )}

            <div className="bg-slate-900 text-slate-200 p-6 rounded-xl font-mono text-sm h-[500px] overflow-auto shadow-inner">
                <h3 className="text-gray-400 text-xs uppercase tracking-wider mb-4 border-b border-gray-700 pb-2">Logs do Sistema</h3>
                {logs.length === 0 && <span className="text-gray-600 italic">Nenhum log gerado ainda.</span>}
                {logs.map((log, i) => (
                    <div key={i} className="mb-4 border-b border-gray-800 pb-2 last:border-0 animation-fade-in">
                        <div className="flex gap-2">
                            <span className="text-emerald-400">[{log.time}]</span>
                            <span>{log.msg}</span>
                        </div>
                        {log.data && (
                            <pre className="mt-2 bg-slate-800 p-3 rounded-lg overflow-x-auto text-xs text-blue-200">
                                {JSON.stringify(log.data, null, 2)}
                            </pre>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
