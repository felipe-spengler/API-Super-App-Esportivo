<?php
// /api/inscrever_equipe.php
require_once '../includes/db.php';
header('Content-Type: application/json');

// Verificar se o usuário está logado e é líder de equipe
if (!isset($_SESSION['user_id']) || $_SESSION['user_tipo'] != 'lider_equipe') {
    echo json_encode(['sucesso' => false, 'mensagem' => 'Acesso não autorizado.']);
    exit();
}

$id_lider = $_SESSION['user_id'];
$id_campeonato = $_POST['id_campeonato'];

try {
    // Buscar o ID da equipe liderada por este usuário
    $stmt_equipe = $pdo->prepare("SELECT id FROM equipes WHERE id_lider = ?");
    $stmt_equipe->execute([$id_lider]);
    $equipe = $stmt_equipe->fetch();

    if (!$equipe) {
        throw new Exception('Nenhuma equipe encontrada para este líder.');
    }
    $id_equipe = $equipe['id'];

    // Inserir a inscrição
    $sql = "INSERT INTO campeonatos_equipes (id_campeonato, id_equipe) VALUES (?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id_campeonato, $id_equipe]);

    echo json_encode(['sucesso' => true, 'mensagem' => 'Inscrição realizada com sucesso!']);

} catch (PDOException $e) {
    // Código 23000 é erro de duplicidade (UNIQUE constraint)
    if ($e->getCode() == 23000) {
        echo json_encode(['sucesso' => false, 'mensagem' => 'Sua equipe já está inscrita neste campeonato.']);
    } else {
        echo json_encode(['sucesso' => false, 'mensagem' => 'Erro no banco de dados: ' . $e->getMessage()]);
    }
} catch (Exception $e) {
    echo json_encode(['sucesso' => false, 'mensagem' => 'Erro: ' . $e->getMessage()]);
}
?>