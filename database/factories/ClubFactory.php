<?php

namespace Database\Factories;

use App\Models\City;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ClubFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->company() . ' Esporte Clube';

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'city_id' => City::factory(),
            'address' => fake()->streetAddress(),
            'phone' => fake()->phoneNumber(),
        ];
    }
}
