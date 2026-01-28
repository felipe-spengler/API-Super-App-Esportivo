<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// Define que a resposta será em JSON
header('Content-Type: application/json');

// Validação dos dados recebidos
$erros = [];
$id = $_POST['id'] ?? null;
$id_equipe = $_POST['id_equipe'] ?? null;
$nome_completo = trim($_POST['nome_completo'] ?? '');
$apelido = trim($_POST['apelido'] ?? '');
$posicao = trim($_POST['posicao'] ?? '');
$numero_camisa = trim($_POST['numero_camisa'] ?? '');
$data_nascimento = trim($_POST['data_nascimento'] ?? '');

if (empty($nome_completo)) {
    $erros[] = 'O nome completo é obrigatório.';
}
if (empty($id_equipe)) {
    $erros[] = 'A equipe não foi identificada.';
}

// Pasta para salvar as fotos
$uploadDirBase = '../Uploads/participantes/';
$tiposPermitidos = ['image/png', 'image/jpeg'];

// Função para processar upload de um arquivo
function processarUpload($file, $uploadDir, $participante_id, $tipo, &$erros) {
    global $tiposPermitidos;
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $erros[] = "Erro ao enviar arquivo $tipo.";
        return null;
    }

    if (!in_array($file['type'], $tiposPermitidos)) {
        $erros[] = "Tipo de arquivo não permitido para $tipo.";
        return null;
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $novoNome = uniqid("doc_{$tipo}_") . '.' . $ext;
    $destino = $uploadDir . $novoNome;

    if (move_uploaded_file($file['tmp_name'], $destino)) {
        return 'Uploads/participantes/' . $participante_id . '/' . $novoNome;
    } else {
        $erros[] = "Falha ao mover arquivo $tipo.";
        return null;
    }
}

// Processar uploads de documentos
$foto_frente_path = null;
$foto_verso_path = null;

if (!empty($id)) {
    // Para edição, buscar caminhos existentes
    $stmt = $pdo->prepare("SELECT foto_documento_frente, foto_documento_verso FROM participantes WHERE id = ?");
    $stmt->execute([$id]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    $foto_frente_path = $existing['foto_documento_frente'] ?? null;
    $foto_verso_path = $existing['foto_documento_verso'] ?? null;
}

// Criar diretório para o participante
if (!empty($id_equipe) && (empty($id) || !empty($_FILES['foto_documento_frente']) || !empty($_FILES['foto_documento_verso']))) {
    $participante_id = $id ?? $pdo->lastInsertId(); // Será atualizado após INSERT
    $uploadDir = $uploadDirBase . $participante_id . '/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
}

// Processar foto_documento_frente
if (!empty($_FILES['foto_documento_frente']['name'])) {
    $foto_frente_path = processarUpload($_FILES['foto_documento_frente'], $uploadDir, $participante_id, 'frente', $erros);
    // Excluir arquivo antigo se existir (para edição)
    if (!empty($id) && $foto_frente_path && !empty($existing['foto_documento_frente'])) {
        $old_file = __DIR__ . '/../../' . $existing['foto_documento_frente'];
        if (file_exists($old_file)) {
            unlink($old_file);
        }
    }
}

// Processar foto_documento_verso
if (!empty($_FILES['foto_documento_verso']['name'])) {
    $foto_verso_path = processarUpload($_FILES['foto_documento_verso'], $uploadDir, $participante_id, 'verso', $erros);
    // Excluir arquivo antigo se existir (para edição)
    if (!empty($id) && $foto_verso_path && !empty($existing['foto_documento_verso'])) {
        $old_file = __DIR__ . '/../../' . $existing['foto_documento_verso'];
        if (file_exists($old_file)) {
            unlink($old_file);
        }
    }
}

// Se houver erros, retorna a resposta em JSON e para a execução
if (!empty($erros)) {
    echo json_encode(['status' => 'error', 'errors' => $erros]);
    exit();
}

try {
    // Decide se é uma operação de INSERT (novo) ou UPDATE (edição)
    if (empty($id)) {
        // INSERT
        $sql = "INSERT INTO participantes (id_equipe, nome_completo, apelido, posicao, numero_camisa, data_nascimento, foto_documento_frente, foto_documento_verso) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id_equipe, $nome_completo, $apelido, $posicao, $numero_camisa, empty($data_nascimento) ? null : $data_nascimento, $foto_frente_path, $foto_verso_path]);
        $participante_id = $pdo->lastInsertId();
        // Atualizar diretório com o ID correto
        if ($foto_frente_path || $foto_verso_path) {
            $newUploadDir = $uploadDirBase . $participante_id . '/';
            if (!is_dir($newUploadDir)) {
                mkdir($newUploadDir, 0755, true);
            }
            // Mover arquivos para o diretório com o ID correto
            if ($foto_frente_path) {
                $old_path = __DIR__ . '/../../' . $foto_frente_path;
                $new_path = $newUploadDir . basename($foto_frente_path);
                if (rename($old_path, $new_path)) {
                    $foto_frente_path = 'Uploads/participantes/' . $participante_id . '/' . basename($foto_frente_path);
                    $pdo->prepare("UPDATE participantes SET foto_documento_frente = ? WHERE id = ?")->execute([$foto_frente_path, $participante_id]);
                }
            }
            if ($foto_verso_path) {
                $old_path = __DIR__ . '/../../' . $foto_verso_path;
                $new_path = $newUploadDir . basename($foto_verso_path);
                if (rename($old_path, $new_path)) {
                    $foto_verso_path = 'Uploads/participantes/' . $participante_id . '/' . basename($foto_verso_path);
                    $pdo->prepare("UPDATE participantes SET foto_documento_verso = ? WHERE id = ?")->execute([$foto_verso_path, $participante_id]);
                }
            }
        }
        $message = 'Participante adicionado com sucesso!';
    } else {
        // UPDATE
        $sql = "UPDATE participantes SET nome_completo = ?, apelido = ?, posicao = ?, numero_camisa = ?, data_nascimento = ?, foto_documento_frente = ?, foto_documento_verso = ? WHERE id = ? AND id_equipe = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$nome_completo, $apelido, $posicao, $numero_camisa, empty($data_nascimento) ? null : $data_nascimento, $foto_frente_path, $foto_verso_path, $id, $id_equipe]);
        $message = 'Participante atualizado com sucesso!';
    }
    
    // Se chegou até aqui, deu certo
    echo json_encode(['status' => 'success', 'message' => $message]);

} catch (PDOException $e) {
    // Em caso de erro no banco de dados
    echo json_encode(['status' => 'error', 'errors' => ['Erro no banco de dados: ' . $e->getMessage()]]);
}
?>