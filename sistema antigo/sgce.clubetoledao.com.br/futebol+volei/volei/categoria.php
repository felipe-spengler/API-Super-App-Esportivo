<?php
require_once '../sgce/includes/db.php';


// Validate id_categoria from GET
$id_categoria = isset($_GET['id_categoria']) ? filter_var($_GET['id_categoria'], FILTER_VALIDATE_INT) : null;

// Prepare statement to prevent SQL injection
$stmt_campeonatos = $pdo->prepare("
    SELECT 
        c.*, 
        COUNT(ce.id_equipe) as total_inscritos,
        GROUP_CONCAT(ce.id_equipe) as equipes_inscritas_ids
    FROM campeonatos c 
    LEFT JOIN campeonatos_equipes ce ON c.id = ce.id_campeonato
    WHERE c.id = ?
    GROUP BY c.id
");
$stmt_campeonatos->execute([$id_categoria]);
$campeonatos = $stmt_campeonatos->fetchAll(PDO::FETCH_ASSOC);

// Check if championship exists
if (!$campeonatos) {
    echo "Campeonato não encontrado.";
    exit;
}

// Get first championship (since we're querying by ID)
$campeonato = $campeonatos[0];

require_once '../sgce/includes/header.php';
?>

<nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
    <div class="container">
        <a class="navbar-brand fw-bold" href="/sgce/index.php"><i class="fas fa-volleyball-ball me-2"></i>SGCE Vôlei</a>
        <div class="ms-auto">
            <a href="/sgce/login.php" class="btn btn-primary"><i class="fas fa-sign-in-alt me-2"></i>Acessar Painel</a>
        </div>
    </div>
</nav>

<main class="container py-5">
    <h3 class="text-center mb-4 text-uppercase"><?= htmlspecialchars($campeonato['nome']) ?></h3>
    <div class="row">

        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_classificacao.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" 
               class="card border-left-primary shadow h-100 py-2 text-decoration-none">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col">
                            <div class="text-xs fw-bold text-dark text-uppercase mb-1">Classificação</div>
                        </div>
                        <div class="col-auto"><i class="fas fa-list-ol fa-2x text-gray-300"></i></div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_pontuador.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" 
               class="card border-left-info shadow h-100 py-2 text-decoration-none">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col">
                            <div class="text-xs fw-bold text-darkblue text-uppercase mb-1">Jogador Pontuador</div>
                        </div>
                        <div class="col-auto"><i class="fas fa-bullseye fa-2x text-gray-300"></i></div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_bloqueador_volei.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" 
               class="card border-left-warning shadow h-100 py-2 text-decoration-none">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col">
                            <div class="text-xs fw-bold text-info text-uppercase mb-1">Jogador Bloqueador</div>
                        </div>
                        <div class="col-auto"><i class="fas fa-shield-alt fa-2x text-info"></i></div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_ace_volei.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" 
               class="card border-left-success shadow h-100 py-2 text-decoration-none">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col">
                            <div class="text-xs fw-bold text-primary text-uppercase mb-1">Jogador Acer</div>
                        </div>
                        <div class="col-auto"><i class="fas fa-volleyball-ball fa-2x text-primary"></i></div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_cartao_amarelo.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" 
               class="card border-left-warning shadow h-100 py-2 text-decoration-none">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col">
                            <div class="text-xs fw-bold text-warning text-uppercase mb-1">Cartão Amarelo</div>
                        </div>
                        <div class="col-auto"><i class="fas fa-square fa-2x text-warning"></i></div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_melhor_quadra.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" 
               class="card border-left-warning shadow h-100 py-2 text-decoration-none">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col">
                            <div class="text-xs fw-bold text-secondary text-uppercase mb-1">Melhor em Quadra</div>
                        </div>
                        <div class="col-auto"><i class="fas fa-crown fa-2x text-secondary"></i></div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_equipes_campeonato.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" 
               class="card border-left-primary shadow h-100 py-2 text-decoration-none">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col">
                            <div class="text-xs fw-bold text-primary text-uppercase mb-1">Equipes</div>
                        </div>
                        <div class="col-auto"><i class="fas fa-users fa-2x text-primary"></i></div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <a href="confronto.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" 
               class="card border-left-success shadow h-100 py-2 text-decoration-none">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col">
                            <div class="text-xs fw-bold text-success text-uppercase mb-1">Confrontos</div>
                        </div>
                        <div class="col-auto"><i class="fas fa-clipboard-list fa-2x text-success"></i></div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <a href="menu_gerar_arte_campeonato.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" 
               class="card border-left-info shadow h-100 py-2 text-decoration-none">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col">
                            <div class="text-xs fw-bold text-info text-uppercase mb-1">Gerar Arte</div>
                        </div>
                        <div class="col-auto"><i class="fas fa-id-badge fa-2x text-info"></i></div>
                    </div>
                </div>
            </a>
        </div>
    </div>
</main>

<?php require_once '../sgce/includes/footer.php'; ?>
