<?php
// /painel-equipe/gerenciar_equipe.php
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php'; // Assumindo que protege o acesso e define $_SESSION['user_id']

// Variável para controlar as notificações na página
$notificacao = null;

// Valida o ID da equipe na URL
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header("Location: gerenciar_equipe.php");
    exit();
}
$id_equipe = $_GET['id'];

// Lógica para ATUALIZAR a equipe (quando o formulário principal é enviado)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['form_equipe'])) {
    // Validação dos campos obrigatórios da equipe
    $erros = [];
    $nome = trim($_POST['nome']);
    $apelido = isset($_POST['apelido']) ? $_POST['apelido'] : "";
    $sigla = trim($_POST['sigla']);
    $cidade = trim($_POST['cidade']);
    $id_lider = trim($_POST['id_lider']);

    if (empty($nome)) $erros[] = 'O campo Nome da Equipe é obrigatório.';
    if (empty($sigla)) $erros[] = 'O campo Sigla é obrigatório.';
    if (empty($cidade)) $erros[] = 'O campo Cidade é obrigatório.';
    if (empty($id_lider) || !is_numeric($id_lider)) $erros[] = 'O campo Responsável da Equipe é obrigatório e deve ser válido.';

    // Se a validação passar, processa os dados
    if (empty($erros)) {
        // Busca o brasão antigo para possível exclusão
        $stmt_brasao = $pdo->prepare("SELECT brasao FROM equipes WHERE id = ?");
        $stmt_brasao->execute([$id_equipe]);
        $equipe_atual = $stmt_brasao->fetch();
        $brasaoAntigo = $equipe_atual['brasao'];

        $pastaUpload = '../public/brasoes/';
        $caminhoBrasaoParaDB = $brasaoAntigo;
        $operacaoBemSucedida = true;

        // Lógica de exclusão do brasão
        if (isset($_POST['excluir_brasao'])) {
            if (!empty($brasaoAntigo) && file_exists($pastaUpload . $brasaoAntigo)) {
                unlink($pastaUpload . $brasaoAntigo);
            }
            $caminhoBrasaoParaDB = null;
        }

        // Lógica de upload de um novo brasão
        if (isset($_FILES['brasao']) && $_FILES['brasao']['error'] === UPLOAD_ERR_OK) {
            if (!empty($brasaoAntigo) && file_exists($pastaUpload . $brasaoAntigo)) {
                unlink($pastaUpload . $brasaoAntigo);
            }
            $extensao = pathinfo($_FILES['brasao']['name'], PATHINFO_EXTENSION);
            $novoNomeArquivo = 'bra_' . time() . '.' . $extensao;
            $caminhoCompleto = $pastaUpload . $novoNomeArquivo;

            if (move_uploaded_file($_FILES['brasao']['tmp_name'], $caminhoCompleto)) {
                $caminhoBrasaoParaDB = $novoNomeArquivo;
            } else {
                $operacaoBemSucedida = false;
                $notificacao = ['tipo' => 'error', 'mensagem' => 'Falha ao mover o arquivo do brasão.'];
            }
        }

        // Se tudo correu bem, atualiza o banco de dados
        if ($operacaoBemSucedida) {
            $sql = "UPDATE equipes SET nome = ?, sigla = ?, cidade = ?, brasao = ?, id_lider = ? WHERE id = ?";
            $params = [$nome, $sigla, $cidade, $caminhoBrasaoParaDB, $id_lider, $id_equipe];
            $stmt = $pdo->prepare($sql);

            if ($stmt->execute($params)) {
                $notificacao = ['tipo' => 'success', 'mensagem' => 'Equipe atualizada com sucesso!'];
            } else {
                $notificacao = ['tipo' => 'error', 'mensagem' => 'Erro ao atualizar a equipe no banco de dados.'];
            }
        }
    } else {
        // Se houver erros de validação, prepara a notificação
        $mensagem_erro = implode('<br>', $erros);
        $notificacao = ['tipo' => 'error', 'mensagem' => $mensagem_erro];
    }
}

// --- BUSCA DE DADOS PARA EXIBIÇÃO NA PÁGINA ---

// Buscar dados da equipe para preencher o formulário
$stmt_equipe = $pdo->prepare("SELECT e.*, u.nome as nome_lider FROM equipes e JOIN usuarios u ON e.id_lider = u.id WHERE e.id = ?");
$stmt_equipe->execute([$id_equipe]);
$equipe = $stmt_equipe->fetch();

// Se a equipe não for encontrada, redireciona
if (!$equipe) {
    //header("Location: gerenciar_equipe.php");
    exit();
}

// Buscar todos os usuários para o dropdown de líder
$stmt_usuarios = $pdo->prepare("SELECT id, nome FROM usuarios ORDER BY nome ASC");
$stmt_usuarios->execute();
$usuarios = $stmt_usuarios->fetchAll(PDO::FETCH_ASSOC);

// Buscar todos os PARTICIPANTES desta equipe
$stmt_participantes = $pdo->prepare("
    SELECT p.*, 
           (SELECT GROUP_CONCAT(JSON_OBJECT('id', fp.id, 'src', fp.src)) 
            FROM fotos_participantes fp 
            WHERE fp.participante_id = p.id) as fotos
    FROM participantes p 
    WHERE p.id_equipe = ? 
    ORDER BY p.nome_completo ASC
");
$stmt_participantes->execute([$id_equipe]);
$participantes = $stmt_participantes->fetchAll(PDO::FETCH_ASSOC);

// Processar fotos para formato JSON
foreach ($participantes as &$participante) {
    $participante['fotos'] = $participante['fotos'] ? json_decode('[' . $participante['fotos'] . ']', true) : [];
}

// --- INÍCIO DA RENDERIZAÇÃO DO HTML ---
require_once '../includes/header.php';
require_once 'sidebar_equipe.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_equipe.php">Equipes</a></li>
        <li class="breadcrumb-item active" aria-current="page">Editar Equipe</li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-edit fa-fw me-2"></i>Editar Equipe</h1>
</div>

<div class="card">
    <div class="card-header">
        Editando: <strong><?= htmlspecialchars($equipe['nome']) ?></strong> (Líder: <?= htmlspecialchars($equipe['nome_lider']) ?>)
    </div>
    <div class="card-body">
        <form method="POST" enctype="multipart/form-data">
            <input type="hidden" name="form_equipe" value="1">
            <div class="row mb-3">
                <div class="col-md-6">
                    <label for="nome" class="form-label">Nome da Equipe</label>
                    <input type="text" class="form-control" id="nome" name="nome" value="<?= htmlspecialchars($equipe['nome'] ?? $_POST['nome'] ?? '') ?>" required>
                    <input type="hidden" id="id_lider" name="id_lider" value="<?= $_SESSION['user_id'] ?>">
                </div>
                <div class="col-md-6">
                    <?php if (!empty($equipe['brasao'])): ?>
                        <label class="form-label d-block">Brasão Atual</label>
                        <div class="mb-2"><img src="../public/brasoes/<?= htmlspecialchars($equipe['brasao']) ?>" alt="Brasão" style="max-width: 100px; max-height: 100px; border-radius: 5px; border: 1px solid #ddd;"></div>
                        <div class="form-check mb-2"><input class="form-check-input" type="checkbox" name="excluir_brasao" id="excluir_brasao"><label class="form-check-label" for="excluir_brasao">Excluir brasão atual</label></div>
                        <label for="brasao" class="form-label d-block">Trocar brasão</label>
                        <input type="file" class="form-control" name="brasao" id="brasao" accept="image/png, image/jpeg">
                    <?php else: ?>
                        <label for="brasao" class="form-label d-block">Enviar brasão</label>
                        <input type="file" class="form-control" name="brasao" id="brasao" accept="image/png, image/jpeg">
                    <?php endif; ?>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6 mb-3"><label for="sigla" class="form-label">Sigla (3 letras)</label><input type="text" class="form-control" id="sigla" name="sigla" maxlength="3" value="<?= htmlspecialchars($equipe['sigla'] ?? $_POST['sigla'] ?? '') ?>" required></div>
                <div class="col-md-6 mb-3"><label for="cidade" class="form-label">Cidade</label><input type="text" class="form-control" id="cidade" name="cidade" value="<?= htmlspecialchars($equipe['cidade'] ?? $_POST['cidade'] ?? '') ?>" required></div>
            </div>
            <hr>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save me-2"></i>Salvar Alterações da Equipe</button>
            <a href="gerenciar_equipe.php" class="btn btn-secondary">Cancelar</a>
        </form>
    </div>
</div>

<div class="card mt-4">
    <div class="card-header d-flex justify-content-between align-items-center">
        <h5 class="mb-0"><i class="fas fa-users fa-fw me-2"></i>Participantes da Equipe</h5>
        <button type="button" class="btn btn-success btn-sm" id="btnAdicionarParticipante">
            <i class="fas fa-plus me-2"></i>Adicionar Novo Participante
        </button>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>Nome Completo</th>
                        <th>Apelido</th>
                        <th>Posição</th>
                        <th>Número</th>
                        <th class="text-end">Ações</th>
                    </tr>
                </thead>
                <tbody id="tabela-participantes-body">
                    <?php if (count($participantes) > 0): ?>
                        <?php echo implode('', array_map(function ($participante) {
                            return '<tr>' .
                                '<td><strong>' . htmlspecialchars($participante['nome_completo']) . '</strong></td>' .
                                '<td>' . htmlspecialchars($participante['apelido'] ?? '') . '</td>' .
                                '<td>' . htmlspecialchars($participante['posicao'] ?? 'N/A') . '</td>' .
                                '<td>' . htmlspecialchars($participante['numero_camisa'] ?? 'N/A') . '</td>' .
                                '<td class="text-end">' .
                                    '<button class="btn btn-warning btn-sm btn-editar-participante" data-participante=\'' . htmlspecialchars(json_encode($participante)) . '\' title="Editar"><i class="fas fa-pencil-alt"></i></button>' .
                                    '<button class="btn btn-primary btn-sm btn-editar-fotos" data-participante=\'' . htmlspecialchars(json_encode($participante)) . '\' title="Fotos"><i class="fas fa-image"></i></button>' .
                                    '<button class="btn btn-danger btn-sm btn-excluir-participante" data-id-participante="' . $participante['id'] . '" data-nome-participante="' . htmlspecialchars($participante['nome_completo']) . '" title="Excluir"><i class="fas fa-trash-alt"></i></button>' .
                                '</td>' .
                                '</tr>';
                        }, $participantes)); ?>
                    <?php else: ?>
                        <tr><td colspan="5" class="text-center">Nenhum participante cadastrado.</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
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
                    <input type="hidden" name="id_equipe" value="<?= $id_equipe ?>">
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
                        <input type="date" class="form-control" id="data_nascimento" name="data_nascimento">
                    </div>
                    <div class="mb-3">
                        <label for="foto_documento_frente" class="form-label">Foto Documento (Frente)</label>
                        <input type="file" class="form-control" id="foto_documento_frente" name="foto_documento_frente" accept="image/png, image/jpeg">
                        <div id="preview_foto_frente" class="mt-2"></div>
                    </div>
                    <div class="mb-3">
                        <label for="foto_documento_verso" class="form-label">Foto Documento (Verso)</label>
                        <input type="file" class="form-control" id="foto_documento_verso" name="foto_documento_verso" accept="image/png, image/jpeg">
                        <div id="preview_foto_verso" class="mt-2"></div>
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
                <form id="formFotos" enctype="multipart/form-data">
                    <input type="hidden" name="id" id="fotos_participante_id">
                    <input type="hidden" name="id_equipe" value="<?= $id_equipe ?>">
                    <!-- Fotos de documento -->
                    <div class="mb-3">
                        <h6>Foto Documento (Frente)</h6>
                        <div id="documento_frente_preview" class="mt-2"></div>
                    </div>
                    <div class="mb-3">
                        <h6>Foto Documento (Verso)</h6>
                        <div id="documento_verso_preview" class="mt-2"></div>
                    </div>
                    <!-- Outras fotos -->
                    <h6>Outras Fotos</h6>
                    <input type="file" id="foto" name="fotos[]" accept="image/png, image/jpeg" multiple style="display:none">
                    <div id="btnFoto" class="btn btn-primary">
                        <i class="fas fa-image"></i> Adicionar Fotos
                    </div>
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

<?php
// Bloco para notificações que vêm de um redirecionamento (Sessão)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
if (isset($_SESSION['notificacao'])) {
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
}
// Bloco para disparar a notificação (seja da sessão ou local)
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
    const corpoTabela = document.getElementById('tabela-participantes-body');
    const inputFile = document.getElementById('foto');
    const listaFotos = document.getElementById('lista_Fotos');
    let arquivosSelecionados = []; // Array para armazenar arquivos temporários de outras fotos
    let documentoFrente = null; // Arquivo temporário para foto documento frente
    let documentoVerso = null; // Arquivo temporário para foto documento verso

    // Resetar formulário de participante
    const resetFormParticipante = () => {
        formParticipante.reset();
        document.getElementById('participante_id').value = '';
        document.getElementById('preview_foto_frente').innerHTML = '';
        document.getElementById('preview_foto_verso').innerHTML = '';
        documentoFrente = null;
        documentoVerso = null;
    };

    // Função para exibir fotos existentes e novas (incluindo documentos)
    function atualizarListaFotosComId(fotosExistentes = [], fotosNovas = [], documentoFrenteExistente = null, documentoVersoExistente = null) {
        listaFotos.innerHTML = ''; // Limpa a lista de outras fotos
        document.getElementById('documento_frente_preview').innerHTML = ''; // Limpa preview de documento frente
        document.getElementById('documento_verso_preview').innerHTML = ''; // Limpa preview de documento verso

        // Exibir foto documento frente (existente ou nova)
        if (documentoFrenteExistente || documentoFrente) {
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

            if (documentoFrente) {
                // Nova foto selecionada
                img.title = documentoFrente.name;
                const reader = new FileReader();
                reader.onload = e => img.src = e.target.result;
                reader.readAsDataURL(documentoFrente);
            } else {
                // Foto existente do banco
                img.title = 'Documento Frente';
                img.src = `/sgce/${documentoFrenteExistente}`;
            }

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
            btnExcluir.title = 'Remover documento frente';

            btnExcluir.addEventListener('click', () => {
                Swal.fire({
                    title: 'Tem certeza?',
                    text: 'Deseja excluir a foto do documento (frente)?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Sim, excluir!',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        if (documentoFrente) {
                            // Remove nova foto
                            documentoFrente = null;
                            document.getElementById('foto_documento_frente').value = '';
                            atualizarListaFotosComId(fotosExistentes, arquivosSelecionados, documentoFrenteExistente, documentoVersoExistente);
                        } else if (documentoFrenteExistente) {
                            // Remove foto existente via API
                            fetch(`/sgce/painel-equipe/excluir_foto_documento.php?participante_id=${document.getElementById('fotos_participante_id').value}&tipo=frente`, {
                                method: 'DELETE'
                            })
                            .then(response => {
                                if (!response.ok) throw new Error('Erro ao excluir foto');
                                return response.json();
                            })
                            .then(data => {
                                if (data.success) {
                                    documentoFrenteExistente = null;
                                    atualizarListaFotosComId(fotosExistentes, arquivosSelecionados, null, documentoVersoExistente);
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
                    }
                });
            });

            fotoDiv.appendChild(img);
            fotoDiv.appendChild(btnExcluir);
            document.getElementById('documento_frente_preview').appendChild(fotoDiv);
        }

        // Exibir foto documento verso (existente ou nova)
        if (documentoVersoExistente || documentoVerso) {
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

            if (documentoVerso) {
                // Nova foto selecionada
                img.title = documentoVerso.name;
                const reader = new FileReader();
                reader.onload = e => img.src = e.target.result;
                reader.readAsDataURL(documentoVerso);
            } else {
                // Foto existente do banco
                img.title = 'Documento Verso';
                img.src = `/sgce/${documentoVersoExistente}`;
            }

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
            btnExcluir.title = 'Remover documento verso';

            btnExcluir.addEventListener('click', () => {
                Swal.fire({
                    title: 'Tem certeza?',
                    text: 'Deseja excluir a foto do documento (verso)?',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Sim, excluir!',
                    cancelButtonText: 'Cancelar'
                }).then((result) => {
                    if (result.isConfirmed) {
                        if (documentoVerso) {
                            // Remove nova foto
                            documentoVerso = null;
                            document.getElementById('foto_documento_verso').value = '';
                            atualizarListaFotosComId(fotosExistentes, arquivosSelecionados, documentoFrenteExistente, documentoVersoExistente);
                        } else if (documentoVersoExistente) {
                            // Remove foto existente via API
                            fetch(`/sgce/painel-equipe/excluir_foto_documento.php?participante_id=${document.getElementById('fotos_participante_id').value}&tipo=verso`, {
                                method: 'DELETE'
                            })
                            .then(response => {
                                if (!response.ok) throw new Error('Erro ao excluir foto');
                                return response.json();
                            })
                            .then(data => {
                                if (data.success) {
                                    documentoVersoExistente = null;
                                    atualizarListaFotosComId(fotosExistentes, arquivosSelecionados, documentoFrenteExistente, null);
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
                    }
                });
            });

            fotoDiv.appendChild(img);
            fotoDiv.appendChild(btnExcluir);
            document.getElementById('documento_verso_preview').appendChild(fotoDiv);
        }

        // Exibir fotos existentes (outras fotos)
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

        // Exibir fotos novas (outras fotos)
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
                atualizarListaFotosComId(fotosExistentes, arquivosSelecionados, documentoFrenteExistente, documentoVersoExistente);
                atualizarInputFiles();
            });

            fotoDiv.appendChild(img);
            fotoDiv.appendChild(btnExcluir);
            listaFotos.appendChild(fotoDiv);
        });
    }

    // Atualizar o input file com os arquivos selecionados (outras fotos)
    function atualizarInputFiles() {
        const dataTransfer = new DataTransfer();
        arquivosSelecionados.forEach(file => {
            dataTransfer.items.add(file);
        });
        inputFile.files = dataTransfer.files;
    }

    // Preview para foto documento frente
    document.getElementById('foto_documento_frente').addEventListener('change', (e) => {
        const file = e.target.files[0];
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        const tiposPermitidos = ['image/png', 'image/jpeg'];

        if (file) {
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
                e.target.value = '';
                return;
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
                e.target.value = '';
                return;
            }
            documentoFrente = file;
            const previewDiv = document.getElementById('preview_foto_frente');
            previewDiv.innerHTML = '';
            const img = document.createElement('img');
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '5px';
            img.style.border = '1px solid #ccc';
            img.title = file.name;
            const reader = new FileReader();
            reader.onload = e => img.src = e.target.result;
            reader.readAsDataURL(file);
            previewDiv.appendChild(img);
        }
    });

    // Preview para foto documento verso
    document.getElementById('foto_documento_verso').addEventListener('change', (e) => {
        const file = e.target.files[0];
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        const tiposPermitidos = ['image/png', 'image/jpeg'];

        if (file) {
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
                e.target.value = '';
                return;
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
                e.target.value = '';
                return;
            }
            documentoVerso = file;
            const previewDiv = document.getElementById('preview_foto_verso');
            previewDiv.innerHTML = '';
            const img = document.createElement('img');
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '5px';
            img.style.border = '1px solid #ccc';
            img.title = file.name;
            const reader = new FileReader();
            reader.onload = e => img.src = e.target.result;
            reader.readAsDataURL(file);
            previewDiv.appendChild(img);
        }
    });

    // Botão para adicionar outras fotos
    document.getElementById('btnFoto').addEventListener('click', () => {
        inputFile.click();
    });

    // Quando selecionar outras fotos
    inputFile.addEventListener('change', () => {
        const maxFileSize = 5 * 1024 * 1024; // 5MB
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
        atualizarListaFotosComId(fotosExistentes, arquivosSelecionados, documentoFrenteExistente, documentoVersoExistente);
        atualizarInputFiles();
    });

    // Envio do formulário de fotos
    formFotos.addEventListener('submit', (e) => {
        e.preventDefault();
        const participanteId = document.getElementById('fotos_participante_id').value;
        if (!participanteId) {
            Swal.fire({
                icon: 'warning',
                title: 'Participante não selecionado',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
            return;
        }

        if (arquivosSelecionados.length === 0 && !documentoFrente && !documentoVerso) {
            Swal.fire({
                icon: 'warning',
                title: 'Nenhuma foto selecionada',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
            return;
        }

        btnSalvarFotos.disabled = true;
        btnSalvarFotos.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';

        const formData = new FormData();
        arquivosSelecionados.forEach(file => formData.append('fotos[]', file));
        if (documentoFrente) formData.append('foto_documento_frente', documentoFrente);
        if (documentoVerso) formData.append('foto_documento_verso', documentoVerso);
        formData.append('participante_id', participanteId);

        fetch(`/sgce/painel-equipe/upload_fotos_participantes.php`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) throw new Error(`Erro HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Fotos enviadas com sucesso',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                }).then(() => {
                    arquivosSelecionados = [];
                    documentoFrente = null;
                    documentoVerso = null;
                    inputFile.value = '';
                    modalFotos.hide();
                    location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao enviar fotos',
                    text: data.message,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
        })
        .catch(error => {
            console.error('Erro no upload:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro de conexão',
                text: 'Não foi possível enviar as fotos: ' + error.message,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        })
        .finally(() => {
            btnSalvarFotos.disabled = false;
            btnSalvarFotos.innerHTML = 'Salvar';
        });
    });

    // Botão para adicionar participante
    document.getElementById('btnAdicionarParticipante').addEventListener('click', () => {
        resetFormParticipante();
        modalParticipanteLabel.textContent = 'Adicionar Novo Participante';
        btnSalvarParticipante.textContent = 'Salvar';
        modalParticipante.show();
    });

    // Ações na tabela
    corpoTabela.addEventListener('click', (e) => {
        // Lógica para o botão EDITAR Fotos
        const editFotosButton = e.target.closest('.btn-editar-fotos');
        if (editFotosButton) {
            formFotos.reset();
            arquivosSelecionados = [];
            documentoFrente = null;
            documentoVerso = null;
            atualizarInputFiles();
            const participanteData = JSON.parse(editFotosButton.dataset.participante);
            document.getElementById('fotos_participante_id').value = participanteData.id;
            modalFotosLabel.textContent = `Fotos de ${participanteData.nome_completo}`;
            fotosExistentes = participanteData.fotos || [];
            documentoFrenteExistente = participanteData.foto_documento_frente || null;
            documentoVersoExistente = participanteData.foto_documento_verso || null;
            atualizarListaFotosComId(fotosExistentes, arquivosSelecionados, documentoFrenteExistente, documentoVersoExistente);
            modalFotos.show();
        }

        // Lógica para o botão EDITAR
        const editButton = e.target.closest('.btn-editar-participante');
        if (editButton) {
            resetFormParticipante();
            const participanteData = JSON.parse(editButton.dataset.participante);
            document.getElementById('participante_id').value = participanteData.id;
            document.getElementById('nome_completo').value = participanteData.nome_completo;
            document.getElementById('apelido').value = participanteData.apelido || '';
            document.getElementById('posicao').value = participanteData.posicao || '';
            document.getElementById('numero_camisa').value = participanteData.numero_camisa || '';
            document.getElementById('data_nascimento').value = participanteData.data_nascimento || '';
            // Exibir previews das fotos de documento existentes
            const previewFrente = document.getElementById('preview_foto_frente');
            const previewVerso = document.getElementById('preview_foto_verso');
            previewFrente.innerHTML = '';
            previewVerso.innerHTML = '';
            if (participanteData.foto_documento_frente) {
                const img = document.createElement('img');
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '5px';
                img.style.border = '1px solid #ccc';
                img.src = `/sgce/${participanteData.foto_documento_frente}`;
                img.title = 'Documento Frente';
                previewFrente.appendChild(img);
            }
            if (participanteData.foto_documento_verso) {
                const img = document.createElement('img');
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '5px';
                img.style.border = '1px solid #ccc';
                img.src = `/sgce/${participanteData.foto_documento_verso}`;
                img.title = 'Documento Verso';
                previewVerso.appendChild(img);
            }
            modalParticipanteLabel.textContent = 'Editar Participante';
            btnSalvarParticipante.textContent = 'Salvar Alterações';
            modalParticipante.show();
        }

        // Lógica para o botão EXCLUIR
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
                    fetch(`excluir_participante.php?id=${participanteId}`, {
                        method: 'POST'
                    })
                    .then(() => location.reload());
                }
            });
        }
    });

    // Envio do formulário do participante com AJAX
    formParticipante.addEventListener('submit', (e) => {
        e.preventDefault();
        btnSalvarParticipante.disabled = true;
        btnSalvarParticipante.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Salvando...';

        const formData = new FormData(formParticipante);
        fetch('salvar_participante.php', { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    modalParticipante.hide();
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000,
                        icon: 'success',
                        title: data.message
                    }).then(() => {
                        location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro de Validação',
                        html: data.errors.join('<br>')
                    });
                }
            })
            .catch(error => {
                console.error('Erro no envio do participante:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro de Conexão',
                    text: 'Não foi possível salvar os dados: ' + error.message
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