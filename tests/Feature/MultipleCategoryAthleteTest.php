<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Championship;
use App\Models\Sport;
use App\Models\Category;
use App\Models\Race;
use App\Models\RaceResult;
use App\Models\Club;

class MultipleCategoryAthleteTest extends TestCase
{
    use RefreshDatabase;

    private $admin;
    private $club;
    private $sport;
    private $championship;
    private $race;
    private $catPeito;
    private $catBorboleta;

    protected function setUp(): void
    {
        parent::setUp();

        $city = \App\Models\City::create(['name' => 'Toledo', 'slug' => 'toledo', 'state' => 'PR']);
        $this->club = Club::create(['name' => 'Clube Teste', 'slug' => 'clube-teste', 'city_id' => $city->id]);
        $this->admin = User::create([
            'name' => 'Admin Teste',
            'email' => 'admin@teste.com',
            'password' => bcrypt('password'),
            'is_admin' => true,
            'club_id' => $this->club->id
        ]);

        $this->sport = Sport::create(['name' => 'Natação', 'slug' => 'swimming', 'category_type' => 'individual']);

        $this->championship = Championship::create([
            'name' => 'Torneio de Natação',
            'club_id' => $this->club->id,
            'sport_id' => $this->sport->id,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(5)->toDateString(),
            'status' => 'ongoing',
            'format' => 'racing',
            'registration_type' => 'individual'
        ]);

        $this->race = Race::create([
            'championship_id' => $this->championship->id,
            'start_datetime' => now(),
            'location_name' => 'Piscina Olímpica'
        ]);

        $this->catPeito = Category::create([
            'championship_id' => $this->championship->id,
            'name' => '20m Peito',
            'price' => 25.00
        ]);

        $this->catBorboleta = Category::create([
            'championship_id' => $this->championship->id,
            'name' => '20m Borboleta',
            'price' => 30.00
        ]);
    }

    public function test_admin_can_register_athlete_in_multiple_categories_at_once()
    {
        $response = $this->actingAs($this->admin)->postJson("/api/admin/races/{$this->championship->id}/results", [
            'name' => 'João da Silva',
            'phone' => '11999999999',
            'document' => '12345678901',
            'birth_date' => '2000-01-01',
            'gender' => 'M',
            'category_ids' => [$this->catPeito->id, $this->catBorboleta->id],
            'status_payment' => 'paid',
            'payment_method' => 'pix'
        ]);

        $response->assertStatus(201);

        $results = RaceResult::where('race_id', $this->race->id)->get();
        $this->assertCount(2, $results);

        $cats = $results->pluck('category_id')->toArray();
        $this->assertContains($this->catPeito->id, $cats);
        $this->assertContains($this->catBorboleta->id, $cats);

        // Same bib number
        $this->assertEquals($results[0]->bib_number, $results[1]->bib_number);
    }

    public function test_admin_can_register_athlete_without_category_and_then_add_to_categories()
    {
        // 1. João registers in championship without category
        $response = $this->actingAs($this->admin)->postJson("/api/admin/races/{$this->championship->id}/results", [
            'name' => 'João Sem Categoria',
            'phone' => '11988888888',
            'document' => '98765432100',
            'birth_date' => '1998-05-15',
            'gender' => 'M',
            'status_payment' => 'paid',
            'payment_method' => 'pix'
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('race_results', [
            'race_id' => $this->race->id,
            'name' => 'João Sem Categoria',
            'category_id' => null
        ]);

        $athlete = RaceResult::where('race_id', $this->race->id)->whereNull('category_id')->first();

        // 2. Admin adds João to 20m Peito via category endpoint
        $addPeito = $this->actingAs($this->admin)->postJson(
            "/api/admin/championships/{$this->championship->id}/categories/{$this->catPeito->id}/athletes",
            ['athlete_id' => $athlete->id]
        );
        $addPeito->assertStatus(200);

        // Now João is in 20m Peito
        $this->assertDatabaseHas('race_results', [
            'id' => $athlete->id,
            'category_id' => $this->catPeito->id
        ]);

        // 3. Admin also adds João to 20m Borboleta
        $addBorboleta = $this->actingAs($this->admin)->postJson(
            "/api/admin/championships/{$this->championship->id}/categories/{$this->catBorboleta->id}/athletes",
            ['athlete_id' => $athlete->id]
        );
        $addBorboleta->assertStatus(200);

        // Now there should be 2 results for João with same bib
        $joaoResults = RaceResult::where('race_id', $this->race->id)->where('user_id', $athlete->user_id)->get();
        $this->assertCount(2, $joaoResults);
        $this->assertEquals($joaoResults[0]->bib_number, $joaoResults[1]->bib_number);

        // 4. Admin removes João from 20m Peito
        $removePeito = $this->actingAs($this->admin)->deleteJson(
            "/api/admin/championships/{$this->championship->id}/categories/{$this->catPeito->id}/athletes/{$athlete->id}"
        );
        $removePeito->assertStatus(200);

        // João still remains in 20m Borboleta!
        $remaining = RaceResult::where('race_id', $this->race->id)->where('user_id', $athlete->user_id)->get();
        $this->assertCount(1, $remaining);
        $this->assertEquals($this->catBorboleta->id, $remaining[0]->category_id);

        // 5. If João is removed from his last category, he is kept with category_id = null
        $removeBorboleta = $this->actingAs($this->admin)->deleteJson(
            "/api/admin/championships/{$this->championship->id}/categories/{$this->catBorboleta->id}/athletes/{$remaining[0]->id}"
        );
        $removeBorboleta->assertStatus(200);

        $finalRecord = RaceResult::where('race_id', $this->race->id)->where('user_id', $athlete->user_id)->first();
        $this->assertNotNull($finalRecord);
        $this->assertNull($finalRecord->category_id);
    }

    public function test_public_registration_allows_multiple_categories_via_category_ids()
    {
        $this->catPeito->update(['price' => 0]);
        $this->catBorboleta->update(['price' => 0]);

        $response = $this->postJson("/api/championships/{$this->championship->id}/race/register-bulk", [
            'athletes' => [
                [
                    'name' => 'Mariana Nadadora',
                    'email' => 'mariana@nadadora.com',
                    'phone' => '11977777777',
                    'document' => '52998224725', // valid CPF
                    'birth_date' => '2001-08-20',
                    'gender' => 'F',
                    'category_ids' => [$this->catPeito->id, $this->catBorboleta->id],
                ]
            ],
            'payment_method' => 'PIX'
        ]);

        if ($response->status() !== 201) {
            dump($response->json());
        }
        $response->assertStatus(201);

        $marianaResults = RaceResult::where('race_id', $this->race->id)
            ->where('name', 'Mariana Nadadora')
            ->get();

        $this->assertCount(2, $marianaResults);
        $this->assertEquals($marianaResults[0]->bib_number, $marianaResults[1]->bib_number);
    }
}
