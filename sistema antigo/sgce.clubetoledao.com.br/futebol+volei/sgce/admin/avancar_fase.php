<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

if (session_status() === PHP_SESSION_NONE) { session_start(); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['id_campeonato'])) {
    header("Location: gerenciar_campeonatos.php");
    exit();
}
$id_campeonato = $_POST['id_campeonato'];

// Ordem das fases
$ordem_fases = ['Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final'];

try {
    $pdo->beginTransaction();

    // 1. Determinar a fase atual e a próxima
    $stmt_fase = $pdo->prepare("SELECT DISTINCT fase FROM partidas WHERE id_campeonato = ? ORDER BY FIELD(fase, 'Final', 'Semifinal', 'Quartas de Final', 'Oitavas de Final')");
    $stmt_fase->execute([$id_campeonato]);
    $fase_atual = $stmt_fase->fetchColumn();

    $indice_fase_atual = array_search($fase_atual, $ordem_fases);
    if ($fase_atual === 'Final' || $indice_fase_atual === false) {
        throw new Exception("O campeonato já está na final ou a fase é inválida.");
    }
    $proxima_fase = $ordem_fases[$indice_fase_atual + 1];

    // 2. Coletar os vencedores da fase atual
    $stmt_vencedores = $pdo->prepare("SELECT id_equipe_a, id_equipe_b, placar_equipe_a, placar_equipe_b FROM partidas WHERE id_campeonato = ? AND fase = ? AND status = 'Finalizada'");
    $stmt_vencedores->execute([$id_campeonato, $fase_atual]);
    $partidas_concluidas = $stmt_vencedores->fetchAll();

    $classificados = [];
    foreach ($partidas_concluidas as $partida) {
        if ($partida['placar_equipe_a'] > $partida['placar_equipe_b']) {
            $classificados[] = $partida['id_equipe_a'];
        } elseif ($partida['placar_equipe_b'] > $partida['placar_equipe_a']) {
            $classificados[] = $partida['id_equipe_b'];
        }
        // Nota: Este código não trata empates. Assume-se que um placar de vitória foi definido.
    }
    
    // 3. Identificar equipes que tiveram "bye" na PRIMEIRA fase
    // Esta lógica é necessária para juntá-los aos vencedores para a segunda fase
    if ($indice_fase_atual === 0) { // Se a fase concluída foi a primeira
        $stmt_todos_inscritos = $pdo->prepare("SELECT id_equipe FROM campeonatos_equipes WHERE id_campeonato = ?");
        $stmt_todos_inscritos->execute([$id_campeonato]);
        $todos_inscritos = $stmt_todos_inscritos->fetchAll(PDO::FETCH_COLUMN);

        $stmt_jogaram = $pdo->prepare("SELECT id_equipe_a FROM partidas WHERE id_campeonato = ? AND fase = ? UNION SELECT id_equipe_b FROM partidas WHERE id_campeonato = ? AND fase = ?");
        $stmt_jogaram->execute([$id_campeonato, $fase_atual, $id_campeonato, $fase_atual]);
        $jogaram = $stmt_jogaram->fetchAll(PDO::FETCH_COLUMN);
        
        $equipes_com_bye = array_diff($todos_inscritos, $jogaram);
        $classificados = array_merge($classificados, $equipes_com_bye);
    }
    
    // 4. Sortear e gerar as novas partidas
    if (count($classificados) < 2) {
        throw new Exception("Não há classificados suficientes para gerar a próxima fase.");
    }

    shuffle($classificados);
    
    $equipe_com_bye_proxima_fase = null;
    if (count($classificados) % 2 != 0) {
        $equipe_com_bye_proxima_fase = array_pop($classificados);
    }

    for ($i = 0; $i < count($classificados); $i += 2) {
        $sql_insert = "INSERT INTO partidas (id_campeonato, id_equipe_a, id_equipe_b, fase, status) VALUES (?, ?, ?, ?, 'Agendada')";
        $stmt_insert = $pdo->prepare($sql_insert);
        $stmt_insert->execute([$id_campeonato, $classificados[$i], $classificados[$i + 1], $proxima_fase]);
    }
    
    $pdo->commit();

    $mensagem_sucesso = "Avanço para a fase '{$proxima_fase}' realizado com sucesso!";
    if ($equipe_com_bye_proxima_fase) {
        $stmt_nome_bye = $pdo->prepare("SELECT nome FROM equipes WHERE id = ?");
        $stmt_nome_bye->execute([$equipe_com_bye_proxima_fase]);
        $nome_bye = $stmt_nome_bye->fetchColumn();
        $mensagem_sucesso .= " A equipe '".htmlspecialchars($nome_bye)."' avançou direto (bye).";
    }
    $_SESSION['notificacao'] = ['tipo' => 'success', 'mensagem' => $mensagem_sucesso];

} catch (Exception $e) {
    $pdo->rollBack();
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro ao avançar de fase: ' . $e->getMessage()];
}

header("Location: ver_partidas.php?id_campeonato=" . $id_campeonato);
exit();
?>