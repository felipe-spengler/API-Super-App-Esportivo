<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Club;
use App\Models\Championship;
use App\Models\Sport;
use App\Models\Category;
use App\Models\Race;
use App\Models\RaceResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BulkInscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_bulk_registration_applies_correct_discounts_and_creates_single_payment(): void
    {
        $club = Club::factory()->create();
        $sport = Sport::factory()->create();

        // Championship with progressive discount settings
        $championship = Championship::create([
            'club_id' => $club->id,
            'sport_id' => $sport->id,
            'name' => 'Circuito Esportivo 2026',
            'format' => 'racing',
            'start_date' => now()->addDays(10),
            'bulk_discount_settings' => [
                ['min_athletes' => 5, 'max_athletes' => 14, 'discount_percentage' => 10],
                ['min_athletes' => 15, 'max_athletes' => 999, 'discount_percentage' => 15]
            ]
        ]);

        $race = Race::create([
            'championship_id' => $championship->id,
            'start_datetime' => now()->addDays(10),
            'location_name' => 'Parque da Cidade',
            'kits_info' => 'Kit Standard'
        ]);

        $category = Category::create([
            'championship_id' => $championship->id,
            'name' => 'Categoria Geral',
            'price' => 100.00,
            'min_age' => 15,
            'max_age' => 80,
            'gender' => 'mixed'
        ]);

        // Mock AsaasService
        $this->mock(\App\Services\AsaasService::class, function ($mock) {
            $mock->shouldReceive('createPayment')
                ->andReturn([
                    'id' => 'pay_12345',
                    'invoiceUrl' => 'https://asaas.com/i/12345',
                    'dueDate' => '2026-08-30'
                ]);
            $mock->shouldReceive('getPixQrCode')
                ->andReturn([
                    'encodedImage' => 'qr_code_base64_string',
                    'payload' => 'pix_copy_paste_payload'
                ]);
        });

        // 1. Test registration of 5 athletes (expect 10% discount)
        $athletes = [];
        for ($i = 1; $i <= 5; $i++) {
            $athletes[] = [
                'name' => "Atleta {$i}",
                'email' => "atleta{$i}@example.com",
                'phone' => '11999999999',
                'document' => "1234567890{$i}",
                'birth_date' => '1995-05-15',
                'gender' => 'M',
                'category_id' => $category->id
            ];
        }

        $response = $this->postJson("/api/championships/{$championship->id}/race/register-bulk", [
            'athletes' => $athletes,
            'payment_method' => 'PIX'
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['payment_group_id', 'price', 'payment_data']);

        // Check overall price: 5 * 100 * 0.9 = 450.00
        $response->assertJsonFragment(['price' => 450.00]);

        $groupId = $response->json('payment_group_id');
        $this->assertDatabaseCount('race_results', 5);
        $this->assertDatabaseHas('race_results', [
            'payment_group_id' => $groupId,
            'status_payment' => 'pending'
        ]);
    }
}
