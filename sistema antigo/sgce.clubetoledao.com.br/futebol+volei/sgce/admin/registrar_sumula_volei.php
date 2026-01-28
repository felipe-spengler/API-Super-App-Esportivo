<?php
// Habilitar exibição de erros para depuração (remova em produção)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';
require_once 'rodizio_volei.php';
if (!isset($_GET['id_partida']) || !is_numeric($_GET['id_partida'])) {
    header("Location: gerenciar_campeonatos.php");
    exit();
}
$id_partida = (int) $_GET['id_partida'];

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

// ALTERAÇÃO: Definição dos períodos para Voleibol (Sets)
$periodsOrder = ['1º Set', '2º Set', '3º Set', '4º Set', '5º Set'];

// ====== FUNÇÃO ÚNICA PARA INICIAR QUALQUER SET (1º, 2º, 3º...) ======
function iniciarPeriodoVolei($pdo, $id_partida, $periodo, $id_equipe_sacando, $partida) {
    // Validações básicas
    if (!in_array($periodo, ['1º Set', '2º Set', '3º Set', '4º Set', '5º Set'])) {
        throw new Exception("Período inválido.");
    }

    // Verifica se o set já existe
    $stmt = $pdo->prepare("SELECT 1 FROM sumulas_periodos WHERE id_partida = ? AND periodo = ?");
    $stmt->execute([$id_partida, $periodo]);
    if ($stmt->fetchColumn()) {
        throw new Exception("O $periodo já foi iniciado.");
    }

    // Verifica escalação completa
    foreach ([$partida['id_equipe_a'], $partida['id_equipe_b']] as $id_eq) {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM sumulas_posicoes WHERE id_partida = ? AND periodo = ? AND id_equipe = ?");
        $stmt->execute([$id_partida, $periodo, $id_eq]);
        if ($stmt->fetchColumn() != 6) {
            throw new Exception("Escalação incompleta! Equipe precisa ter 6 jogadores em quadra.");
        }
    }

    $hora_inicio = date('Y-m-d H:i:s');

    if ($periodo === '1º Set') {
        // 1. Primeiro tenta pegar do POST (caso esteja escolhendo agora)
        $lado_esquerda = (int) ($_POST['lado_esquerda'] ?? 0);

        // 2. Se não veio do POST, tenta pegar do banco de dados
        if (!$lado_esquerda || !in_array($lado_esquerda, [$partida['id_equipe_a'], $partida['id_equipe_b']])) {
            $stmt = $pdo->prepare("SELECT equipe_esquerda_primeiro_set FROM sumulas_volei_config WHERE id_partida = ?");
            $stmt->execute([$id_partida]);
            $lado_esquerda = (int) $stmt->fetchColumn();
        }

        // 3. Última tentativa: se ainda não tiver nada, usa o padrão (equipe A)
        if (!$lado_esquerda || !in_array($lado_esquerda, [$partida['id_equipe_a'], $partida['id_equipe_b']])) {
            $lado_esquerda = $partida['id_equipe_a']; // padrão
        }

        // Agora sim, salva/atualiza no banco (só se mudou ou não existia)
        $pdo->prepare("INSERT INTO sumulas_volei_config (id_partida, equipe_esquerda_primeiro_set) 
                   VALUES (?, ?) 
                   ON DUPLICATE KEY UPDATE equipe_esquerda_primeiro_set = ?")
                ->execute([$id_partida, $lado_esquerda, $lado_esquerda]);

        // Opcional: atualiza a variável global para uso posterior
        $equipe_esquerda_primeiro_set = $lado_esquerda;
    }

    // Marca partida como Em Andamento (só na primeira vez)
    $pdo->prepare("UPDATE partidas SET 
        hora_inicio = COALESCE(hora_inicio, ?), 
        status = 'Em Andamento' 
        WHERE id = ?")
            ->execute([$hora_inicio, $id_partida]);

    // Salva quem está sacando
    salvarEquipeSacando($pdo, $id_partida, $id_equipe_sacando);

    // Cria o período
    $pdo->prepare("INSERT INTO sumulas_periodos (id_partida, periodo, hora_inicio) VALUES (?, ?, ?)")
            ->execute([$id_partida, $periodo, $hora_inicio]);
    $pdo->prepare("INSERT INTO sumulas_pontos_sets (id_partida, periodo, pontos_equipe_a, pontos_equipe_b) 
                   VALUES (?, ?, 0, 0)")->execute([$id_partida, $periodo]);
    return "Período iniciado: $periodo";
}

// Função para determinar o período atual e o minuto com base no tempo decorrido efetivo do período atual
function getPeriodoEMinuto($pdo, $id_partida, $periodsOrder) {
    try {
        $periodos_list = implode("','", $periodsOrder);

        $stmt_current = $pdo->prepare("SELECT periodo, hora_inicio FROM sumulas_periodos WHERE id_partida = ? AND hora_fim IS NULL AND periodo IN ('{$periodos_list}') ORDER BY id DESC LIMIT 1");
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
            if ($end_to > $hora_atual)
                $end_to = $hora_atual;
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

$current_data = getPeriodoEMinuto($pdo, $id_partida, $periodsOrder);
$current_period = $current_data['periodo'];
$current_minuto = $current_data['minuto'];

$stmt = $pdo->prepare("
    SELECT periodo 
    FROM sumulas_periodos 
    WHERE id_partida = ? 
      AND periodo NOT LIKE 'Pausa %' 
    ORDER BY id DESC 
    LIMIT 1
");
$stmt->execute([$id_partida]);
$ultimo_periodo = $stmt->fetchColumn();

$pontos_a = 0;
$pontos_b = 0;

if ($current_period) {
    $stmt = $pdo->prepare("SELECT pontos_equipe_a, pontos_equipe_b 
                           FROM sumulas_pontos_sets 
                           WHERE id_partida = ? AND periodo = ?");
    $stmt->execute([$id_partida, $current_period]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $pontos_a = (int) $row['pontos_equipe_a'];
        $pontos_b = (int) $row['pontos_equipe_b'];
    }
}

if ($current_period !== null) {
    $next_period = null; // já está rodando um set
} elseif ($ultimo_periodo === false) {
    $next_period = '1º Set'; // partida totalmente nova
} else {
    $idx = array_search($ultimo_periodo, $periodsOrder);
    $next_period = ($idx !== false && isset($periodsOrder[$idx + 1])) ? $periodsOrder[$idx + 1] : null;
}

// === CONFIG DO LADO DA QUADRA (só vôlei) ===
$stmt_config = $pdo->prepare("SELECT equipe_esquerda_primeiro_set FROM sumulas_volei_config WHERE id_partida = ?");
$stmt_config->execute([$id_partida]);
$config = $stmt_config->fetch(PDO::FETCH_ASSOC);
$equipe_esquerda_primeiro_set = $config['equipe_esquerda_primeiro_set'] ?? null;
/*
  // === DEBUG FORÇADO – REMOVA DEPOIS ===
  echo "<pre style='background:#000;color:#0f0;padding:20px;font-size:18px;position:fixed;top:0;left:0;z-index:99999;'>";
  echo "ID_PARTIDA: $id_partida\n";
  echo "CURRENT_PERIOD: " . var_export($current_period, true) . "\n";
  echo "ULTIMO_PERIODO (do banco): " . var_export($ultimo_periodo, true) . "\n";
  echo "NEXT_PERIOD CALCULADO: " . var_export($next_period, true) . "\n";
  echo "PERIODOS ORDER: " . implode(' | ', $periodsOrder) . "\n";
  echo "</pre>";
  // === FIM DO DEBUG === */
$has_open_pause = false;
// Verificar se há pausa aberta
try {
    $stmt = $pdo->prepare("SELECT 1 FROM sumulas_periodos WHERE id_partida = ? AND periodo LIKE 'Pausa %' AND hora_fim IS NULL LIMIT 1");
    $stmt->execute([$id_partida]);
    $has_open_pause = (bool) $stmt->fetchColumn();
} catch (PDOException $e) {
    error_log("Erro ao verificar pausa aberta: " . $e->getMessage());
    $has_open_pause = false;
}

// --- LÓGICA PARA REGISTRAR TEMPOS VIA AJAX ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['registrar_tempo'])) {
    $acao = $_POST['acao'] ?? '';
    $is_ajax = isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';

    if (empty($acao)) {
        $response = ['success' => false, 'type' => 'error', 'message' => 'Ação não especificada.'];
    } else {
        $response = ['success' => false, 'type' => 'error', 'message' => 'Ação inválida: ' . htmlspecialchars($acao)];
    }

    try {
        $pdo->beginTransaction();

        if (in_array($acao, ['iniciar', 'iniciar_proximo_periodo'])) {
            $periodo = $_POST['periodo_timeout'] ?? null;

            // Se for "iniciar_proximo_periodo", calcula automaticamente
            if ($acao === 'iniciar_proximo_periodo') {
                $stmt = $pdo->prepare("SELECT periodo FROM sumulas_periodos WHERE id_partida = ? AND periodo NOT LIKE 'Pausa %' ORDER BY id DESC LIMIT 1");
                $stmt->execute([$id_partida]);
                $ultimo = $stmt->fetchColumn();

                $index = $ultimo ? array_search($ultimo, $periodsOrder) : -1;
                $proximo_index = $index + 1;
                $periodo = $periodsOrder[$proximo_index] ?? null;

                if (!$periodo) {
                    throw new Exception("Não há mais sets para iniciar.");
                }
            }

            // Se ainda não tiver período definido (primeira vez), força 1º Set
            if (!$periodo) {
                $periodo = '1º Set';
            }

            $id_equipe_sacando = (int) ($_POST['id_equipe_sacando'] ?? 0);
            if (!$id_equipe_sacando) {
                throw new Exception("Selecione quem começa sacando.");
            }

            $mensagem = iniciarPeriodoVolei($pdo, $id_partida, $periodo, $id_equipe_sacando, $partida);

            $response = [
                'success' => true,
                'message' => $mensagem
            ];
        } elseif ($acao === 'finalizar') {
            // Ações de 'finalizar' (partida)
            // 1. BUSCA O PLACAR ATUAL E DADOS DA PARTIDA
            $stmt_placar = $pdo->prepare("SELECT placar_equipe_a, placar_equipe_b, id_equipe_a, id_equipe_b, nome_equipe_a, nome_equipe_b FROM partidas WHERE id = ?");
            $stmt_placar->execute([$id_partida]);
            $partida_finalizar = $stmt_placar->fetch(PDO::FETCH_ASSOC);

            $vitoria_a = (int) $partida_finalizar['placar_equipe_a'];
            $vitoria_b = (int) $partida_finalizar['placar_equipe_b'];
            $sets_vitoria = 3; // Regra: Vence quem fizer 3 sets

            $partida_pode_finalizar = false;
            $vencedor_final = null;
            $nome_vencedor_final = '';

            // 2. VERIFICA A CONDIÇÃO DE VITÓRIA (>= 3 sets)
            if ($vitoria_a >= $sets_vitoria) {
                $partida_pode_finalizar = true;
                $vencedor_final = $partida_finalizar['id_equipe_a'];
                $nome_vencedor_final = $partida_finalizar['nome_equipe_a'];
            } elseif ($vitoria_b >= $sets_vitoria) {
                $partida_pode_finalizar = true;
                $vencedor_final = $partida_finalizar['id_equipe_b'];
                $nome_vencedor_final = $partida_finalizar['nome_equipe_b'];
            }

            // 3. EXECUÇÃO CONDICIONAL
            if (!$partida_pode_finalizar) {
                // Se a condição não foi atingida, lançamos uma exceção para o catch principal.
                throw new Exception("Partida não pode ser finalizada manualmente. Placar de sets não atinge a regra de vitória (Mínimo: {$sets_vitoria} sets). Placar atual: {$vitoria_a}x{$vitoria_b}.");
            }


            $stmt_period = $pdo->prepare("UPDATE sumulas_periodos SET hora_fim = NOW() WHERE id_partida = ? and hora_fim is null");
            $stmt_period->execute([$id_partida]);

            // Finaliza a Partida 
            $stmt = $pdo->prepare("UPDATE partidas SET hora_fim = NOW(), status = 'Finalizada' WHERE id = ? AND hora_fim IS NULL");
            $stmt->execute([$id_partida]);

            $response = [
                'success' => true,
                'type' => 'success',
                'message' => "Partida finalizada! Vencedor: {$nome_vencedor_final}"
            ];
        } elseif ($acao === 'timeout') {
            // Ações de 'timeout' (pausa técnica)
            $stmt_current = $pdo->prepare("SELECT periodo FROM sumulas_periodos WHERE id_partida = ? AND hora_fim IS NULL AND periodo NOT LIKE 'Pausa %' LIMIT 1");
            $stmt_current->execute([$id_partida]);
            $open_period = $stmt_current->fetch(PDO::FETCH_ASSOC);
            if (!$open_period) {
                throw new Exception('Nenhum Set em andamento para solicitar a Pausa Técnica.');
            }
            $current_period_name = $open_period['periodo'];

            $periodo = 'Pausa ' . $current_period_name;
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
            // Ações de 'finalizar_pausa'
            $stmt = $pdo->prepare("UPDATE sumulas_periodos SET hora_fim = NOW() WHERE id_partida = ? AND periodo LIKE 'Pausa %' AND hora_fim IS NULL ORDER BY hora_inicio DESC LIMIT 1");
            $stmt->execute([$id_partida]);
            if ($stmt->rowCount() > 0) {
                $stmt = $pdo->prepare("SELECT id, hora_fim, id_equipe_a, id_equipe_b, periodo FROM sumulas_periodos WHERE id_partida = ? AND hora_fim IS NOT NULL AND periodo LIKE 'Pausa %' ORDER BY hora_fim DESC LIMIT 1");
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
                        'id_equipe_b' => $updated_to['id_equipe_b'],
                        'periodo' => $updated_to['periodo']
                    ]
                ];
            } else {
                $response['message'] = 'Nenhuma pausa aberta encontrada.';
            }
        } elseif ($acao === 'finalizar_periodo') {
            // Validações
            $vencedor_set = $_POST['vencedor_set'] ?? null;
            if (!$vencedor_set || !in_array($vencedor_set, [$partida['id_equipe_a'], $partida['id_equipe_b']])) {
                throw new Exception("Selecione o vencedor do set!");
            }
            $stmt_current = $pdo->prepare("SELECT id, periodo FROM sumulas_periodos WHERE id_partida = ? AND hora_fim IS NULL AND periodo NOT LIKE 'Pausa %' LIMIT 1");
            $stmt_current->execute([$id_partida]);
            $open_period = $stmt_current->fetch(PDO::FETCH_ASSOC);
            if (!$open_period) {
                throw new Exception('Nenhum set em andamento.');
            }

            // 1. Definições de Placar
            $id_a = $partida['id_equipe_a'];
            $id_b = $partida['id_equipe_b'];
            $coluna_a = 'placar_equipe_a';
            $coluna_b = 'placar_equipe_b';

            // Calcula o NOVO placar em memória
            $vitoria_a = (int) $partida[$coluna_a];
            $vitoria_b = (int) $partida[$coluna_b];

            // Determina qual placar será incrementado (e seu novo valor)
            if ($vencedor_set == $id_a) {
                $coluna_incrementar = $coluna_a;
                $vitoria_a++;
            } else {
                $coluna_incrementar = $coluna_b;
                $vitoria_b++;
            }

            // --- EXECUÇÕES NO BANCO DE DADOS ---
            // Fecha pausa e set (operações normais)
            $pdo->prepare("UPDATE sumulas_periodos SET hora_fim = NOW() WHERE id_partida = ? AND periodo LIKE 'Pausa %' AND hora_fim IS NULL")->execute([$id_partida]);
            $pdo->prepare("UPDATE sumulas_periodos SET hora_fim = NOW() WHERE id = ?")->execute([$open_period['id']]);

            // 2. Atualiza placar no DB
            $pdo->prepare("UPDATE partidas SET $coluna_incrementar = $coluna_incrementar + 1 WHERE id = ?")->execute([$id_partida]);

            // --- LÓGICA DE FINALIZAÇÃO AUTOMÁTICA (DIRETA) ---
            $sets_vitoria = 3;
            $vencedor_final_id = null;
            $nome_vencedor_final = '';

            if ($vitoria_a >= $sets_vitoria) {
                $vencedor_final_id = $id_a;
                $nome_vencedor_final = $partida['nome_equipe_a'];
            } elseif ($vitoria_b >= $sets_vitoria) {
                $vencedor_final_id = $id_b;
                $nome_vencedor_final = $partida['nome_equipe_b'];
            }

            if ($vencedor_final_id) {
                $pdo->prepare("UPDATE partidas SET hora_fim = NOW(), status = 'Finalizada' WHERE id = ? AND hora_fim IS NULL")
                        ->execute([$id_partida]);

                $response = [
                    'success' => true,
                    'type' => 'success',
                    'message' => "Partida finalizada automaticamente! Vencedor: 🏆 <strong>{$nome_vencedor_final}</strong>",
                    'placar_a' => $vitoria_a,
                    'placar_b' => $vitoria_b
                ];
            } else {
                // Resposta normal de set finalizado
                $nome_vencedor = ($vencedor_set == $id_a) ? $partida['nome_equipe_a'] : $partida['nome_equipe_b'];
                $response = [
                    'success' => true,
                    'message' => "{$open_period['periodo']} finalizado! Vencedor: <strong>$nome_vencedor</strong>",
                    'placar_a' => $vitoria_a,
                    'placar_b' => $vitoria_b
                ];
            }
        } elseif ($acao === 'atualizar_tempos') {
            // Ação para o JS buscar o tempo atualizado
            $current_data = getPeriodoEMinuto($pdo, $id_partida, $periodsOrder);
            $has_open_pause_check = (bool) $pdo->query("SELECT 1 FROM sumulas_periodos WHERE id_partida = $id_partida AND periodo LIKE 'Pausa %' AND hora_fim IS NULL LIMIT 1")->fetchColumn();

            // <<<<<< NOVO CÓDIGO AQUI >>>>>>
            $stmt_placar = $pdo->prepare("SELECT placar_equipe_a, placar_equipe_b, hora_fim FROM partidas WHERE id = ?");
            $stmt_placar->execute([$id_partida]);
            $placar_atual = $stmt_placar->fetch(PDO::FETCH_ASSOC);
            // <<<<<< FIM DO NOVO CÓDIGO >>>>>>

            $stmt_periods = $pdo->prepare("SELECT id, periodo, hora_inicio, hora_fim, id_equipe_a, id_equipe_b FROM sumulas_periodos WHERE id_partida = ? ORDER BY hora_inicio");
            $stmt_periods->execute([$id_partida]);
            $all_periods = $stmt_periods->fetchAll(PDO::FETCH_ASSOC);

            $periods_for_js = [];
            foreach ($all_periods as $p) {
                // Converte data/hora para timestamp ou mantém null
                $start_ts = $p['hora_inicio'] ? strtotime($p['hora_inicio']) * 1000 : null;
                $end_ts = $p['hora_fim'] ? strtotime($p['hora_fim']) * 1000 : null;

                $periods_for_js[] = [
                    'id' => $p['id'],
                    'periodo' => $p['periodo'],
                    'start' => $start_ts,
                    'end' => $end_ts,
                    'id_equipe_a' => $p['id_equipe_a'],
                    'id_equipe_b' => $p['id_equipe_b'],
                ];
            }

            $response = [
                'success' => true,
                'periodo_atual' => $current_data['periodo'],
                'minuto_atual' => $current_data['minuto'],
                'has_open_pause' => $has_open_pause_check,
                'periods_data' => $periods_for_js,
                'placar_a' => $placar_atual['placar_equipe_a'],
                'placar_b' => $placar_atual['placar_equipe_b'],
                'hora_fim' => $placar_atual['hora_fim'],
                'pontos_set_a' => $pontos_a,
                'pontos_set_b' => $pontos_b
            ];
        }

        $pdo->commit();
        if ($is_ajax) {
            header('Content-Type: application/json');
            echo json_encode($response);
            exit();
        }
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Erro durante a operação AJAX: " . $e->getMessage());
        $response = ['success' => false, 'type' => 'error', 'message' => $e->getMessage()];
        if ($is_ajax) {
            header('Content-Type: application/json');
            echo json_encode($response);
            exit();
        } else {
            $_SESSION['notificacao'] = $response;
        }
    }
}


// --- LÓGICA PARA ADICIONAR EVENTO ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_evento'])) {
    $id_participante = (int) $_POST['id_participante'];
    $tipo_evento = trim($_POST['tipo_evento']);

    try {
        if ($current_period === null) {
            throw new Exception("Não é possível registrar eventos sem um Set em andamento.");
        }

        $pdo->beginTransaction();

        // 1. Encontrar o jogador e a equipe
        $stmt_jogador = $pdo->prepare("SELECT id, nome_completo, id_equipe FROM participantes WHERE id = ?");
        $stmt_jogador->execute([$id_participante]);
        $jogador = $stmt_jogador->fetch(PDO::FETCH_ASSOC);

        if (!$jogador) {
            throw new Exception("Participante não encontrado.");
        }

        // Alteração: Eventos que contam como ponto (Gol no futebol)
        $is_gol = in_array($tipo_evento, ['Ponto de Saque', 'Ponto de Bloqueio', 'Ponto Normal']);

        // 2. Inserir o evento
        $stmt_evento = $pdo->prepare("INSERT INTO sumulas_eventos (id_partida, id_participante, id_equipe, tipo_evento, periodo, minuto_evento) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt_evento->execute([$id_partida, $id_participante, $jogador['id_equipe'], $tipo_evento, $current_period, $current_minuto]);
        // NOVO: LÓGICA DE RODÍZIO AUTOMÁTICO (Side Out) <<< NOVO
        if ($is_gol && $current_period) {


            if ($is_gol && $current_period) {
                $coluna = ($jogador['id_equipe'] == $partida['id_equipe_a']) ? 'pontos_equipe_a' : 'pontos_equipe_b';
                $pdo->prepare("UPDATE sumulas_pontos_sets 
                           SET $coluna = $coluna + 1 
                           WHERE id_partida = ? AND periodo = ?")
                        ->execute([$id_partida, $current_period]);
            }

            $id_equipe_ponto = $jogador['id_equipe'];

            // 1. Obtém dados de saque atuais
            $volei_data = getVoleiData($pdo, $id_partida);
            $equipe_sacando_atual = (int) $volei_data['equipe_sacando_atual'];

            if ((int) $id_equipe_ponto !== $equipe_sacando_atual) {
                // Side out! O ponto foi para a equipe que NÃO estava sacando.
                // 2. Atualiza quem saca (Troca de posse)
                salvarEquipeSacando($pdo, $id_partida, $id_equipe_ponto);

                // 3. Roda a nova equipe sacadora (Rodízio)
                rotacionarPosicoes($pdo, $id_partida, $current_period, $id_equipe_ponto);

                // Mensagem para o usuário saber que houve rodízio
                $_SESSION['notificacao']['message'] = "Ponto e Side Out! Rodízio executado para " . htmlspecialchars($jogador['nome_completo']);
            }
        }
        $pdo->commit();
        $_SESSION['notificacao'] = ['success' => true, 'type' => 'success', 'message' => "Evento: {$tipo_evento} registrado com sucesso para {$jogador['nome_completo']}!"];
    } catch (Exception $e) {
        $pdo->rollBack();

        // =======================

        error_log("Erro ao adicionar evento: " . $e->getMessage());
        $_SESSION['notificacao'] = [
            'success' => false,
            'type' => 'error',
            'message' => $e->getMessage()
        ];
    }
    header("Location: registrar_sumula_volei.php?id_partida={$id_partida}");
    exit();
}

// --- LÓGICA PARA ANULAR EVENTO ---
if (isset($_GET['action']) && $_GET['action'] == 'anular_evento' && isset($_GET['id_evento'])) {
    $id_evento = (int) $_GET['id_evento'];

    try {
        $pdo->beginTransaction();

        $stmt_evento = $pdo->prepare("SELECT id_equipe, tipo_evento FROM sumulas_eventos WHERE id = ? AND id_partida = ?");
        $stmt_evento->execute([$id_evento, $id_partida]);
        $evento_info = $stmt_evento->fetch(PDO::FETCH_ASSOC);

        if ($evento_info) {
            $stmt_delete = $pdo->prepare("DELETE FROM sumulas_eventos WHERE id = ?");
            $stmt_delete->execute([$id_evento]);

            if (in_array($evento_info['tipo_evento'], ['Ponto de Saque', 'Ponto de Bloqueio', 'Ponto Normal'])) {
                $coluna = ($evento_info['id_equipe'] == $partida['id_equipe_a']) ? 'pontos_equipe_a' : 'pontos_equipe_b';
                $pdo->prepare("UPDATE sumulas_pontos_sets 
                               SET $coluna = GREATEST(0, $coluna - 1) 
                               WHERE id_partida = ? AND periodo = (
                                   SELECT periodo FROM sumulas_eventos WHERE id = ? LIMIT 1
                               )")
                        ->execute([$id_partida, $id_evento]);
            }
            if ($evento_info['tipo_evento'] === 'Gol') {
                $stmt_partida = $pdo->prepare("SELECT id_equipe_a FROM partidas WHERE id = ?");
                $stmt_partida->execute([$id_partida]);
                $partida_info = $stmt_partida->fetch(PDO::FETCH_ASSOC);
                $coluna_placar = ($evento_info['id_equipe'] == $partida_info['id_equipe_a']) ? 'placar_equipe_a' : 'placar_equipe_b';
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

    header("Location: registrar_sumula_volei.php?id_partida=$id_partida");
    exit();
}

// --- BUSCA DE DADOS E VARIÁVEIS PARA O HTML ---
// Jogadores
$stmt_jogadores = $pdo->prepare("SELECT id, nome_completo, numero_camisa, id_equipe FROM participantes WHERE id_equipe IN (?, ?) ORDER BY id_equipe, numero_camisa");
$stmt_jogadores->execute([$partida['id_equipe_a'], $partida['id_equipe_b']]);
$jogadores = $stmt_jogadores->fetchAll(PDO::FETCH_ASSOC);

$jogadores_por_equipe = [
    $partida['id_equipe_a'] => [],
    $partida['id_equipe_b'] => []
];
$jogador_map = [];

foreach ($jogadores as $j) {
    $jogadores_por_equipe[$j['id_equipe']][] = $j;
    $jogador_map[$j['id']] = $j;
}

// Eventos
// NOTA: A busca de eventos no arquivo original não usava JOIN para 'numero_camisa', mas assumindo que 'sumulas_eventos' pode ser unido a 'participantes' (p), o código a seguir está mais completo:
$stmt_eventos = $pdo->prepare("SELECT s.*, p.nome_completo, p.numero_camisa, e.nome as nome_equipe FROM sumulas_eventos s JOIN participantes p ON s.id_participante = p.id JOIN equipes e ON s.id_equipe = e.id WHERE s.id_partida = ? ORDER BY s.periodo, s.minuto_evento DESC, s.id DESC"); // Adicionei s.id para ordem mais estável
$stmt_eventos->execute([$id_partida]);
$eventos = $stmt_eventos->fetchAll(PDO::FETCH_ASSOC);

// Periodos e Pausas (para tabela de resumo e JS)
$stmt_periodos = $pdo->prepare("SELECT id, periodo, hora_inicio, hora_fim, id_equipe_a, id_equipe_b FROM sumulas_periodos WHERE id_partida = ? ORDER BY hora_inicio");
$stmt_periodos->execute([$id_partida]);
$all_periods = $stmt_periodos->fetchAll(PDO::FETCH_ASSOC);

$periodos = array_filter($all_periods, function ($p) use ($periodsOrder) {
    return in_array($p['periodo'], $periodsOrder);
});
$timeouts = array_filter($all_periods, function ($p) {
    return strpos($p['periodo'], 'Pausa ') === 0;
});

// Encontrar o próximo período a ser iniciado
$last_period = array_reduce($all_periods, function ($carry, $item) use ($periodsOrder) {
    if (in_array($item['periodo'], $periodsOrder) && $item['hora_fim']) { // Apenas sets finalizados contam para o próximo
        return $item['periodo'];
    }
    return $carry;
}, null);

$next_period = $periodsOrder[0];
if ($last_period) {
    $last_index = array_search($last_period, $periodsOrder);
    if ($last_index !== false && $last_index < count($periodsOrder) - 1) {
        $next_period = $periodsOrder[$last_index + 1];
    } else {
        $next_period = null; // Último período já jogado ou partida finalizada
    }
}
// Verificar se o próximo já está ativo/iniciado
if ($next_period && array_key_exists($next_period, array_column($periodos, 'periodo', 'periodo'))) {
    $next_period = null;
}


// Inclusão de header.php (assumindo que o arquivo existe)
require_once '../includes/header.php';
?>

<nav aria-label="breadcrumb"> 
    <ol class="breadcrumb"> 
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li> 
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonatos</a></li> 
        <li class="breadcrumb-item"><a href="confronto.php?id_categoria=<?= htmlspecialchars($partida['id_campeonato']) ?>">Partidas</a></li> 
        <li class="breadcrumb-item active" aria-current="page">Registrar Súmula - Vôlei</li> 
    </ol> 
</nav> 
<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom"> 
    <h1 class="h2"><i class="fas fa-file-signature fa-fw me-2"></i>Súmula Voleibol: <?= htmlspecialchars($partida['nome_equipe_a']) ?> vs <?= htmlspecialchars($partida['nome_equipe_b']) ?></h1> 
</div> 

<div class="card bg-light mb-4">
    <div class="card-body">
        <div class="row text-center align-items-center">
            <div class="col">
                <h3 class="mb-1 text-primary"><?= htmlspecialchars($partida['nome_equipe_a']) ?></h3>
                <h1 class="display-3 mb-0" id="pontos_set_a"><?= $pontos_a ?></h1>
                <small class="text-muted">Sets: <strong id="sets_a"><?= $partida['placar_equipe_a'] ?? 0 ?></strong></small>
            </div>
            <div class="col-auto">
                <h1 class="display-4 text-secondary">×</h1>
                <?php if ($current_period): ?>
                    <p class="mb-0"><strong><?= htmlspecialchars($current_period) ?></strong></p>
                <?php else: ?>
                    <p class="text-danger mb-0">Partida parada</p>
                <?php endif; ?>
            </div>
            <div class="col">
                <h3 class="mb-1 text-danger"><?= htmlspecialchars($partida['nome_equipe_b']) ?></h3>
                <h1 class="display-3 mb-0" id="pontos_set_b"><?= $pontos_b ?></h1>
                <small class="text-muted">Sets: <strong id="sets_b"><?= $partida['placar_equipe_b'] ?? 0 ?></strong></small>
            </div>
        </div>
    </div>
</div>
<!-- MODAL INICIAR SET - VERSÃO PERFEITA (COMPACTA E BONITA) -->
<div class="modal fade" id="modalIniciarSet" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title">
                    <i class="fas fa-play me-2"></i>Iniciar <?= $next_period ?: '1º Set' ?>
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body text-center py-5">

                <h4 class="mb-4 text-dark">Quem começa sacando?</h4>

                <div class="row g-4">
                    <!-- EQUIPE A -->
                    <div class="col-6">
                        <div class="p-4 rounded-3 border border-3 border-light shadow-sm equipe-opcao" 
                             data-equipe="<?= $partida['id_equipe_a'] ?>" 
                             style="cursor:pointer; transition:all 0.3s;">
                            <div class="fs-1 fw-bold text-primary mb-2">
                                <?= htmlspecialchars($partida['nome_equipe_a']) ?>
                            </div>
                            <div class="fs-3">
                                <i class="fas fa-volleyball-ball text-warning"></i>
                            </div>
                        </div>
                    </div>

                    <!-- EQUIPE B -->
                    <div class="col-6">
                        <div class="p-4 rounded-3 border border-3 border-light shadow-sm equipe-opcao" 
                             data-equipe="<?= $partida['id_equipe_b'] ?>" 
                             style="cursor:pointer; transition:all 0.3s;">
                            <div class="fs-1 fw-bold text-danger mb-2">
                                <?= htmlspecialchars($partida['nome_equipe_b']) ?>
                            </div>
                            <div class="fs-3">
                                <i class="fas fa-volleyball-ball text-warning"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="alert alert-info mt-4 small">
                    <i class="fas fa-info-circle"></i>
                    Certifique-se de ter <strong>6 jogadores em cada quadra</strong> e clicar em <strong>Salvar Posições</strong> antes.
                </div>
            </div>
            <div class="modal-footer justify-content-center">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" id="btn-iniciar-set" class="btn btn-success btn-lg px-5" disabled>
                    <i class="fas fa-play me-2"></i>Iniciar Set
                </button>
            </div>
        </div>
    </div>
</div>
<div class="card mb-4"> 
    <div class="card-header"><i class="fas fa-stopwatch me-1"></i> Controles de Set e Tempo</div> 
    <div class="card-body"> 
        <form id="time-control-form" method="POST"> 
            <input type="hidden" name="id_partida" value="<?= $id_partida ?>">
            <input type="hidden" name="registrar_tempo" value="1">
            <div class="row g-3 mb-3">
                <div class="col-md-3">
                    <label for="periodo_select" class="form-label">Set para Iniciar</label>
                    <select name="periodo_timeout" id="periodo_select" class="form-select" required <?= $current_period ? 'disabled' : '' ?>>
                        <option value="" disabled selected>Selecione o Set...</option>
                        <?php foreach ($periodsOrder as $p): ?>
                            <option value="<?= htmlspecialchars($p) ?>" <?= ($p === $next_period) ? 'selected' : '' ?>><?= htmlspecialchars($p) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label d-block">Novo Set</label>
                    <button type="button" class="btn btn-success w-100" id="start-btn" 
                            data-bs-toggle="modal" data-bs-target="#modalIniciarSet"
                            <?= $current_period || $partida['hora_fim'] ? 'disabled' : '' ?>>
                        <i class="fas fa-play me-1"></i> Iniciar Set
                    </button>
                </div>
                <div class="col-md-3">
                    <label class="form-label d-block">&nbsp;</label>
                    <button type="submit" name="acao" value="finalizar_periodo" class="btn btn-primary w-100" id="finalizar-periodo-btn" <?= !$current_period || $partida['hora_fim'] ? 'disabled' : '' ?>>
                        <i class="fas fa-step-forward me-1"></i> Finalizar Set
                    </button>
                </div>

            </div>
        </form>

        <form id="pause-control-form" method="POST">
            <input type="hidden" name="id_partida" value="<?= $id_partida ?>">
            <input type="hidden" name="registrar_tempo" value="1">
            <div class="row g-3">
                <div class="col-md-3">
                    <label for="id_equipe_pausa" class="form-label">Equipe solicitando Pausa</label>
                    <select name="id_equipe_timeout" id="id_equipe_pausa" class="form-select" required <?= !$current_period || $partida['hora_fim'] || $has_open_pause ? 'disabled' : '' ?>>
                        <option value="" disabled selected>Selecione a Equipe...</option>
                        <option value="<?= htmlspecialchars($partida['id_equipe_a']) ?>"><?= htmlspecialchars($partida['nome_equipe_a']) ?></option>
                        <option value="<?= htmlspecialchars($partida['id_equipe_b']) ?>"><?= htmlspecialchars($partida['nome_equipe_b']) ?></option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label d-block">&nbsp;</label>
                    <button type="submit" name="acao" value="timeout" class="btn btn-warning w-100" id="start-pause-btn" <?= !$current_period || $partida['hora_fim'] || $has_open_pause ? 'disabled' : '' ?>>
                        <i class="fas fa-pause me-1"></i> Iniciar Pausa
                    </button>
                </div>
                <div class="col-md-3">
                    <label class="form-label d-block">&nbsp;</label>
                    <button type="submit" name="acao" value="finalizar_pausa" class="btn btn-info w-100" id="end-pause-btn" <?= !$has_open_pause ? 'disabled' : '' ?>>
                        <i class="fas fa-play me-1"></i> Finalizar Pausa
                    </button>
                </div>
                <div class="col-md-3">
                    <label class="form-label d-block">&nbsp;</label>
                    <button type="submit" name="acao" value="finalizar" class="btn btn-danger w-100" id="end-btn" <?= $partida['hora_fim'] ? 'disabled' : '' ?>>
                        <i class="fas fa-stop me-1"></i> Finalizar Partida
                    </button>
                </div>
            </div>
        </form>
        <?php
        $jogadores_por_equipe_map = getJogadoresPorEquipeMap($pdo, $partida['id_equipe_a'], $partida['id_equipe_b']);

        if ($current_period || $next_period) {
            // === SEMPRE LÊ DO BANCO (isso resolve o problema do reload) ===
            $stmt = $pdo->prepare("SELECT equipe_esquerda_primeiro_set FROM sumulas_volei_config WHERE id_partida = ?");
            $stmt->execute([$id_partida]);
            $config = $stmt->fetch(PDO::FETCH_ASSOC);
            $equipe_esquerda_primeiro_set = $config['equipe_esquerda_primeiro_set'] ?? $partida['id_equipe_a']; // padrão: equipe A à esquerda
            // === DETERMINA O NÚMERO DO SET ATUAL ===
            $set_atual_num = $current_period ? (array_search($current_period, $periodsOrder) + 1) : ($next_period ? (array_search($next_period, $periodsOrder) + 1) : 1);

            // Sets pares (2º, 4º...) invertem o lado
            $inverte_lado = ($set_atual_num % 2 === 0);

            // === DEFINE QUEM FICA À ESQUERDA/DIREITA NO SET ATUAL ===
            if ($inverte_lado) {
                $id_equipe_esquerda = ($equipe_esquerda_primeiro_set == $partida['id_equipe_a']) ? $partida['id_equipe_b'] : $partida['id_equipe_a'];
            } else {
                $id_equipe_esquerda = $equipe_esquerda_primeiro_set;
            }

            $id_equipe_direita = ($id_equipe_esquerda == $partida['id_equipe_a']) ? $partida['id_equipe_b'] : $partida['id_equipe_a'];

            $nome_esquerda = ($id_equipe_esquerda == $partida['id_equipe_a']) ? $partida['nome_equipe_a'] : $partida['nome_equipe_b'];
            $nome_direita = ($id_equipe_esquerda == $partida['id_equipe_a']) ? $partida['nome_equipe_b'] : $partida['nome_equipe_a'];

            // === RENDERIZA A QUADRA COM OS LADOS CORRETOS ===
            echo renderRodizioSection(
                    $pdo, $id_partida, $current_period, $next_period, $partida,
                    $jogadores_por_equipe_map,
                    $id_equipe_esquerda, $id_equipe_direita,
                    $nome_esquerda, $nome_direita
            );
        }
        ?>
        <h4 class="mt-4">Resumo dos Sets</h4>
        <div class="table-responsive">
            <table class="table table-bordered table-sm">
                <thead class="table-dark">
                    <tr>
                        <th>Set</th>
                        <th>Tempo Jogado (Efetivo)</th>
                        <th>Pausas Técnicas (Timeouts)</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    foreach ($periodsOrder as $set):
                        $pausas_set = array_filter($timeouts, function ($t) use ($set) {
                            return $t['periodo'] === "Pausa $set";
                        });
                        ?>
                        <tr>
                            <th><?= htmlspecialchars($set) ?></th>
                            <td id="chrono_<?= str_replace(' ', '_', $set) ?>">00:00:00</td>
                            <td id="pausas_<?= str_replace(' ', '_', $set) ?>">
                                <?php
                                if (empty($pausas_set)) {
                                    echo 'Nenhuma pausa';
                                } else {
                                    $pausas_formatadas = array_map(function ($t) use ($partida) {
                                        $inicio = new DateTime($t['hora_inicio']);
                                        $fim = $t['hora_fim'] ? new DateTime($t['hora_fim']) : new DateTime(); // agora
                                        $intervalo = $inicio->diff($fim);

                                        // Formata como mm:ss (ex: 01:23 ou 12:05)
                                        $duracao = $intervalo->format('%i:%s');

                                        // Nome da equipe
                                        if ($t['id_equipe_a'] == $partida['id_equipe_a']) {
                                            $equipe = $partida['nome_equipe_a'];
                                        } elseif ($t['id_equipe_b'] == $partida['id_equipe_b']) {
                                            $equipe = $partida['nome_equipe_b'];
                                        } else {
                                            $equipe = 'Desconhecida';
                                        }

                                        // Texto final
                                        $texto = $duracao . ' – ' . htmlspecialchars($equipe);
                                        if (!$t['hora_fim']) {
                                            $texto .= ' <span class="text-warning fw-bold">(em andamento)</span>';
                                        }

                                        return $texto;
                                    }, $pausas_set);

                                    echo implode('<br>', $pausas_formatadas);
                                }
                                ?>
                            </td>
                        </tr>
<?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
<div class="card mb-4">
    <div class="card-header"><i class="fas fa-plus me-1"></i> Registrar Novo Evento</div>
    <div class="card-body">
<?php if (!$current_period && !$partida['hora_fim']): ?>
            <div class="alert alert-warning" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i><strong>Set não iniciado!</strong> Inicie o Set para começar a registrar eventos.
            </div>
<?php elseif ($partida['hora_fim']): ?>
            <div class="alert alert-info" role="alert">
                <i class="fas fa-info-circle me-2"></i>A partida foi finalizada. Não é possível adicionar novos eventos.
            </div>
<?php else: ?>
            <form action="registrar_sumula_volei.php?id_partida=<?= $id_partida ?>" method="POST">
                <input type="hidden" name="add_evento" value="1">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label for="id_participante" class="form-label">Jogador</label>
                        <select id="id_participante" name="id_participante" class="form-select" required>
                            <option value="" disabled selected>Selecione o jogador...</option>
                            <optgroup label="<?= htmlspecialchars($partida['nome_equipe_a']) ?>">
                                <?php foreach ($jogadores_por_equipe[$partida['id_equipe_a']] ?? [] as $jogador): ?>
                                    <option value="<?= htmlspecialchars($jogador['id']) ?>">[<?= htmlspecialchars($jogador['numero_camisa']) ?>] <?= htmlspecialchars($jogador['nome_completo']) ?></option>
    <?php endforeach; ?>
                            </optgroup>
                            <optgroup label="<?= htmlspecialchars($partida['nome_equipe_b']) ?>">
                                <?php foreach ($jogadores_por_equipe[$partida['id_equipe_b']] ?? [] as $jogador): ?>
                                    <option value="<?= htmlspecialchars($jogador['id']) ?>">[<?= htmlspecialchars($jogador['numero_camisa']) ?>] <?= htmlspecialchars($jogador['nome_completo']) ?></option>
    <?php endforeach; ?>
                            </optgroup>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label for="tipo_evento" class="form-label">Tipo de Evento</label>
                        <select id="tipo_evento" name="tipo_evento" class="form-select" required>
                            <option value="Ponto de Saque">Ponto de Saque</option>
                            <option value="Ponto de Bloqueio">Ponto de Bloqueio</option>
                            <option value="Ponto Normal">Ponto Normal</option>
                            <option value="Cartão Amarelo">Cartão Amarelo</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <label class="form-label d-block">&nbsp;</label>
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
        <span class="fw-bold fs-5">Placar Atual: <?= htmlspecialchars($partida['placar_equipe_a'] ?? 0) ?> x <?= htmlspecialchars($partida['placar_equipe_b'] ?? 0) ?></span>
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
                                        case 'Ponto Normal':
                                            echo '<span class="badge bg-success"><i class="fas fa-plus me-1"></i> Ponto Normal</span>'; // Ícone alterado
                                            break;
                                        case 'Cartão Amarelo':
                                            echo '<span class="badge bg-warning text-dark"><i class="fas fa-square me-1"></i> Amarelo</span>';
                                            break;
                                        case 'Ponto de Saque': // Nome do evento corrigido para ser igual ao do POST
                                            echo '<span class="badge bg-success"><i class="fas fa-hand-paper me-1"></i> Ponto Saque</span>'; // Ícone alterado
                                            break;
                                        case 'Ponto de Bloqueio': // Nome do evento corrigido para ser igual ao do POST
                                            echo '<span class="badge bg-success"><i class="fas fa-shield-alt me-1"></i> Ponto Bloqueio</span>'; // Ícone alterado
                                            break;
                                        default:
                                            echo '<span class="badge bg-secondary"><i class="fas fa-question me-1"></i> Desconhecido</span>';
                                            break;
                                    }
                                    ?>
                                </td>
                                <td class="text-end">
                                    <button type="button" class="btn btn-outline-danger btn-sm anular-evento-btn" 
                                            data-bs-toggle="modal" 
                                            data-bs-target="#anularEventoModal"
                                            data-id="<?= $evento['id'] ?>"
                                            data-evento="<?= htmlspecialchars($evento['tipo_evento']) ?> de <?= htmlspecialchars($evento['nome_completo']) ?>">
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

<div class="modal fade" id="anularEventoModal" tabindex="-1" aria-labelledby="anularEventoModalLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <form id="anular-evento-form" method="GET" action="registrar_sumula_volei.php"> 
                <div class="modal-header">
                    <h5 class="modal-title" id="anularEventoModalLabel">Confirmar Anulação de Evento</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>Tem certeza de que deseja anular o evento: <strong id="evento-para-anular"></strong>?</p>
                    <p class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>Esta ação irá apenas remover o registro da súmula.</p>

                    <input type="hidden" name="id_partida" value="<?= $id_partida ?>"> 

                    <input type="hidden" name="id_evento" id="id_evento_anular"> 

                    <input type="hidden" name="action" value="anular_evento"> 
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-danger">Sim, Anular</button>
                </div>
            </form>
        </div>
    </div>
</div>
<!-- MODAL SIMPLES PARA VENCEDOR DO SET -->
<div class="modal fade" id="modalVencedorSet" tabindex="-1">
    <div class="modal-dialog modal-sm">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title">Vencedor do Set</h5>
            </div>
            <form id="formVencedor">
                <div class="modal-body text-center">
                    <p><strong id="setAtual">3º Set</strong></p>
                    <div class="btn-group d-flex" role="group">
                        <input type="radio" class="btn-check" name="vencedor" id="eqA" value="<?= $partida['id_equipe_a'] ?>" required>
                        <label class="btn btn-outline-primary flex-fill" for="eqA">
<?= htmlspecialchars($partida['nome_equipe_a']) ?>
                        </label>

                        <input type="radio" class="btn-check" name="vencedor" id="eqB" value="<?= $partida['id_equipe_b'] ?>">
                        <label class="btn btn-outline-danger flex-fill" for="eqB">
<?= htmlspecialchars($partida['nome_equipe_b']) ?>
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="submit" class="btn btn-success">Confirmar</button>
                </div>
            </form>
        </div>
    </div>
</div>
<script>
    document.getElementById('finalizar-periodo-btn').onclick = e => {
        e.preventDefault();
        document.getElementById('setAtual').textContent = '<?= $current_period ?>';
        new bootstrap.Modal('#modalVencedorSet').show();
    };

    document.getElementById('formVencedor').onsubmit = e => {
        e.preventDefault();

        const fd = new FormData();
        fd.append('registrar_tempo', '1');
        fd.append('acao', 'finalizar_periodo');
        fd.append('vencedor_set', document.querySelector('input[name="vencedor"]:checked').value);


        fetch(location.href, {
            method: 'POST',
            body: fd,
            headers: {'X-Requested-With': 'XMLHttpRequest'}
        })
                .then(r => {
                    console.log('STATUS:', r.status);
                    return r.text();
                })
                .then(text => {
                    console.log('RESPOSTA CRUA:', text);
                    try {
                        const data = JSON.parse(text);
                        bootstrap.Modal.getInstance('#modalVencedorSet').hide();
                        location.reload();
                    } catch (e) {
                        alert('ERRO: Resposta não é JSON. Veja o console (F12).');
                        throw e;
                    }
                })
                .catch(err => {
                    console.error('ERRO COMPLETO:', err);
                });
    };
</script>
<?php
// Inclusão de footer.php (assumindo que o arquivo existe)
require_once '../includes/footer.php';
?>

<script>
    document.addEventListener('DOMContentLoaded', () => {
        // Inicialização do Modal de Anulação
        const anularEventoModal = document.getElementById('anularEventoModal');
        // Verifica se o modal e o JS do Bootstrap estão disponíveis
        if (typeof bootstrap !== 'undefined' && anularEventoModal) {
            const modalInstance = new bootstrap.Modal(anularEventoModal);
            document.querySelectorAll('.anular-evento-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.currentTarget.dataset.id;
                    const evento = e.currentTarget.dataset.evento;
                    document.getElementById('id_evento_anular').value = id;
                    document.getElementById('evento-para-anular').textContent = evento;
                    modalInstance.show();
                });
            });
        }


        // ALTERAÇÃO: Definição dos períodos para Voleibol (Sets) no JS
        const periodsOrder = ['1º Set', '2º Set', '3º Set', '4º Set', '5º Set'];
        let timeoutsData = [];
        let periodsData = [];
        let currentPeriodName = <?= json_encode($current_period ?? '') ?>;
        let hasOpenPause = <?= $has_open_pause ? 'true' : 'false' ?>;
// Inicializar dados de períodos e pausas do PHP (para o primeiro carregamento)
<?php
// Recarrega todos os períodos APENAS para o JS, usando json_encode para segurança
$stmt_periods_js = $pdo->prepare("SELECT id, periodo, hora_inicio, hora_fim, id_equipe_a, id_equipe_b FROM sumulas_periodos WHERE id_partida = ? ORDER BY hora_inicio");
$stmt_periods_js->execute([$id_partida]);
$all_periods_js = $stmt_periods_js->fetchAll(PDO::FETCH_ASSOC);

foreach ($all_periods_js as $p):
    $start_ts = $p['hora_inicio'] ? strtotime($p['hora_inicio']) * 1000 : 'null';
    $end_ts = $p['hora_fim'] ? strtotime($p['hora_fim']) * 1000 : 'null';

    // Para evitar que a string 'null' seja tratada como JS 'null'
    $id_equipe_a_js = $p['id_equipe_a'] === null ? 'null' : (int) $p['id_equipe_a'];
    $id_equipe_b_js = $p['id_equipe_b'] === null ? 'null' : (int) $p['id_equipe_b'];

    // CORREÇÃO SINTAXE: Usando json_encode para escapar o período
    $periodo_js = json_encode($p['periodo']);

    // Monta o objeto no formato JSON para injeção no JS
    $js_object = "{\n";
    $js_object .= "    id: " . (int) $p['id'] . ",\n";
    $js_object .= "    periodo: {$periodo_js},\n";
    $js_object .= "    start: {$start_ts},\n";
    $js_object .= "    end: {$end_ts},\n";
    $js_object .= "    id_equipe_a: {$id_equipe_a_js},\n";
    $js_object .= "    id_equipe_b: {$id_equipe_b_js}\n";
    $js_object .= "}";
    ?>

    <?php if (strpos($p['periodo'], 'Pausa ') === 0): ?>
                timeoutsData.push(<?= $js_object ?>);
    <?php else: ?>
                periodsData.push(<?= $js_object ?>);
    <?php endif; ?>
<?php endforeach; ?>

        // Função auxiliar para formatar tempo (segundos para HH:MM:SS)
        function formatTime(totalSeconds) {
            const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const s = String(totalSeconds % 60).padStart(2, '0');
            return `${h}:${m}:${s}`;
        }

        // Função para atualizar os cronômetros
        function updateChronometers() {
            const now = new Date().getTime();

            periodsOrder.forEach(period => {
                const periodData = periodsData.find(p => p.periodo === period);
                const chronoElement = document.getElementById(`chrono_${period.replace(/\s/g, '_')}`);
                if (!chronoElement)
                    return;

                if (!periodData || !periodData.start) {
                    chronoElement.textContent = "00:00:00";
                    return;
                }

                const start = periodData.start;
                const end = periodData.end || now;
                let totalElapsedMs = end - start;
                let totalPausedMs = 0;

                const periodPauses = timeoutsData.filter(t => t.periodo === `Pausa ${period}`);

                periodPauses.forEach(p => {
                    // Pega o tempo entre o início da pausa e o fim dela (ou o tempo atual se não terminou)
                    const pStart = Math.max(p.start, start); // Garante que a pausa não comece antes do set
                    const pEnd = p.end ? Math.min(p.end, end) : (p.periodo.includes(currentPeriodName) ? now : end); // Se a pausa ainda está aberta, usa o tempo atual

                    if (pStart < pEnd) {
                        totalPausedMs += pEnd - pStart;
                    }
                });

                const effectiveElapsedMs = Math.max(0, totalElapsedMs - totalPausedMs);
                const effectiveElapsed = Math.floor(effectiveElapsedMs / 1000);
                chronoElement.textContent = formatTime(effectiveElapsed);
            });
        }
        function cleanUpModalBackdrops() {
            // 1. Remove todos os backdrops órfãos
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());

            // 2. Libera o body (remove a rolagem bloqueada e a classe de modal)
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }

// Aplica a limpeza forçada no evento de esconder o modal (como você fez)
// e também adiciona um listener para garantir que o body esteja sempre limpo
        document.querySelectorAll('.modal').forEach(modal => {
            // O evento fires *depois* que o modal terminou de ser escondido
            modal.addEventListener('hidden.bs.modal', cleanUpModalBackdrops);
        });
        // Função para atualizar o status dos botões
        function updateButtonState() {
            const isGameFinished = '<?= $partida['hora_fim'] ? 'true' : 'false' ?>' === 'true';
            const isCurrentPeriodActive = currentPeriodName !== '';

            // Botões de Set
            document.getElementById('start-btn').disabled = isCurrentPeriodActive || isGameFinished;
            document.getElementById('finalizar-periodo-btn').disabled = !isCurrentPeriodActive || isGameFinished;

            // Próximo Set (Verificação mais robusta, pois o PHP já calcula se deve haver um next_period)
            const hasNextPeriod = '<?= $next_period ? 'true' : 'false' ?>' === 'true';
            const nextBtn = document.getElementById('start-next-btn');
            if (nextBtn) {
                nextBtn.disabled = isCurrentPeriodActive || isGameFinished || !hasNextPeriod;
            }

            // Botões de Pausa
            document.getElementById('start-pause-btn').disabled = !isCurrentPeriodActive || isGameFinished || hasOpenPause;
            document.getElementById('end-pause-btn').disabled = !hasOpenPause;

            // Botão de Finalizar Partida
            document.getElementById('end-btn').disabled = isGameFinished;

            // Seletor de Equipe para Pausa
            const equipePausaSelect = document.getElementById('id_equipe_pausa');
            if (equipePausaSelect) {
                equipePausaSelect.disabled = hasOpenPause || !isCurrentPeriodActive;
            }
            // Seletor de Período
            document.getElementById('periodo_select').disabled = isCurrentPeriodActive;

            // Atualiza status do tempo
            const tempoAtualElement = document.getElementById('tempo-atual');
            if (isCurrentPeriodActive) {
                tempoAtualElement.innerHTML = `Set: <strong>${currentPeriodName}</strong>`;
            } else if (isGameFinished) {
                tempoAtualElement.innerHTML = `<span class="text-info">Partida Finalizada</span>`;
            } else {
                tempoAtualElement.innerHTML = `<span class="text-danger">Partida Parada</span>`;
            }
        }


        // Submissão de Formulário por AJAX
        document.querySelectorAll('#time-control-form, #pause-control-form').forEach(form => {
            form.addEventListener('submit', function (e) {
                e.preventDefault();

                const submitter = e.submitter;
                const formData = new FormData(this);

                // 1. Captura a ação do botão clicado
                let acao = submitter && submitter.name === 'acao' ? submitter.value : formData.get('acao');

                // 2. Garante que 'acao' esteja no FormData para o PHP
                if (acao) {
                    formData.set('acao', acao);
                }
                const idEquipePausa = document.getElementById('id_equipe_pausa');

                if (acao === 'timeout') {
                    if (!currentPeriodName) {
                        Swal.fire({toast: true, position: 'top-end', timer: 3500, timerProgressBar: true, icon: 'error', title: 'Erro', text: 'Nenhum Set em andamento para solicitar a Pausa Técnica.'});
                        return;
                    }
                    if (!idEquipePausa || !idEquipePausa.value) {
                        Swal.fire({toast: true, position: 'top-end', timer: 3500, timerProgressBar: true, icon: 'error', title: 'Erro', text: 'Equipe não especificada para a pausa.'});
                        return;
                    }
                } else if (acao === 'iniciar') {
                    formData.set('periodo_timeout', document.getElementById('periodo_select').value);
                } else if (acao === 'iniciar_proximo_periodo') {
                    // A lógica de iniciar_proximo_periodo é resolvida no PHP
                }


                fetch(this.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Requer atualização completa dos tempos e status
                                fetchTimeData();
                                if (acao === 'iniciar' || acao === 'finalizar') {
                                    location.reload();
                                    return; // Sai da função após o reload
                                }
                                // Se for 'finalizar_periodo', o próximo Set é selecionado.
                                if (acao === 'finalizar_periodo' && '<?= $next_period ?>' !== '') {
                                    document.getElementById('periodo_select').value = '<?= $next_period ?>';
                                } else if (acao === 'iniciar_proximo_periodo') {
                                    // Após iniciar, o próximo set deve ser 'null' ou o seguinte
                                    document.getElementById('periodo_select').value = '';
                                }

                                // Mensagem de sucesso
                                Swal.fire({
                                    toast: true,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 3500,
                                    timerProgressBar: true,
                                    icon: 'success',
                                    title: 'Sucesso',
                                    text: data.message
                                });

                            } else {
                                Swal.fire({
                                    toast: true,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 3500,
                                    timerProgressBar: true,
                                    icon: 'error',
                                    title: 'Erro',
                                    text: data.message
                                });
                            }
                        })
                        .catch(error => {
                            console.error('Erro na requisição AJAX:', error);
                            Swal.fire({
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 3500,
                                timerProgressBar: true,
                                icon: 'error',
                                title: 'Erro de Conexão',
                                text: 'Não foi possível completar a ação.'
                            });
                        });
            });
        });

        // Função para buscar e atualizar todos os dados de tempo e status
        function fetchTimeData() {
            const formData = new FormData();
            formData.append('id_partida', <?= $id_partida ?>);
            formData.append('registrar_tempo', '1');
            formData.append('acao', 'atualizar_tempos');

            fetch(`registrar_sumula_volei.php?id_partida=<?= $id_partida ?>`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // CORREÇÃO: Usar JSON.parse para garantir que a string JSON codificada seja um valor JS válido
                            currentPeriodName = data.periodo_atual || '';
                            hasOpenPause = data.has_open_pause;

                            // Separa dados de períodos e timeouts
                            timeoutsData = data.periods_data.filter(p => p.periodo.startsWith('Pausa'));
                            periodsData = data.periods_data.filter(p => !p.periodo.startsWith('Pausa'));

                            updateChronometers();
                            updateButtonState();

                            const placarA_ajax = data.placar_a;
                            const placarB_ajax = data.placar_b;
                            const horaFim_ajax = data.hora_fim;

                            const currentStatus = `P${data.has_open_pause}_C${data.periodo_atual}_A${placarA_ajax}_B${placarB_ajax}_F${horaFim_ajax}`;
                            const storedStatus = sessionStorage.getItem('vlei_status_<?= $id_partida ?>');
                            // <<<<<< FIM DA MODIFICAÇÃO >>>>>>

                            // Atualiza o status
                            if (storedStatus !== currentStatus) {
                                sessionStorage.setItem('vlei_status_<?= $id_partida ?>', currentStatus);

                                // Atualiza o placar no DOM usando os valores do AJAX
                                document.getElementById('sets_a').textContent = placarA_ajax;           // Sets ganhos equipe A
                                document.getElementById('sets_b').textContent = placarB_ajax;           // Sets ganhos equipe B
                                document.getElementById('pontos_set_a').textContent = data.pontos_set_a || 0;  // Pontos atuais do set
                                document.getElementById('pontos_set_b').textContent = data.pontos_set_b || 0;  // Pontos atuais do set

                                // Atualiza o texto do tempo atual
                                const tempoAtual = document.getElementById('tempo-atual');
                                if (currentPeriodName) {
                                    tempoAtual.innerHTML = `Set: <strong>${currentPeriodName}</strong>`;
                                } else if (horaFim_ajax) { // Usar horaFim_ajax
                                    tempoAtual.innerHTML = `<span class="text-info">Partida Finalizada</span>`;
                                } else {
                                    tempoAtual.innerHTML = `<span class="text-danger">Partida Parada</span>`;
                                }
                                Swal.fire({toast: true, position: 'top-end', timer: 2000, icon: 'info', title: 'Placar atualizado!'});
                            }                           // Se o status é o mesmo, só atualiza o storedStatus (que não deve mudar, mas evita problemas)
                            sessionStorage.setItem('vlei_status_<?= $id_partida ?>', currentStatus);
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao buscar dados de tempo:', error);
                    });
        }

        const periodoAtual = document.getElementById('periodo-atual')?.value;
        if (periodsData.length > 0) {
            updateChronometers();
            setInterval(updateChronometers, 1000);
        }

        updateButtonState();
        sessionStorage.setItem('vlei_status_<?= $id_partida ?>', `P<?= $has_open_pause ? 'true' : 'false' ?>_C<?= $current_period ?? '' ?>_A<?= $partida['placar_equipe_a'] ?? 0 ?>_B<?= $partida['placar_equipe_b'] ?? 0 ?>`); // Inicializa o status

        // Notificação de recarga da página (se houver)
<?php
if (isset($_SESSION['notificacao'])):
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
    ?>
            // Usando DOMContentLoaded para garantir que o Swal (se for o caso) seja carregado
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3500,
                    timerProgressBar: true,
                    icon: '<?= htmlspecialchars($notificacao['type']) ?>',
                    title: '<?= htmlspecialchars($notificacao['type'] === 'success' ? 'Sucesso' : 'Erro') ?>',
                    text: '<?= htmlspecialchars($notificacao['message']) ?>'
                });
            } else {
                console.log('Notificação: <?= htmlspecialchars($notificacao['type']) ?> - <?= htmlspecialchars($notificacao['message']) ?>');
            }
<?php endif; ?>
    });
    // NOVO: LÓGICA DO MODAL INICIAR SET
    const modalIniciarSet = new bootstrap.Modal(document.getElementById('modalIniciarSet'));
    const formIniciarSet = document.getElementById('formIniciarSet');
    const periodoSelectStart = document.getElementById('periodo_select_start');
    // Essas variáveis PHP vêm do bloco de HTML D. 
    const nextPeriodValue = '<?= $next_period ?>';
    const periodsOrder = JSON.parse('<?= json_encode($periodsOrder) ?>');

    // === MELHORIA: NÃO ATUALIZA ENQUANTO O ÁRBITRO ESTIVER DIGITANDO ===
    let isTyping = false;

    // Detecta quando o árbitro clica no campo de jogador
    const jogadorSelect = document.getElementById('id_participante');
    if (jogadorSelect) {
        jogadorSelect.addEventListener('focus', () => isTyping = true);
        jogadorSelect.addEventListener('blur', () => {
            setTimeout(() => isTyping = false, 500);
        });
    }

    // Atualiza cronômetros a cada 1 segundo
    if (periodsData.length > 0) {
        updateChronometers();
        setInterval(updateChronometers, 1000);
    }

    // Atualiza placar, pausas e botões a cada 5 segundos — SÓ SE NÃO ESTIVER DIGITANDO
    setInterval(() => {
        if (isTyping)
            return;  // ← NÃO RECARREGA NADA!
        fetchTimeData();
    }, 5000);
    // === FIM DA MELHORIA ===

    // === MODAL DO VENCEDOR DO SET – VERSÃO 100% FUNCIONAL ===
    document.addEventListener('DOMContentLoaded', function () {
        const btnFinalizar = document.getElementById('finalizar-periodo-btn');
        const modalVencedor = document.getElementById('modalVencedorSet');
        const formVencedor = document.getElementById('formVencedor');
        const setAtualSpan = document.getElementById('setAtual');

        if (!btnFinalizar || !modalVencedor || !formVencedor) {
            console.error('Modal ou botão não encontrado!');
            return;
        }

        // 1. ABRIR O MODAL
        btnFinalizar.addEventListener('click', function (e) {
            e.preventDefault();
            if (!currentPeriodName) {
                Swal.fire('Erro', 'Nenhum set em andamento!', 'error');
                return;
            }
            setAtualSpan.textContent = currentPeriodName;
            new bootstrap.Modal(modalVencedor).show();
        });

        // 2. ENVIAR O VENCEDOR
        formVencedor.addEventListener('submit', function (e) {
            e.preventDefault();
            const vencedor = this.vencedor.value;
            if (!vencedor) {
                Swal.fire('Erro', 'Escolha o vencedor!', 'warning');
                return;
            }

            const fd = new FormData();
            fd.append('registrar_tempo', '1');
            fd.append('acao', 'finalizar_periodo');
            fd.append('vencedor_set', vencedor);
            fd.append('id_partida', <?= $id_partida ?>);

            fetch('', {
                method: 'POST',
                body: fd,
                headers: {'X-Requested-With': 'XMLHttpRequest'}
            })
                    .then(r => r.json())
                    .then(data => {
                        bootstrap.Modal.getInstance(modalVencedor).hide();
                        location.reload();
                        fetchTimeData();
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'success',
                            title: data.message || 'Set finalizado!',
                            timer: 3000
                        });
                    })
                    .catch(() => {
                        Swal.fire('Erro', 'Falha na comunicação', 'error');
                    });
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('hidden.bs.modal', function () {
            // Remove todos os backdrops órfãos
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            // Libera o body
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        });
    });
</script>
<script>
// MODAL INICIAR SET - VERSÃO FINAL QUE FUNCIONA 100%
    let equipeSacando = null;

// Abre o modal
    document.getElementById('start-btn').addEventListener('click', () => {
        equipeSacando = null;
        document.getElementById('btn-iniciar-set').disabled = true;

        // Reseta visual
        document.querySelectorAll('.equipe-opcao').forEach(el => {
            el.style.backgroundColor = '';
            el.style.transform = '';
            el.classList.remove('border-primary', 'border-4', 'shadow-lg');
        });

        new bootstrap.Modal(document.getElementById('modalIniciarSet')).show();
    });

// Clique nos cards (AGORA VAI FUNCIONAR PORQUE O HTML JÁ CARREGOU)
    document.querySelectorAll('.equipe-opcao').forEach(opcao => {
        opcao.addEventListener('click', function () {
            // Remove seleção anterior
            document.querySelectorAll('.equipe-opcao').forEach(el => {
                el.style.backgroundColor = '';
                el.style.transform = '';
                el.classList.remove('border-primary', 'border-4', 'shadow-lg');
            });

            // Destaca o escolhido
            this.style.backgroundColor = '#dbeafe';
            this.style.transform = 'translateY(-8px)';
            this.style.boxShadow = '0 10px 25px rgba(59,130,246,0.5)';
            this.classList.add('border-primary', 'border-4', 'shadow-lg');

            equipeSacando = this.dataset.equipe;
            document.getElementById('btn-iniciar-set').disabled = false;
        });
    });

// Botão Iniciar Set
    document.getElementById('btn-iniciar-set').addEventListener('click', function () {
        if (!equipeSacando)
            return;

        const countA = document.querySelectorAll('.pos-left .jogador-pos').length;
        const countB = document.querySelectorAll('.pos-right .jogador-pos').length;

        if (countA !== 6 || countB !== 6) {
            // ANTES FECHAVA O MODAL E TRAVAVA TUDO
            // AGORA: só mostra toast e NÃO bloqueia nada
            Swal.fire({
                icon: 'warning',
                title: 'Escalação incompleta!',
                text: `Equipe A: ${countA}/6 | Equipe B: ${countB}/6 — Complete as posições!`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 5000,
                timerProgressBar: true,
                // ESSAS 3 LINHAS SÃO AS MAIS IMPORTANTES:
                didOpen: () => {
                    Swal.hideLoading();
                },
                allowOutsideClick: true,
                allowEscapeKey: true,
                allowEnterKey: true
            });

            return; // impede de enviar o POST
        }
        // ==== DEBUG FORÇADO ====
        const periodoQueVaiSerEnviado = '<?= $next_period ?: '1º Set' ?>';
        console.clear();
        console.log('%c DEBUG INICIAR SET ', 'background:#000;color:#0f0;font-size:20px;padding:10px');
        console.log('Valor que o PHP mandou: ', periodoQueVaiSerEnviado);
        console.log('Valor literal no JS: ', '<?= $next_period ?: '1º Set' ?>');
        console.log('equipeSacando: ', equipeSacando);
        // ========================
        const fd = new FormData();
        fd.append('registrar_tempo', '1');
        fd.append('acao', 'iniciar');
        fd.append('periodo_timeout', '<?= $next_period ?: '1º Set' ?>');
        fd.append('id_equipe_sacando', equipeSacando);
        fd.append('id_partida', <?= $id_partida ?>);

        fetch(location.href, {
            method: 'POST',
            body: fd,
            headers: {'X-Requested-With': 'XMLHttpRequest'}
        })
                .then(r => r.json())
                .then(data => {
                    bootstrap.Modal.getInstance(document.getElementById('modalIniciarSet')).hide();
                    if (data.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Pronto!',
                            text: 'Set iniciado com sucesso!',
                            timer: 2000
                        });
                        setTimeout(() => location.reload(), 1200);
                    } else {
                        Swal.fire('Erro', data.message, 'error');
                    }
                })
                .catch(() => {
                    Swal.fire('Erro', 'Falha na conexão', 'error');
                });
    });
</script>