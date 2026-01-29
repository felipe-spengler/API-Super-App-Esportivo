<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Club;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Teste 1: Usuário consegue se cadastrar com dados completos
     */
    public function test_user_can_register_with_full_data(): void
    {
        Storage::fake('public');

        $response = $this->postJson('/api/register', [
            'name' => 'Felipe Silva',
            'email' => 'felipe@test.com',
            'password' => 'senha123',
            'password_confirmation' => 'senha123',
            'phone' => '45999999999',
            'cpf' => '12345678900',
            'birth_date' => '1995-10-20',
            'gender' => 'M',
            'rg' => '123456789',
            'mother_name' => 'Maria Silva',
            'document_number' => '987654321',
            'photo' => UploadedFile::fake()->create('perfil.txt', 100),
            'document' => UploadedFile::fake()->create('documento.txt', 100),
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'user' => ['id', 'name', 'email']
            ]);

        // Verificar se o usuário foi criado no banco
        $this->assertDatabaseHas('users', [
            'email' => 'felipe@test.com',
            'cpf' => '12345678900',
            'gender' => 'M',
            'rg' => '123456789',
            'mother_name' => 'Maria Silva',
        ]);

        // Verificar se as fotos foram salvas
        $user = User::where('email', 'felipe@test.com')->first();
        $this->assertNotNull($user->photo_path);
        $this->assertNotNull($user->document_path);
        // Verificar que os arquivos foram criados no storage fake
        $this->assertTrue(Storage::disk('public')->exists($user->photo_path));
        $this->assertTrue(Storage::disk('public')->exists($user->document_path));
    }

    /**
     * Teste 2: Login funciona corretamente
     */
    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'email' => 'teste@login.com',
            'password' => bcrypt('senha123'),
        ]);

        $response = $this->postJson('/api/login', [
            'login' => 'teste@login.com',
            'password' => 'senha123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['access_token', 'user']);
    }

    /**
     * Teste 3: Login falha com senha incorreta
     */
    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create([
            'email' => 'teste@login.com',
            'password' => bcrypt('senha123'),
        ]);

        $response = $this->postJson('/api/login', [
            'login' => 'teste@login.com',
            'password' => 'senhaErrada',
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Credenciais inválidas']);
    }

    /**
     * Teste 4: SEGURANÇA - Usuário comum NÃO pode acessar rotas de Admin
     */
    public function test_regular_user_cannot_access_admin_routes(): void
    {
        $user = User::factory()->create(['is_admin' => false]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/admin/dashboard');

        $response->assertStatus(403); // Forbidden
    }

    /**
     * Teste 5: SEGURANÇA - SuperAdmin pode acessar rotas de Admin
     */
    public function test_super_admin_can_access_admin_routes(): void
    {
        $admin = User::factory()->create([
            'is_admin' => true,
            'club_id' => null, // SuperAdmin não tem clube específico
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/dashboard');

        $response->assertStatus(200);
    }

    /**
     * Teste 6: Admin de clube só vê dados do seu clube
     */
    public function test_club_admin_can_only_see_own_club_data(): void
    {
        $club1 = Club::factory()->create(['name' => 'Clube A']);
        $club2 = Club::factory()->create(['name' => 'Clube B']);

        $adminClub1 = User::factory()->create([
            'is_admin' => true,
            'club_id' => $club1->id,
        ]);

        // Admin do Clube 1 tentando acessar campeonato do Clube 2
        // (Este teste vai precisar ser ajustado quando tivermos a rota específica)
        $this->assertTrue($adminClub1->isClubAdmin());
        $this->assertFalse($adminClub1->isSuperAdmin());
    }
}
