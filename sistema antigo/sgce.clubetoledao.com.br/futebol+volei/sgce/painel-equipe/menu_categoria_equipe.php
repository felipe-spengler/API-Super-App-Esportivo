<?php
// Enable error reporting for debugging (remove in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php';

// Validate id_campeonato from GET
$id_campeonato = filter_var($_GET['id_campeonato'] ?? null, FILTER_VALIDATE_INT);
if (!$id_campeonato) {
    header('Location: menu_campeonato_categoria_equipe.php');
    exit;
}

try { 
    $stmt_pai = $pdo->prepare("SELECT nome FROM campeonatos WHERE id = ?");
    $stmt_pai->execute([$id_campeonato]);
    $campeonato_pai = $stmt_pai->fetch(PDO::FETCH_ASSOC);
    if (!$campeonato_pai) {
        header('Location: gerenciar_campeonatos.php');
        exit;
    }
    $nome_campeonato_pai = $campeonato_pai['nome'];
    // Fetch all sports for the create championship modal
    $esportes = $pdo->query("SELECT * FROM esportes ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);

    // Fetch all teams for the team registration modal
    $todas_as_equipes = $pdo->query("SELECT id, nome FROM equipes ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);

    // Query to fetch categories and their enrolled participants
    $stmt_campeonatos = $pdo->prepare("
        SELECT 
            c.*, 
            e.nome AS esporte_nome,
            COUNT(DISTINCT COALESCE(pa.id, pb.id)) AS total_inscritos,
            GROUP_CONCAT(ce.id_equipe) AS equipes_inscritas_ids
        FROM campeonatos c 
        JOIN esportes e ON c.id_esporte = e.id 
        LEFT JOIN campeonatos_equipes ce ON c.id = ce.id_campeonato
        LEFT JOIN partidas p ON p.id_campeonato = c.id
        LEFT JOIN participantes pa ON pa.id_equipe = p.id_equipe_a
        LEFT JOIN participantes pb ON pb.id_equipe = p.id_equipe_b
        WHERE c.id_campeonato_pai = ?
        GROUP BY c.id 
        ORDER BY c.id, c.data_criacao DESC
    ");
    $stmt_campeonatos->execute([$id_campeonato]);
    $categorias = $stmt_campeonatos->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    // Log error to file (configure log path in php.ini or specify here)
    error_log("Database Error: " . $e->getMessage());
    die("A database error occurred. Please contact the administrator.");
}

require_once '../includes/header.php';
require_once 'sidebar_equipe.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="menu_campeonato_categoria_equipe.php?id_campeonato=<?php echo $id_campeonato;?>">Equipes por Campeonatos <?php echo htmlspecialchars($nome_campeonato_pai); ?></a></li>
        <li class="breadcrumb-item active" aria-current="page">Equipes por Campeonato/Categoria </li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-trophy fa-fw me-2"></i>Equipes por Campeonato/Categoria</h1>
</div>

<div class="row">
    <?php if (count($categorias) > 0): ?>
        <?php foreach ($categorias as $categoria): ?>
            <div class="col-xl-3 col-md-6 mt-4 mb-4">
                <a href="gerenciar_equipe.php?id_categoria=<?= htmlspecialchars($categoria['id']); ?>" style="text-decoration: none;">
                    <div class="card border-left-primary shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs fw-bold text-primary text-uppercase mb-1">
                                        <?= htmlspecialchars($categoria['nome']); ?>
                                    </div>
                                    <div class="h6 mb-1 text-gray-800">Início: <?= htmlspecialchars(date('d/m/Y', strtotime($categoria['data_inicio']))); ?></div>
                                    <div class="text-xs text-muted">Formato: <?= htmlspecialchars($categoria['tipo_chaveamento']); ?></div>
                                    <div class="text-xs text-muted">Status: <span class="badge bg-primary rounded-pill"><?= htmlspecialchars($categoria['status']); ?></span></div>
                                    <div class="text-xs text-muted">Inscritos: <span class="badge bg-secondary"><?= htmlspecialchars($categoria['total_inscritos']); ?></span></div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-trophy fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </a>
            </div>
        <?php endforeach; ?>
    <?php else: ?>
        <div class="col-12">
            <div class="card shadow h-100 py-2">
                <div class="card-body text-center">
                    <p class="text-muted">Nenhuma categoria cadastrada.</p>
                </div>
            </div>
        </div>
    <?php endif; ?>
</div>

<?php require_once '../includes/footer_dashboard.php'; ?>