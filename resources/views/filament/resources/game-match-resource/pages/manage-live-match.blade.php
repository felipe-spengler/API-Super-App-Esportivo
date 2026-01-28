<x-filament-panels::page>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Placar Principal -->
        <div class="lg:col-span-2 space-y-6">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center">

                <!-- Status do Jogo -->
                <div class="mb-4">
                    <span
                        class="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                        AO VIVO
                    </span>
                    <span class="ml-2 text-2xl font-mono">{{ gmdate('i:s', $seconds) }}</span>
                </div>

                <div class="flex justify-between items-center w-full max-w-2xl">
                    <!-- Home Team -->
                    <div class="text-center flex-1">
                        <div class="text-xl font-bold mb-2">{{ $record->homeTeam->name ?? 'Home' }}</div>
                        <div class="text-6xl font-black text-gray-900 dark:text-white mb-4">{{ $homeScore }}</div>
                        <div class="flex justify-center gap-2">
                            <x-filament::button color="danger" size="sm"
                                wire:click="decrementHome">-1</x-filament::button>
                            <x-filament::button color="success" size="lg" wire:click="incrementHome">+1
                                GOAL</x-filament::button>
                        </div>
                    </div>

                    <div class="text-gray-400 text-2xl font-bold mx-4">VS</div>

                    <!-- Away Team -->
                    <div class="text-center flex-1">
                        <div class="text-xl font-bold mb-2">{{ $record->awayTeam->name ?? 'Away' }}</div>
                        <div class="text-6xl font-black text-gray-900 dark:text-white mb-4">{{ $awayScore }}</div>
                        <div class="flex justify-center gap-2">
                            <x-filament::button color="danger" size="sm"
                                wire:click="decrementAway">-1</x-filament::button>
                            <x-filament::button color="success" size="lg" wire:click="incrementAway">+1
                                GOAL</x-filament::button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Eventos Rápidos -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 class="text-lg font-bold mb-4">Registro Rápido</h3>
                <div class="grid grid-cols-2 gap-4">
                    <x-filament::button color="warning"
                        wire:click="logEvent('yellow_card', {{ $record->home_team_id }})">Amarelo
                        (Home)</x-filament::button>
                    <x-filament::button color="warning"
                        wire:click="logEvent('yellow_card', {{ $record->away_team_id }})">Amarelo
                        (Away)</x-filament::button>

                    <x-filament::button color="danger"
                        wire:click="logEvent('red_card', {{ $record->home_team_id }})">Vermelho
                        (Home)</x-filament::button>
                    <x-filament::button color="danger"
                        wire:click="logEvent('red_card', {{ $record->away_team_id }})">Vermelho
                        (Away)</x-filament::button>
                </div>
            </div>
        </div>

        <!-- Coluna Lateral (Escalação / Timeline) -->
        <div class="space-y-6">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 class="text-lg font-bold mb-4">Informações</h3>
                <p><strong>Categoria:</strong> {{ $record->category->name ?? 'N/A' }}</p>
                <p><strong>Local:</strong> {{ $record->location ?? 'N/A' }}</p>
                <p><strong>Rodada:</strong> {{ $record->round_name ?? 'N/A' }}</p>
            </div>

            <!-- Aqui entraria a lista de eventos (Timeline) -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                <h3 class="text-lg font-bold mb-4">Timeline</h3>
                <div class="text-sm text-gray-500 text-center">Nenhum evento registrado ainda.</div>
            </div>
        </div>
    </div>
</x-filament-panels::page>