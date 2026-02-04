<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Club;
use App\Models\User;
use App\Models\City;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class AdminClubController extends Controller
{
    /**
     * Listar todos os clubes (Apenas Super Admin)
     */
    public function index(Request $request)
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $clubs = Club::with('city')->get();
        return response()->json($clubs);
    }

    /**
     * Criar novo Clube + Usuário Admin do Clube
     */
    public function store(Request $request)
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|unique:clubs,slug',
            'city_id' => 'required_without:new_city_name|nullable|exists:cities,id',
            'new_city_name' => 'required_without:city_id|nullable|string',
            'new_city_state' => 'required_with:new_city_name|nullable|string|size:2',
            'primary_color' => 'nullable|string',
            'secondary_color' => 'nullable|string',
            // Admin User Data
            'admin_name' => 'required|string',
            'admin_email' => 'required|email|unique:users,email',
            'admin_password' => 'required|min:6'
        ]);

        try {
            DB::beginTransaction();

            // Handle City (Create or Use Existing)
            $cityId = $request->city_id;
            if (!$cityId && $request->new_city_name) {
                $city = City::firstOrCreate(
                    [
                        'name' => $request->new_city_name,
                        'state' => strtoupper($request->new_city_state)
                    ],
                    ['slug' => Str::slug($request->new_city_name . '-' . $request->new_city_state)]
                );
                $cityId = $city->id;
            }

            // Handle Slug
            $slug = $request->slug ? Str::slug($request->slug) : Str::slug($request->name);
            // Ensure unique slug if auto-generated (simple collision check)
            if (Club::where('slug', $slug)->exists()) {
                $slug = $slug . '-' . uniqid();
            }

            // 1. Criar Clube
            $club = Club::create([
                'name' => $request->name,
                'slug' => $slug,
                'city_id' => $cityId,
                'primary_color' => $request->primary_color ?? '#000000',
                'secondary_color' => $request->secondary_color ?? '#ffffff',
                'is_active' => true,
                'active_modalities' => [] // Pode ser populado depois
            ]);

            // 2. Criar Usuário Admin vinculado ao Clube
            $adminUser = User::create([
                'name' => $request->admin_name,
                'email' => $request->admin_email,
                'password' => Hash::make($request->admin_password),
                'role' => 'admin', // Role string legacy check
                'is_admin' => true,
                'club_id' => $club->id, // VINCULO ESSENCIAL
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Clube e Administrador criados com sucesso!',
                'club' => $club,
                'admin' => $adminUser
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Erro ao criar clube: ' . $e->getMessage()], 500);
        }
    }
    /**
     * Obter detalhes do clube (Super Admin ou o próprio admin do clube)
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();

        // Se for Super Admin, pode ver qualquer um.
        // Se for Admin de Clube, só pode ver o seu.
        if (!$user->isSuperAdmin()) {
            if ($user->club_id != $id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $club = Club::with(['city'])->findOrFail($id);
        return response()->json($club);
    }

    /**
     * Atualizar Clube
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        if (!$user->isSuperAdmin()) {
            // Permitir que o admin do clube edite seus próprios dados?
            // Geralmente sim, mas algumas coisas como 'actives' talvez não.
            // Por enquanto, vamos manter restrito ou checar club_id.
            if ($user->club_id != $id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $club = Club::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'slug' => 'sometimes|string|unique:clubs,slug,' . $id,
            'city_id' => 'sometimes|exists:cities,id',
            'primary_color' => 'nullable|string',
            'secondary_color' => 'nullable|string',
            'primary_font' => 'nullable|string',
            'secondary_font' => 'nullable|string',
            'active_modalities' => 'array',
            'is_active' => 'boolean'
        ]);

        if (isset($data['slug'])) {
            $data['slug'] = Str::slug($data['slug']);
        }

        $club->update($data);

        return response()->json([
            'message' => 'Clube atualizado com sucesso!',
            'club' => $club
        ]);
    }
    /**
     * Excluir Clube
     */
    public function destroy(Request $request, $id)
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $club = Club::findOrFail($id);

        // Opção 1: Soft Delete (apenas inativar)
        // Opção 2: Hard Delete (excluir tudo)

        // Vamos fazer Hard Delete mas removendo admins antes para evitar orfãos se não houver cascade
        User::where('club_id', $club->id)->delete();

        // Excluir o clube (O banco deve rejeitar se tiver campeonatos vinculados sem cascade)
        // Idealmente usar try/catch
        try {
            $club->delete();
        } catch (\Exception $e) {
            return response()->json(['message' => 'Não foi possível excluir. O clube possui dados vinculados (campeonatos, etc). Tente inativá-lo.'], 400);
        }

        return response()->json(['message' => 'Clube e administradores excluídos com sucesso.']);
    }

    /**
     * Impersonate Club Admin (Login as)
     */
    public function impersonate(Request $request, $id)
    {
        if (!$request->user()->isSuperAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Find an admin user for this club
        $targetUser = User::where('club_id', $id)->where('is_admin', true)->first();

        if (!$targetUser) {
            return response()->json(['message' => 'Este clube não possui um administrador configurado.'], 404);
        }

        // Generate Token (Sanctum)
        $token = $targetUser->createToken('ImpersonationToken')->plainTextToken;

        return response()->json([
            'user' => $targetUser,
            'access_token' => $token
        ]);
    }
}
