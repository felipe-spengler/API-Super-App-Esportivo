<?php
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php';

// Fetch all sports for the create championship modal
$esportes = $pdo->query("SELECT * FROM esportes ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);

// Fetch all teams for the team registration modal
$todas_as_equipes = $pdo->query("SELECT id, nome FROM equipes ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);

// Query to fetch championships and their enrolled participants
try {
    $stmt_campeonatos = $pdo->query("
        SELECT 
            c.*, 
            e.nome AS esporte_nome,
            COUNT(DISTINCT COALESCE(pa.id)) AS total_inscritos,
            GROUP_CONCAT(ce.id_equipe) AS equipes_inscritas_ids
        FROM campeonatos c
        JOIN esportes e ON c.id_esporte = e.id
        LEFT JOIN campeonatos_equipes ce ON c.id = ce.id_campeonato
        LEFT JOIN campeonatos categoria ON categoria.id_campeonato_pai = c.id
        LEFT JOIN partidas p ON p.id_campeonato = c.id OR p.id_campeonato = categoria.id
        LEFT JOIN participantes pa ON (pa.id_equipe = p.id_equipe_a || pa.id_equipe = p.id_equipe_b)
        WHERE c.id_campeonato_pai IS NULL
        GROUP BY c.id
        ORDER BY c.id DESC, c.data_criacao DESC
    ");
    $campeonatos = $stmt_campeonatos->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Erro na consulta de campeonatos: " . $e->getMessage());
}

// Group championships by parent (id_campeonato_pai IS NULL)
$campeonatos_pais = [];
$campeonatos_filhos = [];
foreach ($campeonatos as $camp) {
    if (is_null($camp['id_campeonato_pai'])) {
        $campeonatos_pais[$camp['id']] = $camp;
    } else {
        $campeonatos_filhos[$camp['id_campeonato_pai']][] = $camp;
    }
}

require_once '../includes/header.php';
require_once 'sidebar_equipe.php';
?>
<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="menu_campeonato_categoria_equipe.php">Equipes por Campeonatos</a></li>
    </ol>
</nav>
<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-trophy fa-fw me-2"></i>Equipes por Campeonatos</h1>
</div>

<div class="row">
    <?php if (count($campeonatos_pais) > 0): ?>
        <?php foreach ($campeonatos_pais as $pai): ?>
            <div class="col-xl-3 col-md-6 mt-4 mb-4 position-relative">
                <a href="menu_categoria_equipe.php?id_campeonato=<?= $pai['id'] ?>" style="text-decoration: none;">
                    <div class="card border-left-primary shadow h-100 py-2" data-bs-toggle="collapse" data-bs-target="#filhos-<?= $pai['id'] ?>">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs fw-bold text-primary text-uppercase mb-1">
                                        <?= htmlspecialchars($pai['nome']) ?>
                                    </div>
                                    <div class="h6 mb-1 text-gray-800">Início: <?= date('d/m/Y', strtotime($pai['data_inicio'])) ?></div>
                                    <div class="text-xs text-muted">Formato: <?= htmlspecialchars($pai['tipo_chaveamento']) ?></div>
                                    <div class="text-xs text-muted">Status: <span class="badge bg-primary rounded-pill"><?= htmlspecialchars($pai['status']) ?></span></div>
                                    <div class="text-xs text-muted">Inscritos: <span class="badge bg-secondary"><?= $pai['total_inscritos'] ?></span></div>
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
                    <p class="text-muted">Nenhum campeonato cadastrado.</p>
                </div>
            </div>
        </div>
    <?php endif; ?>
</div>

<?php
// Session-based notifications
if (session_status() === PHP_SESSION_NONE) { session_start(); }
if (isset($_SESSION['notificacao'])) {
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
    echo "<script>
        document.addEventListener('DOMContentLoaded', () => {
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false, timer: 3500, timerProgressBar: true,
                icon: '{$notificacao['tipo']}',
                title: `{$notificacao['mensagem']}`
            });
        });
    </script>";
}
?>

<?php require_once '../includes/footer_dashboard.php'; ?>