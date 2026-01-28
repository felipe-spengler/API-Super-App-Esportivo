<?php

// rodizio_volei.php - Módulo separado para sistema de rodízio de vôlei
// 
// === RODÍZIO MANUAL PARA FRENTE (horário - padrão do vôlei) ===
function realizarRodizioForward($pdo, $id_partida, $periodo, $id_equipe) {
    $posicoes = getPosicoes($pdo, $id_partida, $periodo, $id_equipe);
    if (count($posicoes) != 6) {
        return ['success' => false, 'message' => 'Posições incompletas.'];
    }

    $novaPos = [];
    foreach ($posicoes as $p) {
        // Rotaçāo horária: posicao 6 -> 1, 1->2, 2->3, etc.
        $nova = ($p['posicao'] == 6) ? 1 : $p['posicao'] + 1;
        $novaPos[$nova] = $p['id_participante'];
    }

    // Salva as novas posições no banco (atualiza cada linha individualmente)
    foreach ($novaPos as $pos => $id_jog) {
        $pdo->prepare("UPDATE sumulas_posicoes SET id_participante = ? WHERE id_partida = ? AND periodo = ? AND id_equipe = ? AND posicao = ?")
                ->execute([$id_jog, $id_partida, $periodo, $id_equipe, $pos]);
    }

    return ['success' => true, 'message' => 'Rodízio realizado!'];
}

// === RODÍZIO MANUAL PARA TRÁS (anti-horário - para desfazer) ===
function realizarRodizioBackward($pdo, $id_partida, $periodo, $id_equipe) {
    $posicoes = getPosicoes($pdo, $id_partida, $periodo, $id_equipe);
    if (count($posicoes) != 6) {
        return ['success' => false, 'message' => 'Posições incompletas.'];
    }

    $novaPos = [];
    foreach ($posicoes as $p) {
        // Rotaçāo anti-horária: posicao 1 -> 6, 2->1, 3->2, etc.
        $nova = ($p['posicao'] == 1) ? 6 : $p['posicao'] - 1;
        $novaPos[$nova] = $p['id_participante'];
    }

    // Salva as novas posições no banco (atualiza cada linha individualmente)
    foreach ($novaPos as $pos => $id_jog) {
        $pdo->prepare("UPDATE sumulas_posicoes SET id_participante = ? WHERE id_partida = ? AND periodo = ? AND id_equipe = ? AND posicao = ?")
                ->execute([$id_jog, $id_partida, $periodo, $id_equipe, $pos]);
    }

    return ['success' => true, 'message' => 'Rodízio revertido!'];
}

function getJogadoresPorEquipeMap($pdo, $id_equipe_a, $id_equipe_b) {
    $map = [];

    // CORREÇÃO SQL: A coluna id_equipe está diretamente na tabela participantes. 
    // Não é necessário fazer JOIN com uma tabela de ligação.
    $stmt = $pdo->prepare("SELECT 
        id, 
        numero_camisa, 
        nome_completo, 
        id_equipe 
    FROM 
        participantes
    WHERE 
        id_equipe IN (?, ?) 
    ORDER BY 
        id_equipe, numero_camisa");

    // ATENÇÃO: Se as colunas id_equipe_a e id_equipe_b puderem ser NULL ou inválidas,
    // é bom garantir que os valores sejam convertidos para string ou int.
    $stmt->execute([$id_equipe_a, $id_equipe_b]);

    // Inicializa os arrays (Garantindo que mesmo sem jogadores, as chaves existam)
    $map[$id_equipe_a] = [];
    $map[$id_equipe_b] = [];

    // Preenche o mapa: map[id_equipe][id_jogador] = {dados_jogador}
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        // Usa o id_equipe retornado pela query para popular o mapa
        $map[$row['id_equipe']][$row['id']] = [
            'id' => $row['id'],
            'numero_camisa' => $row['numero_camisa'],
            'nome_completo' => $row['nome_completo']
        ];
    }

    return $map;
}

// Função para carregar posições de uma equipe em um set
function getPosicoes($pdo, $id_partida, $periodo, $id_equipe) {
    $stmt = $pdo->prepare("SELECT posicao, id_participante FROM sumulas_posicoes WHERE id_partida = ? AND periodo = ? AND id_equipe = ? ORDER BY posicao");
    $stmt->execute([$id_partida, $periodo, $id_equipe]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function realizarRodizioAutomatico($pdo, $id_partida, $periodo, $id_equipe) {

    $stmt = $pdo->prepare("SELECT 
        pos1, pos2, pos3, pos4, pos5, pos6 
    FROM 
        sumulas_posicoes 
    WHERE 
        id_partida = ? AND periodo = ? AND id_equipe = ?");
    $stmt->execute([$id_partida, $periodo, $id_equipe]);
    $posicoes_atuais = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$posicoes_atuais ||
            count(array_filter($posicoes_atuais)) < 6) { // Verifica se há 6 jogadores
        return ['success' => false, 'message' => 'Posições iniciais não encontradas ou incompletas para rodízio.'];
    }

    // Array das posições atuais (ordem de 1 a 6)
    $rodada = [
        $posicoes_atuais['pos1'],
        $posicoes_atuais['pos2'],
        $posicoes_atuais['pos3'],
        $posicoes_atuais['pos4'],
        $posicoes_atuais['pos5'],
        $posicoes_atuais['pos6']
    ];

    // --- 2. LÓGICA DE ROTAÇÃO HORÁRIA (VÔLEI) ---
    $posicoes_novas = [];
    $posicoes_novas['pos1'] = $rodada[1]; // O jogador que estava em P2 vai para P1 (saque)
    $posicoes_novas['pos2'] = $rodada[2]; // O jogador que estava em P3 vai para P2
    $posicoes_novas['pos3'] = $rodada[3]; // O jogador que estava em P4 vai para P3
    $posicoes_novas['pos4'] = $rodada[4]; // O jogador que estava em P5 vai para P4
    $posicoes_novas['pos5'] = $rodada[5]; // O jogador que estava em P6 vai para P5
    $posicoes_novas['pos6'] = $rodada[0]; // O jogador que estava em P1 (saque) vai para P6
    // 3. SALVAR AS NOVAS POSIÇÕES
    $sql_update = "UPDATE sumulas_posicoes SET 
        pos1 = ?, pos2 = ?, pos3 = ?, pos4 = ?, pos5 = ?, pos6 = ? 
    WHERE 
        id_partida = ? AND periodo = ? AND id_equipe = ?";

    $stmt_update = $pdo->prepare($sql_update);
    $result = $stmt_update->execute([
        $posicoes_novas['pos1'],
        $posicoes_novas['pos2'],
        $posicoes_novas['pos3'],
        $posicoes_novas['pos4'],
        $posicoes_novas['pos5'],
        $posicoes_novas['pos6'],
        $id_partida,
        $periodo,
        $id_equipe
    ]);

    if (!$result) {
        return ['success' => false, 'message' => 'Erro ao salvar o rodízio no banco de dados.'];
    }

    return ['success' => true, 'message' => 'Rodízio realizado!'];
}

// Função para rotacionar posições (sentido horário)
function rotacionarPosicoes($pdo, $id_partida, $periodo, $id_equipe) {
    $posicoes = getPosicoes($pdo, $id_partida, $periodo, $id_equipe);
    if (count($posicoes) != 6)
        return; // Erro se não 6 jogadores

    $novaPos = [];
    foreach ($posicoes as $p) {
        $nova = ($p['posicao'] == 1) ? 6 : $p['posicao'] - 1;
        $novaPos[$nova] = $p['id_participante'];
    }

    // Salva as novas posições no banco
    foreach ($novaPos as $pos => $id_jog) {
        $pdo->prepare("UPDATE sumulas_posicoes SET id_participante = ? WHERE id_partida = ? AND periodo = ? AND id_equipe = ? AND posicao = ?")
                ->execute([$id_jog, $id_partida, $periodo, $id_equipe, $pos]);
    }
}

// Funções para gerenciar qual equipe está sacando no set
function getVoleiData($pdo, $id_partida) {
    // Tenta obter o ID da equipe sacando atual. Assume 'sumulas_volei' existe.
    $stmt = $pdo->prepare("SELECT equipe_sacando_atual FROM sumulas_volei WHERE id_partida = ?");
    $stmt->execute([$id_partida]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: ['equipe_sacando_atual' => null];
}

function salvarEquipeSacando($pdo, $id_partida, $id_equipe) {
    // Insere ou atualiza qual equipe está sacando
    $pdo->prepare("INSERT INTO sumulas_volei (id_partida, equipe_sacando_atual) VALUES (?, ?) ON DUPLICATE KEY UPDATE equipe_sacando_atual = ?")
            ->execute([$id_partida, $id_equipe, $id_equipe]);
}

// Lógica AJAX para salvar posições (chamada via POST do main file)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['acao']) && $_POST['acao'] === 'salvar_posicoes' && isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
    // Essa lógica é executada quando o botão "Salvar Posições" é clicado.
    $id_partida = (int) $_GET['id_partida'];
    // Certifique-se de que o caminho do seu banco de dados está correto
    require_once '../includes/db.php';

    $posicoes_json = $_POST['posicoes'] ?? '{}';
    $posicoes = json_decode($posicoes_json, true);
    $periodo = $_POST['periodo'] ?? '';

    if (!$periodo || !$id_partida) {
        echo json_encode(['success' => false, 'message' => 'Dados incompletos para salvar posições.']);
        exit;
    }

    try {
        $pdo->beginTransaction();
        foreach ($posicoes as $id_equipe => $pos) {
            // Garante que os IDs são números inteiros
            $id_equipe = (int) $id_equipe;
            foreach ($pos as $posicao => $id_jog) {
                if ($id_jog) {
                    // Insere/atualiza a posição
                    $pdo->prepare("INSERT INTO sumulas_posicoes (id_partida, periodo, id_equipe, posicao, id_participante) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id_participante = ?")
                            ->execute([$id_partida, $periodo, $id_equipe, $posicao, $id_jog, $id_jog]);
                } else {
                    // Remove a posição se o espaço estiver vazio (jogador no banco)
                    $pdo->prepare("DELETE FROM sumulas_posicoes WHERE id_partida = ? AND periodo = ? AND id_equipe = ? AND posicao = ?")
                            ->execute([$id_partida, $periodo, $id_equipe, $posicao]);
                }
            }
        }
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Posições salvas com sucesso!']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Erro ao salvar: ' . $e->getMessage()]);
    }
    exit;
}

// === AJAX: RODÍZIO MANUAL (para frente ou para trás) ===
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['acao']) && in_array($_POST['acao'], ['rodizio_forward', 'rodizio_backward']) && isset($_SERVER['HTTP_X_REQUESTED_WITH'])) {

    $id_partida = (int) ($_GET['id_partida'] ?? 0);
    $periodo = $_POST['periodo'] ?? '';
    $id_equipe = (int) ($_POST['id_equipe'] ?? 0);

    if (!$id_partida || !$periodo || !$id_equipe) {
        echo json_encode(['success' => false, 'message' => 'Dados inválidos.']);
        exit;
    }

    require_once '../includes/db.php';

    $resultado = $_POST['acao'] === 'rodizio_forward' ? realizarRodizioForward($pdo, $id_partida, $periodo, $id_equipe) : realizarRodizioBackward($pdo, $id_partida, $periodo, $id_equipe);

    echo json_encode($resultado);
    exit;
}

// === AJAX: Inverter lado inicial (grava na tabela sumulas_volei_config) ===
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['acao']) && $_POST['acao'] === 'inverter_lado_inicial' && isset($_SERVER['HTTP_X_REQUESTED_WITH'])) {

    $id_partida = (int) ($_GET['id_partida'] ?? 0);
    if (!$id_partida) {
        echo json_encode(['success' => false, 'message' => 'Partida inválida']);
        exit;
    }

    require_once '../includes/db.php';

    // Garante que existe registro (com padrão equipe A à esquerda)
    $pdo->prepare("
        INSERT INTO sumulas_volei_config (id_partida, equipe_esquerda_primeiro_set) 
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE equipe_esquerda_primeiro_set = equipe_esquerda_primeiro_set
    ")->execute([$id_partida, 0]); // só pra criar a linha se não existir
    // Busca atual e inverte
    $stmt = $pdo->prepare("SELECT id_equipe_a, id_equipe_b FROM partidas WHERE id = ?");
    $stmt->execute([$id_partida]);
    $partida = $stmt->fetch(PDO::FETCH_ASSOC);

    $atual = $pdo->query("SELECT equipe_esquerda_primeiro_set FROM sumulas_volei_config WHERE id_partida = $id_partida")
            ->fetchColumn();

    if (!$atual)
        $atual = $partida['id_equipe_a']; // primeira vez

    $nova = ($atual == $partida['id_equipe_a']) ? $partida['id_equipe_b'] : $partida['id_equipe_a'];

    $pdo->prepare("INSERT INTO sumulas_volei_config (id_partida, equipe_esquerda_primeiro_set) 
                   VALUES (?, ?) ON DUPLICATE KEY UPDATE equipe_esquerda_primeiro_set = ?")
            ->execute([$id_partida, $nova, $nova]);

    echo json_encode(['success' => true]);
    exit;
}

// Função principal para renderizar o HTML da quadra (Div) e Banco (Participantes)
function renderRodizioSection(
        $pdo, $id_partida, $current_period, $next_period, $partida, $jogadores_por_equipe_map,
        $id_equipe_esquerda, $id_equipe_direita, $nome_esquerda, $nome_direita
) {
    $periodo_atual = $current_period ?: $next_period ?: '1º Set';

    // Obtém as posições atuais das equipes
    $posicoes_a = array_column(getPosicoes($pdo, $id_partida, $periodo_atual, $partida['id_equipe_a']), 'id_participante', 'posicao');
    $posicoes_b = array_column(getPosicoes($pdo, $id_partida, $periodo_atual, $partida['id_equipe_b']), 'id_participante', 'posicao');

    // FUNÇÃO: Renderiza a Estrutura da QUADRA de UMA equipe
    $quadra_principal = function ($id_equipe, $posicoes, $partida, $jogadores_por_equipe_map) {
        ob_start();
        $id_map = $jogadores_por_equipe_map[$id_equipe];
        $equipe_key = ($id_equipe == $partida['id_equipe_a']) ? 'a' : 'b';

        // Posições de Ataque (Rede): 4, 3, 2
        // Posições de Defesa (Fundo): 5, 6, 1
        ?>

        <div class="volei-court-team team-<?= $equipe_key ?>" data-id="<?= $id_equipe ?>" id="quadra_<?= $equipe_key ?>">

            <div class="front">
                <?php foreach ([4, 3, 2] as $pos): ?>
                    <div class="pos" data-pos="<?= $pos ?>">
                        <?php if (isset($posicoes[$pos]) && isset($id_map[$posicoes[$pos]])): $jog = $id_map[$posicoes[$pos]]; ?>
                            <div class="jogador-pos" data-id="<?= $jog['id'] ?>">
                                <span class="num-camisa"><?= htmlspecialchars($jog['numero_camisa']) ?></span>
                                <span class="nome-jog"><?= htmlspecialchars(explode(' ', $jog['nome_completo'])[0]) ?></span>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            </div>

            <div class="back">
                <?php foreach ([5, 6, 1] as $pos): ?>
                    <div class="pos" data-pos="<?= $pos ?>">
                        <?php if (isset($posicoes[$pos]) && isset($id_map[$posicoes[$pos]])): $jog = $id_map[$posicoes[$pos]]; ?>
                            <div class="jogador-pos" data-id="<?= $jog['id'] ?>">
                                <span class="num-camisa"><?= htmlspecialchars($jog['numero_camisa']) ?></span>
                                <span class="nome-jog"><?= htmlspecialchars(explode(' ', $jog['nome_completo'])[0]) ?></span>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    };

    // FUNÇÃO: Renderiza o BANCO DE RESERVAS de UMA equipe
    $reservas_html = function ($id_equipe, $posicoes_raw, $partida, $jogadores_por_equipe_map) use ($id_partida, $periodo_atual) {
        ob_start();
        $id_map = $jogadores_por_equipe_map[$id_equipe] ?? [];
        $equipe_key = ($id_equipe == $partida['id_equipe_a']) ? 'a' : 'b';
        $equipe_name = ($id_equipe == $partida['id_equipe_a']) ? $partida['nome_equipe_a'] : $partida['nome_equipe_b'];

        // === FORÇA CARREGAR POSIÇÕES ATUAIS DO BANCO (NUNCA MAIS VAI DAR PAU) ===
        global $pdo;
        $stmt = $pdo->prepare("
        SELECT posicao, id_participante 
        FROM sumulas_posicoes 
        WHERE id_partida = ? AND periodo = ? AND id_equipe = ?
    ");
        $stmt->execute([$id_partida, $periodo_atual, $id_equipe]);
        $posicoes = $stmt->fetchAll(PDO::FETCH_KEY_PAIR); // posicao => id_participante
        // Agora sim: todos os IDs que estão na quadra
        $jogadores_em_quadra = array_filter($posicoes); // remove posições vazias (null)
        ?>
        <div class="banco-reservas mb-4">
            <h5 class="text-center fw-bold text-primary mb-3">
                Reservas <?= htmlspecialchars($equipe_name) ?>
            </h5>
            <div class="d-flex flex-wrap gap-3 justify-content-center p-3 bg-light rounded border" 
                 id="banco_<?= $equipe_key ?>">
                     <?php foreach ($id_map as $id_jog => $jog): ?>
                         <?php if (!in_array($id_jog, $jogadores_em_quadra, true)): ?>
                        <div class="jogador-pos bg-primary text-white text-center p-2 rounded shadow-sm" 
                             data-id="<?= $jog['id'] ?>" 
                             data-team="<?= $id_equipe ?>"
                             style="width: 90px; min-height: 60px; cursor: grab; font-size: 0.85rem;">
                            <span class="num-camisa d-block fw-bold fs-5"><?= htmlspecialchars($jog['numero_camisa']) ?></span>
                            <small class="nome-jog d-block"><?= htmlspecialchars(explode(' ', $jog['nome_completo'])[0]) ?></small>
                        </div>
                    <?php endif; ?>
                <?php endforeach; ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    };

    // CORPO PRINCIPAL DA SEÇÃO DE RODÍZIO
    ob_start();
    ?>
    <!-- FUNÇÃO AUXILIAR PARA RENDERIZAR JOGADOR -->
    <?php

    function renderJogador($id_jogador, $map) {
        if (!$id_jogador || !isset($map[$id_jogador])) {
            return '<div class="pos-empty"></div>';
        }
        $j = $map[$id_jogador];
        return '<div class="jogador-pos" data-id="' . $j['id'] . '">
                <span class="num-camisa">' . htmlspecialchars($j['numero_camisa']) . '</span>
                <span class="nome-jog">' . htmlspecialchars(explode(' ', $j['nome_completo'])[0]) . '</span>
            </div>';
    }
    ?>
    <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
            <div>
                <i class="fas fa-arrows-alt me-2"></i>
                Rodízio e Substituições (<?= htmlspecialchars($periodo_atual) ?>)
            </div>
            <?php if (!$current_period || $current_period === '1º Set'): ?>
                <button id="btn-inverter-lado" class="btn btn-warning btn-sm">
                    <i class="fas fa-exchange-alt"></i> Inverter Lado Inicial
                </button>
            <?php endif; ?>
        </div>
        <div class="card-body">

            <!-- QUADRA CLÁSSICA HORIZONTAL (SÚMULA OFICIAL) -->
            <div class="classic-volei-court">
                <!-- Cabeçalhos das equipes (dinâmicos conforme o lado escolhido) -->
                <div class="team-name-left"><?= htmlspecialchars($nome_esquerda) ?></div>
                <div class="team-name-right"><?= htmlspecialchars($nome_direita) ?></div>

                <?php
                // Carrega as posições da equipe que está à esquerda e à direita no momento
                $posicoes_esquerda = array_column(getPosicoes($pdo, $id_partida, $periodo_atual, $id_equipe_esquerda), 'id_participante', 'posicao');
                $posicoes_direita = array_column(getPosicoes($pdo, $id_partida, $periodo_atual, $id_equipe_direita), 'id_participante', 'posicao');
                ?>

                <!-- PRIMEIRA LINHA (fundo da quadra) -->
                <div class="court-row">
                    <div class="pos-left" data-equipe="<?= $id_equipe_esquerda ?>" data-pos="5">
                        <?= renderJogador($posicoes_esquerda[5] ?? null, $jogadores_por_equipe_map[$id_equipe_esquerda]) ?>
                    </div>
                    <div class="pos-left" data-equipe="<?= $id_equipe_esquerda ?>" data-pos="4">
                        <?= renderJogador($posicoes_esquerda[4] ?? null, $jogadores_por_equipe_map[$id_equipe_esquerda]) ?>
                    </div>
                    <div class="net-cell"></div>
                    <div class="pos-right" data-equipe="<?= $id_equipe_direita ?>" data-pos="2">
                        <?= renderJogador($posicoes_direita[2] ?? null, $jogadores_por_equipe_map[$id_equipe_direita]) ?>
                    </div>
                    <div class="pos-right" data-equipe="<?= $id_equipe_direita ?>" data-pos="1">
                        <?= renderJogador($posicoes_direita[1] ?? null, $jogadores_por_equipe_map[$id_equipe_direita]) ?>
                    </div>
                </div>

                <!-- SEGUNDA LINHA (meio da quadra) -->
                <div class="court-row">
                    <div class="pos-left" data-equipe="<?= $id_equipe_esquerda ?>" data-pos="6">
                        <?= renderJogador($posicoes_esquerda[6] ?? null, $jogadores_por_equipe_map[$id_equipe_esquerda]) ?>
                    </div>
                    <div class="pos-left" data-equipe="<?= $id_equipe_esquerda ?>" data-pos="3">
                        <?= renderJogador($posicoes_esquerda[3] ?? null, $jogadores_por_equipe_map[$id_equipe_esquerda]) ?>
                    </div>
                    <div class="net-cell"></div>
                    <div class="pos-right" data-equipe="<?= $id_equipe_direita ?>" data-pos="3">
                        <?= renderJogador($posicoes_direita[3] ?? null, $jogadores_por_equipe_map[$id_equipe_direita]) ?>
                    </div>
                    <div class="pos-right" data-equipe="<?= $id_equipe_direita ?>" data-pos="6">
                        <?= renderJogador($posicoes_direita[6] ?? null, $jogadores_por_equipe_map[$id_equipe_direita]) ?>
                    </div>
                </div>

                <!-- TERCEIRA LINHA (rede) -->
                <div class="court-row">
                    <div class="pos-left" data-equipe="<?= $id_equipe_esquerda ?>" data-pos="1">
                        <?= renderJogador($posicoes_esquerda[1] ?? null, $jogadores_por_equipe_map[$id_equipe_esquerda]) ?>
                    </div>
                    <div class="pos-left" data-equipe="<?= $id_equipe_esquerda ?>" data-pos="2">
                        <?= renderJogador($posicoes_esquerda[2] ?? null, $jogadores_por_equipe_map[$id_equipe_esquerda]) ?>
                    </div>
                    <div class="net-cell"></div>
                    <div class="pos-right" data-equipe="<?= $id_equipe_direita ?>" data-pos="4">
                        <?= renderJogador($posicoes_direita[4] ?? null, $jogadores_por_equipe_map[$id_equipe_direita]) ?>
                    </div>
                    <div class="pos-right" data-equipe="<?= $id_equipe_direita ?>" data-pos="5">
                        <?= renderJogador($posicoes_direita[5] ?? null, $jogadores_por_equipe_map[$id_equipe_direita]) ?>
                    </div>
                </div>
            </div>

            <hr>

            <!-- BOTÕES DE RODÍZIO MANUAL -->
            <div class="text-center my-4">
                <button class="btn btn-primary btn-md me-3 btn-rodizio" data-direcao="forward" data-equipe="<?= $id_equipe_esquerda ?>">
                    <i class="fas fa-redo"></i> Rodízio <?= htmlspecialchars($nome_esquerda) ?>
                </button>
                <button class="btn btn-outline-primary btn-md me-5 btn-rodizio" data-direcao="backward" data-equipe="<?= $id_equipe_esquerda ?>">
                    <i class="fas fa-undo"></i> Reverter
                </button>

                <button class="btn btn-primary btn-md ms-5 btn-rodizio" data-direcao="forward" data-equipe="<?= $id_equipe_direita ?>">
                    <i class="fas fa-redo"></i> Rodízio <?= htmlspecialchars($nome_direita) ?>
                </button>
                <button class="btn btn-outline-primary btn-md btn-rodizio" data-direcao="backward" data-equipe="<?= $id_equipe_direita ?>">
                    <i class="fas fa-undo"></i> Reverter
                </button>
            </div>

            <hr>

            <!-- BANCOS DE RESERVAS (seguem o lado da quadra) -->
            <div class="row mt-4">
                <div class="col-md-6">
                    <?= $reservas_html($id_equipe_esquerda, $posicoes_esquerda, $partida, $jogadores_por_equipe_map) ?>
                </div>
                <div class="col-md-6">
                    <?= $reservas_html($id_equipe_direita, $posicoes_direita, $partida, $jogadores_por_equipe_map) ?>
                </div>
            </div>

            <div class="text-center mt-4">
                <button id="salvar-posicoes" class="btn btn-success btn-lg">
                    <i class="fas fa-save me-2"></i> Salvar Posições
                </button>
            </div>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.14.0/Sortable.min.js"></script>

    <style>
        .classic-volei-court {
            max-width: 900px;
            margin: 30px auto;
            background: #f8f9fa;
            border: 3px solid #000;
            border-radius: 12px;
            padding: 20px;
            position: relative;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }

        .team-name-left, .team-name-right {
            position: absolute;
            top: 10px;
            font-weight: bold;
            font-size: 1.3rem;
            background: #333;
            color: white;
            padding: 8px 20px;
            border-radius: 8px;
        }

        .team-name-left {
            left: 20px;
        }
        .team-name-right {
            right: 20px;
        }

        .court-row {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin: 20px 0;
        }

        .pos-left, .pos-right {
            width: 110px;
            height: 110px;
            border: 3px solid #000;
            background: #55aa55;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            cursor: grab;
        }

        .net-cell {
            width: 80px;
            background: linear-gradient(to bottom, red 45%, white 45%, white 55%, red 55%);
            border-left: 8px solid #000;
            border-right: 8px solid #000;
            position: relative;
        }

        .net-cell::after {
            content: 'REDE';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(90deg);
            background: white;
            color: red;
            font-weight: bold;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 0.9rem;
        }

        .jogador-pos {
            background: #007bff;
            color: white;
            width: 90%;
            height: 90%;
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.4);
            cursor: grab;
        }

        .num-camisa {
            font-size: 2rem;
            font-weight: bold;
        }
        .nome-jog {
            font-size: 0.9rem;
            margin-top: 4px;
        }

        .pos-empty {
            color: #aaa;
            font-style: italic;
        }

        /* Responsivo */
        @media (max-width: 768px) {
            .court-row {
                gap: 8px;
            }
            .pos-left, .pos-right {
                width: 80px;
                height: 80px;
            }
            .num-camisa {
                font-size: 1.5rem;
            }
        }
    </style>
    html<script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.14.0/Sortable.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            // === POSIÇÕES NA QUADRA (agora são .pos-left e .pos-right) ===
            const posicoesQuadra = document.querySelectorAll('.pos-left, .pos-right');
            const bancoA = document.getElementById('banco_a');
            const bancoB = document.getElementById('banco_b');

            // Drag & Drop nas posições da quadra (só aceita 1 jogador por posição)
            posicoesQuadra.forEach(pos => {
                new Sortable(pos, {
                    group: 'jogadores',
                    animation: 150,
                    ghostClass: 'sortable-ghost',
                    draggable: '.jogador-pos',
                    onAdd: function (evt) {
                        // Primeiro: garante apenas 1 jogador por posição (já existia)
                        if (evt.to.children.length > 1) {
                            const novo = evt.item;
                            const antigo = [...evt.to.children].find(el => el !== novo);
                            if (antigo && evt.from) {
                                evt.from.appendChild(antigo);
                            }
                            evt.clone?.remove();
                        }

                        // NOVO: impede jogador de equipe errada
                        const teamJogador = evt.item.dataset.team;
                        const teamPosicao = evt.to.dataset.equipe;

                        if (teamJogador && teamPosicao && teamJogador !== teamPosicao) {
                            // Reverte o movimento
                            evt.from.appendChild(evt.item);
                            evt.clone?.remove();

                            Swal.fire({
                                icon: 'error',
                                title: 'Erro',
                                text: 'Jogador pertence à outra equipe!',
                                toast: true,
                                position: 'top-end',
                                timer: 3000,
                                timerProgressBar: true
                            });
                        }
                    }
                });
            });

            // Drag & Drop no banco de reservas (aceita vários)
            [bancoA, bancoB].forEach(banco => {
                if (banco) {
                    new Sortable(banco, {
                        group: 'jogadores',
                        animation: 150,
                        ghostClass: 'sortable-ghost',
                        draggable: '.jogador-pos'
                    });
                }
            });

            // === BOTÃO SALVAR POSIÇÕES (agora pega pelos data-equipe e data-pos) ===
            const btnSalvar = document.getElementById('salvar-posicoes');
            if (!btnSalvar)
                return;

            btnSalvar.addEventListener('click', async function () {
                const posicoes = {};

                // Pega TODAS as posições da quadra (esquerda e direita)
                document.querySelectorAll('.pos-left, .pos-right').forEach(div => {
                    const equipeId = div.dataset.equipe;
                    const posicao = div.dataset.pos;
                    if (!equipeId || !posicao)
                        return;

                    if (!posicoes[equipeId])
                        posicoes[equipeId] = {};
                    const jogador = div.querySelector('.jogador-pos');
                    posicoes[equipeId][posicao] = jogador ? jogador.dataset.id : null;
                });

                console.log('Posições enviadas:', posicoes);

                const fd = new FormData();
                fd.append('acao', 'salvar_posicoes');
                fd.append('posicoes', JSON.stringify(posicoes));
                fd.append('periodo', '<?= $periodo_atual ?>');

                try {
                    const res = await fetch('rodizio_volei.php?id_partida=<?= $id_partida ?>', {
                        method: 'POST',
                        body: fd,
                        headers: {'X-Requested-With': 'XMLHttpRequest'}
                    });
                    const data = await res.json();

                    if (data.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Salvo!',
                            text: 'Posições atualizadas com sucesso!',
                            toast: true,
                            position: 'top-end',
                            timer: 3000
                        });
                        setTimeout(() => location.reload(), 1200);
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Erro',
                            text: data.message || 'Falha ao salvar',
                            toast: true,
                            position: 'top-end'
                        });
                    }
                } catch (err) {
                    console.error(err);
                    Swal.fire('Erro', 'Falha na conexão', 'error');
                }
            });

            document.querySelectorAll('.btn-rodizio').forEach(btn => {
                btn.addEventListener('click', function () {
                    const direcao = this.dataset.direcao; // forward ou backward
                    const id_equipe = this.dataset.equipe;

                    const fd = new FormData();
                    fd.append('acao', direcao === 'forward' ? 'rodizio_forward' : 'rodizio_backward');
                    fd.append('id_equipe', id_equipe);
                    fd.append('periodo', '<?= $periodo_atual ?>');

                    fetch('rodizio_volei.php?id_partida=<?= $id_partida ?>', {
                        method: 'POST',
                        body: fd,
                        headers: {'X-Requested-With': 'XMLHttpRequest'}
                    })
                            .then(r => r.json())
                            .then(data => {
                                if (data.success) {
                                    Swal.fire({
                                        icon: 'success',
                                        title: 'Feito!',
                                        text: data.message,
                                        timer: 1200,
                                        toast: true,
                                        position: 'top-end'
                                    });
                                    setTimeout(() => location.reload(), 800);
                                } else {
                                    Swal.fire('Erro', data.message, 'error');
                                }
                            });
                });
            });

            // BOTÃO INVERTER LADO INICIAL (grava no banco e recarrega)
            document.getElementById('btn-inverter-lado')?.addEventListener('click', function () {
                if (!confirm('Tem certeza que quer inverter o lado inicial das equipes? Isso afeta todos os sets.')) {
                    return;
                }

                const fd = new FormData();
                fd.append('acao', 'inverter_lado_inicial');

                fetch('rodizio_volei.php?id_partida=<?= $id_partida ?>', {
                    method: 'POST',
                    body: fd,
                    headers: {'X-Requested-With': 'XMLHttpRequest'}
                })
                        .then(r => r.json())
                        .then(data => {
                            if (data.success) {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Lado invertido!',
                                    text: 'A página será recarregada.',
                                    timer: 1500,
                                    showConfirmButton: false
                                });
                                setTimeout(() => location.reload(), 1600);
                            } else {
                                Swal.fire('Erro', data.message || 'Não foi possível inverter.', 'error');
                            }
                        })
                        .catch(() => Swal.fire('Erro', 'Falha na comunicação.', 'error'));
            });
        });

    </script>
    <scritp>

    </scritp>
    <?php
    return ob_get_clean();
}
