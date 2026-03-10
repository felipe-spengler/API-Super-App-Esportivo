<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Http\Resources\UserResource;
use Illuminate\Support\Facades\Mail;

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
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'sometimes|nullable|string|min:6',
            'phone' => 'nullable|string',
            'cpf' => 'nullable|string',
            'device_token' => 'nullable|string',
            'photo' => 'nullable|image|max:4096', // Max 4MB
        ]);

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('players', 'public');
            $user->photo_path = $path;

            // Sync photos array too
            $photos = $user->photos ?? [];
            $photos[0] = $path;
            $user->photos = $photos;
        }

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->fill($request->only(['name', 'email', 'phone', 'cpf', 'device_token']));
        $user->save();

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
            Mail::send([], [], function ($message) use ($user, $token) {
                $message->to($user->email)
                    ->subject('Recuperação de Senha - Esportivo')
                    ->html("
                        <div style='font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;'>
                            <div style='background: #1f2937; padding: 30px; text-align: center;'>
                                <h1 style='color: white; margin: 0; font-size: 24px;'>Recuperação de Senha</h1>
                            </div>
                            <div style='padding: 30px; color: #1e293b; line-height: 1.6;'>
                                <p>Olá, <strong>{$user->name}</strong>!</p>
                                <p>Você solicitou a recuperação da sua senha no sistema <strong>Esportivo</strong>.</p>
                                <p>Use o código de verificação abaixo:</p>
                                
                                <div style='background: #f1f5f9; padding: 24px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1;'>
                                    {$token}
                                </div>

                                <p style='color: #64748b; font-size: 14px;'>Este código é válido por 60 minutos. Se você não solicitou esta alteração, pode ignorar este e-mail com segurança.</p>
                            </div>
                            <div style='background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8;'>
                                <p>Esta é uma mensagem automática, por favor não responda.</p>
                                <p>© " . date('Y') . " Esportivo.</p>
                            </div>
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

    // 8. Excluir Conta (Anonimização para Google Play)
    public function deleteAccount(Request $request)
    {
        $user = $request->user();

        try {
            DB::beginTransaction();

            // 1. Logs de auditoria seriam bons aqui, mas vamos focar na anonimização
            $oldEmail = $user->email;
            $anonymousEmail = "excluido_" . $user->id . "_" . bin2hex(random_bytes(4)) . "@esportivo.com.br";

            // 2. Limpar dados sensíveis, mantendo apenas o nome para histórico
            $user->update([
                'email' => $anonymousEmail,
                'password' => Hash::make(bin2hex(random_bytes(16))), // Senha aleatória inacessível
                'phone' => null,
                'cpf' => null,
                'birth_date' => null,
                'rg' => null,
                'mother_name' => null,
                'gender' => null,
                'document_number' => null,
                'photo_path' => null,
                'photos' => null,
                'document_path' => null,
                'device_token' => null,
                // Mantemos o 'name' conforme solicitado
            ]);

            // 3. Revogar todos os tokens
            $user->tokens()->delete();

            DB::commit();

            return response()->json([
                'message' => 'Sua conta foi desativada e seus dados pessoais foram removidos com sucesso.'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error("Account Deletion Error: " . $e->getMessage());
            return response()->json([
                'message' => 'Erro ao processar exclusão de conta.'
            ], 500);
        }
    }

    // 9. Solicitação Pública de Exclusão (Web)
    public function requestDeletion(Request $request)
    {
        $request->validate([
            'identifier' => 'required|string', // Pode ser email ou CPF
            'reason' => 'nullable|string|max:500',
        ]);

        // Como é uma rota pública sem login, apenas registramos a intenção ou enviamos e-mail para o admin
        // Para conformidade Google, ter um formulário que o admin recebe já é válido, 
        // mas vamos tentar localizar o usuário e marcar algo se possível.

        $user = User::where('email', $request->identifier)
            ->orWhere('cpf', $request->identifier)
            ->first();

        if ($user) {
            // Notificar admin (simulado via log ou e-mail se configurado)
            \Log::info("Solicitação de exclusão de conta recebida via Web para: " . $request->identifier);

            // Aqui poderíamos enviar um e-mail para o Felipe/Admin
            return response()->json([
                'message' => 'Recebemos sua solicitação. Analisaremos os dados e processaremos a exclusão em até 48h úteis.'
            ]);
        }

        return response()->json([
            'message' => 'Se os dados informados estiverem corretos, processaremos a solicitação em breve.'
        ]);
    }
}
