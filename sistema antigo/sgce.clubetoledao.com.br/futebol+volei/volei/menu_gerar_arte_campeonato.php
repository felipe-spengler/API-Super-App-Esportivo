<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require_once '../sgce/includes/db.php';


// Start session safely
if (session_status() === PHP_SESSION_NONE) {
    if (headers_sent($file, $line)) {
        error_log("Headers already sent in $file on line $line");
        http_response_code(500);
        die("Server error: Session cannot be started.");
    }
    session_start();
}

// Validate id_categoria from GET
$id_categoria = isset($_GET['id_categoria']) ? filter_var($_GET['id_categoria'], FILTER_VALIDATE_INT) : null;
if (!$id_categoria) {
    $_SESSION['notificacao'] = [
        'tipo' => 'error',
        'mensagem' => 'ID do campeonato inválido.'
    ];
    ?>
    <script>
        window.history.back();
    </script>
    <?php
    exit;
}

// Fetch championship details, including all volleyball-specific melhor columns
try {
    $stmt_campeonato = $pdo->prepare("
        SELECT c.id, c.nome as nome_campeonato, c.id_campeonato_pai,
                 c.id_melhor_jogador, c.id_foto_selecionada_melhor_jogador, -- Manter para compatibilidade com outros esportes/categoria principal
                 -- Novas colunas de Vôlei: CORRIGIDO para coincidir com os nomes curtos
                 c.id_melhor_levantadora, c.id_foto_melhor_levantadora AS id_foto_selecionada_melhor_levantadora,
                 c.id_melhor_libero, c.id_foto_melhor_libero AS id_foto_selecionada_melhor_libero,
                 c.id_melhor_oposta, c.id_foto_melhor_oposta AS id_foto_selecionada_melhor_oposta,
                 c.id_melhor_ponteira, c.id_foto_melhor_ponteira AS id_foto_selecionada_melhor_ponteira,
                 c.id_melhor_central, c.id_foto_melhor_central AS id_foto_selecionada_melhor_central,
                 c.id_maior_pontuador, c.id_foto_maior_pontuador AS id_foto_selecionada_maior_pontuador,
                 c.id_melhor_saque, c.id_foto_melhor_saque AS id_foto_selecionada_melhor_saque,
                 c.id_melhor_bloqueio, c.id_foto_melhor_bloqueio AS id_foto_selecionada_melhor_bloqueio,
                 c.id_melhor_estreante, c.id_foto_melhor_estreante AS id_foto_selecionada_melhor_estreante,
                 -- Fim das colunas de Vôlei
                 cp.nome as nome_campeonato_pai
        FROM campeonatos c
        LEFT JOIN campeonatos cp ON c.id_campeonato_pai = cp.id
        WHERE c.id = ?
    ");
    $stmt_campeonato->execute([$id_categoria]);
    $campeonato = $stmt_campeonato->fetch(PDO::FETCH_ASSOC);

    if (!$campeonato) {
        error_log("Campeonato não encontrado. ID: $id_categoria");
        $_SESSION['notificacao'] = [
            'tipo' => 'error',
            'mensagem' => 'Campeonato não encontrado.'
        ];
        ?>
        <script>
            window.history.back();
        </script>
        <?php
        exit;
    }
} catch (PDOException $e) {
    error_log("Erro na consulta de campeonato: " . $e->getMessage());
    $_SESSION['notificacao'] = [
        'tipo' => 'error',
        'mensagem' => 'Erro ao carregar dados do campeonato.'
    ];
    header('Location: campeonato.php?id=' . urlencode($id_categoria));
    exit;
} catch (Exception $e) {
    error_log("Unexpected error: " . $e->getMessage());
    http_response_code(500);
    die("Server error: Unexpected issue occurred.");
}

// Fetch matches for the championship, including player and photo data for craque
try {
    $stmt_matches = $pdo->prepare("
        SELECT p.id, p.fase, p.rodada, p.placar_equipe_a, p.placar_equipe_b,
               a.nome as nome_equipe_a, b.nome as nome_equipe_b,
               a.id as id_equipe_a, b.id as id_equipe_b,
               p.id_melhor_jogador, p.id_foto_selecionada_melhor_jogador
        FROM partidas p
        JOIN equipes a ON p.id_equipe_a = a.id
        JOIN equipes b ON p.id_equipe_b = b.id
        WHERE p.id_campeonato = ? AND p.id_melhor_jogador IS NOT NULL
        ORDER BY p.rodada, p.id
    ");
    $stmt_matches->execute([$id_categoria]);
    $matches = $stmt_matches->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    error_log("Erro na consulta de partidas: " . $e->getMessage());
    $matches = [];
    $_SESSION['notificacao'] = [
        'tipo' => 'error',
        'mensagem' => 'Erro ao carregar partidas do campeonato.'
    ];
}

// Function to fetch team IDs for a player
function getTeamIdsForPlayer($pdo, $id_jogador, $id_categoria) {
    if (empty($id_jogador)) {
        return ['id_equipe_a' => null, 'id_equipe_b' => null];
    }
    
    try {
        // Fetch the player's team ID
        $stmt = $pdo->prepare("
            SELECT p.id_equipe
            FROM participantes p
            WHERE p.id = ?
        ");
        $stmt->execute([$id_jogador]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $id_equipe = $result ? $result['id_equipe'] : null;

        if (!$id_equipe) {
             // If team ID is null, try to find a match where the player was the "craque"
             $stmt_match = $pdo->prepare("
                 SELECT a.id as id_equipe_a, b.id as id_equipe_b
                 FROM partidas p
                 JOIN equipes a ON p.id_equipe_a = a.id
                 JOIN equipes b ON p.id_equipe_b = b.id
                 WHERE p.id_campeonato = ? AND p.id_melhor_jogador = ?
                 LIMIT 1
               ");
             $stmt_match->execute([$id_categoria, $id_jogador]);
             $match = $stmt_match->fetch(PDO::FETCH_ASSOC);

             if ($match) {
                 // Determine which team the player belongs to by checking the teams in the match
                 // This is a workaround since we don't have the player's team ID from 'participantes'
                 // For static arts, we'll use both team IDs from the match as a placeholder.
                 return [
                     'id_equipe_a' => $match['id_equipe_a'],
                     'id_equipe_b' => $match['id_equipe_b']
                 ];
             } else {
                 return [
                     'id_equipe_a' => null,
                     'id_equipe_b' => null
                 ];
             }
        }
        
        // Try to fetch match details for the player's team
        $stmt_match = $pdo->prepare("
            SELECT p.id_equipe_a, p.id_equipe_b
            FROM partidas p
            WHERE p.id_campeonato = ? AND (p.id_equipe_a = ? OR p.id_equipe_b = ?)
            LIMIT 1
        ");
        $stmt_match->execute([$id_categoria, $id_equipe, $id_equipe]);
        $match = $stmt_match->fetch(PDO::FETCH_ASSOC);

        if ($match) {
            return [
                'id_equipe_a' => $match['id_equipe_a'],
                'id_equipe_b' => $match['id_equipe_b']
            ];
        } else {
            // Fallback for players not in any match yet, use the team id as both A and B to fetch team details later
            return [
                'id_equipe_a' => $id_equipe,
                'id_equipe_b' => $id_equipe
            ];
        }
    } catch (PDOException $e) {
        error_log("Erro ao buscar IDs de equipe para jogador $id_jogador: " . $e->getMessage());
        return [
            'id_equipe_a' => null,
            'id_equipe_b' => null
        ];
    }
}

require_once '../sgce/includes/header.php';
?>

<style>
    .btn-gerar-arte:hover:not(.btn-disabled) {
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
    /* Estilos adicionais para as cores e ícones do vôlei (AJUSTADOS CONFORME SUAS CORES) */
    
    /* Azul Claro - Levantadora/Bloqueio */
    .border-left-vol-blue { border-left: 0.25rem solid #007bff !important; }
    .text-vol-blue { color: #007bff !important; }
    
    /* Verde - Ponteira/Estreante */
    .border-left-vol-green { border-left: 0.25rem solid #28a745 !important; }
    .text-vol-green { color: #28a745 !important; }
    
    /* Vermelho - Líbero */
    .border-left-vol-red { border-left: 0.25rem solid #dc3545 !important; }
    .text-vol-red { color: #dc3545 !important; }
    
    /* Laranja (similar ao amarelo da imagem) - Oposta */
    .border-left-vol-orange { border-left: 0.25rem solid #fd7e14 !important; }
    .text-vol-orange { color: #fd7e14 !important; }
    
    /* Ciano/Azul Turquesa - Central */
    .border-left-vol-cyan { border-left: 0.25rem solid #17a2b8 !important; }
    .text-vol-cyan { color: #17a2b8 !important; }
    
    /* Preto - Craque/Pontuador Geral/Saque */
    .border-left-vol-dark { border-left: 0.25rem solid #343a40 !important; }
    .text-vol-dark { color: #343a40 !important; }
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
        <h1 class="h2"><i class="fas fa-image fa-fw me-2"></i>Gerar Artes para <?= htmlspecialchars($campeonato['nome_campeonato']) ?></h1>
        <a href="javascript:history.back()" class="btn btn-outline-secondary btn-sm"><i class="fas fa-arrow-left me-1"></i> Voltar</a>
    </div>

    <?php if (isset($_SESSION['notificacao'])): ?>
        <div class="alert alert-<?= $_SESSION['notificacao']['tipo'] ?> alert-dismissible fade show" role="alert">
            <?= htmlspecialchars($_SESSION['notificacao']['mensagem']) ?>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
        <?php unset($_SESSION['notificacao']); ?>
    <?php endif; ?>

    <div class="modal fade" id="matchSelectionModal" tabindex="-1" aria-labelledby="matchSelectionModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="matchSelectionModalLabel">Selecionar Partida (Craque do Jogo)</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <form id="matchSelectionForm" action="/sgce/admin/gerar_arte_craque.php" method="POST" target="_blank" enctype="multipart/form-data">
                        <input type="hidden" name="id_categoria" value="<?= $id_categoria ?>">
                        <input type="hidden" name="nome_campeonato" value="<?= htmlspecialchars($campeonato['nome_campeonato']) ?>">
                        <input type="hidden" name="categoria" value="craque">
                        <input type="hidden" name="id_jogador" id="id_jogador" value="">
                        <input type="hidden" name="foto_selecionada" id="foto_selecionada" value="">
                        <input type="hidden" name="id_equipe_a" id="id_equipe_a" value="">
                        <input type="hidden" name="id_equipe_b" id="id_equipe_b" value="">
                        <input type="hidden" name="placar" id="placar" value="">
                        <input type="hidden" name="rodada" id="rodada" value="">
                        <div class="mb-3">
                            <label for="id_partida" class="form-label">Escolha a partida:</label>
                            <select class="form-select" id="id_partida" name="id_partida" required>
                                <option value="" disabled selected>Selecione uma partida</option>
                                <?php foreach ($matches as $match): ?>
                                    <option value="<?= $match['id'] ?>" 
                                            data-equipe-a="<?= htmlspecialchars($match['id_equipe_a'] ?? '') ?>" 
                                            data-equipe-b="<?= htmlspecialchars($match['id_equipe_b'] ?? '') ?>"
                                            data-jogador="<?= htmlspecialchars($match['id_melhor_jogador'] ?? '') ?>"
                                            data-foto="<?= htmlspecialchars($match['id_foto_selecionada_melhor_jogador'] ?? '') ?>"
                                            data-placar="<?= htmlspecialchars($match['placar_equipe_a'] . ' x ' . $match['placar_equipe_b']) ?>"
                                            data-rodada="<?= htmlspecialchars($match['rodada']) ?>">
                                        <?= htmlspecialchars("{$match['nome_equipe_a']} {$match['placar_equipe_a']} x {$match['placar_equipe_b']} {$match['nome_equipe_b']} ({$match['rodada']} - {$match['fase']})") ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary" form="matchSelectionForm">Gerar Arte</button>
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <?php
        // 🚨 NOVO MAPA DE CATEGORIAS PARA VÔLEI
        // Mapeia a chave da UI para as colunas de ID do jogador e ID da foto na tabela 'campeonatos'
        $categoria_to_column = [
            'craque' => ['id_column' => 'id_melhor_jogador', 'id_foto_column' => 'id_foto_selecionada_melhor_jogador'],
            'levantadora' => ['id_column' => 'id_melhor_levantadora', 'id_foto_column' => 'id_foto_selecionada_melhor_levantadora'],
            'libero' => ['id_column' => 'id_melhor_libero', 'id_foto_column' => 'id_foto_selecionada_melhor_libero'],
            'oposta' => ['id_column' => 'id_melhor_oposta', 'id_foto_column' => 'id_foto_selecionada_melhor_oposta'],
            'ponteira' => ['id_column' => 'id_melhor_ponteira', 'id_foto_column' => 'id_foto_selecionada_melhor_ponteira'],
            'central' => ['id_column' => 'id_melhor_central', 'id_foto_column' => 'id_foto_selecionada_melhor_central'],
            'pontuador' => ['id_column' => 'id_maior_pontuador', 'id_foto_column' => 'id_foto_selecionada_maior_pontuador'],
            'saque' => ['id_column' => 'id_melhor_saque', 'id_foto_column' => 'id_foto_selecionada_melhor_saque'],
            'bloqueio' => ['id_column' => 'id_melhor_bloqueio', 'id_foto_column' => 'id_foto_selecionada_melhor_bloqueio'],
            'estreante' => ['id_column' => 'id_melhor_estreante', 'id_foto_column' => 'id_foto_selecionada_melhor_estreante'],
        ];

        // 🚨 NOVO ARRAY DE CATEGORIAS DE VÔLEI PARA UI (Com cores AJUSTADAS)
        $categorias_ui = [
            // Craque do Jogo -> PRETO (#343a40)
            'craque' => ['titulo' => 'Craque do Jogo', 'icone' => 'fas fa-star', 'cor' => 'vol-dark', 'url' => '/sgce/admin/gerar_arte_craque.php'], 
            // Melhor Levantadora -> AZUL CLARO (#007bff)
            'levantadora' => ['titulo' => 'Melhor Levantadora', 'icone' => 'fas fa-hand-sparkles', 'cor' => 'vol-blue', 'url' => '/sgce/admin/gerar_melhor_levantadora.php'], 
            // Melhor Líbero -> VERMELHO (#dc3545)
            'libero' => ['titulo' => 'Melhor Líbero', 'icone' => 'fas fa-shield-alt', 'cor' => 'vol-red', 'url' => '/sgce/admin/gerar_melhor_libero.php'], 
            // Melhor Oposta -> LARANJA (#fd7e14)
            'oposta' => ['titulo' => 'Melhor Oposta', 'icone' => 'fas fa-bullseye', 'cor' => 'vol-orange', 'url' => '/sgce/admin/gerar_melhor_oposta.php'], 
            // Melhor Ponteira -> VERDE (#28a745)
            'ponteira' => ['titulo' => 'Melhor Ponteira', 'icone' => 'fas fa-running', 'cor' => 'vol-green', 'url' => '/sgce/admin/gerar_melhor_ponteira.php'], 
            // Melhor Central -> CIANO (#17a2b8)
            'central' => ['titulo' => 'Melhor Central', 'icone' => 'fas fa-broadcast-tower', 'cor' => 'vol-cyan', 'url' => '/sgce/admin/gerar_melhor_central.php'], 
            // Maior Pontuador Geral -> PRETO (#343a40)
            'pontuador' => ['titulo' => 'Maior Pontuador Geral', 'icone' => 'fas fa-trophy', 'cor' => 'vol-dark', 'url' => '/sgce/admin/gerar_maior_pontuador.php'], 
            // Maior Pontuadora em Saque -> PRETO (#343a40)
            'saque' => ['titulo' => 'Maior Pontuadora em Saque', 'icone' => 'fas fa-volleyball-ball', 'cor' => 'vol-dark', 'url' => '/sgce/admin/gerar_melhor_saque.php'], 
            // Melhor Bloqueio -> AZUL CLARO (#007bff)
            'bloqueio' => ['titulo' => 'Melhor Bloqueio', 'icone' => 'fas fa-hand-paper', 'cor' => 'vol-blue', 'url' => '/sgce/admin/gerar_melhor_bloqueio.php'], 
            // Melhor Estreante -> VERDE (#28a745)
            'estreante' => ['titulo' => 'Melhor Estreante', 'icone' => 'fas fa-user-plus', 'cor' => 'vol-green', 'url' => '/sgce/admin/gerar_melhor_estreante.php'], 
        ];

        foreach ($categorias_ui as $categoria => $info) {
            $columns = $categoria_to_column[$categoria];
            $id_jogador_salvo = $campeonato[$columns['id_column']] ?? null;
            $id_foto_salvo = $campeonato[$columns['id_foto_column']] ?? null;

            $tem_dados_salvos = !empty($id_jogador_salvo) && !empty($id_foto_salvo);
            $classe_botao = $tem_dados_salvos ? '' : 'btn-disabled';
            $texto_botao = $tem_dados_salvos ? strtoupper($info['titulo']) : strtoupper($info['titulo']) . ' (Não Configurado)';

            // Fetch team IDs for the player
            $team_ids = getTeamIdsForPlayer($pdo, $id_jogador_salvo, $id_categoria);
            $id_equipe_a = $team_ids['id_equipe_a'] ?? '';
            $id_equipe_b = $team_ids['id_equipe_b'] ?? '';
        ?>
            <div class="col-xl-3 col-md-6 mb-4">
                <?php if ($categoria === 'craque'): ?>
                    <button type="button" class="card border-left-<?= $info['cor'] ?> shadow h-100 w-100 py-2 border-0 btn-gerar-arte <?= $classe_botao ?>" 
                            data-bs-toggle="<?= $tem_dados_salvos ? 'modal' : '' ?>" 
                            data-bs-target="<?= $tem_dados_salvos ? '#matchSelectionModal' : '' ?>" 
                            <?= $tem_dados_salvos ? '' : 'style="pointer-events: none;"' ?>>
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs fw-bold text-<?= $info['cor'] ?> text-uppercase mb-1 text-start"><?= $texto_botao ?></div>
                                    <?php if (!$tem_dados_salvos): ?>
                                        <small class="text-muted">Configure o jogador e a foto primeiro</small>
                                    <?php endif; ?>
                                </div>
                                <div class="col-auto"><i class="<?= $info['icone'] ?> fa-2x text-<?= $info['cor'] ?>"></i></div>
                            </div>
                        </div>
                    </button>
                <?php else: ?>
                    <form action="<?= $info['url'] ?>" method="POST" target="_blank" enctype="multipart/form-data" <?= $tem_dados_salvos ? '' : 'style="pointer-events: none;"' ?>>
                        <input type="hidden" name="id_categoria" value="<?= $id_categoria ?>">
                        <input type="hidden" name="nome_campeonato" value="<?= htmlspecialchars($campeonato['nome_campeonato']) ?>">
                        <input type="hidden" name="categoria" value="<?= $categoria ?>">
                        <input type="hidden" name="id_jogador" value="<?= $id_jogador_salvo ?>">
                        <input type="hidden" name="foto_selecionada" value="<?= htmlspecialchars($id_foto_salvo) ?>">
                        <input type="hidden" name="id_equipe_a" value="<?= htmlspecialchars($id_equipe_a) ?>">
                        <input type="hidden" name="id_equipe_b" value="<?= htmlspecialchars($id_equipe_b) ?>">
                        <button type="submit" class="card border-left-<?= $info['cor'] ?> shadow h-100 w-100 py-2 border-0 btn-gerar-arte <?= $classe_botao ?>">
                            <div class="card-body">
                                <div class="row no-gutters align-items-center">
                                    <div class="col mr-2">
                                        <div class="text-xs fw-bold text-<?= $info['cor'] ?> text-uppercase mb-1 text-start"><?= $texto_botao ?></div>
                                        <?php if (!$tem_dados_salvos): ?>
                                            <small class="text-muted">Configure o jogador e a foto primeiro</small>
                                        <?php endif; ?>
                                    </div>
                                    <div class="col-auto"><i class="<?= $info['icone'] ?> fa-2x text-<?= $info['cor'] ?>"></i></div>
                                </div>
                            </div>
                        </button>
                    </form>
                <?php endif; ?>
            </div>
        <?php
        }
        ?>
    </div>
</main>

<script>
document.addEventListener('DOMContentLoaded', function () {
    const matchSelect = document.getElementById('id_partida');
    const form = document.getElementById('matchSelectionForm');
    const equipeAInput = form.querySelector('input[name="id_equipe_a"]');
    const equipeBInput = form.querySelector('input[name="id_equipe_b"]');
    const jogadorInput = form.querySelector('input[name="id_jogador"]');
    const fotoInput = form.querySelector('input[name="foto_selecionada"]');
    const placarInput = form.querySelector('input[name="placar"]');
    const rodadaInput = form.querySelector('input[name="rodada"]');

    if (matchSelect) {
        matchSelect.addEventListener('change', function () {
            const selectedOption = matchSelect.options[matchSelect.selectedIndex];
            equipeAInput.value = selectedOption.getAttribute('data-equipe-a') || '';
            equipeBInput.value = selectedOption.getAttribute('data-equipe-b') || '';
            jogadorInput.value = selectedOption.getAttribute('data-jogador') || '';
            fotoInput.value = selectedOption.getAttribute('data-foto') || '';
            placarInput.value = selectedOption.getAttribute('data-placar') || '';
            rodadaInput.value = selectedOption.getAttribute('data-rodada') || '';
        });
    }
});
</script>

<?php require_once '../sgce/includes/footer_dashboard.php'; ?>