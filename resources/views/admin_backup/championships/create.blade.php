@extends('admin.layout')

@section('content')
    <div class="max-w-3xl mx-auto">
        <div class="flex items-center mb-6">
            <a href="{{ url('/admin/championships') }}" class="mr-4 text-gray-500 hover:text-gray-700">
                <i class="fas fa-arrow-left fa-lg"></i>
            </a>
            <h2 class="text-3xl font-bold text-gray-800">Criar Campeonato</h2>
        </div>

        <div class="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div class="p-8">
                <!-- Wizard Steps Header -->
                <div class="flex items-center justify-between mb-8 relative">
                    <div class="absolute w-full h-1 bg-gray-200 top-1/2 transform -translate-y-1/2 z-0"></div>

                    <div class="relative z-10 flex flex-col items-center">
                        <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                            1</div>
                        <span class="text-xs font-bold text-blue-600 mt-1">Dados Básicos</span>
                    </div>
                    <div class="relative z-10 flex flex-col items-center">
                        <div
                            class="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold">
                            2</div>
                        <span class="text-xs font-bold text-gray-400 mt-1">Categorias</span>
                    </div>
                    <div class="relative z-10 flex flex-col items-center">
                        <div
                            class="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold">
                            3</div>
                        <span class="text-xs font-bold text-gray-400 mt-1">Preços</span>
                    </div>
                </div>

                <form action="#" method="POST" class="space-y-6">
                    <!-- Step 1 Content -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Nome do Evento</label>
                            <input type="text"
                                class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                                placeholder="Ex: Copa Inverno 2026">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Modalidade</label>
                            <select
                                class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border">
                                <option>Futebol</option>
                                <option>Futsal</option>
                                <option>Vôlei</option>
                                <option>Corrida de Rua</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Formato</label>
                            <select
                                class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border">
                                <option value="league">Liga (Pontos Corridos)</option>
                                <option value="knockout">Mata-Mata</option>
                                <option value="group_knockout">Grupos + Mata-Mata</option>
                                <option value="racing">Corrida / Maratona</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Início</label>
                            <input type="date"
                                class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Fim</label>
                            <input type="date"
                                class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border">
                        </div>

                        <div class="col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
                            <textarea rows="3"
                                class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                                placeholder="Detalhes do regulamento, local, etc..."></textarea>
                        </div>

                        <div class="col-span-2">
                            <label class="block text-sm font-medium text-gray-700 mb-2">Banner (URL)</label>
                            <input type="text"
                                class="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3 border"
                                placeholder="https://...">
                        </div>
                    </div>

                    <div class="flex justify-end pt-6 border-t border-gray-100">
                        <button type="button"
                            class="mr-3 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition">
                            Cancelar
                        </button>
                        <button type="submit"
                            class="px-6 py-2 bg-blue-600 rounded-lg text-white font-bold hover:bg-blue-700 shadow-lg transition transform hover:-translate-y-0.5">
                            Próximo Passo <i class="fas fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
@endsection