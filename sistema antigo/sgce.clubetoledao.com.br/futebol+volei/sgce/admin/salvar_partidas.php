<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

if (session_status() === PHP_SESSION_NONE) { session_start(); }

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id_campeonato'], $_POST['partidas'])) {
    $id_campeonato = $_POST['id_campeonato'];
    $partidas = $_POST['partidas'];

    // Validação
    foreach ($partidas as $partida) {
        if ($partida['equipe_a'] == $partida['equipe_b']) {
            $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro: Uma equipe não pode jogar contra si mesma.'];
            header("Location: gerenciar_campeonatos.php");
            exit();
        }
    }

    try {
        // ADICIONADO: Busca o tipo de chaveamento do campeonato
        $stmt_tipo = $pdo->prepare("SELECT tipo_chaveamento FROM campeonatos WHERE id = ?");
        $stmt_tipo->execute([$id_campeonato]);
        $tipo_chaveamento = $stmt_tipo->fetchColumn();

        $pdo->beginTransaction();

        $fase = "Fase de Grupos"; // Padrão para Pontos Corridos
        if ($tipo_chaveamento === 'Mata-Mata') {
            // Lógica para determinar a fase do Mata-Mata
            $total_partidas = count($partidas);
            if ($total_partidas <= 1) $fase = "Final";
            elseif ($total_partidas <= 2) $fase = "Semifinal";
            elseif ($total_partidas <= 4) $fase = "Quartas de Final";
            else $fase = "Oitavas de Final";
        }
        
        // Insere as partidas confirmadas pelo admin
        foreach ($partidas as $partida) {
            $sql = "INSERT INTO partidas (id_campeonato, id_equipe_a, id_equipe_b, fase, status) VALUES (?, ?, ?, ?, 'Agendada')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id_campeonato, $partida['equipe_a'], $partida['equipe_b'], $fase]);
        }

        // Atualiza o status do campeonato
        $stmt_status = $pdo->prepare("UPDATE campeonatos SET status = 'Em Andamento' WHERE id = ?");
        $stmt_status->execute([$id_campeonato]);
        
        $pdo->commit();
        
        $_SESSION['notificacao'] = ['tipo' => 'success', 'mensagem' => 'Partidas geradas com sucesso!'];

    } catch (Exception $e) {
        $pdo->rollBack();
        $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro ao salvar as partidas: ' . $e->getMessage()];
    }

    header("Location: gerenciar_campeonatos.php");
    exit();
}
?>