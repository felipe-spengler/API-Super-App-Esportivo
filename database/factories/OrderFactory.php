<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Club;
use Illuminate\Database\Eloquent\Factories\Factory;

class OrderFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'club_id' => Club::factory(),
            'status' => fake()->randomElement(['pending', 'paid', 'cancelled']),
            'total' => fake()->randomFloat(2, 10, 500),
            'discount' => 0,
        ];
    }
}
