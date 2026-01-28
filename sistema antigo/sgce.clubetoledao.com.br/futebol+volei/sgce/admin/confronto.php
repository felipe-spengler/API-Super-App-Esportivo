<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

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
            ");

            foreach ($partidas as $partida) {
                $id_equipe_a = $partida['equipe_a'];
                $id_equipe_b = $partida['equipe_b'];
                $data_partida = $partida['data_partida'] ?? '';
                $local_partida = $partida['local_partida'] ?? '';
                $fase = $partida['fase'] ?? 'Chaveamento';
                $rodada = $partida['rodada'] ?? '1ª Rodada';

                // Validate teams are different
                if ($id_equipe_a === $id_equipe_b) {
                    $pdo->rollBack();
                    echo json_encode(['success' => false, 'message' => 'As equipes A e B não podem ser iguais na partida.']);
                    exit;
                }

                // Check for existing match with same teams and round
                $stmt_check->execute([$id_campeonato, $id_equipe_a, $id_equipe_b, $rodada]);
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
    
    // ===== EXCLUIR RODADA =====
    if ($_GET['action'] === 'excluir_rodada') {
        $id_campeonato = $data['id_campeonato'] ?? null;
        $rodada = $data['rodada_excluida'] ?? null;

        if (!$id_campeonato || !$rodada) {
            echo json_encode(['success' => false, 'message' => 'Dados inválidos.']);
            exit;
        }

        try {
            $pdo->beginTransaction();

            // Pegar IDs das partidas
            $stmt = $pdo->prepare("SELECT id FROM partidas WHERE id_campeonato = ? AND rodada = ?");
            $stmt->execute([$id_campeonato, $rodada]);
            $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);

            // Deletar sumulas
            if (!empty($ids)) {
                $placeholders = str_repeat('?,', count($ids) - 1) . '?';
                $pdo->prepare("DELETE FROM sumulas_eventos WHERE id_partida IN ($placeholders)")->execute($ids);
                $pdo->prepare("DELETE FROM sumulas_periodos WHERE id_partida IN ($placeholders)")->execute($ids);
            }

            // Deletar partidas
            $pdo->prepare("DELETE FROM partidas WHERE id_campeonato = ? AND rodada = ?")->execute([$id_campeonato, $rodada]);

            $pdo->commit();
            echo json_encode(['success' => true]);
            exit;
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            exit;
        }
    }
    
    if ($_GET['action'] === 'excluir_partida') {
        $id_partida = $data['id_partida'] ?? null;
        if (!$id_partida) {
            echo json_encode(['success' => false, 'message' => 'ID da partida inválido.']);
            exit;
        }

        try {
            $pdo->beginTransaction();

            // CORREÇÃO: variáveis separadas
            $stmt_eventos = $pdo->prepare("DELETE FROM sumulas_eventos WHERE id_partida = ?");
            $stmt_periodos = $pdo->prepare("DELETE FROM sumulas_periodos WHERE id_partida = ?");
            $stmt_partida = $pdo->prepare("DELETE FROM partidas WHERE id = ?");

            $stmt_eventos->execute([$id_partida]);
            $stmt_periodos->execute([$id_partida]);
            $stmt_partida->execute([$id_partida]);

            $pdo->commit();
            echo json_encode(['success' => true]);
            exit;
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            exit;
        }
    }
}

// Validate campeonato ID
if ($_SERVER['REQUEST_METHOD'] !== 'GET' || !isset($_GET['id_categoria'])) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Nenhum campeonato especificado.'];
    $id_campeonato = $_GET['id_categoria'];
    header("Location: gerenciar_campeonatos.php");
    exit();
}
$id_campeonato = $_GET['id_categoria'];

// Fetch campeonato details
$stmt_campeonato = $pdo->prepare("SELECT nome FROM campeonatos WHERE id = ?");
$stmt_campeonato->execute([$id_campeonato]);
$nome_campeonato = $stmt_campeonato->fetchColumn();

// Buscar o id_esporte do campeonato
$stmt_esporte = $pdo->prepare("SELECT id_esporte FROM campeonatos WHERE id = ?");
$stmt_esporte->execute([$id_campeonato]);
$id_esporte = $stmt_esporte->fetchColumn();

// Definir para qual página de categoria deve voltar
$pagina_categoria = ($id_esporte == 1) ? 'categoria.php' : 'categoria_volei.php';

if ($nome_campeonato === false) {
    
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Campeonato não encontrado.'];
    header("Location: $pagina_categoria?id_categoria=" . urlencode($id_campeonato));
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
    header("Location: $pagina_categoria?id_categoria=" . urlencode($id_campeonato));
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

// If no existing matches, generate proposed ones
$nao_par = (count($todas_equipes_inscritas) % 2 != 0);
if (empty($rodadas_existentes)) {
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
                'rodada' => '1ª Rodada',
                'status' => 'Agendada'
            ];
        }
        $rodadas_existentes['1ª Rodada'] = $partidas_propostas;
    }
}

// NOVO BLOCO DE LÓGICA DE ORDENAÇÃO ADAPTÁVEL
// ---------------------------------------------

// 1. Mapeamento de Fases Finais para Prioridade (Base 1000 garante que sejam MAIORES que qualquer Rodada Numerada)
$prioridade_fases_finais = [
    // Palavra-chave => Base + Ordem
    'oitavas' => 1010,
    'quartas' => 1020,
    'semi'    => 1030,
    'terceiro' => 1040, // Novo: Trata '3º', 'terceiro', '3º e 4º'
    'final'   => 1050,
];

// 2. Função de Comparação Customizada
$comparador_rodadas = function($a_chave, $b_chave) use ($prioridade_fases_finais) {
    
    // Função auxiliar para obter o valor de prioridade de uma chave
    $get_prioridade = function($chave) use ($prioridade_fases_finais) {
        $chave_lower = mb_strtolower($chave);
        
        // 1. **FASES FINAIS MATA-MATA (Prioridade 1000+)**
        // Verifica se contém alguma palavra-chave de fase final (Prioridade 1000+)
        // Adicionar tratamento para o "3º" para ser mais robusto
        
        // Tratar "3º e 4º" ou "Disputa 3º"
        if (mb_strpos($chave_lower, '3º') !== false || mb_strpos($chave_lower, 'terceiro') !== false) {
            return $prioridade_fases_finais['terceiro'];
        }

        foreach ($prioridade_fases_finais as $keyword => $prioridade) {
            // Pular a keyword 'terceiro' que já foi tratada acima
            if ($keyword === 'terceiro') continue; 
            
            if (mb_strpos($chave_lower, $keyword) !== false) {
                return $prioridade; // Retorna a prioridade alta definida (1010, 1020, ...)
            }
        }
        
        // 2. **RODADAS NUMERADAS (Prioridade 1-999)**
        // Tenta extrair o número de rodadas como '1ª Rodada', '2ª Rodada', 'Fase 15'
        if (preg_match('/(\d+)/', $chave_lower, $matches)) {
            // Se for, a prioridade é o número da rodada.
            return (int) $matches[1]; 
        }

        // 3. **FASES NÃO NUMERADAS / OUTRAS** (Ex: 'Fase de Grupos', 'Primeira Fase', 'Chaveamento')
        // Damos uma prioridade padrão baixa, mas que vem DEPOIS das rodadas numeradas, 
        // e ANTES das fases finais, se for o caso. (Rodadas de Grupo)
        return 500; // Prioridade neutra entre 1-999 e 1000+
    };
    
    $prioridade_a = $get_prioridade($a_chave);
    $prioridade_b = $get_prioridade($b_chave);

    if ($prioridade_a === $prioridade_b) {
        // Se as prioridades forem iguais, usa a ordenação natural.
        // Isso garante que "Fase de Grupos A" venha antes de "Fase de Grupos B", ou "1ª Rodada" antes de "10ª Rodada" 
        // se a extração do número falhar por algum motivo inesperado.
        return strnatcmp($a_chave, $b_chave);
    }
    
    // Compara pelas prioridades numéricas: MENOR número (Rodadas Numeradas) vem primeiro.
    return $prioridade_a <=> $prioridade_b; 
};

// 3. Obter as chaves existentes e classificá-las
$chaves_ordenadas = array_keys($rodadas_existentes);
usort($chaves_ordenadas, $comparador_rodadas);

// 4. Criar um novo array de rodadas na ordem correta
$rodadas_ordenadas = [];
foreach ($chaves_ordenadas as $chave) {
    $rodadas_ordenadas[$chave] = $rodadas_existentes[$chave];
}
$rodadas_existentes = $rodadas_ordenadas;

// ---------------------------------------------

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

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonatos</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos_categoria.php?id_campeonato=<?= htmlspecialchars($id_campeonato) ?>">Gerenciar Campeonatos</a></li>
        <li class="breadcrumb-item"><a href="<?= htmlspecialchars($pagina_categoria) ?>?id_categoria=<?= htmlspecialchars($id_campeonato) ?>">Categoria</a></li>
        <li class="breadcrumb-item active" aria-current="page">Revisar Chaveamento</li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-sitemap fa-fw me-2"></i>Revisar Chaveamento</h1>
</div>

<div class="alert alert-info">
    <h4 class="alert-heading">Revise os Confrontos</h4>
    <p>Abaixo estão os confrontos propostos para o chaveamento. Você pode editar, excluir ou adicionar novas partidas.</p>
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
        <span>Confrontos Propostos para: <strong><?= htmlspecialchars($nome_campeonato) ?></strong></span>
        <div>
            <button type="button" class="btn btn-success btn-sm me-2" data-bs-toggle="modal" data-bs-target="#modalAdicionarRodada">
                <i class="fas fa-plus me-2"></i>Adicionar Fase
            </button>
            <button type="button" class="btn btn-success btn-sm" id="btnAdicionarPartida">
                <i class="fas fa-plus me-2"></i>Adicionar Novo Confronto
            </button>
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
                        <?php if ($rodadaCount > 1): ?>
                            <button type="button" class="btn btn-sm btn-excluir-rodada absolute top-0" title="Excluir Rodada" data-rodada="<?= htmlspecialchars($rodada) ?>">
                                <i class="fas fa-times"></i>
                            </button>
                        <?php endif; ?>
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
                <?php $tabIndex = 0;
                $global_index = 0;
                ?>
                <?php foreach ($rodadas_existentes as $rodada => $partidas): ?>
    <?php $tabIndex++; ?>
                    <div class="tab-pane <?= $tabIndex === 1 ? 'active' : '' ?>" id="rodada<?= $tabIndex ?>">
                        <div class="d-flex justify-content-center mb-3">
                            <a href="gerenciar_etapas.php?id_categoria=<?= htmlspecialchars($id_campeonato) ?>&rodada=<?= htmlspecialchars($rodada) ?>" 
                               class="btn btn-primary btn-sm" 
                               style="text-decoration: none;">
                                <i class="fas fa-cog me-2"></i>Gerenciar Fases
                            </a>
                        </div>
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
                                        </a>
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
                                                        'fase' => $partida['fase'],
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
                    <div class="tab-pane active" id="rodada1">
                        <div class="d-flex justify-content-center mb-3">
                            <a href="gerenciar_etapas.php?id_categoria=<?= htmlspecialchars($id_campeonato) ?>&rodada=1ª Rodada" 
                               class="btn btn-primary btn-sm" 
                               style="text-decoration: none;">
                                <i class="fas fa-cog me-2"></i>Gerenciar Fases
                            </a>
                        </div>
                        <div class="row g-3 partidas-container" data-rodada="1ª Rodada">
                            <!-- Placeholder for no rounds -->
                        </div>
                    </div>
<?php endif; ?>
            </div>
            <div class="d-flex justify-content-end mt-4">
                <a href="<?= htmlspecialchars($pagina_categoria) ?>?id_categoria=<?= htmlspecialchars($id_campeonato) ?>" class="btn btn-secondary me-2">Cancelar</a>
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
<!-- Add Round Modal -->
            <div class="modal fade" id="modalAdicionarRodada" tabindex="-1" aria-labelledby="modalAdicionarRodadaLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="modalAdicionarRodadaLabel">Adicionar Nova Fase</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <form id="formAdicionarRodada">
                                <div class="mb-3">
                                    <label for="nome_rodada" class="form-label">Nome da Fase</label>
                                    <input type="text" class="form-control" id="nome_rodada" placeholder="Ex: Oitavas de Final, Quartas, Semifinal..." required>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="btnSalvarRodada">Adicionar Fase</button>
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
        // Edit Modal
        const modalEditEl = document.getElementById('modalPartida');
        const modalEdit = new bootstrap.Modal(modalEditEl);
        const modalEditLabel = document.getElementById('modalPartidaLabel');
        const btnSalvarEdit = document.getElementById('btnSalvarPartida');
        const formEdit = document.getElementById('formPartida');
        const selectEquipeA = document.getElementById('equipe_a');
        const selectEquipeB = document.getElementById('equipe_b');

        // Add Modal
        const modalAddEl = document.getElementById('modalAdicionarPartida');
        const modalAdd = new bootstrap.Modal(modalAddEl);
        const modalAddLabel = document.getElementById('modalAdicionarPartidaLabel');
        const btnSalvarAdd = document.getElementById('btnSalvarNovaPartida');
        const formAdd = document.getElementById('formAdicionarPartida');
        const selectAddEquipeA = document.getElementById('add_equipe_a');
        const selectAddEquipeB = document.getElementById('add_equipe_b');
        const formChaveamento = document.getElementById('formChaveamento');
        const rodadasTabs = document.getElementById('rodadasTabs');
        const rodadasContent = document.getElementById('rodadasContent');
        const selectBye = document.getElementById('equipe_com_bye');
        const placeholderPartidas = document.getElementById('placeholder-partidas');
        let rodadaCount = rodadasTabs.querySelectorAll('.nav-item').length;

        // Team data for badge lookup
        const equipes = <?= json_encode(array_column($todas_equipes_inscritas, null, 'id')) ?>;

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

        // Reset Edit Form
        const resetEditForm = () => {
            formEdit.reset();
            document.getElementById('partida_index').value = '';
            selectEquipeA.value = '';
            selectEquipeB.value = '';
            updateDropdownOptions(selectEquipeA, selectEquipeB);
        };

        // Reset Add Form
        const resetAddForm = () => {
            formAdd.reset();
            selectAddEquipeA.value = '';
            selectAddEquipeB.value = '';
            updateDropdownOptions(selectAddEquipeA, selectAddEquipeB);
        };

        // Update rodada tabs and content
        const updateRodadaNumbers = () => {
            const tabs = rodadasTabs.querySelectorAll('.nav-item');
            const panes = rodadasContent.querySelectorAll('.tab-pane');
            tabs.forEach((tab, index) => {
                const rodadaNumber = index + 1;
                const link = tab.querySelector('.nav-link');
                link.innerHTML = `
                ${rodadaNumber}ª Rodada
                ${rodadaNumber > 1 ? `
                    <button type="button" class="btn btn-sm btn-excluir-rodada absolute top-0" title="Excluir Rodada" data-rodada="${rodadaNumber}ª Rodada">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            `;
                link.setAttribute('href', `#rodada${rodadaNumber}`);
                const pane = panes[index];
                pane.id = `rodada${rodadaNumber}`;
                const container = pane.querySelector('.partidas-container');
                container.dataset.rodada = `${rodadaNumber}ª Rodada`;
                container.querySelectorAll('input[name*="[rodada]"]').forEach(input => {
                    input.value = `${rodadaNumber}ª Rodada`;
                });
                const gerenciarFasesLink = pane.querySelector('a[href*="gerenciar_etapas.php"]');
                if (gerenciarFasesLink) {
                    gerenciarFasesLink.href = `gerenciar_etapas.php?id_categoria=<?= htmlspecialchars($id_campeonato) ?>&rodada=${rodadaNumber}ª Rodada`;
                }
            });
            rodadaCount = tabs.length;
        };

        // Add new rodada with dynamic matches
        // Modal para adicionar rodada com nome personalizado
        const modalAddRodadaEl = document.getElementById('modalAdicionarRodada');
        const modalAddRodada = new bootstrap.Modal(modalAddRodadaEl);
        const inputNomeRodada = document.getElementById('nome_rodada');
        const btnSalvarRodada = document.getElementById('btnSalvarRodada');

        btnSalvarRodada.addEventListener('click', () => {
            let nomeRodada = inputNomeRodada.value.trim();
            if (!nomeRodada) {
                Swal.fire({icon: 'error', title: 'Erro', text: 'Digite um nome para a fase.'});
                return;
            }

            // Evitar duplicatas
            const rodadasExistentes = Array.from(rodadasTabs.querySelectorAll('.nav-link'))
                    .map(link => link.textContent.trim().replace(/×.*$/, '').trim());
            if (rodadasExistentes.includes(nomeRodada)) {
                Swal.fire({icon: 'error', title: 'Erro', text: 'Esta fase já existe.'});
                return;
            }

            // Contar rodadas atuais
            const tabs = rodadasTabs.querySelectorAll('.nav-item');
            const novaOrdem = tabs.length + 1;

            // Criar nova aba
            const newTabLi = document.createElement('li');
            newTabLi.className = 'nav-item';
            newTabLi.innerHTML = `
        <a class="nav-link" href="#rodada${novaOrdem}" data-bs-toggle="tab">
            ${nomeRodada}
            <button type="button" class="btn btn-sm btn-excluir-rodada position-absolute end-0 top-50 translate-middle-y me-2" 
                    style="font-size: 0.7rem; padding: 0 4px;" 
                    title="Excluir Fase" data-rodada="${nomeRodada}">
                <i class="fas fa-times"></i>
            </button>
        </a>
    `;
            rodadasTabs.appendChild(newTabLi);

            // Criar novo painel
            const newTabPane = document.createElement('div');
            newTabPane.className = 'tab-pane fade';
            newTabPane.id = `rodada${novaOrdem}`;
            newTabPane.innerHTML = `
        <div class="d-flex justify-content-center mb-3">
            <a href="gerenciar_etapas.php?id_categoria=<?= htmlspecialchars($id_campeonato) ?>&rodada=${encodeURIComponent(nomeRodada)}"
               class="btn btn-primary btn-sm" style="text-decoration: none;">
                <i class="fas fa-cog me-2"></i>Gerenciar Fases
            </a>
        </div>
        <div class="row g-3 partidas-container" data-rodada="${nomeRodada}">
            <p class="text-center text-muted w-100">Nenhum confronto adicionado. Use "Adicionar Novo Confronto".</p>
        </div>
    `;
            rodadasContent.appendChild(newTabPane);

            // Ativar nova aba
            const newLink = newTabLi.querySelector('.nav-link');
            const bsTab = new bootstrap.Tab(newLink);
            bsTab.show();

            // Limpar e fechar
            inputNomeRodada.value = '';
            modalAddRodada.hide();

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Fase adicionada!',
                timer: 2000,
                showConfirmButton: false
            });
        });

        // Handle Delete Rodada
        rodadasTabs.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.btn-excluir-rodada');
            if (deleteButton) {
                const rodadaExcluida = deleteButton.dataset.rodada;
                Swal.fire({
                    title: 'Tem certeza?',
                    html: `Deseja excluir a <strong>${rodadaExcluida}</strong>?<br>Esta ação não pode be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Sim, excluir!',
                    cancelButtonText: 'Cancelar'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            const response = await fetch(`confronto.php?action=excluir_rodada`, {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({
                                    id_campeonato: <?= htmlspecialchars($id_campeonato) ?>,
                                    rodada_excluida: rodadaExcluida
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
                                    title: 'Rodada removida com sucesso!'
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
                                text: `Erro ao excluir rodada: ${error.message}`
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
                        // If the match has an ID, it exists in the database and needs to be deleted via AJAX
                        if (idPartida) {
                            try {
                                const response = await fetch(`confronto.php?action=excluir_partida`, {
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
                            // If no ID, the match is only in the client-side form
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

        // Dropdown event listeners for Edit Modal
        selectEquipeA.addEventListener('change', () => updateDropdownOptions(selectEquipeA, selectEquipeB));
        selectEquipeB.addEventListener('change', () => updateDropdownOptions(selectEquipeA, selectEquipeB));

        // Dropdown event listeners for Add Modal
        selectAddEquipeA.addEventListener('change', () => updateDropdownOptions(selectAddEquipeA, selectAddEquipeB));
        selectAddEquipeB.addEventListener('change', () => updateDropdownOptions(selectAddEquipeA, selectAddEquipeB));

        // Open Add Modal
        document.getElementById('btnAdicionarPartida').addEventListener('click', () => {
            resetAddForm();
            modalAddLabel.textContent = 'Adicionar Novo Confronto';
            btnSalvarAdd.textContent = 'Adicionar';
            modalAdd.show();
        });

        // Handle Edit Button
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

        // Handle Edit Form Submission (Client-side only)
        btnSalvarEdit.addEventListener('click', () => {
            const equipeA = selectEquipeA.value;
            const equipeB = selectEquipeB.value;
            const index = document.getElementById('partida_index').value;

            // Validate that teams are different
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

            // Update hidden inputs in the main form
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

                // Update card display
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
                    rodada: hiddenRodada.value,
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

        // Handle Add Form Submission (Client-side only)
        btnSalvarAdd.addEventListener('click', () => {
            const equipeA = selectAddEquipeA.value;
            const equipeB = selectAddEquipeB.value;

            // Validate that teams are different
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

            // Find the active container
            const activeContainer = document.querySelector('.tab-pane.active .partidas-container');
            if (!activeContainer) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'Nenhuma rodada ativa encontrada.'
                });
                return;
            }
            const rodada = activeContainer.dataset.rodada;

            // Find the next available index
            const existingIndices = Array.from(formChaveamento.querySelectorAll('input[name*="[equipe_a]"]'))
                    .map(input => parseInt(input.name.match(/\d+/)[0]));
            const newIndex = existingIndices.length ? Math.max(...existingIndices) + 1 : 0;

            // Get team details
            const nomeA = selectAddEquipeA.options[selectAddEquipeA.selectedIndex].text;
            const nomeB = selectAddEquipeB.options[selectAddEquipeB.selectedIndex].text;
            const brasaoA = equipes[equipeA]?.brasao || '';
            const brasaoB = equipes[equipeB]?.brasao || '';

            // Create new card
            const newCard = document.createElement('div');
            newCard.className = 'col-md-6 col-lg-4';
            newCard.innerHTML = `
            <div class="card h-100 shadow-sm card-status-agendada">
                <a href="menu_partida.php?id_partida=${equipeA.id}" class="d-flex justify-content-around align-items-center text-decoration-none flex-column py-3">
                    <input type="hidden" name="partidas[${newIndex}][equipe_a]" value="${equipeA}">
                    <input type="hidden" name="partidas[${newIndex}][equipe_b]" value="${equipeB}">
                    <input type="hidden" name="partidas[${newIndex}][data_partida]" value="">
                    <input type="hidden" name="partidas[${newIndex}][local_partida]" value="">
                    <input type="hidden" name="partidas[${newIndex}][fase]" value="Chaveamento">
                    <input type="hidden" name="partidas[${newIndex}][rodada]" value="${rodada}">
                    <input type="hidden" name="partidas[${newIndex}][id]" value="">
                    <input type="hidden" name="partidas[${newIndex}][status]" value="Agendada">
                    <div class="d-flex justify-content-around align-items-center w-100">
                        <div class="text-center" style="width: 120px;">
                            <img src="${brasaoA ? `../public/brasoes/${brasaoA}` : '../assets/img/brasao_default.png'}" 
                                 alt="Brasão de ${nomeA}" 
                                 class="img-fluid mb-2" 
                                 style="width: 60px; height: 60px; object-fit: cover;">
                            <span class="fw-bold d-block team-name">${nomeA}</span>
                        </div>
                        <span class="mx-2 fs-5 text-muted">vs</span>
                        <div class="text-center" style="width: 120px;">
                            <img src="${brasaoB ? `../public/brasoes/${brasaoB}` : '../assets/img/brasao_default.png'}" 
                                 alt="Brasão de ${nomeB}"
                                 class="img-fluid mb-2" 
                                 style="width: 60px; height: 60px; object-fit: cover;">
                            <span class="fw-bold d-block team-name">${nomeB}</span>
                        </div>
                    </div>
                    <div class="fase-text">Chaveamento</div>
                    <div class="status-text">Agendada</div>
                </a>
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
                fase: 'Chaveamento',
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

            // Add new card to the active container
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

                // Hide placeholder
                if (placeholderPartidas)
                    placeholderPartidas.style.display = 'none';

                // Filter teams that will play
                let equipesParaJogar = Object.values(equipes).filter(equipe => equipe.id != idEquipeBye);

                // Shuffle teams
                equipesParaJogar.sort(() => Math.random() - 0.5);

                // Find the active container (first rodada)
                const activeContainer = document.querySelector('.tab-pane.active .partidas-container');
                const rodada = activeContainer.dataset.rodada;

                // Find max index
                const existingIndices = Array.from(formChaveamento.querySelectorAll('input[name*="[equipe_a]"]'))
                        .map(input => parseInt(input.name.match(/\d+/)[0]));
                let newIndex = existingIndices.length ? Math.max(...existingIndices) + 1 : 0;

                // Generate matches
                let html = '';
                for (let i = 0; i < equipesParaJogar.length - 1; i += 2) {
                    const equipeA = equipesParaJogar[i];
                    const equipeB = equipesParaJogar[i + 1];

                    html += `
                    <div class="col-md-6 col-lg-4">
                        <div class="card h-100 shadow-sm card-status-agendada">
                            <a href="menu_partida.php?id_partida=${equipeA.id}" class="d-flex justify-content-around align-items-center text-decoration-none flex-column py-3">
                                <input type="hidden" name="partidas[${newIndex}][equipe_a]" value="${equipeA.id}">
                                <input type="hidden" name="partidas[${newIndex}][equipe_b]" value="${equipeB.id}">
                                <input type="hidden" name="partidas[${newIndex}][data_partida]" value="">
                                <input type="hidden" name="partidas[${newIndex}][local_partida]" value="">
                                <input type="hidden" name="partidas[${newIndex}][fase]" value="Chaveamento">
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
                                <div class="fase-text">Chaveamento</div>
                                <div class="status-text">Agendada</div>
                            </a>
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
                        fase: 'Chaveamento',
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
                const response = await fetch(`confronto.php?action=salvar_partidas`, {
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