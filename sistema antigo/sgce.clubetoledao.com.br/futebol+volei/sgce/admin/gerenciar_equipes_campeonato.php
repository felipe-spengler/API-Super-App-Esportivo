<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// Inicia a sessão para notificações
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Valida o ID do campeonato na URL
if (!isset($_GET['id_categoria']) || !is_numeric($_GET['id_categoria'])) {
    die("Campeonato não especificado.");
}

$id_categoria = $_GET['id_categoria'];

// Busca o nome do campeonato
$sql_campeonato = "
    SELECT 
        c.nome as nome_campeonato,
        c.id_campeonato_pai,
        cp.nome as nome_campeonato_pai
    FROM campeonatos c
    LEFT JOIN campeonatos cp ON(c.id_campeonato_pai=cp.id)
    WHERE c.id = ?
";
$stmt_campeonato = $pdo->prepare($sql_campeonato);
$stmt_campeonato->execute([$id_categoria]);
$campeonato = $stmt_campeonato->fetch(PDO::FETCH_ASSOC);

if (!$campeonato) {
    die("Campeonato não encontrado.");
}

// Busca as equipes associadas ao campeonato
$sql_equipes = "
    SELECT 
        e.id, e.nome, e.cidade, e.brasao,
        u.nome AS nome_lider,
        s.nome AS nome_esporte
    FROM equipes e
    JOIN usuarios u ON e.id_lider = u.id
    JOIN esportes s ON e.id_esporte = s.id
    JOIN campeonatos_equipes ce ON e.id = ce.id_equipe
    WHERE ce.id_campeonato = ?
    ORDER BY e.nome ASC
";
$stmt_equipes = $pdo->prepare($sql_equipes);
$stmt_equipes->execute([$id_categoria]);
$equipes = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);

// Busca todas as equipes disponíveis (não associadas ao campeonato) para o modal de adição
$sql_equipes_disponiveis = "
    SELECT e.id, e.nome
    FROM equipes e
    WHERE e.id NOT IN (
        SELECT ce.id_equipe 
        FROM campeonatos_equipes ce 
        WHERE ce.id_campeonato = ?
    )
    ORDER BY e.nome ASC
";
$stmt_equipes_disponiveis = $pdo->prepare($sql_equipes_disponiveis);
$stmt_equipes_disponiveis->execute([$id_categoria]);
$equipes_disponiveis = $stmt_equipes_disponiveis->fetchAll(PDO::FETCH_ASSOC);

require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonato <?php echo htmlspecialchars($campeonato['nome_campeonato_pai']); ?></a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos_categoria.php?id_campeonato=<?= htmlspecialchars($campeonato['id_campeonato_pai']) ?>">Gerenciar Categorias</a></li>
        <li class="breadcrumb-item"><a href="categoria.php?id_categoria=<?= htmlspecialchars($id_categoria) ?>">Categoria <?php echo htmlspecialchars($campeonato['nome_campeonato']); ?></a></li>
        <li class="breadcrumb-item active" aria-current="page">Gerenciar Equipes do Campeonato</li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-users fa-fw me-2"></i>Gerenciar Equipes do Campeonato</h1>
    <button type="button" class="btn btn-success btn-sm" id="btnAdicionarEquipe" data-bs-toggle="modal" data-bs-target="#modalAdicionarEquipe">
        <i class="fas fa-plus me-2"></i>Adicionar Equipe ao Campeonato
    </button>
</div>

<div class="row g-3" id="equipes-container">
    <?php if (count($equipes) > 0): ?>
        <?php foreach ($equipes as $equipe): ?>
            <div class="col-md-6 col-lg-4">
                <div class="card h-100 shadow-sm">
                    <div class="card-body d-flex justify-content-center align-items-center">
                        <div class="text-center" style="width: 100%;">
                            <img src="<?= $equipe['brasao'] ? '../public/brasoes/' . htmlspecialchars($equipe['brasao']) : '../assets/img/brasao_default.png' ?>" 
                                 alt="Brasão de <?= htmlspecialchars($equipe['nome']) ?>" 
                                 class="img-fluid  mb-2" 
                                 style="width: 80px; height: 80px; object-fit: cover;">
                            <span class="fw-bold d-block">Equipe: <?= htmlspecialchars($equipe['nome']) ?></span>
                            <span class="fw-bold d-block">Líder Técnico: <?= htmlspecialchars($equipe['nome_lider']) ?></span>
                            <span class="fw-bold d-block">Esporte: <?= htmlspecialchars($equipe['nome_esporte']) ?></span>
                        </div>
                    </div>
                    <div class="card-footer d-flex justify-content-center">
                        <button type="button" class="btn btn-sm  btn-excluir-equipe position-absolute top-0 end-0 me-1" 
                                data-id-equipe="<?= $equipe['id'] ?>" 
                                data-id-campeonato="<?= $id_categoria ?>" 
                                data-nome-equipe="<?= htmlspecialchars($equipe['nome']) ?>" 
                                title="Remover Equipe do Campeonato">
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
                    <p class="text-muted">Nenhuma equipe associada a este campeonato.</p>
                </div>
            </div>
        </div>
    <?php endif; ?>
</div>

<!-- Modal para Adicionar Equipe ao Campeonato -->
<div class="modal fade" id="modalAdicionarEquipe" tabindex="-1" aria-labelledby="modalAdicionarEquipeLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalAdicionarEquipeLabel">Adicionar Equipe ao Campeonato</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formAdicionarEquipe">
                    <input type="hidden" name="id_campeonato" value="<?= htmlspecialchars($id_categoria) ?>">
                    <div class="mb-3">
                        <label for="add_id_equipe" class="form-label">Selecionar Equipe</label>
                        <select class="form-control" id="add_id_equipe" name="id_equipe" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($equipes_disponiveis as $equipe): ?>
                                <option value="<?= $equipe['id'] ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
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
        <?php unset($_SESSION['notificacao']); ?>
    });
</script>
<?php endif; ?>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const modalAdd = new bootstrap.Modal(document.getElementById('modalAdicionarEquipe'));
    const formAdd = document.getElementById('formAdicionarEquipe');
    const equipesContainer = document.getElementById('equipes-container');

    // Handle Delete Button
    equipesContainer.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.btn-excluir-equipe');
        if (deleteButton) {
            const equipeId = deleteButton.dataset.idEquipe;
            const campeonatoId = deleteButton.dataset.idCampeonato;
            const equipeNome = deleteButton.dataset.nomeEquipe;
            Swal.fire({
                title: 'Tem certeza?',
                html: `Deseja remover a equipe <strong>${equipeNome}</strong> deste campeonato?<br>Esta ação remove apenas a associação com o campeonato.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sim, remover!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch('remover_equipe_campeonato.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `id_equipe=${equipeId}&id_campeonato=${campeonatoId}`
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'success') {
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
                                text: data.message || 'Não foi possível remover a equipe.'
                            });
                        }
                    })
                    .catch(() => Swal.fire('Erro!', 'Ocorreu um problema de conexão.', 'error'));
                }
            });
        }
    });

    // Handle Add Form Submission
    document.getElementById('btnSalvarNovaEquipe').addEventListener('click', () => {
        const formData = new FormData(formAdd);
        fetch('adicionar_equipe_campeonato.php', {
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
                    text: data.message || 'Não foi possível adicionar a equipe ao campeonato.'
                });
            }
        })
        .catch(() => Swal.fire('Erro!', 'Ocorreu um problema de conexão.', 'error'));
    });
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>