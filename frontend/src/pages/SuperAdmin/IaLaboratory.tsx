
import { useState } from 'react';
import { Upload, Wand2, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle, Download, Camera } from 'lucide-react';
import api from '../../services/api';

export function IaLaboratory() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
            setResult(null);
            setError(null);
        }
    };

    const handleProcess = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('photo', file);

        try {
            // Usando a rota de teste que já existe no backend
            const response = await api.post('/test-remove-bg', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000 // Aumenta timeout para 2 mins no frontend também
            });

            if (response.data.ai_processed) {
                setResult(response.data);
            } else if (response.data.ai_error) {
                setError(response.data.ai_error);
                console.error("AI Error Output:", response.data.ai_output);
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'ECONNABORTED') {
                setError("O processador de IA demorou demais para responder (Timeout). Isso geralmente acontece na primeira vez que a ferramenta é usada no servidor enquanto ele baixa os arquivos necessários.");
            } else {
                setError(err.response?.data?.message || "Erro ao conectar com o serviço de IA. Verifique se o servidor tem Python e Rembg instalados.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-500 max-w-4xl mx-auto pb-20">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-600 rounded-lg text-white">
                        <Wand2 className="w-6 h-6" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Laboratório de IA</h1>
                </div>
                <p className="text-gray-500 italic">Teste a ferramenta de recorte automático (remoção de fundo) e otimize as artes do seu app.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Enviar Imagem</h2>

                        <div
                            className={`relative border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center p-8 text-center
                                ${preview ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
                        >
                            {preview ? (
                                <div className="space-y-4 w-full">
                                    <img src={preview} className="max-h-64 mx-auto rounded-lg shadow-md border-2 border-white" alt="Original" />
                                    <button
                                        onClick={() => { setFile(null); setPreview(null); }}
                                        className="text-xs text-red-500 font-bold hover:underline"
                                    >
                                        Remover e trocar
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer w-full">
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                            <Upload className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-700">Clique para selecionar</p>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG ou JPEG (Máx 4MB)</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </label>
                            )}
                        </div>

                        <button
                            onClick={handleProcess}
                            disabled={!file || loading}
                            className={`w-full mt-6 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg
                                ${loading
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>Processando via IA...</span>
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-6 h-6" />
                                    <span>Remover Fundo da Imagem</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 text-amber-800">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div className="text-xs leading-relaxed">
                            <strong>Nota:</strong> O processamento pode levar de 5 a 15 segundos. Se for a primeira vez que o servidor executa esta ferramenta, pode demorar até 1 minuto para baixar os modelos de IA.
                        </div>
                    </div>
                </div>

                {/* Result Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Resultado</h2>

                    {!loading && !result && !error && (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 text-center space-y-3">
                            <ImageIcon className="w-16 h-16 opacity-10" />
                            <p className="text-sm font-medium">O resultado aparecerá aqui após o processamento.</p>
                        </div>
                    )}

                    {loading && (
                        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                            <div className="relative w-20 h-20">
                                <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Wand2 className="w-8 h-8 text-indigo-600 animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-gray-800">Removendo fundo...</p>
                                <p className="text-xs text-gray-400">Isso pode levar alguns segundos</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-800">Falha no Processamento</h3>
                                <p className="text-xs text-red-600 mt-2 leading-relaxed">{error}</p>
                            </div>
                        </div>
                    )}

                    {result && (
                        <div className="flex-1 flex flex-col">
                            <div className="bg-checkered rounded-xl border border-gray-200 overflow-hidden relative group grow mb-4">
                                <img
                                    src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${result.photo_nobg_url}`}
                                    className="w-full h-full object-contain"
                                    alt="Resultado"
                                />
                                <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> IA SUCESSO
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Tempo</p>
                                        <p className="text-sm font-bold text-gray-700">{result.processing_time}</p>
                                    </div>
                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Tamanho</p>
                                        <p className="text-sm font-bold text-gray-700">{(result.processed_size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>

                                <a
                                    href={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${result.photo_nobg_url}`}
                                    download="atleta-sem-fundo.png"
                                    className="w-full py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                                >
                                    <Download className="w-4 h-4" /> Baixar Imagem (PNG)
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Checkerboard style for transparency visualization */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .bg-checkered {
                    background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
                    background-size: 20px 20px;
                    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                }
            `}} />
        </div>
    );
}
