<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

header('Content-Type: application/json');

$id_equipe = isset($_GET['id_equipe']) ? filter_var($_GET['id_equipe'], FILTER_VALIDATE_INT) : null;

if (!$id_equipe) {
    echo json_encode(['success' => false, 'message' => 'ID da equipe inválido']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT p.id, p.nome_completo, p.apelido, p.id_equipe, fp.id as foto_id, fp.src as foto_src
        FROM participantes p
        LEFT JOIN fotos_participantes fp ON p.id = fp.participante_id
        WHERE p.id_equipe = ?
        ORDER BY p.nome_completo ASC
    ");
    $stmt->execute([$id_equipe]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $jogadores = [];
    foreach ($rows as $row) {
        $jogador_id = $row['id'];
        if (!isset($jogadores[$jogador_id])) {
            $jogadores[$jogador_id] = [
                'id' => $row['id'],
                'nome_completo' => $row['nome_completo'],
                'apelido' => $row['apelido'],
                'id_equipe' => $row['id_equipe'],
                'fotos' => []
            ];
        }
        if ($row['foto_id']) {
            $jogadores[$jogador_id]['fotos'][] = [
                'id' => $row['foto_id'],
                'src' => $row['foto_src']
            ];
        }
    }

    echo json_encode(['success' => true, 'jogadores' => array_values($jogadores)]);
} catch (PDOException $e) {
    error_log("Erro ao buscar jogadores: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro ao carregar jogadores']);
}
?>