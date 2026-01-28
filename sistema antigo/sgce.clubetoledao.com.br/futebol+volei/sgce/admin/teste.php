<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// Iniciar sessão, se não estiver ativa
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    // Validar chaves estrangeiras
    $stmt_equipes = $pdo->prepare("SELECT id FROM equipes WHERE id IN (:id_equipe_a, :id_equipe_b)");
    $stmt_equipes->execute([':id_equipe_a' => 1, ':id_equipe_b' => 2]);
    if ($stmt_equipes->rowCount() != 2) {
        throw new Exception("Uma ou ambas as equipes não existem.");
    }

    $stmt_campeonato = $pdo->prepare("SELECT id FROM campeonatos WHERE id = :id_campeonato");
    $stmt_campeonato->execute([':id_campeonato' => 10]);
    if ($stmt_campeonato->rowCount() != 1) {
        throw new Exception("O campeonato não existe.");
    }

    $participantes_ids = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
    $stmt_participantes = $pdo->prepare("SELECT id FROM participantes WHERE id IN (" . implode(',', array_fill(0, count($participantes_ids), '?')) . ")");
    $stmt_participantes->execute($participantes_ids);
    if ($stmt_participantes->rowCount() != count($participantes_ids)) {
        throw new Exception("Um ou mais participantes não existem.");
    }

    // Query com prepared statements
    $stmt = $pdo->prepare("
        UPDATE partidas
        SET
            fase = :fase,
            placar_equipe_a = :placar_equipe_a,
            placar_equipe_b = :placar_equipe_b,
            id_equipe_a = :id_equipe_a,
            id_equipe_b = :id_equipe_b,
            id_campeonato = :id_campeonato,
            status = :status,
            id_melhor_jogador = :id_melhor_jogador,
            id_melhor_goleiro = :id_melhor_goleiro,
            id_melhor_lateral = :id_melhor_lateral,
            id_melhor_meia = :id_melhor_meia,
            id_melhor_atacante = :id_melhor_atacante,
            id_melhor_artilheiro = :id_melhor_artilheiro,
            id_melhor_assistencia = :id_melhor_assistencia,
            id_melhor_volante = :id_melhor_volante,
            id_melhor_estreante = :id_melhor_estreante,
            id_melhor_zagueiro = :id_melhor_zagueiro,
            data_partida = :data_partida,
            local = :local,
            publico = :publico,
            observacoes = :observacoes
        WHERE id = :id
    ");

    $stmt->execute([
        ':fase' => 'Final',
        ':placar_equipe_a' => 3,
        ':placar_equipe_b' => 2,
        ':id_equipe_a' => 1,
        ':id_equipe_b' => 2,
        ':id_campeonato' => 10,
        ':status' => 'Finalizada',
        ':id_melhor_jogador' => 101, // Pode ser null, ex.: null
        ':id_melhor_goleiro' => 102,
        ':id_melhor_lateral' => 103,
        ':id_melhor_meia' => 104,
        ':id_melhor_atacante' => 105,
        ':id_melhor_artilheiro' => 106,
        ':id_melhor_assistencia' => 107,
        ':id_melhor_volante' => 108,
        ':id_melhor_estreante' => 109,
        ':id_melhor_zagueiro' => 110,
        ':data_partida' => '2025-08-20 19:30:00',
        ':local' => 'Estádio Municipal de Toledo',
        ':publico' => 1500,
        ':observacoes' => 'Partida disputada com chuva leve.',
        ':id' => 121
    ]);

    // Definir notificação de sucesso
    $_SESSION['notificacao'] = [
        'tipo' => 'success',
        'mensagem' => 'Partida com ID 121 atualizada com sucesso!'
    ];

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