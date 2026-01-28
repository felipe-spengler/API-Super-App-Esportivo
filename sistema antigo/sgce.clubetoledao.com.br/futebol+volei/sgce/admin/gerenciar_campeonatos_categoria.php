<?php
// Enable error reporting for debugging (remove in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// Validate id_campeonato from GET
$id_campeonato = filter_var($_GET['id_campeonato'] ?? null, FILTER_VALIDATE_INT);
if (!$id_campeonato) {
    header('Location: gerenciar_campeonatos.php');
    exit;
}

try {
    // Fetch championship parent details
    $stmt_pai = $pdo->prepare("SELECT nome FROM campeonatos WHERE id = ?");
    $stmt_pai->execute([$id_campeonato]);
    $campeonato_pai = $stmt_pai->fetch(PDO::FETCH_ASSOC);
    if (!$campeonato_pai) {
        header('Location: gerenciar_campeonatos.php');
        exit;
    }
    $nome_campeonato_pai = $campeonato_pai['nome'];

    // Fetch all sports for the create championship modal
    $esportes = $pdo->query("SELECT * FROM esportes ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);

    // Fetch all teams for the team registration modal
    $todas_as_equipes = $pdo->query("SELECT id, nome FROM equipes ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);

    // Query to fetch categories and their enrolled participants
    $stmt_campeonatos = $pdo->prepare("
        SELECT 
            categoria.*, 
            e.nome AS esporte_nome,
            COUNT(DISTINCT COALESCE(pa.id, pb.id)) AS total_inscritos,
            GROUP_CONCAT(ce.id_equipe) AS equipes_inscritas_ids
        FROM campeonatos categoria
        JOIN esportes e ON categoria.id_esporte = e.id
        LEFT JOIN campeonatos_equipes ce ON categoria.id = ce.id_campeonato
        LEFT JOIN partidas p ON p.id_campeonato = categoria.id
        LEFT JOIN participantes pa ON pa.id_equipe = p.id_equipe_a
        LEFT JOIN participantes pb ON pb.id_equipe = p.id_equipe_b
        WHERE categoria.id_campeonato_pai = ?
        GROUP BY categoria.id
        ORDER BY categoria.id, categoria.data_criacao DESC
    ");
    $stmt_campeonatos->execute([$id_campeonato]);
    $categorias = $stmt_campeonatos->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    // Log error to file (configure log path in php.ini or specify here)
    error_log("Database Error: " . $e->getMessage());
    die("A database error occurred. Please contact the administrator.");
}

require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonatos</a></li>
        <li class="breadcrumb-item active" aria-current="page">Gerenciar Categorias do campeonato <?php echo htmlspecialchars($nome_campeonato_pai); ?></li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-trophy fa-fw me-2"></i>Gerenciar Categorias</h1>
    <button type="button" class="btn btn-success" id="btnNovoCampeonato">
        <i class="fas fa-plus me-2"></i>Criar Nova Categoria
    </button>
</div>

<div class="row">
    <?php if (count($categorias) > 0): ?>
        <?php foreach ($categorias as $categoria): ?>
            <?php
            // 1. Pega o ID do esporte
            $id_esporte = $categoria['id_esporte'];
            // 2. Define o nome do arquivo com base no ID do esporte
            $arquivo_destino = 'categoria.php'; // Padrão/Default (para id_esporte = 1 ou outros)

            if ($id_esporte == 2) {
                $arquivo_destino = 'categoria_volei.php';
            }
            // Se id_esporte for 1, ele permanece como 'categoria.php' (o valor inicial)
            // 3. Monta o link completo
            $link_categoria = $arquivo_destino . '?id_categoria=' . htmlspecialchars($categoria['id']);
            ?>
            <div class="col-xl-3 col-md-6 mt-4 mb-4 position-relative">
                <a href="<?= $link_categoria; ?>" style="text-decoration: none;">                    <div class="card border-left-primary shadow h-100 py-2">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs fw-bold text-primary text-uppercase mb-1">
                                        <?= htmlspecialchars($categoria['nome']); ?>
                                    </div>
                                    <div class="h6 mb-1 text-gray-800">Início: <?= htmlspecialchars(date('d/m/Y', strtotime($categoria['data_inicio']))); ?></div>
                                    <div class="text-xs text-muted">Formato: <?= htmlspecialchars($categoria['tipo_chaveamento']); ?></div>
                                    <div class="text-xs text-muted">Status: <span class="badge bg-primary rounded-pill"><?= htmlspecialchars($categoria['status']); ?></span></div>
                                    <div class="text-xs text-muted">Inscritos: <span class="badge bg-secondary"><?= htmlspecialchars($categoria['total_inscritos']); ?></span></div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-trophy fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </a>
                <!-- Edit button with pencil icon -->
                <button class="btn btn-sm btn-editar-campeonato position-absolute top-0 end-0 mx-4"
                        data-id="<?= htmlspecialchars($categoria['id']); ?>"
                        data-nome="<?= htmlspecialchars($categoria['nome']); ?>"
                        data-id-esporte="<?= htmlspecialchars($categoria['id_esporte']); ?>"
                        data-data-inicio="<?= htmlspecialchars($categoria['data_inicio']); ?>"
                        data-tipo-chaveamento="<?= htmlspecialchars($categoria['tipo_chaveamento']); ?>"
                        data-id-campeonato-pai="<?= htmlspecialchars($id_campeonato); ?>"
                        title="Editar Categoria">
                    <i class="fas fa-pen"></i>
                </button>
                <!-- Delete button with X icon -->
                <button class="btn btn-sm btn-excluir-campeonato position-absolute top-0 end-0 mx-1"
                        data-id="<?= htmlspecialchars($categoria['id']); ?>"
                        data-nome="<?= htmlspecialchars($categoria['nome']); ?>"
                        title="Excluir Categoria">
                    <i class="fas fa-times"></i>
                </button>

            </div>
        <?php endforeach; ?>
    <?php else: ?>
        <div class="col-12">
            <div class="card shadow h-100 py-2">
                <div class="card-body text-center">
                    <p class="text-muted">Nenhuma categoria cadastrada.</p>
                </div>
            </div>
        </div>
    <?php endif; ?>
</div>

<!-- Modal for editing championship -->
<div class="modal fade" id="modalEditarCampeonato" tabindex="-1" aria-labelledby="modalEditarCampeonatoLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <form id="formEditarCampeonato">
                <div class="modal-header">
                    <h5 class="modal-title" id="modalEditarCampeonatoLabel">Editar Categoria</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" name="id_campeonato" id="edit_id_campeonato">
                    <input type="hidden" name="id_campeonato_pai" id="edit_id_campeonato_pai" value="<?= htmlspecialchars($id_campeonato); ?>">
                    <div class="mb-3">
                        <label for="edit_nome" class="form-label">Nome da Categoria</label>
                        <input type="text" class="form-control" name="nome" id="edit_nome" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_id_esporte" class="form-label">Esporte</label>
                        <select name="id_esporte" id="edit_id_esporte" class="form-select" required>
                            <option value="">Selecione...</option>
                            <?php foreach ($esportes as $esporte): ?>
                                <option value="<?= htmlspecialchars($esporte['id']); ?>"><?= htmlspecialchars($esporte['nome']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="edit_data_inicio" class="form-label">Data de Início</label>
                        <input type="date" class="form-control" name="data_inicio" id="edit_data_inicio" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_tipo_chaveamento" class="form-label">Formato</label>
                        <select name="tipo_chaveamento" id="edit_tipo_chaveamento" class="form-select" required>
                            <option value="Mata-Mata">Mata-Mata</option>
                            <option value="Pontos Corridos">Pontos Corridos</option>
                            <option value="Pontos Corridos + Mata-Mata">Pontos Corridos + Mata-Mata</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Modal for creating new championship -->
<div class="modal fade" id="modalCampeonato" tabindex="-1" aria-labelledby="modalCampeonatoLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalCampeonatoLabel">Criar Nova Categoria</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="formCriarCampeonato">
                    <input type="hidden" name="id_campeonato_pai" value="<?= htmlspecialchars($id_campeonato); ?>">
                    <div class="mb-3">
                        <label class="form-label">Nome da Categoria</label>
                        <input type="text" class="form-control" name="nome" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Esporte</label>
                        <select name="id_esporte" class="form-select" required>
                            <option value="">Selecione...</option>
                            <?php foreach ($esportes as $esporte): ?>
                                <option value="<?= htmlspecialchars($esporte['id']); ?>"><?= htmlspecialchars($esporte['nome']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Data de Início</label>
                        <input type="date" class="form-control" name="data_inicio" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Formato</label>
                        <select name="tipo_chaveamento" class="form-select" required>
                            <option value="Mata-Mata">Mata-Mata</option>
                            <option value="Pontos Corridos">Pontos Corridos</option>
                            <option value="Pontos Corridos + Mata-Mata">Pontos Corridos + Mata-Mata</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btnSalvarCampeonato" form="formCriarCampeonato">Criar Categoria</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal for team registration -->
<div class="modal fade" id="modalInscricao" tabindex="-1" aria-labelledby="modalInscricaoLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalInscricaoLabel">Inscrever Equipe</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="formInscreverEquipe">
                    <input type="hidden" name="id_campeonato" id="id_campeonato_inscricao">
                    <div class="mb-3">
                        <label for="id_equipe_inscricao" class="form-label">Equipes Disponíveis</label>
                        <select class="form-select" name="id_equipe" id="id_equipe_inscricao" required></select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btnSalvarInscricao" form="formInscreverEquipe">Inscrever Equipe</button>
            </div>
        </div>
    </div>
</div>

<?php
// Session-based notifications
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
if (isset($_SESSION['notificacao'])) {
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
    ?>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3500,
                timerProgressBar: true,
                icon: '<?= htmlspecialchars($notificacao['tipo']); ?>',
                title: '<?= htmlspecialchars($notificacao['mensagem']); ?>'
            });
        });
    </script>
    <?php
}
?>

<?php require_once '../includes/footer_dashboard.php'; ?>

<script>
    document.addEventListener('DOMContentLoaded', () => {
        // Função para sanitizar strings e evitar XSS
        const sanitizar = (str) => {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        };

        // Função para exibir notificações com SweetAlert
        const mostrarNotificacao = (mensagem, tipo, callback = null) => {
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
                icon: tipo,
                title: sanitizar(mensagem)
            }).then(callback);
        };

        // Função genérica para enviar requisições AJAX
        const enviarRequisicao = async (url, method, body) => {
            try {
                const response = await fetch(url, {
                    method,
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: new URLSearchParams(body).toString()
                });
                if (!response.ok) {
                    throw new Error(`Erro HTTP ${response.status}`);
                }
                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Erro na requisição:', error);
                throw new Error('Ocorreu um problema de conexão.');
            }
        };

        // Inicializar modal para criar categoria
        const modalCampeonatoEl = document.getElementById('modalCampeonato');
        const modalCampeonato = new bootstrap.Modal(modalCampeonatoEl);
        const formCriarCampeonato = document.getElementById('formCriarCampeonato');

        document.getElementById('btnNovoCampeonato').addEventListener('click', () => {
            formCriarCampeonato.reset();
            modalCampeonato.show();
        });

        formCriarCampeonato.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(formCriarCampeonato);
            const nome = formData.get('nome').trim();
            if (!nome) {
                mostrarNotificacao('O nome da categoria é obrigatório.', 'error');
                return;
            }
            try {
                const data = await fetch('criar_campeonato_admin.php', {
                    method: 'POST',
                    body: formData
                }).then(res => res.json());
                if (data.status === 'success') {
                    modalCampeonato.hide();
                    mostrarNotificacao(data.message, 'success', () => location.reload());
                } else {
                    mostrarNotificacao(data.errors ? data.errors.join('<br>') : data.message, 'error');
                }
            } catch {
                mostrarNotificacao('Não foi possível criar a categoria.', 'error');
            }
        });

        // Inicializar modal para inscrição de equipe
        const modalInscricaoEl = document.getElementById('modalInscricao');
        const modalInscricao = modalInscricaoEl ? new bootstrap.Modal(modalInscricaoEl) : null;
        const formInscricao = document.getElementById('formInscreverEquipe');
        const selectEquipes = document.getElementById('id_equipe_inscricao');
        const todasAsEquipes = <?= json_encode($todas_as_equipes); ?>;

        if (modalInscricao && formInscricao) {
            document.querySelector('.row').addEventListener('click', (e) => {
                const inscreverButton = e.target.closest('.btn-inscrever-admin');
                if (inscreverButton) {
                    const campId = inscreverButton.dataset.idCampeonato;
                    const campNome = sanitizar(inscreverButton.dataset.nomeCampeonato);
                    const equipesInscritasStr = inscreverButton.dataset.equipesInscritas;
                    const equipesInscritasIds = equipesInscritasStr ? equipesInscritasStr.split(',') : [];

                    document.getElementById('id_campeonato_inscricao').value = campId;
                    document.getElementById('modalInscricaoLabel').textContent = `Inscrever equipe em: ${campNome}`;

                    selectEquipes.innerHTML = '<option value="">Selecione uma equipe...</option>';
                    let equipesDisponiveis = 0;
                    todasAsEquipes.forEach(equipe => {
                        if (!equipesInscritasIds.includes(String(equipe.id))) {
                            const option = new Option(sanitizar(equipe.nome), equipe.id);
                            selectEquipes.add(option);
                            equipesDisponiveis++;
                        }
                    });

                    if (equipesDisponiveis === 0) {
                        selectEquipes.innerHTML = '<option value="" disabled>Nenhuma equipe disponível</option>';
                    }

                    modalInscricao.show();
                }
            });

            formInscricao.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(formInscricao);
                const idEquipe = formData.get('id_equipe');
                if (!idEquipe) {
                    mostrarNotificacao('Selecione uma equipe.', 'error');
                    return;
                }
                try {
                    const data = await fetch('inscrever_equipe_admin.php', {
                        method: 'POST',
                        body: formData
                    }).then(res => res.json());
                    if (data.status === 'success') {
                        modalInscricao.hide();
                        mostrarNotificacao(data.message, 'success', () => location.reload());
                    } else {
                        mostrarNotificacao(data.message || 'Ocorreu um erro.', 'error');
                    }
                } catch {
                    mostrarNotificacao('Não foi possível inscrever a equipe.', 'error');
                }
            });
        }

        // Inicializar modal para editar categoria
        const modalEditarEl = document.getElementById('modalEditarCampeonato');
        const modalEditar = new bootstrap.Modal(modalEditarEl);
        const formEditar = document.getElementById('formEditarCampeonato');

        document.querySelector('.row').addEventListener('click', (e) => {
            const editarButton = e.target.closest('.btn-editar-campeonato');
            if (editarButton) {
                document.getElementById('edit_id_campeonato').value = editarButton.dataset.id;
                document.getElementById('edit_id_campeonato_pai').value = editarButton.dataset.idCampeonatoPai;
                document.getElementById('edit_nome').value = sanitizar(editarButton.dataset.nome);
                document.getElementById('edit_id_esporte').value = editarButton.dataset.idEsporte;
                document.getElementById('edit_data_inicio').value = editarButton.dataset.dataInicio;
                document.getElementById('edit_tipo_chaveamento').value = editarButton.dataset.tipoChaveamento;
                modalEditar.show();
            }
        });

        formEditar.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(formEditar);
            const nome = formData.get('nome').trim();
            if (!nome) {
                mostrarNotificacao('O nome da categoria é obrigatório.', 'error');
                return;
            }
            try {
                const data = await fetch('criar_campeonato_admin.php', {
                    method: 'POST',
                    body: formData
                }).then(res => res.json());
                if (data.status === 'success') {
                    modalEditar.hide();
                    mostrarNotificacao(data.message, 'success', () => location.reload());
                } else {
                    mostrarNotificacao(data.message || 'Não foi possível salvar a edição.', 'error');
                }
            } catch {
                mostrarNotificacao('Não foi possível salvar a edição.', 'error');
            }
        });

        // Função para excluir categoria
        document.querySelector('.row').addEventListener('click', (e) => {
            const excluirButton = e.target.closest('.btn-excluir-campeonato');
            if (excluirButton) {
                const campId = excluirButton.dataset.id;
                const campNome = sanitizar(excluirButton.dataset.nome);

                Swal.fire({
                    title: 'Confirmar Exclusão',
                    html: `Tem certeza que deseja excluir a categoria <strong>${campNome}</strong>? Esta ação não pode ser desfeita.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Excluir',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d'
                }).then(async (result) => {
                    if (result.isConfirmed) {
                        try {
                            const data = await enviarRequisicao('excluir_campeonato_admin.php', 'POST', {
                                id_campeonato: campId
                            });
                            if (data.status === 'success') {
                                mostrarNotificacao(data.message, 'success', () => location.reload());
                            } else {
                                mostrarNotificacao(data.message || 'Não foi possível excluir a categoria.', 'error');
                            }
                        } catch {
                            mostrarNotificacao('Não foi possível excluir a categoria.', 'error');
                        }
                    }
                });
            }
        });
    });
</script>