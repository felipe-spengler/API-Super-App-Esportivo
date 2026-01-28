<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// Variável para controlar as notificações na página
$notificacao = null;

// Valida o ID da equipe na URL
if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header("Location: gerenciar_equipes.php");
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
    header("Location: gerenciar_equipes.php");
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
            WHERE fp.participante_id = p.id) as fotos,
           p.foto_documento_frente,
           p.foto_documento_verso
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
require_once 'sidebar.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_equipes.php">Equipes</a></li>
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
                    <!-- Dropdown para responsável da equipe -->
                    <label for="id_lider" class="form-label mt-3">Responsável da Equipe</label>
                    <select class="form-control" id="id_lider" name="id_lider" required>
                        <option value="">Selecione o responsável</option>
                        <?php foreach ($usuarios as $usuario): ?>
                            <option value="<?= $usuario['id'] ?>" <?= $equipe['id_lider'] == $usuario['id'] ? 'selected' : '' ?>>
                                <?= htmlspecialchars($usuario['nome']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
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
            <a href="gerenciar_equipes.php" class="btn btn-secondary">Cancelar</a>
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
                        <?php foreach ($participantes as $participante): ?>
                            <tr>
                                <td><?= htmlspecialchars($participante['nome_completo']) ?></td>
                                <td><?= htmlspecialchars($participante['apelido'] ?? '') ?></td>
                                <td><?= htmlspecialchars($participante['posicao'] ?? 'N/A') ?></td>
                                <td><?= htmlspecialchars($participante['numero_camisa'] ?? 'N/A') ?></td>
                                <td class="text-end">
                                    <button class="btn btn-warning btn-sm btn-editar-participante" data-participante='<?= json_encode($participante) ?>' title="Editar"><i class="fas fa-pencil-alt"></i></button>
                                    <button class="btn btn-primary btn-sm btn-editar-fotos" data-participante='<?= json_encode($participante) ?>' title="Fotos"><i class="fas fa-image"></i></button>
                                    <button class="btn btn-danger btn-sm btn-excluir-participante" data-id-participante="<?= $participante['id'] ?>" data-nome-participante="<?= htmlspecialchars($participante['nome_completo']) ?>" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                                </td>
                            </tr>
                        <?php endforeach; ?>
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
                    <input type="hidden" name="id_equipe" id="id_equipe" value="<?= $id_equipe ?>">
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
                    <input type="hidden" name="id_equipe" value="<?= $id_equipe ?>">
                    <input type="file" id="foto" name="foto" accept="image/png, image/jpeg" multiple style="display:none">
                    <div id="btnFoto" class="btn btn-primary">
                        <i class="fas fa-image"></i> Adicionar Fotos
                    </div>
                    <br>
                    <div id="lista_Fotos" class="mt-3 d-flex flex-wrap"></div>
                    <div id="uploadFeedback" class="mt-2"></div>
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
    const uploadFeedback = document.getElementById('uploadFeedback');
    const dataNascimentoInput = document.getElementById('data_nascimento');
    const idadeLabel = document.getElementById('idade_label');
    const frenteInput = document.getElementById('foto_documento_frente');
    const versoInput = document.getElementById('foto_documento_verso');
    const frentePreview = document.getElementById('foto_documento_frente_preview');
    const versoPreview = document.getElementById('foto_documento_verso_preview');
    let arquivosSelecionados = [];
    let fotosExistentes = [];

    // Função para calcular a idade
    function calcularIdade(dataNascimento) {
        if (!dataNascimento) {
            idadeLabel.textContent = 'Idade: -- anos';
            return;
        }
        const hoje = new Date();
        const nascimento = new Date(dataNascimento);
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const mes = hoje.getMonth() - nascimento.getMonth();
        if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        idadeLabel.textContent = `Idade: ${idade} anos`;
    }

    // Função para validar arquivo no frontend
    function validarArquivo(file) {
        const tiposPermitidos = ['image/png', 'image/jpeg'];
        const tamanhoMaximo = 5 * 1024 * 1024; // 5MB
        if (!tiposPermitidos.includes(file.type)) {
            return `Apenas imagens PNG ou JPEG são permitidas para ${file.name}.`;
        }
        if (file.size > tamanhoMaximo) {
            return `A imagem ${file.name} excede o tamanho máximo de 5MB.`;
        }
        return null;
    }

    // Função para exibir preview de imagem nova
    function mostrarPreviewImagem(input, previewDiv, tipo) {
        previewDiv.innerHTML = '';
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const erro = validarArquivo(file);
            if (erro) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Arquivo inválido',
                    text: erro,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                input.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.style.width = '80px';
                img.style.height = '80px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '5px';
                img.style.border = '1px solid #ccc';
                img.src = e.target.result;
                img.title = file.name;

                const btnExcluir = document.createElement('i');
                btnExcluir.className = 'fas fa-times';
                btnExcluir.style.position = 'absolute';
                btnExcluir.style.top = '2px';
                btnExcluir.style.right = '20px';
                btnExcluir.style.color = 'red';
                btnExcluir.style.cursor = 'pointer';
                btnExcluir.style.background = 'white';
                btnExcluir.style.borderRadius = '50%';
                btnExcluir.style.padding = '2px 5px';
                btnExcluir.title = 'Remover imagem';

                btnExcluir.addEventListener('click', () => {
                    input.value = '';
                    previewDiv.innerHTML = '';
                });

                const btnDownload = document.createElement('i');
                btnDownload.className = 'fas fa-download';
                btnDownload.style.position = 'absolute';
                btnDownload.style.top = '2px';
                btnDownload.style.right = '2px';
                btnDownload.style.color = 'blue';
                btnDownload.style.cursor = 'pointer';
                btnDownload.style.background = 'white';
                btnDownload.style.borderRadius = '50%';
                btnDownload.style.padding = '2px 5px';
                btnDownload.title = 'Download imagem';
                btnDownload.addEventListener('click', () => {
                    const a = document.createElement('a');
                    a.href = e.target.result;
                    a.download = file.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });

                const fotoDiv = document.createElement('span');
                fotoDiv.style.position = 'relative';
                fotoDiv.style.display = 'inline-block';
                fotoDiv.style.margin = '5px';
                fotoDiv.appendChild(img);
                fotoDiv.appendChild(btnExcluir);
                fotoDiv.appendChild(btnDownload);
                previewDiv.appendChild(fotoDiv);
            };
            reader.readAsDataURL(file);
        }
    }

    // Função para exibir imagem existente
    function mostrarImagemExistente(previewDiv, src, tipo, participanteId) {
        if (src) {
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
            img.src = '/sgce/' + src;
            img.title = `Documento ${tipo}`;

            const btnExcluir = document.createElement('i');
            btnExcluir.className = 'fas fa-times';
            btnExcluir.style.position = 'absolute';
            btnExcluir.style.top = '2px';
            btnExcluir.style.right = '20px';
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
                        fetch(`/sgce/admin/excluir_documento_participante.php?participante_id=${participanteId}&tipo=${tipo}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        })
                        .then(response => {
                            if (!response.ok) throw new Error('Erro ao excluir documento');
                            previewDiv.innerHTML = '';
                            Swal.fire({
                                icon: 'success',
                                title: 'Foto excluída com sucesso',
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 2000
                            });
                        })
                        .catch(err => {
                            Swal.fire({
                                icon: 'error',
                                title: 'Erro ao excluir documento',
                                text: err.message,
                                toast: true,
                                position: 'top-end',
                                showConfirmButton: false,
                                timer: 3000
                            });
                        });
                    }
                });
            });

            const btnDownload = document.createElement('i');
            btnDownload.className = 'fas fa-download';
            btnDownload.style.position = 'absolute';
            btnDownload.style.top = '2px';
            btnDownload.style.right = '2px';
            btnDownload.style.color = 'blue';
            btnDownload.style.cursor = 'pointer';
            btnDownload.style.background = 'white';
            btnDownload.style.borderRadius = '50%';
            btnDownload.style.padding = '2px 5px';
            btnDownload.title = 'Download imagem';
            btnDownload.addEventListener('click', () => {
                const a = document.createElement('a');
                a.href = '/sgce/' + src;
                a.download = `documento_${tipo}_${participanteId}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });

            fotoDiv.appendChild(img);
            fotoDiv.appendChild(btnExcluir);
            fotoDiv.appendChild(btnDownload);
            previewDiv.appendChild(fotoDiv);
        }
    }

    // Função para exibir fotos existentes e novas no modal de fotos
    function atualizarListaFotosComId(fotosExistentes = [], fotosNovas = []) {
        listaFotos.innerHTML = '';
        uploadFeedback.innerHTML = '';

        // Exibir fotos existentes (do banco)
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
            btnExcluir.style.right = '20px';
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
                        fetch(`/sgce/admin/excluir_fotos_participantes.php?id=${foto.id}`, {
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
                                fotosExistentes = fotosExistentes.filter(f => f.id !== foto.id);
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

            const btnDownload = document.createElement('i');
            btnDownload.className = 'fas fa-download';
            btnDownload.style.position = 'absolute';
            btnDownload.style.top = '2px';
            btnDownload.style.right = '2px';
            btnDownload.style.color = 'blue';
            btnDownload.style.cursor = 'pointer';
            btnDownload.style.background = 'white';
            btnDownload.style.borderRadius = '50%';
            btnDownload.style.padding = '2px 5px';
            btnDownload.title = 'Download imagem';
            btnDownload.addEventListener('click', () => {
                const a = document.createElement('a');
                a.href = `/sgce/${foto.src}`;
                a.download = `foto_${foto.id}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });

            fotoDiv.appendChild(img);
            fotoDiv.appendChild(inputId);
            fotoDiv.appendChild(btnExcluir);
            fotoDiv.appendChild(btnDownload);
            listaFotos.appendChild(fotoDiv);
        });

        // Exibir fotos novas (selecionadas pelo usuário)
        arquivosSelecionados.forEach((file, index) => {
            const erro = validarArquivo(file);
            if (erro) {
                uploadFeedback.innerHTML += `<div class="alert alert-warning">${erro}</div>`;
                return;
            }

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
            btnExcluir.style.right = '20px';
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

            const btnDownload = document.createElement('i');
            btnDownload.className = 'fas fa-download';
            btnDownload.style.position = 'absolute';
            btnDownload.style.top = '2px';
            btnDownload.style.right = '2px';
            btnDownload.style.color = 'blue';
            btnDownload.style.cursor = 'pointer';
            btnDownload.style.background = 'white';
            btnDownload.style.borderRadius = '50%';
            btnDownload.style.padding = '2px 5px';
            btnDownload.title = 'Download imagem';
            btnDownload.addEventListener('click', () => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(file);
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });

            fotoDiv.appendChild(img);
            fotoDiv.appendChild(btnExcluir);
            fotoDiv.appendChild(btnDownload);
            listaFotos.appendChild(fotoDiv);
        });
    }

    // Atualizar o input file com os arquivos selecionados
    function atualizarInputFiles() {
        const dataTransfer = new DataTransfer();
        arquivosSelecionados.forEach(file => {
            dataTransfer.items.add(file);
        });
        inputFile.files = dataTransfer.files;
    }

    // Resetar formulário de participante
    const resetFormParticipante = () => {
        formParticipante.reset();
        document.getElementById('participante_id').value = '';
        document.getElementById('id_equipe').value = '<?= $id_equipe ?>';
        idadeLabel.textContent = 'Idade: -- anos';
        frentePreview.innerHTML = '';
        versoPreview.innerHTML = '';
    };

    // Listeners para preview de novas imagens
    frenteInput.addEventListener('change', () => mostrarPreviewImagem(frenteInput, frentePreview, 'frente'));
    versoInput.addEventListener('change', () => mostrarPreviewImagem(versoInput, versoPreview, 'verso'));

    // Calcular idade ao sair do campo
    dataNascimentoInput.addEventListener('change', () => {
        calcularIdade(dataNascimentoInput.value);
    });

    // Botão para adicionar fotos
    document.getElementById('btnFoto').addEventListener('click', () => {
        inputFile.click();
    });

    // Quando selecionar arquivos no input
    inputFile.addEventListener('change', () => {
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        const tiposPermitidos = ['image/png', 'image/jpeg'];

        for (const file of inputFile.files) {
            const erro = validarArquivo(file);
            if (!erro) {
                if (!arquivosSelecionados.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified)) {
                    arquivosSelecionados.push(file);
                }
            } else {
                uploadFeedback.innerHTML += `<div class="alert alert-warning">${erro}</div>`;
            }
        }
        atualizarListaFotosComId(fotosExistentes, arquivosSelecionados);
        atualizarInputFiles();
    });

    // Envio do formulário de fotos
    formFotos.addEventListener('submit', async (e) => {
        e.preventDefault();
        uploadFeedback.innerHTML = '';
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

        if (arquivosSelecionados.length === 0) {
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

        let erros = [];
        // Enviar cada foto individualmente
        for (const file of arquivosSelecionados) {
            const formData = new FormData();
            formData.append('fotos', file);
            try {
                const response = await fetch(`/sgce/admin/upload_fotos_participantes.php?participante_id=${encodeURIComponent(participanteId)}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.success) {
                    fotosExistentes.push({ id: data.foto_id, src: data.foto_src });
                    uploadFeedback.innerHTML += `<div class="alert alert-success">Foto ${file.name} enviada com sucesso!</div>`;
                } else {
                    erros.push(`Erro ao enviar ${file.name}: ${data.message}`);
                }
            } catch (error) {
                erros.push(`Erro de conexão ao enviar ${file.name}: ${error.message}`);
            }
        }

        if (erros.length > 0) {
            uploadFeedback.innerHTML += `<div class="alert alert-danger">${erros.join('<br>')}</div>`;
        } else {
            Swal.fire({
                icon: 'success',
                title: 'Fotos enviadas com sucesso',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            }).then(() => {
                arquivosSelecionados = [];
                inputFile.value = '';
                modalFotos.hide();
                location.reload();
            });
        }

        btnSalvarFotos.disabled = false;
        btnSalvarFotos.innerHTML = 'Salvar';
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
            atualizarInputFiles();
            const participanteData = JSON.parse(editFotosButton.dataset.participante);
            document.getElementById('fotos_participante_id').value = participanteData.id;
            modalFotosLabel.textContent = `Fotos de ${participanteData.nome_completo}`;
            fotosExistentes = participanteData.fotos || [];
            atualizarListaFotosComId(fotosExistentes, arquivosSelecionados);
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
            calcularIdade(participanteData.data_nascimento);
            mostrarImagemExistente(frentePreview, participanteData.foto_documento_frente, 'frente', participanteData.id);
            mostrarImagemExistente(versoPreview, participanteData.foto_documento_verso, 'verso', participanteData.id);
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
                    window.location.href = `excluir_participante_admin.php?id=${participanteId}`;
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
        fetch('salvar_participante_admin.php', { method: 'POST', body: formData })
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