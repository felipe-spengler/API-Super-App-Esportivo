<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

header('Content-Type: application/json');

$id_campeonato = $_POST['id_campeonato'] ?? null;
$id_equipe = $_POST['id_equipe'] ?? null;

// Validação simples
if (empty($id_campeonato) || empty($id_equipe)) {
    echo json_encode(['status' => 'error', 'message' => 'Dados incompletos.']);
    exit();
}

try {
    // Verifica se a equipe já está inscrita para evitar duplicidade
    $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM campeonatos_equipes WHERE id_campeonato = ? AND id_equipe = ?");
    $stmt_check->execute([$id_campeonato, $id_equipe]);
    if ($stmt_check->fetchColumn() > 0) {
        echo json_encode(['status' => 'error', 'message' => 'Esta equipe já está inscrita neste campeonato.']);
        exit();
    }

    // Insere o registro
    $sql = "INSERT INTO campeonatos_equipes (id_campeonato, id_equipe) VALUES (?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id_campeonato, $id_equipe]);
    
    echo json_encode(['status' => 'success', 'message' => 'Equipe inscrita com sucesso!']);

} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Erro no banco de dados: ' . $e->getMessage()]);
}
?>