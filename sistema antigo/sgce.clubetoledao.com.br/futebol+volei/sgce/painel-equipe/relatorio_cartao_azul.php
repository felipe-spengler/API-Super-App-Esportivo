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
    LEFT JOIN campeonatos cp ON c.id_campeonato_pai = cp.id
    WHERE c.id = ?
";
$stmt_campeonato = $pdo->prepare($sql_campeonato);
$stmt_campeonato->execute([$id_categoria]);
$campeonato = $stmt_campeonato->fetch(PDO::FETCH_ASSOC);

if (!$campeonato) {
    die("Campeonato não encontrado.");
}

// 2. Busca os eventos de cartão azul para o campeonato, agrupados por jogador e equipe
$sql_cartoes_azuis = "
    SELECT 
        par.id as id_participante,
        par.nome_completo as nome_participante,
        eq.nome as nome_equipe,
        eq.id as id_equipe,
        COUNT(se.id) as total_cartoes_azuis
    FROM sumulas_eventos se
    LEFT JOIN participantes par ON se.id_participante = par.id
    LEFT JOIN equipes eq ON se.id_equipe = eq.id
    JOIN partidas p ON se.id_partida = p.id
    WHERE p.id_campeonato = ? AND se.tipo_evento = 'Cartão Azul'
    GROUP BY par.id, eq.id
    ORDER BY total_cartoes_azuis DESC, par.nome_completo ASC
";
$stmt_cartoes_azuis = $pdo->prepare($sql_cartoes_azuis);
$stmt_cartoes_azuis->execute([$id_categoria]);
$cartoes_azuis = $stmt_cartoes_azuis->fetchAll(PDO::FETCH_ASSOC);

// --- INÍCIO DA RENDERIZAÇÃO DO HTML ---
require_once '../includes/header.php';
require_once 'sidebar_equipe.php';

?>

<style>
/* Styling for the table rows */
.caption-event {
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.caption-event:hover {
    background-color: #e0e0e0; /* Cor mais escura ao passar o mouse */
}

.body-event {
    overflow: hidden;
    max-height: 0;
    transition: max-height 0.5s ease-in-out, padding 0.5s ease-in-out;
}

.body-event.show {
    max-height: 1000px; /* Aumentado para mais conteúdo */
    padding: 10px;
}

/* Hide the body by default */
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

<main class="container py-5">


    <div class="card">
        <div class="card-header"><i class="fas fa-id-card text-primary me-2"></i>Cartões Azuis do Campeonato</div>
        <div class="card-body">
            <?php if (count($cartoes_azuis) > 0): ?>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Jogador</th>
                                <th>Equipe</th>
                                <th>Cartões Azuis</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                            $row_index = 0; // Contador para alternar cores
                            foreach ($cartoes_azuis as $cartao): 
                                $row_class = ($row_index % 2 == 0) ? 'table-secondary' : 'table-light'; // Classes Bootstrap para listras
                                $row_index++;
                            ?>
                                <tr class="caption-event <?= $row_class ?>">
                                    <td><?= htmlspecialchars($cartao['nome_participante']) ?></td>
                                    <td><?= htmlspecialchars($cartao['nome_equipe']) ?></td>
                                    <td><?= htmlspecialchars($cartao['total_cartoes_azuis']) ?></td>
                                </tr>
                                <tr class="body-event d-none">
                                    <td colspan="3">
                                        <?php
                                        // Busca as partidas onde este jogador recebeu cartões azuis
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
                                            AND se.tipo_evento = 'Cartão Azul'
                                            GROUP BY p.id
                                            ORDER BY p.data_partida DESC
                                        ";
                                        $stmt_partidas = $pdo->prepare($sql_partidas);
                                        $stmt_partidas->execute([$cartao['id_participante'], $id_categoria]);
                                        $partidas = $stmt_partidas->fetchAll(PDO::FETCH_ASSOC);

                                        if (!empty($partidas)):
                                            foreach ($partidas as $partida):
                                        ?>
                                            <!-- Cabeçalho da partida -->
                                            <div class="mb-3">
                                                <strong>Partida: </strong><?= htmlspecialchars($partida['nome_equipe_a']) ?> vs <?= htmlspecialchars($partida['nome_equipe_b']) ?><br>
                                                <strong>Data e Hora: </strong><?= htmlspecialchars($partida['data_partida_formatada']) ?><br>
                                                <strong>Placar: </strong><?= htmlspecialchars($partida['placar_equipe_a'] ?? '-') ?> x <?= htmlspecialchars($partida['placar_equipe_b'] ?? '-') ?>
                                            </div>
                                            <!-- Tabela de cartões azuis -->
                                            <table class="table inner-table">
                                                <?php
                                                // Busca os cartões azuis detalhados para a partida
                                                $sql_cartoes = "
                                                    SELECT 
                                                        par.numero_camisa as numero,
                                                        par.nome_completo as nome_participante,
                                                        par.apelido,
                                                        eq.nome as nome_equipe,
                                                        eq.id as id_equipe,
                                                        COUNT(se.id) as total_cartoes
                                                    FROM sumulas_eventos se
                                                    LEFT JOIN participantes par ON se.id_participante = par.id
                                                    LEFT JOIN equipes eq ON se.id_equipe = eq.id
                                                    WHERE se.id_partida = ? AND se.tipo_evento = 'Cartão Azul'
                                                    GROUP BY par.id, eq.id
                                                    ORDER BY CASE WHEN eq.id = ? THEN 1 ELSE 0 END DESC, total_cartoes DESC, par.nome_completo ASC
                                                ";
                                                $stmt_cartoes = $pdo->prepare($sql_cartoes);
                                                $stmt_cartoes->execute([$partida['id_partida'], $partida['id_equipe_a']]);
                                                $cartoes = $stmt_cartoes->fetchAll(PDO::FETCH_ASSOC);

                                                $cartoes_equipe_a = array_filter($cartoes, fn($cartao) => $cartao['id_equipe'] == $partida['id_equipe_a']);
                                                $cartoes_equipe_b = array_filter($cartoes, fn($cartao) => $cartao['id_equipe'] == $partida['id_equipe_b']);
                                                ?>
                                                <!-- Equipe A -->
                                                <?php if (!empty($cartoes_equipe_a)): ?>
                                                    <thead>
                                                        <tr>
                                                            <th colspan="4"><div class="equipe-a-header w-100">Cartões Azuis de <?= htmlspecialchars($partida['nome_equipe_a']) ?></div></th>
                                                        </tr>
                                                        <tr>
                                                            <th>Número</th>
                                                            <th>Jogador</th>
                                                            <th>Apelido</th>
                                                            <th>Cartões</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <?php foreach ($cartoes_equipe_a as $cartao): ?>
                                                            <tr>
                                                                <td><?= htmlspecialchars($cartao['numero'] ?? '-') ?></td>
                                                                <td><?= htmlspecialchars($cartao['nome_participante']) ?></td>
                                                                <td><?= htmlspecialchars($cartao['apelido'] ?? '-') ?></td>
                                                                <td><?= htmlspecialchars($cartao['total_cartoes']) ?></td>
                                                            </tr>
                                                        <?php endforeach; ?>
                                                    </tbody>
                                                <?php endif; ?>
                                                <!-- Equipe B -->
                                                <?php if (!empty($cartoes_equipe_b)): ?>
                                                    <thead>
                                                        <tr>
                                                            <th colspan="4"><div class="equipe-b-header w-100">Cartões Azuis de <?= htmlspecialchars($partida['nome_equipe_b']) ?></div></th>
                                                        </tr>
                                                        <tr>
                                                            <th>Número</th>
                                                            <th>Jogador</th>
                                                            <th>Apelido</th>
                                                            <th>Cartões</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <?php foreach ($cartoes_equipe_b as $cartao): ?>
                                                            <tr>
                                                                <td><?= htmlspecialchars($cartao['numero'] ?? '-') ?></td>
                                                                <td><?= htmlspecialchars($cartao['nome_participante']) ?></td>
                                                                <td><?= htmlspecialchars($cartao['apelido'] ?? '-') ?></td>
                                                                <td><?= htmlspecialchars($cartao['total_cartoes']) ?></td>
                                                            </tr>
                                                        <?php endforeach; ?>
                                                    </tbody>
                                                <?php endif; ?>
                                            </table>
                                            <?php if (empty($cartoes_equipe_a) && empty($cartoes_equipe_b)): ?>
                                                <div class="alert alert-info text-center">Nenhum cartão azul registrado para esta partida.</div>
                                            <?php endif; ?>
                                        <?php endforeach; ?>
                                        <?php else: ?>
                                            <div class="alert alert-info text-center">Nenhum cartão azul registrado para este jogador.</div>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div class="alert alert-secondary text-center">Nenhum cartão azul foi registrado para este campeonato.</div>
            <?php endif; ?>
        </div>
    </div>
</main>

<script>
// JavaScript to toggle body row visibility on caption click
document.querySelectorAll('.caption-event').forEach(caption => {
    caption.addEventListener('click', () => {
        const bodyRow = caption.nextElementSibling;
        bodyRow.classList.toggle('d-none');
        bodyRow.classList.toggle('show');
    });
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>