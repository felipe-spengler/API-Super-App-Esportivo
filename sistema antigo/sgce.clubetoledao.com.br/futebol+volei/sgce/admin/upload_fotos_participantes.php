<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

header('Content-Type: application/json');

// Verificar participante_id
if (!isset($_GET['participante_id']) || !is_numeric($_GET['participante_id'])) {
    echo json_encode(['success' => false, 'message' => 'Parâmetro participante_id inválido ou não informado.']);
    exit();
}
$participante_id = (int) $_GET['participante_id'];

// Verificar se o participante existe
$stmt = $pdo->prepare("SELECT id FROM participantes WHERE id = ?");
$stmt->execute([$participante_id]);
if (!$stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Participante não encontrado.']);
    exit();
}

// Verificar se há arquivo enviado
if (empty($_FILES['fotos']) || $_FILES['fotos']['error'] === UPLOAD_ERR_NO_FILE) {
    echo json_encode(['success' => false, 'message' => 'Nenhuma foto foi enviada.']);
    exit();
}

// Configurações de upload
$uploadDir = '../Uploads/participantes/' . $participante_id . '/';
$maxFileSize = 5 * 1024 * 1024; // 5MB
$tiposPermitidos = ['image/png', 'image/jpeg'];

// Criar diretório se não existir
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        echo json_encode(['success' => false, 'message' => 'Falha ao criar diretório de upload.']);
        exit();
    }
}

// Validar arquivo
$arquivo = $_FILES['fotos'];
$nomeOriginal = basename($arquivo['name']);
$tipo = $arquivo['type'];
$tamanho = $arquivo['size'];
$erro = $arquivo['error'];

if ($erro !== UPLOAD_ERR_OK) {
    $mensagensErro = [
        UPLOAD_ERR_INI_SIZE => 'O arquivo excede o tamanho máximo permitido pelo servidor.',
        UPLOAD_ERR_FORM_SIZE => 'O arquivo excede o tamanho máximo permitido pelo formulário.',
        UPLOAD_ERR_PARTIAL => 'O arquivo foi enviado parcialmente.',
        UPLOAD_ERR_NO_TMP_DIR => 'Diretório temporário não encontrado.',
        UPLOAD_ERR_CANT_WRITE => 'Falha ao escrever o arquivo no disco.',
        UPLOAD_ERR_EXTENSION => 'Uma extensão PHP interrompeu o upload.'
    ];
    $mensagem = $mensagensErro[$erro] ?? 'Erro desconhecido ao enviar o arquivo.';
    echo json_encode(['success' => false, 'message' => $mensagem]);
    exit();
}

if (!in_array($tipo, $tiposPermitidos)) {
    echo json_encode(['success' => false, 'message' => "Tipo de arquivo não permitido: $nomeOriginal. Use PNG ou JPEG."]);
    exit();
}

if ($tamanho > $maxFileSize) {
    echo json_encode(['success' => false, 'message' => "Arquivo muito grande: $nomeOriginal. Tamanho máximo é 5MB."]);
    exit();
}

// Gerar nome único para o arquivo
$ext = strtolower(pathinfo($nomeOriginal, PATHINFO_EXTENSION));
$novoNome = uniqid('foto_') . '.' . $ext;
$destino = $uploadDir . $novoNome;

if (move_uploaded_file($arquivo['tmp_name'], $destino)) {
    // Salvar no banco
    $sql = "INSERT INTO fotos_participantes (participante_id, src) VALUES (:participante_id, :src)";
    $stmt = $pdo->prepare($sql);
    $srcRelativo = "Uploads/participantes/$participante_id/$novoNome";
    try {
        $stmt->execute([
            ':participante_id' => $participante_id,
            ':src' => $srcRelativo,
        ]);
        $foto_id = $pdo->lastInsertId();
        echo json_encode([
            'success' => true,
            'message' => 'Foto enviada com sucesso.',
            'foto_id' => $foto_id,
            'foto_src' => $srcRelativo
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Erro ao salvar no banco de dados: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => "Falha ao mover o arquivo $nomeOriginal para o servidor."]);
}
exit();
?>