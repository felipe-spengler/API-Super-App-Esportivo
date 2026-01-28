<?php
// Habilitar exibição de erros para depuração (remova em produção)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

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
        
        if ($acao === 'iniciar') {
            $periodo = $_POST['periodo_timeout'] ?? '';
            $id_equipe_timeout = $_POST['id_equipe_timeout'] ?? null;
            if (!$periodo) {
                throw new Exception('Período não especificado.');
            }
            if ($periodo === 'Penalti' && !$id_equipe_timeout) {
                throw new Exception('Equipe não especificada para Penalti.');
            }
            // Verificar se Primeiro Tempo ou Segundo Tempo já foi iniciado
            if (in_array($periodo, ['Primeiro Tempo', 'Segundo Tempo'])) {
                $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM sumulas_periodos WHERE id_partida = ? AND periodo = ?");
                $stmt_check->execute([$id_partida, $periodo]);
                if ($stmt_check->fetchColumn() > 0) {
                    throw new Exception("O período $periodo já foi iniciado anteriormente.");
                }
            }
            $id_equipe_a = ($id_equipe_timeout == $partida['id_equipe_a']) ? $id_equipe_timeout : null;
            $id_equipe_b = ($id_equipe_timeout == $partida['id_equipe_b']) ? $id_equipe_timeout : null;
            $hora_inicio = (new DateTime())->format('Y-m-d H:i:s');

            if ($periodo === 'Penalti') {
                // Check for an existing open penalty period for the selected team
                $stmt_check_penalty = $pdo->prepare("
                    SELECT id 
                    FROM sumulas_periodos 
                    WHERE id_partida = ? 
                    AND periodo = 'Penalti' 
                    AND hora_fim IS NULL 
                    AND (id_equipe_a = ? OR id_equipe_b = ?)
                ");
                $stmt_check_penalty->execute([$id_partida, $id_equipe_timeout, $id_equipe_timeout]);
                $existing_penalty = $stmt_check_penalty->fetch(PDO::FETCH_ASSOC);

                if ($existing_penalty) {
                    // Update existing penalty record to set hora_fim = NULL
                    $stmt_update_penalty = $pdo->prepare("
                        UPDATE sumulas_periodos 
                        SET hora_fim = NULL, hora_inicio = ? 
                        WHERE id = ?
                    ");
                    $stmt_update_penalty->execute([$hora_inicio, $existing_penalty['id']]);
                    $response = [
                        'success' => true,
                        'type' => 'success',
                        'message' => "Pênalti para a equipe reaberto com sucesso!"
                    ];
                } else {
                    // Insert new penalty record
                    $stmt_period = $pdo->prepare("
                        INSERT INTO sumulas_periodos (id_partida, periodo, hora_inicio, id_equipe_a, id_equipe_b) 
                        VALUES (?, ?, ?, ?, ?)
                    ");
                    $stmt_period->execute([$id_partida, $periodo, $hora_inicio, $id_equipe_a, $id_equipe_b]);
                    $response = [
                        'success' => true,
                        'type' => 'success',
                        'message' => "Pênalti para a equipe iniciado com sucesso!"
                    ];
                }
            } else {
                // Handle non-penalty periods
                if ($periodo == 'Primeiro Tempo') {
                    $stmt = $pdo->prepare("UPDATE partidas SET hora_inicio = ?, status = 'Em Andamento' WHERE id = ? AND hora_inicio IS NULL");
                    $stmt->execute([$hora_inicio, $id_partida]);
                }
                $stmt_period = $pdo->prepare("
                    INSERT INTO sumulas_periodos (id_partida, periodo, hora_inicio, id_equipe_a, id_equipe_b) 
                    VALUES (?, ?, ?, ?, ?)
                ");
                $stmt_period->execute([$id_partida, $periodo, $hora_inicio, $id_equipe_a, $id_equipe_b]);
                $response = [
                    'success' => true,
                    'type' => 'success',
                    'message' => "Partida e $periodo iniciados com sucesso!"
                ];
            }
            $stmt = $pdo->prepare("SELECT hora_inicio FROM partidas WHERE id = ?");
            $stmt->execute([$id_partida]);
            $response['hora_inicio'] = $stmt->fetchColumn();
        }elseif ($acao === 'finalizar') {
                $stmt_period = $pdo->prepare("UPDATE sumulas_periodos SET hora_fim = NOW() WHERE id_partida = ? and hora_fim is null");
                $stmt_period->execute([$id_partida]);
                $stmt = $pdo->prepare("UPDATE partidas SET hora_fim = NOW(), status = 'Finalizada' WHERE id = ? AND hora_fim IS NULL");
                $stmt->execute([$id_partida]);
                $response = ['success' => true, 'type' => 'success', 'message' => 'Partida finalizada com sucesso!'];
        }elseif ($acao === 'timeout') {
            $periodo = $_POST['periodo_timeout'] ?? '';
            if (!$periodo) {
                throw new Exception('Período não especificado.');
            }
            if (strpos($periodo, 'Pausa ') !== 0) {
                throw new Exception('Período inválido para pausa.');
            }
            $id_equipe_timeout = $_POST['id_equipe_timeout'] ?? null;
            if (!$id_equipe_timeout) {
                throw new Exception('Equipe não especificada para a pausa.');
            }
            $id_equipe_a = ($id_equipe_timeout == $partida['id_equipe_a']) ? $id_equipe_timeout : null;
            $id_equipe_b = ($id_equipe_timeout == $partida['id_equipe_b']) ? $id_equipe_timeout : null;
            $stmt = $pdo->prepare("INSERT INTO sumulas_periodos (id_partida, periodo, hora_inicio, id_equipe_a, id_equipe_b) VALUES (?, ?, NOW(), ?, ?)");
            $stmt->execute([$id_partida, $periodo, $id_equipe_a, $id_equipe_b]);
            $new_id = $pdo->lastInsertId();
            $stmt = $pdo->prepare("
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
                WHERE t.id = ?
            ");
            $stmt->execute([$new_id]);
            $new_to = $stmt->fetch(PDO::FETCH_ASSOC);
            $response = [
                'success' => true,
                'type' => 'success',
                'message' => 'Pausa iniciada com sucesso!',
                'new_timeout' => [
                    'id' => $new_to['id'],
                    'periodo' => $new_to['periodo'],
                    'start' => $new_to['hora_inicio'],
                    'end' => $new_to['hora_fim'],
                    'id_equipe_a' => $new_to['id_equipe_a'],
                    'id_equipe_b' => $new_to['id_equipe_b']
                ]
            ];
        } elseif ($acao === 'finalizar_pausa') {
            $stmt = $pdo->prepare("UPDATE sumulas_periodos SET hora_fim = NOW() WHERE id_partida = ? AND periodo LIKE 'Pausa %' AND hora_fim IS NULL ORDER BY hora_inicio DESC LIMIT 1");
            $stmt->execute([$id_partida]);
            if ($stmt->rowCount() > 0) {
                $stmt = $pdo->prepare("SELECT id, hora_fim, id_equipe_a, id_equipe_b FROM sumulas_periodos WHERE id_partida = ? AND hora_fim IS NOT NULL ORDER BY hora_fim DESC LIMIT 1");
                $stmt->execute([$id_partida]);
                $updated_to = $stmt->fetch(PDO::FETCH_ASSOC);
                $response = [
                    'success' => true,
                    'type' => 'success',
                    'message' => 'Pausa encerrada com sucesso!',
                    'updated_timeout' => [
                        'id' => $updated_to['id'],
                        'end' => $updated_to['hora_fim'],
                        'id_equipe_a' => $updated_to['id_equipe_a'],
                        'id_equipe_b' => $updated_to['id_equipe_b']
                    ]
                ];
            } else {
                $response['message'] = 'Nenhuma pausa aberta encontrada.';
            }
        } elseif ($acao === 'finalizar_periodo') {
            $stmt_current = $pdo->prepare("SELECT id, periodo FROM sumulas_periodos WHERE id_partida = ? AND hora_fim IS NULL AND periodo NOT LIKE 'Pausa %' LIMIT 1");
            $stmt_current->execute([$id_partida]);
            $open_period = $stmt_current->fetch(PDO::FETCH_ASSOC);
            if ($open_period) {
                // Verificar se o período já foi finalizado anteriormente (para Primeiro e Segundo Tempo)
                if (in_array($open_period['periodo'], ['Primeiro Tempo', 'Segundo Tempo'])) {
                    $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM sumulas_periodos WHERE id_partida = ? AND periodo = ? AND hora_fim IS NOT NULL");
                    $stmt_check->execute([$id_partida, $open_period['periodo']]);
                    if ($stmt_check->fetchColumn() > 0) {
                        throw new Exception("O período {$open_period['periodo']} já foi finalizado anteriormente.");
                    }
                }
                $stmt_period = $pdo->prepare("UPDATE sumulas_periodos SET hora_fim = NOW() WHERE id = ?");
                $stmt_period->execute([$open_period['id']]);
                $response = ['success' => true, 'type' => 'success', 'message' => 'Período finalizado com sucesso!'];
            } else {
                $response['message'] = 'Nenhum período aberto.';
            }
        } elseif ($acao === 'iniciar_proximo_periodo') {
            $stmt_last = $pdo->prepare("SELECT periodo FROM sumulas_periodos WHERE id_partida = ? AND periodo NOT LIKE 'Pausa %' ORDER BY id DESC LIMIT 1");
            $stmt_last->execute([$id_partida]);
            $last_period = $stmt_last->fetchColumn();
            $last_index = array_search($last_period, $periodsOrder);
            $next_index = $last_index !== false ? $last_index + 1 : 0;
            if ($next_index < count($periodsOrder)) {
                $next_period = $periodsOrder[$next_index];
                // Verificar se Primeiro Tempo ou Segundo Tempo já foi iniciado
                if (in_array($next_period, ['Primeiro Tempo', 'Segundo Tempo'])) {
                    $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM sumulas_periodos WHERE id_partida = ? AND periodo = ?");
                    $stmt_check->execute([$id_partida, $next_period]);
                    if ($stmt_check->fetchColumn() > 0) {
                        throw new Exception("O período $next_period já foi iniciado anteriormente.");
                    }
                }
                $id_equipe_timeout = $_POST['id_equipe_timeout'] ?? null;
                if ($next_period === 'Penalti' && !$id_equipe_timeout) {
                    throw new Exception('Equipe não especificada para Penalti.');
                }
                $id_equipe_a = ($id_equipe_timeout == $partida['id_equipe_a']) ? $id_equipe_timeout : null;
                $id_equipe_b = ($id_equipe_timeout == $partida['id_equipe_b']) ? $id_equipe_timeout : null;
                $stmt = $pdo->prepare("INSERT INTO sumulas_periodos (id_partida, periodo, hora_inicio, id_equipe_a, id_equipe_b) VALUES (?, ?, NOW(), ?, ?)");
                $stmt->execute([$id_partida, $next_period, $id_equipe_a, $id_equipe_b]);
                $response = ['success' => true, 'type' => 'success', 'message' => "$next_period iniciado com sucesso!"];
            } else {
                $response = ['message' => 'Não há próximo período.'];
            }
        }
        else if($acao === 'atualizar_tempos'){
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

        $stmt_insert = $pdo->prepare("INSERT INTO sumulas_eventos (id_partida, id_participante, id_equipe, tipo_evento, periodo, minuto_evento) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt_insert->execute([$id_partida, $id_participante, $id_equipe, $tipo_evento, $periodo, $minuto]);

        if ($tipo_evento === 'Gol') {
            $stmt_partida = $pdo->prepare("SELECT id_equipe_a FROM partidas WHERE id = ?");
            $stmt_partida->execute([$id_partida]);
            $partida_info = $stmt_partida->fetch(PDO::FETCH_ASSOC);
            $coluna_placar = ($id_equipe == $partida_info['id_equipe_a']) ? 'placar_equipe_a' : 'placar_equipe_b';
            
            $stmt_update_placar = $pdo->prepare("UPDATE partidas SET $coluna_placar = $coluna_placar + 1 WHERE id = ?");
            $stmt_update_placar->execute([$id_partida]);
        }
        
        $count_eventos = $pdo->query("SELECT COUNT(*) FROM sumulas_eventos WHERE id_partida = $id_partida")->fetchColumn();
        if ($count_eventos > 0) {
            $pdo->prepare("UPDATE partidas SET status = 'Em Andamento' WHERE id = ? AND status = 'Agendada'")->execute([$id_partida]);
            $id_campeonato = $pdo->query("SELECT id_campeonato FROM partidas WHERE id = $id_partida")->fetchColumn();
            $pdo->prepare("UPDATE campeonatos SET status = 'Em Andamento' WHERE id = ? AND status = 'Inscrições Abertas'")->execute([$id_campeonato]);
        }

        $pdo->commit();
        $_SESSION['notificacao'] = ['tipo' => 'success', 'mensagem' => 'Evento adicionado com sucesso!'];
    } catch (Exception $e) {
        $pdo->rollBack();
        $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro ao adicionar evento: ' . $e->getMessage()];
        error_log("Erro ao adicionar evento: " . $e->getMessage());
    }
    
    header("Location: registrar_sumula.php?id_partida=$id_partida");
    exit();
}

// --- LÓGICA PARA ANULAR EVENTO ---
if (isset($_GET['action']) && $_GET['action'] == 'anular_evento' && isset($_GET['id_evento'])) {
    $id_evento = (int)$_GET['id_evento'];

    try {
        $pdo->beginTransaction();

        $stmt_evento = $pdo->prepare("SELECT id_equipe, tipo_evento FROM sumulas_eventos WHERE id = ? AND id_partida = ?");
        $stmt_evento->execute([$id_evento, $id_partida]);
        $evento_info = $stmt_evento->fetch(PDO::FETCH_ASSOC);

        if ($evento_info) {
            $stmt_delete = $pdo->prepare("DELETE FROM sumulas_eventos WHERE id = ?");
            $stmt_delete->execute([$id_evento]);

            if ($evento_info['tipo_evento'] === 'Gol') {
                $stmt_partida = $pdo->prepare("SELECT id_equipe_a FROM partidas WHERE id = ?");
                $stmt_partida->execute([$id_partida]);
                $partida_info = $stmt_partida->fetch(PDO::FETCH_ASSOC);
                $coluna_placar = ($evento_info['id_equipe'] == $partida_info['id_equipe_a']) ? 'placar_equipe_a' : 'placar_equipe_b';
                
                $stmt_update_placar = $pdo->prepare("UPDATE partidas SET $coluna_placar = GREATEST(0, $coluna_placar - 1) WHERE id = ?");
                $stmt_update_placar->execute([$id_partida]);
            }

            $pdo->commit();
            $_SESSION['notificacao'] = ['tipo' => 'success', 'mensagem' => "Evento '{$evento_info['tipo_evento']}' anulado com sucesso!"];
        } else {
            throw new Exception('Evento não encontrado.');
        }
    } catch (Exception $e) {
        $pdo->rollBack();
        $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro ao anular evento: ' . $e->getMessage()];
        error_log("Erro ao anular evento: " . $e->getMessage());
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
    $eventos_raw = $stmt_eventos->fetchAll(PDO::FETCH_ASSOC);

// --- ORDENAÇÃO FORÇADA NO PHP ---
usort($eventos_raw, function($a, $b) {
    $periodOrder = [
        'Primeiro Tempo' => 1,
        'Segundo Tempo' => 2,
        'Tempo Extra' => 3,
        'Penalti' => 4
    ];

    $periodA = $periodOrder[$a['periodo']] ?? 999;
    $periodB = $periodOrder[$b['periodo']] ?? 999;

    if ($periodA != $periodB) {
        return $periodA - $periodB;
    }

    return $a['minuto_evento'] - $b['minuto_evento'];
});

$eventos = $eventos_raw;

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

require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonatos</a></li>
        <li class="breadcrumb-item"><a href="confronto.php?id_categoria=<?= htmlspecialchars($partida['id_campeonato']) ?>">Partidas</a></li>
        <li class="breadcrumb-item active" aria-current="page">Registrar Súmula</li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-file-signature fa-fw me-2"></i>Súmula: <?= htmlspecialchars($partida['nome_equipe_a']) ?> vs <?= htmlspecialchars($partida['nome_equipe_b']) ?></h1>
</div>

<!-- Controles de Tempo -->
<div class="card mb-4">
    <div class="card-header"><i class="fas fa-clock me-1"></i> Controle de Tempo</div>
    <div class="card-body">
        <form id="time-control-form" method="POST">
            <input type="hidden" name="registrar_tempo" value="1">
            <div class="row g-3 align-items-end">
                <div class="col-md-3">
                    
                    <button name="acao" type="submit" value="iniciar" class="btn btn-success w-100" id="start-btn" ><i class="fas fa-play me-1"></i> Iniciar</button>
                </div>
                <?php if ($current_period): ?>
                <div class="col-md-3">
                    <button name="acao" type="submit" value="finalizar_periodo" id="finalizar-periodo-btn" class="btn btn-secondary w-100"><i class="fas fa-stop me-1"></i> Finalizar Período Atual (<?= htmlspecialchars($current_period) ?>)</button>
                </div>
                <?php endif; ?>
                <div class="col-md-3">
                    <label for="periodo_timeout" class="form-label">Período</label>
                    <select name="periodo_timeout" id="periodo_timeout" class="form-select" required>
                        <option value="Primeiro Tempo">Primeiro Tempo</option>
                        <option value="Segundo Tempo">Segundo Tempo</option>
                        <option value="Tempo Extra">Tempo Extra</option>
                        <option value="Penalti">Penalti</option>
                    </select>
                </div>
                <div class="col-md-3" id="equipe-timeout-container" style="display: none;">
                    <label for="id_equipe_timeout" class="form-label">Equipe</label>
                    <select name="id_equipe_timeout" id="id_equipe_timeout" class="form-select">
                        <option value="" disabled selected>Selecione...</option>
                        <option value="<?= htmlspecialchars($partida['id_equipe_a']) ?>"><?= htmlspecialchars($partida['nome_equipe_a']) ?></option>
                        <option value="<?= htmlspecialchars($partida['id_equipe_b']) ?>"><?= htmlspecialchars($partida['nome_equipe_b']) ?></option>
                    </select>
                </div>
            </div>
            <div class="row g-3 align-items-end">
                <div class="col-md-3">
                    <button type="submit" name="acao" value="finalizar" class="btn btn-danger w-100" <?= !$partida['hora_inicio'] || $partida['hora_fim'] ? 'disabled' : '' ?> id="end-btn"><i class="fas fa-stop me-1"></i> Finalizar Partida</button>
                </div>
            </div>
        </form>
    </div>
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

<div class="card mb-4">
    <div class="card-header"><i class="fas fa-pause-circle me-1"></i> Controle de Pausas</div>
    <div class="card-body">
        <form id="pause-control-form" method="POST">
            <input type="hidden" name="registrar_tempo" value="1">
            <div class="row g-3 align-items-end">
                <input type="hidden" id="periodo_pausa" name="periodo_timeout" class="form-control" value="<?= htmlspecialchars($curent_periodo_pause) ?>" readonly>
                <div class="col-md-3" style="<?= ($current_period === 'Penalti' && $curent_periodo_pause !== 'Pausa Penalti') ? '' : 'display:none' ?>">
                    <label for="id_equipe_pausa" class="form-label">Equipe</label>
                    <select name="id_equipe_timeout" id="id_equipe_pausa" class="form-select" required>
                        <option value="" disabled selected>Selecione...</option>
                        <option value="<?= htmlspecialchars($partida['id_equipe_a']) ?>"><?= htmlspecialchars($partida['nome_equipe_a']) ?></option>
                        <option value="<?= htmlspecialchars($partida['nome_equipe_b']) ?>"><?= htmlspecialchars($partida['nome_equipe_b']) ?></option>
                    </select>
                </div>
                <div class="col-md-3">
                    <button type="submit" name="acao" value="timeout" class="btn btn-warning w-100" id="start-pause-btn" <?= !$current_period || $partida['hora_fim'] || $has_open_pause ? 'disabled' : '' ?>>
                        <i class="fas fa-pause me-1"></i> Iniciar Pausa
                    </button>
                </div>
                <div class="col-md-3">
                    <button type="submit" name="acao" value="finalizar_pausa" class="btn btn-warning w-100" id="end-pause-btn" <?= !$has_open_pause ? 'disabled' : '' ?>>
                        <i class="fas fa-play me-1"></i> Encerrar Pausa
                    </button>
                </div>
            </div>
        </form>
    </div>
</div>

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

<div class="card mb-4">
    <div class="card-header"><i class="fas fa-plus-circle me-1"></i> Adicionar Evento à Súmula</div>
    <div class="card-body">
        <?php if (empty($jogadores_list)): ?>
            <div class="alert alert-warning" role="alert">
                <strong>Atenção:</strong> Não há participantes cadastrados para as equipes desta partida.
            </div>
        <?php else: ?>
            <form method="POST">
                <div class="row g-3 align-items-end">
                    <div class="col-md-4">
                        <label for="id_participante" class="form-label">Participante</label>
                        <select id="id_participante" name="id_participante" class="form-select" required>
                            <option value="" disabled selected>Selecione...</option>
                            <optgroup label="<?= htmlspecialchars($partida['nome_equipe_a']) ?>">
                                <?php if (isset($jogadores_por_equipe[$partida['id_equipe_a']])): ?>
                                    <?php foreach ($jogadores_por_equipe[$partida['id_equipe_a']] as $jogador): ?>
                                        <option value="<?= htmlspecialchars($jogador['id']) ?>"><?= htmlspecialchars($jogador['nome_completo']) ?></option>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </optgroup>
                            <optgroup label="<?= htmlspecialchars($partida['nome_equipe_b']) ?>">
                                <?php if (isset($jogadores_por_equipe[$partida['id_equipe_b']])): ?>
                                    <?php foreach ($jogadores_por_equipe[$partida['id_equipe_b']] as $jogador): ?>
                                        <option value="<?= htmlspecialchars($jogador['id']) ?>"><?= htmlspecialchars($jogador['nome_completo']) ?></option>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </optgroup>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label for="tipo_evento" class="form-label">Tipo de Evento</label>
                        <select id="tipo_evento" name="tipo_evento" class="form-select" required>
                            <option value="Gol">Gol</option>
                            <option value="Cartão Amarelo">Cartão Amarelo</option>
                            <option value="Cartão Azul">Cartão Azul</option>
                            <option value="Cartão Vermelho">Cartão Vermelho</option>
                            <option value="Falta">Falta</option>
                            <option value="Assistência">Assistência</option>
                            <option value="Ponto">Ponto</option>
                            <option value="Melhor em Campo">Melhor em Campo</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <button type="submit" name="add_evento" class="btn btn-primary w-100"><i class="fas fa-plus me-1"></i> Adicionar</button>
                    </div>
                </div>
            </form>
        <?php endif; ?>
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
                        <th class="text-end">Ações</th>
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
                                <td class="text-end">
                                    <button type="button" class="btn btn-outline-danger btn-sm" 
                                            data-bs-toggle="modal" 
                                            data-bs-target="#modalAnularEvento"
                                            data-url-anular="registrar_sumula.php?id_partida=<?= $id_partida ?>&action=anular_evento&id_evento=<?= $evento['id'] ?>"
                                            data-nome-jogador="<?= htmlspecialchars($evento['nome_completo']) ?>"
                                            data-tipo-evento="<?= htmlspecialchars($evento['tipo_evento']) ?>"
                                            title="Anular Evento">
                                        <i class="fas fa-undo"></i> Anular
                                    </button>
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
    const modalAnularEvento = document.getElementById('modalAnularEvento');
    if (modalAnularEvento) {
        modalAnularEvento.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            const urlAnular = button.dataset.urlAnular;
            const nomeJogador = button.dataset.nomeJogador;
            const tipoEvento = button.dataset.tipoEvento;
            const nomeJogadorSpan = modalAnularEvento.querySelector('#nomeJogadorAnular');
            const tipoEventoSpan = modalAnularEvento.querySelector('#tipoEventoAnular');
            const avisoPlacar = modalAnularEvento.querySelector('#avisoPlacar');
            const btnConfirmar = modalAnularEvento.querySelector('#btnConfirmarAnulacao');
            
            nomeJogadorSpan.textContent = nomeJogador;
            tipoEventoSpan.textContent = tipoEvento;
            btnConfirmar.setAttribute('href', urlAnular);
            avisoPlacar.style.display = (tipoEvento === 'Gol') ? 'block' : 'none';
        });
    }

    const timeForm = document.getElementById('time-control-form');
    const pauseForm = document.getElementById('pause-control-form');
    const startBtn = document.getElementById('start-btn');
    const endBtn = document.getElementById('end-btn');
    const startPauseBtn = document.getElementById('start-pause-btn');
    const endPauseBtn = document.getElementById('end-pause-btn');
    const finalizarPeriodoBtn = document.getElementById('finalizar-periodo-btn');
    const periodoTimeout = document.getElementById('periodo_timeout');
    const idEquipeTimeout = document.getElementById('id_equipe_timeout');
    const idEquipePausa = document.getElementById('id_equipe_pausa');
    const equipeTimeoutContainer = document.getElementById('equipe-timeout-container');

    // Função para togglear a visibilidade do select de equipe com base no período
    function toggleEquipeTimeout() {
        if (periodoTimeout.value === 'Penalti') {
            equipeTimeoutContainer.style.display = 'block';
            idEquipeTimeout.setAttribute('required', 'required');
        } else {
            equipeTimeoutContainer.style.display = 'none';
            idEquipeTimeout.removeAttribute('required');
            idEquipeTimeout.value = '';
        }
    }

    // Inicializar visibilidade do select de equipe
    toggleEquipeTimeout();

    // Adicionar listener para mudança no select de período
    periodoTimeout.addEventListener('change', toggleEquipeTimeout);

    async function sendTimeControlRequest(form, acao) {
        const formData = new FormData(form);
        formData.set('acao', acao);
        try {
            const response = await fetch(window.location.href, {
                method: 'POST',
                body: formData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const json = await response.json();
            if (json.success && json.new_timeout) {
                pauses.push({
                    
                    id: json.new_timeout.id,
                    periodo: json.new_timeout.periodo,
                    start: new Date(json.new_timeout.start).getTime(),
                    end: json.new_timeout.end ? new Date(json.new_timeout.end).getTime() : null,
                    id_equipe_a: json.new_timeout.id_equipe_a,
                    id_equipe_b: json.new_timeout.id_equipe_b
                });
                updatePauseDisplay();
            }
            if (json.success && json.updated_timeout) {
                const pause = pauses.find(p => p.id === json.updated_timeout.id);
                if (pause) {
                    pause.end = new Date(json.updated_timeout.end).getTime();
                    pause.id_equipe_a = json.updated_timeout.id_equipe_a;
                    pause.id_equipe_b = json.updated_timeout.id_equipe_b;
                    updatePauseDisplay();
                }
            }
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3500,
                timerProgressBar: true,
                icon: json.type,
                title: json.message
            });
            if (json.success) {
                location.reload();
            }
        } catch (error) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3500,
                timerProgressBar: true,
                icon: 'error',
                title: 'Erro ao processar a solicitação.'
            });
            console.error('Erro no AJAX:', error);
        }
    }

    // Manipular envio do formulário de controle de tempo
    timeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(timeForm);
        const acao = e.submitter.value;
        console.log(e.submitter.value);
        if (acao === 'finalizar' && periodoTimeout.value === 'Penalti') {
            formData.append('id_equipe_timeout', idEquipeTimeout.value);
        }
        await sendTimeControlRequest(timeForm, acao);
    });

    // Manipular envio do formulário de pausas
    pauseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(pauseForm);
        const acao = e.submitter.value;
        await sendTimeControlRequest(pauseForm, acao);
    });

   

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

<?php require_once '../includes/footer_dashboard.php'; ?>