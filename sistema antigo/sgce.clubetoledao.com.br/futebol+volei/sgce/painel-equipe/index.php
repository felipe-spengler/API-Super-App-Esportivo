<?php
// /painel-equipe/index.php
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php';

if ($minha_equipe) {
    $id_equipe = $minha_equipe['id'];
    $total_jogadores = $pdo->prepare("SELECT COUNT(*) FROM participantes WHERE id_equipe = ?");
    $total_jogadores->execute([$id_equipe]);
    $total_jogadores = $total_jogadores->fetchColumn();

    $total_inscricoes = $pdo->prepare("SELECT COUNT(*) FROM campeonatos_equipes WHERE id_equipe = ?");
    $total_inscricoes->execute([$id_equipe]);
    $total_inscricoes = $total_inscricoes->fetchColumn();

    $stmt_proximo_jogo = $pdo->prepare("SELECT p.*, adversario.nome as nome_adversario FROM partidas p LEFT JOIN equipes adversario ON (CASE WHEN p.id_equipe_a = ? THEN p.id_equipe_b ELSE p.id_equipe_a END) = adversario.id WHERE (p.id_equipe_a = ? OR p.id_equipe_b = ?) AND p.status = 'Agendada' AND p.data_partida >= NOW() ORDER BY p.data_partida ASC LIMIT 1");
    $stmt_proximo_jogo->execute([$id_equipe, $id_equipe, $id_equipe]);
    $proximo_jogo = $stmt_proximo_jogo->fetch();

    $campeonatos_abertos = $pdo->prepare("SELECT c.*, e.nome as esporte_nome FROM campeonatos c JOIN esportes e ON c.id_esporte = e.id LEFT JOIN campeonatos_equipes ce ON c.id = ce.id_campeonato AND ce.id_equipe = ? WHERE c.status = 'Inscrições Abertas' AND ce.id_equipe IS NULL ORDER BY c.data_inicio ASC");
    $campeonatos_abertos->execute([$id_equipe]);
    $campeonatos_para_inscrever = $campeonatos_abertos->fetchAll();
}

require_once '../includes/header.php';
require_once 'sidebar_equipe.php';
?>

<?php if (!$minha_equipe): ?>
    <div class="container-fluid">
        <div class="text-center p-5 bg-white rounded shadow">
            <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
            <h1 class="display-5 fw-bold">Bem-vindo, Líder!</h1>
            <p class="col-lg-8 mx-auto fs-5 text-muted">O primeiro passo para entrar na competição é registrar os dados da sua equipe.</p>
            <a href="editar_equipe.php" class="btn btn-primary btn-lg mt-3"><i class="fas fa-shield-alt me-2"></i>Criar minha Equipe Agora</a>
        </div>
    </div>
<?php else: ?>
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 class="h2">Início</h1>
    </div>
    <p class="lead text-muted">Olá, <?= htmlspecialchars($_SESSION['user_nome']) ?>! Aqui está um resumo da sua equipe.</p>

    <div class="row">
        <div class="col-lg-4 mb-4">
            <div class="card text-center h-100">
                <div class="card-body">
                    <i class="fas fa-users fa-3x text-primary mb-3"></i>
                    <h5 class="card-title text-uppercase text-muted small">Jogadores</h5>
                    <p class="display-4 fw-bold"><?= $total_jogadores ?></p>
                </div>
                <div class="card-footer bg-light border-0 py-3"><a href="gerenciar_jogadores.php" class="btn btn-sm btn-outline-primary">Gerenciar Elenco</a></div>
            </div>
        </div>
        <div class="col-lg-4 mb-4">
            <div class="card text-center h-100">
                <div class="card-body">
                    <i class="fas fa-trophy fa-3x text-success mb-3"></i>
                    <h5 class="card-title text-uppercase text-muted small">Inscrições</h5>
                    <p class="display-4 fw-bold"><?= $total_inscricoes ?></p>
                </div>
                <div class="card-footer bg-light border-0 py-3"><a href="menu_esporte.php" class="btn btn-sm btn-outline-success">Ver Campeonatos</a></div>
            </div>
        </div>
        <div class="col-lg-4 mb-4">
            <div class="card text-center h-100">
                <div class="card-body">
                    <i class="fas fa-users fa-3x text-primary mb-3"></i>
                    <h5 class="card-title text-uppercase text-muted small">Gerenciar Equipes</h5>
                    <p class="display-4 fw-bold"><?= $total_inscricoes ?></p>
                </div>
                <div class="card-footer bg-light border-0 py-3"><a href="gerenciar_equipe.php" class="btn btn-sm btn-outline-primary">Ver Equipes</a></div>
            </div>
        </div>
        <div class="col-lg-4 mb-4">
            <div class="card text-center h-100">
                <div class="card-body">
                    <i class="fas fa-calendar-alt fa-3x text-danger mb-3"></i>
                    <h5 class="card-title text-uppercase text-muted small">Próximo Jogo</h5>
                    <?php if ($proximo_jogo): ?>
                        <p class="fs-5 fw-bold mb-0">vs <?= htmlspecialchars($proximo_jogo['nome_adversario']) ?></p>
                        <p class="text-muted small"><?= date('d/m/Y \à\s H:i', strtotime($proximo_jogo['data_partida'])) ?></p>
                    <?php else: ?>
                        <p class="fs-5 fw-bold text-muted mt-3">Nenhum jogo agendado</p>
                    <?php endif; ?>
                </div>
                <div class="card-footer bg-light border-0 py-3"><a href="meus_jogos.php" class="btn btn-sm btn-outline-danger">Ver Calendário</a></div>
            </div>
        </div>
    </div>

<?php endif; ?>

<?php require_once '../includes/footer_dashboard.php'; ?>