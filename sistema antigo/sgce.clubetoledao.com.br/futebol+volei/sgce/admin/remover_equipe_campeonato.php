<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// Inicia a sessão para notificações
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Método inválido. Use POST.']);
    exit;
}

$id_campeonato = filter_input(INPUT_POST, 'id_campeonato', FILTER_VALIDATE_INT);
$id_equipe = filter_input(INPUT_POST, 'id_equipe', FILTER_VALIDATE_INT);

if (!$id_campeonato || !$id_equipe) {
    echo json_encode(['status' => 'error', 'message' => 'ID do campeonato ou da equipe inválido.']);
    exit;
}

try {
    // Verifica se o campeonato existe
    $stmt_check_campeonato = $pdo->prepare("SELECT COUNT(*) FROM campeonatos WHERE id = ?");
    $stmt_check_campeonato->execute([$id_campeonato]);
    if ($stmt_check_campeonato->fetchColumn() == 0) {
        echo json_encode(['status' => 'error', 'message' => 'Campeonato não encontrado.']);
        exit;
    }

    // Verifica se a equipe existe
    $stmt_check_equipe = $pdo->prepare("SELECT COUNT(*) FROM equipes WHERE id = ?");
    $stmt_check_equipe->execute([$id_equipe]);
    if ($stmt_check_equipe->fetchColumn() == 0) {
        echo json_encode(['status' => 'error', 'message' => 'Equipe não encontrada.']);
        exit;
    }

    // Verifica se a equipe está associada ao campeonato
    $stmt_check_assoc = $pdo->prepare("SELECT COUNT(*) FROM campeonatos_equipes WHERE id_campeonato = ? AND id_equipe = ?");
    $stmt_check_assoc->execute([$id_campeonato, $id_equipe]);
    if ($stmt_check_assoc->fetchColumn() == 0) {
        echo json_encode(['status' => 'error', 'message' => 'Equipe não está associada a este campeonato.']);
        exit;
    }

    // Verifica se há partidas associadas à equipe no campeonato
    $stmt_check_partidas = $pdo->prepare("
        SELECT COUNT(*) 
        FROM partidas 
        WHERE id_campeonato = ? AND (id_equipe_a = ? OR id_equipe_b = ?)
    ");
    $stmt_check_partidas->execute([$id_campeonato, $id_equipe, $id_equipe]);
    if ($stmt_check_partidas->fetchColumn() > 0) {
        echo json_encode(['status' => 'error', 'message' => 'Não é possível remover a equipe, pois ela está associada a partidas neste campeonato.']);
        exit;
    }

    // Remove a relação da tabela campeonatos_equipes
    $stmt = $pdo->prepare("DELETE FROM campeonatos_equipes WHERE id_campeonato = ? AND id_equipe = ?");
    if ($stmt->execute([$id_campeonato, $id_equipe])) {
        $_SESSION['notificacao'] = [
            'tipo' => 'success',
            'mensagem' => 'Equipe removida do campeonato com sucesso.'
        ];
        echo json_encode(['status' => 'success', 'message' => 'Equipe removida do campeonato com sucesso.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erro ao remover a equipe do campeonato.']);
    }
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Erro no banco de dados: ' . $e->getMessage()]);
}
?>