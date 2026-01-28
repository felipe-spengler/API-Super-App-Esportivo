<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['id_partida'])) {
    echo json_encode(['status' => 'error', 'message' => 'Requisição inválida.']);
    exit;
}

$id_partida = intval($_POST['id_partida']);

// Verificar se a partida existe e obter seu status
$stmt = $pdo->prepare("SELECT status, id_campeonato FROM partidas WHERE id = ?");
$stmt->execute([$id_partida]);
$partida = $stmt->fetch();

if (!$partida) {
    echo json_encode(['status' => 'error', 'message' => 'Partida não encontrada.']);
    exit;
}

// Verificar se a partida está finalizada
if ($partida['status'] === 'Finalizada') {
    echo json_encode(['status' => 'error', 'message' => 'Não é possível excluir uma partida finalizada.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Excluir a partida
    $stmt = $pdo->prepare("DELETE FROM partidas WHERE id = ?");
    $stmt->execute([$id_partida]);

    $pdo->commit();
    echo json_encode(['status' => 'success', 'message' => 'Partida excluída com sucesso.']);
} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['status' => 'error', 'message' => 'Erro ao excluir a partida: ' . $e->getMessage()]);
}
?>