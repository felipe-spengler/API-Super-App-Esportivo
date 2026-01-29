<?php

namespace Database\Factories;

use App\Models\Club;
use App\Models\Sport;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ChampionshipFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->words(3, true) . ' Championship';

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'club_id' => Club::factory(),
            'sport_id' => Sport::factory(),
            'start_date' => now()->addDays(10),
            'end_date' => now()->addDays(30),
            'status' => 'inscricoes_abertas',
            'max_teams_per_category' => 16,
        ];
    }
}
