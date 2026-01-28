<?php
require_once 'includes/db.php'; // Adjust to your database connection file

// Validate match ID
if (!isset($_GET['id_partida']) || !is_numeric($_GET['id_partida'])) {
    die("Partida não especificada.");
}
$id_partida = $_GET['id_partida'];

// Fetch match details
$sql_partida = "
    SELECT 
        p.*, 
        c.nome as nome_campeonato, c.id_esporte,
        ea.nome as nome_equipe_a, ea.brasao as brasao_a,
        eb.nome as nome_equipe_b, eb.brasao as brasao_b
    FROM partidas p
    JOIN campeonatos c ON p.id_campeonato = c.id
    JOIN equipes ea ON p.id_equipe_a = ea.id
    JOIN equipes eb ON p.id_equipe_b = eb.id
    WHERE p.id = ?
";
$stmt_partida = $pdo->prepare($sql_partida);
$stmt_partida->execute([$id_partida]);
$partida = $stmt_partida->fetch(PDO::FETCH_ASSOC);

if (!$partida) {
    die("Partida não encontrada.");
}

// Fetch teams' players
$sql_participantes = "
    SELECT p.*, e.nome as nome_equipe
    FROM participantes p
    JOIN equipes e ON p.id_equipe = e.id
    WHERE p.id_equipe IN (?, ?)
    ORDER BY p.id_equipe, p.numero_camisa
";
$stmt_participantes = $pdo->prepare($sql_participantes);
$stmt_participantes->execute([$partida['id_equipe_a'], $partida['id_equipe_b']]);
$participantes = $stmt_participantes->fetchAll(PDO::FETCH_ASSOC);

// Separate players by team
$jogadores_a = array_filter($participantes, fn($p) => $p['id_equipe'] == $partida['id_equipe_a']);
$jogadores_b = array_filter($participantes, fn($p) => $p['id_equipe'] == $partida['id_equipe_b']);

// Fetch events (goals, fouls, cards, substitutions)
$sql_eventos = "
    SELECT 
        se.*, 
        par.nome_completo, 
        par.numero_camisa, 
        e.nome as nome_equipe
    FROM sumulas_eventos se
    LEFT JOIN participantes par ON se.id_participante = par.id
    LEFT JOIN equipes e ON se.id_equipe = e.id
    WHERE se.id_partida = ?
    ORDER BY CAST(se.minuto_evento AS UNSIGNED) ASC, se.id ASC
";
$stmt_eventos = $pdo->prepare($sql_eventos);
$stmt_eventos->execute([$id_partida]);
$eventos = $stmt_eventos->fetchAll(PDO::FETCH_ASSOC);

// Organize events
$gols_a = array_filter($eventos, fn($e) => $e['tipo_evento'] == 'Gol' && $e['id_equipe'] == $partida['id_equipe_a']);
$gols_b = array_filter($eventos, fn($e) => $e['tipo_evento'] == 'Gol' && $e['id_equipe'] == $partida['id_equipe_b']);
$cartoes_a = array_filter($eventos, fn($e) => in_array($e['tipo_evento'], ['Cartão Amarelo', 'Cartão Azul', 'Cartão Vermelho']) && $e['id_equipe'] == $partida['id_equipe_a']);
$cartoes_b = array_filter($eventos, fn($e) => in_array($e['tipo_evento'], ['Cartão Amarelo', 'Cartão Azul', 'Cartão Vermelho']) && $e['id_equipe'] == $partida['id_equipe_b']);
$substituicoes_a = array_filter($eventos, fn($e) => $e['tipo_evento'] == 'Substituição' && $e['id_equipe'] == $partida['id_equipe_a']);
$substituicoes_b = array_filter($eventos, fn($e) => $e['tipo_evento'] == 'Substituição' && $e['id_equipe'] == $partida['id_equipe_b']);
$faltas_a = array_filter($eventos, fn($e) => $e['tipo_evento'] == 'Falta' && $e['id_equipe'] == $partida['id_equipe_a']);
$faltas_b = array_filter($eventos, fn($e) => $e['tipo_evento'] == 'Falta' && $e['id_equipe'] == $partida['id_equipe_b']);

// Fetch sport name
$sql_esporte = "SELECT nome FROM esportes WHERE id = ?";
$stmt_esporte = $pdo->prepare($sql_esporte);
$stmt_esporte->execute([$partida['id_esporte']]);
$esporte = $stmt_esporte->fetch(PDO::FETCH_ASSOC)['nome'];
?>

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <base href="/">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
    <link rel="stylesheet" type="text/css" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" media="print" />
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.0/jquery.min.js"></script>
    <style>
        .suspenso { text-decoration: line-through; }
        .centralize { text-align: center; }
        .float-number { position: absolute; padding-right: 2px; padding-bottom: 2px; top: 0px; left: 0px; font-size: 10px; }
        .table { margin-bottom: 0px; }
        .border-bottom-none td { border-bottom: none; }
        .table td { position: relative; }
        .table tr, td { border-color: black !important; }
        .font-menor { font-size: 10px; }
        @media print {
            td.table-active, .table-active { -webkit-print-color-adjust: exact; background-color: rgba(0,0,0,.075) !important; }
            table.table, table.table tr td, table.table tr { border: 1px solid #000 !important; }
        }
        @page { size: auto; margin: 5mm; }
        tr.no-border td, table.no-border { border-bottom: none !important; }
        .button {
            background-color: #4CAF50; border: none; color: white; padding: 15px 32px; text-align: center;
            text-decoration: none; margin-top: 30px; margin-bottom: 30px; font-size: 16px; margin-left: auto; margin-right: auto; display: block;
        }
        @media print { .button { display: none; } }
    </style>
</head>
<body>
    <button class="button" id="save">Imprimir</button>

    <!-- Match Information -->
    <table class="table table-bordered table-sm no-border">
        <tr class="no-border">
            <td style="width: 85%;">
                <b>Competição:</b> <?= htmlspecialchars($partida['nome_campeonato']) ?>
            </td>
            <td style="width: 15%;">
                <b>Jogo Nº:</b> <?= htmlspecialchars($partida['id']) ?>
            </td>
        </tr>
    </table>
    <table class="table table-bordered table-sm no-border">
        <tr class="no-border">
            <td style="width: 50%;">
                <b>Categoria:</b> <?= htmlspecialchars($esporte) ?>
            </td>
            <td style="width: 25%;">
                <b>Fase:</b> <?= htmlspecialchars($partida['fase']) ?>
            </td>
            <td style="width: 25%;">
                <b>Rodada:</b> Semi Final
            </td>
        </tr>
    </table>
    <table style="margin-bottom: 16px" class="table table-bordered table-sm">
        <tr>
            <td style="text-align: right; width: 40%;">
                <b><?= htmlspecialchars($partida['nome_equipe_a']) ?></b>
            </td>
            <td style="width: 8%;" class="centralize">
                <b><?= htmlspecialchars($partida['placar_equipe_a']) ?></b>
            </td>
            <td style="width: 4%;" class="centralize">
                <b>x</b>
            </td>
            <td style="width: 8%;" class="centralize">
                <b><?= htmlspecialchars($partida['placar_equipe_b']) ?></b>
            </td>
            <td style="text-align: left; width: 40%;">
                <b><?= htmlspecialchars($partida['nome_equipe_b']) ?></b>
            </td>
        </tr>
    </table>

    <!-- Location and Date -->
    <div style="position: relative">
        <div style="display: inline-block; width: 75%; margin-right: 2px;">
            <table style="margin-bottom: 8px; position: absolute; top: 0px; width: 75%;" class="table table-bordered table-sm">
                <tr>
                    <td style="width: 56%;">
                        <b>Local:</b> <span contenteditable="true"><?= htmlspecialchars($partida['local_partida'] ?? '') ?></span>
                    </td>
                    <td style="text-align: left; width: 20%;">
                        <b>Data:</b> <span contenteditable="true"><?= $partida['data_partida'] ? date('d M Y | D - H:i', strtotime($partida['data_partida'])) : '' ?></span>
                    </td>
                </tr>
            </table>
            <table style="margin-bottom: 16px" class="table table-bordered table-sm">
                <tr>
                    <td>
                        <b>Arbitragem:</b> <span contenteditable="true"></span>
                    </td>
                </tr>
            </table>
        </div>
        <div style="display: inline-block; width: 24%;">
            <table style="margin-bottom: 16px" class="table table-bordered table-sm">
                <tr style="text-align: center">
                    <td class="table-active"></td>
                    <td class="table-active"><b>Início</b></td>
                    <td class="table-active"><b>Fim</b></td>
                </tr>
                <tr>
                    <td class="table-active"><b>Período 1</b></td>
                    <td contenteditable="true"></td>
                    <td contenteditable="true"></td>
                </tr>
                <tr>
                    <td class="table-active"><b>Período 2</b></td>
                    <td contenteditable="true"></td>
                    <td contenteditable="true"></td>
                </tr>
                <tr>
                    <td class="table-active"><b>Período Extra</b></td>
                    <td contenteditable="true"></td>
                    <td contenteditable="true"></td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Team A (Napoli) -->
    <div style="margin-bottom: 4px; position: relative; display: block;">
        <div style="display: inline-block; width: 69%; margin-right: 2px;">
            <table style="font-size: 13pt;" class="table-sm table table-bordered">
                <tbody>
                    <tr>
                        <td colspan="6"><b><?= htmlspecialchars($partida['nome_equipe_a']) ?></b></td>
                    </tr>
                    <tr>
                        <td class="table-active" colspan="2" style="width: 70%;"><b>Jogadores</b></td>
                        <td class="table-active" style="text-align: center;"><b>Nº</b></td>
                        <td class="table-active" style="text-align: center;"><b>Faltas</b></td>
                        <td class="table-active" style="text-align: center; width: 10%;"><b>Ama</b></td>
                        <td class="table-active" style="text-align: center;"><b>Az.</b></td>
                        <td class="table-active" style="text-align: center;"><b>Ver</b></td>
                    </tr>
                    <?php $i = 1; foreach ($jogadores_a as $jogador): ?>
                        <tr>
                            <td style="width: 4%; padding-left: 0px; padding-right: 0px; text-align: center; padding-top: 0px; padding-bottom: 0px;"><?= $i++ ?></td>
                            <td style="padding-top: 0px; padding-bottom: 0px;"><?= htmlspecialchars($jogador['nome_completo']) . ($jogador['posicao'] == 'Goleiro' ? ' (GK)' : '') ?></td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"><?= htmlspecialchars($jogador['numero_camisa'] ?? '') ?></td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px; color: lightgrey; font-size: 8pt; white-space: nowrap;">
                                <?php
                                $falta_count = count(array_filter($faltas_a, fn($f) => $f['id_participante'] == $jogador['id']));
                                echo implode(' | ', array_fill(0, min($falta_count, 5), 'X')) . str_repeat(' | ', 5 - min($falta_count, 5));
                                ?>
                            </td>
                            <td style="text-align: center; padding-left: 0px; padding-right: 0px; padding-top: 0px; padding-bottom: 0px;">
                                <?php echo array_filter($cartoes_a, fn($c) => $c['id_participante'] == $jogador['id'] && $c['tipo_evento'] == 'Cartão Amarelo') ? '<span class="font-menor">X</span>' : '<span class="font-menor"> | </span>'; ?>
                            </td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;">
                                <?php echo array_filter($cartoes_a, fn($c) => $c['id_participante'] == $jogador['id'] && $c['tipo_evento'] == 'Cartão Azul') ? '<span class="font-menor">X</span>' : ''; ?>
                            </td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;">
                                <?php echo array_filter($cartoes_a, fn($c) => $c['id_participante'] == $jogador['id'] && $c['tipo_evento'] == 'Cartão Vermelho') ? '<span class="font-menor">X</span>' : ''; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    <!-- Fill remaining rows -->
                    <?php for ($j = $i; $j <= 20; $j++): ?>
                        <tr>
                            <td style="width: 4%; padding-left: 0px; padding-right: 0px; text-align: center; padding-top: 0px; padding-bottom: 0px;"><?= $j ?></td>
                            <td style="padding-top: 0px; padding-bottom: 0px;"></td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"></td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px; color: lightgrey; font-size: 8pt; white-space: nowrap;">1 | 2 | 3 | 4 | 5</td>
                            <td style="text-align: center; padding-left: 0px; padding-right: 0px; padding-top: 0px; padding-bottom: 0px;"><span class="font-menor"> | </span></td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"></td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"></td>
                        </tr>
                    <?php endfor; ?>
                    <tr>
                        <td style="padding-top: 0px; padding-bottom: 0px;" colspan="3"><b>Técnico:</b> <span contenteditable="true"></span></td>
                        <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"></td>
                        <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"></td>
                        <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"></td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div style="width: 30%; display: inline-block;">
            <!-- Accumulated Fouls -->
            <table style="border-bottom: none !important" class="table-sm table table-bordered">
                <tr class="no-border">
                    <td colspan="10" class="table-active" style="text-align: center;"><b>Faltas acumuladas</b></td>
                </tr>
                <tr>
                    <td class="table-active" style="text-align: center;"><b style="font-size: 12px;">Período 1</b></td>
                    <?php for ($i = 1; $i <= 9; $i++): ?>
                        <td style="text-align: center;"><?= count($faltas_a) >= $i ? '<b>X</b>' : '&nbsp;' ?></td>
                    <?php endfor; ?>
                </tr>
                <tr>
                    <td class="table-active" style="text-align: center;"><b style="font-size: 12px;">Período 2</b></td>
                    <?php for ($i = 1; $i <= 9; $i++): ?>
                        <td style="text-align: center;"><?= count($faltas_a) >= $i + 9 ? '<b>X</b>' : '&nbsp;' ?></td>
                    <?php endfor; ?>
                </tr>
            </table>
            <!-- Timeouts -->
            <table style="margin-top: 8px; margin-bottom: 8px" class="table table-bordered table-sm">
                <tr>
                    <td colspan="2" style="text-align: center" class="table-active"><b>Pedidos de tempo</b></td>
                </tr>
                <tr>
                    <td style="text-align: center" class="table-active"><b>Período 1</b></td>
                    <td style="text-align: center" class="table-active"><b>Período 2</b></td>
                </tr>
                <tr>
                    <td style="text-align: center" contenteditable="true"><b>:</b></td>
                    <td style="border-top: none !important; text-align: center" contenteditable="true"><b>:</b></td>
                </tr>
            </table>
            <!-- Substitutions -->
            <table style="margin-top: 8px" class="table table-bordered table-sm">
                <tr style="text-align: center">
                    <td class="table-active"><b style="font-size: 12px;">Substituições</b></td>
                    <?php for ($i = 1; $i <= 9; $i++): ?>
                        <td class="table-active"><?= $i ?></td>
                    <?php endfor; ?>
                </tr>
                <tr>
                    <td class="table-active"><b>Entrou</b></td>
                    <?php for ($i = 1; $i <= 9; $i++): ?>
                        <td contenteditable="true"><?= isset($substituicoes_a[$i-1]) ? htmlspecialchars($substituicoes_a[$i-1]['nome_participante']) : '&nbsp;' ?></td>
                    <?php endfor; ?>
                </tr>
                <tr>
                    <td class="table-active"><b>Saiu</b></td>
                    <?php for ($i = 1; $i <= 9; $i++): ?>
                        <td contenteditable="true"><?= isset($substituicoes_a[$i-1]) ? htmlspecialchars($substituicoes_a[$i-1]['descricao']) : '&nbsp;' ?></td>
                    <?php endfor; ?>
                </tr>
            </table>
            <!-- Goals -->
            <table class="table table-bordered table-sm">
                <tr>
                    <td colspan="7" style="text-align: center; width: 20%; vertical-align: middle;" class="table-active"><b>GOLS</b></td>
                </tr>
                <?php for ($row = 0; $row < 4; $row++): ?>
                    <tr>
                        <?php for ($col = 1; $col <= 7; $col++): ?>
                            <?php
                            $goal_index = $row * 7 + $col - 1;
                            $gol = isset($gols_a[$goal_index]) ? $gols_a[$goal_index] : null;
                            ?>
                            <td style="border-top: none !important; text-align: center;">
                                <?php if ($gol): ?>
                                    <b><?= htmlspecialchars($gol['numero_camisa']) ?></b><br>
                                    <b class="float-number table-active"><?= $goal_index + 1 ?></b>
                                    <span class="font-menor">: <?= htmlspecialchars($gol['minuto_evento']) ?></span>
                                <?php else: ?>
                                    <b class="float-number table-active"><?= $goal_index + 1 ?></b>
                                    <b>&nbsp;&nbsp;</b><br>
                                    <span class="font-menor" contenteditable="true">:</span>
                                <?php endif; ?>
                            </td>
                        <?php endfor; ?>
                    </tr>
                <?php endfor; ?>
            </table>
        </div>
    </div>

    <!-- Team B (Internazionale) -->
    <div style="position: relative; display: block;">
        <div style="display: inline-block; width: 69%; margin-right: 2px;">
            <table style="font-size: 13pt;" class="table-sm table table-bordered">
                <tbody>
                    <tr>
                        <td colspan="6"><b><?= htmlspecialchars($partida['nome_equipe_b']) ?></b></td>
                    </tr>
                    <tr>
                        <td class="table-active" colspan="2" style="width: 70%;"><b>Jogadores</b></td>
                        <td class="table-active" style="text-align: center;"><b>Nº</b></td>
                        <td class="table-active" style="text-align: center;"><b>Faltas</b></td>
                        <td class="table-active" style="text-align: center; width: 10%;"><b>Ama</b></td>
                        <td class="table-active" style="text-align: center;"><b>Az.</b></td>
                        <td class="table-active" style="text-align: center;"><b>Ver</b></td>
                    </tr>
                    <?php $i = 1; foreach ($jogadores_b as $jogador): ?>
                        <tr>
                            <td style="width: 4%; padding-left: 0px; padding-right: 0px; text-align: center; padding-top: 0px; padding-bottom: 0px;"><?= $i++ ?></td>
                            <td style="padding-top: 0px; padding-bottom: 0px;"><?= htmlspecialchars($jogador['nome_completo']) . ($jogador['posicao'] == 'Goleiro' ? ' (GK)' : '') ?></td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"><?= htmlspecialchars($jogador['numero_camisa'] ?? '') ?></td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px; color: lightgrey; font-size: 8pt; white-space: nowrap;">
                                <?php
                                $falta_count = count(array_filter($faltas_b, fn($f) => $f['id_participante'] == $jogador['id']));
                                echo implode(' | ', array_fill(0, min($falta_count, 5), 'X')) . str_repeat(' | ', 5 - min($falta_count, 5));
                                ?>
                            </td>
                            <td style="text-align: center; padding-left: 0px; padding-right: 0px; padding-top: 0px; padding-bottom: 0px;">
                                <?php echo array_filter($cartoes_b, fn($c) => $c['id_participante'] == $jogador['id'] && $c['tipo_evento'] == 'Cartão Amarelo') ? '<span class="font-menor">X</span>' : '<span class="font-menor"> | </span>'; ?>
                            </td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;">
                                <?php echo array_filter($cartoes_b, fn($c) => $c['id_participante'] == $jogador['id'] && $c['tipo_evento'] == 'Cartão Azul') ? '<span class="font-menor">X</span>' : ''; ?>
                            </td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;">
                                <?php echo array_filter($cartoes_b, fn($c) => $c['id_participante'] == $jogador['id'] && $c['tipo_evento'] == 'Cartão Vermelho') ? '<span class="font-menor">X</span>' : ''; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                    <!-- Fill remaining rows -->
                    <?php for ($j = $i; $j <= 20; $j++): ?>
                        <tr>
                            <td style="width: 4%; padding-left: 0px; padding-right: 0px; text-align: center; padding-top: 0px; padding-bottom: 0px;"><?= $j ?></td>
                            <td style="padding-top: 0px; padding-bottom: 0px;"></td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"></td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px; color: lightgrey; font-size: 8pt; white-space: nowrap;">1 | 2 | 3 | 4 | 5</td>
                            <td style="text-align: center; padding-left: 0px; padding-right: 0px; padding-top: 0px; padding-bottom: 0px;"><span class="font-menor"> | </span></td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"></td>
                            <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"></td>
                        </tr>
                    <?php endfor; ?>
                    <tr>
                        <td style="padding-top: 0px; padding-bottom: 0px;" colspan="3"><b>Técnico:</b> <span contenteditable="true"></span></td>
                        <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"></td>
                        <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"></td>
                        <td style="text-align: center; padding-top: 0px; padding-bottom: 0px;"></td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div style="width: 30%; display: inline-block;">
            <!-- Accumulated Fouls -->
            <table style="border-bottom: none !important" class="table-sm table table-bordered">
                <tr class="no-border">
                    <td colspan="10" class="table-active" style="text-align: center;"><b>Faltas acumuladas</b></td>
                </tr>
                <tr>
                    <td class="table-active" style="text-align: center;"><b style="font-size: 12px;">Período 1</b></td>
                    <?php for ($i = 1; $i <= 9; $i++): ?>
                        <td style="text-align: center;"><?= count($faltas_b) >= $i ? '<b>X</b>' : '&nbsp;' ?></td>
                    <?php endfor; ?>
                </tr>
                <tr>
                    <td class="table-active" style="text-align: center;"><b style="font-size: 12px;">Período 2</b></td>
                    <?php for ($i = 1; $i <= 9; $i++): ?>
                        <td style="text-align: center;"><?= count($faltas_b) >= $i + 9 ? '<b>X</b>' : '&nbsp;' ?></td>
                    <?php endfor; ?>
                </tr>
            </table>
            <!-- Timeouts -->
            <table style="margin-top: 8px; margin-bottom: 8px" class="table table-bordered table-sm">
                <tr>
                    <td colspan="2" style="text-align: center" class="table-active"><b>Pedidos de tempo</b></td>
                </tr>
                <tr>
                    <td style="text-align: center" class="table-active"><b>Período 1</b></td>
                    <td style="text-align: center" class="table-active"><b>Período 2</b></td>
                </tr>
                <tr>
                    <td style="text-align: center" contenteditable="true"><b>:</b></td>
                    <td style="border-top: none !important; text-align: center" contenteditable="true"><b>:</b></td>
                </tr>
            </table>
            <!-- Substitutions -->
            <table style="margin-top: 8px" class="table table-bordered table-sm">
                <tr style="text-align: center">
                    <td class="table-active"><b style="font-size: 12px;">Substituições</b></td>
                    <?php for ($i = 1; $i <= 9; $i++): ?>
                        <td class="table-active"><?= $i ?></td>
                    <?php endfor; ?>
                </tr>
                <tr>
                    <td class="table-active"><b>Entrou</b></td>
                    <?php for ($i = 1; $i <= 9; $i++): ?>
                        <td contenteditable="true"><?= isset($substituicoes_b[$i-1]) ? htmlspecialchars($substituicoes_b[$i-1]['nome_participante']) : '&nbsp;' ?></td>
                    <?php endfor; ?>
                </tr>
                <tr>
                    <td class="table-active"><b>Saiu</b></td>
                    <?php for ($i = 1; $i <= 9; $i++): ?>
                        <td contenteditable="true"><?= isset($substituicoes_b[$i-1]) ? htmlspecialchars($substituicoes_b[$i-1]['descricao']) : '&nbsp;' ?></td>
                    <?php endfor; ?>
                </tr>
            </table>
            <!-- Goals -->
            <table class="table table-bordered table-sm">
                <tr>
                    <td colspan="7" style="text-align: center; width: 20%; vertical-align: middle;" class="table-active"><b>GOLS</b></td>
                </tr>
                <?php for ($row = 0; $row < 4; $row++): ?>
                    <tr>
                        <?php for ($col = 1; $col <= 7; $col++): ?>
                            <?php
                            $goal_index = $row * 7 + $col - 1;
                            $gol = isset($gols_b[$goal_index]) ? $gols_b[$goal_index] : null;
                            ?>
                            <td style="border-top: none !important; text-align: center;">
                                <?php if ($gol): ?>
                                    <b><?= htmlspecialchars($gol['numero_camisa']) ?></b><br>
                                    <b class="float-number table-active"><?= $goal_index + 1 ?></b>
                                    <span class="font-menor">: <?= htmlspecialchars($gol['minuto_evento']) ?></span>
                                <?php else: ?>
                                    <b class="float-number table-active"><?= $goal_index + 1 ?></b>
                                    <b>&nbsp;&nbsp;</b><br>
                                    <span class="font-menor" contenteditable="true">:</span>
                                <?php endif; ?>
                            </td>
                        <?php endfor; ?>
                    </tr>
                <?php endfor; ?>
            </table>
        </div>
    </div>

    <script>
        document.addEventListener("click", function(event) {
            var targetElement = event.target || event.srcElement;
            if (targetElement.tagName != "BUTTON") {
                targetElement.contentEditable = true;
                targetElement.focus();
            }
        });

        function get_doctype() {
            if (document.doctype == null) return "";
            var doctype = '<!DOCTYPE ' + document.doctype.name +
                (document.doctype.publicId ? ' PUBLIC "' + document.doctype.publicId + '"' : '') +
                (document.doctype.systemId ? ' "' + document.doctype.systemId + '"' : '') + '>';
            return doctype;
        }

        document.getElementById("save").addEventListener("click", function() {
            var clone = document.cloneNode(true);
            var htmlContent = get_doctype() + " <html lang=\"pt-BR\">" + clone.documentElement.innerHTML + "</html>";
            $.ajax({
                url: '/save-html',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ htmlContent: htmlContent }),
                success: function(response) {
                    let params = new URLSearchParams(window.location.search);
                    let newUrl = response;
                    newUrl += '&' + params.toString();
                    let pdf = "https://us-central1-copafacil-web.cloudfunctions.net/pdfRequest/pdf?url=" + encodeURIComponent(newUrl);
                    window.location.href = pdf;
                },
                error: function(error) {
                    alert("Erro ao salvar ou gerar o PDF. Tente novamente.");
                    console.error(error);
                }
            });
        });
    </script>
</body>
</html>