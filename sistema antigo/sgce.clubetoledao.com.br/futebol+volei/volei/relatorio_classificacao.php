<?php
require_once '../sgce/includes/db.php';

// Valida o ID do campeonato
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

// 2. Busca as equipes participantes
$sql_equipes = "
    SELECT DISTINCT eq.id, eq.nome
    FROM equipes eq
    JOIN campeonatos_equipes ce ON eq.id = ce.id_equipe
    WHERE ce.id_campeonato = ?
";
$stmt_equipes = $pdo->prepare($sql_equipes);
$stmt_equipes->execute([$id_categoria]);
$equipes = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);

// 3. Calcula estatísticas de cada equipe
$classificacao = [];
foreach ($equipes as $equipe) {
    $sql_partidas = "
        SELECT 
            p.id_equipe_a,
            p.id_equipe_b,
            p.placar_equipe_a,
            p.placar_equipe_b,
            p.status
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
    $derrotas = 0;
    $pontos = 0;
    $sets_pro = 0;
    $sets_contra = 0;

    foreach ($partidas as $partida) {
        $jogos++;
        $placar_a = (int)$partida['placar_equipe_a'];
        $placar_b = (int)$partida['placar_equipe_b'];

        if ($partida['id_equipe_a'] == $equipe['id']) {
            $sets_pro += $placar_a;
            $sets_contra += $placar_b;

            if ($placar_a > $placar_b) {
                $vitorias++;
                $pontos += 3;
            } else {
                $derrotas++;
            }
        } elseif ($partida['id_equipe_b'] == $equipe['id']) {
            $sets_pro += $placar_b;
            $sets_contra += $placar_a;

            if ($placar_b > $placar_a) {
                $vitorias++;
                $pontos += 3;
            } else {
                $derrotas++;
            }
        }
    }

    $saldo_sets = $sets_pro - $sets_contra;

    $classificacao[] = [
        'nome' => $equipe['nome'],
        'jogos' => $jogos,
        'vitorias' => $vitorias,
        'derrotas' => $derrotas,
        'pontos' => $pontos,
        'sets_pro' => $sets_pro,
        'sets_contra' => $sets_contra,
        'saldo_sets' => $saldo_sets
    ];
}

// Ordena: pontos > saldo de sets > sets pró
usort($classificacao, function($a, $b) {
    if ($b['pontos'] != $a['pontos']) {
        return $b['pontos'] <=> $a['pontos'];
    }
    if ($b['saldo_sets'] != $a['saldo_sets']) {
        return $b['saldo_sets'] <=> $a['saldo_sets'];
    }
    return $b['sets_pro'] <=> $a['sets_pro'];
});

require_once '../sgce/includes/header.php';
?>

<nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
    <div class="container">
        <a class="navbar-brand fw-bold" href="/sgce/index.php">
            <i class="fas fa-volleyball-ball me-2"></i>SGCE Vôlei
        </a>
        <div class="ms-auto">
            <a href="/sgce/login.php" class="btn btn-primary">
                <i class="fas fa-sign-in-alt me-2"></i>Acessar Painel
            </a>
        </div>
    </div>
</nav>

<main class="container py-5">
    <div class="card">
        <div class="card-header">
            <i class="fas fa-trophy text-warning me-2"></i>
            Classificação do Campeonato de Vôlei
        </div>
        <div class="card-body">
            <?php if (count($classificacao) > 0): ?>
                <div class="table-responsive">
                    <table class="table table-striped table-hover align-middle">
                        <thead>
                            <tr>
                                <th>Posição</th>
                                <th>Equipe</th>
                                <th>P</th>
                                <th>J</th>
                                <th>V</th>
                                <th>D</th>
                                <th>Sets Pró</th>
                                <th>Sets Contra</th>
                                <th>Saldo Sets</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php $pos = 1; foreach ($classificacao as $class): ?>
                                <tr>
                                    <td><?= $pos++ ?></td>
                                    <td><?= htmlspecialchars($class['nome']) ?></td>
                                    <td><?= $class['pontos'] ?></td>
                                    <td><?= $class['jogos'] ?></td>
                                    <td><?= $class['vitorias'] ?></td>
                                    <td><?= $class['derrotas'] ?></td>
                                    <td><?= $class['sets_pro'] ?></td>
                                    <td><?= $class['sets_contra'] ?></td>
                                    <td><?= $class['saldo_sets'] ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div class="alert alert-secondary text-center">
                    Nenhuma partida finalizada para exibir a classificação.
                </div>
            <?php endif; ?>
        </div>
    </div>
</main>

<?php require_once '../sgce/includes/footer.php'; ?>
