import { Save, Bell, Shield, Lock, CreditCard } from 'lucide-react';

export function Settings() {
    return (
        <div className="animate-in fade-in duration-500 max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 font-display">Configurações</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-col md:flex-row">
                    {/* Sidebar de Configurações */}
                    <div className="w-full md:w-64 bg-gray-50 border-r border-gray-100 p-4 space-y-1">
                        <button className="w-full text-left px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center gap-3">
                            <Shield className="w-4 h-4" />
                            Geral
                        </button>
                        <button className="w-full text-left px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium text-sm flex items-center gap-3 transition-colors">
                            <Lock className="w-4 h-4" />
                            Segurança & Permissões
                        </button>
                        <button className="w-full text-left px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium text-sm flex items-center gap-3 transition-colors">
                            <Bell className="w-4 h-4" />
                            Notificações
                        </button>
                        <button className="w-full text-left px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium text-sm flex items-center gap-3 transition-colors">
                            <CreditCard className="w-4 h-4" />
                            Pagamentos
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-8">
                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Informações da Organização</h2>
                            <div className="grid gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nome do Clube / Entidade</label>
                                    <input
                                        type="text"
                                        defaultValue="Toledão - Clube Esportivo"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email de Contato</label>
                                    <input
                                        type="email"
                                        defaultValue="contato@toledao.com.br"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Aparência do App</h2>
                            <div className="flex items-center gap-4">
                                <div className="border-2 border-indigo-500 p-1 rounded-lg cursor-pointer">
                                    <div className="w-20 h-12 bg-white rounded border border-gray-200 shadow-sm relative overflow-hidden">
                                        <div className="h-2 bg-indigo-600 w-full absolute top-0"></div>
                                    </div>
                                    <p className="text-center text-xs font-bold text-indigo-600 mt-1">Claro</p>
                                </div>
                                <div className="opacity-50 cursor-pointer hover:opacity-100 transition-opacity">
                                    <div className="w-20 h-12 bg-slate-900 rounded border border-gray-700 shadow-sm relative overflow-hidden">
                                        <div className="h-2 bg-indigo-600 w-full absolute top-0"></div>
                                    </div>
                                    <p className="text-center text-xs font-bold text-gray-500 mt-1">Escuro</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center gap-2">
                                <Save className="w-4 h-4" />
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
