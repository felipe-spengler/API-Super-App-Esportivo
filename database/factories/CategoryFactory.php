<?php

namespace Database\Factories;

use App\Models\Championship;
use Illuminate\Database\Eloquent\Factories\Factory;

class CategoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'championship_id' => Championship::factory(),
            'name' => fake()->randomElement(['Masculino Adulto', 'Feminino Adulto', 'Sub-18', 'Master']),
            'min_age' => 18,
            'max_age' => 99,
            'gender' => fake()->randomElement(['M', 'F', null]),
        ];
    }
}
