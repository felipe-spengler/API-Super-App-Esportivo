<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

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
    header('Location: menu_partida.php?id_partida=' . $id_partida);
    exit;
}

// Fetch match details and associated championship
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
        WHERE p.id = ? AND p.status = 'Finalizada'
    ");
    $stmt_partida->execute([$id_partida]);
    $partida = $stmt_partida->fetch(PDO::FETCH_ASSOC);

    if (!$partida) {
        error_log("Partida não encontrada ou não finalizada. ID: $id_partida");
        $_SESSION['notificacao'] = [
            'tipo' => 'error',
            'mensagem' => 'Partida não encontrada ou não finalizada.'
        ];
        header('Location: menu_partida.php?id_partida=' . $id_partida);
        exit;
    }
} catch (PDOException $e) {
    error_log("Erro na consulta de partida: " . $e->getMessage());
    $_SESSION['notificacao'] = [
        'tipo' => 'error',
        'mensagem' => 'Erro ao carregar dados da partida.'
    ];
    header('Location: menu_partida.php?id_partida=' . $id_partida);
    exit;
}

// Fetch all participants from both teams with their photos and team info
try {
    $stmt_participantes = $pdo->prepare("
        SELECT p.id, p.nome_completo, p.apelido, p.id_equipe, fp.id as foto_id, fp.src as foto_src
        FROM participantes p
        LEFT JOIN fotos_participantes fp ON p.id = fp.participante_id
        WHERE p.id_equipe IN (?, ?)
        ORDER BY p.nome_completo ASC
    ");
    $stmt_participantes->execute([$partida['id_equipe_a'], $partida['id_equipe_b']]);
    $participantes = [];
    $participantes_a = [];
    $participantes_b = [];
    $rows = $stmt_participantes->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $row) {
        $participante_id = $row['id'];
        if (!isset($participantes[$participante_id])) {
            $participantes[$participante_id] = [
                'id' => $row['id'],
                'nome_completo' => $row['nome_completo'],
                'apelido' => $row['apelido'],
                'id_equipe' => $row['id_equipe'],
                'fotos' => []
            ];
        }
        if ($row['foto_id']) {
            $participantes[$participante_id]['fotos'][] = [
                'id' => $row['foto_id'],
                'src' => $row['foto_src']
            ];
        }
    }

    // Split participants by team
    foreach ($participantes as $id => $p) {
        if ($p['id_equipe'] == $partida['id_equipe_a']) {
            $participantes_a[$id] = $p;
        } elseif ($p['id_equipe'] == $partida['id_equipe_b']) {
            $participantes_b[$id] = $p;
        }
    }
} catch (PDOException $e) {
    error_log("Erro na consulta de participantes: " . $e->getMessage());
    $_SESSION['notificacao'] = [
        'tipo' => 'error',
        'mensagem' => 'Erro ao carregar participantes da partida.'
    ];
    header('Location: menu_partida.php?id_partida=' . $id_partida);
    exit;
}

// Fetch goal scorers from sumulas_eventos table
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
        $nome_display = $nome_base . ($goleador['num_gols'] > 1 ? ' (' . $goleador['num_gols'] . ' gols)' : '');
        if ($goleador['id_equipe'] == $partida['id_equipe_a']) {
            $goleadores_a[] = [
                'id' => $goleador['id_participante'],
                'nome' => htmlspecialchars($nome_base),
                'display' => htmlspecialchars($nome_display),
                'gols' => (int)$goleador['num_gols']
            ];
        } elseif ($goleador['id_equipe'] == $partida['id_equipe_b']) {
            $goleadores_b[] = [
                'id' => $goleador['id_participante'],
                'nome' => htmlspecialchars($nome_base),
                'display' => htmlspecialchars($nome_display),
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

require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonato <?php echo htmlspecialchars($partida['nome_campeonato_pai']); ?></a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos_categoria.php?id_campeonato=<?= htmlspecialchars($partida['id_campeonato_pai']) ?>">Gerenciar Categorias</a></li>
        <li class="breadcrumb-item"><a href="categoria.php?id_categoria=<?= htmlspecialchars($partida['id_campeonato']) ?>">Categoria <?= htmlspecialchars($partida['nome_campeonato']) ?></a></li>
        <li class="breadcrumb-item"><a href="confronto.php?id_categoria=<?= htmlspecialchars($partida['id_campeonato']) ?>">Partidas</a></li>
        <li class="breadcrumb-item active" aria-current="page">Gerar Artes - <?= htmlspecialchars($partida['nome_a'] . ' x ' . $partida['nome_b']) ?></li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-image fa-fw me-2"></i>Gerar Artes para <?= htmlspecialchars($partida['nome_a'] . ' x ' . $partida['nome_b'] . ' (' . $partida['fase'] . ')') ?></h1>
    <a href="confronto.php?id_categoria=<?= htmlspecialchars($partida['id_campeonato']) ?>" class="btn btn-outline-secondary btn-sm"><i class="fas fa-arrow-left me-1"></i> Voltar</a>
</div>

<style>
    .btn-gerar-arte:hover, .btn-gerar-confronto:hover {
        transform: scale(1.05);
        transition: transform 0.2s;
    }
    .foto-container {
        position: relative;
        display: inline-block;
        margin: 5px;
        text-align: center;
    }
    .foto-container img {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 5px;
        border: 1px solid #ccc;
    }
    .foto-container input[type="radio"]:checked + img {
        border: 2px solid #007bff;
    }
    .btn-excluir-foto {
        position: absolute;
        top: 2px;
        right: 2px;
        color: red;
        cursor: pointer;
        background: white;
        border-radius: 50%;
        padding: 2px 5px;
    }
</style>

<div class="row">
    <?php
    $categorias = [
        'craque' => ['titulo' => 'Craque do Jogo', 'icone' => 'fas fa-star', 'cor' => 'primary', 'url' => 'gerar_arte_craque.php'],
        'goleiro' => ['titulo' => 'Melhor Goleiro', 'icone' => 'fas fa-hand-paper', 'cor' => 'success', 'url' => 'gerar_melhor_goleiro.php'],
        'lateral' => ['titulo' => 'Melhor Lateral', 'icone' => 'fas fa-running', 'cor' => 'info', 'url' => 'gerar_melhor_lateral.php'],
        'meia' => ['titulo' => 'Melhor Meia', 'icone' => 'fas fa-futbol', 'cor' => 'warning', 'url' => 'gerar_melhor_meia.php'],
        'atacante' => ['titulo' => 'Melhor Atacante', 'icone' => 'fas fa-bullseye', 'cor' => 'danger', 'url' => 'gerar_melhor_atacante.php'],
        'artilheiro' => ['titulo' => 'Melhor Artilheiro', 'icone' => 'fas fa-trophy', 'cor' => 'dark', 'url' => 'gerar_melhor_artilheiro.php'],
        'assistencia' => ['titulo' => 'Melhor Assistência', 'icone' => 'fas fa-hands-helping', 'cor' => 'secondary', 'url' => 'gerar_melhor_assistencia.php'],
        'volante' => ['titulo' => 'Melhor Volante', 'icone' => 'fas fa-shield-alt', 'cor' => 'primary', 'url' => 'gerar_melhor_volante.php'],
        'estreante' => ['titulo' => 'Melhor Estreante', 'icone' => 'fas fa-user-plus', 'cor' => 'success', 'url' => 'gerar_melhor_estreante.php'],
        'zagueiro' => ['titulo' => 'Melhor Zagueiro', 'icone' => 'fas fa-shield', 'cor' => 'info', 'url' => 'gerar_melhor_zagueiro.php'],
        'melhor' => ['titulo' => 'Melhor da Partida', 'icone' => 'fas fa-medal', 'cor' => 'secondary', 'url' => 'gerar_melhor_da_partida.php']
    ];

    foreach ($categorias as $categoria => $info) {
    ?>
        <div class="col-xl-3 col-md-6 mb-4">
            <button class="card border-left-<?= $info['cor'] ?> shadow h-100 w-100 py-2 border-0 btn-gerar-arte"
                    data-bs-toggle="modal"
                    data-bs-target="#modalGerarArte<?= ucfirst($categoria) ?>"
                    data-categoria="<?= $categoria ?>"
                    title="Gerar Arte do <?= $info['titulo'] ?>">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs fw-bold text-<?= $info['cor'] ?> text-uppercase mb-1 text-start"><?= strtoupper($info['titulo']) ?></div>
                            <div class="h5 mb-0 fw-bold text-gray-800"></div>
                        </div>
                        <div class="col-auto"><i class="<?= $info['icone'] ?> fa-2x text-<?= $info['cor'] ?>"></i></div>
                    </div>
                </div>
            </button>
        </div>
    <?php
    }
    ?>

    <!-- Botão para Confronto -->
    <div class="col-xl-3 col-md-6 mb-4">
        <button class="card border-left-dark shadow h-100 w-100 py-2 border-0 btn-gerar-confronto"
                data-bs-toggle="modal"
                data-bs-target="#modalGerarArteConfronto"
                title="Gerar Arte do Confronto">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-dark text-uppercase mb-1 text-start">CONFRONTO</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-arrows-alt-h fa-2x text-dark"></i></div>
                </div>
            </div>
        </button>
    </div>
</div>

<!-- Modais para Geração de Arte -->
<?php
foreach ($categorias as $categoria => $info) {
    $modal_id = "modalGerarArte" . ucfirst($categoria);
?>
<div class="modal fade" id="<?= $modal_id ?>" tabindex="-1" aria-labelledby="<?= $modal_id ?>Label" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="<?= $modal_id ?>Label">Gerar Arte para <?= $info['titulo'] ?></h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="formGerarArte_<?= $categoria ?>" action="<?php echo $info['url']; ?>" method="POST" target="_blank" enctype="multipart/form-data">
                <input type="hidden" name="id_partida" value="<?= $id_partida ?>">
                <input type="hidden" name="id_equipe_a" value="<?= $partida['id_equipe_a'] ?>">
                <input type="hidden" name="id_equipe_b" value="<?= $partida['id_equipe_b'] ?>">
                <input type="hidden" name="nome_campeonato" value="<?= htmlspecialchars($partida['nome_campeonato']) ?>">
                <input type="hidden" name="rodada" value="<?= htmlspecialchars($partida['rodada']) ?>">
                <input type="hidden" name="placar" value="<?= htmlspecialchars($partida['placar_equipe_a'] . ' x ' . $partida['placar_equipe_b']) ?>">
                <input type="hidden" name="categoria" value="<?= $categoria ?>">
                <input type="hidden" id="foto_selecionada_<?= $categoria ?>" name="foto_selecionada" value="">
                <div class="modal-body">
                    <p>Partida: <strong><?= htmlspecialchars($partida['nome_a'] . ' x ' . $partida['nome_b'] . ' (' . $partida['fase'] . ')') ?></strong></p>
                    <p>Placar da partida: <strong id="placarPartidaArte_<?= $categoria ?>"><?= htmlspecialchars($partida['placar_equipe_a'] . ' x ' . $partida['placar_equipe_b']) ?></strong></p>
                    
                    <!-- Seleção de Jogador -->
                    <div class="mb-3">
                        <label for="jogador_<?= $categoria ?>" class="form-label">Selecionar Jogador</label>
                        <select class="form-control" id="jogador_<?= $categoria ?>" name="id_jogador" required>
                            <option value="">Selecione um jogador</option>
                            <?php foreach ($participantes as $participante): ?>
                                <option value="<?= $participante['id'] ?>">
                                    <?= htmlspecialchars($participante['nome_completo'] . ($participante['apelido'] ? ' (' . $participante['apelido'] . ')' : '')) ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>

                    <!-- Lista de Fotos -->
                    <div id="fotos_jogador_<?= $categoria ?>" class="mt-3">
                        <?php foreach ($participantes as $participante): ?>
                            <div class="fotos-participante" data-participante-id="<?= $participante['id'] ?>" style="display: none;">
                                <?php if (empty($participante['fotos'])): ?>
                                    <p class="text-muted">Nenhuma foto disponível para este jogador.</p>
                                <?php else: ?>
                                    <?php foreach ($participante['fotos'] as $foto): ?>
                                        <div class="foto-container">
                                            <input type="radio" name="foto_selecionada_<?= $categoria ?>" value="<?= $foto['id'] ?>" id="foto_<?= $categoria ?>_<?= $foto['id'] ?>" data-src="/sgce/<?= htmlspecialchars($foto['src']) ?>">
                                            <img src="/sgce/<?= htmlspecialchars($foto['src']) ?>" alt="Foto do jogador" title="Foto ID: <?= $foto['id'] ?>">
                                            <i class="fas fa-times btn-excluir-foto" data-foto-id="<?= $foto['id'] ?>" data-categoria="<?= $categoria ?>" title="Excluir foto"></i>
                                        </div>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </div>
                        <?php endforeach; ?>
                    </div>

                    <!-- Botão para adicionar nova foto -->
                    <div class="mb-3">
                        <button type="button" class="btn btn-primary btn-sm" id="btnAdicionarFoto_<?= $categoria ?>">
                            <i class="fas fa-plus me-1"></i>Adicionar Foto
                        </button>
                        <input type="file" id="inputNovaFoto_<?= $categoria ?>" name="nova_foto" accept="image/*" style="display: none;">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btnGerarArte_<?= $categoria ?>">Gerar Arte</button>
                </div>
            </form>
        </div>
    </div>
</div>
<?php } ?>

<!-- Modal para Confronto -->
<div class="modal fade" id="modalGerarArteConfronto" tabindex="-1" aria-labelledby="modalGerarArteConfrontoLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalGerarArteConfrontoLabel">Gerar Arte do Confronto</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form id="formGerarArteConfronto" action="gerar_arte_confronto.php" method="POST" target="_blank">
                <input type="hidden" name="id_partida" value="<?= $id_partida ?>">
                <input type="hidden" name="id_equipe_a" value="<?= $partida['id_equipe_a'] ?>">
                <input type="hidden" name="id_equipe_b" value="<?= $partida['id_equipe_b'] ?>">
                <input type="hidden" name="nome_campeonato" value="<?= htmlspecialchars($partida['nome_campeonato']) ?>">
                <input type="hidden" name="rodada" value="<?= htmlspecialchars($partida['rodada']) ?>">
                <input type="hidden" name="placar" value="<?= htmlspecialchars($partida['placar_equipe_a'] . ' x ' . $partida['placar_equipe_b']) ?>">
                <div class="modal-body">
                    <p>Partida: <strong><?= htmlspecialchars($partida['nome_a'] . ' x ' . $partida['nome_b'] . ' (' . $partida['fase'] . ')') ?></strong></p>
                    <p>Placar da partida: <strong><?= htmlspecialchars($partida['placar_equipe_a'] . ' x ' . $partida['placar_equipe_b']) ?></strong></p>
                    
                    <!-- Goleadores Equipe A (Ocultos) -->
                    <div class="mb-3">
                        <label class="form-label">Goleadores da <?= htmlspecialchars($partida['nome_a']) ?></label>
                        <p id="goleadores_a_display">
                            <?php
                            if (empty($goleadores_a)) {
                                echo '<span class="text-muted">Nenhum goleador registrado.</span>';
                            } else {
                                $displays = array_column($goleadores_a, 'display');
                                echo implode(', ', $displays);
                            }
                            ?>
                        </p>
                        <?php foreach ($goleadores_a as $goleador): ?>
                            <input type="hidden" name="goleadores_a[]" value="<?= $goleador['nome'] . ':' . $goleador['gols'] ?>">
                        <?php endforeach; ?>
                    </div>

                    <!-- Goleadores Equipe B (Ocultos) -->
                    <div class="mb-3">
                        <label class="form-label">Goleadores da <?= htmlspecialchars($partida['nome_b']) ?></label>
                        <p id="goleadores_b_display">
                            <?php
                            if (empty($goleadores_b)) {
                                echo '<span class="text-muted">Nenhum goleador registrado.</span>';
                            } else {
                                $displays = array_column($goleadores_b, 'display');
                                echo implode(', ', $displays);
                            }
                            ?>
                        </p>
                        <?php foreach ($goleadores_b as $goleador): ?>
                            <input type="hidden" name="goleadores_b[]" value="<?= $goleador['nome'] . ':' . $goleador['gols'] ?>">
                        <?php endforeach; ?>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary" id="btnGerarArteConfronto">Gerar Arte</button>
                </div>
            </form>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
    <?php foreach ($categorias as $categoria => $info): ?>
        const formGerarArte_<?= $categoria ?> = document.getElementById('formGerarArte_<?= $categoria ?>');
        const selectJogador_<?= $categoria ?> = document.getElementById('jogador_<?= $categoria ?>');
        const fotosContainer_<?= $categoria ?> = document.getElementById('fotos_jogador_<?= $categoria ?>');
        const btnAdicionarFoto_<?= $categoria ?> = document.getElementById('btnAdicionarFoto_<?= $categoria ?>');
        const inputNovaFoto_<?= $categoria ?> = document.getElementById('inputNovaFoto_<?= $categoria ?>');
        const btnGerarArte_<?= $categoria ?> = document.getElementById('btnGerarArte_<?= $categoria ?>');
        const fotoSelecionadaInput_<?= $categoria ?> = document.getElementById('foto_selecionada_<?= $categoria ?>');

        // Exibir fotos do jogador selecionado
        function atualizarFotos_<?= $categoria ?>() {
            const jogadorId = selectJogador_<?= $categoria ?>?.value;
            const fotosParticipantes = fotosContainer_<?= $categoria ?>?.querySelectorAll('.fotos-participante');
            fotosParticipantes.forEach(fotos => {
                fotos.style.display = fotos.dataset.participanteId === jogadorId ? 'block' : 'none';
            });
            // Reset foto_selecionada when changing player
            fotoSelecionadaInput_<?= $categoria ?>.value = '';
            document.querySelectorAll(`input[name="foto_selecionada_<?= $categoria ?>"]`).forEach(radio => {
                radio.checked = false;
            });
        }

        selectJogador_<?= $categoria ?>?.addEventListener('change', atualizarFotos_<?= $categoria ?>);

        // Acionar input de arquivo ao clicar no botão de adicionar foto
        btnAdicionarFoto_<?= $categoria ?>?.addEventListener('click', () => {
            inputNovaFoto_<?= $categoria ?>?.click();
        });

        // Adicionar nova foto via AJAX
        inputNovaFoto_<?= $categoria ?>?.addEventListener('change', () => {
            const jogadorId = selectJogador_<?= $categoria ?>?.value;
            if (!jogadorId) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Selecione um jogador primeiro',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
                inputNovaFoto_<?= $categoria ?>.value = '';
                return;
            }

            const formData = new FormData();
            formData.append('fotos', inputNovaFoto_<?= $categoria ?>?.files[0]);
            formData.append('participante_id', jogadorId);

            fetch(`/sgce/admin/upload_fotos_participantes.php?participante_id=${jogadorId}`, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    const fotoContainer = document.createElement('div');
                    fotoContainer.className = 'foto-container';
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = 'foto_selecionada_<?= $categoria ?>';
                    radio.value = data.foto_id;
                    radio.id = `foto_<?= $categoria ?>_${data.foto_id}`;
                    radio.dataset.src = `/sgce/${data.foto_src}`;
                    radio.addEventListener('change', () => {
                        fotoSelecionadaInput_<?= $categoria ?>.value = data.foto_id;
                    });

                    const img = document.createElement('img');
                    img.src = `/sgce/${data.foto_src}`;
                    img.title = `Foto ID: ${data.foto_id}`;

                    const btnExcluir = document.createElement('i');
                    btnExcluir.className = 'fas fa-times btn-excluir-foto';
                    btnExcluir.dataset.fotoId = data.foto_id;
                    btnExcluir.dataset.categoria = '<?= $categoria ?>';
                    btnExcluir.title = 'Excluir foto';
                    btnExcluir.addEventListener('click', () => excluirFoto_<?= $categoria ?>(data.foto_id, fotoContainer));

                    fotoContainer.appendChild(radio);
                    fotoContainer.appendChild(img);
                    fotoContainer.appendChild(btnExcluir);

                    const participanteFotos = fotosContainer_<?= $categoria ?>?.querySelector(`.fotos-participante[data-participante-id="${jogadorId}"]`);
                    if (participanteFotos) {
                        participanteFotos.appendChild(fotoContainer);
                        if (participanteFotos.querySelector('.text-muted')) {
                            participanteFotos.innerHTML = '';
                            participanteFotos.appendChild(fotoContainer);
                        }
                    }

                    inputNovaFoto_<?= $categoria ?>.value = '';
                    Swal.fire({
                        icon: 'success',
                        title: 'Foto adicionada com sucesso',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro ao adicionar foto',
                        text: data.message,
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            })
            .catch(error => {
                console.error('Erro no upload:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro de conexão',
                    text: 'Não foi possível adicionar a foto: ' + error.message,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            });
        });

        // Função para excluir foto via AJAX
        function excluirFoto_<?= $categoria ?>(fotoId, fotoContainer) {
            Swal.fire({
                title: 'Confirmar exclusão',
                text: 'Deseja realmente excluir esta foto?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sim, excluir',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`/sgce/admin/excluir_fotos_participantes.php?id=${fotoId}`, {
                        method: 'DELETE'
                    })
                    .then(response => {
                        if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        if (data.success) {
                            fotoContainer.remove();
                            const participanteFotos = fotosContainer_<?= $categoria ?>?.querySelector(`.fotos-participante[data-participante-id="${selectJogador_<?= $categoria ?>?.value}"]`);
                            if (participanteFotos && participanteFotos.children.length === 0) {
                                participanteFotos.innerHTML = '<p class="text-muted">Nenhuma foto disponível para este jogador.</p>';
                            }
                            Swal.fire({
                                icon: 'success',
                                title: 'Foto excluída com sucesso',
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 2000
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Erro ao excluir foto',
                                text: data.message,
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 3000
                            });
                        }
                    })
                    .catch(error => {
                        console.error('Erro na exclusão:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Erro de conexão',
                            text: 'Não foi possível excluir a foto: ' + error.message,
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    });
                }
            });
        }

        // Vincular evento de exclusão aos botões existentes
        fotosContainer_<?= $categoria ?>?.querySelectorAll('.btn-excluir-foto').forEach(btn => {
            btn.addEventListener('click', () => {
                const fotoId = btn.dataset.fotoId;
                const fotoContainer = btn.closest('.foto-container');
                excluirFoto_<?= $categoria ?>(fotoId, fotoContainer);
            });
        });

        // Atualizar o campo foto_selecionada quando um radio button é selecionado
        fotosContainer_<?= $categoria ?>?.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                fotoSelecionadaInput_<?= $categoria ?>.value = e.target.value;
            }
        });

        // Validação antes de gerar arte
        btnGerarArte_<?= $categoria ?>?.addEventListener('click', (e) => {
            e.preventDefault();
            const jogadorId = selectJogador_<?= $categoria ?>?.value;
            const fotoId = fotoSelecionadaInput_<?= $categoria ?>?.value;

            if (!jogadorId) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Selecione um jogador',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
                return;
            }

          
            // Save player ID and photo ID via AJAX
            fetch('/sgce/admin/salvar_jogador_partida.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_partida: '<?= $id_partida ?>',
                    id_jogador: jogadorId,
                    id_foto_selecionada: fotoId || null,
                    categoria: '<?= $categoria ?>'
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Jogador salvo com sucesso',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000
                    });
                    // Proceed with form submission
                    formGerarArte_<?= $categoria ?>.submit();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro ao salvar jogador',
                        text: data.message,
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            })
            .catch(error => {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro de conexão',
                    text: 'Não foi possível salvar o jogador: ' + error.message,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            });
        });

        // Atualizar exibição de fotos para o jogador selecionado (se houver)
        if (selectJogador_<?= $categoria ?>?.value) {
            atualizarFotos_<?= $categoria ?>();
        }
    <?php endforeach; ?>

    // JS para modal de confronto
    const formGerarArteConfronto = document.getElementById('formGerarArteConfronto');
    const btnGerarArteConfronto = document.getElementById('btnGerarArteConfronto');
    btnGerarArteConfronto.addEventListener('click', (e) => {
        e.preventDefault();
        formGerarArteConfronto.submit();
    });
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>