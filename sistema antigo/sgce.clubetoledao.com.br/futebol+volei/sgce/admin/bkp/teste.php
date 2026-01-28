<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// Iniciar sessão, se não estiver ativa
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    // Validar chaves estrangeiras
    $stmt_equipes = $pdo->prepare("ALTER TABLE partidas ADD COLUMN rodadas VARCHAR(20) DEFAULT NULL AFTER fase;");
    $stmt_equipes->execute();

} catch (PDOException $e) {
    // Definir notificação de erro
    $_SESSION['notificacao'] = [
        'tipo' => 'error',
        'mensagem' => 'Erro ao atualizar a partida: ' . $e->getMessage()
    ];
} catch (Exception $e) {
    // Capturar outros erros genéricos
    $_SESSION['notificacao'] = [
        'tipo' => 'error',
        'mensagem' => 'Erro: ' . $e->getMessage()
    ];
}

// Redirecionar para a página de gerenciamento de partidas

exit();
?>