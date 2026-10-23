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
        $club = Club::factory()->create([
            'payment_settings' => [
                'asaas_token' => 'test_asaas_token',
                'asaas_environment' => 'sandbox'
            ]
        ]);
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

        // Fake Asaas HTTP requests
        \Illuminate\Support\Facades\Http::fake([
            '*/customers*' => \Illuminate\Support\Facades\Http::response(['id' => 'cus_12345', 'data' => []]),
            '*/payments*' => \Illuminate\Support\Facades\Http::response(['id' => 'pay_12345', 'invoiceUrl' => 'https://asaas.com/i/12345', 'dueDate' => '2026-08-30']),
            '*/pixQrCode' => \Illuminate\Support\Facades\Http::response(['encodedImage' => 'qr_code_base64_string', 'payload' => 'pix_copy_paste_payload'])
        ]);

        // 1. Test registration of 5 athletes (expect 10% discount)
        $athletes = [];
        for ($i = 1; $i <= 5; $i++) {
            $digits = array_map(fn() => rand(0, 9), range(1, 9));
            $s1 = 0;
            for ($j = 0; $j < 9; $j++) $s1 += $digits[$j] * (10 - $j);
            $d1 = ($s1 % 11 < 2) ? 0 : 11 - ($s1 % 11);
            $digits[] = $d1;
            $s2 = 0;
            for ($j = 0; $j < 10; $j++) $s2 += $digits[$j] * (11 - $j);
            $d2 = ($s2 % 11 < 2) ? 0 : 11 - ($s2 % 11);
            $digits[] = $d2;
            $cpf = implode('', $digits);

            $athletes[] = [
                'name' => "Atleta {$i}",
                'email' => "atleta{$i}@example.com",
                'phone' => '11999999999',
                'document' => $cpf,
                'birth_date' => '1995-05-15',
                'gender' => 'M',
                'category_id' => $category->id,
                'team_name' => ($i === 1) ? 'Equipe Os Velozes' : null
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
            'status_payment' => 'pending',
            'team_name' => 'Equipe Os Velozes'
        ]);
    }

    public function test_individual_registration_saves_team_name_when_provided(): void
    {
        $club = Club::factory()->create([
            'payment_settings' => [
                'asaas_token' => 'test_asaas_token',
                'asaas_environment' => 'sandbox'
            ]
        ]);
        $sport = Sport::factory()->create();

        $championship = Championship::create([
            'club_id' => $club->id,
            'sport_id' => $sport->id,
            'name' => 'Corrida Rústica 2026',
            'format' => 'racing',
            'start_date' => now()->addDays(10),
        ]);

        $race = Race::create([
            'championship_id' => $championship->id,
            'start_datetime' => now()->addDays(10),
            'location_name' => 'Praça Central',
            'kits_info' => 'Kit Standard'
        ]);

        $category = Category::create([
            'championship_id' => $championship->id,
            'name' => 'Corrida 5k',
            'price' => 50.00,
            'min_age' => 10,
            'max_age' => 99,
            'gender' => 'mixed'
        ]);

        \Illuminate\Support\Facades\Http::fake([
            '*/customers*' => \Illuminate\Support\Facades\Http::response(['id' => 'cus_99999', 'data' => []]),
            '*/payments*' => \Illuminate\Support\Facades\Http::response(['id' => 'pay_99999', 'invoiceUrl' => 'https://asaas.com/i/99999', 'dueDate' => '2026-08-30']),
            '*/pixQrCode' => \Illuminate\Support\Facades\Http::response(['encodedImage' => 'qr_code_base64_string', 'payload' => 'pix_copy_paste_payload'])
        ]);

        $digits = array_map(fn() => rand(0, 9), range(1, 9));
        $s1 = 0;
        for ($j = 0; $j < 9; $j++) $s1 += $digits[$j] * (10 - $j);
        $d1 = ($s1 % 11 < 2) ? 0 : 11 - ($s1 % 11);
        $digits[] = $d1;
        $s2 = 0;
        for ($j = 0; $j < 10; $j++) $s2 += $digits[$j] * (11 - $j);
        $d2 = ($s2 % 11 < 2) ? 0 : 11 - ($s2 % 11);
        $digits[] = $d2;
        $cpf = implode('', $digits);

        $response = $this->postJson("/api/championships/{$championship->id}/race/register", [
            'name' => 'Corredor Individual',
            'email' => 'individual@example.com',
            'phone' => '11988887777',
            'document' => $cpf,
            'birth_date' => '1990-01-01',
            'gender' => 'M',
            'category_id' => $category->id,
            'team_name' => 'Equipe Tartarugas Runners',
            'payment_method' => 'PIX'
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('race_results', [
            'race_id' => $race->id,
            'name' => 'Corredor Individual',
            'team_name' => 'Equipe Tartarugas Runners',
            'status_payment' => 'pending'
        ]);
    }

    public function test_export_athletes_csv_orders_by_category_subcategory_and_alphabetical(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $club = Club::factory()->create();
        $sport = Sport::factory()->create();

        $championship = Championship::create([
            'club_id' => $club->id,
            'sport_id' => $sport->id,
            'name' => 'Circuito Noturno',
            'format' => 'racing',
            'start_date' => now()->addDays(5),
        ]);

        $race = Race::create([
            'championship_id' => $championship->id,
            'start_datetime' => now()->addDays(5),
        ]);

        $cat5k = Category::create([
            'championship_id' => $championship->id,
            'name' => '5KM',
            'price' => 50.00
        ]);

        $cat10k = Category::create([
            'championship_id' => $championship->id,
            'name' => '10KM',
            'price' => 70.00
        ]);

        $subCat10kA = Category::create([
            'championship_id' => $championship->id,
            'parent_id' => $cat10k->id,
            'name' => 'M 20-29',
            'price' => 70.00
        ]);

        $subCat10kB = Category::create([
            'championship_id' => $championship->id,
            'parent_id' => $cat10k->id,
            'name' => 'M 30-39',
            'price' => 70.00
        ]);

        // Create athletes out of order
        RaceResult::create(['race_id' => $race->id, 'name' => 'Zélia 5K', 'category_id' => $cat5k->id, 'bib_number' => '10', 'team_name' => 'Equipe Z']);
        RaceResult::create(['race_id' => $race->id, 'name' => 'Alice 5K', 'category_id' => $cat5k->id, 'bib_number' => '11', 'team_name' => 'Equipe A']);
        RaceResult::create(['race_id' => $race->id, 'name' => 'Bruno 10K SubB', 'category_id' => $subCat10kB->id, 'bib_number' => '20', 'team_name' => 'Equipe B']);
        RaceResult::create(['race_id' => $race->id, 'name' => 'Carlos 10K SubA', 'category_id' => $subCat10kA->id, 'bib_number' => '21', 'team_name' => 'Equipe C']);

        $response = $this->actingAs($admin)->get("/api/admin/championships/{$championship->id}/results/export");

        $response->assertStatus(200);
        $content = $response->streamedContent();

        // Check header and content
        $this->assertStringContainsString('NOME DO ATLETA', $content);
        $this->assertStringContainsString('CATEGORIA;SUBCATEGORIA', $content);

        // Verify order:
        // 10KM > M 20-29 (Carlos)
        // 10KM > M 30-39 (Bruno)
        // 5KM (Alice)
        // 5KM (Zélia)
        $posCarlos = strpos($content, 'Carlos 10K SubA');
        $posBruno = strpos($content, 'Bruno 10K SubB');
        $posAlice = strpos($content, 'Alice 5K');
        $posZelia = strpos($content, 'Zélia 5K');

        $this->assertTrue($posCarlos < $posBruno, '10KM SubA should precede 10KM SubB');
        $this->assertTrue($posBruno < $posAlice, '10KM should precede 5KM');
        $this->assertTrue($posAlice < $posZelia, 'Alice should precede Zélia in 5KM');
    }
}
