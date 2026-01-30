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
            'slug' => 'required|string|unique:clubs,slug',
            'city_id' => 'required|exists:cities,id',
            'primary_color' => 'nullable|string',
            'secondary_color' => 'nullable|string',
            // Admin User Data
            'admin_name' => 'required|string',
            'admin_email' => 'required|email|unique:users,email',
            'admin_password' => 'required|min:6'
        ]);

        try {
            DB::beginTransaction();

            // 1. Criar Clube
            $club = Club::create([
                'name' => $request->name,
                'slug' => Str::slug($request->slug), // Ensure slug format
                'city_id' => $request->city_id,
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
                // Campos obrigatórios do User (conforme User.php ou DB defaults)
                // Se o DB exigir CPF, etc, precisamos tratar. 
                // Assumindo que nullable ou não validados aqui pra admin rápido.
                // Mas vamos checar o User Factory ou migration se der erro.
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
}
