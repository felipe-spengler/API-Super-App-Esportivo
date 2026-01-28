<?php
require_once '../sgce/includes/db.php';

// Inicia a sessão para notificações
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Valida o ID do campeonato na URL
if (!isset($_GET['id_categoria']) || !is_numeric($_GET['id_categoria'])) {
    die("Campeonato não especificado.");
}

$id_categoria = $_GET['id_categoria'];

// Busca o nome do campeonato
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

// Busca as equipes associadas ao campeonato
$sql_equipes = "
    SELECT 
        e.id, e.nome, e.cidade, e.brasao,
        u.nome AS nome_lider,
        s.nome AS nome_esporte
    FROM equipes e
    JOIN usuarios u ON e.id_lider = u.id
    JOIN esportes s ON e.id_esporte = s.id
    JOIN campeonatos_equipes ce ON e.id = ce.id_equipe
    WHERE ce.id_campeonato = ?
    ORDER BY e.nome ASC
";
$stmt_equipes = $pdo->prepare($sql_equipes);
$stmt_equipes->execute([$id_categoria]);
$equipes = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);

// Busca todas as equipes disponíveis (não associadas ao campeonato) para o modal de adição
$sql_equipes_disponiveis = "
    SELECT e.id, e.nome
    FROM equipes e
    WHERE e.id NOT IN (
        SELECT ce.id_equipe 
        FROM campeonatos_equipes ce 
        WHERE ce.id_campeonato = ?
    )
    ORDER BY e.nome ASC
";
$stmt_equipes_disponiveis = $pdo->prepare($sql_equipes_disponiveis);
$stmt_equipes_disponiveis->execute([$id_categoria]);
$equipes_disponiveis = $stmt_equipes_disponiveis->fetchAll(PDO::FETCH_ASSOC);

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

    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 class="h2"><i class="fas fa-users fa-fw me-2"></i>Gerenciar Equipes do Campeonato</h1>
    </div>

    <div class="row g-3" id="equipes-container">
        <?php if (count($equipes) > 0): ?>
            <?php foreach ($equipes as $equipe): ?>
                <a href="relatorio_equipe_participantes.php?id=<?= htmlspecialchars($equipe['id']) ?>" class="col-md-6 col-lg-4 text-decoration-none">
                    <div class="card h-100 shadow-sm">
                        <div class="card-body d-flex justify-content-center align-items-center">
                            <div class="text-center" style="width: 100%;">
                                <img src="<?= $equipe['brasao'] ? './public/brasoes/' . htmlspecialchars($equipe['brasao']) : '../assets/img/brasao_default.png' ?>" 
                                    alt="Brasão de <?= htmlspecialchars($equipe['nome']) ?>" 
                                    class="img-fluid  mb-2" 
                                    style="width: 80px; height: 80px; object-fit: cover;">
                                <span class="fw-bold d-block">Equipe: <?= htmlspecialchars($equipe['nome']) ?></span>
                                <span class="fw-bold d-block">Líder Técnico: <?= htmlspecialchars($equipe['nome_lider']) ?></span>
                                <span class="fw-bold d-block">Esporte: <?= htmlspecialchars($equipe['nome_esporte']) ?></span>
                            </div>
                        </div>
                    </div>
                </a>
            <?php endforeach; ?>
        <?php else: ?>
            <div class="col-12">
                <div class="card shadow h-100 py-2">
                    <div class="card-body text-center">
                        <p class="text-muted">Nenhuma equipe associada a este campeonato.</p>
                    </div>
                </div>
            </div>
        <?php endif; ?>
    </div>

  

    <?php if (isset($_SESSION['notificacao'])): ?>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 4000,
                timerProgressBar: true,
                icon: '<?= htmlspecialchars($_SESSION['notificacao']['tipo']) ?>',
                title: '<?= addslashes($_SESSION['notificacao']['mensagem']) ?>'
            });
            <?php unset($_SESSION['notificacao']); ?>
        });
    </script>
    <?php endif; ?>

</main>

<?php require_once '../sgce/includes/footer.php'; // Footer público ?>