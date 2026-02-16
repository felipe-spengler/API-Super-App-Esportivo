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
            'cpf' => 'nullable|string|unique:users',
            'birth_date' => 'nullable|date',
            'rg' => 'nullable|string',
            'mother_name' => 'nullable|string',
            'gender' => 'nullable|in:M,F,O',
            'document_number' => 'nullable|string',
            'photos' => 'nullable|array|max:3', // Allow up to 3 photos
            'photos.*' => 'image|max:2048', // Validate each photo
            'document' => 'nullable|image|max:4096', // Validação da foto do documento
        ]);

        $photoPaths = [];
        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $photo) {
                $path = $photo->store('players', 'public');
                $photoPaths[] = $path;
            }
        }

        // Set the main photo path to the first one uploaded, or null
        $mainPhotoPath = !empty($photoPaths) ? $photoPaths[0] : null;

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
            'rg' => $validated['rg'] ?? null,
            'mother_name' => $validated['mother_name'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'document_number' => $validated['document_number'] ?? null,
            'photo_path' => $mainPhotoPath,
            'photos' => $photoPaths,
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
