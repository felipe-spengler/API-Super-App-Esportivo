<?php
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php';


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

// Fetch all teams for the inscription dropdown
$stmt_equipes = $pdo->prepare("SELECT id, nome FROM equipes ORDER BY nome ASC");
$stmt_equipes->execute();
$todas_as_equipes = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);

// --- INÍCIO DA RENDERIZAÇÃO DO HTML ---
require_once '../includes/header.php';
require_once 'sidebar_equipe.php';
?>

<main class="container py-5">
    <div class="row">
        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_classificacao.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>"" style="text-decoration: none;" class="card border-left-primary shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs fw-bold text-dark text-uppercase mb-1">CLASSIFICAÇÃO</div>
                            <div class="h5 mb-0 fw-bold text-gray-800"></div>
                        </div>
                        <div class="col-auto"><i class="fas fa-list-ol fa-2x text-gray-300"></i></div>
                    </div>
                </div>
            </a>
        </div>



        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_gols.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-info shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs fw-bold text-darkblue text-uppercase mb-1">ARTILHARIA</div>
                            <div class="h5 mb-0 fw-bold text-gray-800"></div>
                        </div>
                        <div class="col-auto"><i class="fas fa-bullseye fa-2x text-gray-300"></i></div>
                    </div>
                </div>
            </a>
        </div>
    
        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_assistencia.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs fw-bold text-info text-uppercase mb-1">ASSISTÊNCIA</div>
                            <div class="h5 mb-0 fw-bold text-gray-800"></div>
                        </div>
                        <div class="col-auto"><i class="fas fa-hands-helping fa-2x text-info"></i></div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_cartao_vermelho.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs fw-bold text-danger text-uppercase mb-1">CARTÃO VERMELHO</div>
                            <div class="h5 mb-0 fw-bold text-gray-800"></div>
                        </div>
                        <div class="col-auto"><i class="fas fa-square fa-2x text-danger"></i></div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_cartao_amarelo.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs fw-bold text-warning text-uppercase mb-1">CARTÃO AMARELO</div>
                            <div class="h5 mb-0 fw-bold text-gray-800"></div>
                        </div>
                        <div class="col-auto"><i class="fas fa-square fa-2x text-warning"></i></div>
                    </div>
                </div>
            </a>
        </div>


        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_cartao_azul.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs fw-bold text-primary text-uppercase mb-1">CARTÃO AZUL</div>
                            <div class="h5 mb-0 fw-bold text-gray-800"></div>
                        </div>
                        <div class="col-auto"><i class="fas fa-square fa-2x text-primary"></i></div>
                    </div>
                </div>
            </a>
        </div>

        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_equipes_campeonato.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs fw-bold text-primary text-uppercase mb-1">GERENCIAR EQUIPE</div>
                            <div class="h5 mb-0 fw-bold text-gray-800"></div>
                        </div>
                        <div class="col-auto"><i class="fas fa-users fa-2x text-primary"></i></div>
                    </div>
                </div>
            </a>
        </div>


        
        <div class="col-xl-3 col-md-6 mb-4">
            <a href="relatorio_melhor_em_campo.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs fw-bold text-secundary text-uppercase mb-1">Melhor em Campo</div>
                            <div class="h5 mb-0 fw-bold text-gray-800"></div>
                        </div>
                        <div class="col-auto"><i class="fas fa-crown fa-2x text-secundary"></i></div>
                    </div>
                </div>
            </a>
        </div>
        

       
        <div class="col-xl-3 col-md-6 mb-4">
                <a href="confronto.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs fw-bold text-success text-uppercase mb-1"> Confronto</div>
                                <div class="h5 mb-0 fw-bold text-gray-800"></div>
                            </div>
                            <div class="col-auto"><i class="fas fa-clipboard-list fa-2x text-success"></i></div>
                        </div>
                    </div>
                </a>
            </div>
            


            
            <div class="col-xl-3 col-md-6 mb-4">
                <a href="menu_gerar_arte_campeonato.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs fw-bold text-success text-uppercase mb-1">Gerar Arte</div>
                                <div class="h5 mb-0 fw-bold text-gray-800"></div>
                            </div>
                            <div class="col-auto"><i class="fas fa-id-badge fa-2x text-success"></i></div>
                        </div>
                    </div>
                </a>
            </div>
        </div>
    </div>
</main>

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