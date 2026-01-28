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

// 1. Busca o nome, a hierarquia E O ID DO ESPORTE do campeonato (ADICIONADO)
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

// 2. Busca as assistências para o campeonato, agrupadas por jogador e equipe
$sql_assistencias = "
    SELECT 
        par.id as id_participante,
        par.nome_completo as nome_participante,
        eq.nome as nome_equipe,
        eq.id as id_equipe,
        COUNT(se.id) as total_assistencias
    FROM sumulas_eventos se
    LEFT JOIN participantes par ON se.id_participante = par.id
    LEFT JOIN equipes eq ON se.id_equipe = eq.id
    JOIN partidas p ON se.id_partida = p.id
    WHERE p.id_campeonato = ? AND se.tipo_evento = 'Assistência' /* ASSUMIMOS O EVENTO 'Assistência' */
    GROUP BY par.id, eq.id
    ORDER BY total_assistencias DESC, par.nome_completo ASC
";
$stmt_assistencias = $pdo->prepare($sql_assistencias);
$stmt_assistencias->execute([$id_categoria]);
$assistencias = $stmt_assistencias->fetchAll(PDO::FETCH_ASSOC);

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

/* Garante que o d-none funcione corretamente com a transição */
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

/* Cores alteradas para um tom de azul/ciano que remete a assistências */
.equipe-a-header, .equipe-b-header {
    background-color: #e0f7fa; /* Ciano claro */
    font-weight: bold;
    color: #00796b; /* Ciano escuro */
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
        <div class="card-header"><i class="fas fa-hands-helping text-info me-2"></i>Assistências do Campeonato</div>
        <div class="card-body">
            <?php if (count($assistencias) > 0): ?>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Jogador</th>
                                <th>Equipe</th>
                                <th>Total de Assistências</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                            $row_index = 0; // Contador para alternar cores
                            foreach ($assistencias as $assistencia): 
                                $row_class = ($row_index % 2 == 0) ? 'table-secondary' : 'table-light'; // Classes Bootstrap para listras
                                $row_index++;
                            ?>
                                <tr class="caption-event <?= $row_class ?>">
                                    <td><?= htmlspecialchars($assistencia['nome_participante']) ?></td>
                                    <td><?= htmlspecialchars($assistencia['nome_equipe']) ?></td>
                                    <td><span class="badge bg-info text-dark"><?= htmlspecialchars($assistencia['total_assistencias']) ?></span></td>
                                </tr>
                                <tr class="body-event d-none">
                                    <td colspan="3">
                                        <?php
                                        // 3. Busca as partidas onde este jogador registrou assistências
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
                                            AND se.tipo_evento = 'Assistência'
                                            GROUP BY p.id
                                            ORDER BY p.data_partida DESC
                                        ";
                                        $stmt_partidas = $pdo->prepare($sql_partidas);
                                        $stmt_partidas->execute([$assistencia['id_participante'], $id_categoria]);
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
                                                    // 4. Busca as assistências detalhadas para a partida (de TODOS os jogadores)
                                                    $sql_assistencias_partida = "
                                                        SELECT 
                                                            par.numero_camisa as numero,
                                                            par.nome_completo as nome_participante,
                                                            par.apelido,
                                                            eq.nome as nome_equipe,
                                                            eq.id as id_equipe,
                                                            COUNT(se.id) as total_assistencias
                                                        FROM sumulas_eventos se
                                                        LEFT JOIN participantes par ON se.id_participante = par.id
                                                        LEFT JOIN equipes eq ON se.id_equipe = eq.id
                                                        WHERE se.id_partida = ? AND se.tipo_evento = 'Assistência'
                                                        GROUP BY par.id, eq.id
                                                        ORDER BY total_assistencias DESC, par.nome_completo ASC
                                                    ";
                                                    $stmt_assistencias_partida = $pdo->prepare($sql_assistencias_partida);
                                                    // Não precisamos do id_equipe_a na ordem aqui, pois mostraremos ambas separadas
                                                    $stmt_assistencias_partida->execute([$partida['id_partida']]);
                                                    $assistencias_partida_detalhe = $stmt_assistencias_partida->fetchAll(PDO::FETCH_ASSOC);

                                                    $assistencias_equipe_a = array_filter($assistencias_partida_detalhe, fn($a) => $a['id_equipe'] == $partida['id_equipe_a']);
                                                    $assistencias_equipe_b = array_filter($assistencias_partida_detalhe, fn($a) => $a['id_equipe'] == $partida['id_equipe_b']);

                                                    // Função de renderização para evitar repetição
                                                    $render_assistencias_table = function($assistencias_array, $nome_equipe, $equipe_header_class) {
                                                        if (empty($assistencias_array)) return;
                                                        ?>
                                                        <thead>
                                                            <tr>
                                                                <th colspan="4"><div class="<?= $equipe_header_class ?> w-100">Assistências de <?= htmlspecialchars($nome_equipe) ?></div></th>
                                                            </tr>
                                                            <tr class="table-info">
                                                                <th>#</th>
                                                                <th>Jogador</th>
                                                                <th>Apelido</th>
                                                                <th>Assistências</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <?php foreach ($assistencias_array as $a): ?>
                                                                <tr>
                                                                    <td><?= htmlspecialchars($a['numero'] ?? '-') ?></td>
                                                                    <td><?= htmlspecialchars($a['nome_participante']) ?></td>
                                                                    <td><?= htmlspecialchars($a['apelido'] ?? '-') ?></td>
                                                                    <td><span class="badge bg-info text-dark"><?= htmlspecialchars($a['total_assistencias']) ?></span></td>
                                                                </tr>
                                                            <?php endforeach; ?>
                                                        </tbody>
                                                        <?php
                                                    };
                                                    
                                                    $render_assistencias_table($assistencias_equipe_a, $partida['nome_equipe_a'], 'equipe-a-header');
                                                    $render_assistencias_table($assistencias_equipe_b, $partida['nome_equipe_b'], 'equipe-b-header');
                                                    ?>
                                                </table>
                                                
                                                <?php if (empty($assistencias_equipe_a) && empty($assistencias_equipe_b)): ?>
                                                    <div class="alert alert-info text-center mt-2">Nenhuma assistência registrada para esta partida.</div>
                                                <?php endif; ?>
                                            <?php endforeach; ?>
                                        <?php else: ?>
                                            <div class="alert alert-info text-center">Nenhuma assistência registrada para este jogador.</div>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div class="alert alert-secondary text-center">Nenhuma assistência foi registrada para este campeonato.</div>
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