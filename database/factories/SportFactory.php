<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class SportFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->randomElement(['Futebol', 'Vôlei', 'Basquete', 'Futsal', 'Corrida']);
        return [
            'name' => $name,
            'slug' => \Illuminate\Support\Str::slug($name) . '-' . fake()->unique()->numberBetween(1, 99999),
            'category_type' => 'racing',
            'icon_name' => 'trophy',
        ];
    }
}
