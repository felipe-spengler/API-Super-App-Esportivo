<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Check if included files exist
foreach (['../includes/db.php', '../includes/proteger_admin.php', '../includes/header.php', 'sidebar.php', '../includes/footer_dashboard.php'] as $file) {
    if (!file_exists($file)) {
        error_log("Missing file: $file");
        http_response_code(500);
        die("Server error: Missing required file.");
    }
}

// Include necessary files
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

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
        'mensagem' => 'ID da categoria inválido.'
    ];
    header('Location: gerenciar_campeonatos.php');
    exit;
}

// Fetch category (championship) details for breadcrumb
try {
    $stmt = $pdo->prepare("
        SELECT c.nome as nome_campeonato, c.id_campeonato_pai, cp.nome as nome_campeonato_pai
        FROM campeonatos c
        LEFT JOIN campeonatos cp ON c.id_campeonato_pai = cp.id
        WHERE c.id = ?
    ");
    $stmt->execute([$id_categoria]);
    $campeonato = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$campeonato) {
        $_SESSION['notificacao'] = [
            'tipo' => 'error',
            'mensagem' => 'Categoria não encontrada.'
        ];
        header('Location: categoria.php?id_categoria=' . urlencode($id_categoria));
        exit;
    }
} catch (PDOException $e) {
    error_log("Erro ao buscar categoria: " . $e->getMessage());
    $_SESSION['notificacao'] = [
        'tipo' => 'error',
        'mensagem' => 'Erro ao carregar dados da categoria.'
    ];
    header('Location: categoria.php?id_categoria=' . urlencode($id_categoria));
    exit;
} catch (Exception $e) {
    error_log("Unexpected error: " . $e->getMessage());
    http_response_code(500);
    die("Server error: Unexpected issue occurred.");
}

require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonato <?php echo htmlspecialchars($campeonato['nome_campeonato_pai']); ?></a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos_categoria.php?id_campeonato=<?= htmlspecialchars($campeonato['id_campeonato_pai']) ?>">Gerenciar Categorias</a></li>
        <li class="breadcrumb-item"><a href="categoria.php?id_categoria=<?= htmlspecialchars($id_categoria) ?>">Categoria <?= htmlspecialchars($campeonato['nome_campeonato']) ?></a></li>
        <li class="breadcrumb-item active" aria-current="page">Gerar Artes</li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-image fa-fw me-2"></i>Gerar Artes - Categoria <?= htmlspecialchars($campeonato['nome_campeonato']) ?></h1>
    <a href="categoria.php?id_categoria=<?= htmlspecialchars($id_categoria) ?>" class="btn btn-outline-secondary btn-sm"><i class="fas fa-arrow-left me-1"></i> Voltar</a>
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
    $categorias_todas = [
        'craque' => ['titulo' => 'Craque do Jogo', 'icone' => 'fas fa-star', 'cor' => 'primary', 'url' => 'gerar_arte_craque.php'], // Mantemos aqui para referência
        'goleiro' => ['titulo' => 'Melhor Goleiro', 'icone' => 'fas fa-hand-paper', 'cor' => 'success', 'url' => 'gerar_melhor_goleiro.php'],
        'lateral' => ['titulo' => 'Melhor Lateral', 'icone' => 'fas fa-running', 'cor' => 'info', 'url' => 'gerar_melhor_lateral.php'],
        'meia' => ['titulo' => 'Melhor Meia', 'icone' => 'fas fa-futbol', 'cor' => 'warning', 'url' => 'gerar_melhor_meia.php'],
        'atacante' => ['titulo' => 'Melhor Atacante', 'icone' => 'fas fa-bullseye', 'cor' => 'danger', 'url' => 'gerar_melhor_atacante.php'],
        'artilheiro' => ['titulo' => 'Melhor Artilheiro', 'icone' => 'fas fa-trophy', 'cor' => 'dark', 'url' => 'gerar_melhor_artilheiro.php'],
        'assistencia' => ['titulo' => 'Melhor Assistência', 'icone' => 'fas fa-hands-helping', 'cor' => 'secondary', 'url' => 'gerar_melhor_assistencia.php'],
        'volante' => ['titulo' => 'Melhor Volante', 'icone' => 'fas fa-shield-alt', 'cor' => 'primary', 'url' => 'gerar_melhor_volante.php'],
        'estreante' => ['titulo' => 'Melhor Estreante', 'icone' => 'fas fa-user-plus', 'cor' => 'success', 'url' => 'gerar_melhor_estreante.php'],
        'zagueiro' => ['titulo' => 'Melhor Zagueiro', 'icone' => 'fas fa-shield', 'cor' => 'info', 'url' => 'gerar_melhor_zagueiro.php'],
    ];

// Separar a categoria 'craque' e o restante
    $craque_info = $categorias_todas['craque'];
    $categorias = array_diff_key($categorias_todas, ['craque' => true]);
    ?>
    <div class="col-xl-3 col-md-6 mb-4">
        <button class="card border-left-<?= $craque_info['cor'] ?> shadow h-100 w-100 py-2 border-0 btn-gerar-arte"
                data-bs-toggle="modal"
                data-bs-target="#modalGerarArteCraqueDedicado"
                data-categoria="craque"
                title="Gerar Arte do <?= $craque_info['titulo'] ?>">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-<?= $craque_info['cor'] ?> text-uppercase mb-1 text-start"><?= strtoupper($craque_info['titulo']) ?></div>
                        <div class="h5 mb-0 fw-bold text-gray-800"></div>
                    </div>
                    <div class="col-auto"><i class="<?= $craque_info['icone'] ?> fa-2x text-<?= $craque_info['cor'] ?>"></i></div>
                </div>
            </div>
        </button>
    </div>
    <?php
// Garantir que as variáveis estão definidas para este modal
    $craque_info = $categorias_todas['craque'];
    $craque_categoria = 'craque';
    $craque_modal_id = "modalGerarArteCraqueDedicado";
    ?>
    <div class="modal fade" id="<?= $craque_modal_id ?>" tabindex="-1" aria-labelledby="<?= $craque_modal_id ?>Label" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="<?= $craque_modal_id ?>Label">Gerar Arte para <?= $craque_info['titulo'] ?></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form id="formGerarArte_<?= $craque_categoria ?>" action="<?php echo $craque_info['url']; ?>" method="POST" target="_blank" enctype="multipart/form-data">
                    <input type="hidden" name="id_partida" id="id_partida_<?= $craque_categoria ?>">
                    <input type="hidden" name="id_equipe_a" id="id_equipe_a_<?= $craque_categoria ?>">
                    <input type="hidden" name="id_equipe_b" id="id_equipe_b_<?= $craque_categoria ?>">
                    <input type="hidden" name="nome_campeonato" id="nome_campeonato_<?= $craque_categoria ?>">
                    <input type="hidden" name="rodada" id="rodada_<?= $craque_categoria ?>">
                    <input type="hidden" name="placar" id="placar_<?= $craque_categoria ?>">
                    <input type="hidden" name="categoria" value="<?= $craque_categoria ?>">
                    <input type="hidden" name="id_categoria" value="<?= htmlspecialchars($id_categoria) ?>">
                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="partida_<?= $craque_categoria ?>" class="form-label">Selecionar Partida</label>
                            <select class="form-control" id="partida_<?= $craque_categoria ?>" name="id_partida_select" required>
                                <option value="">Selecione uma partida</option>
                            </select>
                        </div>

                        <input type="hidden" name="id_jogador" id="id_jogador_<?= $craque_categoria ?>">

                        <div class="mb-3">
                            <label class="form-label">Craque do Jogo (MVP) Selecionado</label>
                            <p class="form-control-static" id="nome_jogador_craque_<?= $craque_categoria ?>"><span class="text-muted">Selecione uma partida para ver o Craque do Jogo.</span></p>
                        </div>
                        <input type="hidden" id="foto_selecionada_<?= $craque_categoria ?>" name="foto_selecionada" value="">

                        <div id="fotos_jogador_<?= $craque_categoria ?>" class="mt-3">
                        </div>

                        <div class="mb-3">
                            <button type="button" class="btn btn-primary btn-sm" id="btnAdicionarFoto_<?= $craque_categoria ?>">
                                <i class="fas fa-plus me-1"></i>Adicionar Foto
                            </button>
                            <input type="file" id="inputNovaFoto_<?= $craque_categoria ?>" name="nova_foto" accept="image/*" style="display: none;">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="submit" class="btn btn-primary" id="btnGerarArte_<?= $craque_categoria ?>">Gerar Arte</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    <?php
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
                    <input type="hidden" name="id_partida" id="id_partida_<?= $categoria ?>">
                    <input type="hidden" name="id_equipe_a" id="id_equipe_a_<?= $categoria ?>">
                    <input type="hidden" name="id_equipe_b" id="id_equipe_b_<?= $categoria ?>">
                    <input type="hidden" name="nome_campeonato" id="nome_campeonato_<?= $categoria ?>">
                    <input type="hidden" name="rodada" id="rodada_<?= $categoria ?>">
                    <input type="hidden" name="placar" id="placar_<?= $categoria ?>">
                    <input type="hidden" name="categoria" value="<?= $categoria ?>">
                    <input type="hidden" name="id_categoria" value="<?= htmlspecialchars($id_categoria) ?>">
                    <div class="modal-body">
                        <!-- Seleção de Partida -->
                        <input type="hidden" name="id_partida_select" value="0">

                        <!-- Seleção de Equipe -->
                        <div class="mb-3">
                            <label for="equipe_<?= $categoria ?>" class="form-label">Selecionar Equipe</label>
                            <select class="form-control" id="equipe_<?= $categoria ?>" name="id_equipe_select" required disabled>
                                <option value="">Selecione uma equipe</option>
                            </select>
                        </div>

                        <!-- Seleção de Jogador -->
                        <div class="mb-3">
                            <label for="jogador_<?= $categoria ?>" class="form-label">Selecionar Jogador</label>
                            <select class="form-control" id="jogador_<?= $categoria ?>" name="id_jogador" required disabled>
                                <option value="">Selecione um jogador</option>
                            </select>
                        </div>

                        <!-- Campo oculto para foto selecionada (opcional) -->
                        <input type="hidden" id="foto_selecionada_<?= $categoria ?>" name="foto_selecionada" value="">

                        <!-- Lista de Fotos -->
                        <div id="fotos_jogador_<?= $categoria ?>" class="mt-3">
                            <!-- Preenchido via AJAX -->
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
                <input type="hidden" name="id_partida" id="id_partida_confronto">
                <input type="hidden" name="id_equipe_a" id="id_equipe_a_confronto">
                <input type="hidden" name="id_equipe_b" id="id_equipe_b_confronto">
                <input type="hidden" name="nome_campeonato" id="nome_campeonato_confronto">
                <input type="hidden" name="rodada" id="rodada_confronto">
                <input type="hidden" name="placar" id="placar_confronto">
                <input type="hidden" name="id_categoria" value="<?= htmlspecialchars($id_categoria) ?>">
                <div class="modal-body">
                    <!-- Seleção de Partida -->
                    <div class="mb-3">
                        <label for="partida_confronto" class="form-label">Selecionar Partida</label>
                        <select class="form-control" id="partida_confronto" name="id_partida_select" required>
                            <option value="">Selecione uma partida</option>
                            <!-- Preenchido via AJAX -->
                        </select>
                    </div>

                    <!-- Informações da Partida -->
                    <p>Partida: <strong id="partida_info_confronto"></strong></p>
                    <p>Placar da partida: <strong id="placar_info_confronto"></strong></p>

                    <!-- Goleadores Equipe A (Ocultos) -->
                    <div class="mb-3">
                        <label class="form-label" id="label_equipe_a_confronto">Goleadores da Equipe A</label>
                        <p id="goleadores_a_display_confronto"><span class="text-muted">Selecione uma partida para ver os goleadores.</span></p>
                        <div id="goleadores_a_inputs_confronto"></div>
                    </div>

                    <!-- Goleadores Equipe B (Ocultos) -->
                    <div class="mb-3">
                        <label class="form-label" id="label_equipe_b_confronto">Goleadores da Equipe B</label>
                        <p id="goleadores_b_display_confronto"><span class="text-muted">Selecione uma partida para ver os goleadores.</span></p>
                        <div id="goleadores_b_inputs_confronto"></div>
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
    document.addEventListener('DOMContentLoaded', function () {
        const idCategoria = <?= json_encode($id_categoria) ?>;
        const categoriasSemPartida = ['goleiro', 'lateral', 'meia', 'atacante', 'artilheiro', 'assistencia', 'volante', 'estreante', 'zagueiro'];
        // Função para preencher select de partidas
        function carregarPartidas(categoria) {
            const selectPartida = document.getElementById(`partida_${categoria}`);
            const url = `/sgce/admin/buscar_partidas.php?id_categoria=${idCategoria}`;

            console.log('%c[OK] Carregando partidas...', 'color: cyan');
            selectPartida.innerHTML = '<option value="">Carregando...</option>';

            fetch(url)
                    .then(r => r.json())
                    .then(data => {
                        if (!data.success)
                            throw new Error(data.message || 'Erro desconhecido');

                        selectPartida.innerHTML = '<option value="">Selecione uma partida</option>';

                        data.partidas.forEach(p => {
                            const option = document.createElement('option'); // ← MESMO NOME!
                            option.value = p.id;
                            option.text = `${p.nome_a} ${p.placar_equipe_a} x ${p.placar_equipe_b} ${p.nome_b}`;

                            // Dados que o JS precisa
                            option.dataset.equipeA = p.id_equipe_a;
                            option.dataset.equipeB = p.id_equipe_b;
                            option.dataset.nomeCampeonato = p.nome_campeonato;
                            option.dataset.rodada = p.rodada;
                            option.dataset.placar = `${p.placar_equipe_a} x ${p.placar_equipe_b}`;
                            option.dataset.mvpId = p.mvp_id || '';
                            option.dataset.mvpNome = p.mvp_nome || '';

                            selectPartida.appendChild(option); // ← USA "option"
                        });

                        Swal.fire({
                            icon: 'success',
                            title: 'Tudo pronto!',

                            toast: true,
                            timer: 2000,
                            position: 'top-end'
                        });
                    })
                    .catch(err => {
                        console.error('Erro:', err);
                        selectPartida.innerHTML = '<option value="">Erro</option>';
                        Swal.fire({
                            icon: 'error',
                            title: 'Falha',
                            text: 'Erro: ' + err.message,
                            toast: true,
                            timer: 5000
                        });
                    });
        }
        function carregarTodasEquipes(categoria) {
            const selectEquipe = document.getElementById(`equipe_${categoria}`);
            const idCategoria = <?= json_encode($id_categoria) ?>;
            const url = `/sgce/admin/buscar_todas_equipes.php?id_categoria=${idCategoria}`; // <-- NOVO ENDPOINT

            console.log('%c[OK] Carregando todas as equipes...', 'color: green');
            selectEquipe.innerHTML = '<option value="">Carregando...</option>';
            selectEquipe.disabled = true; // Desabilita durante o carregamento

            fetch(url)
                    .then(r => r.json())
                    .then(data => {
                        if (!data.success)
                            throw new Error(data.message || 'Erro desconhecido');

                        document.getElementById(`nome_campeonato_${categoria}`).value = <?= json_encode($campeonato['nome_campeonato'] ?? $campeonato['nome_campeonato']) ?>;
                        selectEquipe.innerHTML = '<option value="">Selecione uma equipe</option>';
                        data.equipes.forEach(e => { // Presumindo que 'equipes' é o nome da chave no JSON de retorno
                            const option = document.createElement('option');
                            option.value = e.id;
                            option.text = e.nome;
                            selectEquipe.appendChild(option);
                        });
                        selectEquipe.disabled = false; // Habilita após o carregamento

                        // O campo id_partida_select no modal será 0 (ou null)
                        document.getElementById(`id_partida_${categoria}`).value = '0';

                        Swal.fire({
                            icon: 'success',
                            title: 'Equipes carregadas!',
                            toast: true,
                            timer: 2000,
                            position: 'top-end'
                        });
                    })
                    .catch(err => {
                        console.error('Erro:', err);
                        selectEquipe.innerHTML = '<option value="">Erro ao carregar equipes</option>';
                        Swal.fire({
                            icon: 'error',
                            title: 'Falha',
                            text: 'Erro: ' + err.message,
                            toast: true,
                            timer: 5000
                        });
                    });
        }
        // Função para preencher select de equipes
        function carregarEquipes(categoria, idPartida) {
            const selectEquipe = document.getElementById(`equipe_${categoria}`);
            const selectPartida = document.getElementById(`partida_${categoria}`);
            const selectedOption = selectPartida.selectedOptions[0];
            selectEquipe.innerHTML = '<option value="">Selecione uma equipe</option>';
            selectEquipe.disabled = true;
            document.getElementById(`jogador_${categoria}`).disabled = true;

            if (idPartida && selectedOption) {
                const equipeA = {id: selectedOption.dataset.equipeA, nome: selectedOption.text.split(' x ')[0]};
                const equipeB = {id: selectedOption.dataset.equipeB, nome: selectedOption.text.split(' x ')[1].split(' (')[0]};

                [equipeA, equipeB].forEach(equipe => {
                    const option = document.createElement('option');
                    option.value = equipe.id;
                    option.text = equipe.nome;
                    selectEquipe.appendChild(option);
                });
                selectEquipe.disabled = false;

                // Preencher campos ocultos
                document.getElementById(`id_partida_${categoria}`).value = idPartida;
                document.getElementById(`id_equipe_a_${categoria}`).value = equipeA.id;
                document.getElementById(`id_equipe_b_${categoria}`).value = equipeB.id;
                document.getElementById(`nome_campeonato_${categoria}`).value = selectedOption.dataset.nomeCampeonato;
                document.getElementById(`rodada_${categoria}`).value = selectedOption.dataset.rodada;
                document.getElementById(`placar_${categoria}`).value = selectedOption.dataset.placar;
            }
        }

        // Função para preencher select de jogadores
        function carregarJogadores(categoria, idEquipe) {
            const selectJogador = document.getElementById(`jogador_${categoria}`);
            const fotosContainer = document.getElementById(`fotos_jogador_${categoria}`);
            selectJogador.innerHTML = '<option value="">Selecione um jogador</option>';
            fotosContainer.innerHTML = '';
            selectJogador.disabled = true;

            if (idEquipe) {
                fetch(`/sgce/admin/buscar_jogadores.php?id_equipe=${idEquipe}`, {
                    method: 'GET',
                    headers: {'Accept': 'application/json'}
                })
                        .then(response => {
                            if (!response.ok)
                                throw new Error(`HTTP error ${response.status}`);
                            return response.json();
                        })
                        .then(data => {
                            if (data.success) {
                                data.jogadores.forEach(jogador => {
                                    const option = document.createElement('option');
                                    option.value = jogador.id;
                                    option.text = jogador.nome_completo + (jogador.apelido ? ` (${jogador.apelido})` : '');
                                    selectJogador.appendChild(option);

                                    const fotosDiv = document.createElement('div');
                                    fotosDiv.className = 'fotos-participante';
                                    fotosDiv.dataset.participanteId = jogador.id;
                                    fotosDiv.style.display = 'none';

                                    if (jogador.fotos.length === 0) {
                                        fotosDiv.innerHTML = '<p class="text-muted">Nenhuma foto disponível para este jogador.</p>';
                                    } else {
                                        jogador.fotos.forEach(foto => {
                                            const fotoContainer = document.createElement('div');
                                            fotoContainer.className = 'foto-container';
                                            const radio = document.createElement('input');
                                            radio.type = 'radio';
                                            radio.name = `foto_selecionada_${categoria}`;
                                            radio.value = foto.id;
                                            radio.id = `foto_${categoria}_${foto.id}`;
                                            const img = document.createElement('img');
                                            img.src = `/sgce/${foto.src}`;
                                            img.alt = 'Foto do jogador';
                                            img.title = `Foto ID: ${foto.id}`;
                                            const btnExcluir = document.createElement('i');
                                            btnExcluir.className = 'fas fa-times btn-excluir-foto';
                                            btnExcluir.dataset.fotoId = foto.id;
                                            btnExcluir.dataset.categoria = categoria;
                                            btnExcluir.title = 'Excluir foto';
                                            fotoContainer.appendChild(radio);
                                            fotoContainer.appendChild(img);
                                            fotoContainer.appendChild(btnExcluir);
                                            fotosDiv.appendChild(fotoContainer);
                                        });
                                    }
                                    fotosContainer.appendChild(fotosDiv);
                                });
                                selectJogador.disabled = false;
                            } else {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Erro ao carregar jogadores',
                                    text: data.message,
                                    toast: true,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 3000
                                });
                            }
                        })
                        .catch(error => {
                            console.error('Erro ao carregar jogadores:', error);
                            Swal.fire({
                                icon: 'error',
                                title: 'Erro de conexão',
                                text: 'Não foi possível carregar os jogadores: ' + error.message,
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 3000
                            });
                        });
            }
        }

        // Função para carregar goleadores (para o modal de confronto)
        function carregarGoleadoresConfronto(idPartida) {
            const goleadoresADisplay = document.getElementById('goleadores_a_display_confronto');
            const goleadoresBDisplay = document.getElementById('goleadores_b_display_confronto');
            const goleadoresAInputs = document.getElementById('goleadores_a_inputs_confronto');
            const goleadoresBInputs = document.getElementById('goleadores_b_inputs_confronto');
            const labelEquipeA = document.getElementById('label_equipe_a_confronto');
            const labelEquipeB = document.getElementById('label_equipe_b_confronto');
            const partidaInfo = document.getElementById('partida_info_confronto');
            const placarInfo = document.getElementById('placar_info_confronto');

            goleadoresADisplay.innerHTML = '<span class="text-muted">Selecione uma partida para ver os goleadores.</span>';
            goleadoresBDisplay.innerHTML = '<span class="text-muted">Selecione uma partida para ver os goleadores.</span>';
            goleadoresAInputs.innerHTML = '';
            goleadoresBInputs.innerHTML = '';
            partidaInfo.textContent = '';
            placarInfo.textContent = '';

            if (idPartida) {
                const selectedOption = document.getElementById('partida_confronto').selectedOptions[0];
                partidaInfo.textContent = selectedOption.text;
                placarInfo.textContent = selectedOption.dataset.placar;
                labelEquipeA.textContent = `Goleadores da ${selectedOption.text.split(' x ')[0]}`;
                labelEquipeB.textContent = `Goleadores da ${selectedOption.text.split(' x ')[1].split(' (')[0]}`;

                document.getElementById('id_partida_confronto').value = idPartida;
                document.getElementById('id_equipe_a_confronto').value = selectedOption.dataset.equipeA;
                document.getElementById('id_equipe_b_confronto').value = selectedOption.dataset.equipeB;
                document.getElementById('nome_campeonato_confronto').value = selectedOption.dataset.nomeCampeonato;
                document.getElementById('rodada_confronto').value = selectedOption.dataset.rodada;
                document.getElementById('placar_confronto').value = selectedOption.dataset.placar;

                fetch(`/sgce/admin/buscar_goleadores.php?id_partida=${idPartida}`, {
                    method: 'GET',
                    headers: {'Accept': 'application/json'}
                })
                        .then(response => {
                            if (!response.ok)
                                throw new Error(`HTTP error ${response.status}`);
                            return response.json();
                        })
                        .then(data => {
                            if (data.success) {
                                goleadoresADisplay.innerHTML = data.goleadores_a.length ? data.goleadores_a.map(g => g.display).join(', ') : '<span class="text-muted">Nenhum goleador registrado.</span>';
                                goleadoresBDisplay.innerHTML = data.goleadores_b.length ? data.goleadores_b.map(g => g.display).join(', ') : '<span class="text-muted">Nenhum goleador registrado.</span>';
                                data.goleadores_a.forEach(g => {
                                    const input = document.createElement('input');
                                    input.type = 'hidden';
                                    input.name = 'goleadores_a[]';
                                    input.value = `${g.nome}:${g.gols}`;
                                    goleadoresAInputs.appendChild(input);
                                });
                                data.goleadores_b.forEach(g => {
                                    const input = document.createElement('input');
                                    input.type = 'hidden';
                                    input.name = 'goleadores_b[]';
                                    input.value = `${g.nome}:${g.gols}`;
                                    goleadoresBInputs.appendChild(input);
                                });
                            } else {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Erro ao carregar goleadores',
                                    text: data.message,
                                    toast: true,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 3000
                                });
                            }
                        })
                        .catch(error => {
                            console.error('Erro ao carregar goleadores:', error);
                            Swal.fire({
                                icon: 'error',
                                title: 'Erro de conexão',
                                text: 'Não foi possível carregar os goleadores: ' + error.message,
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 3000
                            });
                        });
            }
        }
        function carregarFotosJogadorMvp(categoria, idJogador) {
            const fotosContainer = document.getElementById(`fotos_jogador_${categoria}`);
            const fotoSelecionadaInput = document.getElementById(`foto_selecionada_${categoria}`);
            fotosContainer.innerHTML = ''; // Limpar fotos anteriores
            fotoSelecionadaInput.value = '';

            if (!idJogador)
                return;

            // Assumindo que /sgce/admin/buscar_jogadores.php aceita 'id_participante' para buscar um único jogador
            fetch(`/sgce/admin/buscar_jogador_unico.php?id_participante=${idJogador}`, {
                method: 'GET',
                headers: {'Accept': 'application/json'}
            })
                    .then(response => {
                        if (!response.ok)
                            throw new Error(`HTTP error ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        if (data.success && data.jogador) {
                            const jogador = data.jogador;
                            const fotosDiv = document.createElement('div');
                            fotosDiv.className = 'fotos-participante';
                            fotosDiv.dataset.participanteId = jogador.id;
                            fotosDiv.style.display = 'block';

                            if (!jogador.fotos || jogador.fotos.length === 0) {
                                fotosDiv.innerHTML = '<p class="text-muted">Nenhuma foto disponível para este jogador.</p>';
                            } else {
                                jogador.fotos.forEach(foto => {
                                    const fotoContainer = document.createElement('div');
                                    fotoContainer.className = 'foto-container';
                                    const radio = document.createElement('input');
                                    radio.type = 'radio';
                                    radio.name = `foto_selecionada_${categoria}`;
                                    radio.value = foto.id;
                                    radio.id = `foto_${categoria}_${foto.id}`;
                                    const img = document.createElement('img');
                                    img.src = `/sgce/${foto.src}`;
                                    img.alt = 'Foto do jogador';
                                    img.title = `Foto ID: ${foto.id}`;
                                    const btnExcluir = document.createElement('i');
                                    btnExcluir.className = 'fas fa-times btn-excluir-foto';
                                    btnExcluir.dataset.fotoId = foto.id;
                                    btnExcluir.dataset.categoria = categoria;
                                    btnExcluir.title = 'Excluir foto';
                                    fotoContainer.appendChild(radio);
                                    fotoContainer.appendChild(img);
                                    fotoContainer.appendChild(btnExcluir);
                                    fotosDiv.appendChild(fotoContainer);
                                });
                            }
                            fotosContainer.appendChild(fotosDiv);

                            // Selecionar automaticamente a primeira foto
                            const primeiroRadio = fotosContainer.querySelector('input[type="radio"]');
                            if (primeiroRadio) {
                                primeiroRadio.checked = true;
                                fotoSelecionadaInput.value = primeiroRadio.value;
                            }
                        } else {
                            fotosContainer.innerHTML = '<p class="text-danger">Erro ao carregar fotos ou jogador não encontrado.</p>';
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao carregar fotos do jogador MVP:', error);
                        fotosContainer.innerHTML = '<p class="text-danger">Erro de conexão ao carregar fotos.</p>';
                    });
        }
<?php foreach ($categorias as $categoria => $info): ?>
            const formGerarArte_<?= $categoria ?> = document.getElementById('formGerarArte_<?= $categoria ?>');
            const selectPartida_<?= $categoria ?> = document.getElementById('partida_<?= $categoria ?>');
            const selectEquipe_<?= $categoria ?> = document.getElementById('equipe_<?= $categoria ?>');
            const selectJogador_<?= $categoria ?> = document.getElementById('jogador_<?= $categoria ?>');
            const fotosContainer_<?= $categoria ?> = document.getElementById('fotos_jogador_<?= $categoria ?>');
            const btnAdicionarFoto_<?= $categoria ?> = document.getElementById('btnAdicionarFoto_<?= $categoria ?>');
            const inputNovaFoto_<?= $categoria ?> = document.getElementById('inputNovaFoto_<?= $categoria ?>');
            const btnGerarArte_<?= $categoria ?> = document.getElementById('btnGerarArte_<?= $categoria ?>');
            const fotoSelecionadaInput_<?= $categoria ?> = document.getElementById('foto_selecionada_<?= $categoria ?>');

            document.getElementById('modalGerarArte<?= ucfirst($categoria) ?>').addEventListener('show.bs.modal', () => {
                carregarTodasEquipes('<?= $categoria ?>'); // <-- CHAMA A NOVA FUNÇÃO
                // Limpar o jogador/foto/equipe ao abrir o modal para garantir que o usuário selecione
                selectEquipe_<?= $categoria ?>.value = '';
                selectJogador_<?= $categoria ?>.value = '';
                document.getElementById(`fotos_jogador_<?= $categoria ?>`).innerHTML = '';
                selectJogador_<?= $categoria ?>.disabled = true;
            });
            // Atualizar jogadores ao selecionar equipe
            selectEquipe_<?= $categoria ?>.addEventListener('change', () => {
                carregarJogadores('<?= $categoria ?>', selectEquipe_<?= $categoria ?>.value);
            });

            // Exibir fotos do jogador selecionado
            function atualizarFotos_<?= $categoria ?>() {
                const jogadorId = selectJogador_<?= $categoria ?>.value;
                const fotosParticipantes = fotosContainer_<?= $categoria ?>.querySelectorAll('.fotos-participante');
                fotosParticipantes.forEach(fotos => {
                    fotos.style.display = fotos.dataset.participanteId === jogadorId ? 'block' : 'none';
                });
            }

            selectJogador_<?= $categoria ?>.addEventListener('change', atualizarFotos_<?= $categoria ?>);

            // Acionar input de arquivo ao clicar no botão de adicionar foto
            btnAdicionarFoto_<?= $categoria ?>.addEventListener('click', () => {
                inputNovaFoto_<?= $categoria ?>.click();
            });

            // Adicionar nova foto via AJAX
            inputNovaFoto_<?= $categoria ?>.addEventListener('change', () => {
                const jogadorId = selectJogador_<?= $categoria ?>.value;
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
                formData.append('fotos', inputNovaFoto_<?= $categoria ?>.files[0]);
                formData.append('participante_id', jogadorId);

                fetch(`/sgce/admin/upload_fotos_participantes.php?participante_id=${jogadorId}`, {
                    method: 'POST',
                    body: formData
                })
                        .then(response => {
                            if (!response.ok)
                                throw new Error(`HTTP error ${response.status}`);
                            return response.json();
                        })
                        .then(data => {
                            if (data.success) {
                                const fotoContainer = document.createElement('div');
                                fotoContainer.className = 'foto-container';
                                const radio = document.createElement('input');
                                radio.type = 'radio';
                                radio.name = `foto_selecionada_<?= $categoria ?>`;
                                radio.value = data.foto_id;
                                radio.id = `foto_<?= $categoria ?>_${data.foto_id}`;
                                radio.addEventListener('change', () => {
                                    fotoSelecionadaInput_<?= $categoria ?>.value = data.foto_id;
                                });

                                const img = document.createElement('img');
                                img.src = `/sgce/${data.foto_src}`;
                                img.alt = 'Foto do jogador';
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

                                const participanteFotos = fotosContainer_<?= $categoria ?>.querySelector(`.fotos-participante[data-participante-id="${jogadorId}"]`);
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
                            method: 'DELETE',
                            headers: {'Accept': 'application/json'}
                        })
                                .then(response => {
                                    if (!response.ok)
                                        throw new Error(`HTTP error ${response.status}`);
                                    return response.json();
                                })
                                .then(data => {
                                    if (data.success) {
                                        fotoContainer.remove();
                                        const participanteFotos = fotosContainer_<?= $categoria ?>.querySelector(`.fotos-participante[data-participante-id="${selectJogador_<?= $categoria ?>.value}"]`);
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
            fotosContainer_<?= $categoria ?>.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-excluir-foto')) {
                    const fotoId = e.target.dataset.fotoId;
                    const fotoContainer = e.target.closest('.foto-container');
                    excluirFoto_<?= $categoria ?>(fotoId, fotoContainer);
                }
            });

            // Validação antes de gerar arte
            btnGerarArte_<?= $categoria ?>?.addEventListener('click', (e) => {
                e.preventDefault();
                const isMelhorJogador = categoriasSemPartida.includes('<?= $categoria ?>');
                let partidaId = selectPartida_<?= $categoria ?>?.value;
                const equipeId = selectEquipe_<?= $categoria ?>?.value;
                const jogadorId = selectJogador_<?= $categoria ?>?.value;
                const fotoId = fotoSelecionadaInput_<?= $categoria ?>?.value;
                if (!isMelhorJogador && (!partidaId || partidaId === '')) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Selecione uma partida',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000
                    });
                    return;
                }
                if (isMelhorJogador) {
                    partidaId = '0'; 
                }
                if (!equipeId) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Selecione uma equipe',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000
                    });
                    return;
                }

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
                fetch('/sgce/admin/salvar_jogador_categoria.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        id_categoria: '<?= $id_categoria ?>',
                        id_partida: partidaId,
                        id_jogador: jogadorId,
                        id_foto_selecionada: fotoId || null,
                        categoria: '<?= $categoria ?>'
                    })
                })
                        .then(response => {
                            if (!response.ok)
                                throw new Error(`HTTP error ${response.status}`);
                            return response.json();
                        })
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
                            console.error('Erro ao salvar jogador:', error);
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

            // Atualizar o campo foto_selecionada quando um radio button é selecionado
            fotosContainer_<?= $categoria ?>.addEventListener('change', (e) => {
                if (e.target.type === 'radio') {
                    fotoSelecionadaInput_<?= $categoria ?>.value = e.target.value;
                }
            });
<?php endforeach; ?>

        // JS para modal de confronto
        const formGerarArteConfronto = document.getElementById('formGerarArteConfronto');
        const selectPartidaConfronto = document.getElementById('partida_confronto');
        const btnGerarArteConfronto = document.getElementById('btnGerarArteConfronto');

        document.getElementById('modalGerarArteConfronto').addEventListener('show.bs.modal', () => {
            carregarPartidas('confronto');
        });

        selectPartidaConfronto.addEventListener('change', () => {
            carregarGoleadoresConfronto(selectPartidaConfronto.value);
        });

        btnGerarArteConfronto.addEventListener('click', (e) => {
            e.preventDefault();
            if (!selectPartidaConfronto.value) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Selecione uma partida',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
                return;
            }
            formGerarArteConfronto.submit();
        });

        // ==========================================================
        // JS DEDICADO PARA CRAQUE DO JOGO (MVP)
        // ==========================================================
        const craque_categoria = 'craque';
        const formGerarArte_craque = document.getElementById(`formGerarArte_${craque_categoria}`);
        const selectPartida_craque = document.getElementById(`partida_${craque_categoria}`);
        const fotosContainer_craque = document.getElementById(`fotos_jogador_${craque_categoria}`);
        const btnAdicionarFoto_craque = document.getElementById(`btnAdicionarFoto_${craque_categoria}`);
        const inputNovaFoto_craque = document.getElementById(`inputNovaFoto_${craque_categoria}`);
        const btnGerarArte_craque = document.getElementById(`btnGerarArte_${craque_categoria}`);
        const fotoSelecionadaInput_craque = document.getElementById(`foto_selecionada_${craque_categoria}`);
        const idJogadorHidden_craque = document.getElementById(`id_jogador_${craque_categoria}`);
        const nomeJogadorCraqueDisplay = document.getElementById(`nome_jogador_craque_${craque_categoria}`);
        const idCategoriaCraque = '<?= $id_categoria ?>';

        // Carregar partidas ao abrir o modal Craque
        document.getElementById('modalGerarArteCraqueDedicado').addEventListener('show.bs.modal', () => {
            carregarPartidas(craque_categoria);
        });

        // Lógica Exclusiva: Seleção de Partida -> Busca MVP -> Carrega Fotos
        selectPartida_craque.addEventListener('change', () => {
            const selectedOption = selectPartida_craque.selectedOptions[0];
            const partidaId = selectPartida_craque.value;

            // Resetar tudo
            idJogadorHidden_craque.value = '';
            nomeJogadorCraqueDisplay.innerHTML = '<span class="text-muted">Carregando o Craque do Jogo...</span>';
            fotosContainer_craque.innerHTML = '';

            if (!selectedOption || !partidaId)
                return;

            // Preencher campos ocultos
            document.getElementById(`id_partida_${craque_categoria}`).value = partidaId;
            document.getElementById(`id_equipe_a_${craque_categoria}`).value = selectedOption.dataset.equipeA;
            document.getElementById(`id_equipe_b_${craque_categoria}`).value = selectedOption.dataset.equipeB;
            document.getElementById(`nome_campeonato_${craque_categoria}`).value = selectedOption.dataset.nomeCampeonato;
            document.getElementById(`rodada_${craque_categoria}`).value = selectedOption.dataset.rodada;
            document.getElementById(`placar_${craque_categoria}`).value = selectedOption.dataset.placar;

            // PEGAR O MVP DIRETO DO DATASET (já veio do PHP!)
            const mvpId = selectedOption.dataset.mvpId;
            const mvpNome = selectedOption.dataset.mvpNome;

            if (mvpId && mvpNome) {
                idJogadorHidden_craque.value = mvpId;
                nomeJogadorCraqueDisplay.textContent = mvpNome;
                carregarFotosJogadorMvp(craque_categoria, mvpId);
            } else {
                nomeJogadorCraqueDisplay.innerHTML = '<span class="text-danger">Craque do Jogo não definido</span>';
                Swal.fire({
                    icon: 'warning',
                    title: 'MVP Ausente',
                    text: 'Esta partida ainda não tem um Craque do Jogo registrado.',
                    toast: true,
                    position: 'top-end',
                    timer: 3000
                });
            }
        });

        // Lógica de adicionar foto (adaptada para usar o ID oculto do MVP)
        btnAdicionarFoto_craque.addEventListener('click', () => {
            inputNovaFoto_craque.click();
        });

        inputNovaFoto_craque.addEventListener('change', () => {
            const jogadorId = idJogadorHidden_craque.value; // Pega o ID do campo oculto
            if (!jogadorId) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Selecione uma partida para definir o Craque do Jogo',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
                inputNovaFoto_craque.value = '';
                return;
            }

            const formData = new FormData();
            formData.append('fotos', inputNovaFoto_craque.files[0]);
            formData.append('participante_id', jogadorId);

            fetch(`/sgce/admin/upload_fotos_participantes.php?participante_id=${jogadorId}`, {
                method: 'POST',
                body: formData
            })
                    .then(response => {
                        if (!response.ok)
                            throw new Error(`HTTP error ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        if (data.success) {
                            // Re-carregar as fotos para exibir a nova
                            carregarFotosJogadorMvp(craque_categoria, jogadorId);
                            inputNovaFoto_craque.value = '';
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

        // Validação e submissão (simplificada)
        btnGerarArte_craque?.addEventListener('click', (e) => {
            e.preventDefault();
            const partidaId = selectPartida_craque?.value;
            const jogadorId = idJogadorHidden_craque?.value;
            const fotoId = fotoSelecionadaInput_craque?.value;

            if (!partidaId) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Selecione uma partida',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
                return;
            }

            if (!jogadorId) {
                Swal.fire({
                    icon: 'warning',
                    title: 'O Craque do Jogo precisa ser registrado para esta partida.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
                return;
            }

            // Submissão via AJAX para salvar o MVP (id_jogador)
            fetch('/sgce/admin/salvar_jogador_categoria.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    id_categoria: idCategoriaCraque,
                    id_partida: partidaId,
                    id_jogador: jogadorId,
                    id_foto_selecionada: fotoId || null,
                    categoria: craque_categoria
                })
            })
                    .then(response => {
                        if (!response.ok)
                            throw new Error(`HTTP error ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        if (data.success) {
                            // Procede com a submissão do formulário
                            formGerarArte_craque.submit();
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
                        console.error('Erro ao salvar jogador:', error);
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

        // Atualizar o campo foto_selecionada quando um radio button é selecionado (incluindo as fotos carregadas via JS)
        fotosContainer_craque.addEventListener('change', (e) => {
            if (e.target.type === 'radio') {
                fotoSelecionadaInput_craque.value = e.target.value;
            }
        });

        // ==========================================================
        // FIM JS DEDICADO PARA CRAQUE DO JOGO (MVP)
        // ==========================================================
    });
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>