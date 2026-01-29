<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Team;
use App\Models\Club;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeamTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Teste 11: Usuário pode criar time e se tornar capitão
     */
    public function test_user_can_create_team_and_become_captain(): void
    {
        $user = User::factory()->create([
            'name' => 'João Capitão',
        ]);

        $club = Club::factory()->create();

        $team = Team::create([
            'name' => 'Time dos Campeões',
            'captain_id' => $user->id,
            'club_id' => $club->id,
        ]);

        $this->assertDatabaseHas('teams', [
            'name' => 'Time dos Campeões',
            'captain_id' => $user->id,
        ]);

        // Verificar relação
        $this->assertEquals($user->id, $team->captain_id);
        $this->assertTrue($user->teamsAsCaptain->contains($team));
    }

    /**
     * Teste 12: Capitão pode adicionar jogadores ao time
     */
    public function test_captain_can_add_players_to_team(): void
    {
        $captain = User::factory()->create();
        $player = User::factory()->create(['name' => 'Jogador Teste']);

        $team = Team::factory()->create([
            'captain_id' => $captain->id,
        ]);

        // Adicionar jogador ao time
        $team->players()->attach($player->id, [
            'position' => 'Atacante',
            'number' => 10,
            'is_approved' => true,
        ]);

        $this->assertDatabaseHas('team_players', [
            'team_id' => $team->id,
            'user_id' => $player->id,
            'number' => 10,
        ]);

        // Verificar relação
        $this->assertTrue($player->teamsAsPlayer->contains($team));
    }
}
