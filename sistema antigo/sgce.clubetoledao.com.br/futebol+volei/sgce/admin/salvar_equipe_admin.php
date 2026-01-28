<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

header('Content-Type: application/json');

$erros = [];
$nome = trim($_POST['nome'] ?? '');
$sigla = trim($_POST['sigla'] ?? '');
$cidade = trim($_POST['cidade'] ?? '');
$id_lider = filter_var($_POST['id_lider'] ?? '', FILTER_VALIDATE_INT);
$id_esporte = filter_var($_POST['id_esporte'] ?? '', FILTER_VALIDATE_INT);
$id_campeonato = filter_var($_POST['id_campeonato'] ?? '', FILTER_VALIDATE_INT);

// Validate required fields
if (empty($nome)) $erros[] = 'O nome da equipe é obrigatório.';
if (empty($sigla)) $erros[] = 'A sigla é obrigatória.';
if (empty($cidade)) $erros[] = 'A cidade é obrigatória.';
if (empty($id_lider)) $erros[] = 'É obrigatório selecionar um líder.';
if (empty($id_esporte)) $erros[] = 'É obrigatório selecionar um esporte.';
if (empty($id_campeonato)) $erros[] = 'O campeonato é obrigatório.';

// Validate that the leader is not already assigned to another team (uncomment if needed)
/*
if (!empty($id_lider)) {
    $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM equipes WHERE id_lider = ?");
    $stmt_check->execute([$id_lider]);
    if ($stmt_check->fetchColumn() > 0) {
        $erros[] = 'O usuário selecionado já é líder de outra equipe.';
    }
}
*/

// Handle file upload (brasao)
$brasao = null;
if (!empty($_FILES['brasao']['name'])) {
    $uploadDir = '../public/brasoes/';
    $fileName = uniqid() . '-' . basename($_FILES['brasao']['name']);
    $uploadFile = $uploadDir . $fileName;

    // Validate file type and size
    $fileType = strtolower(pathinfo($uploadFile, PATHINFO_EXTENSION));
    $allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];
    if (!in_array($fileType, $allowedTypes)) {
        $erros[] = 'Apenas arquivos JPG, JPEG, PNG ou GIF são permitidos.';
    } elseif ($_FILES['brasao']['size'] > 5000000) { // 5MB limit
        $erros[] = 'O arquivo é muito grande. Máximo 5MB.';
    } else {
        if (!move_uploaded_file($_FILES['brasao']['tmp_name'], $uploadFile)) {
            $erros[] = 'Erro ao fazer upload do brasão.';
        } else {
            $brasao = $fileName;
        }
    }
}

if (!empty($erros)) {
    echo json_encode(['status' => 'error', 'errors' => $erros]);
    exit();
}

try {
    // Start transaction
    $pdo->beginTransaction();

    // Insert team into equipes table
    $sql = "INSERT INTO equipes (nome, sigla, cidade, id_lider, id_esporte, brasao) VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$nome, $sigla, $cidade, $id_lider, $id_esporte, $brasao]);

    // Get the inserted team ID
    $id_equipe = $pdo->lastInsertId();

    // Insert relationship into campeonatos_equipes table
    $sql = "INSERT INTO campeonatos_equipes (id_campeonato, id_equipe) VALUES (?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$id_campeonato, $id_equipe]);

    // Commit transaction
    $pdo->commit();

    echo json_encode(['status' => 'success', 'message' => 'Equipe criada com sucesso!']);
} catch (PDOException $e) {
    // Rollback transaction on error
    $pdo->rollBack();
    error_log("Database Error: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'errors' => ['Erro no banco de dados: ' . $e->getMessage()]]);
}
?>