<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$id_categoria = isset($input['id_categoria']) ? filter_var($input['id_categoria'], FILTER_VALIDATE_INT) : null;
$id_jogador = isset($input['id_jogador']) ? filter_var($input['id_jogador'], FILTER_VALIDATE_INT) : null;
$categoria = isset($input['categoria']) ? filter_var($input['categoria'], FILTER_SANITIZE_STRING) : null;
$id_foto_selecionada = isset($input['id_foto_selecionada']) ? filter_var($input['id_foto_selecionada'], FILTER_VALIDATE_INT) : null;

$categoria_to_column = [
    'craque' => ['id_column' => 'id_melhor_jogador', 'foto_column' => 'id_foto_selecionada_melhor_jogador'],
    'goleiro' => ['id_column' => 'id_melhor_goleiro', 'foto_column' => 'id_foto_selecionada_melhor_goleiro'],
    'lateral' => ['id_column' => 'id_melhor_lateral', 'foto_column' => 'id_foto_selecionada_melhor_lateral'],
    'meia' => ['id_column' => 'id_melhor_meia', 'foto_column' => 'id_foto_selecionada_melhor_meia'],
    'atacante' => ['id_column' => 'id_melhor_atacante', 'foto_column' => 'id_foto_selecionada_melhor_atacante'],
    'artilheiro' => ['id_column' => 'id_melhor_artilheiro', 'foto_column' => 'id_foto_selecionada_melhor_artilheiro'],
    'assistencia' => ['id_column' => 'id_melhor_assistencia', 'foto_column' => 'id_foto_selecionada_melhor_assistencia'],
    'volante' => ['id_column' => 'id_melhor_volante', 'foto_column' => 'id_foto_selecionada_melhor_volante'],
    'estreante' => ['id_column' => 'id_melhor_estreante', 'foto_column' => 'id_foto_selecionada_melhor_estreante'],
    'zagueiro' => ['id_column' => 'id_melhor_zagueiro', 'foto_column' => 'id_foto_selecionada_melhor_zagueiro'],
    'melhor' => ['id_column' => 'id_melhor_jogador', 'foto_column' => 'id_foto_selecionada_melhor_jogador']
];

if (!$id_categoria || !$id_jogador || !$categoria || !isset($categoria_to_column[$categoria])) {
    echo json_encode(['success' => false, 'message' => 'Dados inválidos fornecidos.']);
    exit;
}

list($id_column, $foto_column) = array_values($categoria_to_column[$categoria]);
$id_foto_selecionada = $id_foto_selecionada ?: null; // Convert empty to NULL for database

try {
    $stmt = $pdo->prepare("UPDATE campeonatos SET $id_column = ?, $foto_column = ? WHERE id = ?");
    $stmt->execute([$id_jogador, $id_foto_selecionada, $id_categoria]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Nenhuma alteração foi feita no campeonato.']);
    }
} catch (PDOException $e) {
    error_log("Erro ao salvar jogador: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro ao salvar jogador no campeonato: ' . $e->getMessage()]);
}
?>