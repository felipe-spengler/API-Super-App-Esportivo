<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inscrição Confirmada</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f1f5f9;
            margin: 0;
            padding: 0;
            color: #1e293b;
            -webkit-font-smoothing: antialiased;
        }
        .container {
            max-width: 600px;
            margin: 24px auto;
            background-color: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
        }
        .header {
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
            padding: 36px 30px;
            text-align: center;
            color: #ffffff;
        }
        .header .club-badge {
            display: inline-block;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.25);
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            margin-bottom: 12px;
        }
        .header h1 {
            margin: 0 0 6px 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.02em;
        }
        .header p {
            margin: 0;
            font-size: 14px;
            color: #e0e7ff;
            opacity: 0.95;
        }
        .content {
            padding: 32px 30px;
        }
        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 20px;
        }
        .status-confirmed {
            background-color: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
        }
        .card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
        }
        .card-title {
            font-size: 13px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-top: 0;
            margin-bottom: 14px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 8px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            padding: 8px 0;
            border-bottom: 1px dashed #e2e8f0;
        }
        .info-row:last-child {
            border-bottom: none;
            padding-bottom: 0;
        }
        .info-label {
            font-size: 13px;
            color: #64748b;
            font-weight: 600;
        }
        .info-value {
            font-size: 14px;
            color: #0f172a;
            font-weight: 700;
            text-align: right;
        }
        .highlight-value {
            color: #4338ca;
            font-size: 15px;
        }
        .btn-container {
            text-align: center;
            margin: 32px 0 16px 0;
        }
        .btn {
            background: #4338ca;
            color: #ffffff !important;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 14px;
            display: inline-block;
            box-shadow: 0 4px 12px rgba(67, 56, 202, 0.25);
        }
        .footer {
            background-color: #f8fafc;
            border-top: 1px solid #e2e8f0;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
        }
        .footer p {
            margin: 4px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            @if($club)
                <div class="club-badge">{{ $club->name }}</div>
            @else
                <div class="club-badge">{{ config('mail.from.name', 'Esportes7') }}</div>
            @endif
            <h1>Inscrição Confirmada!</h1>
            <p>Você foi inscrito oficialmente na equipe.</p>
        </div>

        <div class="content">
            <div style="text-align: center;">
                <span class="status-pill status-confirmed">
                    &#10003; Atleta Confirmado na Equipe
                </span>
            </div>

            <p style="font-size: 15px; line-height: 1.6; margin-top: 0; margin-bottom: 20px;">
                Olá, <strong>{{ $athlete->name }}</strong>!
                @if($championship)
                    Sua inscrição como atleta da equipe <strong>{{ $team->name }}</strong> no campeonato <strong>{{ $championship->name }}</strong> foi confirmada com sucesso!
                @else
                    Sua inscrição como atleta da equipe <strong>{{ $team->name }}</strong> foi confirmada com sucesso!
                @endif
            </p>

            <div class="card">
                <div class="card-title">Detalhes da Sua Inscrição</div>

                <div class="info-row">
                    <span class="info-label">Atleta:</span>
                    <span class="info-value">{{ $athlete->name }}</span>
                </div>

                <div class="info-row">
                    <span class="info-label">Equipe:</span>
                    <span class="info-value highlight-value">{{ $team->name }}</span>
                </div>

                @if($championship)
                <div class="info-row">
                    <span class="info-label">Campeonato:</span>
                    <span class="info-value highlight-value">{{ $championship->name }}</span>
                </div>
                @endif

                @if($category)
                <div class="info-row">
                    <span class="info-label">Categoria:</span>
                    <span class="info-value">{{ $category->name }}</span>
                </div>
                @endif

                @if($championship && $championship->sport)
                <div class="info-row">
                    <span class="info-label">Modalidade:</span>
                    <span class="info-value">{{ $championship->sport->name }}</span>
                </div>
                @endif

                @if(!empty($playerDetails['position']))
                <div class="info-row">
                    <span class="info-label">Posição:</span>
                    <span class="info-value">{{ $playerDetails['position'] }}</span>
                </div>
                @endif

                @if(!empty($playerDetails['number']))
                <div class="info-row">
                    <span class="info-label">Número da Camisa:</span>
                    <span class="info-value">#{{ $playerDetails['number'] }}</span>
                </div>
                @endif

                @if($club)
                <div class="info-row">
                    <span class="info-label">Organização / Clube:</span>
                    <span class="info-value">{{ $club->name }}</span>
                </div>
                @endif

                <div class="info-row">
                    <span class="info-label">Data da Confirmação:</span>
                    <span class="info-value">{{ now()->format('d/m/Y H:i') }}</span>
                </div>
            </div>

            <p style="font-size: 14px; color: #475569; line-height: 1.6; text-align: center;">
                Acompanhe a tabela de jogos, resultados, estatísticas e sua carteirinha digital diretamente pela plataforma.
            </p>

            <div class="btn-container">
                @if($championship)
                    <a href="https://esportes7.com.br/events/{{ $championship->id }}" class="btn">
                        Ver Campeonato na Plataforma
                    </a>
                @else
                    <a href="https://esportes7.com.br" class="btn">
                        Acessar Plataforma Esportes7
                    </a>
                @endif
            </div>
        </div>

        <div class="footer">
            <p>Este é um e-mail automático enviado pela plataforma {{ config('mail.from.name', 'Esportes7') }}.</p>
            <p>&copy; {{ date('Y') }} {{ config('mail.from.name', 'Esportes7') }}. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>

