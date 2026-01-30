import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';

export function SumulaBasquete() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
            <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 bg-gray-800 rounded-full hover:bg-gray-700">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <Construction className="w-24 h-24 text-orange-500 mb-6 animate-bounce" />
            <h1 className="text-3xl font-bold mb-2 text-center">Súmula de Basquete</h1>
            <p className="text-gray-400 text-center max-w-md">
                Estamos construindo esta funcionalidade. Em breve você poderá registrar pontos, faltas e quartos para partidas de basquete.
            </p>
            <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <h3 className="font-bold text-sm text-gray-400 uppercase mb-2">Features Planejadas:</h3>
                <ul className="list-disc list-inside text-sm space-y-1 text-gray-300">
                    <li>Controle de Quartos (4x10min ou 4x12min)</li>
                    <li>Pontuação (1, 2, 3 pontos)</li>
                    <li>Faltas Individuais (Limite 5)</li>
                    <li>Faltas Coletivas (Bônus)</li>
                    <li>Cronômetro Regressivo com Pausa</li>
                </ul>
            </div>
        </div>
    );
}
