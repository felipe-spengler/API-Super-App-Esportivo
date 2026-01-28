<?php
// Enable error reporting for debugging (remove in production)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// Validate id_categoria from GET
$id_categoria = filter_var($_GET['id_categoria'] ?? null, FILTER_VALIDATE_INT);
if (!$id_categoria) {
    header('Location: menu_campeonato_categoria_equipe.php');
    exit;
}

try {
    // Fetch category details and parent championship
    $stmt_categoria = $pdo->prepare("
        SELECT 
            c.id, 
            c.nome AS nome_categoria, 
            c.id_campeonato_pai, 
            cp.nome AS nome_campeonato_pai,
            e.nome AS esporte_nome,
            c.data_inicio,
            c.tipo_chaveamento,
            c.status
        FROM campeonatos c
        LEFT JOIN campeonatos cp ON c.id_campeonato_pai = cp.id
        JOIN esportes e ON c.id_esporte = e.id
        WHERE c.id = ?
    ");
    $stmt_categoria->execute([$id_categoria]);
    $categoria = $stmt_categoria->fetch(PDO::FETCH_ASSOC);
    
    if (!$categoria) {
        header('Location: menu_campeonato_categoria_equipe.php');
        exit;
    }

    // Fetch teams associated with the category
    $stmt_equipes = $pdo->prepare("
        SELECT 
            e.id, 
            e.nome, 
            e.sigla, 
            e.cidade, 
            e.brasao,
            e.id_lider,
            e.id_esporte,
            u.nome AS nome_lider,
            s.nome AS nome_esporte,
            COUNT(p.id) AS total_participantes
        FROM equipes e
        JOIN campeonatos_equipes ce ON e.id = ce.id_equipe
        JOIN usuarios u ON e.id_lider = u.id
        JOIN esportes s ON e.id_esporte = s.id
        LEFT JOIN participantes p ON e.id = p.id_equipe
        WHERE ce.id_campeonato = ?
        GROUP BY e.id
        ORDER BY e.nome ASC
    ");
    $stmt_equipes->execute([$id_categoria]);
    $equipes = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    // Log error to file
    error_log("Database Error: " . $e->getMessage());
    die("A database error occurred. Please contact the administrator.");
}

require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="menu_campeonato_categoria_equipe.php">Equipes por Campeonato <?php echo htmlspecialchars($categoria['nome_campeonato_pai']); ?></a></li>
        <li class="breadcrumb-item active" aria-current="page">
            <a href="menu_categoria_equipe.php?id_campeonato=<?php echo htmlspecialchars($categoria['id_campeonato_pai']); ?>">
                Equipes por Campeonato/Categoria <?php echo htmlspecialchars($categoria['nome_categoria']); ?>
            </a>
        </li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-users fa-fw me-2"></i>Gerenciar Equipes</h1>
    <button type="button" class="btn btn-success btn-sm" id="btnAdicionarEquipe">
        <i class="fas fa-plus me-2"></i>Adicionar Nova Equipe
    </button>
</div>

<div class="row g-3" id="equipes-container">
    <?php if (count($equipes) > 0): ?>
        <?php foreach ($equipes as $equipe): ?>
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 shadow-sm position-relative">
                    <a href="editar_equipe_admin.php?id=<?= $equipe['id'] ?>" class="text-decoration-none">
                        <div class="card-body d-flex justify-content-center align-items-center">
                            <div class="text-center" style="width: 100%;">
                                <img src="<?= $equipe['brasao'] ? '../public/brasoes/' . htmlspecialchars($equipe['brasao']) : '../assets/img/brasao_default.png' ?>" 
                                     alt="Brasão de <?= htmlspecialchars($equipe['nome']) ?>" 
                                     class="img-fluid mb-2" 
                                     style="width: 80px; height: 80px; object-fit: cover;">
                                <span class="fw-bold d-block">Equipe: <?= htmlspecialchars($equipe['nome']) ?></span>
                                <span class="fw-bold d-block">Lider Técnico: <?= htmlspecialchars($equipe['nome_lider']) ?></span>
                                <span class="fw-bold d-block">Esporte: <?= htmlspecialchars($equipe['nome_esporte']) ?></span>
                            </div>
                        </div>
                    </a>
                    <div class="position-absolute top-0 end-0 p-2">
                        <button type="button" class="btn btn-sm btn-editar-equipe me-2" 
                                data-equipe='<?= json_encode([
                                    'id' => $equipe['id'], 
                                    'nome' => $equipe['nome'], 
                                    'sigla' => $equipe['sigla'], 
                                    'cidade' => $equipe['cidade'], 
                                    'id_lider' => $equipe['id_lider'], 
                                    'id_esporte' => $equipe['id_esporte'], 
                                    'brasao' => $equipe['brasao']
                                ]) ?>' 
                                title="Editar Equipe">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-excluir-equipe" 
                                data-id-equipe="<?= $equipe['id'] ?>" 
                                data-nome-equipe="<?= htmlspecialchars($equipe['nome']) ?>" 
                                data-id-categoria="<?= $id_categoria ?>" 
                                title="Excluir Equipe">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    <?php else: ?>
        <div class="col-12">
            <div class="card shadow h-100 py-2">
                <div class="card-body text-center">
                    <p class="text-muted">Nenhuma equipe cadastrada.</p>
                </div>
            </div>
        </div>
    <?php endif; ?>
</div>

<!-- Edit Team Modal -->
<div class="modal fade" id="modalEditarEquipe" tabindex="-1" aria-labelledby="modalEditarEquipeLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalEditarEquipeLabel">Editar Equipe</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formEditarEquipe">
                    <input type="hidden" name="id_equipe" id="edit_id_equipe">
                    <div class="mb-3">
                        <label for="edit_nome_equipe" class="form-label">Nome da Equipe</label>
                        <input type="text" class="form-control" id="edit_nome_equipe" name="nome" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_sigla_equipe" class="form-label">Sigla da Equipe</label>
                        <input type="text" class="form-control" id="edit_sigla_equipe" name="sigla" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_cidade_equipe" class="form-label">Cidade</label>
                        <input type="text" class="form-control" id="edit_cidade_equipe" name="cidade" required>
                    </div>
                    <div class="mb-3">
                        <label for="edit_lider_equipe" class="form-label">Líder Técnico</label>
                        <select class="form-control" id="edit_lider_equipe" name="id_lider" required>
                            <option value="">Selecione um líder</option>
                            <?php
                            // Fetch available leaders (usuarios)
                            $stmt_lideres = $pdo->query("SELECT id, nome FROM usuarios ORDER BY nome ASC");
                            while ($lider = $stmt_lideres->fetch(PDO::FETCH_ASSOC)) {
                                echo "<option value='{$lider['id']}'>" . htmlspecialchars($lider['nome']) . "</option>";
                            }
                            ?>
                        </select>
                    </div>
                      <div class="mb-3">
                        <a href="gerenciar_usuarios.php" class="btn btn-primary btn-sm" >
                            <i class="fas fa-crog me-2"></i>Gerenciar Líderes de Equipe
                        </a>
                    </div>
                    <div class="mb-3">
                        <label for="edit_esporte_equipe" class="form-label">Esporte</label>
                        <select class="form-control" id="edit_esporte_equipe" name="id_esporte" required>
                            <option value="">Selecione um esporte</option>
                            <?php
                            // Fetch available sports (esportes)
                            $stmt_esportes = $pdo->query("SELECT id, nome FROM esportes ORDER BY nome ASC");
                            while ($esporte = $stmt_esportes->fetch(PDO::FETCH_ASSOC)) {
                                echo "<option value='{$esporte['id']}'>" . htmlspecialchars($esporte['nome']) . "</option>";
                            }
                            ?>
                        </select>
                    </div>
                  
                    <div class="mb-3">
                        <label for="edit_brasao_equipe" class="form-label">Brasão da Equipe (Imagem)</label>
                        <input type="file" class="form-control" id="edit_brasao_equipe" name="brasao" accept="image/*">
                        <small class="form-text text-muted">Deixe em branco para manter o brasão atual.</small>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" id="btnSalvarEquipe">Salvar Alterações</button>
            </div>
        </div>
    </div>
</div>

<!-- Add Team Modal -->
<div class="modal fade" id="modalAdicionarEquipe" tabindex="-1" aria-labelledby="modalAdicionarEquipeLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalAdicionarEquipeLabel">Adicionar Nova Equipe</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formAdicionarEquipe">
                    <input type="hidden" name="id_campeonato" value="<?= $id_categoria ?>">
                    <div class="mb-3">
                        <label for="add_nome_equipe" class="form-label">Nome da Equipe</label>
                        <input type="text" class="form-control" id="add_nome_equipe" name="nome" required>
                    </div>
                    <div class="mb-3">
                        <label for="add_sigla_equipe" class="form-label">Sigla da Equipe</label>
                        <input type="text" class="form-control" id="add_sigla_equipe" name="sigla" required>
                    </div>
                    <div class="mb-3">
                        <label for="add_cidade_equipe" class="form-label">Cidade</label>
                        <input type="text" class="form-control" id="add_cidade_equipe" name="cidade" required>
                    </div>
                    <div class="mb-3">
                        <label for="add_lider_equipe" class="form-label">Líder Técnico</label>
                        <select class="form-control" id="add_lider_equipe" name="id_lider" required>
                            <option value="">Selecione um líder</option>
                            <?php
                            // Fetch available leaders (usuarios)
                            $stmt_lideres = $pdo->query("SELECT id, nome FROM usuarios ORDER BY nome ASC");
                            while ($lider = $stmt_lideres->fetch(PDO::FETCH_ASSOC)) {
                                echo "<option value='{$lider['id']}'>" . htmlspecialchars($lider['nome']) . "</option>";
                            }
                            ?>
                        </select>
                    </div>
                     <div class="mb-3">
                        <a href="gerenciar_usuarios.php" class="btn btn-primary btn-sm" >
                            <i class="fas fa-crog me-2"></i>Gerenciar Líderes de Equipe
                        </a>
                    </div>

                    <div class="mb-3">
                        <label for="add_esporte_equipe" class="form-label">Esporte</label>
                        <select class="form-control" id="add_esporte_equipe" name="id_esporte" required>
                            <option value="">Selecione um esporte</option>
                            <?php
                            // Fetch available sports (esportes)
                            $stmt_esportes = $pdo->query("SELECT id, nome FROM esportes ORDER BY nome ASC");
                            while ($esporte = $stmt_esportes->fetch(PDO::FETCH_ASSOC)) {
                                echo "<option value='{$esporte['id']}'>" . htmlspecialchars($esporte['nome']) . "</option>";
                            }
                            ?>
                        </select>
                    </div>
                   
                    <div class="mb-3">
                        <label for="add_brasao_equipe" class="form-label">Brasão da Equipe (Imagem)</label>
                        <input type="file" class="form-control" id="add_brasao_equipe" name="brasao" accept="image/*">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" id="btnSalvarNovaEquipe">Adicionar</button>
            </div>
        </div>
    </div>
</div>

<?php if (isset($_SESSION['notificacao'])): ?>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            icon: '<?= htmlspecialchars($_SESSION['notificacao']['tipo']) ?>',
            title: '<?= addslashes($_SESSION['notificacao']['mensagem']) ?>'
        });
    });
    <?php unset($_SESSION['notificacao']); ?>
</script>
<?php endif; ?>

<script>
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modals
    const modalEditEl = document.getElementById('modalEditarEquipe');
    const modalEdit = new bootstrap.Modal(modalEditEl);
    const modalAddEl = document.getElementById('modalAdicionarEquipe');
    const modalAdd = new bootstrap.Modal(modalAddEl);
    const formEdit = document.getElementById('formEditarEquipe');
    const formAdd = document.getElementById('formAdicionarEquipe');
    const equipesContainer = document.getElementById('equipes-container');

    // Open Add Modal
    document.getElementById('btnAdicionarEquipe').addEventListener('click', () => {
        formAdd.reset();
        modalAdd.show();
    });

    // Handle Edit Button
    equipesContainer.addEventListener('click', (e) => {
        const editButton = e.target.closest('.btn-editar-equipe');
        if (editButton) {
            e.preventDefault(); // Prevent link navigation
            const equipeData = JSON.parse(editButton.dataset.equipe);
            document.getElementById('edit_id_equipe').value = equipeData.id;
            document.getElementById('edit_nome_equipe').value = equipeData.nome;
            document.getElementById('edit_sigla_equipe').value = equipeData.sigla;
            document.getElementById('edit_cidade_equipe').value = equipeData.cidade;
            document.getElementById('edit_lider_equipe').value = equipeData.id_lider;
            document.getElementById('edit_esporte_equipe').value = equipeData.id_esporte;
            modalEdit.show();
        }
    });

    // Handle Delete Button
    equipesContainer.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.btn-excluir-equipe');
        if (deleteButton) {
            e.preventDefault(); // Prevent link navigation
            const equipeId = deleteButton.dataset.idEquipe;
            const equipeNome = deleteButton.dataset.nomeEquipe;
            const idCategoria = deleteButton.dataset.idCategoria;
            Swal.fire({
                title: 'Tem certeza?',
                html: `Deseja excluir a equipe <strong>${equipeNome}</strong>?<br>Esta ação não pode ser desfeita.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sim, excluir!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch(`excluir_equipe_admin.php?id=${equipeId}&id_categoria=${idCategoria}`, {
                        method: 'POST'
                    })
                    .then(()=>location.reload())
                }
            });
        }
    });

    // Handle Add Form Submission
    document.getElementById('btnSalvarNovaEquipe').addEventListener('click', () => {
        const formData = new FormData(formAdd);
        fetch('salvar_equipe_admin.php', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                modalAdd.hide();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    icon: 'success',
                    title: data.message
                }).then(() => location.reload());
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    html: data.errors ? data.errors.join('<br>') : 'Não foi possível adicionar a equipe.'
                });
            }
        })
        .catch(() => Swal.fire('Erro!', 'Ocorreu um problema de conexão.', 'error'));
    });

    // Handle Edit Form Submission
    document.getElementById('btnSalvarEquipe').addEventListener('click', () => {
        const formData = new FormData(formEdit);
        fetch('editar_equipe_admin.php', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                modalEdit.hide();
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    icon: 'success',
                    title: data.message
                }).then(() => location.reload());
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    html: data.errors ? data.errors.join('<br>') : 'Não foi possível editar a equipe.'
                });
            }
        })
        .catch(() => Swal.fire('Erro!', 'Ocorreu um problema de conexão.', 'error'));
    });
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>