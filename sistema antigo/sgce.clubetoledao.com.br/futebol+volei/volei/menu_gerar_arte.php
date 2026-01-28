<?php
require_once '../sgce/includes/db.php';

// Iniciar sessão, se não estiver ativa
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Validate id_partida from GET
$id_partida = isset($_GET['id_partida']) ? filter_var($_GET['id_partida'], FILTER_VALIDATE_INT) : null;
if (!$id_partida) {
    $_SESSION['notificacao'] = [
        'tipo' => 'error',
        'mensagem' => 'ID da partida inválido.'
    ];
    ?>
    <script>
        window.history.back();
    </script>
    <?php
    exit;
}

// Fetch match details and associated championship, including all melhor columns
try {
    $stmt_partida = $pdo->prepare("
        SELECT p.id, p.fase, p.placar_equipe_a, p.placar_equipe_b, p.id_campeonato, p.rodada,
               p.id_melhor_jogador, p.id_foto_selecionada_melhor_jogador,
               p.id_melhor_goleiro, p.id_foto_selecionada_melhor_goleiro,
               p.id_melhor_lateral, p.id_foto_selecionada_melhor_lateral,
               p.id_melhor_meia, p.id_foto_selecionada_melhor_meia,
               p.id_melhor_atacante, p.id_foto_selecionada_melhor_atacante,
               p.id_melhor_artilheiro, p.id_foto_selecionada_melhor_artilheiro,
               p.id_melhor_assistencia, p.id_foto_selecionada_melhor_assistencia,
               p.id_melhor_volante, p.id_foto_selecionada_melhor_volante,
               p.id_melhor_estreante, p.id_foto_selecionada_melhor_estreante,
               p.id_melhor_zagueiro, p.id_foto_selecionada_melhor_zagueiro,
               a.nome as nome_a, a.id as id_equipe_a, b.nome as nome_b, b.id as id_equipe_b,
               c.nome as nome_campeonato, c.id_campeonato_pai, cp.nome as nome_campeonato_pai
        FROM partidas p
        JOIN equipes a ON p.id_equipe_a = a.id
        JOIN equipes b ON p.id_equipe_b = b.id
        JOIN campeonatos c ON p.id_campeonato = c.id
        LEFT JOIN campeonatos cp ON c.id_campeonato_pai = cp.id
        WHERE p.id = ?
    ");
    $stmt_partida->execute([$id_partida]);
    $partida = $stmt_partida->fetch(PDO::FETCH_ASSOC);

    if (!$partida) {
        error_log("Partida não encontrada ou não finalizada. ID: $id_partida");
        $_SESSION['notificacao'] = [
            'tipo' => 'error',
            'mensagem' => 'Partida não encontrada ou não finalizada.'
        ];
        ?>
    <script>
        window.history.back();
    </script>
    <?php
        exit;
    }
} catch (PDOException $e) {
    error_log("Erro na consulta de partida: " . $e->getMessage());
    $_SESSION['notificacao'] = [
        'tipo' => 'error',
        'mensagem' => 'Erro ao carregar dados da partida.'
    ];
    header('Location: confronto.php?id=' . $id_partida);
    exit;
}

// Fetch goal scorers from sumulas_eventos table (for confronto only)
$goleadores_a = [];
$goleadores_b = [];
try {
    $stmt_goleadores = $pdo->prepare("
        SELECT e.id_participante, p.nome_completo, p.apelido, e.id_equipe, COUNT(e.id) as num_gols
        FROM sumulas_eventos e
        JOIN participantes p ON e.id_participante = p.id
        WHERE e.id_partida = ? AND e.tipo_evento = 'Gol'
        GROUP BY e.id_participante, p.nome_completo, p.apelido, e.id_equipe
        ORDER BY e.id_equipe, p.nome_completo
    ");
    $stmt_goleadores->execute([$id_partida]);
    $goleadores = $stmt_goleadores->fetchAll(PDO::FETCH_ASSOC);

    foreach ($goleadores as $goleador) {
        $nome_base = $goleador['apelido'] ?: explode(' ', $goleador['nome_completo'])[0];
        if ($goleador['id_equipe'] == $partida['id_equipe_a']) {
            $goleadores_a[] = [
                'id' => $goleador['id_participante'],
                'nome' => htmlspecialchars($nome_base),
                'gols' => (int)$goleador['num_gols']
            ];
        } elseif ($goleador['id_equipe'] == $partida['id_equipe_b']) {
            $goleadores_b[] = [
                'id' => $goleador['id_participante'],
                'nome' => htmlspecialchars($nome_base),
                'gols' => (int)$goleador['num_gols']
            ];
        }
    }

    // Validate goal counts against match score
    $gols_equipe_a = array_sum(array_column($goleadores_a, 'gols'));
    $gols_equipe_b = array_sum(array_column($goleadores_b, 'gols'));
    $placar_a = (int)$partida['placar_equipe_a'];
    $placar_b = (int)$partida['placar_equipe_b'];
    if ($gols_equipe_a != $placar_a || $gols_equipe_b != $placar_b) {
        $_SESSION['notificacao'] = [
            'tipo' => 'warning',
            'mensagem' => 'Os gols registrados não correspondem ao placar da partida (' . $gols_equipe_a . 'x' . $gols_equipe_b . ' vs ' . $placar_a . 'x' . $placar_b . ').'
        ];
    }
} catch (PDOException $e) {
    error_log("Erro na consulta de goleadores: " . $e->getMessage());
    $goleadores_a = [];
    $goleadores_b = [];
    $_SESSION['notificacao'] = [
        'tipo' => 'error',
        'mensagem' => 'Erro ao carregar goleadores da partida.'
    ];
}

require_once '../sgce/includes/header.php'; // Usando o header público
?>

<style>
    .btn-gerar-arte:hover, .btn-gerar-confronto:hover {
        transform: scale(1.05);
        transition: transform 0.2s;
    }
    .btn-disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    .btn-disabled .card-body {
        color: #6c757d;
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
        <h1 class="h2"><i class="fas fa-image fa-fw me-2"></i>Gerar Artes para <?= htmlspecialchars($partida['nome_a'] . ' x ' . $partida['nome_b'] . ' (' . $partida['fase'] . ')') ?></h1>
        <a href="javascript:history.back()" class="btn btn-outline-secondary btn-sm"><i class="fas fa-arrow-left me-1"></i> Voltar</a>
    </div>

    <?php if (isset($_SESSION['notificacao'])): ?>
        <div class="alert alert-<?= $_SESSION['notificacao']['tipo'] ?> alert-dismissible fade show" role="alert">
            <?= htmlspecialchars($_SESSION['notificacao']['mensagem']) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
        <?php unset($_SESSION['notificacao']); ?>
    <?php endif; ?>

    <div class="row">
        <?php
        // Mapa de categorias para colunas na tabela partidas
        $categoria_to_column = [
            'craque' => ['id_column' => 'id_melhor_jogador', 'id_foto_column' => 'id_foto_selecionada_melhor_jogador'],
            'goleiro' => ['id_column' => 'id_melhor_goleiro', 'id_foto_column' => 'id_foto_selecionada_melhor_goleiro'],
            'lateral' => ['id_column' => 'id_melhor_lateral', 'id_foto_column' => 'id_foto_selecionada_melhor_lateral'],
            'meia' => ['id_column' => 'id_melhor_meia', 'id_foto_column' => 'id_foto_selecionada_melhor_meia'],
            'atacante' => ['id_column' => 'id_melhor_atacante', 'id_foto_column' => 'id_foto_selecionada_melhor_atacante'],
            'artilheiro' => ['id_column' => 'id_melhor_artilheiro', 'id_foto_column' => 'id_foto_selecionada_melhor_artilheiro'],
            'assistencia' => ['id_column' => 'id_melhor_assistencia', 'id_foto_column' => 'id_foto_selecionada_melhor_assistencia'],
            'volante' => ['id_column' => 'id_melhor_volante', 'id_foto_column' => 'id_foto_selecionada_melhor_volante'],
            'estreante' => ['id_column' => 'id_melhor_estreante', 'id_foto_column' => 'id_foto_selecionada_melhor_estreante'],
            'zagueiro' => ['id_column' => 'id_melhor_zagueiro', 'id_foto_column' => 'id_foto_selecionada_melhor_zagueiro'],
            'melhor' => ['id_column' => 'id_melhor_jogador', 'id_foto_column' => 'id_foto_selecionada_melhor_jogador']
        ];

        $categorias_ui = [
            'craque' => ['titulo' => 'Craque do Jogo', 'icone' => 'fas fa-star', 'cor' => 'primary', 'url' => '/sgce/admin/gerar_arte_craque.php'],
            'goleiro' => ['titulo' => 'Melhor Goleiro', 'icone' => 'fas fa-hand-paper', 'cor' => 'success', 'url' => '/sgce/admin/gerar_melhor_goleiro.php'],
            'lateral' => ['titulo' => 'Melhor Lateral', 'icone' => 'fas fa-running', 'cor' => 'info', 'url' => '/sgce/admin/gerar_melhor_lateral.php'],
            'meia' => ['titulo' => 'Melhor Meia', 'icone' => 'fas fa-futbol', 'cor' => 'warning', 'url' => '/sgce/admin/gerar_melhor_meia.php'],
            'atacante' => ['titulo' => 'Melhor Atacante', 'icone' => 'fas fa-bullseye', 'cor' => 'danger', 'url' => '/sgce/admin/gerar_melhor_atacante.php'],
            'artilheiro' => ['titulo' => 'Melhor Artilheiro', 'icone' => 'fas fa-trophy', 'cor' => 'dark', 'url' => '/sgce/admin/gerar_melhor_artilheiro.php'],
            'assistencia' => ['titulo' => 'Melhor Assistência', 'icone' => 'fas fa-hands-helping', 'cor' => 'secondary', 'url' => '/sgce/admin/gerar_melhor_assistencia.php'],
            'volante' => ['titulo' => 'Melhor Volante', 'icone' => 'fas fa-shield-alt', 'cor' => 'primary', 'url' => '/sgce/admin/gerar_melhor_volante.php'],
            'estreante' => ['titulo' => 'Melhor Estreante', 'icone' => 'fas fa-user-plus', 'cor' => 'success', 'url' => '/sgce/admin/gerar_melhor_estreante.php'],
            'zagueiro' => ['titulo' => 'Melhor Zagueiro', 'icone' => 'fas fa-shield', 'cor' => 'info', 'url' => '/sgce/admin/gerar_melhor_zagueiro.php'],
            'melhor' => ['titulo' => 'Melhor da Partida', 'icone' => 'fas fa-medal', 'cor' => 'secondary', 'url' => '/sgce/admin/gerar_melhor_da_partida.php']
        ];

        foreach ($categorias_ui as $categoria => $info) {
            $columns = $categoria_to_column[$categoria];
            $id_jogador_salvo = $partida[$columns['id_column']] ?? null;
            $id_foto_salvo = $partida[$columns['id_foto_column']] ?? null;
            $tem_dados_salvos = !empty($id_jogador_salvo) && !empty($id_foto_salvo);
            $classe_botao = $tem_dados_salvos ? '' : 'btn-disabled';
            $texto_botao = $tem_dados_salvos ? strtoupper($info['titulo']) : strtoupper($info['titulo']) . ' (Não Configurado)';
        ?>
            <div class="col-xl-3 col-md-6 mb-4">
                <form action="<?= $info['url'] ?>" method="POST" target="_blank" enctype="multipart/form-data" <?= $tem_dados_salvos ? '' : 'style="pointer-events: none;"' ?>>
                    <input type="hidden" name="id_partida" value="<?= $id_partida ?>">
                    <input type="hidden" name="id_equipe_a" value="<?= $partida['id_equipe_a'] ?>">
                    <input type="hidden" name="id_equipe_b" value="<?= $partida['id_equipe_b'] ?>">
                    <input type="hidden" name="nome_campeonato" value="<?= htmlspecialchars($partida['nome_campeonato']) ?>">
                    <input type="hidden" name="rodada" value="<?= htmlspecialchars($partida['rodada']) ?>">
                    <input type="hidden" name="placar" value="<?= htmlspecialchars($partida['placar_equipe_a'] . ' x ' . $partida['placar_equipe_b']) ?>">
                    <input type="hidden" name="categoria" value="<?= $categoria ?>">
                    <input type="hidden" name="id_jogador" value="<?= $id_jogador_salvo ?>">
                    <input type="hidden" name="foto_selecionada" value="<?= htmlspecialchars($id_foto_salvo) ?>">
                    <button type="submit" class="card border-left-<?= $info['cor'] ?> shadow h-100 w-100 py-2 border-0 btn-gerar-arte <?= $classe_botao ?>">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs fw-bold text-<?= $info['cor'] ?> text-uppercase mb-1 text-start"><?= $texto_botao ?></div>
                                    <?php if (!$tem_dados_salvos): ?>
                                        <small class="text-muted">Aguarde ...</small>
                                    <?php endif; ?>
                                </div>
                                <div class="col-auto"><i class="<?= $info['icone'] ?> fa-2x text-<?= $info['cor'] ?>"></i></div>
                            </div>
                        </div>
                    </button>
                </form>
            </div>
        <?php
        }

        // Botão para Confronto (sempre disponível, usa goleadores)
        ?>
        <div class="col-xl-3 col-md-6 mb-4">
            <form action="/sgce/admin/gerar_arte_confronto.php" method="POST" target="_blank">
                <input type="hidden" name="id_partida" value="<?= $id_partida ?>">
                <input type="hidden" name="id_equipe_a" value="<?= $partida['id_equipe_a'] ?>">
                <input type="hidden" name="id_equipe_b" value="<?= $partida['id_equipe_b'] ?>">
                <input type="hidden" name="nome_campeonato" value="<?= htmlspecialchars($partida['nome_campeonato']) ?>">
                <input type="hidden" name="rodada" value="<?= htmlspecialchars($partida['rodada']) ?>">
                <input type="hidden" name="placar" value="<?= htmlspecialchars($partida['placar_equipe_a'] . ' x ' . $partida['placar_equipe_b']) ?>">
                <?php foreach ($goleadores_a as $goleador): ?>
                    <input type="hidden" name="goleadores_a[]" value="<?= $goleador['nome'] . ':' . $goleador['gols'] ?>">
                <?php endforeach; ?>
                <?php foreach ($goleadores_b as $goleador): ?>
                    <input type="hidden" name="goleadores_b[]" value="<?= $goleador['nome'] . ':' . $goleador['gols'] ?>">
                <?php endforeach; ?>
                <button type="submit" class="card border-left-dark shadow h-100 w-100 py-2 border-0 btn-gerar-confronto">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs fw-bold text-dark text-uppercase mb-1 text-start">CONFRONTO</div>
                            </div>
                            <div class="col-auto"><i class="fas fa-arrows-alt-h fa-2x text-dark"></i></div>
                        </div>
                    </div>
                </button>
            </form>
        </div>
    </div>
</main>

<?php require_once '../sgce/includes/footer_dashboard.php'; ?>