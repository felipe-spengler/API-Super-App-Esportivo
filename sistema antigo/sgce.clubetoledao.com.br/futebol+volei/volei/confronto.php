<?php


require_once '../sgce/includes/db.php';

// Start session for notifications
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Initialize notification variable
$notificacao = null;


// Validate campeonato ID
if ($_SERVER['REQUEST_METHOD'] !== 'GET' || !isset($_GET['id_categoria'])) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Nenhum campeonato especificado.'];
    $id_campeonato = $_GET['id_categoria'];
    header("Location: categoria.php?id_categoria=" . urlencode($id_campeonato));
    exit();
}
$id_campeonato = $_GET['id_categoria'];

// Fetch campeonato details
$stmt_campeonato = $pdo->prepare("SELECT nome FROM campeonatos WHERE id = ?");
$stmt_campeonato->execute([$id_campeonato]);
$nome_campeonato = $stmt_campeonato->fetchColumn();

if ($nome_campeonato === false) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Campeonato não encontrado.'];
    header("Location: categoria.php?id_categoria=" . urlencode($id_campeonato));
    exit();
}

// Fetch teams with their badges
$stmt_equipes = $pdo->prepare("
    SELECT e.id, e.nome, e.brasao
    FROM equipes e 
    JOIN campeonatos_equipes ce ON e.id = ce.id_equipe 
    WHERE ce.id_campeonato = ? ORDER BY e.nome ASC
");
$stmt_equipes->execute([$id_campeonato]);
$todas_equipes_inscritas = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);

if (count($todas_equipes_inscritas) < 2) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'É necessário ter pelo menos 2 equipes inscritas.'];
    header("Location: categoria.php?id_categoria=" . urlencode($id_campeonato));
    exit();
}

// Fetch existing matches grouped by round
$stmt_partidas = $pdo->prepare("
    SELECT p.id, p.id_equipe_a, ea.nome as nome_a, ea.brasao as brasao_a,
           p.id_equipe_b, eb.nome as nome_b, eb.brasao as brasao_b,
           p.data_partida, p.local_partida, p.fase, p.rodada, p.status
    FROM partidas p
    JOIN equipes ea ON p.id_equipe_a = ea.id
    JOIN equipes eb ON p.id_equipe_b = eb.id
    WHERE p.id_campeonato = ?
    ORDER BY p.rodada ASC
");
$stmt_partidas->execute([$id_campeonato]);
$partidas_existentes = $stmt_partidas->fetchAll(PDO::FETCH_ASSOC);

// Group existing matches by round
$rodadas_existentes = [];
foreach ($partidas_existentes as $partida) {
    $rodada = $partida['rodada'] ?? '1ª Rodada';
    if (!isset($rodadas_existentes[$rodada])) {
        $rodadas_existentes[$rodada] = [];
    }
    $rodadas_existentes[$rodada][] = $partida;
}


// Handle notifications from session
if (isset($_SESSION['notificacao'])) {
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
}
// --- INÍCIO DA RENDERIZAÇÃO DO HTML ---
require_once '../sgce//includes/header.php';
?>

<style>
.nav-link {
    position: relative;
}
.btn-excluir-rodada {
    margin-left: 8px;
    padding: 2px 6px;
}
.card-status-agendada {
    background-color: #FFFFFF;
}
.card-status-em-andamento {
    background-color: #E6F3FA;
}
.card-status-finalizada {
    background-color: #E6F9E6;
}
.team-name {
    color: #000000 !important;
}
.status-text, .fase-text {
    font-size: 0.9rem;
    margin-top: 10px;
    text-align: center;
    width: 100%;
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

    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 class="h2"><i class="fas fa-sitemap fa-fw me-2"></i>Revisar Chaveamento</h1>
    </div>

    <div class="alert alert-info">
        <h4 class="alert-heading">Revise os Confrontos</h4>
        <p>Abaixo estão os confrontos propostos para o chaveamento. Você pode ver partidas.</p>
    </div>




    <div class="card mb-3">
        <div class="card-header">Legenda de Status</div>
        <div class="card-body">
            <div class="d-flex justify-content-around">
                <div><span class="badge" style="background-color: #FFFFFF; color: #000;">Agendada</span></div>
                <div><span class="badge" style="background-color: #E6F3FA; color: #000;">Em Andamento</span></div>
                <div><span class="badge" style="background-color: #E6F9E6; color: #000;">Finalizada</span></div>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
            <span>Confrontos Propostos para: <strong><?= htmlspecialchars($nome_campeonato) ?></strong></span>
            <div>
            </div>
        </div>
        <div class="card-body">
            <ul class="nav nav-tabs" id="rodadasTabs">
                <?php $rodadaCount = 0; ?>
                <?php foreach (array_keys($rodadas_existentes) as $rodada): ?>
                    <?php $rodadaCount++; ?>
                    <li class="nav-item">
                        <a class="nav-link <?= $rodadaCount === 1 ? 'active' : '' ?>" href="#rodada<?= $rodadaCount ?>" data-bs-toggle="tab">
                            <?= htmlspecialchars($rodada) ?>
                        </a>
                    </li>
                <?php endforeach; ?>
                <?php if ($rodadaCount === 0): ?>
                    <li class="nav-item">
                        <a class="nav-link active" href="#rodada1" data-bs-toggle="tab">1ª Rodada</a>
                    </li>
                <?php endif; ?>
            </ul>
            <form action="confronto.php" method="POST" id="formChaveamento">
                <input type="hidden" name="id_campeonato" value="<?= htmlspecialchars($id_campeonato) ?>">
                <div class="tab-content" id="rodadasContent">
                    <?php $tabIndex = 0; $global_index = 0; ?>
                            <div class="d-flex justify-content-center mb-3">
                                <a href="listar_etapas.php?id_categoria=<?= htmlspecialchars($id_campeonato) ?>&rodada=<?= htmlspecialchars($rodada) ?>" 
                                class="btn btn-primary btn-sm" 
                                style="text-decoration: none;">
                                    <i class="fas fa-cog me-2"></i>Listar Fases
                                </a>
                            </div>

                    <?php foreach ($rodadas_existentes as $rodada => $partidas): ?>
                        <?php $tabIndex++; ?>
                        <div class="tab-pane <?= $tabIndex === 1 ? 'active' : '' ?>" id="rodada<?= $tabIndex ?>">
                            <div class="row g-3 partidas-container" data-rodada="<?= htmlspecialchars($rodada) ?>">
                                <?php foreach ($partidas as $partida): ?>
                                    <div class="col-md-6 col-lg-4">
                                        <div class="card h-100 shadow-sm card-status-<?= strtolower(str_replace(' ', '-', $partida['status'])) ?>">
                                            <a href="menu_partida.php?id_partida=<?= htmlspecialchars($partida['id']) ?>" class="d-flex justify-content-around align-items-center text-decoration-none flex-column py-3">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][equipe_a]" value="<?= htmlspecialchars($partida['id_equipe_a'] ?? $partida['id_a']) ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][equipe_b]" value="<?= htmlspecialchars($partida['id_equipe_b'] ?? $partida['id_b']) ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][data_partida]" value="<?= htmlspecialchars($partida['data_partida']) ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][local_partida]" value="<?= htmlspecialchars($partida['local_partida']) ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][fase]" value="<?= htmlspecialchars($partida['fase']) ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][rodada]" value="<?= htmlspecialchars($rodada) ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][id]" value="<?= htmlspecialchars($partida['id'] ?? '') ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][status]" value="<?= htmlspecialchars($partida['status'] ?? 'Agendada') ?>">
                                                <div class="d-flex justify-content-around align-items-center w-100">
                                                    <div class="text-center" style="width: 120px;">
                                                        <img src="<?= $partida['brasao_a'] ? './public/brasoes/' . htmlspecialchars($partida['brasao_a']) : '../assets/img/brasao_default.png' ?>" 
                                                            alt="Brasão de <?= htmlspecialchars($partida['nome_a']) ?>" 
                                                            class="img-fluid mb-2" 
                                                            style="width: 60px; height: 60px; object-fit: cover;">
                                                        <span class="fw-bold d-block team-name"><?= htmlspecialchars($partida['nome_a']) ?></span>
                                                    </div>
                                                    <span class="mx-2 fs-5 text-muted">vs</span>
                                                    <div class="text-center" style="width: 120px;">
                                                        <img src="<?= $partida['brasao_b'] ? './public/brasoes/' . htmlspecialchars($partida['brasao_b']) : '../assets/img/brasao_default.png' ?>" 
                                                            alt="Brasão de <?= htmlspecialchars($partida['nome_b']) ?>"
                                                            class="img-fluid mb-2" 
                                                            style="width: 60px; height: 60px; object-fit: cover;">
                                                        <span class="fw-bold d-block team-name"><?= htmlspecialchars($partida['nome_b']) ?></span>
                                                    </div>
                                                </div>
                                                <div class="fase-text"><?= htmlspecialchars($partida['fase']) ?></div>
                                                <div class="status-text"><?= htmlspecialchars($partida['status'] ?? 'Agendada') ?></div>
                                            </a>
                                            
                                        </div>
                                    </div>
                                    <?php $global_index++; ?>
                                <?php endforeach; ?>
                                <?php if (empty($partidas) && $nao_par): ?>
                                    <p class="text-center text-muted" id="placeholder-partidas">Selecione a equipe com "bye" para gerar os confrontos.</p>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                    <?php if ($tabIndex === 0): ?>
                        <div class="tab-pane active" id="rodada1">
                            <div class="d-flex justify-content-center mb-3">
                                <a href="listar_etapas.php?id_categoria=<?= htmlspecialchars($id_campeonato) ?>&rodada=1ª Rodada" 
                                class="btn btn-primary btn-sm" 
                                style="text-decoration: none;">
                                    <i class="fas fa-cog me-2"></i>ver  Fases
                                </a>
                            </div>
                            <div class="row g-3 partidas-container" data-rodada="1ª Rodada">
                                <!-- Placeholder for no rounds -->
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
            </form>
        </div>
    </div>

    <?php if ($notificacao): ?>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 4000,
                timerProgressBar: true,
                icon: '<?= htmlspecialchars($notificacao['tipo']) ?>',
                title: '<?= addslashes($notificacao['mensagem']) ?>'
            });
        });
    </script>
    <?php endif; ?>

    <script>
    document.addEventListener('DOMContentLoaded', () => {


        const tabs = document.getElementsByClassName('nav-link');

        // Adiciona um listener para cada aba
        Array.from(tabs).forEach(tab => {
            tab.addEventListener('click', (event) => {
                // Remove a classe 'active' de todas as abas
                Array.from(tabs).forEach(t => t.classList.remove('active'));

                // Adiciona a classe 'active' à aba clicada
                event.currentTarget.classList.add('active');

                // Obtém o ID do painel correspondente à aba clicada
                const targetId = event.currentTarget.getAttribute('href').substring(1); // Remove o '#'

                // Seleciona todos os painéis de conteúdo
                const tabPanes = document.getElementsByClassName('tab-pane');

                // Esconde todos os painéis
                Array.from(tabPanes).forEach(pane => pane.classList.remove('active', 'show'));

                // Mostra o painel correspondente
                const targetPane = document.getElementById(targetId);
                if (targetPane) {
                    targetPane.classList.add('active', 'show');
                }
            });
        });
        

    });
    </script>
</main>
<?php require_once '../sgce/includes/footer_dashboard.php'; ?>