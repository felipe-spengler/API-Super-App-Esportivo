<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inscrição Confirmada!</title>
    <style>
        body {
            font-family: sans-serif;
            background-color: #f4f7f9;
            margin: 0;
            padding: 0;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        .header {
            background-color: #4f46e5;
            padding: 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
            color: #1e293b;
            line-height: 1.6;
        }
        .details-box {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .details-box p {
            margin: 5px 0;
        }
        .btn-container {
            text-align: center;
            margin-top: 30px;
        }
        .btn {
            background: #4f46e5;
            color: white;
            padding: 14px 24px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            display: inline-block;
        }
        .footer {
            background: #f1f5f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Inscrição Confirmada!</h1>
        </div>
        <div class="content">
            <p>Olá, <strong>{{ $result->user->name ?? $result->name }}</strong>!</p>
            <p>Temos o prazer de informar que seu pagamento foi recebido e sua inscrição no evento <strong>{{ $result->race->championship->name }}</strong> está confirmada.</p>
            
            <div class="details-box">
                <p><strong>Evento:</strong> {{ $result->race->championship->name }}</p>
                <p><strong>Atleta:</strong> {{ $result->user->name ?? $result->name }}</p>
                <p><strong>Data Nasc.:</strong> {{ $result->user && $result->user->birth_date ? $result->user->birth_date->format('d/m/Y') : '---' }}</p>
                <p><strong>Categoria:</strong> {{ $result->category->parent ? $result->category->parent->name : $result->category->name }}</p>
                @if($result->category->parent)
                    <p><strong>Subcategoria:</strong> {{ $result->category->name }}</p>
                @endif
                <p><strong>Status:</strong> Pago / Confirmado</p>
            </div>

            <p><strong>Anexamos o seu comprovante de inscrição a este e-mail.</strong> Ele contém todos os detalhes da sua compra, brindes inclusos e o QR Code necessário para a retirada de kit no local da prova.</p>
            <p>Você também pode acessar sua área do atleta a qualquer momento para baixar o comprovante novamente ou ver sua carteirinha digital.</p>
            
            <div class="btn-container">
                <a href="https://esportivo.techinteligente.site/profile/inscriptions" class="btn" style="color: white;">Ver Minhas Inscrições</a>
            </div>
        </div>
        <div class="footer">
            <p>&copy; {{ date('Y') }} Esportivo. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>
