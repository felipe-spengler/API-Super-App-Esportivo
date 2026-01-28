<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Super App Esportivo - Admin</title>
    <!-- Tailwind CSS (CDN para rapidez - Em produção usar build step) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
    <style>
        .active-nav {
            @apply bg-blue-800 text-white;
        }
    </style>
</head>

<body class="bg-gray-100 font-sans">

    <div class="flex h-screen overflow-hidden">
        <!-- Sidebar -->
        <div class="w-64 bg-blue-900 text-white flex flex-col">
            <div class="p-6 text-center border-b border-blue-800">
                <h1 class="text-2xl font-bold tracking-wider">SUPER APP</h1>
                <p class="text-blue-300 text-xs">Painel Administrativo</p>
            </div>

            <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
                <a href="{{ url('/admin') }}"
                    class="flex items-center p-3 rounded-lg hover:bg-blue-800 transition {{ request()->is('admin') ? 'bg-blue-800' : '' }}">
                    <i class="fas fa-chart-line w-8 text-center"></i> Dashboard
                </a>
                <a href="{{ url('/admin/championships') }}"
                    class="flex items-center p-3 rounded-lg hover:bg-blue-800 transition {{ request()->is('admin/championships*') ? 'bg-blue-800' : '' }}">
                    <i class="fas fa-trophy w-8 text-center"></i> Campeonatos
                </a>
                <a href="{{ url('/admin/approvals') }}"
                    class="flex items-center p-3 rounded-lg hover:bg-blue-800 transition {{ request()->is('admin/approvals*') ? 'bg-blue-800' : '' }}">
                    <i class="fas fa-check-circle w-8 text-center"></i> Aprovações
                    <span class="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">3</span>
                </a>
                <a href="{{ url('/admin/financial') }}"
                    class="flex items-center p-3 rounded-lg hover:bg-blue-800 transition {{ request()->is('admin/financial*') ? 'bg-blue-800' : '' }}">
                    <i class="fas fa-wallet w-8 text-center"></i> Financeiro
                </a>
                <div class="pt-4 mt-4 border-t border-blue-800">
                    <p class="px-3 text-xs text-blue-400 uppercase font-bold mb-2">Configurações</p>
                    <a href="#" class="flex items-center p-3 rounded-lg hover:bg-blue-800 transition">
                        <i class="fas fa-users w-8 text-center"></i> Usuários
                    </a>
                    <a href="#" class="flex items-center p-3 rounded-lg hover:bg-blue-800 transition">
                        <i class="fas fa-cogs w-8 text-center"></i> Sistema
                    </a>
                </div>
            </nav>

            <div class="p-4 border-t border-blue-800">
                <button
                    class="w-full flex items-center justify-center p-3 bg-blue-800 hover:bg-blue-700 rounded-lg transition">
                    <i class="fas fa-sign-out-alt mr-2"></i> Sair
                </button>
            </div>
        </div>

        <!-- Main Content -->
        <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Topbar mobile could go here -->

            <main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-8">
                @yield('content')
            </main>
        </div>
    </div>

</body>

</html>