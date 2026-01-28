<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once '../sgce/includes/db.php';

// Valida o ID do campeonato na URL
if (!isset($_GET['id_categoria']) || !is_numeric($_GET['id_categoria'])) {
    die("Campeonato não especificado.");
}

$id_categoria = $_GET['id_categoria'];

// 1. Busca o nome, a hierarquia E O ID DO ESPORTE do campeonato (para o placar)
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

// DEFINIÇÃO DO ESPORTE para formatar o placar
$id_esporte = $campeonato['id_esporte'];
$is_futebol = ($id_esporte == 1); // Assumindo ID 1 = Futebol

// 2. Busca os eventos de cartão amarelo para o campeonato, agrupados por jogador e equipe
$sql_cartoes_amarelos = "
    SELECT 
        par.id as id_participante,
        par.nome_completo as nome_participante,
        eq.nome as nome_equipe,
        eq.id as id_equipe,
        COUNT(se.id) as total_cartoes_amarelos
    FROM sumulas_eventos se
    LEFT JOIN participantes par ON se.id_participante = par.id
    LEFT JOIN equipes eq ON se.id_equipe = eq.id
    JOIN partidas p ON se.id_partida = p.id
    WHERE p.id_campeonato = ? AND se.tipo_evento = 'Cartão Amarelo'
    GROUP BY par.id, eq.id
    ORDER BY total_cartoes_amarelos DESC, par.nome_completo ASC
";
$stmt_cartoes_amarelos = $pdo->prepare($sql_cartoes_amarelos);
$stmt_cartoes_amarelos->execute([$id_categoria]);
$cartoes_amarelos = $stmt_cartoes_amarelos->fetchAll(PDO::FETCH_ASSOC);

require_once '../sgce/includes/header.php';
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

/* CORREÇÃO APLICADA AQUI para a transição funcionar */
.body-event {
    overflow: hidden;
    max-height: 0;
    padding: 0 10px; /* Mantém o padding horizontal visível */
    transition: max-height 0.5s ease-in-out, padding 0.5s ease-in-out;
}

.body-event.show {
    max-height: 2000px; /* Valor alto para garantir que todo o conteúdo caiba */
    padding: 10px;
}

/* O d-none não deve usar max-height:0 se você usar o .show para expandir */
.body-event.d-none {
    max-height: 0 !important;
    padding: 0 !important;
}

.inner-table {
    margin: 0;
    width: 100%;
}

.inner-table th {
    background-color: #f8f9fa;
    font-size: 0.9em;
}

.equipe-a-header {
    background-color: #fff3cd; /* Amarelo claro para combinar com o tema */
    color: #856404; /* Cor escura do texto */
    font-weight: bold;
    padding: 8px;
    margin-bottom: 10px;
}
.equipe-b-header {
    background-color: #fff3cd; 
    color: #856404;
    font-weight: bold;
    padding: 8px;
    margin-bottom: 10px;
}
</style>
<nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
    <div class="container">
        <a class="navbar-brand fw-bold" href="/sgce/index.php"><i class="fas fa-trophy me-2"></i>SGCE</a>
        <div class="ms-auto">
            <a href="/sgce/login.php" class="btn btn-primary"><i class="fas fa-sign-in-alt me-2"></i>Acessar Painel</a>
        </div>
    </div>
</nav>

<main class="container py-5">
    <h1 class="mb-4">Estatísticas do Campeonato: <?= htmlspecialchars($campeonato['nome_campeonato']) ?></h1>
    <?php if ($campeonato['id_campeonato_pai']): ?>
        <p class="text-muted">Sub-categoria de: <?= htmlspecialchars($campeonato['nome_campeonato_pai']) ?></p>
    <?php endif; ?>

    <div class="card">
        <div class="card-header"><i class="fas fa-id-card text-warning me-2"></i>Cartões Amarelos do Campeonato</div>
        <div class="card-body">
            <?php if (count($cartoes_amarelos) > 0): ?>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Jogador</th>
                                <th>Equipe</th>
                                <th>Total de Cartões Amarelos</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                            $row_index = 0; // Contador para alternar cores
                            foreach ($cartoes_amarelos as $cartao): 
                                $row_class = ($row_index % 2 == 0) ? 'table-secondary' : 'table-light'; // Classes Bootstrap para listras
                                $row_index++;
                            ?>
                                <tr class="caption-event <?= $row_class ?>">
                                    <td><?= htmlspecialchars($cartao['nome_participante']) ?></td>
                                    <td><?= htmlspecialchars($cartao['nome_equipe']) ?></td>
                                    <td><span class="badge bg-warning text-dark"><?= htmlspecialchars($cartao['total_cartoes_amarelos']) ?></span></td>
                                </tr>
                                <tr class="body-event d-none">
                                    <td colspan="3">
                                        <?php
                                        // 3. Busca as partidas onde este jogador recebeu cartões amarelos
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
                                            AND se.tipo_evento = 'Cartão Amarelo'
                                            GROUP BY p.id
                                            ORDER BY p.data_partida DESC
                                        ";
                                        $stmt_partidas = $pdo->prepare($sql_partidas);
                                        $stmt_partidas->execute([$cartao['id_participante'], $id_categoria]);
                                        $partidas = $stmt_partidas->fetchAll(PDO::FETCH_ASSOC);

                                        if (!empty($partidas)):
                                            foreach ($partidas as $partida):
                                        ?>
                                                <div class="mb-3 p-2 border-bottom">
                                                    <strong>Partida: </strong><?= htmlspecialchars($partida['nome_equipe_a']) ?> vs <?= htmlspecialchars($partida['nome_equipe_b']) ?><br>
                                                    <strong>Data e Hora: </strong><?= htmlspecialchars($partida['data_partida_formatada']) ?><br>
                                                    <?php if ($is_futebol): ?>
                                                        <strong>Placar Gols: </strong><?= htmlspecialchars($partida['placar_equipe_a'] ?? '-') ?> x <?= htmlspecialchars($partida['placar_equipe_b'] ?? '-') ?><br>
                                                    <?php else: ?>
                                                        <strong>Placar Sets/Pontos: </strong><?= htmlspecialchars($partida['placar_equipe_a'] ?? '-') ?> x <?= htmlspecialchars($partida['placar_equipe_b'] ?? '-') ?><br>
                                                    <?php endif; ?>
                                                </div>
                                                
                                                <table class="table inner-table table-sm">
                                                    <?php
                                                    // 4. Busca os cartões amarelos detalhados para a partida (de TODOS os jogadores)
                                                    $sql_cartoes_detalhe = "
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
                                                        WHERE se.id_partida = ? AND se.tipo_evento = 'Cartão Amarelo'
                                                        GROUP BY par.id, eq.id
                                                        ORDER BY total_cartoes DESC, par.nome_completo ASC
                                                    ";
                                                    $stmt_cartoes_detalhe = $pdo->prepare($sql_cartoes_detalhe);
                                                    $stmt_cartoes_detalhe->execute([$partida['id_partida']]);
                                                    $cartoes_detalhe = $stmt_cartoes_detalhe->fetchAll(PDO::FETCH_ASSOC);

                                                    $cartoes_equipe_a = array_filter($cartoes_detalhe, fn($c) => $c['id_equipe'] == $partida['id_equipe_a']);
                                                    $cartoes_equipe_b = array_filter($cartoes_detalhe, fn($c) => $c['id_equipe'] == $partida['id_equipe_b']);

                                                    // Função de renderização para evitar repetição
                                                    $render_cartoes_table = function($cartoes_array, $nome_equipe, $equipe_header_class) {
                                                        if (empty($cartoes_array)) return;
                                                        ?>
                                                        <thead>
                                                            <tr>
                                                                <th colspan="4"><div class="<?= $equipe_header_class ?> w-100"><?= htmlspecialchars($nome_equipe) ?></div></th>
                                                            </tr>
                                                            <tr class="table-warning">
                                                                <th>#</th>
                                                                <th>Jogador</th>
                                                                <th>Apelido</th>
                                                                <th>Cartões</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <?php foreach ($cartoes_array as $c): ?>
                                                                <tr>
                                                                    <td><?= htmlspecialchars($c['numero'] ?? '-') ?></td>
                                                                    <td><?= htmlspecialchars($c['nome_participante']) ?></td>
                                                                    <td><?= htmlspecialchars($c['apelido'] ?? '-') ?></td>
                                                                    <td><span class="badge bg-warning text-dark"><?= htmlspecialchars($c['total_cartoes']) ?></span></td>
                                                                </tr>
                                                            <?php endforeach; ?>
                                                        </tbody>
                                                        <?php
                                                    };
                                                    
                                                    $render_cartoes_table($cartoes_equipe_a, $partida['nome_equipe_a'], 'equipe-a-header');
                                                    $render_cartoes_table($cartoes_equipe_b, $partida['nome_equipe_b'], 'equipe-b-header');
                                                    ?>
                                                </table>
                                                
                                                <?php if (empty($cartoes_equipe_a) && empty($cartoes_equipe_b)): ?>
                                                    <div class="alert alert-info text-center mt-2">Nenhum cartão amarelo registrado para esta partida.</div>
                                                <?php endif; ?>
                                            <?php endforeach; ?>
                                        <?php else: ?>
                                            <div class="alert alert-info text-center">Nenhum cartão amarelo registrado para este jogador.</div>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div class="alert alert-secondary text-center">Nenhum cartão amarelo foi registrado para este campeonato.</div>
            <?php endif; ?>
        </div>
    </div>
</main>

<script>
// JavaScript para alternar a visibilidade da linha detalhada ao clicar
document.querySelectorAll('.caption-event').forEach(caption => {
    caption.addEventListener('click', () => {
        const bodyRow = caption.nextElementSibling;
        
        // Verifica se já está aberto, para poder fechar
        if (bodyRow.classList.contains('show')) {
            bodyRow.classList.remove('show');
            bodyRow.classList.add('d-none');
        } else {
            // Fecha todos os outros antes de abrir o atual (melhora a usabilidade)
            document.querySelectorAll('.body-event.show').forEach(openRow => {
                 openRow.classList.remove('show');
                 openRow.classList.add('d-none');
            });
            
            // Abre o atual
            bodyRow.classList.remove('d-none');
            // Timeout necessário para o browser calcular a altura e aplicar a transição do max-height
            setTimeout(() => {
                bodyRow.classList.add('show');
            }, 10);
        }
    });
});
</script>

<?php require_once '../sgce/includes/footer.php'; // Footer público ?>