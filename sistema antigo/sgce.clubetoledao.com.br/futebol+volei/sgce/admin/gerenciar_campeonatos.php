<?php
// Habilitar exibição de erros para depuração (remova em produção)
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';



// Fetch all sports for the create championship modal
try {
    $esportes = $pdo->query("SELECT * FROM esportes ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Erro ao buscar esportes: " . $e->getMessage());
}

// Fetch all teams for the team registration modal
try {
    $todas_as_equipes = $pdo->query("SELECT id, nome FROM equipes ORDER BY nome ASC")->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Erro ao buscar equipes: " . $e->getMessage());
}

// Query to fetch championships and their enrolled participants
try {
    $stmt_campeonatos = $pdo->query("
        SELECT 
            c.*, 
            e.nome AS esporte_nome,
            COUNT(DISTINCT COALESCE(pa.id)) AS total_inscritos,
            GROUP_CONCAT(ce.id_equipe) AS equipes_inscritas_ids
        FROM campeonatos c
        JOIN esportes e ON c.id_esporte = e.id
        LEFT JOIN campeonatos_equipes ce ON c.id = ce.id_campeonato
        LEFT JOIN campeonatos categoria ON categoria.id_campeonato_pai = c.id
        LEFT JOIN partidas p ON p.id_campeonato = c.id OR p.id_campeonato = categoria.id
        LEFT JOIN participantes pa ON (pa.id_equipe = p.id_equipe_a || pa.id_equipe = p.id_equipe_b)
        WHERE c.id_campeonato_pai IS NULL
        GROUP BY c.id
        ORDER BY c.id DESC, c.data_criacao DESC
    ");
    $campeonatos = $stmt_campeonatos->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Erro na consulta de campeonatos: " . $e->getMessage());
}

// Group championships by parent (id_campeonato_pai IS NULL)
$campeonatos_pais = [];
$campeonatos_filhos = [];
foreach ($campeonatos as $camp) {
    if (is_null($camp['id_campeonato_pai'])) {
        $campeonatos_pais[$camp['id']] = $camp;
    } else {
        $campeonatos_filhos[$camp['id_campeonato_pai']][] = $camp;
    }
}

require_once '../includes/header.php';
require_once 'sidebar.php';
?>
<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonatos</a></li>
    </ol>
</nav>
<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-trophy fa-fw me-2"></i>Gerenciar Campeonatos</h1>
    <button type="button" class="btn btn-success" id="btnNovoCampeonato">
        <i class="fas fa-plus me-2"></i>Criar Novo Campeonato
    </button>
</div>

<div class="row">
    <?php if (count($campeonatos_pais) > 0): ?>
        <?php foreach ($campeonatos_pais as $pai): ?>
            <div class="col-xl-3 col-md-6 mt-4 mb-4 position-relative">
                <a href="gerenciar_campeonatos_categoria.php?id_campeonato=<?= $pai['id'] ?>" style="text-decoration: none;">
                    <div class="card border-left-primary shadow h-100 py-2" data-bs-toggle="collapse" data-bs-target="#filhos-<?= $pai['id'] ?>">
                        <div class="card-body">
                            <div class="row no-gutters align-items-center">
                                <div class="col mr-2">
                                    <div class="text-xs fw-bold text-primary text-uppercase mb-1">
                                        <?= htmlspecialchars($pai['nome']) ?>
                                    </div>
                                    <div class="h6 mb-1 text-gray-800">Início: <?= date('d/m/Y', strtotime($pai['data_inicio'])) ?></div>
                                    <div class="text-xs text-muted">Formato: <?= htmlspecialchars($pai['tipo_chaveamento']) ?></div>
                                    <div class="text-xs text-muted">Status: <span class="badge bg-primary rounded-pill"><?= htmlspecialchars($pai['status']) ?></span></div>
                                    <div class="text-xs text-muted">Inscritos: <span class="badge bg-secondary"><?= $pai['total_inscritos'] ?></span></div>
                                </div>
                                <div class="col-auto">
                                    <i class="fas fa-trophy fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </a>
                <!-- "X" button for deletion -->
                <button class="btn btn-sm btn-excluir-campeonato position-absolute top-0 end-0 ps-2 me-1"
                        data-id="<?= $pai['id'] ?>"
                        data-nome="<?= htmlspecialchars($pai['nome']) ?>"
                        title="Excluir Campeonato">
                    <i class="fas fa-times"></i>
                </button>
                <button class="btn btn-sm btn-editar-campeonato position-absolute top-0 end-0 px-1 me-4"
                        data-id="<?= $pai['id'] ?>"
                        data-nome="<?= htmlspecialchars($pai['nome']) ?>"
                        data-id-esporte="<?= $pai['id_esporte'] ?>"
                        data-data-inicio="<?= $pai['data_inicio'] ?>"
                        data-tipo-chaveamento="<?= $pai['tipo_chaveamento'] ?>"
                        title="Editar Campeonato">
                    <i class="fas fa-pen"></i>
                </button>
            </div>
        <?php endforeach; ?>
    <?php else: ?>
        <div class="col-12">
            <div class="card shadow h-100 py-2">
                <div class="card-body text-center">
                    <p class="text-muted">Nenhum campeonato cadastrado.</p>
                </div>
            </div>
        </div>
    <?php endif; ?>
</div>

<!-- Modal for creating sub-championship -->
<div class="modal fade" id="modalCadastrarFilho" tabindex="-1" aria-labelledby="modalCadastrarFilhoLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <form id="formCadastrarFilho">
                <div class="modal-header">
                    <h5 class="modal-title" id="modalCadastrarFilhoLabel">Cadastrar Sub-Campeonato</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                </div>
                <div class="modal-body">
                    <input type="hidden" name="id_campeonato_pai" id="id_campeonato_pai_filho" value="">
                    <div class="mb-3">
                        <label for="nome_filho" class="form-label">Nome do Sub-Campeonato</label>
                        <input type="text" class="form-control" name="nome" id="nome_filho" required>
                    </div>
                    <div class="mb-3">
                        <label for="id_esporte_filho" class="form-label">Esporte</label>
                        <select name="id_esporte" id="id_esporte_filho" class="form-select" required>
                            <option value="">Selecione...</option>
                            <?php foreach ($esportes as $esporte): ?>
                                <option value="<?= $esporte['id'] ?>"><?= htmlspecialchars($esporte['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label for="data_inicio_filho" class="form-label">Data de Início</label>
                        <input type="date" name="data_inicio" id="data_inicio_filho" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label for="tipo_chaveamento_filho" class="form-label">Formato</label>
                        <select name="tipo_chaveamento" id="tipo_chaveamento_filho" class="form-select" required>
                            <option value="Mata-Mata">Mata-Mata</option>
                            <option value="Pontos Corridos">Pontos Corridos</option>
                            <option value="Pontos Corridos + Mata-Mata">Pontos Corridos + Mata-Mata</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Sub-Campeonato</button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Modal for editing championship -->
<div class="modal fade" id="modalEditarCampeonato" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Editar Campeonato</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="formEditarCampeonato">
                    <input type="hidden" name="id_campeonato" id="edit_id_campeonato">
                    <div class="mb-3">
                        <label class="form-label">Nome do Campeonato</label>
                        <input type="text" class="form-control" name="nome" id="edit_nome" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Esporte</label>
                        <select name="id_esporte" id="edit_id_esporte" class="form-select" required>
                            <option value="">Selecione...</option>
                            <?php foreach ($esportes as $esporte): ?>
                                <option value="<?= $esporte['id'] ?>"><?= htmlspecialchars($esporte['nome']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Data de Início</label>
                        <input type="date" class="form-control" name="data_inicio" id="edit_data_inicio" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Formato</label>
                        <select name="tipo_chaveamento" id="edit_tipo_chaveamento" class="form-select" required>
                            <option value="Mata-Mata">Mata-Mata</option>
                            <option value="Pontos Corridos">Pontos Corridos</option>
                            <option value="Pontos Corridos + Mata-Mata">Pontos Corridos + Mata-Mata</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="submit" class="btn btn-primary" form="formEditarCampeonato">Salvar Alterações</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal for creating new championship -->
<div class="modal fade" id="modalCampeonato" tabindex="-1" aria-labelledby="modalCampeonatoLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalCampeonatoLabel">Criar Novo Campeonato</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="formCriarCampeonato">
                    <div class="mb-3">
                        <label class="form-label">Nome do Campeonato</label>
                        <input type="text" class="form-control" name="nome" required>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Esporte</label>
                        <select name="id_esporte" class="form-select" required>
                            <option value="">Selecione...</option>
                            <?php foreach ($esportes as $esporte): ?>
                                <option value="<?= $esporte['id'] ?>"><?= htmlspecialchars($esporte['nome']) ?></option>
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
                <button type="submit" class="btn btn-primary" id="btnSalvarCampeonato" form="formCriarCampeonato">Criar Campeonato</button>
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
if (session_status() === PHP_SESSION_NONE) { session_start(); }
if (isset($_SESSION['notificacao'])) {
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
    echo "<script>
        document.addEventListener('DOMContentLoaded', () => {
            Swal.fire({
                toast: true, position: 'top-end', showConfirmButton: false, timer: 3500, timerProgressBar: true,
                icon: '{$notificacao['tipo']}',
                title: `{$notificacao['mensagem']}`
            });
        });
    </script>";
}
?>

<?php require_once '../includes/footer_dashboard.php'; ?>

<script>
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modal for creating championship
    const modalCampeonatoEl = document.getElementById('modalCampeonato');
    const modalCampeonato = new bootstrap.Modal(modalCampeonatoEl);
    const formCriarCampeonato = document.getElementById('formCriarCampeonato');
    document.getElementById('btnNovoCampeonato').addEventListener('click', () => {
        formCriarCampeonato.reset();
        modalCampeonato.show();
    });

    formCriarCampeonato.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(formCriarCampeonato);
        fetch('criar_campeonato_admin.php', { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    modalCampeonato.hide();
                    Swal.fire({
                        toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
                        icon: 'success', title: data.message
                    }).then(() => location.reload());
                } else {
                    Swal.fire({ icon: 'error', title: 'Erro', html: data.errors.join('<br>') });
                }
            }).catch(err => Swal.fire('Erro!', 'Ocorreu um problema de conexão.', 'error'));
    });

    // Initialize modal for team registration
    const modalInscricaoEl = document.getElementById('modalInscricao');
    const modalInscricao = new bootstrap.Modal(modalInscricaoEl);
    const selectEquipes = document.getElementById('id_equipe_inscricao');
    const formInscricao = document.getElementById('formInscreverEquipe');
    const todasAsEquipes = <?= json_encode($todas_as_equipes) ?>;

    document.querySelector('.row').addEventListener('click', (e) => {
        const inscreverButton = e.target.closest('.btn-inscrever-admin');
        if (inscreverButton) {
            const campId = inscreverButton.dataset.idCampeonato;
            const campNome = inscreverButton.dataset.nomeCampeonato;
            const equipesInscritasStr = inscreverButton.dataset.equipesInscritas;
            const equipesInscritasIds = equipesInscritasStr ? equipesInscritasStr.split(',') : [];

            document.getElementById('id_campeonato_inscricao').value = campId;
            document.getElementById('modalInscricaoLabel').textContent = `Inscrever equipe em: ${campNome}`;

            selectEquipes.innerHTML = '<option value="">Selecione uma equipe...</option>';
            let equipesDisponiveis = 0;
            todasAsEquipes.forEach(equipe => {
                if (!equipesInscritasIds.includes(String(equipe.id))) {
                    const option = new Option(equipe.nome, equipe.id);
                    selectEquipes.add(option);
                    equipesDisponiveis++;
                }
            });

            if (equipesDisponiveis === 0) {
                selectEquipes.innerHTML = '<option value="" disabled>Nenhuma equipe disponível</option>';
            }

            modalInscricao.show();
        }

        // Handle delete championship button click
        const excluirButton = e.target.closest('.btn-excluir-campeonato');
        if (excluirButton) {
            const campId = excluirButton.dataset.id;
            const campNome = excluirButton.dataset.nome;

            Swal.fire({
                title: 'Confirmar Exclusão',
                html: `Tem certeza que deseja excluir o campeonato <strong>${campNome}</strong>? Esta ação não pode ser desfeita.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Excluir',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#dc3545',
                cancelButtonColor: '#6c757d'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch('excluir_campeonato_admin.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: `id_campeonato=${campId}`
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
                                text: data.message || 'Não foi possível excluir o campeonato.'
                            });
                        }
                    })
                    .catch(() => Swal.fire('Erro!', 'Ocorreu um problema de conexão.', 'error'));
                }
            });
        }
    });

    formInscricao.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(formInscricao);
        
        fetch('inscrever_equipe_admin.php', { method: 'POST', body: formData })
            .then(response => {
                if (!response.ok) { throw new Error('Erro de rede ou do servidor.'); }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    modalInscricao.hide();
                    Swal.fire({
                        toast: true, position: 'top-end', showConfirmButton: false, timer: 2000,
                        icon: 'success', title: data.message
                    }).then(() => location.reload());
                } else {
                    Swal.fire({ icon: 'error', title: 'Falha na Inscrição', text: data.message || 'Ocorreu um erro.' });
                }
            })
            .catch(error => {
                console.error('Erro na requisição Fetch:', error);
                Swal.fire('Erro!', 'Não foi possível processar a solicitação.', 'error');
            });
    });

    // Initialize modal for editing championship
    const modalEditar = new bootstrap.Modal(document.getElementById('modalEditarCampeonato'));
    const formEditar = document.getElementById('formEditarCampeonato');

    document.querySelector('.row').addEventListener('click', e => {
        const btn = e.target.closest('.btn-editar-campeonato');
        if (btn) {
            document.getElementById('edit_id_campeonato').value = btn.dataset.id;
            document.getElementById('edit_nome').value = btn.dataset.nome;
            document.getElementById('edit_id_esporte').value = btn.dataset.idEsporte;
            document.getElementById('edit_data_inicio').value = btn.dataset.dataInicio;
            document.getElementById('edit_tipo_chaveamento').value = btn.dataset.tipoChaveamento;
            modalEditar.show();
        }
    });

    formEditar.addEventListener('submit', e => {
        e.preventDefault();
        const formData = new FormData(formEditar);

        fetch('criar_campeonato_admin.php', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                modalEditar.hide();
                Swal.fire({
                    toast: true, position: 'top-end', icon: 'success',
                    title: data.message, timer: 2000, showConfirmButton: false
                }).then(() => location.reload());
            } else {
                Swal.fire({ icon: 'error', title: 'Erro', text: data.message });
            }
        })
        .catch(() => Swal.fire('Erro!', 'Não foi possível salvar a edição.', 'error'));
    });

    // Initialize modal for creating sub-championship
    const modalFilhoEl = document.getElementById('modalCadastrarFilho');
    const modalFilho = new bootstrap.Modal(modalFilhoEl);
    const formFilho = document.getElementById('formCadastrarFilho');

    document.querySelectorAll('.btn-cadastrar-filho').forEach(btn => {
        btn.addEventListener('click', () => {
            const idPai = btn.getAttribute('data-id-campeonato');
            const nomePai = btn.getAttribute('data-nome-campeonato');

            document.getElementById('id_campeonato_pai_filho').value = idPai;
            document.getElementById('modalCadastrarFilhoLabel').textContent = `Cadastrar Sub-Campeonato para: ${nomePai}`;
            formFilho.reset();

            modalFilho.show();
        });
    });

    formFilho.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(formFilho);

        fetch('criar_campeonato_admin.php', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                modalFilho.hide();
                Swal.fire({
                    icon: 'success',
                    title: data.message,
                    toast: true,
                    position: 'top-end',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => location.reload());
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    html: (data.errors || [data.message]).join('<br>')
                });
            }
        })
        .catch(() => {
            Swal.fire('Erro', 'Não foi possível salvar o sub-campeonato.', 'error');
        });
    });
});
</script>