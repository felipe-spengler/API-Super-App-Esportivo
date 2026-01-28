<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// Validate id_categoria from GET
$id_categoria = isset($_GET['id_categoria']) ? filter_var($_GET['id_categoria'], FILTER_VALIDATE_INT) : null;

// Prepare statement to prevent SQL injection
$stmt_campeonatos = $pdo->prepare("
    SELECT 
        c.*, 
        COUNT(ce.id_equipe) as total_inscritos,
        GROUP_CONCAT(ce.id_equipe) as equipes_inscritas_ids
    FROM campeonatos c 
    LEFT JOIN campeonatos_equipes ce ON c.id = ce.id_campeonato
    WHERE c.id = ?
    GROUP BY c.id
");
$stmt_campeonatos->execute([$id_categoria]);
$campeonatos = $stmt_campeonatos->fetchAll(PDO::FETCH_ASSOC);

// Check if championship exists
if (!$campeonatos) {
    echo "Campeonato não encontrado.";
    exit;
}

// Get first championship (since we're querying by ID)
$campeonato = $campeonatos[0];

// Fetch all teams for the inscription dropdown
$stmt_equipes = $pdo->prepare("SELECT id, nome FROM equipes ORDER BY nome ASC");
$stmt_equipes->execute();
$todas_as_equipes = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);

require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonatos</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos_categoria.php?id_campeonato=<?= htmlspecialchars($campeonato['id_campeonato_pai']) ?>">Gerenciar Categorias</a></li>
        <li class="breadcrumb-item active" aria-current="page">Categoria <?= htmlspecialchars($campeonato['nome']) ?></li>
    </ol>
</nav>

<div class="row">
    <div class="col-xl-3 col-md-6 mb-4">
        <a href="relatorio_classificacao.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>"" style="text-decoration: none;" class="card border-left-primary shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-dark text-uppercase mb-1">CLASSIFICAÇÃO</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-list-ol fa-2x text-gray-300"></i></div>
                </div>
            </div>
        </a>
    </div>



    <div class="col-xl-3 col-md-6 mb-4">
        <a href="relatorio_gols.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-info shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-darkblue text-uppercase mb-1">ARTILHARIA</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-bullseye fa-2x text-gray-300"></i></div>
                </div>
            </div>
        </a>
    </div>
   
    <div class="col-xl-3 col-md-6 mb-4">
        <a href="relatorio_assistencia.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-info text-uppercase mb-1">ASSISTÊNCIA</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-hands-helping fa-2x text-info"></i></div>
                </div>
            </div>
        </a>
    </div>

    <div class="col-xl-3 col-md-6 mb-4">
        <a href="relatorio_cartao_vermelho.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-danger text-uppercase mb-1">CARTÃO VERMELHO</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-square fa-2x text-danger"></i></div>
                </div>
            </div>
        </a>
    </div>

    <div class="col-xl-3 col-md-6 mb-4">
        <a href="relatorio_cartao_amarelo.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-warning text-uppercase mb-1">CARTÃO AMARELO</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-square fa-2x text-warning"></i></div>
                </div>
            </div>
        </a>
    </div>


    <div class="col-xl-3 col-md-6 mb-4">
        <a href="relatorio_cartao_azul.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-primary text-uppercase mb-1">CARTÃO AZUL</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-square fa-2x text-primary"></i></div>
                </div>
            </div>
        </a>
    </div>


    <div class="col-xl-3 col-md-6 mb-4">
        <a href="gerenciar_equipes_campeonato.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-primary text-uppercase mb-1">GERENCIAR EQUIPE</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-users fa-2x text-primary"></i></div>
                </div>
            </div>
        </a>
    </div> 

    <div class="col-xl-3 col-md-6 mb-4">
        <a href="relatorio_melhor_em_campo.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-secundary text-uppercase mb-1">Melhor em Campo</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-crown fa-2x text-secundary"></i></div>
                </div>
            </div>
        </a>
    </div>
    

    <div class="col-xl-3 col-md-6 mb-4">
        <a href="confronto.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-success text-uppercase mb-1"> Confronto</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-clipboard-list fa-2x text-success"></i></div>
                </div>
            </div>
        </a>
    </div>
    


    <?php if ($campeonato['status'] === 'Inscrições Abertas'): ?>
        <div class="col-xl-3 col-md-6 mb-4">
            <button class="card border-left-primary shadow h-100 w-100 py-2 border-0 btn-inscrever-admin"
                data-id-campeonato="<?= htmlspecialchars($campeonato['id']) ?>"
                data-nome-campeonato="<?= htmlspecialchars($campeonato['nome']) ?>"
                data-equipes-inscritas="<?= htmlspecialchars($campeonato['equipes_inscritas_ids'] ?? '') ?>"
                title="Inscrever Equipe">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs fw-bold text-primary text-uppercase mb-1 text-start">INSCREVER EQUIPE</div>
                            <div class="h5 mb-0 fw-bold text-gray-800"></div>
                        </div>
                        <div class="col-auto"><i class="fas fa-user-plus fa-2x text-primary"></i></div>
                    </div>
                </div>
            </button>
        </div>

        <?php if ($campeonato['tipo_chaveamento'] === 'Mata-Mata'): ?>
            <form action="confirmar_chaveamento.php" method="POST" class="col-xl-3 col-md-6 mb-4">
                <input type="hidden" name="id_campeonato" value="<?= htmlspecialchars($campeonato['id']) ?>">
                <button type="submit" class="card border-left-primary shadow h-100 w-100 py-2 border-0 "
                    data-id-campeonato="<?= htmlspecialchars($campeonato['id']) ?>"
                    data-nome-campeonato="<?= htmlspecialchars($campeonato['nome']) ?>"
                    data-equipes-inscritas="<?= htmlspecialchars($campeonato['equipes_inscritas_ids'] ?? '') ?>"
                    title="Confirmar Chaveamento">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs fw-bold text-primary text-uppercase mb-1 text-start">Confirmar Chaveamento</div>
                                <div class="h5 mb-0 fw-bold text-gray-800"></div>
                            </div>
                            <div class="col-auto"><i class="fas fa-sitemap fa-2x text-primary"></i></div>
                        </div>
                    </div>
                </button>
            </form>
        <?php elseif ($campeonato['tipo_chaveamento'] === 'Pontos Corridos'): ?>
            <form action="confirmar_tabela_jogos.php" method="POST" class="col-xl-3 col-md-6 mb-4">
                <input type="hidden" name="id_campeonato" value="<?= htmlspecialchars($campeonato['id']) ?>">
                <button type="submit" class="card border-left-success shadow h-100 py-2 border-0">
                    <div class="card-body">
                        <div class="row no-gutters align-items-center">
                            <div class="col mr-2">
                                <div class="text-xs fw-bold text-success text-uppercase mb-1 text-start">GERAR TABELA DE JOGOS</div>
                                <div class="h5 mb-0 fw-bold text-gray-800"></div>
                            </div>
                            <div class="col-auto"><i class="fas fa-clipboard-list fa-2x text-success"></i></div>
                        </div>
                    </div>
                </button>
            </form>
        <?php endif; ?>
    <?php endif; ?>


    
    <div class="col-xl-3 col-md-6 mb-4">
        <a href="menu_gerar_arte_campeonato.php?id_categoria=<?= htmlspecialchars($campeonato['id']) ?>" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-success text-uppercase mb-1">Gerar Arte</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-id-badge fa-2x text-success"></i></div>
                </div>
            </div>
        </a>
    </div>
</div>

<!-- Modal for team registration -->
<div class="modal fade" id="modalInscricao" tabindex="-1" aria-labelledby="modalInscricaoLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalInscricaoLabel">Inscrever Equipe</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="formInscreverEquipe">
                    <input type="hidden" name="id_campeonato" id="id_campeonato_inscricao">
                    <div class="mb-3">
                        <label for="id_equipe_inscricao" class="form-label">Equipes Disponíveis</label>
                        <select class="form-select" name="id_equipe" id="id_equipe_inscricao" required>
                            <option value="">Selecione uma equipe...</option>
                        </select>
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

<script>
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modal for team registration
    const modalInscricaoEl = document.getElementById('modalInscricao');
    if (!modalInscricaoEl) {
        console.error('Modal element with ID "modalInscricao" not found.');
        return;
    }
    const modalInscricao = new bootstrap.Modal(modalInscricaoEl);
    const selectEquipes = document.getElementById('id_equipe_inscricao');
    const formInscricao = document.getElementById('formInscreverEquipe');
    const todasAsEquipes = <?= json_encode($todas_as_equipes) ?>;

    document.querySelector('.row').addEventListener('click', (e) => {
        const inscreverButton = e.target.closest('.btn-inscrever-admin');
        if (inscreverButton) {
            console.log('Inscrever Equipe button clicked');
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

            console.log('Attempting to show modalInscricao');
            try {
                modalInscricao.show();
            } catch (error) {
                console.error('Error showing modal:', error);
            }
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
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>