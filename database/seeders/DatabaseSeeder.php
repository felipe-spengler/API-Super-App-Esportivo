<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Cidades
        $toledo = \App\Models\City::firstOrCreate(['slug' => 'toledo-pr'], ['name' => 'Toledo', 'state' => 'PR']);
        $cascavel = \App\Models\City::firstOrCreate(['slug' => 'cascavel-pr'], ['name' => 'Cascavel', 'state' => 'PR']);
        $foz = \App\Models\City::firstOrCreate(['slug' => 'foz-pr'], ['name' => 'Foz do Iguaçu', 'state' => 'PR']);
        $sp = \App\Models\City::firstOrCreate(['slug' => 'sao-paulo-sp'], ['name' => 'São Paulo', 'state' => 'SP']);

        // 2. Clubes
        $clubToledao = \App\Models\Club::firstOrCreate(['slug' => 'toledao'], [
            'city_id' => $toledo->id,
            'name' => 'Clube Toledão',
            'logo_url' => 'https://via.placeholder.com/150',
            'primary_color' => '#003366',
            'secondary_color' => '#FFCC00',
            'active_modalities' => ['futebol', 'volei', 'corrida'],
            'is_active' => true
        ]);

        \App\Models\Club::firstOrCreate(['slug' => 'yara'], [
            'city_id' => $toledo->id,
            'name' => 'Yara Country Clube',
            'logo_url' => 'https://via.placeholder.com/150',
            'primary_color' => '#006633',
            'secondary_color' => '#FFFFFF',
            'active_modalities' => ['tenis', 'natacao'],
            'is_active' => true
        ]);

        \App\Models\Club::firstOrCreate(['slug' => 'cascavel-country'], [
            'city_id' => $cascavel->id,
            'name' => 'Cascavel Country Club',
            'logo_url' => 'https://via.placeholder.com/150',
            'primary_color' => '#990000',
            'secondary_color' => '#FFD700',
            'active_modalities' => ['futebol', 'tenis'],
            'is_active' => true
        ]);

        \App\Models\Club::firstOrCreate(['slug' => 'iguacu-tenis'], [
            'city_id' => $foz->id,
            'name' => 'Iguaçu Tênis Clube',
            'logo_url' => 'https://via.placeholder.com/150',
            'primary_color' => '#004488',
            'secondary_color' => '#FFFFFF',
            'active_modalities' => ['tenis', 'padel'],
            'is_active' => true
        ]);

        $clubRunEvents = \App\Models\Club::firstOrCreate(['slug' => 'run-events'], [
            'city_id' => $toledo->id,
            'name' => 'Run Events',
            'logo_url' => 'https://via.placeholder.com/150/000000/FFFFFF?text=RUN',
            'primary_color' => '#000000',
            'secondary_color' => '#CCFF00', // Verde Neon
            'active_modalities' => ['corrida'],
            'is_active' => true
        ]);

        // 3. Esportes
        $fut = \App\Models\Sport::firstOrCreate(['slug' => 'futebol'], ['name' => 'Futebol', 'category_type' => 'team', 'icon_name' => 'soccer']);
        $vol = \App\Models\Sport::firstOrCreate(['slug' => 'volei'], ['name' => 'Vôlei', 'category_type' => 'team', 'icon_name' => 'volleyball']);
        $run = \App\Models\Sport::firstOrCreate(['slug' => 'corrida'], ['name' => 'Corrida', 'category_type' => 'racing', 'icon_name' => 'run']);
        $ten = \App\Models\Sport::firstOrCreate(['slug' => 'tenis'], ['name' => 'Tênis', 'category_type' => 'match', 'icon_name' => 'tennis']);


        // 4. Usuários Admins

        // Admin Geral (Super Admin) - Sem club_id
        User::firstOrCreate(['email' => 'admin@admin.com'], [
            'name' => 'Super Admin',
            'password' => bcrypt('password'),
            'is_admin' => true,
            'club_id' => null,
        ]);

        // Admin Yara
        $clubYara = \App\Models\Club::where('slug', 'yara')->first();
        if ($clubYara) {
            User::firstOrCreate(['email' => 'admin@yara.com'], [
                'name' => 'Admin Yara',
                'password' => bcrypt('password'),
                'is_admin' => true,
                'club_id' => $clubYara->id,
            ]);
        }

        // Admin Toledão
        if ($clubToledao) {
            User::firstOrCreate(['email' => 'admin@toledao.com'], [
                'name' => 'Admin Toledão',
                'password' => bcrypt('password'),
                'is_admin' => true,
                'club_id' => $clubToledao->id,
            ]);
        }

        // 5. Execute Import Commands
        $this->command->info('Running ImportOldData (Toledao)...');
        \Illuminate\Support\Facades\Artisan::call('import:old-data');
        $this->command->info(\Illuminate\Support\Facades\Artisan::output());

        $this->command->info('Running ImportRunEvents...');
        \Illuminate\Support\Facades\Artisan::call('import:run-events');
        $this->command->info(\Illuminate\Support\Facades\Artisan::output());
    }
}
