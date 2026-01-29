
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, Download } from 'lucide-react';

export function EventArts() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Gerador de Artes</h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <Smartphone className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Exclusivo no App!</h2>
                <p className="text-gray-500 mb-8">
                    O Gerador de Artes Oficiais (Cards de MVP, Artilharia, Confrontos) está disponível exclusivamente no nosso Aplicativo Mobile.
                </p>
                <button className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-colors">
                    <Download className="w-5 h-5" />
                    Baixar Aplicativo
                </button>
            </div>
        </div>
    );
}
