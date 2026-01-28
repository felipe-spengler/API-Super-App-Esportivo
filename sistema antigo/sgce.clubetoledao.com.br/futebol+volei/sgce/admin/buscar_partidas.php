<?php
require_once '../includes/db.php';
header('Content-Type: application/json');

$id_categoria = isset($_GET['id_categoria']) ? filter_var($_GET['id_categoria'], FILTER_VALIDATE_INT) : null;
if (!$id_categoria) {
    echo json_encode(['success' => false, 'message' => 'ID do campeonato inválido']);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.rodada,
            p.placar_equipe_a,
            p.placar_equipe_b,
            a.nome AS nome_a,
            a.id AS id_equipe_a,
            b.nome AS nome_b,
            b.id AS id_equipe_b,
            c.nome AS nome_campeonato,
            mvp.id AS id_melhor_jogador,
            mvp.nome_completo AS nome_melhor_jogador
        FROM partidas p
        JOIN equipes a ON p.id_equipe_a = a.id
        JOIN equipes b ON p.id_equipe_b = b.id
        JOIN campeonatos c ON p.id_campeonato = c.id
        LEFT JOIN participantes mvp ON p.id_melhor_jogador = mvp.id
        WHERE c.id = ? AND p.status = 'Finalizada'
        ORDER BY p.id DESC
    ");
    $stmt->execute([$id_categoria]);
    $partidas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // CRIA OS CAMPOS QUE O JS ESPERA
    foreach ($partidas as &$p) {
        $p['mvp_id']   = $p['id_melhor_jogador'] ?? '';
        $p['mvp_nome'] = $p['nome_melhor_jogador'] ?? '';
    }

    echo json_encode([
        'success' => true,
        'partidas' => $partidas
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro no banco: ' . $e->getMessage()
    ]);
}
?>