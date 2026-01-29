<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class SportFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->randomElement(['Futebol', 'Vôlei', 'Basquete', 'Futsal', 'Corrida']),
            'icon' => 'fa-futbol',
        ];
    }
}
