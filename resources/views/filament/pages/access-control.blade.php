<x-filament-panels::page>
    <div class="max-w-2xl mx-auto">
        <form wire:submit="checkAccess" class="mb-8">
            <div class="flex gap-4 items-end">
                <div class="flex-1">
                    {{ $this->form }}
                </div>
                <x-filament::button type="submit" size="lg">
                    Verificar
                </x-filament::button>
            </div>
        </form>

        @if($statusMessage)
            <div class="p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl text-center
                    {{ $statusColor === 'success' ? 'bg-green-100 dark:bg-green-900' : '' }}
                    {{ $statusColor === 'danger' ? 'bg-red-100 dark:bg-red-900' : '' }}
                    {{ $statusColor === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900' : '' }}
                ">
                <h2 class="text-3xl font-black mb-2
                        {{ $statusColor === 'success' ? 'text-green-700 dark:text-green-300' : '' }}
                        {{ $statusColor === 'danger' ? 'text-red-700 dark:text-red-300' : '' }}
                        {{ $statusColor === 'warning' ? 'text-yellow-700 dark:text-yellow-300' : '' }}
                    ">
                    {{ $statusMessage }}
                </h2>

                @if($searchResult)
                    <div class="mt-6 flex flex-col items-center">
                        <img src="{{ $searchResult->profile_photo_url ?? 'https://ui-avatars.com/api/?name=' . urlencode($searchResult->name) }}"
                            class="w-32 h-32 rounded-full border-4 border-white shadow-lg mb-4" />
                        <h3 class="text-2xl font-bold">{{ $searchResult->name }}</h3>
                        <p class="text-gray-600 dark:text-gray-400">{{ $searchResult->email }}</p>
                        <p class="text-sm mt-2 font-mono bg-black/10 px-2 py-1 rounded">ID: {{ $searchResult->id }}</p>
                    </div>
                @endif
            </div>
        @endif
    </div>
</x-filament-panels::page>