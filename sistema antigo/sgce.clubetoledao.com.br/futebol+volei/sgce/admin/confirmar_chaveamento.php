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
    WHERE ce.id_campeonato = ? ORDER BY e.nome ASC
");
$stmt_equipes->execute([$id_campeonato]);
$todas_equipes_inscritas = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);

if (count($todas_equipes_inscritas) < 2) {
    $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'É necessário ter pelo menos 2 equipes inscritas.'];
    header("Location: gerenciar_campeonatos.php");
    exit();
}

// Verifica se o número de equipes é ímpar para a lógica do "bye"
$necessita_bye = (count($todas_equipes_inscritas) % 2 != 0);

// Geração inicial das partidas (se for par)
$partidas_propostas = [];
$equipes_para_jogar = $todas_equipes_inscritas;

if (!$necessita_bye) {
    shuffle($equipes_para_jogar);
    for ($i = 0; $i < count($equipes_para_jogar); $i += 2) {
        $partidas_propostas[] = [
            'id_a' => $equipes_para_jogar[$i]['id'],
            'nome_a' => $equipes_para_jogar[$i]['nome'],
            'brasao_a' => $equipes_para_jogar[$i]['brasao'],
            'id_b' => $equipes_para_jogar[$i + 1]['id'],
            'nome_b' => $equipes_para_jogar[$i + 1]['nome'],
            'brasao_b' => $equipes_para_jogar[$i + 1]['brasao'],
            'data_partida' => '',
            'local_partida' => '',
            'fase' => 'Chaveamento'
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
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos_categoria.php?id_campeonato=<?= htmlspecialchars($id_campeonato) ?>">Gerenciar Categorias</a></li>
        <li class="breadcrumb-item active" aria-current="page">Revisar Chaveamento</li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-sitemap fa-fw me-2"></i>Revisar Chaveamento</h1>
</div>

<div class="alert alert-info">
    <h4 class="alert-heading">Revise os Confrontos</h4>
    <p>Abaixo estão os confrontos propostos para o chaveamento. Você pode editar, excluir ou adicionar novas partidas.</p>
</div>

<?php if ($necessita_bye): ?>
<div class="card mb-4 border-success">
    <div class="card-header bg-success text-white">
        <i class="fas fa-star me-2"></i>Avanço Direto (Bye)
    </div>
    <div class="card-body">
        <p>Há um número ímpar de equipes. Selecione qual equipe deve avançar para a próxima fase sem jogar nesta rodada.</p>
        <label for="equipe_com_bye" class="form-label fw-bold">Equipe a avançar:</label>
        <select name="equipe_com_bye" id="equipe_com_bye" class="form-select" required>
            <option value="">Selecione uma equipe...</option>
            <?php foreach ($todas_equipes_inscritas as $equipe): ?>
                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
            <?php endforeach; ?>
        </select>
    </div>
</div>
<?php endif; ?>

<div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span>Confrontos Propostos para: <strong><?= htmlspecialchars($nome_campeonato) ?></strong></span>
        <button type="button" class="btn btn-success btn-sm" id="btnAdicionarPartida">
            <i class="fas fa-plus me-2"></i>Adicionar Novo Confronto
        </button>
    </div>
    <div class="card-body">
        <form action="salvar_partidas.php" method="POST" id="formChaveamento">
            <input type="hidden" name="id_campeonato" value="<?= $id_campeonato ?>">
            <div class="row g-3" id="partidas-container">
                <?php if (!$necessita_bye): ?>
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
                                             class="img-fluid mb-2" 
                                             style="width: 60px; height: 60px; object-fit: cover;">
                                        <span class="fw-bold d-block"><?= htmlspecialchars($partida['nome_a']) ?></span>
                                    </div>
                                    
                                    <span class="mx-2 fs-5 text-muted">vs</span>

                                    <div class="text-center" style="width: 120px;">
                                        <img src="<?= $partida['brasao_b'] ? '../public/brasoes/' . htmlspecialchars($partida['brasao_b']) : '../assets/img/brasao_default.png' ?>" 
                                             alt="Brasão de <?= htmlspecialchars($partida['nome_b']) ?>"
                                             class="img-fluid mb-2" 
                                             style="width: 60px; height: 60px; object-fit: cover;">
                                        <span class="fw-bold d-block"><?= htmlspecialchars($partida['nome_b']) ?></span>
                                    </div>
                                </div>
                                <div class="card-footer d-flex justify-content-center">
                                    <button type="button" class="btn     btn-sm btn-editar-partida me-2 position-absolute top-0 end-0 px-3 me-4" 
                                            data-partida='<?= json_encode($partida) ?>' 
                                            title="Editar Confronto">
                                        <i class="fas fa-pen"></i>
                                    </button>
                                    <button type="button" class="btn     btn-sm btn-excluir-partida position-absolute top-0 end-0 px-3 me-2" 
                                            data-id-partida="<?= $index ?>" 
                                            data-nome-partida="<?= htmlspecialchars($partida['nome_a'] . ' vs ' . $partida['nome_b']) ?>" 
                                            title="Excluir Confronto">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <p class="text-center text-muted" id="placeholder-partidas">Selecione a equipe com "bye" para gerar os confrontos.</p>
                <?php endif; ?>
            </div>
            
            <div class="d-flex justify-content-end mt-4">
                <a href="gerenciar_campeonatos.php" class="btn btn-secondary me-2">Cancelar</a>
                <button type="submit" class="btn btn-success" id="btnConfirmarPartidas"><i class="fas fa-check-circle me-2"></i>Confirmar e Gerar Partidas</button>
            </div>
        </form>
    </div>
</div>

<!-- Edit Match Modal -->
<div class="modal fade" id="modalPartida" tabindex="-1" aria-labelledby="modalPartidaLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalPartidaLabel">Editar Confronto</h5>
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
                            <?php foreach ($todas_equipes_inscritas as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="equipe_b" class="form-label">Equipe B</label>
                        <select class="form-control" id="equipe_b" name="equipe_b" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($todas_equipes_inscritas as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn     btn-editar-partida" id="btnSalvarPartida">Salvar Alterações</button>
            </div>
        </div>
    </div>
</div>

<!-- Add Match Modal -->
<div class="modal fade" id="modalAdicionarPartida" tabindex="-1" aria-labelledby="modalAdicionarPartidaLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalAdicionarPartidaLabel">Adicionar Novo Confronto</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formAdicionarPartida">
                    <div class="mb-3">
                        <label for="add_equipe_a" class="form-label">Equipe A</label>
                        <select class="form-control" id="add_equipe_a" name="equipe_a" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($todas_equipes_inscritas as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="add_equipe_b" class="form-label">Equipe B</label>
                        <select class="form-control" id="add_equipe_b" name="equipe_b" required>
                            <option value="">Selecione uma equipe</option>
                            <?php foreach ($todas_equipes_inscritas as $equipe): ?>
                                <option value="<?= htmlspecialchars($equipe['id']) ?>"><?= htmlspecialchars($equipe['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn    " id="btnSalvarNovaPartida">Adicionar</button>
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
    const formChaveamento = document.getElementById('formChaveamento');
    const partidasContainer = document.getElementById('partidas-container');
    const selectBye = document.getElementById('equipe_com_bye');
    const placeholderPartidas = document.getElementById('placeholder-partidas');

    // Team data for badge lookup
    const equipes = <?= json_encode(array_column($todas_equipes_inscritas, null, 'id')) ?>;

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
        modalAddLabel.textContent = 'Adicionar Novo Confronto';
        btnSalvarAdd.textContent = 'Adicionar';
        modalAdd.show();
    });

    // Handle Edit Button
    partidasContainer.addEventListener('click', (e) => {
        const editButton = e.target.closest('.btn-editar-partida');
        if (editButton) {
            resetEditForm();
            const partidaData = JSON.parse(editButton.dataset.partida);
            const index = editButton.closest('.card').parentElement.querySelector('input[name*="[equipe_a]"]').name.match(/\d+/)[0];
            document.getElementById('partida_index').value = index;
            selectEquipeA.value = partidaData.id_a;
            selectEquipeB.value = partidaData.id_b;
            modalEditLabel.textContent = 'Editar Confronto: ' + partidaData.nome_a + ' vs ' + partidaData.nome_b;
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
        const hiddenEquipeA = formChaveamento.querySelector(`input[name="partidas[${index}][equipe_a]"]`);
        const hiddenEquipeB = formChaveamento.querySelector(`input[name="partidas[${index}][equipe_b]"]`);
        const hiddenData = formChaveamento.querySelector(`input[name="partidas[${index}][data_partida]"]`);
        const hiddenLocal = formChaveamento.querySelector(`input[name="partidas[${index}][local_partida]"]`);
        const hiddenFase = formChaveamento.querySelector(`input[name="partidas[${index}][fase]"]`);

        if (hiddenEquipeA && hiddenEquipeB && hiddenData && hiddenLocal && hiddenFase) {
            hiddenEquipeA.value = equipeA;
            hiddenEquipeB.value = equipeB;

            // Update card display
            const card = formChaveamento.querySelector(`input[name="partidas[${index}][equipe_a]"]`).closest('.card');
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
                title: 'Confronto atualizado com sucesso!'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Não foi possível atualizar o confronto.'
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
        const existingIndices = Array.from(formChaveamento.querySelectorAll('input[name*="[equipe_a]"]'))
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
                    <input type="hidden" name="partidas[${newIndex}][fase]" value="Chaveamento">
                    <div class="text-center" style="width: 120px;">
                        <img src="${brasaoA ? `../public/brasoes/${brasaoA}` : '../assets/img/brasao_default.png'}" 
                             alt="Brasão de ${nomeA}" 
                             class="img-fluid mb-2" 
                             style="width: 60px; height: 60px; object-fit: cover;">
                        <span class="fw-bold d-block">${nomeA}</span>
                    </div>
                    <span class="mx-2 fs-5 text-muted">vs</span>
                    <div class="text-center" style="width: 120px;">
                        <img src="${brasaoB ? `../public/brasoes/${brasaoB}` : '../assets/img/brasao_default.png'}" 
                             alt="Brasão de ${nomeB}"
                             class="img-fluid mb-2" 
                             style="width: 60px; height: 60px; object-fit: cover;">
                        <span class="fw-bold d-block">${nomeB}</span>
                    </div>
                </div>
                <div class="card-footer d-flex justify-content-center">
                    <button type="button" class="btn     btn-sm btn-editar-partida me-2 position-absolute top-0 end-0 px-3 me-4" 
                            data-partida='${JSON.stringify({
                                id_a: equipeA,
                                nome_a: nomeA,
                                brasao_a: brasaoA,
                                id_b: equipeB,
                                nome_b: nomeB,
                                brasao_b: brasaoB,
                                data_partida: '',
                                local_partida: '',
                                fase: 'Chaveamento'
                            })}' 
                            title="Editar Confronto">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button type="button" class="btn     btn-sm btn-excluir-partida position-absolute top-0 end-0 px-3 me-2" 
                            data-id-partida="${newIndex}" 
                            data-nome-partida="${nomeA} vs ${nomeB}" 
                            title="Excluir Confronto">
                        <i class="fas fa-times"></i>
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
            title: 'Confronto adicionado com sucesso!'
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
                html: `Deseja excluir o confronto <strong>${partidaNome}</strong>?<br>Esta ação não pode ser desfeita.`,
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
                        title: 'Confronto removido da tabela!'
                    });
                }
            });
        }
    });

    // Handle Bye Selection
    if (selectBye) {
        selectBye.addEventListener('change', () => {
            const idEquipeBye = selectBye.value;

            if (!idEquipeBye) {
                partidasContainer.innerHTML = '<p class="text-center text-muted" id="placeholder-partidas">Selecione a equipe com "bye" para gerar os confrontos.</p>';
                return;
            }

            placeholderPartidas.style.display = 'none';

            // Filtra as equipes que irão jogar
            let equipesParaJogar = equipes.filter(equipe => equipe.id != idEquipeBye);

            // Embaralha as equipes
            equipesParaJogar = equipesParaJogar.sort(() => Math.random() - 0.5);

            // Gera as partidas
            let html = '';
            for (let i = 0; i < equipesParaJogar.length; i += 2) {
                const equipeA = equipesParaJogar[i];
                const equipeB = equipesParaJogar[i + 1];
                const index = i / 2;

                html += `
                    <div class="col-md-6 col-lg-4">
                        <div class="card h-100 shadow-sm">
                            <div class="card-body d-flex justify-content-around align-items-center">
                                <input type="hidden" name="partidas[${index}][equipe_a]" value="${equipeA.id}">
                                <input type="hidden" name="partidas[${index}][equipe_b]" value="${equipeB.id}">
                                <input type="hidden" name="partidas[${index}][data_partida]" value="">
                                <input type="hidden" name="partidas[${index}][local_partida]" value="">
                                <input type="hidden" name="partidas[${index}][fase]" value="Chaveamento">
                                <div class="text-center" style="width: 120px;">
                                    <img src="${equipeA.brasao ? `../public/brasoes/${equipeA.brasao}` : '../assets/img/brasao_default.png'}" 
                                         alt="Brasão de ${equipeA.nome}" 
                                         class="img-fluid mb-2" 
                                         style="width: 60px; height: 60px; object-fit: cover;">
                                    <span class="fw-bold d-block">${equipeA.nome}</span>
                                </div>
                                <span class="mx-2 fs-5 text-muted">vs</span>
                                <div class="text-center" style="width: 120px;">
                                    <img src="${equipeB.brasao ? `../public/brasoes/${equipeB.brasao}` : '../assets/img/brasao_default.png'}" 
                                         alt="Brasão de ${equipeB.nome}"
                                         class="img-fluid mb-2" 
                                         style="width: 60px; height: 60px; object-fit: cover;">
                                    <span class="fw-bold d-block">${equipeB.nome}</span>
                                </div>
                            </div>
                            <div class="card-footer d-flex justify-content-center">
                                <button type="button" class="btn     btn-sm btn-editar-partida me-2 position-absolute top-0 end-0 px-3 me-4" 
                                        data-partida='${JSON.stringify({
                                            id_a: equipeA.id,
                                            nome_a: equipeA.nome,
                                            brasao_a: equipeA.brasao,
                                            id_b: equipeB.id,
                                            nome_b: equipeB.nome,
                                            brasao_b: equipeB.brasao,
                                            data_partida: '',
                                            local_partida: '',
                                            fase: 'Chaveamento'
                                        })}' 
                                        title="Editar Confronto">
                                    <i class="fas fa-pen"></i>
                                </button>
                                <button type="button" class="btn     btn-sm btn-excluir-partida position-absolute top-0 end-0 px-3 me-2" 
                                        data-id-partida="${index}" 
                                        data-nome-partida="${equipeA.nome} vs ${equipeB.nome}" 
                                        title="Excluir Confronto">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    </div>`;
            }
            partidasContainer.innerHTML = html;
        });
    }
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>