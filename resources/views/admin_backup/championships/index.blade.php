@extends('admin.layout')

@section('content')
    <div class="flex justify-between items-center mb-6">
        <h2 class="text-3xl font-bold text-gray-800">Meus Campeonatos</h2>
        <a href="{{ url('/admin/championships/create') }}"
            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow transition">
            <i class="fas fa-plus mr-2"></i>Novo Campeonato
        </a>
    </div>

    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
                <thead>
                    <tr
                        class="bg-gray-50 border-b border-gray-200 text-gray-600 text-left uppercase text-xs font-bold tracking-wider">
                        <th class="p-4">Nome</th>
                        <th class="p-4">Esporte</th>
                        <th class="p-4">Datas</th>
                        <th class="p-4">Status</th>
                        <th class="p-4 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <!-- Loop de Campeonatos (Mockado na View por enquanto, Controller deve injetar) -->
                    @php
                        // Dados Mockados para Exemplo Visual
                        $championships = [
                            (object) ['id' => 1, 'name' => 'Copa Verão de Futsal', 'sport' => 'Futsal', 'start' => '25/01/2026', 'end' => '10/02/2026', 'status' => 'registrations_open'],
                            (object) ['id' => 2, 'name' => 'Corrida Noturna 5k', 'sport' => 'Corrida', 'start' => '30/01/2026', 'end' => '30/01/2026', 'status' => 'in_progress'],
                        ];
                    @endphp

                    @foreach($championships as $champ)
                        <tr class="hover:bg-gray-50 transition">
                            <td class="p-4">
                                <p class="font-bold text-gray-800 text-base">{{ $champ->name }}</p>
                                <p class="text-xs text-gray-400">ID: #{{ $champ->id }}</p>
                            </td>
                            <td class="p-4">
                                <span
                                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {{ $champ->sport }}
                                </span>
                            </td>
                            <td class="p-4 text-gray-600">
                                {{ $champ->start }} <i class="fas fa-arrow-right mx-1 text-xs"></i> {{ $champ->end }}
                            </td>
                            <td class="p-4">
                                @if($champ->status == 'registrations_open')
                                    <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">Inscrições
                                        Abertas</span>
                                @else
                                    <span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">Em
                                        Andamento</span>
                                @endif
                            </td>
                            <td class="p-4 text-center">
                                <div class="flex items-center justify-center space-x-2">
                                    <button class="text-gray-400 hover:text-blue-600 transition" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="text-gray-400 hover:text-green-600 transition"
                                        title="Gerenciar Chaves/Resultados">
                                        <i class="fas fa-project-diagram"></i>
                                    </button>
                                    <button class="text-gray-400 hover:text-red-600 transition" title="Excluir">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <!-- Paginação Mock -->
        <div class="p-4 border-t border-gray-200 flex justify-end">
            <nav class="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <a href="#"
                    class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <span class="sr-only">Anterior</span>
                    <i class="fas fa-chevron-left"></i>
                </a>
                <a href="#" aria-current="page"
                    class="z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium">1</a>
                <a href="#"
                    class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">2</a>
                <a href="#"
                    class="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">3</a>
                <a href="#"
                    class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <span class="sr-only">Próximo</span>
                    <i class="fas fa-chevron-right"></i>
                </a>
            </nav>
        </div>
    </div>
@endsection