<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperação de Senha</title>
</head>
<body style="font-family: sans-serif; background-color: #f4f7f9; margin: 0; padding: 0; color: #333;">
    <div style="max-width: 600px; margin: 20px auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
        <div style="background: #1f2937; padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Recuperação de Senha</h1>
        </div>
        <div style="padding: 30px; color: #1e293b; line-height: 1.6;">
            <p>Olá, <strong>{{ $user->name }}</strong>!</p>
            <p>Você solicitou a recuperação da sua senha no sistema <strong>Esportivo</strong>.</p>
            <p>Clique no botão abaixo para redefinir sua senha diretamente:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{{ $resetLink }}" style="background: #4f46e5; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Alterar Minha Senha Agora</a>
            </div>

            <p>Ou, se preferir, use o código de verificação abaixo manualmente:</p>
            
            <div style="background: #f1f5f9; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1e293b; border-radius: 8px; border: 1px dashed #cbd5e1;">
                {{ $token }}
            </div>

            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">Este link e código são válidos por 60 minutos. Se você não solicitou esta alteração, pode ignorar este e-mail.</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8;">
            <p>Esta é uma mensagem automática, por favor não responda.</p>
            <p>© {{ date('Y') }} Esportivo.</p>
        </div>
    </div>
</body>
</html>
