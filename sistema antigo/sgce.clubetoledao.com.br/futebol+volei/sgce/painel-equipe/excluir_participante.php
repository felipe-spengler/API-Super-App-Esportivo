<?php
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php';

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header("Location: gerenciar_equipes.php");
    exit();
}
$id_participante = $_GET['id'];

// Antes de qualquer coisa, busca o id_equipe para poder redirecionar de volta em qualquer cenário
$stmt_equipe = $pdo->prepare("SELECT id_equipe FROM participantes WHERE id = ?");
$stmt_equipe->execute([$id_participante]);
$participante_info = $stmt_equipe->fetch();

if (!$participante_info) {
    if (session_status() === PHP_SESSION_NONE) { session_start(); }
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Participante não encontrado.'];
    header("Location: gerenciar_equipes.php");
    exit();
}

$id_equipe_redirect = $participante_info['id_equipe'];

// --- ADICIONADO: VERIFICAÇÃO DE INTEGRIDADE ANTES DE EXCLUIR ---
// Conta quantos eventos este participante tem na tabela de súmulas.
$stmt_check = $pdo->prepare("SELECT COUNT(*) FROM sumulas_eventos WHERE id_participante = ?");
$stmt_check->execute([$id_participante]);
$eventos_count = $stmt_check->fetchColumn();

// Se a contagem for maior que 0, ele não pode ser excluído.
if ($eventos_count > 0) {
    if (session_status() === PHP_SESSION_NONE) { session_start(); }
    $_SESSION['notificacao'] = [
        'tipo' => 'error', 
        'mensagem' => 'Este participante não pode ser excluído, pois já possui registros em súmulas.'
    ];
    // Redireciona de volta para a página da equipe com a mensagem de erro.
    header("Location: editar_equipe_admin.php?id=" . $id_equipe_redirect);
    exit();
}

// --- FIM DA VERIFICAÇÃO ---

// Se a verificação passou (ou seja, $eventos_count é 0), prossegue com a exclusão.
$stmt_delete = $pdo->prepare("DELETE FROM participantes WHERE id = ?");

if (session_status() === PHP_SESSION_NONE) { session_start(); }

if ($stmt_delete->execute([$id_participante])) {
    $_SESSION['notificacao'] = ['tipo' => 'success', 'mensagem' => 'Participante excluído com sucesso!'];
} else {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro ao excluir o participante.'];
}

// Redireciona de volta para a página de edição da equipe
header("Location: editar_equipe_admin.php?id=" . $id_equipe_redirect);
exit();