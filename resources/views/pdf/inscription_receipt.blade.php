<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Comprovante de Inscrição</title>
    <style>
        body {
            font-family: 'Helvetica', sans-serif;
            color: #333;
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }

        .container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .header h1 {
            color: #4f46e5;
            margin: 0;
            font-size: 24px;
        }

        .header p {
            margin: 5px 0 0 0;
            color: #666;
        }

        .section {
            margin-bottom: 25px;
        }

        .section-title {
            background: #f1f5f9;
            padding: 8px 15px;
            font-weight: bold;
            border-radius: 6px;
            margin-bottom: 15px;
            color: #1e293b;
            text-transform: uppercase;
            font-size: 14px;
        }

        .grid {
            width: 100%;
            border-collapse: collapse;
        }

        .grid td {
            padding: 8px 0;
            vertical-align: top;
        }

        .label {
            font-weight: bold;
            color: #64748b;
            width: 150px;
            font-size: 13px;
        }

        .value {
            color: #1e293b;
            font-size: 14px;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }

        .table th {
            background: #f8fafc;
            text-align: left;
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 12px;
            color: #64748b;
        }

        .table td {
            padding: 12px 10px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
        }

        .footer {
            margin-top: 50px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            display: flex;
            align-items: flex-start;
        }

        .qr-code {
            float: right;
            text-align: center;
        }

        .qr-code img {
            width: 120px;
            height: 120px;
        }

        .qr-code p {
            font-size: 10px;
            color: #94a3b8;
            margin-top: 5px;
        }

        .status-paid {
            color: #16a34a;
            font-weight: bold;
        }

        .status-badge {
            background: #dcfce7;
            color: #16a34a;
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: bold;
        }

        .clear {
            clear: both;
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="header">
            <h1>COMPROVANTE DE INSCRIÇÃO</h1>
            <p>{{ $championship->name }}</p>
        </div>

        <div class="section">
            <div class="section-title">Dados do Atleta</div>
            <table class="grid">
                <tr>
                    <td class="label">Nome:</td>
                    <td class="value">{{ $user->name }}</td>
                </tr>
                <tr>
                    <td class="label">CPF:</td>
                    <td class="value">{{ $user->cpf ?? '---' }}</td>
                </tr>
                <tr>
                    <td class="label">E-mail:</td>
                    <td class="value">{{ $user->email }}</td>
                </tr>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Detalhes da Inscrição</div>
            <table class="grid">
                <tr>
                    <td class="label">Corrida:</td>
                    <td class="value">Geral / {{ $championship->name }}</td>
                </tr>
                <tr>
                    <td class="label">Categoria:</td>
                    <td class="value">{{ $category->name }}</td>
                </tr>
                <tr>
                    <td class="label">Número de Peito:</td>
                    <td class="value" style="font-size: 18px; font-weight: bold;">#{{ $result->bib_number }}</td>
                </tr>
                <tr>
                    <td class="label">Status Pagto:</td>
                    <td class="value"><span class="status-badge">PAGO / CONFIRMADO</span></td>
                </tr>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Itens e Brindes inclusos</div>
            <table class="table">
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th>Tipo</th>
                        <th>Variação/Tamanho</th>
                        <th style="text-align: center;">Qtd</th>
                    </tr>
                </thead>
                <tbody>
                    {{-- Inscrição Base --}}
                    <tr>
                        <td>Inscrição {{ $category->name }}</td>
                        <td>Evento</td>
                        <td>---</td>
                        <td style="text-align: center;">1</td>
                    </tr>

                    {{-- Brindes Inclusos --}}
                    @foreach($gifts as $gift)
                        <tr>
                            <td>{{ $gift['name'] }}</td>
                            <td>Brinde</td>
                            <td>{{ $gift['variant'] ?? 'Padrão' }}</td>
                            <td style="text-align: center;">1</td>
                        </tr>
                    @endforeach

                    {{-- Itens de Loja --}}
                    @foreach($shopItems as $item)
                        <tr>
                            <td>{{ $item['name'] }}</td>
                            <td>Compra Extra</td>
                            <td>{{ $item['variant'] ?? 'Padrão' }}</td>
                            <td style="text-align: center;">{{ $item['quantity'] }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <div class="footer">
            <div style="float: left; width: 60%;">
                <p style="font-size: 12px; color: #64748b; margin-bottom: 5px;">Este documento é o seu comprovante
                    oficial de participação.</p>
                <p style="font-size: 12px; color: #64748b;">Apresente-o na retirada de kit junto com um documento
                    oficial com foto.</p>
                <p style="font-size: 11px; color: #94a3b8; margin-top: 20px;">Emitido em: {{ date('d/m/Y H:i') }}</p>
            </div>

            <div class="qr-code">
                @php
                    $checkInUrl = "https://esportivo.techinteligente.site/admin/check-in/" . $result->id;
                    $qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . urlencode($checkInUrl);
                @endphp
                <img src="{{ $qrCodeUrl }}" alt="QR Code Check-in">
                <p>VALIDAÇÃO DE KIT</p>
            </div>
            <div class="clear"></div>
        </div>
    </div>
</body>

</html>