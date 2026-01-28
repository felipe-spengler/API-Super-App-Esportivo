<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    echo json_encode(['success' => false, 'message' => 'Método não permitido. Use DELETE.']);
    exit();
}

// Pega o id da query string
parse_str(parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY), $query);
$id = $query['id'] ?? null;

if (!$id || !is_numeric($id)) {
    echo json_encode(['success' => false, 'message' => 'ID inválido ou não informado.']);
    exit();
}

$id = (int) $id;

// Buscar a foto no banco
$sql = "SELECT src FROM fotos_participantes WHERE id = :id LIMIT 1";
$stmt = $pdo->prepare($sql);
$stmt->execute([':id' => $id]);
$foto = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$foto) {
    echo json_encode(['success' => false, 'message' => 'Foto não encontrada.']);
    exit();
}

$caminhoArquivo = '../' . $foto['src'];

if (file_exists($caminhoArquivo)) {
    if (!unlink($caminhoArquivo)) {
        echo json_encode(['success' => false, 'message' => 'Falha ao apagar arquivo no servidor.']);
        exit();
    }
}

$sqlDelete = "DELETE FROM fotos_participantes WHERE id = :id";
$stmtDelete = $pdo->prepare($sqlDelete);

if ($stmtDelete->execute([':id' => $id])) {
    echo json_encode(['success' => true, 'message' => 'Foto excluída com sucesso.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Falha ao excluir registro no banco.']);
}
exit();