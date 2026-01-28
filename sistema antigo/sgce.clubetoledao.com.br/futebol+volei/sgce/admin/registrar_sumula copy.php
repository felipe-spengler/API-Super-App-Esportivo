<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

if (!isset($_GET['id_partida']) || !is_numeric($_GET['id_partida'])) {
    header("Location: gerenciar_campeonatos.php");
    exit();
}
$id_partida = $_GET['id_partida'];

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// --- INÍCIO DA LÓGICA DE MANIPULAÇÃO DE EVENTOS ---

// LÓGICA PARA ADICIONAR EVENTO
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['add_evento'])) {
    $id_participante = $_POST['id_participante'];
    $tipo_evento = $_POST['tipo_evento'];
    $minuto_evento = $_POST['minuto_evento'];

    try {
        $pdo->beginTransaction();

        $stmt_equipe_jogador = $pdo->prepare("SELECT id_equipe FROM participantes WHERE id = ?");
        $stmt_equipe_jogador->execute([$id_participante]);
        $id_equipe = $stmt_equipe_jogador->fetchColumn();

        $sql_insert = "INSERT INTO sumulas_eventos (id_partida, id_participante, id_equipe, tipo_evento, minuto_evento) VALUES (?, ?, ?, ?, ?)";
        $stmt_insert = $pdo->prepare($sql_insert);
        $stmt_insert->execute([$id_partida, $id_participante, $id_equipe, $tipo_evento, $minuto_evento]);

        if ($tipo_evento === 'Gol') {
            $partida_info = $pdo->query("SELECT id_equipe_a FROM partidas WHERE id = $id_partida")->fetch();
            $coluna_placar = ($id_equipe == $partida_info['id_equipe_a']) ? 'placar_equipe_a' : 'placar_equipe_b';
            
            $sql_update_placar = "UPDATE partidas SET $coluna_placar = $coluna_placar + 1 WHERE id = ?";
            $stmt_update_placar = $pdo->prepare($sql_update_placar);
            $stmt_update_placar->execute([$id_partida]);
        }
        
        $count_eventos = $pdo->query("SELECT COUNT(*) FROM sumulas_eventos WHERE id_partida = $id_partida")->fetchColumn();
        if ($count_eventos > 0) {
            $pdo->prepare("UPDATE partidas SET status = 'Em Andamento' WHERE id = ? AND status = 'Agendada'")->execute([$id_partida]);
            $id_campeonato = $pdo->query("SELECT id_campeonato FROM partidas WHERE id = $id_partida")->fetchColumn();
            $pdo->prepare("UPDATE campeonatos SET status = 'Em Andamento' WHERE id = ? AND status = 'Inscrições Abertas'")->execute([$id_campeonato]);
        }

        $pdo->commit();
        $_SESSION['notificacao'] = ['tipo' => 'success', 'mensagem' => 'Evento adicionado com sucesso!'];

    } catch (Exception $e) {
        $pdo->rollBack();
        $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro ao adicionar evento: ' . $e->getMessage()];
    }
    
    header("Location: registrar_sumula.php?id_partida=$id_partida");
    exit();
}

// LÓGICA PARA ANULAR EVENTO
if (isset($_GET['action']) && $_GET['action'] == 'anular_evento' && isset($_GET['id_evento'])) {
    $id_evento = $_GET['id_evento'];

    try {
        $pdo->beginTransaction();

        $stmt_evento = $pdo->prepare("SELECT id_equipe, tipo_evento FROM sumulas_eventos WHERE id = ? AND id_partida = ?");
        $stmt_evento->execute([$id_evento, $id_partida]);
        $evento_info = $stmt_evento->fetch();

        if ($evento_info) {
            // Remove o evento da tabela sumulas_eventos
            $stmt_delete = $pdo->prepare("DELETE FROM sumulas_eventos WHERE id = ?");
            $stmt_delete->execute([$id_evento]);

            // Ajusta o placar apenas se o evento for um Gol
            if ($evento_info['tipo_evento'] === 'Gol') {
                $partida_info = $pdo->query("SELECT id_equipe_a FROM partidas WHERE id = $id_partida")->fetch();
                $coluna_placar = ($evento_info['id_equipe'] == $partida_info['id_equipe_a']) ? 'placar_equipe_a' : 'placar_equipe_b';
                
                $sql_update_placar = "UPDATE partidas SET $coluna_placar = GREATEST(0, $coluna_placar - 1) WHERE id = ?";
                $stmt_update_placar = $pdo->prepare($sql_update_placar);
                $stmt_update_placar->execute([$id_partida]);
            }

            $pdo->commit();
            $_SESSION['notificacao'] = ['tipo' => 'success', 'mensagem' => "Evento '{$evento_info['tipo_evento']}' anulado com sucesso!"];
        } else {
            $pdo->rollBack();
            $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Evento não encontrado.'];
        }

    } catch (Exception $e) {
        $pdo->rollBack();
        $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro ao anular evento: ' . $e->getMessage()];
    }
    
    header("Location: registrar_sumula.php?id_partida=$id_partida");
    exit();
}

// --- FIM DA LÓGICA DE MANIPULAÇÃO ---

// --- BLOCO DE BUSCA DE DADOS ---
// 1. Busca os dados da partida e das equipes envolvidas
$stmt_partida = $pdo->prepare("SELECT p.*, c.id as id_campeonato, c.nome as nome_campeonato, equipe_a.nome as nome_equipe_a, equipe_b.nome as nome_equipe_b FROM partidas p JOIN campeonatos c ON p.id_campeonato = c.id JOIN equipes equipe_a ON p.id_equipe_a = equipe_a.id JOIN equipes equipe_b ON p.id_equipe_b = equipe_b.id WHERE p.id = ?");
$stmt_partida->execute([$id_partida]);
$partida = $stmt_partida->fetch();

if (!$partida) {
    die("Erro: Partida não encontrada.");
}

// 2. Busca os jogadores de AMBAS as equipes e os organiza em um array
$stmt_jogadores = $pdo->prepare("SELECT id, nome_completo, id_equipe FROM participantes WHERE id_equipe = ? OR id_equipe = ? ORDER BY nome_completo");
$stmt_jogadores->execute([$partida['id_equipe_a'], $partida['id_equipe_b']]);
$jogadores_list = $stmt_jogadores->fetchAll();

$jogadores_por_equipe = [];
foreach ($jogadores_list as $jogador) {
    $jogadores_por_equipe[$jogador['id_equipe']][] = $jogador;
}

// 3. Busca os eventos já registrados para esta partida
$stmt_eventos = $pdo->prepare("SELECT s.*, p.nome_completo, e.nome as nome_equipe FROM sumulas_eventos s JOIN participantes p ON s.id_participante = p.id JOIN equipes e ON s.id_equipe = e.id WHERE s.id_partida = ? ORDER BY s.minuto_evento ASC");
$stmt_eventos->execute([$id_partida]);
$eventos = $stmt_eventos->fetchAll();
// --- FIM DO BLOCO DE BUSCA DE DADOS ---

require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonatos</a></li>
        <li class="breadcrumb-item"><a href="ver_partidas.php?id_campeonato=<?= $partida['id_campeonato'] ?>">Partidas</a></li>
        <li class="breadcrumb-item active" aria-current="page">Registrar Súmula</li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-file-signature fa-fw me-2"></i>Súmula: <?= htmlspecialchars($partida['nome_equipe_a']) ?> vs <?= htmlspecialchars($partida['nome_equipe_b']) ?></h1>
</div>

<div class="card mb-4">
    <div class="card-header"><i class="fas fa-plus-circle me-1"></i> Adicionar Evento à Súmula</div>
    <div class="card-body">
        <?php if (empty($jogadores_list)): ?>
            <div class="alert alert-warning" role="alert">
                <strong>Atenção:</strong> Não há participantes cadastrados para as equipes desta partida.
            </div>
        <?php else: ?>
            <form method="POST">
                <div class="row g-3 align-items-end">
                    <div class="col-md-5">
                        <label for="id_participante" class="form-label">Participante</label>
                        <select id="id_participante" name="id_participante" class="form-select" required>
                            <option value="" disabled selected>Selecione...</option>
                            <optgroup label="<?= htmlspecialchars($partida['nome_equipe_a']) ?>">
                                <?php if (isset($jogadores_por_equipe[$partida['id_equipe_a']])): ?>
                                    <?php foreach ($jogadores_por_equipe[$partida['id_equipe_a']] as $jogador): ?>
                                        <option value="<?= $jogador['id'] ?>"><?= htmlspecialchars($jogador['nome_completo']) ?></option>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </optgroup>
                            <optgroup label="<?= htmlspecialchars($partida['nome_equipe_b']) ?>">
                                <?php if (isset($jogadores_por_equipe[$partida['id_equipe_b']])): ?>
                                    <?php foreach ($jogadores_por_equipe[$partida['id_equipe_b']] as $jogador): ?>
                                        <option value="<?= $jogador['id'] ?>"><?= htmlspecialchars($jogador['nome_completo']) ?></option>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </optgroup>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label for="tipo_evento" class="form-label">Tipo de Evento</label>
                        <select id="tipo_evento" name="tipo_evento" class="form-select" required>
                            <option value="Gol">Gol</option>
                            <option value="Cartão Amarelo">Cartão Amarelo</option>
                            <option value="Cartão Azul">Cartão Azul</option>
                            <option value="Cartão Vermelho">Cartão Vermelho</option>
                            <option value="Falta">Falta</option>
                            <option value="Assistência">Assistência</option>
                            <option value="Ponto">Ponto</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <label for="minuto_evento" class="form-label">Minuto</label>
                        <input type="text" class="form-control" id="minuto_evento" name="minuto_evento" placeholder="Ex: 42" required>
                    </div>
                    <div class="col-md-2">
                        <button type="submit" name="add_evento" class="btn btn-primary w-100"><i class="fas fa-plus me-1"></i> Adicionar</button>
                    </div>
                </div>
            </form>
        <?php endif; ?>
    </div>
</div>

<div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span><i class="fas fa-list me-1"></i> Eventos Registrados</span>
        <span class="fw-bold fs-5">Placar Atual: <?= $partida['placar_equipe_a'] ?> x <?= $partida['placar_equipe_b'] ?></span>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="table-light"><tr><th>Minuto</th><th>Jogador</th><th>Equipe</th><th>Evento</th><th class="text-end">Ações</th></tr></thead>
                <tbody>
                    <?php if(empty($eventos)): ?>
                        <tr><td colspan="5" class="text-center text-muted">Nenhum evento registrado.</td></tr>
                    <?php else: ?>
                        <?php foreach($eventos as $evento): ?>
                            <tr>
                                <td><?= htmlspecialchars($evento['minuto_evento']) ?>'</td>
                                <td><?= htmlspecialchars($evento['nome_completo']) ?></td>
                                <td><?= htmlspecialchars($evento['nome_equipe']) ?></td>
                                <td>
                                    <?php
                                    switch ($evento['tipo_evento']) {
                                        case 'Gol':
                                            echo '<span class="badge bg-success"><i class="fas fa-futbol me-1"></i> Gol</span>';
                                            break;
                                        case 'Cartão Amarelo':
                                            echo '<span class="badge bg-warning text-dark"><i class="fas fa-square me-1"></i> Amarelo</span>';
                                            break;
                                        case 'Cartão Vermelho':
                                            echo '<span class="badge bg-danger"><i class="fas fa-square me-1"></i> Vermelho</span>';
                                            break;
                                        case 'Cartão Azul':
                                            echo '<span class="badge bg-info"><i class="fas fa-square me-1"></i> Azul</span>';
                                            break;
                                        case 'Assistência':
                                            echo '<span class="badge bg-primary"><i class="fas fa-running me-1"></i> Assistência</span>';
                                            break;
                                        case 'Ponto':
                                            echo '<span class="badge bg-primary"><i class="fas fa-plus me-1"></i> Ponto</span>';
                                            break;
                                        case 'Falta':
                                            echo '<span class="badge bg-danger text-dark"><i class="fas fa-exclamation-triangle me-1"></i> Falta</span>';
                                            break;
                                        default:
                                            echo '<span class="badge bg-secondary"><i class="fas fa-question me-1"></i> Desconhecido</span>';
                                            break;
                                    }
                                    ?>
                                </td>
                                <td class="text-end">
                                    <button type="button" class="btn btn-outline-danger btn-sm" 
                                            data-bs-toggle="modal" 
                                            data-bs-target="#modalAnularEvento"
                                            data-url-anular="registrar_sumula.php?id_partida=<?= $id_partida ?>&action=anular_evento&id_evento=<?= $evento['id'] ?>"
                                            data-nome-jogador="<?= htmlspecialchars($evento['nome_completo']) ?>"
                                            data-tipo-evento="<?= htmlspecialchars($evento['tipo_evento']) ?>"
                                            title="Anular Evento">
                                        <i class="fas fa-undo"></i> Anular
                                    </button>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<div class="modal fade" id="modalAnularEvento" tabindex="-1" aria-labelledby="modalAnularEventoLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="modalAnularEventoLabel"><i class="fas fa-exclamation-triangle text-danger me-2"></i>Confirmar Anulação</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        Tem certeza que deseja anular o evento <strong id="tipoEventoAnular"></strong> do participante <strong id="nomeJogadorAnular"></strong>?
        <p class="text-muted mt-2" id="avisoPlacar" style="display: none;">O placar da partida será ajustado automaticamente se for um gol.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
        <a href="#" id="btnConfirmarAnulacao" class="btn btn-danger">Sim, anular evento</a>
      </div>
    </div>
  </div>
</div>

<?php 
// Notificações via sessão
if (isset($_SESSION['notificacao'])):
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
?>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        Swal.fire({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 3500, timerProgressBar: true,
            icon: '<?= htmlspecialchars($notificacao['tipo']) ?>',
            title: '<?= addslashes($notificacao['mensagem']) ?>'
        });
    });
</script>
<?php endif; ?>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const modalAnularEvento = document.getElementById('modalAnularEvento');
    if (modalAnularEvento) {
        modalAnularEvento.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            const urlAnular = button.dataset.urlAnular;
            const nomeJogador = button.dataset.nomeJogador;
            const tipoEvento = button.dataset.tipoEvento;
            const nomeJogadorSpan = modalAnularEvento.querySelector('#nomeJogadorAnular');
            const tipoEventoSpan = modalAnularEvento.querySelector('#tipoEventoAnular');
            const avisoPlacar = modalAnularEvento.querySelector('#avisoPlacar');
            const btnConfirmar = modalAnularEvento.querySelector('#btnConfirmarAnulacao');
            
            nomeJogadorSpan.textContent = nomeJogador;
            tipoEventoSpan.textContent = tipoEvento;
            btnConfirmar.setAttribute('href', urlAnular);
            
            // Mostrar aviso de ajuste de placar apenas para gols
            avisoPlacar.style.display = (tipoEvento === 'Gol') ? 'block' : 'none';
        });
    }
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>