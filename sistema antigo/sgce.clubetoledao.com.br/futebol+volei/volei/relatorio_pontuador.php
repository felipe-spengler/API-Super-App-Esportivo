<?php
require_once '../sgce/includes/db.php';

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
    LEFT JOIN campeonatos cp ON c.id_campeonato_pai = cp.id
    WHERE c.id = ?
";
$stmt_campeonato = $pdo->prepare($sql_campeonato);
$stmt_campeonato->execute([$id_categoria]);
$campeonato = $stmt_campeonato->fetch(PDO::FETCH_ASSOC);

if (!$campeonato) {
    die("Campeonato não encontrado.");
}

// 2. Busca os eventos de ponto (normal, bloqueio, saque)
$sql_eventos = "
    SELECT 
        par.id as id_participante,
        par.nome_completo as nome_participante,
        eq.nome as nome_equipe,
        eq.id as id_equipe,
        COUNT(se.id) as total_pontos
    FROM sumulas_eventos se
    LEFT JOIN participantes par ON se.id_participante = par.id
    LEFT JOIN equipes eq ON se.id_equipe = eq.id
    JOIN partidas p ON se.id_partida = p.id
    WHERE p.id_campeonato = ? 
      AND se.tipo_evento LIKE 'Ponto%'
    GROUP BY par.id, eq.id
    ORDER BY total_pontos DESC, par.nome_completo ASC
";
$stmt_eventos = $pdo->prepare($sql_eventos);
$stmt_eventos->execute([$id_categoria]);
$eventos = $stmt_eventos->fetchAll(PDO::FETCH_ASSOC);

require_once '../sgce/includes/header.php';
?>

<style>
.caption-event {
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.caption-event:hover {
    background-color: #e0e0e0;
}

.body-event {
    overflow: hidden;
    max-height: 0;
    transition: max-height 0.5s ease-in-out, padding 0.5s ease-in-out;
}

.body-event.show {
    max-height: 1000px;
    padding: 10px;
}

.body-event.d-none {
    max-height: 0;
    padding: 0;
}

.inner-table {
    margin: 0;
    width: 100%;
}

.inner-table th {
    background-color: #f8f9fa;
    font-size: 0.9em;
}

.equipe-a-header, .equipe-b-header {
    background-color: #e3f2fd;
    font-weight: bold;
    color: #1976d2;
    padding: 8px;
    margin-bottom: 10px;
}
</style>

<nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
    <div class="container">
        <a class="navbar-brand fw-bold" href="/sgce/index.php"><i class="fas fa-volleyball-ball me-2"></i>SGCE Vôlei</a>
        <div class="ms-auto">
            <a href="/sgce/login.php" class="btn btn-primary"><i class="fas fa-sign-in-alt me-2"></i>Acessar Painel</a>
        </div>
    </div>
</nav>

<main class="container py-5">
    <div class="card">
        <div class="card-header"><i class="fas fa-bullseye text-primary me-2"></i>Pontuadores do Campeonato</div>
        <div class="card-body">
            <?php if (count($eventos) > 0): ?>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Jogador</th>
                                <th>Equipe</th>
                                <th>Pontos</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                            $row_index = 0;
                            foreach ($eventos as $evento): 
                                $row_class = ($row_index % 2 == 0) ? 'table-secondary' : 'table-light';
                                $row_index++;
                            ?>
                                <tr class="caption-event <?= $row_class ?>">
                                    <td><?= htmlspecialchars($evento['nome_participante']) ?></td>
                                    <td><?= htmlspecialchars($evento['nome_equipe']) ?></td>
                                    <td><?= htmlspecialchars($evento['total_pontos']) ?></td>
                                </tr>
                                <tr class="body-event d-none">
                                    <td colspan="3">
                                        <?php
                                        // Busca as partidas onde este jogador marcou pontos
                                        $sql_partidas = "
                                            SELECT DISTINCT
                                                p.id as id_partida,
                                                ea.nome as nome_equipe_a,
                                                eb.nome as nome_equipe_b,
                                                p.id_equipe_a,
                                                p.id_equipe_b,
                                                p.placar_equipe_a,
                                                p.placar_equipe_b,
                                                DATE_FORMAT(p.data_partida, '%d/%m/%Y %H:%i') as data_partida_formatada
                                            FROM sumulas_eventos se
                                            JOIN partidas p ON se.id_partida = p.id
                                            JOIN equipes ea ON p.id_equipe_a = ea.id
                                            JOIN equipes eb ON p.id_equipe_b = eb.id
                                            WHERE se.id_participante = ? 
                                              AND p.id_campeonato = ? 
                                              AND se.tipo_evento LIKE 'Ponto%'
                                            GROUP BY p.id
                                            ORDER BY p.data_partida DESC
                                        ";
                                        $stmt_partidas = $pdo->prepare($sql_partidas);
                                        $stmt_partidas->execute([$evento['id_participante'], $id_categoria]);
                                        $partidas = $stmt_partidas->fetchAll(PDO::FETCH_ASSOC);

                                        if (!empty($partidas)):
                                            foreach ($partidas as $partida):
                                        ?>
                                            <div class="mb-3">
                                                <strong>Partida: </strong><?= htmlspecialchars($partida['nome_equipe_a']) ?> vs <?= htmlspecialchars($partida['nome_equipe_b']) ?><br>
                                                <strong>Data e Hora: </strong><?= htmlspecialchars($partida['data_partida_formatada']) ?><br>
                                                <strong>Placar: </strong><?= htmlspecialchars($partida['placar_equipe_a'] ?? '-') ?> x <?= htmlspecialchars($partida['placar_equipe_b'] ?? '-') ?>
                                            </div>

                                            <table class="table inner-table">
                                                <?php
                                                // Busca os pontos detalhados para a partida
                                                $sql_pontos = "
                                                    SELECT 
                                                        par.numero_camisa as numero,
                                                        par.nome_completo as nome_participante,
                                                        par.apelido,
                                                        eq.nome as nome_equipe,
                                                        eq.id as id_equipe,
                                                        se.tipo_evento,
                                                        COUNT(se.id) as total_pontos
                                                    FROM sumulas_eventos se
                                                    LEFT JOIN participantes par ON se.id_participante = par.id
                                                    LEFT JOIN equipes eq ON se.id_equipe = eq.id
                                                    WHERE se.id_partida = ? 
                                                      AND se.tipo_evento LIKE 'Ponto%'
                                                    GROUP BY par.id, eq.id, se.tipo_evento
                                                    ORDER BY CASE WHEN eq.id = ? THEN 1 ELSE 0 END DESC, total_pontos DESC
                                                ";
                                                $stmt_pontos = $pdo->prepare($sql_pontos);
                                                $stmt_pontos->execute([$partida['id_partida'], $partida['id_equipe_a']]);
                                                $pontos = $stmt_pontos->fetchAll(PDO::FETCH_ASSOC);

                                                $pontos_equipe_a = array_filter($pontos, fn($p) => $p['id_equipe'] == $partida['id_equipe_a']);
                                                $pontos_equipe_b = array_filter($pontos, fn($p) => $p['id_equipe'] == $partida['id_equipe_b']);
                                                ?>

                                                <?php if (!empty($pontos_equipe_a)): ?>
                                                    <thead>
                                                        <tr>
                                                            <th colspan="5"><div class="equipe-a-header w-100">Pontos de <?= htmlspecialchars($partida['nome_equipe_a']) ?></div></th>
                                                        </tr>
                                                        <tr>
                                                            <th>Número</th>
                                                            <th>Jogador</th>
                                                            <th>Apelido</th>
                                                            <th>Tipo</th>
                                                            <th>Pontos</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <?php foreach ($pontos_equipe_a as $p): ?>
                                                            <tr>
                                                                <td><?= htmlspecialchars($p['numero'] ?? '-') ?></td>
                                                                <td><?= htmlspecialchars($p['nome_participante']) ?></td>
                                                                <td><?= htmlspecialchars($p['apelido'] ?? '-') ?></td>
                                                                <td><?= htmlspecialchars($p['tipo_evento']) ?></td>
                                                                <td><?= htmlspecialchars($p['total_pontos']) ?></td>
                                                            </tr>
                                                        <?php endforeach; ?>
                                                    </tbody>
                                                <?php endif; ?>

                                                <?php if (!empty($pontos_equipe_b)): ?>
                                                    <thead>
                                                        <tr>
                                                            <th colspan="5"><div class="equipe-b-header w-100">Pontos de <?= htmlspecialchars($partida['nome_equipe_b']) ?></div></th>
                                                        </tr>
                                                        <tr>
                                                            <th>Número</th>
                                                            <th>Jogador</th>
                                                            <th>Apelido</th>
                                                            <th>Tipo</th>
                                                            <th>Pontos</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <?php foreach ($pontos_equipe_b as $p): ?>
                                                            <tr>
                                                                <td><?= htmlspecialchars($p['numero'] ?? '-') ?></td>
                                                                <td><?= htmlspecialchars($p['nome_participante']) ?></td>
                                                                <td><?= htmlspecialchars($p['apelido'] ?? '-') ?></td>
                                                                <td><?= htmlspecialchars($p['tipo_evento']) ?></td>
                                                                <td><?= htmlspecialchars($p['total_pontos']) ?></td>
                                                            </tr>
                                                        <?php endforeach; ?>
                                                    </tbody>
                                                <?php endif; ?>
                                            </table>
                                            <?php if (empty($pontos_equipe_a) && empty($pontos_equipe_b)): ?>
                                                <div class="alert alert-info text-center">Nenhum ponto registrado para esta partida.</div>
                                            <?php endif; ?>
                                        <?php endforeach; ?>
                                        <?php else: ?>
                                            <div class="alert alert-info text-center">Nenhum ponto registrado para este jogador.</div>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div class="alert alert-secondary text-center">Nenhum ponto foi registrado para este campeonato.</div>
            <?php endif; ?>
        </div>
    </div>
</main>

<script>
document.querySelectorAll('.caption-event').forEach(caption => {
    caption.addEventListener('click', () => {
        const bodyRow = caption.nextElementSibling;
        bodyRow.classList.toggle('d-none');
        bodyRow.classList.toggle('show');
    });
});
</script>

<?php require_once '../sgce/includes/footer.php'; ?>
