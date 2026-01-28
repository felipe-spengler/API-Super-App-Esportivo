<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

header('Content-Type: application/json');

$id_partida = isset($_GET['id_partida']) ? filter_var($_GET['id_partida'], FILTER_VALIDATE_INT) : null;

if (!$id_partida) {
    echo json_encode(['success' => false, 'message' => 'ID da partida inválido']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT e.id_participante, p.nome_completo, p.apelido, e.id_equipe, COUNT(e.id) as num_gols
        FROM sumulas_eventos e
        JOIN participantes p ON e.id_participante = p.id
        WHERE e.id_partida = ? AND e.tipo_evento = 'Gol'
        GROUP BY e.id_participante, p.nome_completo, p.apelido, e.id_equipe
        ORDER BY e.id_equipe, p.nome_completo
    ");
    $stmt->execute([$id_partida]);
    $goleadores = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $goleadores_a = [];
    $goleadores_b = [];

    // Obter IDs das equipes da partida
    $stmt_partida = $pdo->prepare("
        SELECT id_equipe_a, id_equipe_b
        FROM partidas
        WHERE id = ?
    ");
    $stmt_partida->execute([$id_partida]);
    $partida = $stmt_partida->fetch(PDO::FETCH_ASSOC);

    foreach ($goleadores as $goleador) {
        $nome_base = $goleador['apelido'] ?: explode(' ', $goleador['nome_completo'])[0];
        $nome_display = $nome_base . ($goleador['num_gols'] > 1 ? ' (' . $goleador['num_gols'] . ' gols)' : '');
        $goleador_data = [
            'id' => $goleador['id_participante'],
            'nome' => htmlspecialchars($nome_base),
            'display' => htmlspecialchars($nome_display),
            'gols' => (int)$goleador['num_gols']
        ];
        if ($goleador['id_equipe'] == $partida['id_equipe_a']) {
            $goleadores_a[] = $goleador_data;
        } elseif ($goleador['id_equipe'] == $partida['id_equipe_b']) {
            $goleadores_b[] = $goleador_data;
        }
    }

    echo json_encode([
        'success' => true,
        'goleadores_a' => $goleadores_a,
        'goleadores_b' => $goleadores_b
    ]);
} catch (PDOException $e) {
    error_log("Erro ao buscar goleadores: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro ao carregar goleadores']);
}
?>