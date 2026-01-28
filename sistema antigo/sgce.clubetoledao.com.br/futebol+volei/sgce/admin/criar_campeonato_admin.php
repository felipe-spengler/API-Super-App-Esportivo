<?php
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/proteger_admin.php';

header('Content-Type: application/json; charset=utf-8');

$erros = [];
$id_campeonato_pai = isset($_POST['id_campeonato_pai']) && ctype_digit($_POST['id_campeonato_pai']) ? intval($_POST['id_campeonato_pai']) : null;

// Recebe os dados do POST
$id_campeonato    = isset($_POST['id_campeonato']) && is_numeric($_POST['id_campeonato']) ? intval($_POST['id_campeonato']) : 0;
$nome             = trim($_POST['nome'] ?? '');
$id_esporte       = $_POST['id_esporte'] ?? '';
$data_inicio      = $_POST['data_inicio'] ?? '';
$tipo_chaveamento = $_POST['tipo_chaveamento'] ?? '';

// Validações
if (empty($nome)) {
    $erros[] = 'O nome do campeonato é obrigatório.';
} elseif (strlen($nome) > 100) {
    $erros[] = 'O nome do campeonato não pode ultrapassar 100 caracteres.';
}

if (empty($id_esporte) || !ctype_digit((string)$id_esporte)) {
    $erros[] = 'É obrigatório selecionar um esporte válido.';
}

if (empty($data_inicio)) {
    $erros[] = 'A data de início é obrigatória.';
} elseif (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data_inicio)) {
    $erros[] = 'A data de início deve estar no formato YYYY-MM-DD.';
}

if (empty($tipo_chaveamento)) {
    $erros[] = 'O formato (chaveamento) é obrigatório.';
} elseif (!in_array(strtolower($tipo_chaveamento), ['mata-mata', 'pontos corridos', 'pontos corridos + mata-mata'])) {
    $erros[] = 'Tipo de chaveamento inválido.';
}

if (!empty($erros)) {
    echo json_encode(['status' => 'error', 'errors' => $erros], JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    if ($id_campeonato > 0) {
        // Update
        $sql = "UPDATE campeonatos SET nome = ?, id_esporte = ?, data_inicio = ?, tipo_chaveamento = ?, id_campeonato_pai = ? WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$nome, $id_esporte, $data_inicio, $tipo_chaveamento, $id_campeonato_pai, $id_campeonato]);        echo json_encode(['status' => 'success', 'message' => 'Campeonato atualizado com sucesso!'], JSON_UNESCAPED_UNICODE);
    } else {
        // Insert
        $sql = "INSERT INTO campeonatos (nome, id_esporte, data_inicio, tipo_chaveamento, id_campeonato_pai) VALUES (?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$nome, $id_esporte, $data_inicio, $tipo_chaveamento, $id_campeonato_pai]);
        echo json_encode(['status' => 'success', 'message' => 'Campeonato criado com sucesso!', 'id' => $pdo->lastInsertId()], JSON_UNESCAPED_UNICODE);
    }
} catch (PDOException $e) {
    error_log('Erro criar_campeonato_admin.php: ' . $e->getMessage());
    echo json_encode(['status' => 'error', 'errors' => ['Erro no banco de dados.']], JSON_UNESCAPED_UNICODE);
}
