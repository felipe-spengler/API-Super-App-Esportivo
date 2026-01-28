<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['id_partida']) || !is_numeric($input['id_partida']) || 
    !isset($input['coluna']) || !in_array($input['coluna'], [
        'id_melhor_jogador', 'id_melhor_goleiro', 'id_melhor_lateral', 'id_melhor_meia',
        'id_melhor_atacante', 'id_melhor_artilheiro', 'id_melhor_assistencia',
        'id_melhor_volante', 'id_melhor_estreante', 'id_melhor_zagueiro'
    ]) || !isset($input['id_jogador']) || !is_numeric($input['id_jogador'])) {
    echo json_encode(['success' => false, 'message' => 'Parâmetros inválidos']);
    exit;
}

$id_partida = $input['id_partida'];
$coluna = $input['coluna'];
$id_jogador = $input['id_jogador'];

// Verificar se o jogador existe
$stmt = $pdo->prepare("SELECT id FROM participantes WHERE id = ?");
$stmt->execute([$id_jogador]);
if (!$stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Jogador não encontrado']);
    exit;
}

$stmt = $pdo->prepare("UPDATE partidas SET $coluna = ? WHERE id = ?");
$stmt->execute([$id_jogador, $id_partida]);

echo json_encode(['success' => true, 'message' => 'Partida atualizada com sucesso']);
?>