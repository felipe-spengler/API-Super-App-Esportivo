<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Http\Resources\UserResource;

class AuthController extends Controller
{
    // 1. Registro de Novo Usuário (Atleta)
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6|confirmed',
            'phone' => 'nullable|string',
            'cpf' => 'nullable|string',
            'birth_date' => 'nullable|date',
            'photo' => 'nullable|image|max:2048', // Validação da foto de perfil
            'document' => 'nullable|image|max:4096', // Validação da foto do documento
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $photoPath = $request->file('photo')->store('players', 'public');
        }

        $documentPath = null;
        if ($request->hasFile('document')) {
            $documentPath = $request->file('document')->store('documents', 'public');
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'cpf' => $validated['cpf'] ?? null,
            'birth_date' => $validated['birth_date'] ?? null,
            'photo_path' => $photoPath,
            'document_path' => $documentPath,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Usuário cadastrado com sucesso!',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user)
        ], 201);
    }

    // 2. Login
    public function login(Request $request)
    {
        $loginData = $request->validate([
            'login' => 'required|string',
            'password' => 'required|string',
        ]);

        $loginField = filter_var($loginData['login'], FILTER_VALIDATE_EMAIL) ? 'email' : 'phone';

        if (!Auth::attempt([$loginField => $loginData['login'], 'password' => $loginData['password']])) {
            return response()->json(['message' => 'Credenciais inválidas'], 401);
        }

        $user = User::where($loginField, $loginData['login'])->firstOrFail();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login realizado com sucesso!',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user)
        ]);
    }

    // 3. Meus Dados (Validado por Token)
    public function me(Request $request)
    {
        return new UserResource($request->user());
    }

    // 4. Logout
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logout realizado com sucesso.']);
    }

    // 5. Atualizar Perfil
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string',
            'cpf' => 'nullable|string',
            'device_token' => 'nullable|string',
            'photo' => 'nullable|image|max:2048',
        ]);

        if ($request->hasFile('photo')) {
            // TODO: Deletar foto antiga se existir
            $path = $request->file('photo')->store('players', 'public');
            $validated['photo_path'] = $path;
        }

        $user->update($validated);

        return response()->json([
            'message' => 'Perfil atualizado com sucesso!',
            'user' => new UserResource($user)
        ]);
    }
}
