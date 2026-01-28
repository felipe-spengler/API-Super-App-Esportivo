import { Trophy, Timer, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function NewEventSelection() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="max-w-4xl w-full text-center space-y-4 mb-12">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">Qual tipo de evento você quer criar?</h1>
                <p className="text-xl text-gray-500">O sistema adapta as ferramentas de gestão conforme a modalidade escolhida.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl w-full">
                {/* CARD 1: Campeonato de Times (Futebol, Volei) */}
                <button
                    onClick={() => navigate('/championships/new/team-sports')}
                    className="group relative bg-white rounded-3xl p-8 shadow-xl border-2 border-transparent hover:border-indigo-500 text-left transition-all hover:-translate-y-2 hover:shadow-2xl flex flex-col"
                >
                    <div className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors">
                        <Trophy className="w-8 h-8 text-indigo-600 group-hover:text-white transition-colors" />
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Campeonato / Torneio</h3>
                    <p className="text-gray-500 mb-6 flex-1">
                        Ideal para esportes coletivos com estrutura de <strong>Times, Tabela de Jogos, Grupos e Mata-mata.</strong>
                    </p>

                    <div className="flex flex-wrap gap-2 mb-8">
                        {['Futebol', 'Futsal', 'Vôlei', 'Basquete', 'Handebol'].map(s => (
                            <span key={s} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase">{s}</span>
                        ))}
                    </div>

                    <div className="flex items-center text-indigo-600 font-bold group-hover:gap-2 transition-all">
                        Criar Torneio <ArrowRight className="w-5 h-5 ml-2" />
                    </div>
                </button>

                {/* CARD 2: Corrida / Prova (Running, Swim) */}
                <button
                    onClick={() => navigate('/races/new')}
                    className="group relative bg-white rounded-3xl p-8 shadow-xl border-2 border-transparent hover:border-emerald-500 text-left transition-all hover:-translate-y-2 hover:shadow-2xl flex flex-col"
                >
                    <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors">
                        <Timer className="w-8 h-8 text-emerald-600 group-hover:text-white transition-colors" />
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Corrida / Prova Individual</h3>
                    <p className="text-gray-500 mb-6 flex-1">
                        Ideal para eventos baseados em <strong>Tempo, Distância e Faixas Etárias.</strong> Inscrição individual.
                    </p>

                    <div className="flex flex-wrap gap-2 mb-8">
                        {['Corrida de Rua', 'Ciclismo', 'MTB', 'Natação', 'Triathlon'].map(s => (
                            <span key={s} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase">{s}</span>
                        ))}
                    </div>

                    <div className="flex items-center text-emerald-600 font-bold group-hover:gap-2 transition-all">
                        Criar Corrida <ArrowRight className="w-5 h-5 ml-2" />
                    </div>
                </button>
            </div>

            <button onClick={() => navigate(-1)} className="mt-12 text-gray-400 font-bold hover:text-gray-600 transition-colors">
                Cancelar e Voltar
            </button>
        </div>
    );
}
