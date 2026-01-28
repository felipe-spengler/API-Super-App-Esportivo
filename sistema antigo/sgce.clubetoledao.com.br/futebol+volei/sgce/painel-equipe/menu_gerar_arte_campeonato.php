<?php
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php';
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);




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

// Fetch championship details, including all melhor columns
try {
    $stmt_campeonato = $pdo->prepare("
        SELECT c.id, c.nome as nome_campeonato, c.id_campeonato_pai,
               c.id_melhor_jogador, c.id_foto_selecionada_melhor_jogador,
               c.id_melhor_goleiro, c.id_foto_selecionada_melhor_goleiro,
               c.id_melhor_lateral, c.id_foto_selecionada_melhor_lateral,
               c.id_melhor_meia, c.id_foto_selecionada_melhor_meia,
               c.id_melhor_atacante, c.id_foto_selecionada_melhor_atacante,
               c.id_melhor_artilheiro, c.id_foto_selecionada_melhor_artilheiro,
               c.id_melhor_assistencia, c.id_foto_selecionada_melhor_assistencia,
               c.id_melhor_volante, c.id_foto_selecionada_melhor_volante,
               c.id_melhor_estreante, c.id_foto_selecionada_melhor_estreante,
               c.id_melhor_zagueiro, c.id_foto_selecionada_melhor_zagueiro,
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

// Function to fetch team IDs for a player
function getTeamIdsForPlayer($pdo, $id_jogador, $id_categoria) {
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

        // Try to fetch match details (assuming a match is linked to the player's selection)
        $stmt_match = $pdo->prepare("
            SELECT p.id_equipe_a, p.id_equipe_b
            FROM partidas p
            WHERE p.id_campeonato = ? AND (p.id_equipe_a = ? or p.id_equipe_b=?)
            LIMIT 1
        ");
        $stmt_match->execute([$id_categoria, $id_equipe,$id_equipe]);
        $match = $stmt_match->fetch(PDO::FETCH_ASSOC);

        if ($match) {
            return [
                'id_equipe_a' => $match['id_equipe_a'],
                'id_equipe_b' => $match['id_equipe_b']
            ];
        } elseif ($id_equipe) {
            // If no match is found, use the player's team ID for both fields
            return [
                'id_equipe_a' => $id_equipe,
                'id_equipe_b' => $id_equipe
            ];
        } else {
            return [
                'id_equipe_a' => null,
                'id_equipe_b' => null
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

// --- INÍCIO DA RENDERIZAÇÃO DO HTML ---
require_once '../includes/header.php';
require_once 'sidebar_equipe.php';

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
</style>


<main class="container py-5">
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 class="h2"><i class="fas fa-image fa-fw me-2"></i>Gerar Artes para <?= htmlspecialchars($campeonato['nome_campeonato']) ?></h1>
        <a href="campeonato.php?id=<?= htmlspecialchars($id_categoria) ?>" class="btn btn-outline-secondary btn-sm"><i class="fas fa-arrow-left me-1"></i> Voltar</a>
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
        // Mapa de categorias para colunas na tabela campeonatos
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
            'craque' => ['titulo' => 'Craque do Campeonato', 'icone' => 'fas fa-star', 'cor' => 'primary', 'url' => '/sgce/admin/gerar_arte_craque.php'],
            'goleiro' => ['titulo' => 'Melhor Goleiro', 'icone' => 'fas fa-hand-paper', 'cor' => 'success', 'url' => '/sgce/admin/gerar_melhor_goleiro.php'],
            'lateral' => ['titulo' => 'Melhor Lateral', 'icone' => 'fas fa-running', 'cor' => 'info', 'url' => '/sgce/admin/gerar_melhor_lateral.php'],
            'meia' => ['titulo' => 'Melhor Meia', 'icone' => 'fas fa-futbol', 'cor' => 'warning', 'url' => '/sgce/admin/gerar_melhor_meia.php'],
            'atacante' => ['titulo' => 'Melhor Atacante', 'icone' => 'fas fa-bullseye', 'cor' => 'danger', 'url' => '/sgce/admin/gerar_melhor_atacante.php'],
            'artilheiro' => ['titulo' => 'Melhor Artilheiro', 'icone' => 'fas fa-trophy', 'cor' => 'dark', 'url' => '/sgce/admin/gerar_melhor_artilheiro.php'],
            'assistencia' => ['titulo' => 'Melhor Assistência', 'icone' => 'fas fa-hands-helping', 'cor' => 'secondary', 'url' => '/sgce/admin/gerar_melhor_assistencia.php'],
            'volante' => ['titulo' => 'Melhor Volante', 'icone' => 'fas fa-shield-alt', 'cor' => 'primary', 'url' => '/sgce/admin/gerar_melhor_volante.php'],
            'estreante' => ['titulo' => 'Melhor Estreante', 'icone' => 'fas fa-user-plus', 'cor' => 'success', 'url' => '/sgce/admin/gerar_melhor_estreante.php'],
            'zagueiro' => ['titulo' => 'Melhor Zagueiro', 'icone' => 'fas fa-shield', 'cor' => 'info', 'url' => '/sgce/admin/gerar_melhor_zagueiro.php'],
            'melhor' => ['titulo' => 'Melhor do Campeonato', 'icone' => 'fas fa-medal', 'cor' => 'secondary', 'url' => '/sgce/admin/gerar_melhor_da_partida.php']
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
            </div>
        <?php
        }
        ?>
    </div>
</main>

<?php require_once '../includes/footer_dashboard.php'; ?>