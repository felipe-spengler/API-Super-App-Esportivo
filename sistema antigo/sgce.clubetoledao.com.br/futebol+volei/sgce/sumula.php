<?php
// Habilitar exibição de erros para depuração (remova em produção)

require_once './includes/db.php';

if (!isset($_GET['id_partida']) || !is_numeric($_GET['id_partida'])) {
    header("Location: gerenciar_campeonatos.php");
    exit();
}
$id_partida = (int)$_GET['id_partida'];

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    $stmt_partida = $pdo->prepare("SELECT p.*, c.id as id_campeonato, c.nome as nome_campeonato, equipe_a.id as id_equipe_a, equipe_a.nome as nome_equipe_a, equipe_b.id as id_equipe_b, equipe_b.nome as nome_equipe_b FROM partidas p JOIN campeonatos c ON p.id_campeonato = c.id JOIN equipes equipe_a ON p.id_equipe_a = equipe_a.id JOIN equipes equipe_b ON p.id_equipe_b = equipe_b.id WHERE p.id = ?");
    $stmt_partida->execute([$id_partida]);
    $partida = $stmt_partida->fetch(PDO::FETCH_ASSOC);

    if (!$partida) {
        throw new Exception("Partida não encontrada.");
    }
} catch (Exception $e) {
    error_log("Erro ao carregar dados da partida: " . $e->getMessage());
    die("Erro interno do servidor. Por favor, tente novamente mais tarde.");
}

// Função para determinar o período atual e o minuto com base no tempo decorrido efetivo do período atual
function getPeriodoEMinuto($pdo, $id_partida) {
    try {
        $stmt_current = $pdo->prepare("SELECT periodo, hora_inicio FROM sumulas_periodos WHERE id_partida = ? AND hora_fim IS NULL AND periodo NOT LIKE 'Pausa %' ORDER BY id DESC LIMIT 1");
        $stmt_current->execute([$id_partida]);
        $current_period = $stmt_current->fetch(PDO::FETCH_ASSOC);
        
        if (!$current_period || !$current_period['hora_inicio']) {
            return ['periodo' => null, 'minuto' => 0];
        }

        $periodo = $current_period['periodo'];
        $hora_inicio = new DateTime($current_period['hora_inicio']);
        $hora_atual = new DateTime();
        $interval = $hora_atual->diff($hora_inicio);
        $segundos_totais = ($interval->days * 24 * 3600) + ($interval->h * 3600) + ($interval->i * 60) + $interval->s;

        // Calcular segundos pausados no período atual
        $stmt_timeouts = $pdo->prepare("SELECT hora_inicio, hora_fim FROM sumulas_periodos WHERE id_partida = ? AND periodo = ? ORDER BY hora_inicio");
        $stmt_timeouts->execute([$id_partida, "Pausa $periodo"]);
        $timeouts = $stmt_timeouts->fetchAll(PDO::FETCH_ASSOC);
        $segundos_paused = 0;
        foreach ($timeouts as $to) {
            $start_to = new DateTime($to['hora_inicio']);
            $end_to = $to['hora_fim'] ? new DateTime($to['hora_fim']) : $hora_atual;
            if ($end_to > $hora_atual) $end_to = $hora_atual;
            $interval_to = $end_to->diff($start_to);
            $segundos_paused += ($interval_to->days * 24 * 3600) + ($interval_to->h * 3600) + ($interval_to->i * 60) + $interval_to->s;
        }
        $segundos_efetivos = max(0, $segundos_totais - $segundos_paused);

        $minuto = floor($segundos_efetivos / 60);

        return ['periodo' => $periodo, 'minuto' => $minuto];
    } catch (Exception $e) {
        error_log("Erro em getPeriodoEMinuto: " . $e->getMessage());
        return ['periodo' => null, 'minuto' => 0];
    }
}

$has_open_pause = false;
// Verificar se há pausa aberta
try {
    $stmt = $pdo->prepare("SELECT 1 FROM sumulas_periodos WHERE id_partida = ? AND periodo LIKE 'Pausa %' AND hora_fim IS NULL LIMIT 1");
    $stmt->execute([$id_partida]);
    $has_open_pause = (bool)$stmt->fetchColumn();
} catch (PDOException $e) {
    error_log("Erro ao verificar pausa aberta: " . $e->getMessage());
    $has_open_pause = false;
}

// --- LÓGICA PARA REGISTRAR TEMPOS VIA AJAX ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['registrar_tempo'])) {
    $acao = $_POST['acao'] ?? '';
    $is_ajax = isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    
    // Log para depuração
    if (empty($acao)) {
        error_log("Ação não informada no POST: " . print_r($_POST, true));
        $response = ['success' => false, 'type' => 'error', 'message' => 'Ação não especificada.'];
    } else {
        $response = ['success' => false, 'type' => 'error', 'message' => 'Ação inválida: ' . htmlspecialchars($acao)];
    }

    try {
        $pdo->beginTransaction();
        
        $periodsOrder = ['Primeiro Tempo', 'Segundo Tempo', 'Tempo Extra', 'Penalti'];
        
      if($acao === 'atualizar_tempos'){
             $response =
              $stmt_periodos = $pdo->prepare("SELECT * FROM sumulas_periodos WHERE id_partida = ? ORDER BY id");
            $stmt_periodos->execute([$id_partida]);
            $periodos = $stmt_periodos->fetchAll(PDO::FETCH_ASSOC);

            $stmt_timeouts = $pdo->prepare("
                SELECT t.id, t.periodo, t.hora_inicio, t.hora_fim, t.id_equipe_a, t.id_equipe_b, 
                    CASE 
                        WHEN t.id_equipe_a = p.id_equipe_a THEN ea.nome 
                        WHEN t.id_equipe_b = p.id_equipe_b THEN eb.nome 
                        ELSE NULL 
                    END as nome_equipe 
                FROM sumulas_periodos t 
                LEFT JOIN partidas p ON t.id_partida = p.id 
                LEFT JOIN equipes ea ON p.id_equipe_a = ea.id 
                LEFT JOIN equipes eb ON p.id_equipe_b = eb.id 
                WHERE t.id_partida = ? AND t.periodo LIKE 'Pausa %'
                ORDER BY t.hora_inicio
            ");
            $stmt_timeouts->execute([$id_partida]);
            $timeouts = $stmt_timeouts->fetchAll(PDO::FETCH_ASSOC);

            $stmt_partida = $pdo->prepare("SELECT hora_fim FROM partidas WHERE id = ?");
            $stmt_partida->execute([$id_partida]);
            $partida = $stmt_partida->fetch(PDO::FETCH_ASSOC);

            $periodsData = array_filter($periodos, function($p) {
                return strpos($p['periodo'], 'Pausa ') !== 0;
            });
            
            $response = [
                'success' => true,
                'periodsData' => array_map(function($p) {
                    return [
                        'periodo' => $p['periodo'],
                        'start' => $p['hora_inicio'] ? (new DateTime($p['hora_inicio']))->getTimestamp() * 1000 : null,
                        'end' => $p['hora_fim'] ? (new DateTime($p['hora_fim']))->getTimestamp() * 1000 : null,
                        'id_equipe_a' => $p['id_equipe_a'] ?: null,
                        'id_equipe_b' => $p['id_equipe_b'] ?: null
                    ];
                }, array_values($periodsData)),
                'pauses' => array_map(function($t) {
                    return [
                        'id' => (int)$t['id'],
                        'periodo' => $t['periodo'],
                        'start' => (new DateTime($t['hora_inicio']))->getTimestamp() * 1000,
                        'end' => $t['hora_fim'] ? (new DateTime($t['hora_fim']))->getTimestamp() * 1000 : null,
                        'id_equipe_a' => $t['id_equipe_a'] ?: null,
                        'id_equipe_b' => $t['id_equipe_b'] ?: null,
                        'nome_equipe' => $t['nome_equipe'] ?: ''
                    ];
                }, $timeouts),
                'horaFimMatch' => $partida['hora_fim'] ? (new DateTime($partida['hora_fim']))->getTimestamp() * 1000 : null
            ];
        }
        
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        $response = ['success' => false, 'type' => 'error', 'message' => 'Erro: ' . $e->getMessage()];
        error_log("Erro ao registrar tempo ($acao): " . $e->getMessage());
    }

    if ($is_ajax) {
        header('Content-Type: application/json');
        echo json_encode($response);
        exit();
    } else {
        $_SESSION['notificacao'] = ['tipo' => $response['type'], 'mensagem' => $response['message']];
        header("Location: registrar_sumula.php?id_partida=$id_partida");
        exit();
    }
}

// --- LÓGICA PARA ADICIONAR EVENTO ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_evento'])) {
    $id_participante = $_POST['id_participante'] ?? '';
    $tipo_evento = $_POST['tipo_evento'] ?? '';

    if (!$id_participante || !$tipo_evento) {
        $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Participante ou tipo de evento não especificado.'];
        header("Location: registrar_sumula.php?id_partida=$id_partida");
        exit();
    }

    $periodo_info = getPeriodoEMinuto($pdo, $id_partida);
    $periodo = $periodo_info['periodo'];
    $minuto = $periodo_info['minuto'];

    if (!$periodo) {
        $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Nenhum período aberto para adicionar evento.'];
        header("Location: registrar_sumula.php?id_partida=$id_partida");
        exit();
    }

    try {
        $pdo->beginTransaction();

        $stmt_equipe_jogador = $pdo->prepare("SELECT id_equipe FROM participantes WHERE id = ?");
        $stmt_equipe_jogador->execute([$id_participante]);
        $id_equipe = $stmt_equipe_jogador->fetchColumn();

        if ($id_equipe === false) {
            throw new Exception('Participante não encontrado.');
        }

        $_SESSION['notificacao'] = ['tipo' => 'success', 'mensagem' => 'Evento adicionado com sucesso!'];
    } catch (Exception $e) {
        $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro ao adicionar evento: ' . $e->getMessage()];
        error_log("Erro ao adicionar evento: " . $e->getMessage());
    }
    
    header("Location: registrar_sumula.php?id_partida=$id_partida");
    exit();
}


// --- BUSCA DE DADOS ---
try {
    $stmt_jogadores = $pdo->prepare("SELECT id, numero_camisa, nome_completo, id_equipe FROM participantes WHERE id_equipe IN (?, ?) ORDER BY nome_completo");
    $stmt_jogadores->execute([$partida['id_equipe_a'], $partida['id_equipe_b']]);
    $jogadores_list = $stmt_jogadores->fetchAll(PDO::FETCH_ASSOC);

    $jogadores_por_equipe = [];
    foreach ($jogadores_list as $jogador) {
        $jogadores_por_equipe[$jogador['id_equipe']][] = $jogador;
    }

    $stmt_eventos = $pdo->prepare("SELECT s.*, p.nome_completo, e.nome as nome_equipe FROM sumulas_eventos s JOIN participantes p ON s.id_participante = p.id JOIN equipes e ON s.id_equipe = e.id WHERE s.id_partida = ? ORDER BY s.periodo, s.minuto_evento");
    $stmt_eventos->execute([$id_partida]);
    $eventos = $stmt_eventos->fetchAll(PDO::FETCH_ASSOC);

    $stmt_timeouts = $pdo->prepare("
        SELECT t.id, t.periodo, t.hora_inicio, t.hora_fim, t.id_equipe_a, t.id_equipe_b, 
               CASE 
                   WHEN t.id_equipe_a = p.id_equipe_a THEN ea.nome 
                   WHEN t.id_equipe_b = p.id_equipe_b THEN eb.nome 
                   ELSE NULL 
               END as nome_equipe 
        FROM sumulas_periodos t 
        LEFT JOIN partidas p ON t.id_partida = p.id 
        LEFT JOIN equipes ea ON p.id_equipe_a = ea.id 
        LEFT JOIN equipes eb ON p.id_equipe_b = eb.id 
        WHERE t.id_partida = ? AND t.periodo LIKE 'Pausa %'
        ORDER BY t.hora_inicio
    ");
    $stmt_timeouts->execute([$id_partida]);
    $timeouts = $stmt_timeouts->fetchAll(PDO::FETCH_ASSOC);

    $stmt_periodos = $pdo->prepare("SELECT * FROM sumulas_periodos WHERE id_partida = ? ORDER BY id");
    $stmt_periodos->execute([$id_partida]);
    $periodos = $stmt_periodos->fetchAll(PDO::FETCH_ASSOC);

    $stmt_current_period = $pdo->prepare("SELECT periodo, id, id_equipe_a, id_equipe_b, hora_inicio FROM sumulas_periodos WHERE id_partida = ? AND hora_fim IS NULL AND periodo NOT LIKE 'Pausa %' ORDER BY id DESC LIMIT 1");
    $stmt_current_period->execute([$id_partida]);
    $current_period_row = $stmt_current_period->fetch(PDO::FETCH_ASSOC);
    $current_period = $current_period_row ? $current_period_row['periodo'] : null;
    $current_period_id = $current_period_row ? $current_period_row['id'] : null;
    $current_team_id = $current_period_row ? ($current_period_row['id_equipe_a'] ?: $current_period_row['id_equipe_b']) : null;

    $stmt_last_finalized = $pdo->prepare("SELECT periodo FROM sumulas_periodos WHERE id_partida = ? AND hora_fim IS NOT NULL AND periodo NOT LIKE 'Pausa %' ORDER BY id DESC LIMIT 1");
    $stmt_last_finalized->execute([$id_partida]);
    $last_finalized = $stmt_last_finalized->fetchColumn();

    $periodsOrder = ['Primeiro Tempo', 'Segundo Tempo', 'Tempo Extra', 'Penalti'];

    $next_period = null;
    if (!$current_period) {
        if (!$last_finalized) {
            $next_period = $periodsOrder[0];
        } else {
            $last_index = array_search($last_finalized, $periodsOrder);
            if ($last_index !== false && $last_index + 1 < count($periodsOrder)) {
                $next_period = $periodsOrder[$last_index + 1];
            }
        }
    }

} catch (Exception $e) {
    error_log("Erro ao carregar dados: " . $e->getMessage());
    die("Erro interno do servidor. Por favor, tente novamente mais tarde.");
}

require_once 'includes/header.php'; // Header público
?>

<nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
    <div class="container">
        <a class="navbar-brand fw-bold" href="/sgce/index.php"><i class="fas fa-trophy me-2"></i>SGCE</a>
        <div class="ms-auto">
            <a href="/sgce/login.php" class="btn btn-primary"><i class="fas fa-sign-in-alt me-2"></i>Acessar Painel</a>
        </div>
    </div>
</nav>  


<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-file-signature fa-fw me-2"></i>Súmula: <?= htmlspecialchars($partida['nome_equipe_a']) ?> vs <?= htmlspecialchars($partida['nome_equipe_b']) ?></h1>
</div>

<?php 
try {
    $stmt_current_pause = $pdo->prepare("
        SELECT periodo 
        FROM sumulas_periodos 
        WHERE periodo IN ('Pausa Primeiro Tempo', 'Pausa Segundo Tempo', 'Pausa Tempo Extra', 'Pausa Penalti') 
        AND id_partida = ? 
        AND hora_fim IS NULL 
        GROUP BY periodo 
        ORDER BY id DESC 
        LIMIT 1
    ");
    $stmt_current_pause->execute([$id_partida]);
    $curent_periodo_pause = $stmt_current_pause->fetchColumn() ?: ($current_period ? 'Pausa ' . $current_period : '');
} catch (PDOException $e) {
    error_log("Erro ao buscar período de pausa atual: " . $e->getMessage());
    $curent_periodo_pause = $current_period ? 'Pausa ' . $current_period : '';
}
?>


<!-- Relógio das Etapas -->
<div class="card mb-4">
    <div class="card-header"><i class="fas fa-stopwatch me-1"></i> Relógio das Etapas</div>
    <div class="card-body">
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Etapa</th>
                    <th>Cronômetro</th>
                    <th>Pausas (Início - Fim, Duração, Equipe)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Primeiro Tempo</td>
                    <td><span id="chrono_primeiro_tempo">00:00:00</span></td>
                    <td id="pausas_primeiro_tempo">
                        <?php
                        $pausas_primeiro = array_filter($timeouts, function($t) { return $t['periodo'] === 'Pausa Primeiro Tempo'; });
                        echo implode(', ', array_map(function($t) use ($partida) {
                            $start_time = strtotime($t['hora_inicio']);
                            $end_time = $t['hora_fim'] ? strtotime($t['hora_fim']) : time();
                            $duration = floor(($end_time - $start_time) / 60);
                            $equipe = $t['id_equipe_a'] == $partida['id_equipe_a'] ? $partida['nome_equipe_a'] : ($t['id_equipe_b'] == $partida['id_equipe_b'] ? $partida['nome_equipe_b'] : '');
                            $str = date('H:i:s', $start_time);
                            $str .= $t['hora_fim'] ? ' - ' . date('H:i:s', $end_time) : ' - Em andamento';
                            $str .= " ($duration min, $equipe)";
                            return htmlspecialchars($str);
                        }, $pausas_primeiro)) ?: 'Nenhuma pausa';
                        ?>
                    </td>
                </tr>
                <tr>
                    <td>Segundo Tempo</td>
                    <td><span id="chrono_segundo_tempo">00:00:00</span></td>
                    <td id="pausas_segundo_tempo">
                        <?php
                        $pausas_segundo = array_filter($timeouts, function($t) { return $t['periodo'] === 'Pausa Segundo Tempo'; });
                        echo implode(', ', array_map(function($t) use ($partida) {
                            $start_time = strtotime($t['hora_inicio']);
                            $end_time = $t['hora_fim'] ? strtotime($t['hora_fim']) : time();
                            $duration = floor(($end_time - $start_time) / 60);
                            $equipe = $t['id_equipe_a'] == $partida['id_equipe_a'] ? $partida['nome_equipe_a'] : ($t['id_equipe_b'] == $partida['id_equipe_b'] ? $partida['nome_equipe_b'] : '');
                            $str = date('H:i:s', $start_time);
                            $str .= $t['hora_fim'] ? ' - ' . date('H:i:s', $end_time) : ' - Em andamento';
                            $str .= " ($duration min, $equipe)";
                            return htmlspecialchars($str);
                        }, $pausas_segundo)) ?: 'Nenhuma pausa';
                        ?>
                    </td>
                </tr>
                <tr>
                    <td>Tempo Extra</td>
                    <td><span id="chrono_tempo_extra">00:00:00</span></td>
                    <td id="pausas_tempo_extra">
                        <?php
                        $pausas_extra = array_filter($timeouts, function($t) { return $t['periodo'] === 'Pausa Tempo Extra'; });
                        echo implode(', ', array_map(function($t) use ($partida) {
                            $start_time = strtotime($t['hora_inicio']);
                            $end_time = $t['hora_fim'] ? strtotime($t['hora_fim']) : time();
                            $duration = floor(($end_time - $start_time) / 60);
                            $equipe = $t['id_equipe_a'] == $partida['id_equipe_a'] ? $partida['nome_equipe_a'] : ($t['id_equipe_b'] == $partida['id_equipe_b'] ? $partida['nome_equipe_b'] : '');
                            $str = date('H:i:s', $start_time);
                            $str .= $t['hora_fim'] ? ' - ' . date('H:i:s', $end_time) : ' - Em andamento';
                            $str .= " ($duration min, $equipe)";
                            return htmlspecialchars($str);
                        }, $pausas_extra)) ?: 'Nenhuma pausa';
                        ?>
                    </td>
                </tr>
                <tr>
                    <td>Penalti - <?= htmlspecialchars($partida['nome_equipe_a']) ?></td>
                    <td><span id="chrono_penalti_equipe_a">00:00:00</span></td>
                    <td id="pausas_penalti_equipe_a">
                        <?php
                        $pausas_penalti_a = array_filter($timeouts, function($t) use ($partida) { return $t['periodo'] === 'Pausa Penalti' && $t['id_equipe_a'] == $partida['id_equipe_a']; });
                        echo implode(', ', array_map(function($t) use ($partida) {
                            $start_time = strtotime($t['hora_inicio']);
                            $end_time = $t['hora_fim'] ? strtotime($t['hora_fim']) : time();
                            $duration = floor(($end_time - $start_time) / 60);
                            $str = date('H:i:s', $start_time);
                            $str .= $t['hora_fim'] ? ' - ' . date('H:i:s', $end_time) : ' - Em andamento';
                            $str .= " ($duration min, " . htmlspecialchars($partida['nome_equipe_a']) . ")";
                            return htmlspecialchars($str);
                        }, $pausas_penalti_a)) ?: 'Nenhuma pausa';
                        ?>
                    </td>
                </tr>
                <tr>
                    <td>Penalti - <?= htmlspecialchars($partida['nome_equipe_b']) ?></td>
                    <td><span id="chrono_penalti_equipe_b">00:00:00</span></td>
                    <td id="pausas_penalti_equipe_b">
                        <?php
                        $pausas_penalti_b = array_filter($timeouts, function($t) use ($partida) { return $t['periodo'] === 'Pausa Penalti' && $t['id_equipe_b'] == $partida['id_equipe_b']; });
                        echo implode(', ', array_map(function($t) use ($partida) {
                            $start_time = strtotime($t['hora_inicio']);
                            $end_time = $t['hora_fim'] ? strtotime($t['hora_fim']) : time();
                            $duration = floor(($end_time - $start_time) / 60);
                            $str = date('H:i:s', $start_time);
                            $str .= $t['hora_fim'] ? ' - ' . date('H:i:s', $end_time) : ' - Em andamento';
                            $str .= " ($duration min, " . htmlspecialchars($partida['nome_equipe_b']) . ")";
                            return htmlspecialchars($str);
                        }, $pausas_penalti_b)) ?: 'Nenhuma pausa';
                        ?>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>


<div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span><i class="fas fa-list me-1"></i> Eventos Registrados</span>
        <span class="fw-bold fs-5">Placar Atual: <?= htmlspecialchars($partida['placar_equipe_a']) ?> x <?= htmlspecialchars($partida['placar_equipe_b']) ?></span>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-light">
                    <tr>
                        <th>Período</th>
                        <th>Minuto</th>
                        <th>Número</th>
                        <th>Jogador</th>
                        <th>Equipe</th>
                        <th>Evento</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($eventos)): ?>
                        <tr><td colspan="7" class="text-center text-muted">Nenhum evento registrado.</td></tr>
                    <?php else: ?>
                        <?php foreach ($eventos as $evento): ?>
                            <tr>
                                <td><?= htmlspecialchars($evento['periodo']) ?></td>
                                <td><?= htmlspecialchars($evento['minuto_evento']) ?></td>
                                <td><?= htmlspecialchars($evento['numero_camisa'] ?? '') ?></td>
                                <td><?= htmlspecialchars($evento['nome_completo']) ?></td>
                                <td><?= htmlspecialchars($evento['nome_equipe']) ?></td>
                                <td>
                                    <?php
                                    switch ($evento['tipo_evento']) {
                                        case 'Gol':
                                            echo '<span class="badge bg-success"><i class="fas fa-futbol me-1"></i> Gol</span>';
                                            break;
                                        case 'Cartão Amarelo':
                                            echo '<span class="badge bg-warning text-dark"><i class="fas fa-square me-1"></i> Amarelo</span>';
                                            break;
                                        case 'Cartão Vermelho':
                                            echo '<span class="badge bg-danger"><i class="fas fa-square me-1"></i> Vermelho</span>';
                                            break;
                                        case 'Cartão Azul':
                                            echo '<span class="badge bg-info"><i class="fas fa-square me-1"></i> Azul</span>';
                                            break;
                                        case 'Assistência':
                                            echo '<span class="badge bg-primary"><i class="fas fa-running me-1"></i> Assistência</span>';
                                            break;
                                        case 'Ponto':
                                            echo '<span class="badge bg-primary"><i class="fas fa-plus me-1"></i> Ponto</span>';
                                            break;
                                        case 'Falta':
                                            echo '<span class="badge bg-danger text-dark"><i class="fas fa-exclamation-triangle me-1"></i> Falta</span>';
                                            break;
                                        default:
                                            echo '<span class="badge bg-secondary"><i class="fas fa-question me-1"></i> Desconhecido</span>';
                                            break;
                                    }
                                    ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal fade" id="modalAnularEvento" tabindex="-1" aria-labelledby="modalAnularEventoLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalAnularEventoLabel"><i class="fas fa-exclamation-triangle text-danger me-2"></i>Confirmar Anulação</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                Tem certeza que deseja anular o evento <strong id="tipoEventoAnular"></strong> do participante <strong id="nomeJogadorAnular"></strong>?
                <p class="text-muted mt-2" id="avisoPlacar" style="display: none;">O placar da partida será ajustado automaticamente se for um gol.</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <a href="#" id="btnConfirmarAnulacao" class="btn btn-danger">Sim, anular evento</a>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    

    const periodsOrder = ['Primeiro Tempo', 'Segundo Tempo', 'Tempo Extra', 'Penalti'];
    let periodsData = [
        <?php foreach ($periodos as $p): ?>
        <?php if (strpos($p['periodo'], 'Pausa ') !== 0): ?>
        {
            periodo: '<?= addslashes($p['periodo']) ?>',
            start: <?= $p['hora_inicio'] ? 'new Date("' . $p['hora_inicio'] . '").getTime()' : 'null' ?>,
            end: <?= $p['hora_fim'] ? 'new Date("' . $p['hora_fim'] . '").getTime()' : 'new Date("' . date('Y-m-d H:i:s') . '").getTime()' ?>,
            id_equipe_a: <?= $p['id_equipe_a'] ? "'{$p['id_equipe_a']}'" : 'null' ?>,
            id_equipe_b: <?= $p['id_equipe_b'] ? "'{$p['id_equipe_b']}'" : 'null' ?>
        },
        <?php endif; ?>
        <?php endforeach; ?>
    ];
    let pauses = [
        <?php foreach ($timeouts as $t): ?>
        {
            id: <?= $t['id'] ?>,
            periodo: '<?= addslashes($t['periodo']) ?>',
            start: new Date('<?= $t['hora_inicio'] ?>').getTime(),
            end: <?= $t['hora_fim'] ? 'new Date("' . $t['hora_fim'] . '").getTime()' : 'new Date("' . date('Y-m-d H:i:s') . '").getTime()'?>,
            id_equipe_a: <?= $t['id_equipe_a'] ? "'{$t['id_equipe_a']}'" : 'null' ?>,
            id_equipe_b: <?= $t['id_equipe_b'] ? "'{$t['id_equipe_b']}'" : 'null' ?>,
            nome_equipe: '<?= addslashes($t['nome_equipe'] ?: '') ?>'
        },
        <?php endforeach; ?>
    ];
    let horaFimMatch = <?= $partida['hora_fim'] ? 'new Date("' . $partida['hora_fim'] . '").getTime()' : 'new Date("' . date('Y-m-d H:i:s') . '").getTime()' ?>;

    function formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${hrs}:${mins}:${secs}`;
    }

    function updatePauseDisplay() {
        const periodMap = {
            'Primeiro Tempo': 'primeiro_tempo',
            'Segundo Tempo': 'segundo_tempo',
            'Tempo Extra': 'tempo_extra',
            'Penalti - <?= addslashes($partida['nome_equipe_a']) ?>': 'penalti_equipe_a',
            'Penalti - <?= addslashes($partida['nome_equipe_b']) ?>': 'penalti_equipe_b'
        };
        for (const [period, suffix] of Object.entries(periodMap)) {
            const pauseElement = document.getElementById(`pausas_${suffix}`);
            let periodPauses;
            if (suffix === 'penalti_equipe_a') {
                periodPauses = pauses.filter(p => p.periodo === 'Pausa Penalti' && p.id_equipe_a === '<?= $partida['id_equipe_a'] ?>');
            } else if (suffix === 'penalti_equipe_b') {
                periodPauses = pauses.filter(p => p.periodo === 'Pausa Penalti' && p.id_equipe_b === '<?= $partida['id_equipe_b'] ?>');
            } else {
                periodPauses = pauses.filter(p => p.periodo === `Pausa ${period}`);
            }
            const pauseStr = periodPauses.map(p => {
                const startTime = new Date(p.start).toLocaleTimeString();
                const endTime = p.end ? new Date(p.end).toLocaleTimeString() : 'Em andamento';
                const duration = p.end ? Math.floor((p.end - p.start) / 60000) : Math.floor((Date.now() - p.start) / 60000);
                const equipe = p.nome_equipe || (p.id_equipe_a === '<?= $partida['id_equipe_a'] ?>' ? '<?= addslashes($partida['nome_equipe_a']) ?>' : (p.id_equipe_b === '<?= $partida['id_equipe_b'] ?>' ? '<?= addslashes($partida['nome_equipe_b']) ?>' : ''));
                return `${startTime} - ${endTime} (${duration} min, ${equipe})`;
            }).join(', ');
            pauseElement.innerHTML = pauseStr || 'Nenhuma pausa';
        }
    }

    async function updateTimingData() {
        try {
            const formData = new FormData();
            formData.append('registrar_tempo', '1');
            formData.append('acao', 'atualizar_tempos');
            const response = await fetch(window.location.href, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const json = await response.json();
            if (json.success) {
                periodsData = json.periodsData;
                pauses = json.pauses;
                horaFimMatch = json.horaFimMatch;
                updatePauseDisplay();
            } else {
                console.error('Erro ao atualizar dados de tempo:', json.message);
            }
        } catch (error) {
            console.error('Erro na chamada AJAX:', error);
        }
    }
    function updateChronometers() {


        updateTimingData();
 
        const nowMatch = horaFimMatch ? horaFimMatch : Date.now();
        const periodMap = {
            'Primeiro Tempo': 'primeiro_tempo',
            'Segundo Tempo': 'segundo_tempo',
            'Tempo Extra': 'tempo_extra',
            'Penalti - <?= addslashes($partida['nome_equipe_a']) ?>': 'penalti_equipe_a',
            'Penalti - <?= addslashes($partida['nome_equipe_b']) ?>': 'penalti_equipe_b'
        };
        for (const [period, suffix] of Object.entries(periodMap)) {
            const chronoElement = document.getElementById(`chrono_${suffix}`);
            let periodData;
            if (suffix === 'penalti_equipe_a') {
                periodData = periodsData.filter(p => p.periodo === 'Penalti' && p.id_equipe_a === '<?= $partida['id_equipe_a'] ?>');
            } else if (suffix === 'penalti_equipe_b') {
                periodData = periodsData.filter(p => p.periodo === 'Penalti' && p.id_equipe_b === '<?= $partida['id_equipe_b'] ?>');
            } else {
                periodData = periodsData.filter(p => p.periodo === period);
            }
            if (!periodData.length || !periodData[0].start) {
                chronoElement.textContent = '00:00:00';
                continue;
            }
            const latestPeriod = periodData[periodData.length - 1];
            const start = latestPeriod.start;
            const end = latestPeriod.end ? latestPeriod.end : nowMatch;
            let totalElapsedMs = end - start;
            let totalPausedMs = 0;
            let periodPauses;
            if (suffix === 'penalti_equipe_a') {
                periodPauses = pauses.filter(p => p.periodo === 'Pausa Penalti' && p.id_equipe_a === '<?= $partida['id_equipe_a'] ?>');
            } else if (suffix === 'penalti_equipe_b') {
                periodPauses = pauses.filter(p => p.periodo === 'Pausa Penalti' && p.id_equipe_b === '<?= $partida['id_equipe_b'] ?>');
            } else {
                periodPauses = pauses.filter(p => p.periodo === `Pausa ${period}`);
            }
            periodPauses.forEach(p => {
                const pStart = Math.max(p.start, start);
                const pEnd = p.end ? Math.min(p.end, end) : end;
                if (pStart < pEnd) {
                    totalPausedMs += pEnd - pStart;
                }
            });
            const effectiveElapsedMs = Math.max(0, totalElapsedMs - totalPausedMs);
            const effectiveElapsed = Math.floor(effectiveElapsedMs / 1000);
            chronoElement.textContent = formatTime(effectiveElapsed);
        }
    }

    // Inicializar exibição de pausas
    updatePauseDisplay();

    // Inicializar cronômetros e atualizar a cada segundo se houver períodos ativos
    if (periodsData.length > 0 && periodsData[0].start) {
        updateChronometers();
        setInterval(updateChronometers, 1000);
    }
});
</script>

<?php 
if (isset($_SESSION['notificacao'])):
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
?>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3500,
            timerProgressBar: true,
            icon: '<?= htmlspecialchars($notificacao['tipo']) ?>',
            title: '<?= addslashes($notificacao['mensagem']) ?>'
        });
    });
</script>
<?php endif; ?>


<?php require_once 'includes/footer.php'; // Footer público ?>