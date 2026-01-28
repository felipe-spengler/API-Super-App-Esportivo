<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';
header('Content-Type: application/json');

// Só aceita id_participante
$id_participante = isset($_GET['id_participante']) ? filter_var($_GET['id_participante'], FILTER_VALIDATE_INT) : null;

if (!$id_participante) {
    echo json_encode(['success' => false, 'message' => 'ID do participante inválido']);
    exit;
}

try {
    // Busca o jogador
    $stmt = $pdo->prepare("
        SELECT p.id, p.nome_completo, p.apelido, p.id_equipe, e.nome AS equipe_nome
        FROM participantes p
        LEFT JOIN equipes e ON p.id_equipe = e.id
        WHERE p.id = ?
    ");
    $stmt->execute([$id_participante]);
    $jogador = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$jogador) {
        echo json_encode(['success' => false, 'message' => 'Jogador não encontrado']);
        exit;
    }

    // Busca TODAS as fotos dele
    $stmt = $pdo->prepare("
        SELECT id, src 
        FROM fotos_participantes 
        WHERE participante_id = ? 
        ORDER BY id DESC
    ");
    $stmt->execute([$id_participante]);
    $fotos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $jogador['fotos'] = $fotos;

    echo json_encode([
        'success' => true,
        'jogador' => $jogador
    ]);

} catch (PDOException $e) {
    error_log("Erro em buscar_jogador_unico.php: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>