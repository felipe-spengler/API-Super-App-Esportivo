import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Download, UserPlus, FileCheck, CreditCard, Mail } from 'lucide-react';
import api from '../../../services/api';

export function IndividualAthleteManager() {
    const { id } = useParams();
    const [athletes, setAthletes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadAthletes();
    }, [id]);

    async function loadAthletes() {
        try {
            // Reusing teams endpoint since individual athletes are stored in the teams table for now
            const response = await api.get(`/championships/${id}/teams`);
            setAthletes(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const filteredAthletes = athletes.filter(a =>
        (a.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.category_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Gestão de Atletas</h1>
                    <p className="text-slate-500 font-medium">Visualize e gerencie todos os inscritos no evento.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all shadow-sm">
                        <Download size={18} />
                        Exportar CSV
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold transition-all shadow-lg">
                        <UserPlus size={18} />
                        Adicionar Atleta
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nome, categoria ou CPF..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold">
                    <Filter size={18} />
                    Filtros
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500 font-medium">Carregando inscritos...</div>
                ) : filteredAthletes.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="text-slate-300" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Nenhum atleta encontrado</h3>
                        <p className="text-slate-500">Comece adicionando manualmente ou aguarde as inscrições.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Atleta</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Categoria / Prova</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Status Pagamento</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAthletes.map(athlete => (
                                    <tr key={athlete.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 group-hover:bg-emerald-100 transition-colors flex items-center justify-center font-bold text-slate-500 group-hover:text-emerald-600">
                                                    {athlete.name?.substring(0, 1)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{athlete.name}</p>
                                                    <p className="text-xs text-slate-500 font-medium">{athlete.phone || 'Sem telefone'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg uppercase">
                                                {athlete.category_name || 'Geral'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                                                <FileCheck size={14} />
                                                Confirmado
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
                                                    <Mail size={18} />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                                                    <Settings size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
