<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

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

// 2. Busca os eventos de gol para o campeonato, agrupados por jogador e equipe
$sql_eventos = "
    SELECT 
        par.nome_completo as nome_participante,
        eq.nome as nome_equipe,
        COUNT(se.id) as total_gols
    FROM sumulas_eventos se
    LEFT JOIN participantes par ON se.id_participante = par.id
    LEFT JOIN equipes eq ON se.id_equipe = eq.id
    JOIN partidas p ON se.id_partida = p.id
    WHERE p.id_campeonato = ? AND se.tipo_evento = 'Gol'
    GROUP BY par.id, eq.id
    ORDER BY total_gols DESC, par.nome_completo ASC
";
$stmt_eventos = $pdo->prepare($sql_eventos);
$stmt_eventos->execute([$id_categoria]);
$eventos = $stmt_eventos->fetchAll(PDO::FETCH_ASSOC);

require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonato <?php echo htmlspecialchars($campeonato['nome_campeonato_pai']); ?></a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos_categoria.php?id_campeonato=<?= htmlspecialchars($campeonato['id_campeonato_pai']) ?>">Gerenciar Categorias</a></li>
        <li class="breadcrumb-item"><a href="categoria.php?id_categoria=<?= htmlspecialchars($id_categoria) ?>">Categoria <?php echo htmlspecialchars($campeonato['nome_campeonato']); ?></a></li>
        <li class="breadcrumb-item active" aria-current="page">Gols</li>
    </ol>
</nav>

<main class="container py-5">

    <div class="card">
        <div class="card-header"><i class="fas fa-futbol text-success me-2"></i>Gols do Campeonato</div>
        <div class="card-body">
            <?php if (count($eventos) > 0): ?>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Jogador</th>
                                <th>Equipe</th>
                                <th>Gols</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($eventos as $evento): ?>
                                <tr>
                                    <td><?= htmlspecialchars($evento['nome_participante']) ?></td>
                                    <td><?= htmlspecialchars($evento['nome_equipe']) ?></td>
                                    <td><?= htmlspecialchars($evento['total_gols']) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div class="alert alert-secondary text-center">Nenhum gol foi registrado para este campeonato.</div>
            <?php endif; ?>
        </div>
    </div>
</main>

<?php require_once '../includes/footer_dashboard.php'; ?>