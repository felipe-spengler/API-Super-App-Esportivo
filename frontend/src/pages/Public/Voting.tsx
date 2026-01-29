
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ThumbsUp, BarChart2 } from 'lucide-react';

export function Voting() {
    const navigate = useNavigate();

    // Mock Polls
    const polls = [
        { id: 1, question: 'Quem foi o melhor jogador da final?', options: ['João Silva (Tigres)', 'Pedro Santos (Leões)', 'Marcos (Goleiro)'] },
        { id: 2, question: 'Qual o melhor horário para os jogos de 2026?', options: ['Sábado de manhã', 'Domingo de manhã', 'Domingo a tarde'] },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center sticky top-0 z-10 border-b border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <h1 className="text-xl font-bold text-gray-800">Votação & Enquetes</h1>
            </div>

            <div className="max-w-lg mx-auto p-4 space-y-6">
                {polls.map((poll) => (
                    <div key={poll.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                            <h3 className="font-bold text-indigo-900 flex items-start gap-2">
                                <BarChart2 className="w-5 h-5 shrink-0" />
                                {poll.question}
                            </h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {poll.options.map((opt, idx) => (
                                <button key={idx} className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all flex justify-between items-center group">
                                    <span className="text-gray-700 font-medium group-hover:text-indigo-700">{opt}</span>
                                    <ThumbsUp className="w-4 h-4 text-gray-300 group-hover:text-indigo-500" />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
