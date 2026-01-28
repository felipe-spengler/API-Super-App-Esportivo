<?php
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php';

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
// --- INÍCIO DA RENDERIZAÇÃO DO HTML ---
require_once '../includes/header.php';
require_once 'sidebar_equipe.php';

?>

<main class="container py-5">

    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
        <h1 class="h2"><i class="fas fa-users fa-fw me-2"></i>Equipe</h1>
    </div>

    <div class="card">
        <div class="card-header">
           <strong><?= htmlspecialchars($equipe['nome']) ?></strong> (Líder: <?= htmlspecialchars($equipe['nome_lider']) ?>)
        </div>
        <div class="card-body">
            <div >
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label for="nome" class="form-label">Nome da Equipe</label>
                        <input readonly type="text" class="form-control" id="nome" name="nome" value="<?= htmlspecialchars($equipe['nome'] ?? $_POST['nome'] ?? '') ?>" required>
                        <!-- Dropdown para responsável da equipe -->
                        <label for="id_lider" class="form-label mt-3">Responsável da Equipe</label>
                        <?php foreach ($usuarios as $usuario): ?>
                            <?php if($equipe['id_lider'] == $usuario['id']){ ?>
                                <input readonly type="text" class="form-control" id="id_lider" name="id_lider" value="<?= htmlspecialchars($usuario['nome']) ?>" required>
                            <?php } ?>
                        <?php endforeach; ?>
                    </div>
                    <div class="col-md-6">
                        <?php if (!empty($equipe['brasao'])): ?>
                            <label class="form-label d-block">Brasão Atual</label>
                            <div class="mb-2"><img src="./public/brasoes/<?= htmlspecialchars($equipe['brasao']) ?>" alt="Brasão" style="max-width: 100px; max-height: 100px; border-radius: 5px; border: 1px solid #ddd;"></div>
                            <label for="brasao" class="form-label d-block">Trocar brasão</label>
                        <?php else: ?>
                        <?php endif; ?>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3"><label for="sigla" class="form-label">Sigla (3 letras)</label><input readonly type="text" class="form-control" id="sigla" name="sigla" maxlength="3" value="<?= htmlspecialchars($equipe['sigla'] ?? $_POST['sigla'] ?? '') ?>" required></div>
                    <div class="col-md-6 mb-3"><label for="cidade" class="form-label">Cidade</label><input readonly type="text" class="form-control" id="cidade" name="cidade" value="<?= htmlspecialchars($equipe['cidade'] ?? $_POST['cidade'] ?? '') ?>" required></div>
                </div>
                <hr>
            </div>
        </div>
    </div>

    <div class="card mt-4">
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0"><i class="fas fa-users fa-fw me-2"></i>Participantes da Equipe</h5>
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
                            <th class="text-end">Fotos</th>
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
                                        <button class="btn btn-primary btn-sm btn-editar-fotos" data-participante='<?= json_encode($participante) ?>' title="Fotos"><i class="fas fa-image"></i></button>
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

    <!-- Modal para Gerenciar Fotos (melhorado com formulário opcional para upload) -->
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
                        <br>
                        <div id="lista_Fotos" class="mt-3"></div>
                    </form>
                </div>
                <div class="modal-footer">
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
        // Elementos necessários apenas para o modal de fotos
        const modalFotosEl = document.getElementById('modalFotos');
        const modalFotos = modalFotosEl ? new bootstrap.Modal(modalFotosEl) : null;
        const modalFotosLabel = document.getElementById('modalFotosLabel');
        const corpoTabela = document.getElementById('tabela-participantes-body');
        const listaFotos = document.getElementById('lista_Fotos');

        // Inicializar variáveis necessárias
        let arquivosSelecionados = [];
        let fotosExistentes = [];


        // Função para exibir fotos existentes e novas
        function atualizarListaFotosComId(fotosExistentes = [], fotosNovas = []) {
            if (!listaFotos) return;
            listaFotos.innerHTML = ''; // Limpa a lista

            if (fotosExistentes.length === 0) {
                listaFotos.innerHTML = '<p class="text-muted">Nenhuma foto encontrada.</p>';
                return;
            }

            // Exibir fotos existentes (do banco)
            fotosExistentes.forEach((foto) => {
                const fotoDiv = document.createElement('div');
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
                img.src = `/sgce/${foto.src}`; // Ajuste o caminho para fotos (verifique a pasta real)

                const inputId = document.createElement('input');
                inputId.type = 'hidden';
                inputId.name = 'foto_ids[]';
                inputId.value = foto.id;

                fotoDiv.appendChild(img);
                fotoDiv.appendChild(inputId);
                listaFotos.appendChild(fotoDiv);
            });
        }

        // Se existir o corpo da tabela, adicionar evento de clique
        if (corpoTabela) {
            corpoTabela.addEventListener('click', (e) => {
                // Lógica para o botão EDITAR Fotos
                const editFotosButton = e.target.closest('.btn-editar-fotos');
                if (editFotosButton) {
                    try {
                        console.log('Botão de fotos clicado!'); // Depuração
                        if (formFotos) formFotos.reset();
                        arquivosSelecionados = [];
                        const participanteData = JSON.parse(editFotosButton.dataset.participante);
                        console.log('Dados do participante:', participanteData); // Depuração
                        document.getElementById('fotos_participante_id').value = participanteData.id;
                        modalFotosLabel.textContent = `Fotos de ${participanteData.nome_completo}`;
                        fotosExistentes = participanteData.fotos || [];
                        atualizarListaFotosComId(fotosExistentes, arquivosSelecionados);
                        if (modalFotos) {
                            modalFotos.show();
                            console.log('Modal de fotos inicializado e mostrado.'); // Depuração
                        } else {
                            console.error('Erro: Modal de fotos não inicializado. Verifique Bootstrap JS.');
                        }
                    } catch (error) {
                        console.error('Erro ao processar dados do participante:', error);
                        alert('Erro ao carregar dados do participante. Verifique o console.');
                    }
                }
            });
        } else {
            console.error('Erro: Elemento #tabela-participantes-body não encontrado.');
        }
        
    });
    </script>
</main>
<!-- Bootstrap CSS -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
<!-- Bootstrap JS (Bundle inclui Popper.js) -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
<?php require_once '../includes/footer_dashboard.php'; ?>