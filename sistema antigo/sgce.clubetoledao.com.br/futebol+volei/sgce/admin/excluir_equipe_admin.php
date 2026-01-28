<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header("Location: gerenciar_equipes.php?id_categoria=" . ($_GET['id_categoria'] ?? ''));
    exit();
}
$id_equipe = $_GET['id'];
$id_categoria = filter_var($_GET['id_categoria'] ?? '', FILTER_VALIDATE_INT); // Get id_categoria for redirect

// Start session for notifications
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// --- INTEGRITY CHECKS BEFORE DELETION ---

// 1. Verify if the team is enrolled in any championship (optional, as we'll delete the relationship)
// Note: This check is redundant since we'll delete from campeonatos_equipes, but kept for consistency
$stmt_check_inscricoes = $pdo->prepare("SELECT COUNT(*) FROM campeonatos_equipes WHERE id_equipe = ?");
$stmt_check_inscricoes->execute([$id_equipe]);
if ($stmt_check_inscricoes->fetchColumn() > 0) {
    // Modify this check to allow deletion since we'll handle campeonatos_equipes
    // Alternatively, keep it if you want to prevent deletion for teams in championships
    // $_SESSION['notificacao'] = [
    //     'tipo' => 'error', 
    //     'mensagem' => 'Esta equipe está inscrita em um ou mais campeonatos.'
    // ];
    // header("Location: menu_categoria_equipe.php?id_categoria=$id_categoria");
    // exit();
}

// 2. Verify if the team has events in sumulas
$stmt_check_sumulas = $pdo->prepare("SELECT COUNT(*) FROM sumulas_eventos WHERE id_equipe = ?");
$stmt_check_sumulas->execute([$id_equipe]);
if ($stmt_check_sumulas->fetchColumn() > 0) {
    $_SESSION['notificacao'] = [
        'tipo' => 'error', 
        'mensagem' => 'Esta equipe não pode ser excluída, pois possui registros em súmulas de partidas.'
    ];
    header("Location: menu_categoria_equipe.php?id_categoria=$id_categoria");
    exit();
}

// 3. Verify if the team participated in any matches (as home or away team)
$stmt_check_partidas = $pdo->prepare("SELECT COUNT(*) FROM partidas WHERE id_equipe_a = ? OR id_equipe_b = ?");
$stmt_check_partidas->execute([$id_equipe, $id_equipe]);
if ($stmt_check_partidas->fetchColumn() > 0) {
    $_SESSION['notificacao'] = [
        'tipo' => 'error', 
        'mensagem' => 'Esta equipe não pode ser excluída, pois possui partidas agendadas ou finalizadas.'
    ];
    header("Location: menu_categoria_equipe.php?id_categoria=$id_categoria");
    exit();
}

// If all checks pass, the team is "safe" to delete, including its relationships
try {
    $pdo->beginTransaction();

    // 1. Delete team-championship relationships from campeonatos_equipes
    $stmt_relacionamento = $pdo->prepare("DELETE FROM campeonatos_equipes WHERE id_equipe = ?");
    $stmt_relacionamento->execute([$id_equipe]);

    // 2. Delete participants of the team
    $stmt_participantes = $pdo->prepare("DELETE FROM participantes WHERE id_equipe = ?");
    $stmt_participantes->execute([$id_equipe]);

    // 3. Delete the team itself
    $stmt_equipe = $pdo->prepare("DELETE FROM equipes WHERE id = ?");
    $stmt_equipe->execute([$id_equipe]);

    $pdo->commit();
    
    $_SESSION['notificacao'] = ['tipo' => 'success', 'mensagem' => 'Equipe e seus registros associados foram excluídos com sucesso.'];

} catch (Exception $e) {
    $pdo->rollBack();
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro ao excluir a equipe. Detalhes: ' . $e->getMessage()];
}

?>