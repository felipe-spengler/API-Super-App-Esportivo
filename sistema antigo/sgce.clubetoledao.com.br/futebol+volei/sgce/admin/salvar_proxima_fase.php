<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

if (session_status() === PHP_SESSION_NONE) { session_start(); }

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id_campeonato'], $_POST['partidas'], $_POST['proxima_fase'])) {
    $id_campeonato = $_POST['id_campeonato'];
    $partidas = $_POST['partidas'];
    $fase = $_POST['proxima_fase'];

    // Validação
    foreach ($partidas as $partida) {
        if ($partida['equipe_a'] == $partida['equipe_b']) {
            $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro: Uma equipe não pode jogar contra si mesma.'];
            header("Location: ver_partidas.php?id_campeonato=" . $id_campeonato);
            exit();
        }
    }

    try {
        $pdo->beginTransaction();
        
        // Insere as partidas confirmadas pelo admin
        foreach ($partidas as $partida) {
            $sql = "INSERT INTO partidas (id_campeonato, id_equipe_a, id_equipe_b, fase, status) VALUES (?, ?, ?, ?, 'Agendada')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id_campeonato, $partida['equipe_a'], $partida['equipe_b'], $fase]);
        }
        
        $pdo->commit();
        
        $_SESSION['notificacao'] = ['tipo' => 'success', 'mensagem' => "Partidas da fase '{$fase}' geradas com sucesso!"];

    } catch (Exception $e) {
        $pdo->rollBack();
        $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro ao salvar as partidas: ' . $e->getMessage()];
    }

    header("Location: ver_partidas.php?id_campeonato=" . $id_campeonato);
    exit();
}
?>