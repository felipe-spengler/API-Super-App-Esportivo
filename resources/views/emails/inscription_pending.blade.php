<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sua inscrição está quase lá!</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .header {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            padding: 40px 20px;
            text-align: center;
            color: #fff;
        }

        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
            text-transform: uppercase;
        }

        .content {
            padding: 40px 30px;
            line-height: 1.6;
        }

        .greeting {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .details-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }

        .detail-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .detail-label {
            font-weight: 600;
            color: #64748b;
        }

        .detail-value {
            font-weight: 700;
            color: #1e293b;
        }

        .pix-section {
            text-align: center;
            margin: 30px 0;
        }

        .qr-code {
            max-width: 200px;
            margin-bottom: 20px;
            border: 1px solid #e2e8f0;
            padding: 10px;
            border-radius: 8px;
        }

        .copy-paste-container {
            background-color: #f1f5f9;
            border: 1px dashed #cbd5e1;
            border-radius: 6px;
            padding: 15px;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
            color: #334155;
            margin-bottom: 15px;
        }

        .btn {
            display: inline-block;
            background-color: #4f46e5;
            color: #ffffff;
            padding: 14px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 700;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 10px;
        }

        .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
        }

        .total-price {
            font-size: 24px;
            font-weight: 800;
            color: #4f46e5;
            margin: 10px 0;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>Inscrição Reservada!</h1>
        </div>
        <div class="content">
            <p class="greeting">Olá, {{ $result->name }}!</p>
            <p>Sua inscrição para o evento <strong>{{ $result->race->championship->name }}</strong> foi recebida com
                sucesso. Falta apenas o pagamento para confirmar sua vaga:</p>

            <div class="details-box">
                <div class="detail-item">
                    <span class="detail-label">Atleta:</span>
                    <span class="detail-value">{{ $result->name }}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Categoria:</span>
                    <span class="detail-value">{{ $result->category->name }}</span>
                </div>
                @if($result->bib_number)
                    <div class="detail-item">
                        <span class="detail-label">Número (BIB):</span>
                        <span class="detail-value">{{ $result->bib_number }}</span>
                    </div>
                @endif
                <div style="text-align: center; margin-top: 15px;">
                    <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">Valor do
                        Pagamento</span>
                    <div class="total-price">R$ {{ number_format($paymentData['value'] ?? 0, 2, ',', '.') }}</div>
                </div>
            </div>

            @if(isset($paymentData['pix_qr_code']))
                <div class="pix-section">
                    <p><strong>Pague via PIX agora:</strong></p>
                    <img src="{{ $paymentData['pix_qr_code'] }}" alt="QR Code PIX" class="qr-code">

                    <p style="font-size: 13px; font-weight: 600; margin-bottom: 5px;">Código Copia e Cola:</p>
                    <div class="copy-paste-container">
                        {{ $paymentData['pix_copy_paste'] }}
                    </div>
                </div>
            @else
                <div style="text-align: center; margin: 30px 0;">
                    <p>Clique no botão abaixo para acessar sua fatura e escolher a forma de pagamento:</p>
                    <a href="{{ $paymentData['invoice_url'] }}" class="btn">Pagar Inscrição</a>
                </div>
            @endif

            <p style="font-size: 13px;">O prazo para realizar o pagamento é até
                <strong>{{ \Carbon\Carbon::parse($paymentData['expiration'])->format('d/m/Y') }}</strong>. Após esta
                data, sua inscrição poderá ser cancelada.</p>
        </div>
        <div class="footer">
            &copy; {{ date('Y') }} Esportes7 Platform. Este é um e-mail automático, por favor não responda.
        </div>
    </div>
</body>

</html>