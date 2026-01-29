<?php

namespace Database\Factories;

use App\Models\Club;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TeamFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->word() . ' Team',
            'captain_id' => User::factory(),
            'club_id' => Club::factory(),
        ];
    }
}
