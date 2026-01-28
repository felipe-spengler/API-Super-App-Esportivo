@extends('admin.layout')

@section('content')
    <h2 class="text-3xl font-bold text-gray-800 mb-8">Dashboard</h2>

    <!-- Cards de Métricas -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Receita Total</p>
                    <h3 class="text-2xl font-bold text-gray-800 mt-1">R$ 45.280,00</h3>
                </div>
                <div class="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <i class="fas fa-dollar-sign"></i>
                </div>
            </div>
            <p class="text-xs text-green-600 mt-4 font-bold"><i class="fas fa-arrow-up mr-1"></i> 12% vs mês anterior</p>
        </div>

        <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Atletas Ativos</p>
                    <h3 class="text-2xl font-bold text-gray-800 mt-1">1,248</h3>
                </div>
                <div class="p-2 bg-green-50 rounded-lg text-green-600">
                    <i class="fas fa-running"></i>
                </div>
            </div>
            <p class="text-xs text-green-600 mt-4 font-bold"><i class="fas fa-arrow-up mr-1"></i> 54 novos hoje</p>
        </div>

        <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-yellow-500">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Campeonatos</p>
                    <h3 class="text-2xl font-bold text-gray-800 mt-1">8</h3>
                </div>
                <div class="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                    <i class="fas fa-trophy"></i>
                </div>
            </div>
            <p class="text-xs text-gray-500 mt-4">2 finalizando essa semana</p>
        </div>

        <div class="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Clubes Parceiros</p>
                    <h3 class="text-2xl font-bold text-gray-800 mt-1">12</h3>
                </div>
                <div class="p-2 bg-purple-50 rounded-lg text-purple-600">
                    <i class="fas fa-building"></i>
                </div>
            </div>
            <p class="text-xs text-blue-600 mt-4 font-bold">Novo clube pendente</p>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Tabela de Últimos Pagamentos -->
        <div class="bg-white rounded-xl shadow-sm p-6">
            <h3 class="font-bold text-lg text-gray-800 mb-4">Últimas Transações</h3>
            <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                    <thead>
                        <tr class="bg-gray-50 text-gray-500 text-left">
                            <th class="p-3">ID</th>
                            <th class="p-3">Usuário</th>
                            <th class="p-3">Valor</th>
                            <th class="p-3">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        <tr>
                            <td class="p-3">#1942</td>
                            <td class="p-3 font-medium">Carlos Silva</td>
                            <td class="p-3">R$ 150,00</td>
                            <td class="p-3"><span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">PAGO</span>
                            </td>
                        </tr>
                        <tr>
                            <td class="p-3">#1941</td>
                            <td class="p-3 font-medium">Ana Souza</td>
                            <td class="p-3">R$ 80,00</td>
                            <td class="p-3"><span
                                    class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">PENDENTE</span></td>
                        </tr>
                        <tr>
                            <td class="p-3">#1940</td>
                            <td class="p-3 font-medium">Roberto Nunes</td>
                            <td class="p-3">R$ 150,00</td>
                            <td class="p-3"><span class="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">FALHA</span>
                            </td>
                        </tr>
                        <tr>
                            <td class="p-3">#1939</td>
                            <td class="p-3 font-medium">Julia M.</td>
                            <td class="p-3">R$ 45,00</td>
                            <td class="p-3"><span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">PAGO</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div class="mt-4 text-center">
                <a href="#" class="text-blue-600 text-sm font-bold hover:underline">Ver todas as transações</a>
            </div>
        </div>

        <!-- Próximos Eventos -->
        <div class="bg-white rounded-xl shadow-sm p-6">
            <h3 class="font-bold text-lg text-gray-800 mb-4">Calendário de Eventos</h3>
            <div class="space-y-4">
                <div
                    class="flex items-center p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-gray-100 cursor-pointer">
                    <div
                        class="bg-blue-100 text-blue-600 rounded-lg w-12 h-12 flex items-center justify-center font-bold mr-4">
                        25<br><span class="text-[10px] uppercase">Jan</span>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-bold text-gray-800">Copa Verão de Futsal</h4>
                        <p class="text-xs text-gray-500">Clube Toledão • 08:00</p>
                    </div>
                    <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Início</span>
                </div>

                <div
                    class="flex items-center p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-gray-100 cursor-pointer">
                    <div
                        class="bg-green-100 text-green-600 rounded-lg w-12 h-12 flex items-center justify-center font-bold mr-4">
                        30<br><span class="text-[10px] uppercase">Jan</span>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-bold text-gray-800">Corrida Noturna 5k</h4>
                        <p class="text-xs text-gray-500">Run Events • 19:30</p>
                    </div>
                    <span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Aberto</span>
                </div>

                <div
                    class="flex items-center p-3 hover:bg-gray-50 rounded-lg transition border border-transparent hover:border-gray-100 cursor-pointer">
                    <div
                        class="bg-purple-100 text-purple-600 rounded-lg w-12 h-12 flex items-center justify-center font-bold mr-4">
                        05<br><span class="text-[10px] uppercase">Fev</span>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-bold text-gray-800">Torneio de Beach Tennis</h4>
                        <p class="text-xs text-gray-500">Arena Beach • 09:00</p>
                    </div>
                    <span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">Rascunho</span>
                </div>
            </div>
            <div class="mt-4 text-center">
                <a href="#" class="text-blue-600 text-sm font-bold hover:underline">Ver calendário completo</a>
            </div>
        </div>
    </div>
@endsection