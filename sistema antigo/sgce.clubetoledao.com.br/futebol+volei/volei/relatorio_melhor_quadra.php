<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once '../sgce/includes/db.php';

// =========================================================================
// FUNÇÃO DE LÓGICA: Retorna a consulta SQL de estatísticas baseada no esporte
// =========================================================================
function get_stats_sql($id_esporte) {
    // 1 (Futebol), 2 (Vôlei)
    if ($id_esporte == 1) { // Futebol
        return "
            SELECT 
                par.numero_camisa as numero,
                par.nome_completo as nome_participante,
                par.apelido,
                eq.nome as nome_equipe,
                eq.id as id_equipe,
                
                SUM(CASE WHEN se.tipo_evento = 'Gol' THEN 1 ELSE 0 END) as total_gols,
                SUM(CASE WHEN se.tipo_evento = 'Cartão Amarelo' THEN 1 ELSE 0 END) as total_amarelos,
                SUM(CASE WHEN se.tipo_evento = 'Cartão Vermelho' THEN 1 ELSE 0 END) as total_vermelhos
                
            FROM sumulas_eventos se
            LEFT JOIN participantes par ON se.id_participante = par.id
            LEFT JOIN equipes eq ON se.id_equipe = eq.id
            WHERE se.id_partida = ?
            GROUP BY par.id, eq.id
            HAVING total_gols > 0 OR total_amarelos > 0 OR total_vermelhos > 0
            ORDER BY total_gols DESC, par.nome_completo ASC
        ";
    } else { // Vôlei (e default para qualquer outro esporte que use esta métrica)
        return "
            SELECT 
                par.numero_camisa as numero,
                par.nome_completo as nome_participante,
                par.apelido,
                eq.nome as nome_equipe,
                eq.id as id_equipe,
                
                SUM(CASE WHEN se.tipo_evento = 'Ponto' THEN 1 ELSE 0 END) as total_pontos,
                SUM(CASE WHEN se.tipo_evento = 'Saque Ace' THEN 1 ELSE 0 END) as total_saque_ace,
                SUM(CASE WHEN se.tipo_evento = 'Bloqueio' THEN 1 ELSE 0 END) as total_bloqueio
                
            FROM sumulas_eventos se
            LEFT JOIN participantes par ON se.id_participante = par.id
            LEFT JOIN equipes eq ON se.id_equipe = eq.id
            WHERE se.id_partida = ?
            GROUP BY par.id, eq.id
            HAVING total_pontos > 0 OR total_saque_ace > 0 OR total_bloqueio > 0
            ORDER BY total_pontos DESC, par.nome_completo ASC
        ";
    }
}
// =========================================================================

// Valida o ID do campeonato na URL
if (!isset($_GET['id_categoria']) || !is_numeric($_GET['id_categoria'])) {
    die("Campeonato não especificado.");
}

$id_categoria = $_GET['id_categoria'];

// 1. Busca o nome, a hierarquia E O ID DO ESPORTE do campeonato
$sql_campeonato = "
    SELECT 
        c.nome as nome_campeonato,
        c.id_campeonato_pai,
        cp.nome as nome_campeonato_pai,
        c.id_esporte /* ADICIONADO: Usado para determinar a modalidade (Futebol/Vôlei) */
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

// DEFINIÇÃO DO ESPORTE PARA USO CONDICIONAL EM TODO O CÓDIGO
$id_esporte = $campeonato['id_esporte'];
$is_futebol = ($id_esporte == 1); // Assumindo ID 1 = Futebol

// 2. Busca os MVPs (Destaques) de todas as partidas do campeonato, agrupados por jogador e equipe
$sql_mvps = "
    SELECT 
        par.id as id_participante,
        par.nome_completo as nome_participante,
        eq.nome as nome_equipe,
        eq.id as id_equipe,
        COUNT(p.id_melhor_jogador) as total_destaque 
    FROM partidas p
    LEFT JOIN participantes par ON p.id_melhor_jogador = par.id
    LEFT JOIN equipes eq ON par.id_equipe = eq.id
    WHERE 
            p.id_campeonato = ? 
            AND 
            p.id_melhor_jogador IS NOT NULL
    GROUP BY par.id, eq.id
    ORDER BY total_destaque DESC, par.nome_completo ASC
";
$stmt_mvps = $pdo->prepare($sql_mvps);
$stmt_mvps->execute([$id_categoria]);
$mvps = $stmt_mvps->fetchAll(PDO::FETCH_ASSOC);

require_once '../sgce/includes/header.php';
?>
<nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
    <div class="container">
        <a class="navbar-brand fw-bold" href="/sgce/index.php"><i class="fas fa-trophy me-2"></i>SGCE</a>
        <div class="ms-auto">
            <a href="/sgce/login.php" class="btn btn-primary"><i class="fas fa-sign-in-alt me-2"></i>Acessar Painel</a>
        </div>
    </div>
</nav>

<main class="container py-5">
    <div class="card">
        <div class="card-header"><i class="fas fa-crown text-success me-2"></i>Destaques do Campeonato em Quadra</div>
        <div class="card-body">
            <?php if (count($mvps) > 0): ?>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Jogador</th>
                                <th>Equipe</th>
                                <th>Vezes Destaque</th> 
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                            $row_index = 0;
                            foreach ($mvps as $mvp): 
                                $row_class = ($row_index % 2 == 0) ? 'table-secondary' : 'table-light';
                                $row_index++;
                            ?>
                                <tr class="caption-event <?= $row_class ?>">
                                    <td><?= htmlspecialchars($mvp['nome_participante']) ?></td>
                                    <td><?= htmlspecialchars($mvp['nome_equipe']) ?></td>
                                    <td><?= htmlspecialchars($mvp['total_destaque']) ?></td> 
                                </tr>
                                <tr class="body-event d-none">
                                    <td colspan="3">
                                        <?php
                                        // 3. Busca as partidas onde este jogador foi Destaque
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
                                            FROM partidas p
                                            JOIN equipes ea ON p.id_equipe_a = ea.id
                                            JOIN equipes eb ON p.id_equipe_b = eb.id
                                            WHERE p.id_melhor_jogador = ? 
                                            AND p.id_campeonato = ?
                                            ORDER BY p.data_partida DESC
                                        ";
                                        $stmt_partidas = $pdo->prepare($sql_partidas);
                                        $stmt_partidas->execute([$mvp['id_participante'], $id_categoria]);
                                        $partidas = $stmt_partidas->fetchAll(PDO::FETCH_ASSOC);

                                        if (!empty($partidas)):
                                            $sql_stats = get_stats_sql($id_esporte); // Usa a função condicional
                                            $stmt_stats = $pdo->prepare($sql_stats);
                                            
                                            // 4. Define a função de renderização da tabela de estatísticas (condicional)
                                            $render_stats_table = function($stats_array, $nome_equipe, $is_futebol) {
                                                if (empty($stats_array)) return;
                                                ?>
                                                <thead>
                                                    <tr>
                                                        <th colspan="5"><div class="equipe-a-header w-100 p-1 text-white bg-primary">Estatísticas de <?= htmlspecialchars($nome_equipe) ?></div></th>
                                                    </tr>
                                                    <tr class="table-info">
                                                        <th>#</th>
                                                        <th>Jogador</th>
                                                        <?php if ($is_futebol): // Cabeçalhos Futebol ?>
                                                            <th>Gols</th>
                                                            <th>Amarelos</th>
                                                            <th>Vermelhos</th>
                                                        <?php else: // Cabeçalhos Vôlei ?>
                                                            <th>Pontos</th>
                                                            <th>Saque Ace</th>
                                                            <th>Bloqueio</th>
                                                        <?php endif; ?>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <?php foreach ($stats_array as $stat): ?>
                                                        <tr>
                                                            <td><?= htmlspecialchars($stat['numero'] ?? '-') ?></td>
                                                            <td><?= htmlspecialchars($stat['nome_participante']) ?> (<?= htmlspecialchars($stat['apelido'] ?? '-') ?>)</td>
                                                            <?php if ($is_futebol): // Dados Futebol ?>
                                                                <td><span class="badge bg-success"><?= htmlspecialchars($stat['total_gols']) ?></span></td>
                                                                <td><span class="badge bg-warning text-dark"><?= htmlspecialchars($stat['total_amarelos']) ?></span></td>
                                                                <td><span class="badge bg-danger"><?= htmlspecialchars($stat['total_vermelhos']) ?></span></td>
                                                            <?php else: // Dados Vôlei ?>
                                                                <td><span class="badge bg-success"><?= htmlspecialchars($stat['total_pontos']) ?></span></td>
                                                                <td><span class="badge bg-info"><?= htmlspecialchars($stat['total_saque_ace']) ?></span></td>
                                                                <td><span class="badge bg-warning text-dark"><?= htmlspecialchars($stat['total_bloqueio']) ?></span></td>
                                                            <?php endif; ?>
                                                        </tr>
                                                    <?php endforeach; ?>
                                                </tbody>
                                                <?php
                                            };
                                            // Fim da função de renderização

                                            foreach ($partidas as $partida):
                                                // Executa a busca de stats específica para a partida
                                                $stmt_stats->execute([$partida['id_partida']]);
                                                $stats = $stmt_stats->fetchAll(PDO::FETCH_ASSOC);

                                                $stats_equipe_a = array_filter($stats, fn($stat) => $stat['id_equipe'] == $partida['id_equipe_a']);
                                                $stats_equipe_b = array_filter($stats, fn($stat) => $stat['id_equipe'] == $partida['id_equipe_b']);
                                        ?>
                                                <div class="mb-3 p-2 border-bottom">
                                                    <strong>Partida: </strong><?= htmlspecialchars($partida['nome_equipe_a']) ?> vs <?= htmlspecialchars($partida['nome_equipe_b']) ?><br>
                                                    <strong>Data e Hora: </strong><?= htmlspecialchars($partida['data_partida_formatada']) ?><br>
                                                    <?php if ($is_futebol): ?>
                                                        <strong>Placar Gols: </strong><?= htmlspecialchars($partida['placar_equipe_a'] ?? '-') ?> x <?= htmlspecialchars($partida['placar_equipe_b'] ?? '-') ?><br>
                                                    <?php else: ?>
                                                        <strong>Placar Sets: </strong><?= htmlspecialchars($partida['placar_equipe_a'] ?? '-') ?> x <?= htmlspecialchars($partida['placar_equipe_b'] ?? '-') ?><br>
                                                    <?php endif; ?>
                                                </div>
                                                
                                                <table class="table inner-table table-sm">
                                                    <?= $render_stats_table($stats_equipe_a, $partida['nome_equipe_a'], $is_futebol) ?>
                                                    <?= $render_stats_table($stats_equipe_b, $partida['nome_equipe_b'], $is_futebol) ?>
                                                </table>
                                                
                                                <?php if (empty($stats_equipe_a) && empty($stats_equipe_b)): ?>
                                                    <div class="alert alert-info text-center mt-2">Nenhuma estatística detalhada registrada para esta partida.</div>
                                                <?php endif; ?>
                                            <?php endforeach; ?>
                                        <?php else: ?>
                                            <div class="alert alert-info text-center">Nenhuma partida registrada para este jogador como Destaque.</div>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div class="alert alert-secondary text-center">Nenhum Destaque foi registrado para este campeonato.</div>
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

<?php require_once '../sgce/includes/footer.php'; // Footer público ?>