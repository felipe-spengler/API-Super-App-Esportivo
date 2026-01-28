<?php
require_once 'includes/header.php';

// Check if the request is GET and id_campeonato is provided
if ($_SERVER['REQUEST_METHOD'] !== 'GET' || !isset($_GET['id_campeonato']) || !is_numeric($_GET['id_campeonato'])) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Nenhum campeonato especificado ou ID inválido.'];
    header("Location: index.php");
    exit();
}

$id_campeonato = (int) $_GET['id_campeonato'];

// Fetch the parent championship details and its sport name
$stmt_parent = $pdo->prepare("
    SELECT c.nome AS pai_nome, e.nome AS esporte_nome
    FROM campeonatos c
    JOIN esportes e ON c.id_esporte = e.id
    WHERE c.id = ?
");
$stmt_parent->execute([$id_campeonato]);
$parent = $stmt_parent->fetch(PDO::FETCH_ASSOC);

if (!$parent) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Campeonato não encontrado.'];
    header("Location: index.php");
    exit();
}

$pai_nome = htmlspecialchars($parent['pai_nome']);
$sport_name = htmlspecialchars($parent['esporte_nome']);

// Fetch child championships for the given parent championship
$stmt = $pdo->prepare("
    SELECT c.*, e.nome AS esporte_nome
    FROM campeonatos c
    JOIN esportes e ON c.id_esporte = e.id
    LEFT JOIN campeonatos pai ON c.id_campeonato_pai = pai.id
    WHERE c.id_campeonato_pai = ?
    ORDER BY c.status, c.data_inicio DESC
");
$stmt->execute([$id_campeonato]);
$campeonatos = $stmt->fetchAll(PDO::FETCH_ASSOC);
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
    <div class="text-center mb-5">
        <h1 class="display-4 fw-bold">Categorias de <?= $sport_name ?> - Campeonato <?= $pai_nome ?></h1>
        <p class="lead text-muted">Acompanhe os resultados e as próximas partidas.</p>
    </div>

    <div class="row">
        <?php if (empty($campeonatos)): ?>
            <p class="text-center text-muted">Nenhuma categoria encontrada para este campeonato.</p>
        <?php else: ?>
            <?php foreach ($campeonatos as $camp): ?>
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card h-100">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title"><?= htmlspecialchars($camp['nome']) ?></h5>
                        <h6 class="card-subtitle mb-2 text-muted"><?= htmlspecialchars($camp['esporte_nome']) ?></h6>
                        <span class="badge bg-primary align-self-start mb-3"><?= htmlspecialchars($camp['status']) ?></span>
                        <p class="card-text small mt-auto">
                            <i class="fas fa-calendar-day me-2"></i>Início em: <?= date('d/m/Y', strtotime($camp['data_inicio'])) ?>
                        </p>
                    </div>
                    <div class="card-footer">
                        <a href="categoria.php?id_categoria=<?= $camp['id'] ?>" class="btn btn-outline-primary w-100">Ver Detalhes</a>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</main>

<?php require_once 'includes/footer_dashboard.php'; ?>