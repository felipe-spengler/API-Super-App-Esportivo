<?php
require_once 'includes/db.php'; // Ajuste o caminho se necessário

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    // Redireciona para a página inicial se nenhum ID for fornecido
    header("Location: index.php");
    exit();
}
$id_campeonato = $_GET['id'];

// Busca os dados principais do campeonato
$stmt_camp = $pdo->prepare("SELECT * FROM campeonatos WHERE id = ?");
$stmt_camp->execute([$id_campeonato]);
$campeonato = $stmt_camp->fetch();

if (!$campeonato) {
    die("Campeonato não encontrado.");
}

// Lógica para buscar e ORDENAR as partidas
$sql_partidas = "
    SELECT 
        p.id, p.id_campeonato, p.placar_equipe_a, p.placar_equipe_b, p.data_partida, p.local_partida, p.fase, p.status,
        equipe_a.nome as nome_a, equipe_a.brasao as brasao_a,
        equipe_b.nome as nome_b, equipe_b.brasao as brasao_b
    FROM partidas p
    JOIN equipes equipe_a ON p.id_equipe_a = equipe_a.id
    JOIN equipes equipe_b ON p.id_equipe_b = equipe_b.id
    WHERE p.id_campeonato = ?
    ORDER BY
        -- Ordena por status: Em Andamento > Agendada > Finalizada
        FIELD(p.status, 'Em Andamento', 'Agendada', 'Finalizada'), 
        -- Para partidas agendadas, ordena da mais próxima para a mais distante
        CASE WHEN p.status = 'Agendada' THEN p.data_partida END ASC,
        -- Para partidas finalizadas, ordena da mais recente para a mais antiga
        CASE WHEN p.status = 'Finalizada' THEN p.data_partida END DESC
";
$stmt_partidas = $pdo->prepare($sql_partidas);
$stmt_partidas->execute([$id_campeonato]);
$partidas = $stmt_partidas->fetchAll(PDO::FETCH_ASSOC);

require_once 'includes/header.php'; // Usando o header público
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
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h1 class="display-5 fw-bold"><?= htmlspecialchars($campeonato['nome']) ?></h1>
            <span class="badge bg-primary fs-6"><?= htmlspecialchars($campeonato['status']) ?></span>
            <span class="badge bg-secondary fs-6"><?= htmlspecialchars($campeonato['tipo_chaveamento']) ?></span>
        </div>
        <a href="index.php" class="btn btn-outline-secondary"><i class="fas fa-arrow-left me-1"></i> Voltar</a>
    </div>

    <div class="row g-4">
        <?php if (count($partidas) > 0): ?>
            <?php foreach ($partidas as $partida): ?>
                <?php
                    // Variáveis de ajuda para cores e textos
                    $status_cor = 'bg-secondary';
                    $status_texto = 'Agendada';
                    if ($partida['status'] === 'Em Andamento') {
                        $status_cor = 'bg-danger';
                        $status_texto = 'Ao Vivo';
                    } elseif ($partida['status'] === 'Finalizada') {
                        $status_cor = 'bg-success';
                        $status_texto = 'Finalizada';
                    }
                ?>
                <div class="col-lg-4 col-md-6">
                    <div class="card h-100 shadow-sm">
                        
                        <div class="card-header text-center fw-bold d-flex justify-content-between align-items-center">
                            <?php if ($campeonato['tipo_chaveamento'] === 'Mata-Mata'): ?>
                                <span><?= htmlspecialchars($partida['fase']) ?></span>
                            <?php endif; ?>
                            <span class="badge <?= $status_cor ?> ms-auto"><?= $status_texto ?></span>
                        </div>

                        <div class="card-body d-flex align-items-center">
                            <div class="text-center flex-fill">
                                <img src="<?= $partida['brasao_a'] ? 'public/brasoes/' . htmlspecialchars($partida['brasao_a']) : 'assets/img/brasao_default.png' ?>" 
                                     alt="Brasão" class="img-fluid mb-2" style="width: 70px; height: 70px; object-fit: cover;">
                                <h6 class="card-title mb-0"><?= htmlspecialchars($partida['nome_a']) ?></h6>
                            </div>
                            
                            <div class="px-3 text-center">
                                <?php if ($partida['status'] !== 'Agendada'): ?>
                                    <span class="fs-3 fw-bold"><?= htmlspecialchars($partida['placar_equipe_a']) ?></span>
                                    <span class="fs-4 mx-1">x</span>
                                    <span class="fs-3 fw-bold"><?= htmlspecialchars($partida['placar_equipe_b']) ?></span>
                                <?php else: ?>
                                    <span class="fs-4 text-muted">vs</span>
                                <?php endif; ?>
                            </div>

                            <div class="text-center flex-fill">
                                 <img src="<?= $partida['brasao_b'] ? 'public/brasoes/' . htmlspecialchars($partida['brasao_b']) : 'assets/img/brasao_default.png' ?>" 
                                     alt="Brasão" class="img-fluid  mb-2" style="width: 70px; height: 70px; object-fit: cover;">
                                <h6 class="card-title mb-0"><?= htmlspecialchars($partida['nome_b']) ?></h6>
                            </div>
                        </div>

                        <div class="card-footer text-muted d-flex justify-content-between align-items-center">
                            <div class="fs-sm">
                                <i class="fas fa-calendar-alt fa-fw"></i> <?= $partida['data_partida'] ? date('d/m/Y H:i', strtotime($partida['data_partida'])) : 'A definir' ?><br>
                                <i class="fas fa-map-marker-alt fa-fw"></i> <?= htmlspecialchars($partida['local_partida'] ?? 'A definir') ?>
                            </div>
                        </div>
                        <div class="card-footer text-muted d-flex justify-content-between align-items-center">
                            <a href="sumula.php?id_partida=<?= $partida['id'] ?>" class="btn btn-primary btn-sm">
                                <i class="fas fa-file-alt me-1"></i>Ver Súmula
                            </a>

                            <a href="menu_gerar_arte.php?id_partida=<?= $partida['id'] ?>" class="btn btn-success btn-sm">
                               <i class="fas fa-chart-line me-1"></i> Estatísticas
                            </a>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php else: ?>
            <div class="col-12">
                <div class="alert alert-warning text-center">Nenhuma partida foi gerada para este campeonato ainda.</div>
            </div>
        <?php endif; ?>
    </div>
</main>
