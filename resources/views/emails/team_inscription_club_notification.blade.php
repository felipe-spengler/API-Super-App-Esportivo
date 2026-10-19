<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inscrição de Equipe Confirmada</title>
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
        .price-tag {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: 800;
            font-size: 12px;
            text-transform: uppercase;
        }
        .price-free {
            background-color: #dbeafe;
            color: #1e40af;
        }
        .price-paid {
            background-color: #dcfce7;
            color: #166534;
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
            transition: background-color 0.2s;
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
            <div class="club-badge">{{ $club->name }}</div>
            <h1>Inscrição de Equipe Confirmada!</h1>
            <p>Uma nova equipe foi confirmada para participar do campeonato.</p>
        </div>

        <div class="content">
            <div style="text-align: center;">
                <span class="status-pill status-confirmed">
                    &#10003; Inscrição Efetivada e Confirmada
                </span>
            </div>

            <p style="font-size: 15px; line-height: 1.6; margin-top: 0; margin-bottom: 20px;">
                Olá, <strong>{{ $club->name }}</strong>! Informamos que o time <strong>{{ $team->name }}</strong> teve sua inscrição confirmada no campeonato <strong>{{ $championship->name }}</strong>.
            </p>

            <!-- Detalhes da Equipe e Campeonato -->
            <div class="card">
                <div class="card-title">Detalhes da Inscrição</div>

                <div class="info-row">
                    <span class="info-label">Campeonato:</span>
                    <span class="info-value highlight-value">{{ $championship->name }}</span>
                </div>

                <div class="info-row">
                    <span class="info-label">Equipe:</span>
                    <span class="info-value highlight-value">{{ $team->name }}</span>
                </div>

                @if($category)
                <div class="info-row">
                    <span class="info-label">Categoria:</span>
                    <span class="info-value">{{ $category->name }}</span>
                </div>
                @endif

                @if($championship->sport)
                <div class="info-row">
                    <span class="info-label">Modalidade:</span>
                    <span class="info-value">{{ $championship->sport->name }}</span>
                </div>
                @endif

                <div class="info-row">
                    <span class="info-label">Data da Efetivação:</span>
                    <span class="info-value">{{ now()->format('d/m/Y H:i') }}</span>
                </div>
            </div>

            <!-- Dados do Capitão / Responsável -->
            <div class="card">
                <div class="card-title">Capitão / Responsável</div>

                <div class="info-row">
                    <span class="info-label">Nome:</span>
                    <span class="info-value">{{ $captain->name ?? 'Não informado' }}</span>
                </div>

                @if(!empty($captain->email))
                <div class="info-row">
                    <span class="info-label">E-mail:</span>
                    <span class="info-value">{{ $captain->email }}</span>
                </div>
                @endif

                @if(!empty($captain->phone))
                <div class="info-row">
                    <span class="info-label">Telefone / WhatsApp:</span>
                    <span class="info-value">{{ $captain->phone }}</span>
                </div>
                @endif
            </div>

            <!-- Dados Financeiros -->
            <div class="card">
                <div class="card-title">Informações de Pagamento</div>

                <div class="info-row">
                    <span class="info-label">Tipo de Inscrição:</span>
                    <span class="info-value">
                        @if(!empty($paymentDetails['is_free']))
                            <span class="price-tag price-free">Inscrição Gratuita</span>
                        @else
                            <span class="price-tag price-paid">Inscrição Paga</span>
                        @endif
                    </span>
                </div>

                @if(empty($paymentDetails['is_free']) && isset($paymentDetails['price']) && (float)$paymentDetails['price'] > 0)
                <div class="info-row">
                    <span class="info-label">Valor Pago:</span>
                    <span class="info-value highlight-value">R$ {{ number_format((float)$paymentDetails['price'], 2, ',', '.') }}</span>
                </div>
                @endif

                @if(!empty($paymentDetails['payment_method']))
                <div class="info-row">
                    <span class="info-label">Forma de Pagamento:</span>
                    <span class="info-value" style="text-transform: uppercase;">
                        @if($paymentDetails['payment_method'] === 'free')
                            Isento (Grátis)
                        @elseif($paymentDetails['payment_method'] === 'PIX')
                            PIX
                        @elseif($paymentDetails['payment_method'] === 'CREDIT_CARD')
                            Cartão de Crédito
                        @elseif($paymentDetails['payment_method'] === 'BOLETO')
                            Boleto Bancário
                        @else
                            {{ $paymentDetails['payment_method'] }}
                        @endif
                    </span>
                </div>
                @endif

                <div class="info-row">
                    <span class="info-label">Status Financeiro:</span>
                    <span class="info-value" style="color: #166534;">&#10003; Confirmado / Liquidado</span>
                </div>
            </div>

            <div class="btn-container">
                <a href="{{ config('app.url') }}/admin/championships/{{ $championship->id }}" class="btn">
                    Gerenciar Campeonato no Painel
                </a>
            </div>
        </div>

        <div class="footer">
            <p>Este é um e-mail automático enviado pelo sistema de gestão esportiva.</p>
            <p>&copy; {{ date('Y') }} {{ config('mail.from.name', 'App Esportivo') }}. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>
