
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Shield, UserPlus, MoreHorizontal } from 'lucide-react';

export function MyTeams() {
    const navigate = useNavigate();

    // Mock Data
    const teams = [
        { id: 1, name: 'Tigres FC', role: 'Capitão', members: 12, sport: 'Futebol' },
        { id: 2, name: 'Vôlei Master', role: 'Atleta', members: 8, sport: 'Vôlei' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <div className="bg-white p-4 pt-8 shadow-sm flex items-center justify-between sticky top-0 z-10 border-b border-gray-100">
                <div className="flex items-center">
                    <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">Meus Times</h1>
                </div>
                <button className="p-2 bg-indigo-50 text-indigo-600 rounded-lg flex items-center gap-1 text-xs font-bold hover:bg-indigo-100">
                    <UserPlus className="w-4 h-4" /> Criar Time
                </button>
            </div>

            <div className="max-w-lg mx-auto p-4 space-y-4">
                {teams.map((team) => (
                    <div key={team.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                                    <Shield className="w-6 h-6 text-gray-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 leading-tight">{team.name}</h3>
                                    <span className="text-xs text-gray-500 font-medium">{team.sport}</span>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${team.role === 'Capitão' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {team.role}
                                </span>
                            </div>
                            <div className="flex items-center text-xs text-gray-500 font-medium">
                                <Users className="w-4 h-4 mr-1" />
                                {team.members} Membros
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
