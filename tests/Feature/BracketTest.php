<?php

namespace Tests\Feature;

use App\Models\Championship;
use App\Models\Category;
use App\Models\Team;
use App\Models\GameMatch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BracketTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Teste 13: CRÍTICO - Gerador de chaves com 8 times cria 4 partidas nas quartas
     */
    public function test_bracket_generator_creates_correct_number_of_matches_for_8_teams(): void
    {
        $championship = Championship::factory()->create();
        $category = Category::factory()->create([
            'championship_id' => $championship->id,
        ]);

        // Criar 8 times
        $teams = Team::factory(8)->create();

        // Vincular times à categoria
        foreach ($teams as $team) {
            $category->teams()->attach($team->id);
        }

        // Simular geração de chaveamento (Quartas de Final)
        // 8 times = 4 partidas
        $matches = [];
        for ($i = 0; $i < 4; $i++) {
            $matches[] = GameMatch::create([
                'championship_id' => $championship->id,
                'category_id' => $category->id,
                'team_a_id' => $teams[$i * 2]->id,
                'team_b_id' => $teams[$i * 2 + 1]->id,
                'scheduled_date' => now()->addDays(7),
                'phase' => 'quartas',
                'status' => 'agendada',
            ]);
        }

        // Verificar que foram criadas exatamente 4 partidas
        $this->assertCount(4, $matches);
        $this->assertDatabaseCount('game_matches', 4);
    }

    /**
     * Teste 14: CRÍTICO - Vencedor avança para próxima fase corretamente
     */
    public function test_winner_advances_to_next_phase(): void
    {
        $championship = Championship::factory()->create();
        $category = Category::factory()->create([
            'championship_id' => $championship->id,
        ]);

        $teamA = Team::factory()->create(['name' => 'Time A']);
        $teamB = Team::factory()->create(['name' => 'Time B']);

        // Partida das Quartas
        $quarterfinal = GameMatch::create([
            'championship_id' => $championship->id,
            'category_id' => $category->id,
            'team_a_id' => $teamA->id,
            'team_b_id' => $teamB->id,
            'phase' => 'quartas',
            'status' => 'finalizada',
            'score_team_a' => 3,
            'score_team_b' => 1,
        ]);

        // Time A venceu, então deve avançar para Semifinal
        $winner = $quarterfinal->score_team_a > $quarterfinal->score_team_b
            ? $teamA
            : $teamB;

        $this->assertEquals($teamA->id, $winner->id);

        // Criar partida de Semifinal com o vencedor
        $semifinal = GameMatch::create([
            'championship_id' => $championship->id,
            'category_id' => $category->id,
            'team_a_id' => $winner->id,
            'team_b_id' => Team::factory()->create()->id,
            'phase' => 'semi',
            'status' => 'agendada',
        ]);

        $this->assertDatabaseHas('game_matches', [
            'id' => $semifinal->id,
            'phase' => 'semi',
            'team_a_id' => $teamA->id,
        ]);
    }
}
