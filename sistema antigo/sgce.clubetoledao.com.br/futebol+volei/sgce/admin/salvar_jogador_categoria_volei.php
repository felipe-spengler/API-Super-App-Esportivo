<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);

$id_categoria       = $input['id_categoria']       ?? null;
$id_jogador         = $input['id_jogador']         ?? null;
$categoria          = trim($input['categoria'] ?? '');
$id_partida         = $input['id_partida']         ?? null;
$id_foto_selecionada = $input['id_foto_selecionada'] ?? null;

if (!$id_categoria || !$id_jogador || !$categoria) {
    echo json_encode(['success' => false, 'message' => 'Dados obrigatórios faltando.']);
    exit;
}

// Validação numérica
$id_categoria = filter_var($id_categoria, FILTER_VALIDATE_INT);
$id_jogador   = filter_var($id_jogador, FILTER_VALIDATE_INT);
$id_partida   = $id_partida ? filter_var($id_partida, FILTER_VALIDATE_INT) : null;
$id_foto_selecionada = $id_foto_selecionada ? filter_var($id_foto_selecionada, FILTER_VALIDATE_INT) : null;

if (!$id_categoria || !$id_jogador) {
    echo json_encode(['success' => false, 'message' => 'ID inválido.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // === CRAQUE DO JOGO (salva na PARTIDA, não no campeonato) ===
    if ($categoria === 'craque' && $id_partida) {
        $stmt = $pdo->prepare("UPDATE partidas SET id_melhor_jogador = ?, id_foto_selecionada_melhor_jogador = ? WHERE id = ?");
        $stmt->execute([$id_jogador, $id_foto_selecionada, $id_partida]);
    }

    // === MELHOR ESTREANTE (se for por partida, salva na partida) ===
    if ($categoria === 'estreante' && $id_partida && $id_partida != 0) {
        $stmt = $pdo->prepare("UPDATE partidas SET id_melhor_estreante = ?, id_foto_selecionada_melhor_estreante = ? WHERE id = ?");
        $stmt->execute([$id_jogador, $id_foto_selecionada, $id_partida]);
    }

    // === TODOS OS OUTROS PRÊMIOS: salvam no CAMPEONATO ===
    $map = [
        'levantadora' => ['id_melhor_levantadora', 'id_foto_melhor_levantadora'],
        'libero'      => ['id_melhor_libero',      'id_foto_melhor_libero'],
        'oposta'      => ['id_melhor_oposta',      'id_foto_melhor_oposta'],
        'ponteira'    => ['id_melhor_ponteira',    'id_foto_melhor_ponteira'],
        'central'     => ['id_melhor_central',     'id_foto_melhor_central'],
        'pontuador'   => ['id_maior_pontuador',    'id_foto_maior_pontuador'],
        'saque'       => ['id_melhor_saque',       'id_foto_melhor_saque'],
        'bloqueio'    => ['id_melhor_bloqueio',    'id_foto_melhor_bloqueio'],
        'estreante'   => ['id_melhor_estreante',   'id_foto_melhor_estreante'], // final do campeonato
    ];

    if (isset($map[$categoria])) {
        [$col_id, $col_foto] = $map[$categoria];
        $sql = "UPDATE campeonatos SET $col_id = ?, $col_foto = ? WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id_jogador, $id_foto_selecionada, $id_categoria]);
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Salvo com sucesso!']);

} catch (Exception $e) {
    $pdo->rollBack();
    error_log("Erro salvar_jogador_categoria_volei: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro no banco: ' . $e->getMessage()]);
}
?>