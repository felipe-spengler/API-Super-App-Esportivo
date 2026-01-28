<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require_once '../sgce/includes/header.php';

// Check if the request is GET and id_esporte is provided
if ($_SERVER['REQUEST_METHOD'] !== 'GET' || !isset($_GET['id_esporte']) || !is_numeric($_GET['id_esporte'])) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Nenhum esporte especificado ou ID inválido.'];
    header("Location: index.php");
    exit();
}

$id_esporte = (int) $_GET['id_esporte'];

// Prepare and execute the query to fetch championships for the given sport
$stmt = $pdo->prepare("SELECT c.*, e.nome AS esporte_nome 
                       FROM campeonatos c 
                       JOIN esportes e ON c.id_esporte = e.id 
                       WHERE c.id_esporte = ? and c.id_campeonato_pai is null
                       ORDER BY c.status, c.data_inicio DESC");
$stmt->execute([$id_esporte]);
$campeonatos = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Fetch the sport name for the page title (optional, for better UX)
$stmt_sport = $pdo->prepare("SELECT nome FROM esportes WHERE id = ?");
$stmt_sport->execute([$id_esporte]);
$sport = $stmt_sport->fetch(PDO::FETCH_ASSOC);
$sport_name = $sport ? htmlspecialchars($sport['nome']) : 'Esporte Desconhecido';
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
        <h1 class="display-4 fw-bold">Competições de <?= $sport_name ?></h1>
        <p class="lead text-muted">Acompanhe os resultados e as próximas partidas.</p>
    </div>

    <div class="row">
        <?php if (empty($campeonatos)): ?>
            <p class="text-center text-muted">Nenhum campeonato encontrado para este esporte.</p>
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
                        <a href="menu_categoria.php?id_campeonato=<?= $camp['id'] ?>" class="btn btn-outline-primary w-100">Ver Detalhes</a>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</main>

<?php require_once '../sgce/includes/footer_dashboard.php'; ?>