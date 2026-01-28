<?php
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php';

// Valida o ID do campeonato na URL
if (!isset($_GET['id_categoria']) || !is_numeric($_GET['id_categoria'])) {
    die("Campeonato não especificado.");
}

$id_categoria = $_GET['id_categoria'];

// 1. Busca o nome do campeonato
$sql_campeonato = "
    SELECT 
        c.nome as nome_campeonato,
        c.id_campeonato_pai,
        cp.nome as nome_campeonato_pai
    FROM campeonatos c
    LEFT JOIN campeonatos cp ON(c.id_campeonato_pai=cp.id)
    WHERE c.id = ?
";
$stmt_campeonato = $pdo->prepare($sql_campeonato);
$stmt_campeonato->execute([$id_categoria]);
$campeonato = $stmt_campeonato->fetch(PDO::FETCH_ASSOC);

if (!$campeonato) {
    die("Campeonato não encontrado.");
}

// 2. Busca as equipes participantes do campeonato
$sql_equipes = "
    SELECT DISTINCT eq.id, eq.nome
    FROM equipes eq
    JOIN campeonatos_equipes ce ON eq.id = ce.id_equipe
    WHERE ce.id_campeonato = ?
";
$stmt_equipes = $pdo->prepare($sql_equipes);
$stmt_equipes->execute([$id_categoria]);
$equipes = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);

// 3. Calcula estatísticas para cada equipe
$classificacao = [];
foreach ($equipes as $equipe) {
    $sql_partidas = "
        SELECT 
            p.id_equipe_a, p.id_equipe_b, p.placar_equipe_a, p.placar_equipe_b, p.status
        FROM partidas p
        WHERE p.id_campeonato = ? 
        AND (p.id_equipe_a = ? OR p.id_equipe_b = ?)
        AND p.status = 'Finalizada'
    ";
    $stmt_partidas = $pdo->prepare($sql_partidas);
    $stmt_partidas->execute([$id_categoria, $equipe['id'], $equipe['id']]);
    $partidas = $stmt_partidas->fetchAll(PDO::FETCH_ASSOC);

    $jogos = 0;
    $vitorias = 0;
    $empates = 0;
    $derrotas = 0;
    $pontos = 0;
    $gols_pro = 0;
    $gols_sofridos = 0;

    foreach ($partidas as $partida) {
        $jogos++;
        if ($partida['id_equipe_a'] == $equipe['id']) {
            $gols_pro += $partida['placar_equipe_a'];
            $gols_sofridos += $partida['placar_equipe_b'];
            if ($partida['placar_equipe_a'] > $partida['placar_equipe_b']) {
                $vitorias++;
                $pontos += 3;
            } elseif ($partida['placar_equipe_a'] == $partida['placar_equipe_b']) {
                $empates++;
                $pontos += 1;
            } else {
                $derrotas++;
            }
        } elseif ($partida['id_equipe_b'] == $equipe['id']) {
            $gols_pro += $partida['placar_equipe_b'];
            $gols_sofridos += $partida['placar_equipe_a'];
            if ($partida['placar_equipe_b'] > $partida['placar_equipe_a']) {
                $vitorias++;
                $pontos += 3;
            } elseif ($partida['placar_equipe_a'] == $partida['placar_equipe_b']) {
                $empates++;
                $pontos += 1;
            } else {
                $derrotas++;
            }
        }
    }

    $saldo_gols = $gols_pro - $gols_sofridos;

    $classificacao[] = [
        'nome' => $equipe['nome'],
        'jogos' => $jogos,
        'vitorias' => $vitorias,
        'empates' => $empates,
        'derrotas' => $derrotas,
        'pontos' => $pontos,
        'gols_pro' => $gols_pro,
        'gols_sofridos' => $gols_sofridos,
        'saldo_gols' => $saldo_gols
    ];
}

// Ordena por pontos, saldo de gols, gols pró em ordem decrescente
usort($classificacao, function($a, $b) {
    if ($b['pontos'] != $a['pontos']) {
        return $b['pontos'] <=> $a['pontos'];
    }
    if ($b['saldo_gols'] != $a['saldo_gols']) {
        return $b['saldo_gols'] <=> $a['saldo_gols'];
    }
    return $b['gols_pro'] <=> $a['gols_pro'];
});

// --- INÍCIO DA RENDERIZAÇÃO DO HTML ---
require_once '../includes/header.php';
require_once 'sidebar_equipe.php';

?>


<main class="container py-5">




    <div class="card">
        <div class="card-header"><i class="fas fa-trophy text-warning me-2"></i>Classificação do Campeonato</div>
        <div class="card-body">
            <?php if (count($classificacao) > 0): ?>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Posição</th>
                                <th>Equipe</th>
                                <th>P</th>
                                <th>J</th>
                                <th>V</th>
                                <th>E</th>
                                <th>D</th>
                                <th>GP</th>
                                <th>GS</th>
                                <th>SG</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php $posicao = 1; foreach ($classificacao as $class): ?>
                                <tr>
                                    <td><?= $posicao++ ?></td>
                                    <td><?= htmlspecialchars($class['nome']) ?></td>
                                    <td><?= htmlspecialchars($class['pontos']) ?></td>
                                    <td><?= htmlspecialchars($class['jogos']) ?></td>
                                    <td><?= htmlspecialchars($class['vitorias']) ?></td>
                                    <td><?= htmlspecialchars($class['empates']) ?></td>
                                    <td><?= htmlspecialchars($class['derrotas']) ?></td>
                                    <td><?= htmlspecialchars($class['gols_pro']) ?></td>
                                    <td><?= htmlspecialchars($class['gols_sofridos']) ?></td>
                                    <td><?= htmlspecialchars($class['saldo_gols']) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div class="alert alert-secondary text-center">Nenhuma partida finalizada para exibir a classificação.</div>
            <?php endif; ?>
        </div>
    </div>
</main>

<?php require_once '../includes/footer_dashboard.php'; ?>