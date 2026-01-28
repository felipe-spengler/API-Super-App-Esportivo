<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header("Location: gerenciar_usuarios.php");
    exit();
}
$id_usuario = $_GET['id'];

if (session_status() === PHP_SESSION_NONE) { session_start(); }

// Prevenção: Não deixar o admin se auto-excluir
if ($id_usuario == $_SESSION['user_id']) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Você não pode excluir seu próprio usuário.'];
    header("Location: gerenciar_usuarios.php");
    exit();
}

// Prevenção: Verifica se o usuário é líder de alguma equipe
$stmt_check = $pdo->prepare("SELECT COUNT(*) FROM equipes WHERE id_lider = ?");
$stmt_check->execute([$id_usuario]);
if ($stmt_check->fetchColumn() > 0) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Usuário não pode ser excluído, pois é líder de uma ou mais equipes.'];
    header("Location: gerenciar_usuarios.php");
    exit();
}

// Se todas as verificações passaram, executa a exclusão
$stmt_delete = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");

if ($stmt_delete->execute([$id_usuario])) {
    $_SESSION['notificacao'] = ['tipo' => 'success', 'mensagem' => 'Usuário excluído com sucesso!'];
} else {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro ao excluir o usuário.'];
}

header("Location: gerenciar_usuarios.php");
exit();
?>