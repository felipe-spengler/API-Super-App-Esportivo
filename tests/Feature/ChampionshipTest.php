<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Club;
use App\Models\Championship;
use App\Models\Sport;
use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChampionshipTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Teste 9: Admin de clube pode criar campeonato
     */
    public function test_club_admin_can_create_championship(): void
    {
        $club = Club::factory()->create(['name' => 'Clube Teste']);
        $admin = User::factory()->create([
            'is_admin' => true,
            'club_id' => $club->id,
        ]);

        $sport = Sport::factory()->create(['name' => 'Futebol']);

        $championship = Championship::create([
            'name' => 'Campeonato de Verão 2026',
            'slug' => 'campeonato-verao-2026',
            'club_id' => $club->id,
            'sport_id' => $sport->id,
            'start_date' => now()->addDays(10),
            'end_date' => now()->addDays(30),
            'status' => 'inscricoes_abertas',
        ]);

        $this->assertDatabaseHas('championships', [
            'name' => 'Campeonato de Verão 2026',
            'club_id' => $club->id,
            'sport_id' => $sport->id,
        ]);
    }

    /**
     * Teste 10: Admin pode criar categorias em campeonato
     */
    public function test_admin_can_create_categories_in_championship(): void
    {
        $club = Club::factory()->create();
        $admin = User::factory()->create([
            'is_admin' => true,
            'club_id' => $club->id,
        ]);

        $championship = Championship::factory()->create([
            'club_id' => $club->id,
        ]);

        $category = Category::create([
            'championship_id' => $championship->id,
            'name' => 'Masculino Adulto',
            'min_age' => 18,
            'max_age' => 99,
            'gender' => 'M',
        ]);

        $this->assertDatabaseHas('categories', [
            'championship_id' => $championship->id,
            'name' => 'Masculino Adulto',
            'gender' => 'M',
        ]);
    }
}
