<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// Start session for notifications
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Initialize notification variable
$notificacao = null;

// Handle Ajax requests
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['action'])) {
    header('Content-Type: application/json');
    $data = json_decode(file_get_contents('php://input'), true);

    // Action for saving multiple matches
    if ($_GET['action'] === 'salvar_partidas') {
        $id_campeonato = $data['id_campeonato'];
        $partidas = $data['partidas'];
        try {
            $pdo->beginTransaction();

            $stmt = $pdo->prepare("
                INSERT INTO partidas (id_campeonato, id_equipe_a, id_equipe_b, data_partida, local_partida, fase, rodada, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Agendada')
            ");
            $stmt_check = $pdo->prepare("
                SELECT COUNT(*)
                FROM partidas
                WHERE id_campeonato = ?
                AND id_equipe_a = ?
                AND id_equipe_b = ?
                AND rodada = ?
                AND fase = ?
            ");
            foreach ($partidas as $partida) {
                $id_equipe_a = $partida['equipe_a'];
                $id_equipe_b = $partida['equipe_b'];
                $data_partida = $partida['data_partida'] ?? '';
                $local_partida = $partida['local_partida'] ?? '';
                $fase = $partida['fase'] ?? 'Chaveamento';
                $rodada = $partida['rodada'] ?? $_GET['rodada'] ?? '1ª Rodada';

                // Validate teams are different
                if ($id_equipe_a === $id_equipe_b) {
                    $pdo->rollBack();
                    echo json_encode(['success' => false, 'message' => 'As equipes A e B não podem ser iguais na partida.']);
                    exit;
                }

                // Check for existing match with same teams, round, and phase
                $stmt_check->execute([$id_campeonato, $id_equipe_a, $id_equipe_b, $rodada, $fase]);
                $count = $stmt_check->fetchColumn();

                // If no match exists, insert the new match
                if ($count == 0) {
                    $stmt->execute([$id_campeonato, $id_equipe_a, $id_equipe_b, $data_partida, $local_partida, $fase, $rodada]);
                }
            }
            $pdo->commit();
            echo json_encode(['success' => true]);
            exit;
        } catch (PDOException $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            exit;
        }
        exit;
    }

    // Action for deleting a match
    if ($_GET['action'] === 'excluir_partida') {
        $id_partida = $data['id_partida'];
        try {
            $pdo->beginTransaction();
            // Delete related records from sumulas_periodos
            $stmt_delete_sumulas = $pdo->prepare("DELETE FROM sumulas_periodos WHERE id_partida = ?");
            $stmt_delete_sumulas->execute([$id_partida]);
            // Delete the specific match
            $stmt_delete = $pdo->prepare("DELETE FROM partidas WHERE id = ?");
            $stmt_delete->execute([$id_partida]);
            $pdo->commit();
            echo json_encode(['success' => true]);
            exit;
        } catch (PDOException $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            exit;
        }
        exit;
    }

    // Action for deleting a phase
    if ($_GET['action'] === 'excluir_fase') {
        $id_campeonato = $data['id_campeonato'];
        $fase_excluida = $data['fase_excluida'];
        $rodada = $data['rodada'];
        try {
            $pdo->beginTransaction();
            $stmt_delete_sumulas = $pdo->prepare("DELETE FROM sumulas_periodos WHERE id_partida IN (SELECT id FROM partidas WHERE id_campeonato = ? AND fase = ? AND rodada = ?)");
            $stmt_delete_sumulas->execute([$id_campeonato, $fase_excluida, $rodada]);
            $stmt_delete = $pdo->prepare("DELETE FROM partidas WHERE id_campeonato = ? AND fase = ? AND rodada = ?");
            $stmt_delete->execute([$id_campeonato, $fase_excluida, $rodada]);
            $pdo->commit();
            echo json_encode(['success' => true]);
            exit;
        } catch (PDOException $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            exit;
        }
        exit;
    }

    // Action for updating phase name
    if ($_GET['action'] === 'editar_fase') {
        $id_campeonato = $data['id_campeonato'];
        $fase_antiga = $data['fase_antiga'];
        $fase_nova = $data['fase_nova'];
        $rodada = $data['rodada'];
        try {
            $pdo->beginTransaction();
            $stmt_check = $pdo->prepare("
                SELECT COUNT(*)
                FROM partidas
                WHERE id_campeonato = ? AND fase = ? AND rodada = ?
            ");
            $stmt_check->execute([$id_campeonato, $fase_nova, $rodada]);
            $count = $stmt_check->fetchColumn();
            if ($count > 0) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => 'Já existe uma fase com este nome na rodada especificada.']);
                exit;
            }
            $stmt_update = $pdo->prepare("UPDATE partidas SET fase = ? WHERE id_campeonato = ? AND fase = ? AND rodada = ?");
            $stmt_update->execute([$fase_nova, $id_campeonato, $fase_antiga, $rodada]);
            $pdo->commit();
            echo json_encode(['success' => true]);
            exit;
        } catch (PDOException $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            exit;
        }
        exit;
    }
    exit;
}

// Validate campeonato ID and rodada
if ($_SERVER['REQUEST_METHOD'] !== 'GET' || !isset($_GET['id_categoria']) || !isset($_GET['rodada'])) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Parâmetros inválidos.'];
    header("Location: categoria.php?id_categoria=" . urlencode($_GET['id_categoria'] ?? ''));
    exit();
}

$id_campeonato = $_GET['id_categoria'];
$rodada = urldecode($_GET['rodada']);

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

// Fetch existing matches grouped by phase
$stmt_partidas = $pdo->prepare("
    SELECT p.id, p.id_equipe_a, ea.nome as nome_a, ea.brasao as brasao_a,
           p.id_equipe_b, eb.nome as nome_b, eb.brasao as brasao_b,
           p.data_partida, p.local_partida, p.fase, p.rodada, p.status
    FROM partidas p
    JOIN equipes ea ON p.id_equipe_a = ea.id
    JOIN equipes eb ON p.id_equipe_b = eb.id
    WHERE p.id_campeonato = ? AND p.rodada = ?
    ORDER BY p.fase ASC
");
$stmt_partidas->execute([$id_campeonato, $rodada]);
$partidas_existentes = $stmt_partidas->fetchAll(PDO::FETCH_ASSOC);

// Group existing matches by phase
$fases_existentes = [];
foreach ($partidas_existentes as $partida) {
    $fase = $partida['fase'] ?? 'Chaveamento';
    if (!isset($fases_existentes[$fase])) {
        $fases_existentes[$fase] = [];
    }
    $fases_existentes[$fase][] = $partida;
}

// If no existing matches, generate proposed ones
$nao_par = (count($todas_equipes_inscritas) % 2 != 0);
if (empty($fases_existentes)) {
    $partidas_propostas = [];
    $equipes_para_jogar = $todas_equipes_inscritas;
    if (!$nao_par) {
        shuffle($equipes_para_jogar);
        for ($i = 0; $i < count($equipes_para_jogar); $i += 2) {
            $partidas_propostas[] = [
                'id_a' => $equipes_para_jogar[$i]['id'],
                'nome_a' => $equipes_para_jogar[$i]['nome'],
                'brasao_a' => $equipes_para_jogar[$i]['brasao'],
                'id_b' => $equipes_para_jogar[$i + 1]['id'],
                'nome_b' => $equipes_para_jogar[$i + 1]['nome'],
                'brasao_b' => $equipes_para_jogar[$i + 1]['brasao'],
                'data_partida' => '',
                'local_partida' => '',
                'fase' => 'Chaveamento',
                'rodada' => $rodada,
                'status' => 'Agendada'
            ];
        }
        $fases_existentes['Chaveamento'] = $partidas_propostas;
    }
}

// Sort phases
ksort($fases_existentes, SORT_NATURAL);

// Handle notifications from session
if (isset($_SESSION['notificacao'])) {
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
}

require_once '../includes/header.php';
require_once 'sidebar.php';
?>
<style>
    .nav-link {
        position: relative;
    }
    .btn-excluir-fase, .btn-editar-fase {
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

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonatos</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos_categoria.php?id_campeonato=<?= htmlspecialchars($id_campeonato) ?>">Gerenciar Campeonatos</a></li>
        <li class="breadcrumb-item"><a href="categoria.php?id_categoria=<?= htmlspecialchars($id_campeonato) ?>">Categoria</a></li>
        <li class="breadcrumb-item active" aria-current="page">Revisar Chaveamento</li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-sitemap fa-fw me-2"></i>Revisar Chaveamento - <?= htmlspecialchars($rodada) ?></h1>
</div>

<div class="alert alert-info">
    <h4 class="alert-heading">Revise os Confrontos</h4>
    <p>Abaixo estão os confrontos propostos para o chaveamento da rodada <strong><?= htmlspecialchars($rodada) ?></strong>. Você pode editar, excluir ou adicionar novas partidas.</p>
</div>

<?php if ($nao_par): ?>
    <div class="card mb-4 border-success">
        <div class="card-header bg-success text-white">
            <i class="fas fa-star me-2"></i>Avanço Direto (Bye)
        </div>
        <div class="card-body">
            <p>Há um número ímpar de equipes. Selecione qual equipe deve avançar para a próxima fase sem jogar nesta rodada.</p>
            <label for="equipe_com_bye" class="form-label fw-bold">Equipe a avançar:</label>
            <select name="equipe_com_bye" id="equipe_com_bye" class="form-select" required>
                <option value="">Selecione uma equipe...</option>
                <?php foreach ($todas_equipes_inscritas as $equipe): ?>
                    <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                <?php endforeach; ?>
            </select>
        </div>
    </div>
<?php endif; ?>

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
        <span>Confrontos Propostos para: <strong><?= htmlspecialchars($nome_campeonato) ?> - <?= htmlspecialchars($rodada) ?></strong></span>
        <div>
            <button type="button" class="btn btn-success btn-sm me-2" id="btnAdicionarFase">
                <i class="fas fa-plus me-2"></i>Adicionar Fase
            </button>
            <button type="button" class="btn btn-success btn-sm" id="btnAdicionarPartida">
                <i class="fas fa-plus me-2"></i>Adicionar Novo Confronto
            </button>
        </div>
    </div>
    <div class="card-body">
        <ul class="nav nav-tabs" id="fasesTabs">
            <?php $faseCount = 0; ?>
            <?php foreach (array_keys($fases_existentes) as $fase): ?>
                <?php $faseCount++; ?>
                <li class="nav-item">
                    <a class="nav-link <?= $faseCount === 1 ? 'active' : '' ?>" href="#fase<?= $faseCount ?>" data-bs-toggle="tab">
                        <?= htmlspecialchars($fase) ?>
                        <?php if ($faseCount > 1): ?>
                            <button type="button" class="btn btn-sm btn-editar-fase" title="Editar Nome da Fase" data-fase="<?= htmlspecialchars($fase) ?>">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-excluir-fase" title="Excluir Fase" data-fase="<?= htmlspecialchars($fase) ?>">
                                <i class="fas fa-times"></i>
                            </button>
                        <?php endif; ?>
                    </a>
                </li>
            <?php endforeach; ?>
            <?php if ($faseCount === 0): ?>
                <li class="nav-item">
                    <a class="nav-link active" href="#fase1" data-bs-toggle="tab">Chaveamento</a>
                </li>
            <?php endif; ?>
        </ul>
        <form action="gerenciar_etapas.php?id_categoria=<?= htmlspecialchars($id_campeonato) ?>&rodada=<?= urlencode($rodada) ?>" method="POST" id="formChaveamento">
            <input type="hidden" name="id_campeonato" value="<?= htmlspecialchars($id_campeonato) ?>">
            <input type="hidden" name="rodada" value="<?= htmlspecialchars($rodada) ?>">
            <div class="tab-content" id="fasesContent">
                <?php
                $tabIndex = 0;
                $global_index = 0;
                ?>
                <?php foreach ($fases_existentes as $fase => $partidas): ?>
                    <?php $tabIndex++; ?>
                    <div class="tab-pane <?= $tabIndex === 1 ? 'active' : '' ?>" id="fase<?= $tabIndex ?>">
                        <h3 class="mt-3"><?= htmlspecialchars($rodada) ?></h3>
                        <div class="row g-3 partidas-container" data-fase="<?= htmlspecialchars($fase) ?>">
                            <?php foreach ($partidas as $partida): ?>
                                <div class="col-md-6 col-lg-4">
                                    <div class="card h-100 shadow-sm card-status-<?= strtolower(str_replace(' ', '-', $partida['status'])) ?>">
                                        <?php if (!empty($partida['id'])): ?>
                                            <a href="menu_partida.php?id_partida=<?= $partida['id'] ?>" class="d-flex justify-content-around align-items-center text-decoration-none flex-column py-3">
                                            <?php else: ?>
                                                <div class="d-flex justify-content-around align-items-center text-decoration-none flex-column py-3 opacity-75">
                                                <?php endif; ?>
                                                <input type="hidden" name="partidas[<?= $global_index ?>][equipe_a]" value="<?= htmlspecialchars($partida['id_equipe_a'] ?? $partida['id_a']) ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][equipe_b]" value="<?= htmlspecialchars($partida['id_equipe_b'] ?? $partida['id_b']) ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][data_partida]" value="<?= htmlspecialchars($partida['data_partida']) ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][local_partida]" value="<?= htmlspecialchars($partida['local_partida']) ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][fase]" value="<?= htmlspecialchars($fase) ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][rodada]" value="<?= htmlspecialchars($rodada) ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][id]" value="<?= htmlspecialchars($partida['id'] ?? '') ?>">
                                                <input type="hidden" name="partidas[<?= $global_index ?>][status]" value="<?= htmlspecialchars($partida['status'] ?? 'Agendada') ?>">
                                                <div class="d-flex justify-content-around align-items-center w-100">
                                                    <div class="text-center" style="width: 120px;">
                                                        <img src="<?= $partida['brasao_a'] ? '../public/brasoes/' . htmlspecialchars($partida['brasao_a']) : '../assets/img/brasao_default.png' ?>"
                                                             alt="Brasão de <?= htmlspecialchars($partida['nome_a']) ?>"
                                                             class="img-fluid mb-2"
                                                             style="width: 60px; height: 60px; object-fit: cover;">
                                                        <span class="fw-bold d-block team-name"><?= htmlspecialchars($partida['nome_a']) ?></span>
                                                    </div>
                                                    <span class="mx-2 fs-5 text-muted">vs</span>
                                                    <div class="text-center" style="width: 120px;">
                                                        <img src="<?= $partida['brasao_b'] ? '../public/brasoes/' . htmlspecialchars($partida['brasao_b']) : '../assets/img/brasao_default.png' ?>"
                                                             alt="Brasão de <?= htmlspecialchars($partida['nome_b']) ?>"
                                                             class="img-fluid mb-2"
                                                             style="width: 60px; height: 60px; object-fit: cover;">
                                                        <span class="fw-bold d-block team-name"><?= htmlspecialchars($partida['nome_b']) ?></span>
                                                    </div>
                                                </div>
                                                <div class="fase-text"><?= htmlspecialchars($partida['fase']) ?></div>
                                                <div class="status-text"><?= htmlspecialchars($partida['status'] ?? 'Agendada') ?></div>
                                                <?php if (!empty($partida['id'])): ?>
                                            </a>
                                        <?php else: ?>
                                        </div>
                                    <?php endif; ?>
                                    <div class="card-footer d-flex justify-content-center">
                                        <button type="button" class="btn btn-sm btn-editar-partida position-absolute top-0 end-0 me-4 px-0"
                                                data-partida='<?=
                                                json_encode([
                                                    'id' => $partida['id'] ?? '',
                                                    'id_a' => $partida['id_equipe_a'] ?? $partida['id_a'],
                                                    'nome_a' => $partida['nome_a'],
                                                    'brasao_a' => $partida['brasao_a'],
                                                    'id_b' => $partida['id_equipe_b'] ?? $partida['id_b'],
                                                    'nome_b' => $partida['nome_b'],
                                                    'brasao_b' => $partida['brasao_b'],
                                                    'data_partida' => $partida['data_partida'],
                                                    'local_partida' => $partida['local_partida'],
                                                    'fase' => $fase,
                                                    'rodada' => $rodada,
                                                    'status' => $partida['status'] ?? 'Agendada'
                                                ])
                                                ?>'
                                                title="Editar Confronto">
                                            <i class="fas fa-pen"></i>
                                        </button>
                                        <button type="button" class="btn btn-sm btn-excluir-partida position-absolute top-0 end-0 me-0 px-0"
                                                data-id-partida="<?= htmlspecialchars($partida['id'] ?? '') ?>"
                                                data-client-index="<?= $global_index ?>"
                                                data-nome-partida="<?= htmlspecialchars($partida['nome_a'] . ' vs ' . $partida['nome_b']) ?>"
                                                title="Excluir Confronto">
                                            <i class="fas fa-times"></i>
                                        </button>
                                    </div>
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
                <div class="tab-pane active" id="fase1">
                    <h3 class="mt-3"><?= htmlspecialchars($rodada) ?></h3>
                    <div class="row g-3 partidas-container" data-fase="Chaveamento">
                        <!-- Placeholder for no phases -->
                    </div>
                </div>
            <?php endif; ?>
    </div>
    <div class="d-flex justify-content-end mt-4">
        <a href="categoria.php?id_categoria=<?= htmlspecialchars($id_campeonato) ?>" class="btn btn-secondary me-2">Cancelar</a>
        <button type="button" class="btn btn-success" id="btnConfirmarPartidas"><i class="fas fa-check-circle me-2"></i>Confirmar e Gerar Partidas</button>
    </div>
</form>
</div>
</div>

<!-- Edit Match Modal -->
<div class="modal fade" id="modalPartida" tabindex="-1" aria-labelledby="modalPartidaLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalPartidaLabel">Editar Confronto</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formPartida">
                    <input type="hidden" name="index" id="partida_index">
                    <input type="hidden" name="id_campeonato" value="<?= htmlspecialchars($id_campeonato) ?>">
                    <input type="hidden" name="rodada" value="<?= htmlspecialchars($rodada) ?>">
                    <div class="mb-3">
                        <label for="equipe_a" class="form-label">Equipe A</label>
                        <select class="form-control" id="equipe_a" name="equipe_a" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($todas_equipes_inscritas as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="equipe_b" class="form-label">Equipe B</label>
                        <select class="form-control" id="equipe_b" name="equipe_b" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($todas_equipes_inscritas as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary btn-editar-partida" id="btnSalvarPartida">Salvar Alterações</button>
            </div>
        </div>
    </div>
</div>

<!-- Add Match Modal -->
<div class="modal fade" id="modalAdicionarPartida" tabindex="-1" aria-labelledby="modalAdicionarPartidaLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalAdicionarPartidaLabel">Adicionar Novo Confronto</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formAdicionarPartida">
                    <div class="mb-3">
                        <label for="add_equipe_a" class="form-label">Equipe A</label>
                        <select class="form-control" id="add_equipe_a" name="equipe_a" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($todas_equipes_inscritas as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="add_equipe_b" class="form-label">Equipe B</label>
                        <select class="form-control" id="add_equipe_b" name="equipe_b" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($todas_equipes_inscritas as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" id="btnSalvarNovaPartida">Adicionar</button>
            </div>
        </div>
    </div>
</div>

<!-- Add Phase Modal -->
<div class="modal fade" id="modalAdicionarFase" tabindex="-1" aria-labelledby="modalAdicionarFaseLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalAdicionarFaseLabel">Adicionar Nova Fase</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formAdicionarFase">
                    <div class="mb-3">
                        <label for="nome_fase" class="form-label">Nome da Fase</label>
                        <input type="text" class="form-control" id="nome_fase" name="nome_fase" required placeholder="Digite o nome da fase">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" id="btnSalvarNovaFase">Adicionar</button>
            </div>
        </div>
    </div>
</div>

<!-- Edit Phase Modal -->
<div class="modal fade" id="modalEditarFase" tabindex="-1" aria-labelledby="modalEditarFaseLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalEditarFaseLabel">Editar Nome da Fase</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formEditarFase">
                    <input type="hidden" id="fase_antiga" name="fase_antiga">
                    <div class="mb-3">
                        <label for="nome_fase_edit" class="form-label">Nome da Fase</label>
                        <input type="text" class="form-control" id="nome_fase_edit" name="nome_fase_edit" required placeholder="Digite o novo nome da fase">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" id="btnSalvarEditarFase">Salvar</button>
            </div>
        </div>
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
        // Edit Match Modal
        const modalEditEl = document.getElementById('modalPartida');
        const modalEdit = new bootstrap.Modal(modalEditEl);
        const modalEditLabel = document.getElementById('modalPartidaLabel');
        const btnSalvarEdit = document.getElementById('btnSalvarPartida');
        const formEdit = document.getElementById('formPartida');
        const selectEquipeA = document.getElementById('equipe_a');
        const selectEquipeB = document.getElementById('equipe_b');

        // Add Match Modal
        const modalAddEl = document.getElementById('modalAdicionarPartida');
        const modalAdd = new bootstrap.Modal(modalAddEl);
        const modalAddLabel = document.getElementById('modalAdicionarPartidaLabel');
        const btnSalvarAdd = document.getElementById('btnSalvarNovaPartida');
        const formAdd = document.getElementById('formAdicionarPartida');
        const selectAddEquipeA = document.getElementById('add_equipe_a');
        const selectAddEquipeB = document.getElementById('add_equipe_b');

        // Add Phase Modal
        const modalAddFaseEl = document.getElementById('modalAdicionarFase');
        const modalAddFase = new bootstrap.Modal(modalAddFaseEl);
        const modalAddFaseLabel = document.getElementById('modalAdicionarFaseLabel');
        const btnSalvarNovaFase = document.getElementById('btnSalvarNovaFase');
        const formAddFase = document.getElementById('formAdicionarFase');
        const inputNomeFase = document.getElementById('nome_fase');

        // Edit Phase Modal
        const modalEditFaseEl = document.getElementById('modalEditarFase');
        const modalEditFase = new bootstrap.Modal(modalEditFaseEl);
        const modalEditFaseLabel = document.getElementById('modalEditarFaseLabel');
        const btnSalvarEditarFase = document.getElementById('btnSalvarEditarFase');
        const formEditFase = document.getElementById('formEditarFase');
        const inputFaseAntiga = document.getElementById('fase_antiga');
        const inputNomeFaseEdit = document.getElementById('nome_fase_edit');

        const formChaveamento = document.getElementById('formChaveamento');
        const fasesTabs = document.getElementById('fasesTabs');
        const fasesContent = document.getElementById('fasesContent');
        const selectBye = document.getElementById('equipe_com_bye');
        const placeholderPartidas = document.getElementById('placeholder-partidas');
        let faseCount = fasesTabs.querySelectorAll('.nav-item').length;

        // Team data for badge lookup
        const equipes = <?= json_encode(array_column($todas_equipes_inscritas, null, 'id')) ?>;
        const rodada = '<?= htmlspecialchars($rodada) ?>';

        // Function to update dropdown options to prevent same team selection
        const updateDropdownOptions = (selectA, selectB) => {
            const equipeAValue = selectA.value;
            const equipeBValue = selectB.value;
            Array.from(selectB.options).forEach(option => {
                option.disabled = option.value === equipeAValue && option.value !== '';
            });
            Array.from(selectA.options).forEach(option => {
                option.disabled = option.value === equipeBValue && option.value !== '';
            });
        };

        // Reset Edit Match Form
        const resetEditForm = () => {
            formEdit.reset();
            document.getElementById('partida_index').value = '';
            selectEquipeA.value = '';
            selectEquipeB.value = '';
            updateDropdownOptions(selectEquipeA, selectEquipeB);
        };

        // Reset Add Match Form
        const resetAddForm = () => {
            formAdd.reset();
            selectAddEquipeA.value = '';
            selectAddEquipeB.value = '';
            updateDropdownOptions(selectAddEquipeA, selectAddEquipeB);
        };

        // Reset Add Phase Form
        const resetAddFaseForm = () => {
            formAddFase.reset();
            inputNomeFase.value = '';
        };

        // Reset Edit Phase Form
        const resetEditFaseForm = () => {
            formEditFase.reset();
            inputFaseAntiga.value = '';
            inputNomeFaseEdit.value = '';
        };

        // Update fase tabs and content
        const updateFaseNumbers = () => {
            const tabs = fasesTabs.querySelectorAll('.nav-item');
            const panes = fasesContent.querySelectorAll('.tab-pane');
            tabs.forEach((tab, index) => {
                const faseNumber = index + 1;
                const link = tab.querySelector('.nav-link');
                const faseName = link.childNodes[0].textContent.trim(); // Preserve full phase name
                link.innerHTML = `
                ${faseName}
                ${faseNumber > 1 ? `
                    <button type="button" class="btn btn-sm btn-editar-fase" title="Editar Nome da Fase" data-fase="${faseName}">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-excluir-fase" title="Excluir Fase" data-fase="${faseName}">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            `;
                link.setAttribute('href', `#fase${faseNumber}`);
                const pane = panes[index];
                pane.id = `fase${faseNumber}`;
                const container = pane.querySelector('.partidas-container');
                container.dataset.fase = faseName;
                container.querySelectorAll('input[name*="[fase]"]').forEach(input => {
                    input.value = faseName;
                });
            });
            faseCount = tabs.length;
        };

        // Add new fase with dynamic matches
        document.getElementById('btnAdicionarFase').addEventListener('click', () => {
            resetAddFaseForm();
            modalAddFaseLabel.textContent = 'Adicionar Nova Fase';
            btnSalvarNovaFase.textContent = 'Adicionar';
            modalAddFase.show();
        });

        // Handle Add Phase Form Submission
        btnSalvarNovaFase.addEventListener('click', () => {
            const nomeFase = inputNomeFase.value.trim();
            if (!nomeFase) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'O nome da fase é obrigatório.'
                });
                return;
            }

            faseCount++;
            const newTabLi = document.createElement('li');
            newTabLi.className = 'nav-item';
            newTabLi.innerHTML = `
            <a class="nav-link" href="#fase${faseCount}" data-bs-toggle="tab">
                ${nomeFase}
                <button type="button" class="btn btn-sm btn-editar-fase" title="Editar Nome da Fase" data-fase="${nomeFase}">
                    <i class="fas fa-pen"></i>
                </button>
                <button type="button" class="btn btn-sm btn-excluir-fase" title="Excluir Fase" data-fase="${nomeFase}">
                    <i class="fas fa-times"></i>
                </button>
            </a>
        `;
            fasesTabs.appendChild(newTabLi);
            const newTabPane = document.createElement('div');
            newTabPane.className = 'tab-pane';
            newTabPane.id = `fase${faseCount}`;
            newTabPane.innerHTML = `
            <h3 class="mt-3">${rodada}</h3>
            <div class="row g-3 partidas-container" data-fase="${nomeFase}"></div>`;
            fasesContent.appendChild(newTabPane);

            // Generate matches dynamically
            const equipesDisponiveis = [...Object.values(equipes)];
            equipesDisponiveis.sort(() => Math.random() - 0.5);
            const existingIndices = Array.from(formChaveamento.querySelectorAll('input[name*="[equipe_a]"]'))
                    .map(input => parseInt(input.name.match(/\d+/)[0]));
            let newIndex = existingIndices.length ? Math.max(...existingIndices) + 1 : 0;
            let html = '';
            for (let i = 0; i < equipesDisponiveis.length - 1; i += 2) {
                const equipeA = equipesDisponiveis[i];
                const equipeB = equipesDisponiveis[i + 1];
                html += `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100 shadow-sm card-status-agendada">
                        <div class="d-flex justify-content-around align-items-center text-decoration-none flex-column py-3 opacity-75" style="pointer-events: none;">                                <input type="hidden" name="partidas[${newIndex}][equipe_a]" value="${equipeA.id}">
                                <input type="hidden" name="partidas[${newIndex}][equipe_b]" value="${equipeB.id}">
                                <input type="hidden" name="partidas[${newIndex}][data_partida]" value="">
                                <input type="hidden" name="partidas[${newIndex}][local_partida]" value="">
                                <input type="hidden" name="partidas[${newIndex}][fase]" value="${fase}">
                                <input type="hidden" name="partidas[${newIndex}][rodada]" value="${rodada}">
                                <input type="hidden" name="partidas[${newIndex}][id]" value="">
                                <input type="hidden" name="partidas[${newIndex}][status]" value="Agendada">
                                <div class="d-flex justify-content-around align-items-center w-100">
                                    <div class="text-center" style="width: 120px;">
                                        <img src="${equipeA.brasao ? `../public/brasoes/${equipeA.brasao}` : '../assets/img/brasao_default.png'}"
                                             alt="Brasão de ${equipeA.nome}"
                                             class="img-fluid mb-2"
                                             style="width: 60px; height: 60px; object-fit: cover;">
                                        <span class="fw-bold d-block team-name">${equipeA.nome}</span>
                                    </div>
                                    <span class="mx-2 fs-5 text-muted">vs</span>
                                    <div class="text-center" style="width: 120px;">
                                        <img src="${equipeB.brasao ? `../public/brasoes/${equipeB.brasao}` : '../assets/img/brasao_default.png'}"
                                             alt="Brasão de ${equipeB.nome}"
                                             class="img-fluid mb-2"
                                             style="width: 60px; height: 60px; object-fit: cover;">
                                        <span class="fw-bold d-block team-name">${equipeB.nome}</span>
                                    </div>
                                </div>
                                <div class="fase-text">${fase}</div>
                                <div class="status-text">Agendada</div>
                            </div>
                        <div class="card-footer d-flex justify-content-center">
                            <button type="button" class="btn btn-sm btn-editar-partida position-absolute top-0 end-0 me-4 px-0"
                                    data-partida='${JSON.stringify({
                    id: '',
                    id_a: equipeA.id,
                    nome_a: equipeA.nome,
                    brasao_a: equipeA.brasao,
                    id_b: equipeB.id,
                    nome_b: equipeB.nome,
                    brasao_b: equipeB.brasao,
                    data_partida: '',
                    local_partida: '',
                    fase: nomeFase,
                    rodada: rodada,
                    status: 'Agendada'
                })}'
                                    title="Editar Confronto">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button type="button" class="btn btn-sm btn-excluir-partida position-absolute top-0 end-0 me-0 px-0"
                                    data-id-partida=""
                                    data-client-index="${newIndex}"
                                    data-nome-partida="${equipeA.nome} vs ${equipeB.nome}"
                                    title="Excluir Confronto">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>`;
                newIndex++;
            }
            newTabPane.querySelector('.partidas-container').innerHTML = html;
            updateFaseNumbers();
            modalAddFase.hide();
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                icon: 'success',
                title: 'Fase adicionada com sucesso!'
            });
        });

        // Handle Edit Phase Button
        fasesTabs.addEventListener('click', async (e) => {
            const editButton = e.target.closest('.btn-editar-fase');
            if (editButton) {
                const faseAntiga = editButton.dataset.fase;
                resetEditFaseForm();
                inputFaseAntiga.value = faseAntiga;
                inputNomeFaseEdit.value = faseAntiga;
                modalEditFaseLabel.textContent = 'Editar Nome da Fase: ' + faseAntiga;
                modalEditFase.show();
            }
        });

        // Handle Edit Phase Form Submission
        btnSalvarEditarFase.addEventListener('click', async () => {
            const faseAntiga = inputFaseAntiga.value;
            const faseNova = inputNomeFaseEdit.value.trim();
            if (!faseNova) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'O nome da fase é obrigatório.'
                });
                return;
            }

            try {
                const response = await fetch(`gerenciar_etapas.php?action=editar_fase`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        id_campeonato: <?= htmlspecialchars($id_campeonato) ?>,
                        fase_antiga: faseAntiga,
                        fase_nova: faseNova,
                        rodada: rodada
                    })
                });
                const result = await response.json();
                if (result.success) {
                    // Update UI
                    const tab = Array.from(fasesTabs.querySelectorAll('.nav-item')).find(tab =>
                        tab.querySelector('.btn-editar-fase')?.dataset.fase === faseAntiga
                    );
                    if (tab) {
                        const link = tab.querySelector('.nav-link');
                        link.childNodes[0].textContent = faseNova;
                        link.querySelector('.btn-editar-fase').dataset.fase = faseNova;
                        link.querySelector('.btn-excluir-fase').dataset.fase = faseNova;
                    }
                    const pane = Array.from(fasesContent.querySelectorAll('.tab-pane')).find(pane =>
                        pane.querySelector('.partidas-container').dataset.fase === faseAntiga
                    );
                    if (pane) {
                        pane.querySelector('.partidas-container').dataset.fase = faseNova;
                        pane.querySelectorAll('input[name*="[fase]"]').forEach(input => {
                            input.value = faseNova;
                        });
                        pane.querySelectorAll('.fase-text').forEach(text => {
                            text.textContent = faseNova;
                        });
                        pane.querySelectorAll('.btn-editar-partida').forEach(button => {
                            const partidaData = JSON.parse(button.dataset.partida);
                            partidaData.fase = faseNova;
                            button.dataset.partida = JSON.stringify(partidaData);
                        });
                    }
                    modalEditFase.hide();
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000,
                        icon: 'success',
                        title: 'Nome da fase atualizado com sucesso!'
                    });
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: `Erro ao atualizar nome da fase: ${error.message}`
                });
            }
        });

        // Handle Delete Fase
        fasesTabs.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.btn-excluir-fase');
            if (deleteButton) {
                const faseExcluida = deleteButton.dataset.fase;
                Swal.fire({
                    title: 'Tem certeza?',
                    html: `Deseja excluir a fase <strong>${faseExcluida}</strong>?<br>Esta ação não pode ser desfeita.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Sim, excluir!',
                    cancelButtonText: 'Cancelar'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            const response = await fetch(`gerenciar_etapas.php?action=excluir_fase`, {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({
                                    id_campeonato: <?= htmlspecialchars($id_campeonato) ?>,
                                    fase_excluida: faseExcluida,
                                    rodada: rodada
                                })
                            });
                            const result = await response.json();
                            if (result.success) {
                                Swal.fire({
                                    toast: true,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 2000,
                                    icon: 'success',
                                    title: 'Fase removida com sucesso!'
                                }).then(() => {
                                    window.location.reload();
                                });
                            } else {
                                throw new Error(result.message);
                            }
                        } catch (error) {
                            Swal.fire({
                                icon: 'error',
                                title: 'Erro',
                                text: `Erro ao excluir fase: ${error.message}`
                            });
                        }
                    }
                });
            }
        });

        // Handle Delete Match
        formChaveamento.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.btn-excluir-partida');
            if (deleteButton) {
                const idPartida = deleteButton.dataset.idPartida;
                const clientIndex = deleteButton.dataset.clientIndex;
                const partidaNome = deleteButton.dataset.nomePartida;
                Swal.fire({
                    title: 'Tem certeza?',
                    html: `Deseja excluir o confronto <strong>${partidaNome}</strong>?<br>Esta ação não pode ser desfeita.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Sim, excluir!',
                    cancelButtonText: 'Cancelar'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        if (idPartida) {
                            try {
                                const response = await fetch(`gerenciar_etapas.php?action=excluir_partida`, {
                                    method: 'POST',
                                    headers: {'Content-Type': 'application/json'},
                                    body: JSON.stringify({
                                        id_partida: idPartida
                                    })
                                });
                                const result = await response.json();
                                if (result.success) {
                                    deleteButton.closest('.col-md-6').remove();
                                    Swal.fire({
                                        toast: true,
                                        position: 'top-end',
                                        showConfirmButton: false,
                                        timer: 2000,
                                        icon: 'success',
                                        title: 'Confronto removido com sucesso!'
                                    });
                                } else {
                                    throw new Error(result.message);
                                }
                            } catch (error) {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Erro',
                                    text: `Erro ao excluir confronto: ${error.message}`
                                });
                            }
                        } else {
                            deleteButton.closest('.col-md-6').remove();
                            Swal.fire({
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 2000,
                                icon: 'success',
                                title: 'Confronto removido da tabela!'
                            });
                        }
                    }
                });
            }
        });

        // Dropdown event listeners for Edit Match Modal
        selectEquipeA.addEventListener('change', () => updateDropdownOptions(selectEquipeA, selectEquipeB));
        selectEquipeB.addEventListener('change', () => updateDropdownOptions(selectEquipeA, selectEquipeB));

        // Dropdown event listeners for Add Match Modal
        selectAddEquipeA.addEventListener('change', () => updateDropdownOptions(selectAddEquipeA, selectAddEquipeB));
        selectAddEquipeB.addEventListener('change', () => updateDropdownOptions(selectAddEquipeA, selectAddEquipeB));

        // Open Add Match Modal
        document.getElementById('btnAdicionarPartida').addEventListener('click', () => {
            resetAddForm();
            modalAddLabel.textContent = 'Adicionar Novo Confronto';
            btnSalvarAdd.textContent = 'Adicionar';
            modalAdd.show();
        });

        // Handle Edit Match Button
        formChaveamento.addEventListener('click', (e) => {
            const editButton = e.target.closest('.btn-editar-partida');
            if (editButton) {
                resetEditForm();
                const partidaData = JSON.parse(editButton.dataset.partida);
                const index = editButton.closest('.card').querySelector('input[name*="[equipe_a]"]').name.match(/\d+/)[0];
                document.getElementById('partida_index').value = index;
                selectEquipeA.value = partidaData.id_a;
                selectEquipeB.value = partidaData.id_b;
                modalEditLabel.textContent = 'Editar Confronto: ' + partidaData.nome_a + ' vs ' + partidaData.nome_b;
                btnSalvarEdit.textContent = 'Salvar Alterações';
                updateDropdownOptions(selectEquipeA, selectEquipeB);
                modalEdit.show();
            }
        });

        // Handle Edit Match Form Submission (Client-side only)
        btnSalvarEdit.addEventListener('click', () => {
            const equipeA = selectEquipeA.value;
            const equipeB = selectEquipeB.value;
            const index = document.getElementById('partida_index').value;

            if (!equipeA || !equipeB) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'Selecione ambas as equipes.'
                });
                return;
            }
            if (equipeA === equipeB) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'As equipes A e B não podem ser iguais.'
                });
                return;
            }

            const hiddenEquipeA = formChaveamento.querySelector(`input[name="partidas[${index}][equipe_a]"]`);
            const hiddenEquipeB = formChaveamento.querySelector(`input[name="partidas[${index}][equipe_b]"]`);
            const hiddenData = formChaveamento.querySelector(`input[name="partidas[${index}][data_partida]"]`);
            const hiddenLocal = formChaveamento.querySelector(`input[name="partidas[${index}][local_partida]"]`);
            const hiddenFase = formChaveamento.querySelector(`input[name="partidas[${index}][fase]"]`);
            const hiddenRodada = formChaveamento.querySelector(`input[name="partidas[${index}][rodada]"]`);
            const hiddenId = formChaveamento.querySelector(`input[name="partidas[${index}][id]"]`);
            const hiddenStatus = formChaveamento.querySelector(`input[name="partidas[${index}][status]"]`);

            if (hiddenEquipeA && hiddenEquipeB && hiddenData && hiddenLocal && hiddenFase && hiddenRodada && hiddenStatus) {
                hiddenEquipeA.value = equipeA;
                hiddenEquipeB.value = equipeB;

                const card = hiddenEquipeA.closest('.card');
                const nomeA = selectEquipeA.options[selectEquipeA.selectedIndex].text;
                const nomeB = selectEquipeB.options[selectEquipeB.selectedIndex].text;
                const brasaoA = equipes[equipeA]?.brasao || '';
                const brasaoB = equipes[equipeB]?.brasao || '';
                const status = hiddenStatus.value;
                const fase = hiddenFase.value;

                card.className = `card h-100 shadow-sm card-status-${status.toLowerCase().replace(' ', '-')}`;
                card.querySelector('.text-center:nth-child(1) img').src = brasaoA ? `../public/brasoes/${brasaoA}` : '../assets/img/brasao_default.png';
                card.querySelector('.text-center:nth-child(1) img').alt = `Brasão de ${nomeA}`;
                card.querySelector('.text-center:nth-child(1) span').textContent = nomeA;
                card.querySelector('.text-center:nth-child(3) img').src = brasaoB ? `../public/brasoes/${brasaoB}` : '../assets/img/brasao_default.png';
                card.querySelector('.text-center:nth-child(3) img').alt = `Brasão de ${nomeB}`;
                card.querySelector('.text-center:nth-child(3) span').textContent = nomeB;
                card.querySelector('.fase-text').textContent = fase;
                card.querySelector('.status-text').textContent = status;
                card.querySelector('.btn-excluir-partida').dataset.nomePartida = `${nomeA} vs ${nomeB}`;
                card.querySelector('.btn-excluir-partida').dataset.clientIndex = index;
                card.querySelector('.btn-editar-partida').dataset.partida = JSON.stringify({
                    id: hiddenId ? hiddenId.value : '',
                    id_a: equipeA,
                    nome_a: nomeA,
                    brasao_a: brasaoA,
                    id_b: equipeB,
                    nome_b: nomeB,
                    brasao_b: brasaoB,
                    data_partida: hiddenData.value,
                    local_partida: hiddenLocal.value,
                    fase: fase,
                    rodada: rodada,
                    status: status
                });

                modalEdit.hide();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    icon: 'success',
                    title: 'Confronto atualizado com sucesso!'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'Não foi possível atualizar o confronto.'
                });
            }
        });

        // Handle Add Match Form Submission (Client-side only)
        btnSalvarAdd.addEventListener('click', () => {
            const equipeA = selectAddEquipeA.value;
            const equipeB = selectAddEquipeB.value;

            if (!equipeA || !equipeB) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'Selecione ambas as equipes.'
                });
                return;
            }
            if (equipeA === equipeB) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'As equipes A e B não podem ser iguais.'
                });
                return;
            }

            const activeContainer = document.querySelector('.tab-pane.active .partidas-container');
            if (!activeContainer) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'Nenhuma fase ativa encontrada.'
                });
                return;
            }

            const fase = activeContainer.dataset.fase;
            const existingIndices = Array.from(formChaveamento.querySelectorAll('input[name*="[equipe_a]"]'))
                    .map(input => parseInt(input.name.match(/\d+/)[0]));
            const newIndex = existingIndices.length ? Math.max(...existingIndices) + 1 : 0;

            const nomeA = selectAddEquipeA.options[selectAddEquipeA.selectedIndex].text;
            const nomeB = selectAddEquipeB.options[selectAddEquipeB.selectedIndex].text;
            const brasaoA = equipes[equipeA]?.brasao || '';
            const brasaoB = equipes[equipeB]?.brasao || '';

            const newCard = document.createElement('div');
            newCard.className = 'col-md-6 col-lg-4';
            newCard.innerHTML = `
            <div class="card h-100 shadow-sm card-status-agendada">
                <div class="d-flex justify-content-around align-items-center text-decoration-none flex-column py-3 opacity-75" style="pointer-events: none;">                                <input type="hidden" name="partidas[${newIndex}][equipe_a]" value="${equipeA.id}">
                                <input type="hidden" name="partidas[${newIndex}][equipe_b]" value="${equipeB.id}">
                                <input type="hidden" name="partidas[${newIndex}][data_partida]" value="">
                                <input type="hidden" name="partidas[${newIndex}][local_partida]" value="">
                                <input type="hidden" name="partidas[${newIndex}][fase]" value="${fase}">
                                <input type="hidden" name="partidas[${newIndex}][rodada]" value="${rodada}">
                                <input type="hidden" name="partidas[${newIndex}][id]" value="">
                                <input type="hidden" name="partidas[${newIndex}][status]" value="Agendada">
                                <div class="d-flex justify-content-around align-items-center w-100">
                                    <div class="text-center" style="width: 120px;">
                                        <img src="${equipeA.brasao ? `../public/brasoes/${equipeA.brasao}` : '../assets/img/brasao_default.png'}"
                                             alt="Brasão de ${equipeA.nome}"
                                             class="img-fluid mb-2"
                                             style="width: 60px; height: 60px; object-fit: cover;">
                                        <span class="fw-bold d-block team-name">${equipeA.nome}</span>
                                    </div>
                                    <span class="mx-2 fs-5 text-muted">vs</span>
                                    <div class="text-center" style="width: 120px;">
                                        <img src="${equipeB.brasao ? `../public/brasoes/${equipeB.brasao}` : '../assets/img/brasao_default.png'}"
                                             alt="Brasão de ${equipeB.nome}"
                                             class="img-fluid mb-2"
                                             style="width: 60px; height: 60px; object-fit: cover;">
                                        <span class="fw-bold d-block team-name">${equipeB.nome}</span>
                                    </div>
                                </div>
                                <div class="fase-text">${fase}</div>
                                <div class="status-text">Agendada</div>
                            </div>
                <div class="card-footer d-flex justify-content-center">
                    <button type="button" class="btn btn-sm btn-editar-partida position-absolute top-0 end-0 me-4 px-0"
                            data-partida='${JSON.stringify({
                id: '',
                id_a: equipeA,
                nome_a: nomeA,
                brasao_a: brasaoA,
                id_b: equipeB,
                nome_b: nomeB,
                brasao_b: brasaoB,
                data_partida: '',
                local_partida: '',
                fase: fase,
                rodada: rodada,
                status: 'Agendada'
            })}'
                            title="Editar Confronto">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-excluir-partida position-absolute top-0 end-0 me-0 px-0"
                            data-id-partida=""
                            data-client-index="${newIndex}"
                            data-nome-partida="${nomeA} vs ${nomeB}"
                            title="Excluir Confronto">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

            activeContainer.prepend(newCard);
            modalAdd.hide();
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                icon: 'success',
                title: 'Confronto adicionado com sucesso!'
            });
        });

        // Handle Bye Selection
        if (selectBye) {
            selectBye.addEventListener('change', () => {
                const idEquipeBye = selectBye.value;
                if (!idEquipeBye) {
                    const activeContainer = document.querySelector('.tab-pane.active .partidas-container');
                    activeContainer.innerHTML = '<p class="text-center text-muted" id="placeholder-partidas">Selecione a equipe com "bye" para gerar os confrontos.</p>';
                    return;
                }

                if (placeholderPartidas)
                    placeholderPartidas.style.display = 'none';
                let equipesParaJogar = Object.values(equipes).filter(equipe => equipe.id != idEquipeBye);
                equipesParaJogar.sort(() => Math.random() - 0.5);
                const activeContainer = document.querySelector('.tab-pane.active .partidas-container');
                const fase = activeContainer.dataset.fase;
                const existingIndices = Array.from(formChaveamento.querySelectorAll('input[name*="[equipe_a]"]'))
                        .map(input => parseInt(input.name.match(/\d+/)[0]));
                let newIndex = existingIndices.length ? Math.max(...existingIndices) + 1 : 0;
                let html = '';
                for (let i = 0; i < equipesParaJogar.length - 1; i += 2) {
                    const equipeA = equipesParaJogar[i];
                    const equipeB = equipesParaJogar[i + 1];
                    html += `
                    <div class="col-md-6 col-lg-4">
                        <div class="card h-100 shadow-sm card-status-agendada">
                            <div class="d-flex justify-content-around align-items-center text-decoration-none flex-column py-3 opacity-75" style="pointer-events: none;">                                <input type="hidden" name="partidas[${newIndex}][equipe_a]" value="${equipeA.id}">
                                <input type="hidden" name="partidas[${newIndex}][equipe_b]" value="${equipeB.id}">
                                <input type="hidden" name="partidas[${newIndex}][data_partida]" value="">
                                <input type="hidden" name="partidas[${newIndex}][local_partida]" value="">
                                <input type="hidden" name="partidas[${newIndex}][fase]" value="${fase}">
                                <input type="hidden" name="partidas[${newIndex}][rodada]" value="${rodada}">
                                <input type="hidden" name="partidas[${newIndex}][id]" value="">
                                <input type="hidden" name="partidas[${newIndex}][status]" value="Agendada">
                                <div class="d-flex justify-content-around align-items-center w-100">
                                    <div class="text-center" style="width: 120px;">
                                        <img src="${equipeA.brasao ? `../public/brasoes/${equipeA.brasao}` : '../assets/img/brasao_default.png'}"
                                             alt="Brasão de ${equipeA.nome}"
                                             class="img-fluid mb-2"
                                             style="width: 60px; height: 60px; object-fit: cover;">
                                        <span class="fw-bold d-block team-name">${equipeA.nome}</span>
                                    </div>
                                    <span class="mx-2 fs-5 text-muted">vs</span>
                                    <div class="text-center" style="width: 120px;">
                                        <img src="${equipeB.brasao ? `../public/brasoes/${equipeB.brasao}` : '../assets/img/brasao_default.png'}"
                                             alt="Brasão de ${equipeB.nome}"
                                             class="img-fluid mb-2"
                                             style="width: 60px; height: 60px; object-fit: cover;">
                                        <span class="fw-bold d-block team-name">${equipeB.nome}</span>
                                    </div>
                                </div>
                                <div class="fase-text">${fase}</div>
                                <div class="status-text">Agendada</div>
                            </div>
                            <div class="card-footer d-flex justify-content-center">
                                <button type="button" class="btn btn-sm btn-editar-partida position-absolute top-0 end-0 me-4 px-0"
                                        data-partida='${JSON.stringify({
                        id: '',
                        id_a: equipeA.id,
                        nome_a: equipeA.nome,
                        brasao_a: equipeA.brasao,
                        id_b: equipeB.id,
                        nome_b: equipeB.nome,
                        brasao_b: equipeB.brasao,
                        data_partida: '',
                        local_partida: '',
                        fase: fase,
                        rodada: rodada,
                        status: 'Agendada'
                    })}'
                                        title="Editar Confronto">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button type="button" class="btn btn-sm btn-excluir-partida position-absolute top-0 end-0 me-0 px-0"
                                        data-id-partida=""
                                        data-client-index="${newIndex}"
                                        data-nome-partida="${equipeA.nome} vs ${equipeB.nome}"
                                        title="Excluir Confronto">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>`;
                    newIndex++;
                }
                activeContainer.innerHTML = html;
            });
        }

        // Handle Form Submission via Ajax
        document.getElementById('btnConfirmarPartidas').addEventListener('click', async (e) => {
            e.preventDefault();
            const formData = new FormData(formChaveamento);
            const partidas = [];
            const inputs = formChaveamento.querySelectorAll('input[name*="[equipe_a]"]');
            inputs.forEach((input) => {
                const idx = input.name.match(/\d+/)[0];
                const partida = {
                    equipe_a: formData.get(`partidas[${idx}][equipe_a]`),
                    equipe_b: formData.get(`partidas[${idx}][equipe_b]`),
                    data_partida: formData.get(`partidas[${idx}][data_partida]`),
                    local_partida: formData.get(`partidas[${idx}][local_partida]`),
                    fase: formData.get(`partidas[${idx}][fase]`),
                    rodada: formData.get(`partidas[${idx}][rodada]`),
                    status: formData.get(`partidas[${idx}][status]`) || 'Agendada'
                };
                if (partida.equipe_a && partida.equipe_b && partida.equipe_a !== partida.equipe_b) {
                    partidas.push(partida);
                }
            });

            if (partidas.length === 0) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'Nenhuma partida válida para salvar.'
                });
                return;
            }

            try {
                const response = await fetch(`gerenciar_etapas.php?action=salvar_partidas`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        id_campeonato: formData.get('id_campeonato'),
                        partidas: partidas
                    })
                });
                const result = await response.json();
                if (result.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Sucesso',
                        text: 'Partidas salvas com sucesso!'
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: `Erro ao salvar partidas: ${error.message}`
                });
            }
        });
    });
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>