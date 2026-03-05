import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ChevronLeft, Search, Timer, Hash, User, Layers, CheckCircle2 } from 'lucide-react';
import api from '../../../services/api';

interface AthleteResult {
    id: number;
    name: string;
    bib_number: string;
    net_time: string;
    position_general: string;
    position_category: string;
    category?: { name: string; parent?: { name: string } };
}

export function IndividualManualResult() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [athletes, setAthletes] = useState<AthleteResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            setLoading(true);
            const response = await api.get(`/races/${id}/results`);
            setAthletes(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleChange = (id: number, field: keyof AthleteResult, value: string) => {
        setAthletes(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Salvar um por um por enquanto, ou implementar batch no backend
            // Vamos assumir que o usuário só quer salvar os que ele alterou
            // Para simplificar esta demo, salvaremos todos em loop
            const promises = athletes.map(a =>
                api.put(`/results/${a.id}`, {
                    net_time: a.net_time,
                    position_general: a.position_general,
                    position_category: a.position_category,
                    bib_number: a.bib_number
                })
            );
            await Promise.all(promises);
            alert('Resultados salvos com sucesso!');
            navigate(`/admin/individual/championships/${id}/results`);
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar alguns resultados');
        } finally {
            setSaving(false);
        }
    };

    const filtered = athletes.filter(a =>
        a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.bib_number?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 leading-none">Lançamento Manual</h1>
                        <p className="text-slate-500 font-medium mt-1">Defina tempos e classificações diretamente.</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg disabled:opacity-50"
                >
                    {saving ? 'Salvando...' : (
                        <>
                            <Save size={18} />
                            Salvar Alterações
                        </>
                    )}
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Filtrar atletas por nome ou número..."
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Atleta / Categoria</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider w-32">Nº Peito</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider w-40">Tempo (HH:MM:SS)</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider w-24">Pos Geral</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider w-24">Pos Cat</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 uppercase">
                        {loading ? (
                            <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-bold italic">Buscando lista de atletas...</td></tr>
                        ) : filtered.map(athlete => (
                            <tr key={athlete.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3">
                                    <p className="font-bold text-slate-900 text-sm uppercase">{athlete.name}</p>
                                    <p className="text-[10px] text-indigo-600 font-black uppercase">
                                        {athlete.category?.name} {athlete.category?.parent?.name ? `(${athlete.category.parent.name})` : ''}
                                    </p>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                                        <Hash size={12} className="text-slate-400" />
                                        <input
                                            type="text"
                                            className="bg-transparent w-full text-sm font-bold text-slate-700 outline-none"
                                            value={athlete.bib_number || ''}
                                            onChange={e => handleChange(athlete.id, 'bib_number', e.target.value)}
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                                        <Timer size={14} className="text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="00:00:00"
                                            className="bg-transparent w-full text-sm font-black text-slate-900 outline-none"
                                            value={athlete.net_time || ''}
                                            onChange={e => handleChange(athlete.id, 'net_time', e.target.value)}
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-3">
                                    <input
                                        type="number"
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none text-center"
                                        value={athlete.position_general || ''}
                                        onChange={e => handleChange(athlete.id, 'position_general', e.target.value)}
                                    />
                                </td>
                                <td className="px-6 py-3 text-center">
                                    <input
                                        type="number"
                                        className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none text-center"
                                        value={athlete.position_category || ''}
                                        onChange={e => handleChange(athlete.id, 'position_category', e.target.value)}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
