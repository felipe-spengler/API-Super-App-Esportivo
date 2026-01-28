<?php
// Inclui o arquivo de conexão com o banco de dados
require_once '../includes/db.php';
// Define o cabeçalho para garantir que a resposta seja JSON
header('Content-Type: application/json');

// 1. Validação do ID da Categoria (Campeonato)
$id_categoria = isset($_GET['id_categoria']) ? filter_var($_GET['id_categoria'], FILTER_VALIDATE_INT) : null;

if (!$id_categoria) {
    echo json_encode(['success' => false, 'message' => 'ID da categoria inválido']);
    exit;
}

try {
    // 2. Query SQL que faz um JOIN entre a tabela de associação
    // e a tabela de equipes para buscar todas as equipes do campeonato.
    $stmt = $pdo->prepare("
        SELECT
            e.id,
            e.nome
        FROM campeonatos_equipes ce
        JOIN equipes e ON ce.id_equipe = e.id
        WHERE ce.id_campeonato = ?
        ORDER BY e.nome ASC
    ");
    
    $stmt->execute([$id_categoria]);
    $equipes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Retorno de Sucesso
    echo json_encode([
        'success' => true,
        'equipes' => $equipes
    ]);

} catch (Exception $e) {
    // 4. Retorno de Erro
    error_log("Erro ao buscar equipes da categoria: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Erro no banco ao carregar equipes: ' . $e->getMessage()
    ]);
}
?>