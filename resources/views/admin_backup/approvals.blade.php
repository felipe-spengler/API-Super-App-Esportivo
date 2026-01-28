@extends('admin.layout')

@section('content')
    <h2 class="text-3xl font-bold text-gray-800 mb-2">Aprovações Pendentes</h2>
    <p class="text-gray-500 mb-8">Valide documentos de atletas e times.</p>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Card de Aprovação 1 -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 flex flex-col">
            <div class="relative h-48 bg-gray-200 group cursor-pointer">
                <img src="https://via.placeholder.com/400x300?text=RG+Frente"
                    class="w-full h-full object-cover opacity-90 transition group-hover:opacity-100">
                <div
                    class="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                    <i class="fas fa-search-plus text-white text-3xl"></i>
                </div>
            </div>
            <div class="p-6 flex-1 flex flex-col">
                <div class="flex items-center justify-between mb-2">
                    <span class="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">RG / Identidade</span>
                    <span class="text-xs text-gray-400">Há 2 horas</span>
                </div>
                <h3 class="font-bold text-gray-800 text-lg">Felipe Spengler</h3>
                <p class="text-sm text-gray-500 mb-4">Atleta - Tigers FC</p>

                <div class="mt-auto grid grid-cols-2 gap-3">
                    <button
                        class="flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-lg font-bold transition">
                        <i class="fas fa-times mr-2"></i> Recusar
                    </button>
                    <button
                        class="flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 py-2 rounded-lg font-bold transition">
                        <i class="fas fa-check mr-2"></i> Aprovar
                    </button>
                </div>
            </div>
        </div>

        <!-- Card de Aprovação 2 -->
        <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 flex flex-col">
            <div class="relative h-48 bg-gray-200 group cursor-pointer">
                <img src="https://via.placeholder.com/400x300?text=Comprovante+Pagamento"
                    class="w-full h-full object-cover opacity-90 transition group-hover:opacity-100">
                <div
                    class="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                    <i class="fas fa-search-plus text-white text-3xl"></i>
                </div>
            </div>
            <div class="p-6 flex-1 flex flex-col">
                <div class="flex items-center justify-between mb-2">
                    <span class="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">Comprovante PIX</span>
                    <span class="text-xs text-gray-400">Há 5 horas</span>
                </div>
                <h3 class="font-bold text-gray-800 text-lg">Inscrição #4092</h3>
                <p class="text-sm text-gray-500 mb-4">R$ 150,00 - Tigers FC</p>

                <div class="mt-auto grid grid-cols-2 gap-3">
                    <button
                        class="flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-lg font-bold transition">
                        <i class="fas fa-times mr-2"></i> Recusar
                    </button>
                    <button
                        class="flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 py-2 rounded-lg font-bold transition">
                        <i class="fas fa-check mr-2"></i> Validar
                    </button>
                </div>
            </div>
        </div>

        <!-- Empty State Mock -->
        <div
            class="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-6 text-gray-400">
            <i class="fas fa-check-double text-4xl mb-3"></i>
            <p>Não há mais documentos pendentes.</p>
        </div>
    </div>
@endsection