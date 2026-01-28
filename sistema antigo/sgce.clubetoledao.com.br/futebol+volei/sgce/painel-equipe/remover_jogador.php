<?php
// /painel-equipe/remover_jogador.php
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id_jogador'])) {
    $id_jogador = (int) $_POST['id_jogador'];

    // Garantir que pertence à equipe logada
    $stmt = $pdo->prepare("DELETE FROM participantes WHERE id = ? AND id_equipe = ?");
    $stmt->execute([$id_jogador, $minha_equipe['id']]);
    
    echo json_encode(['status' => 'ok']);
}
