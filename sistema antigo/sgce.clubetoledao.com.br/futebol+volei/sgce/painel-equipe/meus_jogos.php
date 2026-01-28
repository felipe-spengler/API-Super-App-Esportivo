<?php
// /painel-equipe/meus_jogos.php
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php';

if (!$minha_equipe) { header("Location: editar_equipe.php"); exit(); }
$id_equipe = $minha_equipe['id'];

$stmt = $pdo->prepare("SELECT p.*, c.nome as nome_campeonato, equipe_a.nome as nome_a, equipe_b.nome as nome_b FROM partidas p JOIN campeonatos c ON p.id_campeonato = c.id JOIN equipes equipe_a ON p.id_equipe_a = equipe_a.id JOIN equipes equipe_b ON p.id_equipe_b = equipe_b.id WHERE p.id_equipe_a = ? OR p.id_equipe_b = ? ORDER BY p.data_partida DESC");
$stmt->execute([$id_equipe, $id_equipe]);
$meus_jogos = $stmt->fetchAll();

require_once '../includes/header.php';
require_once 'sidebar_equipe.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-calendar-alt fa-fw me-2"></i>Meus Jogos</h1>
</div>

<?php if (empty($meus_jogos)): ?>
    <div class="card"><div class="card-body text-center text-muted"><p class="mb-0">Sua equipe ainda não tem jogos agendados.</p></div></div>
<?php else: ?>
    <div class="row">
        <?php foreach ($meus_jogos as $jogo): ?>
        <div class="col-lg-6 mb-4">
            <div class="card h-100">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <span><?= htmlspecialchars($jogo['nome_campeonato']) ?> - <?= htmlspecialchars($jogo['fase']) ?></span>
                    <span class="badge bg-<?= $jogo['status'] == 'Finalizada' ? 'secondary' : 'primary' ?>"><?= htmlspecialchars($jogo['status']) ?></span>
                </div>
                <div class="card-body text-center">
                     <div class="row align-items-center">
                        <div class="col-5">
                            <h5 class="mb-0"><?= htmlspecialchars($jogo['nome_a']) ?></h5>
                        </div>
                        <div class="col-2">
                            <?php if ($jogo['status'] === 'Finalizada'): ?>
                                <span class="h4 fw-bold"><?= $jogo['placar_equipe_a'] ?> x <?= $jogo['placar_equipe_b'] ?></span>
                            <?php else: ?>
                                <span class="h4 text-muted">vs</span>
                            <?php endif; ?>
                        </div>
                        <div class="col-5">
                             <h5 class="mb-0"><?= htmlspecialchars($jogo['nome_b']) ?></h5>
                        </div>
                    </div>
                </div>
                <div class="card-footer text-muted small">
                    <i class="fas fa-calendar-alt me-1"></i> <?= $jogo['data_partida'] ? date('d/m/Y H:i', strtotime($jogo['data_partida'])) : 'A definir' ?>
                    <span class="mx-2">|</span>
                    <i class="fas fa-map-marker-alt me-1"></i> <?= htmlspecialchars($jogo['local_partida'] ?? 'A definir') ?>
                </div>
            </div>
        </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<?php require_once '../includes/footer_dashboard.php'; ?>