<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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
            'photos.*' => 'image|max:4096', // Max 4MB
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

        try {
            DB::beginTransaction();

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
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

            DB::commit();

            return response()->json([
                'message' => 'Usuário cadastrado com sucesso!',
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => new UserResource($user)
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error("Registration Error: " . $e->getMessage());
            return response()->json([
                'message' => 'Erro ao realizar cadastro: ' . $e->getMessage()
            ], 500);
        }
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
            'photo' => 'nullable|image|max:4096', // Max 4MB
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

    // 6. Esqueci Minha Senha (Solicitar Link)
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'Se este e-mail estiver cadastrado, você receberá instruções para resetar sua senha.'], 200);
        }

        // Gera um token de 6 dígitos (mais amigável para mobile/app)
        $token = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Salva na tabela password_reset_tokens (padrão do Laravel)
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'token' => Hash::make($token),
                'created_at' => now()
            ]
        );

        // Envia o e-mail
        try {
            \Illuminate\Support\Facades\Mail::send([], [], function ($message) use ($user, $token) {
                $message->to($user->email)
                    ->subject('Recuperação de Senha - Esportivo')
                    ->html("
                        <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto;'>
                            <h2 style='color: #4f46e5;'>Recuperação de Senha</h2>
                            <p>Olá, <strong>{$user->name}</strong>!</p>
                            <p>Você solicitou a recuperação da sua senha no app Esportivo.</p>
                            <p>Use o código abaixo para redefinir sua senha:</p>
                            <div style='background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px;'>
                                {$token}
                            </div>
                            <p style='margin-top: 20px; color: #6b7280; font-size: 14px;'>Este código expira em 60 minutos.</p>
                            <p style='color: #6b7280; font-size: 14px;'>Se você não solicitou isso, ignore este e-mail.</p>
                        </div>
                    ");
            });
        } catch (\Exception $e) {
            \Log::error("Email Error: " . $e->getMessage());
            return response()->json(['message' => 'Erro ao enviar e-mail. Tente novamente mais tarde.'], 500);
        }

        return response()->json(['message' => 'Código de recuperação enviado para seu e-mail.']);
    }

    // 7. Resetar Senha com o Código
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required|string|size:6',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $reset = DB::table('password_reset_tokens')->where('email', $request->email)->first();

        if (!$reset || !Hash::check($request->token, $reset->token)) {
            return response()->json(['message' => 'Código inválido ou expirado.'], 422);
        }

        // Verifica expiração (60 min)
        if (\Carbon\Carbon::parse($reset->created_at)->addMinutes(60)->isPast()) {
            return response()->json(['message' => 'Este código já expirou.'], 422);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->password = $request->password; // O model já tem cast 'hashed'
        $user->save();

        // Remove o token usado
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Senha alterada com sucesso! Agora você pode fazer login.']);
    }
}
