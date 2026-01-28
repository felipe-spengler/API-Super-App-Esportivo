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

    // Verifica se a equipe já está associada ao campeonato
    $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM campeonatos_equipes WHERE id_campeonato = ? AND id_equipe = ?");
    $stmt_check->execute([$id_campeonato, $id_equipe]);
    if ($stmt_check->fetchColumn() > 0) {
        echo json_encode(['status' => 'error', 'message' => 'Equipe já está associada a este campeonato.']);
        exit;
    }

    // Insere a relação na tabela campeonatos_equipes
    $stmt = $pdo->prepare("INSERT INTO campeonatos_equipes (id_campeonato, id_equipe, data_inscricao) VALUES (?, ?, NOW())");
    if ($stmt->execute([$id_campeonato, $id_equipe])) {
        $_SESSION['notificacao'] = [
            'tipo' => 'success',
            'mensagem' => 'Equipe adicionada ao campeonato com sucesso.'
        ];
        echo json_encode(['status' => 'success', 'message' => 'Equipe adicionada ao campeonato com sucesso.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Erro ao adicionar a equipe ao campeonato.']);
    }
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Erro no banco de dados: ' . $e->getMessage()]);
}
?>