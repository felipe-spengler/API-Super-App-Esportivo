import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CreditCard, ArrowUpRight, ArrowDownLeft, DollarSign, Wallet, ExternalLink, Calendar } from 'lucide-react';
import api from '../../../services/api';

export function IndividualPaymentManager() {
    const { id } = useParams();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">Financeiro (Asaas)</h1>
                    <p className="text-slate-500 font-medium">Acompanhe as transações e o saldo do evento.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition-all shadow-sm">
                        <Calendar size={18} />
                        Filtro de Data
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold transition-all shadow-lg">
                        <ExternalLink size={18} />
                        Abrir Asaas
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Wallet size={24} />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Saldo Total</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">R$ 0,00</p>
                    <p className="text-xs text-slate-500 font-medium mt-1">Aguardando confirmações</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <ArrowUpRight size={24} />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Receitas</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">R$ 0,00</p>
                    <p className="text-xs text-emerald-600 font-bold mt-1">+ R$ 0,00 hoje</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                            <ArrowDownLeft size={24} />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Taxas / Estornos</span>
                    </div>
                    <p className="text-3xl font-black text-slate-900">R$ 0,00</p>
                    <p className="text-xs text-red-500 font-bold mt-1">- R$ 0,00 em taxas</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-black text-slate-900">Últimas Transações</h3>
                </div>
                <div className="p-12 text-center text-slate-400">
                    Nenhuma transação registrada até o momento.
                </div>
            </div>
        </div>
    );
}
