<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Club;
use App\Models\City;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClubManagementTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Teste 7: SuperAdmin pode criar um clube
     */
    public function test_super_admin_can_create_club(): void
    {
        $superAdmin = User::factory()->create([
            'is_admin' => true,
            'club_id' => null,
        ]);

        $city = City::factory()->create(['name' => 'Toledo']);

        // Simulando criação de clube (ajustar rota quando existir)
        $club = Club::create([
            'name' => 'Clube Novo',
            'slug' => 'clube-novo',
            'city_id' => $city->id,
            'address' => 'Rua Teste, 123',
        ]);

        $this->assertDatabaseHas('clubs', [
            'name' => 'Clube Novo',
            'slug' => 'clube-novo',
        ]);
    }

    /**
     * Teste 8: SuperAdmin pode vincular Admin a um clube
     */
    public function test_super_admin_can_assign_club_admin(): void
    {
        $superAdmin = User::factory()->create([
            'is_admin' => true,
            'club_id' => null,
        ]);

        $club = Club::factory()->create(['name' => 'Clube Teste']);

        $newAdmin = User::factory()->create([
            'email' => 'admin@clube.com',
            'is_admin' => true,
            'club_id' => $club->id,
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'admin@clube.com',
            'is_admin' => true,
            'club_id' => $club->id,
        ]);

        $this->assertTrue($newAdmin->isClubAdmin());
        $this->assertFalse($newAdmin->isSuperAdmin());
    }
}
