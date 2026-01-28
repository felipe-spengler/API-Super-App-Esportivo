<?php
// /api/remover_jogador.php
require_once '../includes/db.php';
header('Content-Type: application/json');

// Proteção: verificar se o usuário logado é líder da equipe do jogador
require_once '../includes/proteger_equipe.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['id_jogador'])) {
    echo json_encode(['sucesso' => false, 'mensagem' => 'Requisição inválida.']);
    exit();
}

$id_jogador = $_POST['id_jogador'];
$id_equipe_lider = $minha_equipe['id'] ?? null;

if (!$id_equipe_lider) {
    echo json_encode(['sucesso' => false, 'mensagem' => 'Líder sem equipe.']);
    exit();
}

try {
    // Verificação extra: o jogador pertence mesmo à equipe do líder?
    $stmt_verif = $pdo->prepare("SELECT id FROM participantes WHERE id = ? AND id_equipe = ?");
    $stmt_verif->execute([$id_jogador, $id_equipe_lider]);
    if ($stmt_verif->rowCount() == 0) {
        throw new Exception('Você não tem permissão para remover este jogador.');
    }

    // Deletar o jogador
    $stmt_delete = $pdo->prepare("DELETE FROM participantes WHERE id = ?");
    $stmt_delete->execute([$id_jogador]);

    echo json_encode(['sucesso' => true, 'mensagem' => 'Jogador removido com sucesso!']);

} catch (Exception $e) {
    echo json_encode(['sucesso' => false, 'mensagem' => $e->getMessage()]);
}
?>