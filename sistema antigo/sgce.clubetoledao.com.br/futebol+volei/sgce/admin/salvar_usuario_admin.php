<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

header('Content-Type: application/json');

$erros = [];
$id = $_POST['id'] ?? null;
$nome = trim($_POST['nome'] ?? '');
$email = trim($_POST['email'] ?? '');
$senha = $_POST['senha'] ?? '';
$tipo = $_POST['tipo'] ?? '';

if (empty($nome)) $erros[] = 'O nome é obrigatório.';
if (empty($email)) {
    $erros[] = 'O email é obrigatório.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $erros[] = 'O formato do email é inválido.';
}
if (empty($tipo) || !in_array($tipo, ['admin', 'lider_equipe'])) {
    $erros[] = 'O tipo de usuário é inválido.';
}

// Validação de email duplicado
$sql_email = "SELECT id FROM usuarios WHERE email = ? AND id != ?";
$stmt_email = $pdo->prepare($sql_email);
$stmt_email->execute([$email, $id ?? 0]);
if ($stmt_email->fetch()) {
    $erros[] = 'Este email já está em uso por outro usuário.';
}

// Validação de senha
if (empty($id) && empty($senha)) { // Se é um novo usuário, senha é obrigatória
    $erros[] = 'A senha é obrigatória para novos usuários.';
}

if (!empty($erros)) {
    echo json_encode(['status' => 'error', 'errors' => $erros]);
    exit();
}

try {
    if (empty($id)) { // INSERT
        $sql = "INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)";
        $senha_hash = password_hash($senha, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$nome, $email, $senha_hash, $tipo]);
        $message = 'Usuário criado com sucesso!';
    } else { // UPDATE
        if (!empty($senha)) {
            $sql = "UPDATE usuarios SET nome = ?, email = ?, senha = ?, tipo = ? WHERE id = ?";
            $senha_hash = password_hash($senha, PASSWORD_DEFAULT);
            $params = [$nome, $email, $senha_hash, $tipo, $id];
        } else {
            $sql = "UPDATE usuarios SET nome = ?, email = ?, tipo = ? WHERE id = ?";
            $params = [$nome, $email, $tipo, $id];
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $message = 'Usuário atualizado com sucesso!';
    }
    echo json_encode(['status' => 'success', 'message' => $message]);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'errors' => ['Erro no banco de dados.']]);
}
?>