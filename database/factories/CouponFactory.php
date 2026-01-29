<?php

namespace Database\Factories;

use App\Models\Club;
use Illuminate\Database\Eloquent\Factories\Factory;

class CouponFactory extends Factory
{
    public function definition(): array
    {
        return [
            'club_id' => Club::factory(),
            'code' => strtoupper(fake()->word()),
            'discount_type' => fake()->randomElement(['percent', 'fixed']),
            'discount_value' => fake()->randomFloat(2, 5, 50),
            'expires_at' => now()->addDays(30),
        ];
    }
}
