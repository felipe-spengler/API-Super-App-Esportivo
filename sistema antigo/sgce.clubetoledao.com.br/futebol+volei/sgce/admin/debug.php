<?php
require_once '../includes/db.php';
header('Content-Type: text/plain; charset=utf-8');

echo "==============================\n";
echo "   DEBUG BUSCAR PARTIDAS\n";
echo "==============================\n\n";

echo "URL: " . $_SERVER['REQUEST_URI'] . "\n";
echo "GET: ";
print_r($_GET);
echo "\n";

$id_categoria = $_GET['id_categoria'] ?? null;
echo "ID_CATEGORIA recebido: " . ($id_categoria ?: 'NULO') . "\n";

if (!$id_categoria || !is_numeric($id_categoria)) {
    echo "ERRO: ID inválido ou ausente!\n";
    exit;
}

try {
    echo "Conectando ao banco... OK\n\n";

    $sql = "
SELECT
    p.id,
    p.fase,
    p.id_melhor_jogador,
    p.placar_equipe_a,
    p.placar_equipe_b,
    p.id_campeonato,
    p.rodada,
    a.nome AS nome_a,
    a.id AS id_equipe_a,
    b.nome AS nome_b,
    b.id AS id_equipe_b,
    c.nome AS nome_campeonato,
    mvp.nome_completo AS nome_melhor_jogador
FROM partidas p
JOIN equipes a ON p.id_equipe_a = a.id
JOIN equipes b ON p.id_equipe_b = b.id
JOIN campeonatos c ON p.id_campeonato = c.id
LEFT JOIN participantes mvp ON p.id_melhor_jogador = mvp.id
WHERE c.id = ? AND p.status = 'Finalizada'
ORDER BY p.id DESC";

    echo "SQL:\n$sql\n\n";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id_categoria]);
    $partidas = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "TOTAL DE PARTIDAS ENCONTRADAS: " . count($partidas) . "\n\n";

    if (count($partidas) == 0) {
        echo "NENHUMA PARTIDA FINALIZADA NESTA CATEGORIA!\n";
        echo "Verifique se:\n";
        echo "  - A categoria tem partidas\n";
        echo "  - Elas estão com status 'Finalizada'\n";
        echo "  - O id_categoria está correto\n";
    } else {
        foreach ($partidas as $i => $p) {
            echo "[$i] {$p['nome_a']} {$p['placar_equipe_a']} x {$p['placar_equipe_b']} {$p['nome_b']}\n";
            echo "    Rodada: {$p['rodada']} | MVP: " . ($p['nome_melhor_jogador'] ?: 'Não definido') . "\n";
            echo "    ID Partida: {$p['id']}\n\n";
        }
    }

} catch (Exception $e) {
    echo "ERRO FATAL: " . $e->getMessage() . "\n";
    echo "Linha: " . $e->getLine() . "\n";
}
?>