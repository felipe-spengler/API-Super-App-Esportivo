<?php
require_once 'includes/header.php';

// Fetch all sports from the esportes table
//$esportes = $pdo->query("SELECT * FROM esportes where  ORDER BY nome")->fetchAll();
$esportes = $pdo->query("SELECT * FROM esportes ORDER BY nome")->fetchAll();
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
        <h1 class="display-4 fw-bold">Esportes em Destaque</h1>
        <p class="lead text-muted">Explore os esportes disponíveis e suas competições.</p>
    </div>

    <div class="row">
        <?php if (empty($esportes)): ?>
            <p class="text-center text-muted">Nenhum esporte encontrado no momento.</p>
        <?php else: ?>
            <?php foreach ($esportes as $esporte): ?>
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card h-100">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title"><?= htmlspecialchars($esporte['nome']) ?></h5>
                        <p class="card-text small mt-auto">
                            <i class="fas fa-volleyball-ball me-2"></i>Esporte
                        </p>
                    </div>
                    <div class="card-footer">
                        <a href="menu_campeonatos.php?id_esporte=<?= $esporte['id'] ?>" class="btn btn-outline-primary w-100">Ver Detalhes</a>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</main>

<?php require_once 'includes/footer_dashboard.php'; ?>