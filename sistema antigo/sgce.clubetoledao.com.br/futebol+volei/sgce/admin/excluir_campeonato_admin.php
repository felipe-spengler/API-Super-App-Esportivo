<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['id_campeonato'])) {
    echo json_encode(['status' => 'error', 'message' => 'Requisição inválida.']);
    exit;
}

$id_campeonato = intval($_POST['id_campeonato']);

// Verificar se o campeonato tem sub-campeonatos
$stmt = $pdo->prepare("SELECT COUNT(*) FROM campeonatos WHERE id_campeonato_pai = ?");
$stmt->execute([$id_campeonato]);
if ($stmt->fetchColumn() > 0) {
    echo json_encode(['status' => 'error', 'message' => 'Este campeonato possui sub-campeonatos. Exclua os sub-campeonatos primeiro.']);
    exit;
}

// Verificar se o campeonato tem equipes inscritas
$stmt = $pdo->prepare("SELECT COUNT(*) FROM campeonatos_equipes WHERE id_campeonato = ?");
$stmt->execute([$id_campeonato]);
if ($stmt->fetchColumn() > 0) {
    echo json_encode(['status' => 'error', 'message' => 'Este campeonato possui equipes inscritas. Remova as inscrições primeiro.']);
    exit;
}

// Verificar se o campeonato tem partidas associadas
$stmt = $pdo->prepare("SELECT COUNT(*) FROM partidas WHERE id_campeonato = ?");
$stmt->execute([$id_campeonato]);
if ($stmt->fetchColumn() > 0) {
    echo json_encode(['status' => 'error', 'message' => 'Este campeonato possui partidas registradas. Exclua as partidas primeiro.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Excluir o campeonato
    $stmt = $pdo->prepare("DELETE FROM campeonatos WHERE id = ?");
    $stmt->execute([$id_campeonato]);

    $pdo->commit();
    echo json_encode(['status' => 'success', 'message' => 'Campeonato excluído com sucesso.']);
} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['status' => 'error', 'message' => 'Erro ao excluir o campeonato: ' . $e->getMessage()]);
}
?>