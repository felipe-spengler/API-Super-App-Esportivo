<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// Start session for notifications
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}  

// Initialize notification variable
$notificacao = null;

// Validate championship ID
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['id_campeonato'])) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Nenhum campeonato especificado.'];
    header("Location: gerenciar_campeonatos.php");
    exit();
}
$id_campeonato = $_POST['id_campeonato'];

// Fetch championship details
$stmt_camp = $pdo->prepare("SELECT nome FROM campeonatos WHERE id = ?");
$stmt_camp->execute([$id_campeonato]);
$nome_campeonato = $stmt_camp->fetchColumn();

if ($nome_campeonato === false) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Campeonato não encontrado.'];
    header("Location: gerenciar_campeonatos.php");
    exit();
}

// Fetch teams with their badges
$stmt_equipes = $pdo->prepare("
    SELECT e.id, e.nome, e.brasao 
    FROM equipes e 
    JOIN campeonatos_equipes ce ON e.id = ce.id_equipe 
    WHERE ce.id_campeonato = ?
");
$stmt_equipes->execute([$id_campeonato]);
$equipes = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);

if (count($equipes) < 2) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'É necessário ter pelo menos 2 equipes inscritas para gerar a tabela de jogos.'];
    header("Location: gerenciar_campeonatos.php");
    exit();
}

// Generate round-robin matches
$partidas_propostas = [];
for ($i = 0; $i < count($equipes); $i++) {
    for ($j = $i + 1; $j < count($equipes); $j++) {
        $partidas_propostas[] = [
            'id_a' => $equipes[$i]['id'],
            'nome_a' => $equipes[$i]['nome'],
            'brasao_a' => $equipes[$i]['brasao'],
            'id_b' => $equipes[$j]['id'],
            'nome_b' => $equipes[$j]['nome'],
            'brasao_b' => $equipes[$j]['brasao'],
            'data_partida' => '',
            'local_partida' => '',
            'fase' => 'Fase de Grupos'
        ];
    }
}

// Handle notifications from session
if (isset($_SESSION['notificacao'])) {
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
}

require_once '../includes/header.php';
require_once 'sidebar.php';
?>


<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonatos</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos_categoria.php?id_campeonato=<?= htmlspecialchars($id_campeonato ) ?>">Gerenciar Categorias</a></li>
        <li class="breadcrumb-item"><a href="categoria.php?id_categoria=<?= htmlspecialchars($id_campeonato) ?>">Categoria <?php echo htmlspecialchars($campeonato['nome_campeonato']); ?></a></li>
        <li class="breadcrumb-item active" aria-current="page">Gerar Tabela de Jogos</li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-list-ol fa-fw me-2"></i>Gerar Tabela de Jogos (Pontos Corridos)</h1>
</div>

<div class="alert alert-info">
    Abaixo está a tabela de jogos "todos contra todos" (turno único) gerada para este campeonato. Clique em confirmar para salvar as partidas.
</div>

<div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span>Tabela de Jogos para: <strong><?= htmlspecialchars($nome_campeonato) ?></strong></span>
        <button type="button" class="btn btn-success btn-sm" id="btnAdicionarPartida">
            <i class="fas fa-plus me-2"></i>Adicionar Nova Partida
        </button>
    </div>
    <div class="card-body">
        <form action="salvar_partidas.php" method="POST" id="formPartidas">
            <input type="hidden" name="id_campeonato" value="<?= $id_campeonato ?>">
            <div class="row g-3" id="partidas-container">
                <?php foreach ($partidas_propostas as $index => $partida): ?>
                    <div class="col-md-6 col-lg-4">
                        <div class="card h-100 shadow-sm">
                            <div class="card-body d-flex justify-content-around align-items-center">
                                <input type="hidden" name="partidas[<?= $index ?>][equipe_a]" value="<?= $partida['id_a'] ?>">
                                <input type="hidden" name="partidas[<?= $index ?>][equipe_b]" value="<?= $partida['id_b'] ?>">
                                <input type="hidden" name="partidas[<?= $index ?>][data_partida]" value="<?= htmlspecialchars($partida['data_partida']) ?>">
                                <input type="hidden" name="partidas[<?= $index ?>][local_partida]" value="<?= htmlspecialchars($partida['local_partida']) ?>">
                                <input type="hidden" name="partidas[<?= $index ?>][fase]" value="<?= htmlspecialchars($partida['fase']) ?>">

                                <div class="text-center" style="width: 120px;">
                                    <img src="<?= $partida['brasao_a'] ? '../public/brasoes/' . htmlspecialchars($partida['brasao_a']) : '../assets/img/brasao_default.png' ?>" 
                                         alt="Brasão de <?= htmlspecialchars($partida['nome_a']) ?>" 
                                         class="img-fluid     mb-2" 
                                         style="width: 60px; height: 60px; object-fit: cover;">
                                    <span class="fw-bold d-block"><?= htmlspecialchars($partida['nome_a']) ?></span>
                                </div>
                                
                                <span class="mx-2 fs-5 text-muted">vs</span>

                                <div class="text-center" style="width: 120px;">
                                    <img src="<?= $partida['brasao_b'] ? '../public/brasoes/' . htmlspecialchars($partida['brasao_b']) : '../assets/img/brasao_default.png' ?>" 
                                         alt="Brasão de <?= htmlspecialchars($partida['nome_b']) ?>"
                                         class="img-fluid     mb-2" 
                                         style="width: 60px; height: 60px; object-fit: cover;">
                                    <span class="fw-bold d-block"><?= htmlspecialchars($partida['nome_b']) ?></span>
                                </div>
                            </div>
                            <div class="card-footer d-flex justify-content-center">
                                <button type="button" class="btn  btn-sm btn-editar-partida me-2 position-absolute top-0 end-0 px-3 me-4" 
                                        data-partida='<?= json_encode($partida) ?>' 
                                        title="Editar Partida">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button type="button" class="btn  btn-sm btn-excluir-partida position-absolute top-0 end-0 px-3 me-2" 
                                        data-id-partida="<?= $index ?>" 
                                        data-nome-partida="<?= htmlspecialchars($partida['nome_a'] . ' vs ' . $partida['nome_b']) ?>" 
                                        title="Excluir Partida">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
            
            <div class="d-flex justify-content-end mt-4">
                <a href="gerenciar_campeonatos.php" class="btn btn-secondary me-2">Cancelar</a>
                <button type="submit" class="btn btn-success"><i class="fas fa-check-circle me-2"></i>Confirmar e Gerar Tabela</button>
            </div>
        </form>
    </div>
</div>

<!-- Edit Match Modal -->
<div class="modal fade" id="modalPartida" tabindex="-1" aria-labelledby="modalPartidaLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalPartidaLabel">Editar Partida</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formPartida">
                    <input type="hidden" name="index" id="partida_index">
                    <input type="hidden" name="id_campeonato" value="<?= $id_campeonato ?>">
                    <div class="mb-3">
                        <label for="equipe_a" class="form-label">Equipe A</label>
                        <select class="form-control" id="equipe_a" name="equipe_a" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($equipes as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="equipe_b" class="form-label">Equipe B</label>
                        <select class="form-control" id="equipe_b" name="equipe_b" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($equipes as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary btn-editar-partida" id="btnSalvarPartida">Salvar Alterações</button>
            </div>
        </div>
    </div>
</div>

<!-- Add Match Modal -->
<div class="modal fade" id="modalAdicionarPartida" tabindex="-1" aria-labelledby="modalAdicionarPartidaLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalAdicionarPartidaLabel">Adicionar Nova Partida</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formAdicionarPartida">
                    <div class="mb-3">
                        <label for="add_equipe_a" class="form-label">Equipe A</label>
                        <select class="form-control" id="add_equipe_a" name="equipe_a" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($equipes as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="add_equipe_b" class="form-label">Equipe B</label>
                        <select class="form-control" id="add_equipe_b" name="equipe_b" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($equipes as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" id="btnSalvarNovaPartida">Adicionar</button>
            </div>
        </div>
    </div>
</div>

<?php if ($notificacao): ?>
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
// Ensure SweetAlert2 is included (should be in header.php)
document.addEventListener('DOMContentLoaded', () => {
    // Edit Modal
    const modalEditEl = document.getElementById('modalPartida');
    const modalEdit = new bootstrap.Modal(modalEditEl);
    const modalEditLabel = document.getElementById('modalPartidaLabel');
    const btnSalvarEdit = document.getElementById('btnSalvarPartida');
    const formEdit = document.getElementById('formPartida');
    const selectEquipeA = document.getElementById('equipe_a');
    const selectEquipeB = document.getElementById('equipe_b');

    // Add Modal
    const modalAddEl = document.getElementById('modalAdicionarPartida');
    const modalAdd = new bootstrap.Modal(modalAddEl);
    const modalAddLabel = document.getElementById('modalAdicionarPartidaLabel');
    const btnSalvarAdd = document.getElementById('btnSalvarNovaPartida');
    const formAdd = document.getElementById('formAdicionarPartida');
    const selectAddEquipeA = document.getElementById('add_equipe_a');
    const selectAddEquipeB = document.getElementById('add_equipe_b');
    const formPartidas = document.getElementById('formPartidas');
    const partidasContainer = document.getElementById('partidas-container');

    // Team data for badge lookup
    const equipes = <?= json_encode(array_column($equipes, null, 'id')) ?>;

    // Function to update dropdown options to prevent same team selection
    const updateDropdownOptions = (selectA, selectB) => {
        const equipeAValue = selectA.value;
        const equipeBValue = selectB.value;
        Array.from(selectB.options).forEach(option => {
            option.disabled = option.value === equipeAValue && option.value !== '';
        });
        Array.from(selectA.options).forEach(option => {
            option.disabled = option.value === equipeBValue && option.value !== '';
        });
    };

    // Reset Edit Form
    const resetEditForm = () => {
        formEdit.reset();
        document.getElementById('partida_index').value = '';
        selectEquipeA.value = '';
        selectEquipeB.value = '';
        updateDropdownOptions(selectEquipeA, selectEquipeB);
    };

    // Reset Add Form
    const resetAddForm = () => {
        formAdd.reset();
        selectAddEquipeA.value = '';
        selectAddEquipeB.value = '';
        updateDropdownOptions(selectAddEquipeA, selectAddEquipeB);
    };

    // Dropdown event listeners for Edit Modal
    selectEquipeA.addEventListener('change', () => updateDropdownOptions(selectEquipeA, selectEquipeB));
    selectEquipeB.addEventListener('change', () => updateDropdownOptions(selectEquipeA, selectEquipeB));

    // Dropdown event listeners for Add Modal
    selectAddEquipeA.addEventListener('change', () => updateDropdownOptions(selectAddEquipeA, selectAddEquipeB));
    selectAddEquipeB.addEventListener('change', () => updateDropdownOptions(selectAddEquipeA, selectAddEquipeB));

    // Open Add Modal
    document.getElementById('btnAdicionarPartida').addEventListener('click', () => {
        resetAddForm();
        modalAddLabel.textContent = 'Adicionar Nova Partida';
        btnSalvarAdd.textContent = 'Adicionar';
        modalAdd.show();
    });

    const editButton = e.target.closest('.btn-editar-partida');
    // Handle Edit Button
    partidasContainer.addEventListener('click', (e) => {
        if (editButton) {
            resetEditForm();
            const partidaData = JSON.parse(editButton.dataset.partida);
            const index = editButton.closest('.card').parentElement.querySelector('input[name*="[equipe_a]"]').name.match(/\d+/)[0];
            document.getElementById('partida_index').value = index;
            selectEquipeA.value = partidaData.id_a;
            selectEquipeB.value = partidaData.id_b;
            modalEditLabel.textContent = 'Editar Partida: ' + partidaData.nome_a + ' vs ' + partidaData.nome_b;
            btnSalvarEdit.textContent = 'Salvar Alterações';
            updateDropdownOptions(selectEquipeA, selectEquipeB);
            modalEdit.show();
        }
    });

    // Handle Edit Form Submission (Client-side only)
    btnSalvarEdit.addEventListener('click', () => {
        const equipeA = selectEquipeA.value;
        const equipeB = selectEquipeB.value;
        const index = document.getElementById('partida_index').value;

        // Validate that teams are different
        if (!equipeA || !equipeB) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Selecione ambas as equipes.'
            });
            return;
        }
        if (equipeA === equipeB) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'As equipes A e B não podem ser iguais.'
            });
            return;
        }

        // Update hidden inputs in the main form
        const hiddenEquipeA = formPartidas.querySelector(`input[name="partidas[${index}][equipe_a]"]`);
        const hiddenEquipeB = formPartidas.querySelector(`input[name="partidas[${index}][equipe_b]"]`);
        const hiddenData = formPartidas.querySelector(`input[name="partidas[${index}][data_partida]"]`);
        const hiddenLocal = formPartidas.querySelector(`input[name="partidas[${index}][local_partida]"]`);
        const hiddenFase = formPartidas.querySelector(`input[name="partidas[${index}][fase]"]`);

        if (hiddenEquipeA && hiddenEquipeB && hiddenData && hiddenLocal && hiddenFase) {
            hiddenEquipeA.value = equipeA;
            hiddenEquipeB.value = equipeB;

            // Update card display
            const card = formPartidas.querySelector(`input[name="partidas[${index}][equipe_a]"]`).closest('.card');
            const nomeA = selectEquipeA.options[selectEquipeA.selectedIndex].text;
            const nomeB = selectEquipeB.options[selectEquipeB.selectedIndex].text;
            const brasaoA = equipes[equipeA]?.brasao || '';
            const brasaoB = equipes[equipeB]?.brasao || '';
            card.querySelector('.text-center:nth-child(1) img').src = brasaoA ? `../public/brasoes/${brasaoA}` : '../assets/img/brasao_default.png';
            card.querySelector('.text-center:nth-child(1) img').alt = `Brasão de ${nomeA}`;
            card.querySelector('.text-center:nth-child(1) span').textContent = nomeA;
            card.querySelector('.text-center:nth-child(3) img').src = brasaoB ? `../public/brasoes/${brasaoB}` : '../assets/img/brasao_default.png';
            card.querySelector('.text-center:nth-child(3) img').alt = `Brasão de ${nomeB}`;
            card.querySelector('.text-center:nth-child(3) span').textContent = nomeB;
            card.querySelector('.btn-excluir-partida').dataset.nomePartida = `${nomeA} vs ${nomeB}`;
            card.querySelector('.btn-editar-partida').dataset.partida = JSON.stringify({
                id_a: equipeA,
                nome_a: nomeA,
                brasao_a: brasaoA,
                id_b: equipeB,
                nome_b: nomeB,
                brasao_b: brasaoB,
                data_partida: hiddenData.value,
                local_partida: hiddenLocal.value,
                fase: hiddenFase.value
            });

            modalEdit.hide();
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                icon: 'success',
                title: 'Partida atualizada com sucesso!'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Não foi possível atualizar a partida.'
            });
        }
    });

    // Handle Add Form Submission (Client-side only)
    btnSalvarAdd.addEventListener('click', () => {
        const equipeA = selectAddEquipeA.value;
        const equipeB = selectAddEquipeB.value;

        // Validate that teams are different
        if (!equipeA || !equipeB) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Selecione ambas as equipes.'
            });
            return;
        }
        if (equipeA === equipeB) {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'As equipes A e B não podem ser iguais.'
            });
            return;
        }

        // Find the next available index
        const existingIndices = Array.from(formPartidas.querySelectorAll('input[name*="[equipe_a]"]'))
            .map(input => parseInt(input.name.match(/\d+/)[0]));
        const newIndex = existingIndices.length ? Math.max(...existingIndices) + 1 : 0;

        // Get team details
        const nomeA = selectAddEquipeA.options[selectAddEquipeA.selectedIndex].text;
        const nomeB = selectAddEquipeB.options[selectAddEquipeB.selectedIndex].text;
        const brasaoA = equipes[equipeA]?.brasao || '';
        const brasaoB = equipes[equipeB]?.brasao || '';

        // Create new card
        const newCard = document.createElement('div');
        newCard.className = 'col-md-6 col-lg-4';
        newCard.innerHTML = `
            <div class="card h-100 shadow-sm">
                <div class="card-body d-flex justify-content-around align-items-center">
                    <input type="hidden" name="partidas[${newIndex}][equipe_a]" value="${equipeA}">
                    <input type="hidden" name="partidas[${newIndex}][equipe_b]" value="${equipeB}">
                    <input type="hidden" name="partidas[${newIndex}][data_partida]" value="">
                    <input type="hidden" name="partidas[${newIndex}][local_partida]" value="">
                    <input type="hidden" name="partidas[${newIndex}][fase]" value="Fase de Grupos">
                    <div class="text-center" style="width: 120px;">
                        <img src="${brasaoA ? `../public/brasoes/${brasaoA}` : '../assets/img/brasao_default.png'}" 
                             alt="Brasão de ${nomeA}" 
                             class="img-fluid     mb-2" 
                             style="width: 60px; height: 60px; object-fit: cover;">
                        <span class="fw-bold d-block">${nomeA}</span>
                    </div>
                    <span class="mx-2 fs-5 text-muted">vs</span>
                    <div class="text-center" style="width: 120px;">
                        <img src="${brasaoB ? `../public/brasoes/${brasaoB}` : '../assets/img/brasao_default.png'}" 
                             alt="Brasão de ${nomeB}"
                             class="img-fluid     mb-2" 
                             style="width: 60px; height: 60px; object-fit: cover;">
                        <span class="fw-bold d-block">${nomeB}</span>
                    </div>
                </div>
                <div class="card-footer d-flex justify-content-center">
                    <button type="button" class="btn btn-primary btn-sm btn-editar-partida me-2" 
                            data-partida='${JSON.stringify({
                                id_a: equipeA,
                                nome_a: nomeA,
                                brasao_a: brasaoA,
                                id_b: equipeB,
                                nome_b: nomeB,
                                brasao_b: brasaoB,
                                data_partida: '',
                                local_partida: '',
                                fase: 'Fase de Grupos'
                            })}' 
                            title="Editar Partida">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button type="button" class="btn btn-danger btn-sm btn-excluir-partida" 
                            data-id-partida="${newIndex}" 
                            data-nome-partida="${nomeA} vs ${nomeB}" 
                            title="Excluir Partida">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;

        // Add new card to the top
        partidasContainer.prepend(newCard);

        modalAdd.hide();
        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            icon: 'success',
            title: 'Partida adicionada com sucesso!'
        });
    });

    // Handle Delete Button
    partidasContainer.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.btn-excluir-partida');
        if (deleteButton) {
            const partidaId = deleteButton.dataset.idPartida;
            const partidaNome = deleteButton.dataset.nomePartida;
            Swal.fire({
                title: 'Tem certeza?',
                html: `Deseja excluir a partida <strong>${partidaNome}</strong>?<br>Esta ação não pode ser desfeita.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sim, excluir!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    deleteButton.closest('.col-md-6').remove();
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 2000,
                        icon: 'success',
                        title: 'Partida removida da tabela!'
                    });
                }
            });
        }
    });
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>