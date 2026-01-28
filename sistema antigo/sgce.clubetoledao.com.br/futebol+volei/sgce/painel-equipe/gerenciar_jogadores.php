<?php
// /painel-equipe/gerenciar_jogadores.php
ini_set('display_errors', 0); // Disable error display in production
ini_set('log_errors', 1);
ini_set('error_log', '../logs/php_errors.log'); // Log errors to a file
error_reporting(E_ALL);

require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php';

// Verifica se o usuário está logado
$id_usuario = $_SESSION['user_id'] ?? null;
if (!$id_usuario) {
    header("Location: ../login.php");
    exit();
}

// Verifica se a conexão com o banco de dados está ativa
if (!isset($pdo) || !$pdo) {
    error_log("Erro: Conexão com o banco de dados não está definida.");
    http_response_code(500);
    exit("Erro interno do servidor. Por favor, tente novamente mais tarde.");
}

// Busca todas as equipes do líder para popular o select
try {
    $stmt_equipes = $pdo->prepare("SELECT id, nome FROM equipes WHERE id_lider = ? ORDER BY nome");
    $stmt_equipes->execute([$id_usuario]);
    $equipes_do_lider = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    error_log("Erro ao buscar equipes: " . $e->getMessage());
    http_response_code(500);
    exit("Erro interno ao buscar equipes.");
}

// Variável para notificações
$notificacao = null;

// Lógica para adicionar ou editar participante
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['salvar_participante'])) {
    $id = $_POST['id'] ?? null;
    $id_equipe = $_POST['id_equipe'] ?? null;
    $nome = $_POST['nome_completo'] ?? '';
    $apelido = $_POST['apelido'] ?? '';
    $posicao = $_POST['posicao'] ?? '';
    $numero_camisa = $_POST['numero_camisa'] ?? null;
    $data_nascimento = $_POST['data_nascimento'] ?? null;

    // Validação
    $erros = [];
    if (empty($id_equipe) || !is_numeric($id_equipe)) $erros[] = 'Selecione uma equipe válida.';
    if (empty($nome)) $erros[] = 'O campo Nome Completo é obrigatório.';
    if (empty($data_nascimento)) $erros[] = 'O campo Data de Nascimento é obrigatório.';

    // Verifica se a equipe pertence ao líder
    if (empty($erros)) {
        try {
            $stmt_lider = $pdo->prepare("SELECT id FROM equipes WHERE id = ? AND id_lider = ?");
            $stmt_lider->execute([$id_equipe, $id_usuario]);
            if (!$stmt_lider->fetch()) {
                $erros[] = 'Você não tem permissão para adicionar/editar participantes nesta equipe.';
            }
        } catch (PDOException $e) {
            error_log("Erro ao verificar permissão de equipe: " . $e->getMessage());
            $erros[] = 'Erro ao verificar permissão de equipe.';
        }
    }

    if (empty($erros)) {
        try {
            $pdo->beginTransaction();

            $current_id = null;
            if ($id) {
                // Atualizar participante existente
                $sql = "UPDATE participantes SET id_equipe = ?, nome_completo = ?, apelido = ?, posicao = ?, numero_camisa = ?, data_nascimento = ? WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$id_equipe, $nome, $apelido, $posicao, $numero_camisa, $data_nascimento, $id]);
                $current_id = $id;
                $notificacao = ['tipo' => 'success', 'mensagem' => 'Participante atualizado com sucesso!'];
            } else {
                // Adicionar novo participante
                $sql = "INSERT INTO participantes (id_equipe, nome_completo, apelido, posicao, numero_camisa, data_nascimento) VALUES (?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$id_equipe, $nome, $apelido, $posicao, $numero_camisa, $data_nascimento]);
                $current_id = $pdo->lastInsertId();
                $notificacao = ['tipo' => 'success', 'mensagem' => 'Participante adicionado com sucesso!'];
            }

            // Lógica para upload de fotos de documento
            $pastaUpload = '../public/documentos/';
            if (!is_dir($pastaUpload) || !is_writable($pastaUpload)) {
                error_log("Erro: Diretório $pastaUpload não existe ou não é gravável.");
                throw new Exception("Diretório de upload de documentos indisponível.");
            }

            $foto_frente = null;
            $foto_verso = null;

            if (isset($_FILES['foto_documento_frente']) && $_FILES['foto_documento_frente']['error'] === UPLOAD_ERR_OK) {
                $extensao = pathinfo($_FILES['foto_documento_frente']['name'], PATHINFO_EXTENSION);
                $novoNomeArquivo = 'doc_frente_' . time() . '_' . $current_id . '.' . $extensao;
                $caminhoCompleto = $pastaUpload . $novoNomeArquivo;
                if (move_uploaded_file($_FILES['foto_documento_frente']['tmp_name'], $caminhoCompleto)) {
                    $foto_frente = $novoNomeArquivo;
                } else {
                    error_log("Erro ao mover arquivo de foto_documento_frente para $caminhoCompleto.");
                    throw new Exception("Falha ao mover o arquivo de documento (frente).");
                }
            }

            if (isset($_FILES['foto_documento_verso']) && $_FILES['foto_documento_verso']['error'] === UPLOAD_ERR_OK) {
                $extensao = pathinfo($_FILES['foto_documento_verso']['name'], PATHINFO_EXTENSION);
                $novoNomeArquivo = 'doc_verso_' . time() . '_' . $current_id . '.' . $extensao;
                $caminhoCompleto = $pastaUpload . $novoNomeArquivo;
                if (move_uploaded_file($_FILES['foto_documento_verso']['tmp_name'], $caminhoCompleto)) {
                    $foto_verso = $novoNomeArquivo;
                } else {
                    error_log("Erro ao mover arquivo de foto_documento_verso para $caminhoCompleto.");
                    throw new Exception("Falha ao mover o arquivo de documento (verso).");
                }
            }

            if ($foto_frente || $foto_verso) {
                $sql_fotos = "UPDATE participantes SET foto_documento_frente = ?, foto_documento_verso = ? WHERE id = ?";
                $stmt_fotos = $pdo->prepare($sql_fotos);
                $stmt_fotos->execute([$foto_frente, $foto_verso, $current_id]);
            }

            $pdo->commit();
        } catch (Exception $e) {
            $pdo->rollBack();
            $notificacao = ['tipo' => 'error', 'mensagem' => 'Erro ao salvar o participante. Detalhes: ' . $e->getMessage()];
            error_log("Erro ao salvar participante: " . $e->getMessage());
        }
    } else {
        $notificacao = ['tipo' => 'error', 'mensagem' => implode('<br>', $erros)];
    }
    $_SESSION['notificacao'] = $notificacao;
    header("Location: gerenciar_jogadores.php");
    exit();
}

// Lógica para excluir participante
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['excluir_jogador'])) {
    $id_participante = $_POST['id_participante'] ?? null;

    if (!$id_participante || !is_numeric($id_participante)) {
        $notificacao = ['tipo' => 'error', 'mensagem' => 'ID do participante inválido.'];
        $_SESSION['notificacao'] = $notificacao;
        header("Location: gerenciar_jogadores.php");
        exit();
    }

    // Verifica se o participante existe e pertence a uma equipe do líder
    try {
        $stmt_part = $pdo->prepare("SELECT id_equipe FROM participantes WHERE id = ?");
        $stmt_part->execute([$id_participante]);
        $row = $stmt_part->fetch();
        if (!$row) {
            $notificacao = ['tipo' => 'error', 'mensagem' => 'Participante não encontrado.'];
            $_SESSION['notificacao'] = $notificacao;
            header("Location: gerenciar_jogadores.php");
            exit();
        }
        $id_equipe = $row['id_equipe'];

        $stmt_lider = $pdo->prepare("SELECT id FROM equipes WHERE id = ? AND id_lider = ?");
        $stmt_lider->execute([$id_equipe, $id_usuario]);
        if (!$stmt_lider->fetch()) {
            $notificacao = ['tipo' => 'error', 'mensagem' => 'Você não tem permissão para excluir este participante.'];
            $_SESSION['notificacao'] = $notificacao;
            header("Location: gerenciar_jogadores.php");
            exit();
        }

        // Verifica se o participante possui eventos em sumulas_eventos
        $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM sumulas_eventos WHERE id_participante = ?");
        $stmt_check->execute([$id_participante]);
        $eventos_count = $stmt_check->fetchColumn();

        if ($eventos_count > 0) {
            $notificacao = [
                'tipo' => 'error',
                'mensagem' => 'Este participante não pode ser excluído, pois possui registros em súmulas.'
            ];
        } else {
            $pdo->beginTransaction();

            // Exclui fotos associadas ao participante
            $stmt_delete_fotos = $pdo->prepare("DELETE FROM fotos_participantes WHERE participante_id = ?");
            $stmt_delete_fotos->execute([$id_participante]);

            // Exclui fotos de documento, se existirem
            $stmt_select_fotos = $pdo->prepare("SELECT foto_documento_frente, foto_documento_verso FROM participantes WHERE id = ?");
            $stmt_select_fotos->execute([$id_participante]);
            $fotos = $stmt_select_fotos->fetch();
            $pastaUpload = '../public/documentos/';
            if ($fotos && $fotos['foto_documento_frente'] && file_exists($pastaUpload . $fotos['foto_documento_frente'])) {
                unlink($pastaUpload . $fotos['foto_documento_frente']);
            }
            if ($fotos && $fotos['foto_documento_verso'] && file_exists($pastaUpload . $fotos['foto_documento_verso'])) {
                unlink($pastaUpload . $fotos['foto_documento_verso']);
            }

            // Exclui o participante
            $stmt_delete = $pdo->prepare("DELETE FROM participantes WHERE id = ?");
            $stmt_delete->execute([$id_participante]);

            $pdo->commit();
            $notificacao = ['tipo' => 'success', 'mensagem' => 'Participante excluído com sucesso!'];
        }
    } catch (PDOException $e) {
        $pdo->rollBack();
        $notificacao = ['tipo' => 'error', 'mensagem' => 'Erro ao excluir o participante. Detalhes: ' . $e->getMessage()];
        error_log("Erro ao excluir participante: " . $e->getMessage());
    }
    $_SESSION['notificacao'] = $notificacao;
    header("Location: gerenciar_jogadores.php");
    exit();
}

// Busca todos os participantes das equipes do líder
try {
    $stmt = $pdo->prepare("
        SELECT p.id, 
               p.nome_completo, 
               p.apelido, 
               p.posicao, 
               p.numero_camisa, 
               p.data_nascimento, 
               p.foto_documento_frente, 
               p.foto_documento_verso, 
               p.id_equipe,
               e.nome AS equipe_nome,
               (SELECT GROUP_CONCAT(JSON_OBJECT('id', fp.id, 'src', fp.src))
                FROM fotos_participantes fp 
                WHERE fp.participante_id = p.id) AS fotos
        FROM participantes p 
        INNER JOIN equipes e ON p.id_equipe = e.id
        WHERE e.id_lider = ?
        ORDER BY p.nome_completo ASC
    ");
    $stmt->execute([$id_usuario]);
    $participantes = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Processar fotos para formato JSON
    foreach ($participantes as &$participante) {
        $participante['fotos'] = $participante['fotos'] ? json_decode('[' . $participante['fotos'] . ']', true) : [];
    }
} catch (PDOException $e) {
    error_log("Erro ao buscar participantes: " . $e->getMessage());
    http_response_code(500);
    exit("Erro interno ao buscar participantes.");
}

require_once '../includes/header.php';
require_once 'sidebar_equipe.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-users-cog fa-fw me-2"></i>Gerenciar Jogadores</h1>
    <button type="button" class="btn btn-success btn-sm" id="btnAdicionarParticipante">
        <i class="fas fa-plus me-2"></i>Adicionar Novo Participante
    </button>
</div>

<!-- Modal para Adicionar/Editar Participante -->
<div class="modal fade" id="modalParticipante" tabindex="-1" aria-labelledby="modalParticipanteLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalParticipanteLabel">Adicionar Participante</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formParticipante" enctype="multipart/form-data">
                    <input type="hidden" name="id" id="participante_id">
                    <input type="hidden" name="salvar_participante" value="1">
                    <div class="mb-3">
                        <label for="id_equipe" class="form-label">Equipe</label>
                        <select class="form-control" id="id_equipe" name="id_equipe" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($equipes_do_lider as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="nome_completo" class="form-label">Nome Completo</label>
                        <input type="text" class="form-control" id="nome_completo" name="nome_completo" required>
                    </div>
                    <div class="mb-3">
                        <label for="apelido" class="form-label">Apelido</label>
                        <input type="text" class="form-control" id="apelido" name="apelido">
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label for="posicao" class="form-label">Posição</label>
                            <input type="text" class="form-control" id="posicao" name="posicao">
                        </div>
                        <div class="col-md-6 mb-3">
                            <label for="numero_camisa" class="form-label">Número da Camisa</label>
                            <input type="number" class="form-control" id="numero_camisa" name="numero_camisa">
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="data_nascimento" class="form-label">Data de Nascimento</label>
                        <div class="input-group">
                            <input type="date" class="form-control" id="data_nascimento" name="data_nascimento">
                            <span class="input-group-text" id="idade_label">Idade: -- anos</span>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="foto_documento_frente" class="form-label">Foto Documento (Frente)</label>
                        <input type="file" class="form-control" id="foto_documento_frente" name="foto_documento_frente" accept="image/png, image/jpeg">
                        <div id="foto_documento_frente_preview" style="margin-top: 10px;"></div>
                    </div>
                    <div class="mb-3">
                        <label for="foto_documento_verso" class="form-label">Foto Documento (Verso)</label>
                        <input type="file" class="form-control" id="foto_documento_verso" name="foto_documento_verso" accept="image/png, image/jpeg">
                        <div id="foto_documento_verso_preview" style="margin-top: 10px;"></div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btnSalvarParticipante" form="formParticipante">Salvar</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal para Gerenciar Fotos -->
<div class="modal fade" id="modalFotos" tabindex="-1" aria-labelledby="modalFotosLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalFotosLabel">Fotos do Participante</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formFotos">
                    <input type="hidden" name="id" id="fotos_participante_id">
                    <input type="file" id="foto" name="foto" accept="image/png, image/jpeg" multiple style="display:none">
                    <div id="btnFoto" class="btn btn-primary">
                        <i class="fas fa-image"></i> Adicionar Fotos
                    </div>
                    <br>
                    <div id="lista_Fotos" class="mt-3"></div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btnSalvarFotos" form="formFotos">Salvar</button>
            </div>
        </div>
    </div>
</div>



<div class="card">
    <div class="card-header"><i class="fas fa-list me-1"></i> Participantes Cadastrados</div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-hover">
                <thead><tr><th>Nome</th><th>Apelido</th><th>Equipe</th><th>Posição</th><th>Nascimento</th><th>Camisa</th><th>Ações</th></tr></thead>
                    <tbody id="tabela-participantes-body">
                    <?php
                        if (count($participantes) > 0) {
                            echo implode('', array_map(function ($participante) {
                                return '<tr>' .
                                    '<td><strong>' . htmlspecialchars($participante['nome_completo']) . '</strong></td>' .
                                    '<td><strong>' . htmlspecialchars($participante['apelido'] ?? '') . '</strong></td>' .
                                    '<td><strong>' . htmlspecialchars($participante['equipe_nome']) . '</strong></td>' .
                                    '<td>' . htmlspecialchars($participante['posicao'] ?? 'N/A') . '</td>' .
                                    '<td>' . date('d/m/Y', strtotime($participante['data_nascimento'] ?? 'now')) . '</td>' .
                                    '<td>' . htmlspecialchars($participante['numero_camisa'] ?? '') . '</td>' .
                                    '<td>' .
                                        '<button class="btn btn-warning btn-sm btn-editar-participante" data-participante=\'' . htmlspecialchars(json_encode($participante)) . '\' title="Editar"><i class="fas fa-pencil-alt"></i></button>' .
                                        '<button class="btn btn-primary btn-sm btn-editar-fotos" data-participante=\'' . htmlspecialchars(json_encode($participante)) . '\' title="Fotos"><i class="fas fa-image"></i></button>' .
                                        '<button class="btn btn-danger btn-sm btn-excluir-participante" data-id-participante="' . $participante['id'] . '" data-nome-participante="' . htmlspecialchars($participante['nome_completo']) . '" title="Excluir"><i class="fas fa-trash-alt"></i></button>' .
                                    '</td>' .
                                    '</tr>';
                            }, $participantes));
                        } else {
                            echo '<tr><td colspan="7">Nenhum participante encontrado.</td></tr>';
                        }
                        ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php
// Exibir notificações
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
if (isset($_SESSION['notificacao'])) {
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
}
if ($notificacao): ?>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            icon: '<?= htmlspecialchars($notificacao['tipo']) ?>',
            title: '<?= addslashes($notificacao['mensagem']) ?>'
        });
    });
</script>
<?php endif; ?>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const modalParticipanteEl = document.getElementById('modalParticipante');
    const modalParticipante = new bootstrap.Modal(modalParticipanteEl);
    const modalFotosEl = document.getElementById('modalFotos');
    const modalFotos = new bootstrap.Modal(modalFotosEl);
    const modalParticipanteLabel = document.getElementById('modalParticipanteLabel');
    const modalFotosLabel = document.getElementById('modalFotosLabel');
    const btnSalvarParticipante = document.getElementById('btnSalvarParticipante');
    const btnSalvarFotos = document.getElementById('btnSalvarFotos');
    const formParticipante = document.getElementById('formParticipante');
    const formFotos = document.getElementById('formFotos');
    const inputFile = document.getElementById('foto');
    const listaFotos = document.getElementById('lista_Fotos');
    const corpoTabela = document.getElementById('tabela-participantes-body');
    let arquivosSelecionados = [];
    let fotosExistentes = [];

    // Função para calcular idade
    function calcularIdade(dataNascimento) {
        if (!dataNascimento) return '--';
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const mes = hoje.getMonth() - nascimento.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        return idade;
    }

    // Atualizar idade no modal
    document.getElementById('data_nascimento').addEventListener('change', (e) => {
        const idade = calcularIdade(e.target.value);
        document.getElementById('idade_label').textContent = `Idade: ${idade} anos`;
    });

    // Função para resetar formulário de participante
    const resetFormParticipante = () => {
        formParticipante.reset();
        document.getElementById('participante_id').value = '';
        document.getElementById('id_equipe').value = '';
        document.getElementById('idade_label').textContent = 'Idade: -- anos';
        document.getElementById('foto_documento_frente_preview').innerHTML = '';
        document.getElementById('foto_documento_verso_preview').innerHTML = '';
    };

    // Função para exibir miniatura com ícone de download
    function exibirMiniaturaComDownload(previewId, filePath) {
        const preview = document.getElementById(previewId);
        preview.innerHTML = '';
        if (filePath) {
            const div = document.createElement('div');
            div.style.marginTop = '10px';
            div.style.textAlign = 'center';

            const img = document.createElement('img');
            img.style.maxWidth = '100px';
            img.style.borderRadius = '5px';
            img.style.border = '1px solid #ccc';
            img.src = `/sgce/${filePath}`;

            const downloadLink = document.createElement('a');
            downloadLink.href = `/sgce/${filePath}`;
            downloadLink.download = filePath;
            downloadLink.style.display = 'block';
            downloadLink.style.marginTop = '5px';
            downloadLink.title = 'Baixar documento';
            const downloadIcon = document.createElement('i');
            downloadIcon.className = 'fas fa-download';
            downloadLink.appendChild(downloadIcon);

            div.appendChild(img);
            div.appendChild(downloadLink);
            preview.appendChild(div);
        }
    }

    document.getElementById('foto_documento_frente').addEventListener('change', (e) => {
        const preview = document.getElementById('foto_documento_frente_preview');
        preview.innerHTML = '';
        if (e.target.files[0]) {
            const img = document.createElement('img');
            img.style.maxWidth = '100px';
            img.style.marginTop = '10px';
            const reader = new FileReader();
            reader.onload = (ev) => {
                img.src = ev.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
            preview.appendChild(img);
        }
    });

    document.getElementById('foto_documento_verso').addEventListener('change', (e) => {
        const preview = document.getElementById('foto_documento_verso_preview');
        preview.innerHTML = '';
        if (e.target.files[0]) {
            const img = document.createElement('img');
            img.style.maxWidth = '100px';
            img.style.marginTop = '10px';
            const reader = new FileReader();
            reader.onload = (ev) => {
                img.src = ev.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
            preview.appendChild(img);
        }
    });

    inputFile.addEventListener('change', () => {
        const maxFileSize = 5 * 1024 * 1024;
        const tiposPermitidos = ['image/png', 'image/jpeg'];

        for (const file of inputFile.files) {
            if (!tiposPermitidos.includes(file.type)) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Tipo de arquivo inválido',
                    text: `O arquivo ${file.name} não é PNG ou JPEG.`,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                continue;
            }
            if (file.size > maxFileSize) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Arquivo muito grande',
                    text: `O arquivo ${file.name} excede o limite de 5MB.`,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                continue;
            }
            if (!arquivosSelecionados.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) {
                arquivosSelecionados.push(file);
            }
        }
        atualizarListaFotosComId(fotosExistentes, arquivosSelecionados);
        atualizarInputFiles();
    });

    function atualizarListaFotosComId(fotosExistentes = [], fotosNovas = []) {
        listaFotos.innerHTML = '';
        fotosExistentes.forEach((foto) => {
            const fotoDiv = document.createElement('span');
            fotoDiv.style.position = 'relative';
            fotoDiv.style.display = 'inline-block';
            fotoDiv.style.margin = '5px';

            const img = document.createElement('img');
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '5px';
            img.style.border = '1px solid #ccc';
            img.title = `ID: ${foto.id}`;
            img.src = `/sgce/${foto.src}`;

            const inputId = document.createElement('input');
            inputId.type = 'hidden';
            inputId.name = 'foto_ids[]';
            inputId.value = foto.id;

            const btnExcluir = document.createElement('i');
            btnExcluir.className = 'fas fa-times';
            btnExcluir.style.position = 'absolute';
            btnExcluir.style.top = '2px';
            btnExcluir.style.right = '2px';
            btnExcluir.style.color = 'red';
            btnExcluir.style.cursor = 'pointer';
            btnExcluir.style.background = 'white';
            btnExcluir.style.borderRadius = '50%';
            btnExcluir.style.padding = '2px 5px';
            btnExcluir.title = 'Remover imagem';

            btnExcluir.addEventListener('click', () => {
                Swal.fire({
                    title: 'Tem certeza?',
                    text: 'Deseja excluir esta foto?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Sim, excluir!',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        fetch(`/sgce/painel-equipe/excluir_fotos_participantes.php?id=${foto.id}`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' }
                        })
                        .then(response => {
                            if (!response.ok) throw new Error('Erro ao excluir foto');
                            return response.json();
                        })
                        .then(data => {
                            if (data.success) {
                                fotoDiv.remove();
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Foto excluída com sucesso',
                                    toast: true,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 2000
                                });
                            } else {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Erro ao excluir foto',
                                    text: data.message,
                                    toast: true,
                                    position: 'top-end',
                                    showConfirmButton: false,
                                    timer: 3000
                                });
                            }
                        })
                        .catch(err => {
                            Swal.fire({
                                icon: 'error',
                                title: 'Erro de conexão',
                                text: 'Não foi possível excluir a foto: ' + err.message,
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 3000
                            });
                        });
                    }
                });
            });

            fotoDiv.appendChild(img);
            fotoDiv.appendChild(inputId);
            fotoDiv.appendChild(btnExcluir);
            listaFotos.appendChild(fotoDiv);
        });

        arquivosSelecionados.forEach((file, index) => {
            const fotoDiv = document.createElement('span');
            fotoDiv.style.position = 'relative';
            fotoDiv.style.display = 'inline-block';
            fotoDiv.style.margin = '5px';

            const img = document.createElement('img');
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '5px';
            img.style.border = '1px solid #ccc';
            img.title = file.name;

            const reader = new FileReader();
            reader.onload = e => {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);

            const btnExcluir = document.createElement('i');
            btnExcluir.className = 'fas fa-times';
            btnExcluir.style.position = 'absolute';
            btnExcluir.style.top = '2px';
            btnExcluir.style.right = '2px';
            btnExcluir.style.color = 'red';
            btnExcluir.style.cursor = 'pointer';
            btnExcluir.style.background = 'white';
            btnExcluir.style.borderRadius = '50%';
            btnExcluir.style.padding = '2px 5px';
            btnExcluir.title = 'Remover imagem';

            btnExcluir.addEventListener('click', () => {
                arquivosSelecionados.splice(index, 1);
                atualizarListaFotosComId(fotosExistentes, arquivosSelecionados);
                atualizarInputFiles();
            });

            fotoDiv.appendChild(img);
            fotoDiv.appendChild(btnExcluir);
            listaFotos.appendChild(fotoDiv);
        });
    }

    function atualizarInputFiles() {
        const dataTransfer = new DataTransfer();
        arquivosSelecionados.forEach(file => {
            dataTransfer.items.add(file);
        });
        inputFile.files = dataTransfer.files;
    }

    document.getElementById('btnFoto').addEventListener('click', () => {
        inputFile.click();
    });

    document.getElementById('foto_documento_frente').addEventListener('change', (e) => {
        const preview = document.getElementById('foto_documento_frente_preview');
        preview.innerHTML = '';
        if (e.target.files[0]) {
            const img = document.createElement('img');
            img.style.maxWidth = '100px';
            img.style.marginTop = '10px';
            const reader = new FileReader();
            reader.onload = (ev) => {
                img.src = ev.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
            preview.appendChild(img);
        }
    });

    document.getElementById('foto_documento_verso').addEventListener('change', (e) => {
        const preview = document.getElementById('foto_documento_verso_preview');
        preview.innerHTML = '';
        if (e.target.files[0]) {
            const img = document.createElement('img');
            img.style.maxWidth = '100px';
            img.style.marginTop = '10px';
            const reader = new FileReader();
            reader.onload = (ev) => {
                img.src = ev.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
            preview.appendChild(img);
        }
    });

    document.getElementById('btnAdicionarParticipante').addEventListener('click', () => {
        resetFormParticipante();
        modalParticipanteLabel.textContent = 'Adicionar Participante';
        btnSalvarParticipante.textContent = 'Salvar';
        modalParticipante.show();
    });

    corpoTabela.addEventListener('click', (e) => {
        const editButton = e.target.closest('.btn-editar-participante');
        if (editButton) {
            resetFormParticipante();
            const participanteData = JSON.parse(editButton.dataset.participante);
            document.getElementById('participante_id').value = participanteData.id;
            document.getElementById('id_equipe').value = participanteData.id_equipe || '';
            document.getElementById('nome_completo').value = participanteData.nome_completo;
            document.getElementById('apelido').value = participanteData.apelido || '';
            document.getElementById('posicao').value = participanteData.posicao || '';
            document.getElementById('numero_camisa').value = participanteData.numero_camisa || '';
            document.getElementById('data_nascimento').value = participanteData.data_nascimento || '';
            document.getElementById('idade_label').textContent = `Idade: ${calcularIdade(participanteData.data_nascimento)} anos`;

            // Exibir miniaturas dos documentos com ícone de download
            exibirMiniaturaComDownload('foto_documento_frente_preview', (participanteData.foto_documento_frente));
            exibirMiniaturaComDownload('foto_documento_verso_preview', (participanteData.foto_documento_verso));

            modalParticipanteLabel.textContent = 'Editar Participante';
            btnSalvarParticipante.textContent = 'Salvar Alterações';
            modalParticipante.show();
        }

        const editFotosButton = e.target.closest('.btn-editar-fotos');
        if (editFotosButton) {
            formFotos.reset();
            arquivosSelecionados = [];
            atualizarInputFiles();
            const participanteData = JSON.parse(editFotosButton.dataset.participante);
            document.getElementById('fotos_participante_id').value = participanteData.id;
            modalFotosLabel.textContent = `Fotos de ${participanteData.nome_completo}`;
            fotosExistentes = participanteData.fotos || [];
            atualizarListaFotosComId(fotosExistentes, arquivosSelecionados);
            modalFotos.show();
        }

        const deleteButton = e.target.closest('.btn-excluir-participante');
        if (deleteButton) {
            const participanteId = deleteButton.dataset.idParticipante;
            const participanteNome = deleteButton.dataset.nomeParticipante;
            Swal.fire({
                title: 'Tem certeza?',
                html: `Deseja excluir o participante <strong>${participanteNome}</strong>?<br>Esta ação não pode ser desfeita.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sim, excluir!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch('gerenciar_jogadores.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: 'excluir_jogador=1&id_participante=' + participanteId
                    })
                    .then(response => response.text())
                    .then(() => location.reload())
                    .catch(error => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Erro ao excluir',
                            text: 'Não foi possível excluir o participante: ' + error.message,
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    });
                }
            });
        }
    });

    formParticipante.addEventListener('submit', (e) => {
        e.preventDefault();
        btnSalvarParticipante.disabled = true;
        btnSalvarParticipante.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';

        const formData = new FormData(formParticipante);
        fetch('salvar_participante.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.text())
        .then(() => {
            modalParticipante.hide();
            location.reload();
        })
        .catch(error => {
            Swal.fire({
                icon: 'error',
                title: 'Erro ao salvar',
                text: 'Não foi possível salvar o participante: ' + error.message,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        })
        .finally(() => {
            btnSalvarParticipante.disabled = false;
            btnSalvarParticipante.innerHTML = 'Salvar';
        });
    });
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>