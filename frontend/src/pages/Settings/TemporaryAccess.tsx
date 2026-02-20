import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Trash, Clock, User, Mail, ShieldAlert, Key, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TempUser {
    id: number;
    name: string;
    email: string;
    expires_at: string;
    club_id: number | null;
    club?: {
        id: number;
        name: string;
    };
    created_at: string;
}

interface Club {
    id: number;
    name: string;
}

export function TemporaryAccess() {
    const { user } = useAuth();
    const [tempUsers, setTempUsers] = useState<TempUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '', // Optional, defaulting to generated
        expires_at: '',
        club_id: '' as string | number
    });
    const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
    const [clubs, setClubs] = useState<Club[]>([]);

    const isSuperAdmin = user?.role === 'super_admin' || (user as any)?.is_super_admin;

    useEffect(() => {
        loadData();
        if (isSuperAdmin) {
            loadClubs();
        }
    }, [isSuperAdmin]);

    const loadClubs = async () => {
        try {
            const response = await api.get('/admin/clubs-manage');
            setClubs(response.data.data || response.data); // Adjust based on API response structure
        } catch (error) {
            console.error("Erro ao carregar clubes", error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/temporary-access');
            setTempUsers(response.data);
        } catch (error) {
            console.error("Erro ao carregar lista de acessos", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja revogar este acesso imediatamente?')) return;

        try {
            await api.delete(`/admin/temporary-access/${id}`);
            loadData();
        } catch (error) {
            console.error("Erro ao revogar acesso", error);
            alert('Erro ao revogar acesso');
        }
    };

    const handleEdit = (u: TempUser) => {
        setEditingId(u.id);
        // Ajuste para datetime-local: YYYY-MM-DDTHH:mm
        const date = new Date(u.expires_at);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        const formattedDate = date.toISOString().slice(0, 16);

        setFormData({
            name: u.name,
            email: u.email,
            password: '',
            expires_at: formattedDate,
            club_id: u.club_id || ''
        });
        setShowModal(true);
    };

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Converter data local do input para ISO String (UTC)
            // Isso evita que o servidor interprete 16:00 Local como 16:00 UTC (que seria passado)
            const payload = {
                ...formData,
                expires_at: new Date(formData.expires_at).toISOString()
            };

            if (editingId) {
                // Update (Renovar)
                await api.put(`/admin/temporary-access/${editingId}`, {
                    expires_at: payload.expires_at,
                    password: formData.password || undefined
                });
                alert('Acesso renovado com sucesso!');
            } else {
                // Create
                const response = await api.post('/admin/temporary-access', payload);
                setGeneratedPassword(response.data.plain_password);
            }

            loadData();
            setShowModal(false);
            setEditingId(null);
            setFormData({ name: '', email: '', password: '', expires_at: '', club_id: '' });
        } catch (error: any) {
            console.error("Erro ao salvar acesso", error);
            alert('Erro ao salvar: ' + (error.response?.data?.message || 'Verifique os dados'));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Acessos Temporários</h1>
                    <p className="text-gray-500">Gerencie contas de administrador com validade definida.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ name: '', email: '', password: '', expires_at: '', club_id: '' });
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={20} />
                    Novo Acesso
                </button>
            </div>

            {generatedPassword && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center justify-between animate-fade-in mb-6">
                    <div>
                        <h4 className="font-bold text-green-800 flex items-center gap-2">
                            <Key size={18} />
                            Acesso Criado com Sucesso!
                        </h4>
                        <p className="text-green-700 mt-1">
                            Anote a senha gerada para o usuário (ela não será mostrada novamente):
                        </p>
                        <div className="mt-2 text-xl font-mono bg-white inline-block px-3 py-1 rounded border border-green-300 select-all">
                            {generatedPassword}
                        </div>
                    </div>
                    <button onClick={() => setGeneratedPassword(null)} className="text-green-600 hover:text-green-800 text-sm underline">Fechar</button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Mobile View: Cards */}
                <div className="md:hidden divide-y divide-gray-100">
                    {tempUsers.length === 0 ? (
                        <div className="p-6 text-center text-gray-400">Nenhum acesso temporário ativo.</div>
                    ) : (
                        tempUsers.map((u) => {
                            const expiry = parseISO(u.expires_at);
                            const isExpired = new Date() > expiry;
                            return (
                                <div key={u.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                                <User size={18} />
                                            </div>
                                            <div className="overflow-hidden">
                                                <h3 className="font-bold text-gray-900 truncate">{u.name}</h3>
                                                <div className="flex items-center gap-1 text-sm text-gray-500 truncate">
                                                    <Mail size={12} /> {u.email}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isExpired ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                            {isExpired ? 'EXPIRADO' : 'ATIVO'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                        <Clock size={14} className={isExpired ? 'text-red-500' : 'text-orange-500'} />
                                        <span className="font-medium">Expira:</span>
                                        {format(expiry, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <button onClick={() => handleEdit(u)} className="flex-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                            <RefreshCw size={14} /> Renovar
                                        </button>
                                        <button onClick={() => handleDelete(u.id)} className="flex-1 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                            <Trash size={14} /> Revogar
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Nome</th>
                                {isSuperAdmin && <th className="px-6 py-4">Clube</th>}
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Expira em</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tempUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={isSuperAdmin ? 6 : 5} className="px-6 py-8 text-center text-gray-400">
                                        Nenhum acesso temporário ativo.
                                    </td>
                                </tr>
                            ) : (
                                tempUsers.map((u) => {
                                    const expiry = parseISO(u.expires_at);
                                    const isExpired = new Date() > expiry;

                                    return (
                                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                                    <User size={16} />
                                                </div>
                                                {u.name}
                                            </td>
                                            {isSuperAdmin && (
                                                <td className="px-6 py-4 text-gray-600">
                                                    {u.club ? u.club.name : <span className="text-gray-400 italic">Sem clube</span>}
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Mail size={14} />
                                                    {u.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`flex items-center gap-2 ${isExpired ? 'text-red-500 font-bold' : 'text-orange-600'} `}>
                                                    <Clock size={16} />
                                                    {format(expiry, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${isExpired
                                                    ? 'bg-red-50 text-red-600 border-red-100'
                                                    : 'bg-green-50 text-green-600 border-green-100'
                                                    } `}>
                                                    {isExpired ? 'EXPIRADO' : 'ATIVO'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleEdit(u)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2"
                                                    title="Renovar / Editar"
                                                >
                                                    <RefreshCw size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Revogar Acesso"
                                                >
                                                    <Trash size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-scale-in">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <ShieldAlert className="text-indigo-600" />
                            {editingId ? 'Renovar / Editar Acesso' : 'Novo Acesso Temporário'}
                        </h2>

                        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                            {isSuperAdmin && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Clube Vinculado</label>
                                    <select
                                        value={formData.club_id}
                                        onChange={e => setFormData({ ...formData, club_id: e.target.value })}
                                        disabled={!!editingId} // Usually club shouldn't change after creation for temp access, or maybe it can? Let's allow if needed, but user requirement didn't specify. Standard is usually locked or editable. Let's keep it editable if new, locked if edit? 
                                        // User said: "vincula a nenhum clube". Correct.
                                        // Let's assume editable for now or follow same pattern as other fields. Name/Email are disabled on edit. Club probably should be too.
                                        className={`w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${editingId ? 'bg-gray-100 text-gray-500' : ''}`}
                                    >
                                        <option value="">Selecione um clube...</option>
                                        {clubs.map(club => (
                                            <option key={club.id} value={club.id}>
                                                {club.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Responsável</label>
                                <input
                                    type="text"
                                    required
                                    disabled={!!editingId}
                                    className={`w - full px - 4 py - 2 border border - gray - 200 rounded - lg focus: ring - 2 focus: ring - indigo - 500 focus: border - indigo - 500 outline - none transition - all ${editingId ? 'bg-gray-100 text-gray-500' : ''} `}
                                    placeholder="Ex: João da Silva"
                                    value={formData.name}
                                    readOnly={!!editingId}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email de Login</label>
                                <input
                                    type="email"
                                    required
                                    disabled={!!editingId}
                                    className={`w - full px - 4 py - 2 border border - gray - 200 rounded - lg focus: ring - 2 focus: ring - indigo - 500 focus: border - indigo - 500 outline - none transition - all ${editingId ? 'bg-gray-100 text-gray-500' : ''} `}
                                    placeholder="Ex: joao.temp@clube.com"
                                    value={formData.email}
                                    readOnly={!!editingId}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {editingId ? 'Nova Data de Validade' : 'Validade do Acesso'}
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    value={formData.expires_at}
                                    onChange={e => setFormData({ ...formData, expires_at: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">O acesso será bloqueado automaticamente após esta data.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {editingId ? 'Redefinir Senha (Opcional)' : 'Senha Opcional (Deixe vazio para gerar)'}
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder={editingId ? "****************" : "Gerar automaticamente"}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                                >
                                    {editingId ? 'Salvar Alterações' : 'Criar Acesso'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
