<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

$id_campeonato = null;
$campeonato = null;
$partidas = null;
if (isset($_GET['id_campeonato']) && is_numeric($_GET['id_campeonato'])) {
    $id_campeonato = $_GET['id_campeonato'];
    $stmt_camp = $pdo->prepare("
    SELECT 
        c.id,
        c.nome as nome_campeonato,
        c.id_campeonato_pai,
        c.tipo_chaveamento, 
        c.status,
        cp.nome as nome_campeonato_pai
    FROM campeonatos c
    LEFT JOIN campeonatos cp ON(c.id_campeonato_pai=cp.id)
    WHERE c.id = ?
");
    $stmt_camp->execute([$id_campeonato]);
    $campeonato = $stmt_camp->fetch();

    // Busca as partidas com nomes das equipes e do melhor jogador (MVP)
    $stmt_partidas = $pdo->prepare("
        SELECT p.*, 
            a.nome as nome_a, 
            b.nome as nome_b,
            mvp.nome_completo as nome_mvp,
            mvp.apelido as apelido_mvp
        FROM partidas p 
        JOIN equipes a ON p.id_equipe_a = a.id 
        JOIN equipes b ON p.id_equipe_b = b.id 
        LEFT JOIN participantes mvp ON p.id_melhor_jogador = mvp.id
        WHERE p.id_campeonato = ? 
        ORDER BY FIELD(fase, 'Final', 'Semifinal', 'Quartas de Final', 'Oitavas de Final'), data_partida
    ");
    $stmt_partidas->execute([$id_campeonato]);
    $partidas = $stmt_partidas->fetchAll();
} else {
    // Busca todas as partidas com nomes das equipes e do melhor jogador (MVP)
    $stmt_partidas = $pdo->prepare("
        SELECT p.*, 
            a.nome as nome_a, 
            b.nome as nome_b,
            mvp.nome_completo as nome_mvp,
            mvp.apelido as apelido_mvp
        FROM partidas p 
        JOIN equipes a ON p.id_equipe_a = a.id 
        JOIN equipes b ON p.id_equipe_b = b.id 
        LEFT JOIN participantes mvp ON p.id_melhor_jogador = mvp.id
        ORDER BY FIELD(fase, 'Final', 'Semifinal', 'Quartas de Final', 'Oitavas de Final'), data_partida
    ");
    $stmt_partidas->execute();
    $partidas = $stmt_partidas->fetchAll();
}

// --- LÓGICA PARA CONTROLAR O AVANÇO DE FASE (MATA-MATA) ---
$pode_avancar = false;
$fase_atual = null;
$campeonato_finalizado = ($campeonato && $campeonato['status'] === 'Finalizado');

if (!empty($campeonato) && is_array($campeonato) && isset($campeonato['tipo_chaveamento']) && !$campeonato_finalizado && !empty($partidas) && is_array($partidas) && $campeonato['tipo_chaveamento'] === 'Mata-Mata') {
    // Pega a fase mais recente (primeira da lista, pois está ordenada de forma decrescente pela fase)
    if (isset($partidas[0]['fase'])) {
        $fase_atual = $partidas[0]['fase'];
        
        // Verifica se todas as partidas da fase atual estão finalizadas
        $partidas_na_fase = array_filter($partidas, function($p) use ($fase_atual) {
            return isset($p['fase']) && $p['fase'] === $fase_atual;
        });
        $partidas_finalizadas_na_fase = array_filter($partidas_na_fase, function($p) {
            return isset($p['status']) && $p['status'] === 'Finalizada';
        });
        
        if (count($partidas_na_fase) > 0 && count($partidas_na_fase) === count($partidas_finalizadas_na_fase)) {
            $pode_avancar = true;
        }
    }
}

require_once '../includes/header.php';
require_once 'sidebar.php';
?>
<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <?php if ($id_campeonato != null) { ?>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonato <?php echo htmlspecialchars($campeonato['nome_campeonato_pai']); ?></a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos_categoria.php?id_campeonato=<?= htmlspecialchars($campeonato['id_campeonato_pai']) ?>">Gerenciar Categorias</a></li>
        <li class="breadcrumb-item"><a href="categoria.php?id_categoria=<?echo htmlspecialchars($campeonato['id']) ?>">Categoria <?php echo htmlspecialchars($campeonato['nome_campeonato']); ?></a></li>

        <?php } ?>
        <li class="breadcrumb-item active" aria-current="page">Partidas</li>
    </ol>
</nav>
<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-futbol fa-fw me-2"></i>Partidas <?php if ($campeonato != null) { ?>de "<?= htmlspecialchars($campeonato['nome_campeonato']) ?>"<?php } ?></h1>
    <a href="javascript:history.back()" class="btn btn-outline-secondary btn-sm"><i class="fas fa-arrow-left me-1"></i> Voltar</a>
</div>

<?php if ($campeonato && $campeonato['tipo_chaveamento'] === 'Mata-Mata'): ?>
<div class="card mb-4">
    <div class="card-header"><i class="fas fa-project-diagram me-2"></i>Controle de Fase</div>
    <div class="card-body text-center">
        <?php if ($campeonato_finalizado): ?>
            <h5 class="text-success"><i class="fas fa-trophy me-2"></i>Campeonato Finalizado!</h5>
            <?php 
                // Lógica para encontrar a partida da final e determinar o campeão
                $partida_final = null;
                foreach ($partidas as $p) { if ($p['fase'] === 'Final') { $partida_final = $p; break; } }
                if ($partida_final) {
                    $placar_a = $partida_final['placar_equipe_a'];
                    $placar_b = $partida_final['placar_equipe_b'];
                    $vencedor_final = $placar_a > $placar_b ? $partida_final['nome_a'] : ($placar_b > $placar_a ? $partida_final['nome_b'] : 'Empate');
                    echo "<p>O grande campeão é: <strong>" . htmlspecialchars($vencedor_final) . "</strong></p>";
                }
            ?>
        <?php elseif ($pode_avancar): ?>
            <h5 class="text-primary">Todas as partidas da fase "<?= htmlspecialchars($fase_atual) ?>" foram concluídas.</h5>
            <p>Clique no botão abaixo para sortear os confrontos da próxima fase.</p>
            <form action="confirmar_proxima_fase.php" method="POST">
                <input type="hidden" name="id_campeonato" value="<?= $id_campeonato ?>">
                <button type="submit" class="btn btn-lg btn-success">
                    <i class="fas fa-arrow-right me-2"></i>Avançar para a Próxima Fase
                </button>
            </form>
        <?php elseif (count($partidas) > 0): ?>
             <h5 class="text-warning">Aguardando conclusão da fase "<?= htmlspecialchars($fase_atual) ?>".</h5>
             <p>É necessário registrar o resultado de todas as partidas da fase atual para poder avançar.</p>
        <?php else: ?>
            <p class="text-muted">Ainda não há partidas geradas para este campeonato.</p>
        <?php endif; ?>
    </div>
</div>
<?php endif; ?>

<div class="card">
    <div class="card-header"><i class="fas fa-list me-1"></i> Lista de Jogos</div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-hover">
                <thead><tr><th>Rodada</th><th>Confronto</th><th>Placar</th><th>Data e Local</th><th>Status</th><th class="text-end">Ações</th></tr></thead>
                <tbody>
                    <?php if (count($partidas) > 0): ?>
                        <?php foreach ($partidas as $partida): ?>
                        <?php 
                            $sql = "SELECT id, src FROM fotos_participantes WHERE participante_id = :participante_id";
                            $stmt = $pdo->prepare($sql);
                            $stmt->execute(['participante_id' => $partida['id_melhor_jogador']]);
                            $fotos = $stmt->fetchAll(PDO::FETCH_ASSOC);
                            $partida["fotos_melhor_jogador"] = $fotos;
                        ?>
                        <tr data-id-partida="<?= $partida['id'] ?>">
                            <td><?= htmlspecialchars($partida['rodada']) ?></td>
                            <td><strong><?= htmlspecialchars($partida['nome_a']) ?></strong><br>vs<br><strong><?= htmlspecialchars($partida['nome_b']) ?></strong></td>
                            <td class="fw-bold"><?= $partida['status'] != 'Agendada' ? "{$partida['placar_equipe_a']} x {$partida['placar_equipe_b']}" : '-' ?></td>
                            <td><?= $partida['data_partida'] ? date('d/m/Y H:i', strtotime($partida['data_partida'])) : 'A definir' ?><br><small class="text-muted"><?= htmlspecialchars($partida['local_partida'] ?? 'A definir') ?></small></td>
                            <td><span class="badge bg-info rounded-pill"><?= htmlspecialchars($partida['status']) ?></span></td>
                            <td class="text-end">
                                <a href="sumula_adm.php?id_partida=<?= $partida['id'] ?>" class="btn btn-primary btn-sm" title="Gerar Súmula"><i class="fas fa-file-alt"></i></a>
                                <a href="gerenciar_partida.php?id=<?= $partida['id'] ?>" class="btn btn-warning btn-sm" title="Editar Jogo/Placar"><i class="fas fa-edit"></i></a>
                                <a href="registrar_sumula.php?id_partida=<?= $partida['id'] ?>" class="btn btn-secondary btn-sm" title="Registrar Súmula"><i class="fas fa-file-signature"></i></a>
                                <?php if ($partida['status'] === 'Finalizada' && !empty($partida['id_melhor_jogador'])): ?>
                                    <a href="menu_gerar_arte.php?id_partida=<?= $partida['id'] ?>" class="btn btn-success btn-sm btn-gerar-arte" style="text-decoration:none;" Alt="Gerar Arte"> 
                                        <i class="fas fa-id-badge"></i>
                                    </a>
                                <?php endif; ?>
                                <button class="btn btn-danger btn-sm btn-excluir-partida" 
                                        data-id-partida="<?= $partida['id'] ?>" 
                                        title="Excluir Jogo">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr><td colspan="6" class="text-center">Nenhuma partida gerada para este campeonato.</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<style>
    .foto {
        width: 120px;
        height: 120px;
        object-fit: cover;
        cursor: pointer;
        border: 2px solid transparent;
        border-radius: 8px;
        transition: border-color 0.2s;
    }
    .foto.selecionada {
        border-color: blue;
    }
</style>

<div class="modal fade" id="modalGerarArte" tabindex="-1" aria-labelledby="modalGerarArteLabel" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="modalGerarArteLabel">Gerar Arte do Craque do Jogo</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <form action="gerar_arte_craque.php" method="POST" enctype="multipart/form-data" target="_blank">
                <div class="modal-body">
                    <p>Craque selecionado: <strong id="nomeJogadorArte"></strong></p>
                    <p>Placar da partida: <strong id="placarPartidaArte"></strong></p>
                    <input type="hidden" name="apelido" id="form_apelido">
                    <input type="hidden" name="nome_jogador" id="form_nome_jogador">
                    <input type="hidden" name="placar" id="form_placar">
                    <input type="hidden" name="id_equipe_a" id="form_id_equipe_a">
                    <input type="hidden" name="id_equipe_b" id="form_id_equipe_b">
                    <input type="hidden" name="nome_campeonato" id="form_nome_campeonato">
                    <div class="mb-3">
                        <label for="foto_jogador" class="form-label">Selecione a foto do jogador (PNG ou JPG)</label>
                        <div id="lista_Fotos"></div>
                        <div id="upload_foto" style="">
                            <label for="upload_foto_jogador" class="form-label">Nenhuma foto disponível. Faça upload de uma imagem:</label>
                            <input type="file" class="form-control" id="upload_foto_jogador" name="upload_foto_jogador" accept="image/png,image/jpeg">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-check-circle me-2"></i>Gerar Arte</button>
                </div>
            </form>
        </div>
    </div>
</div>

<?php
// Notificações via sessão
if (session_status() === PHP_SESSION_NONE) { session_start(); }
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
function atualizarListaFotosComId(fotos) {
    const listaFotos = document.getElementById('lista_Fotos');
    const uploadFotoDiv = document.getElementById('upload_foto');
    listaFotos.innerHTML = ''; // Limpa lista antes
    //uploadFotoDiv.style.display = 'none'; // Esconde upload por padrão

    if (fotos && fotos.length > 0) {
        fotos.forEach((foto) => {
            const fotoDiv = document.createElement('span');
            fotoDiv.style.position = 'relative';
            fotoDiv.style.display = 'inline-block';
            fotoDiv.style.margin = '5px';
            fotoDiv.style.cursor = 'pointer';

            // Miniatura da imagem
            const img = document.createElement('img');
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '5px';
            img.style.border = '1px solid #ccc';
            img.title = `SRC: ${foto.src}`;
            img.src = '/sgce/' + foto.src;

            // Input tipo radio
            const inputId = document.createElement('input');
            inputId.type = 'radio';
            inputId.name = 'foto_jogador';
            inputId.value = foto.src;
            inputId.style.display = 'block';
            inputId.style.margin = '5px auto 0 auto';

            // Ao clicar na imagem, marca o radio e aplica destaque
            img.addEventListener('click', () => {
                inputId.checked = true;
                destacarFotoSelecionada(fotoDiv);
            });

            // Ao clicar no radio, também aplica destaque
            inputId.addEventListener('change', () => {
                destacarFotoSelecionada(fotoDiv);
            });

            fotoDiv.appendChild(img);
            fotoDiv.appendChild(inputId);
            listaFotos.appendChild(fotoDiv);
        });
    } else {
        // Exibe o campo de upload se não houver fotos
        uploadFotoDiv.style.display = 'block';
    }

    // Função para destacar a foto
    function destacarFotoSelecionada(fotoDiv) {
        document.querySelectorAll('#lista_Fotos span').forEach(div => {
            div.querySelector('img').style.border = '1px solid #ccc';
            div.querySelector('img').style.boxShadow = 'none';
        });
        if (fotoDiv.querySelector('img')) {
            fotoDiv.querySelector('img').style.border = '2px solid blue';
            fotoDiv.querySelector('img').style.boxShadow = '0 0 5px blue';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const modalArte = document.getElementById('modalGerarArte');
    if (modalArte) {
        modalArte.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget;
            const nomeJogador = button.dataset.nomeJogador;
            const apelido = button.dataset.apelidoJogador;
            const placar = button.dataset.placar;
            const idEquipeA = button.dataset.idA;
            const idEquipeB = button.dataset.idB;
            const nomeCampeonato = button.dataset.nomeCampeonato;
            const fotosJogador = JSON.parse(button.dataset.fotosJogador || '[]');

            const modalTitle = modalArte.querySelector('.modal-title');
            modalTitle.textContent = 'Gerar Arte para ' + nomeJogador;

            document.getElementById('nomeJogadorArte').textContent = nomeJogador;
            document.getElementById('placarPartidaArte').textContent = placar;
            document.getElementById('form_nome_jogador').value = nomeJogador;
            document.getElementById('form_apelido').value = apelido || ''; // Usa apelido do banco ou vazio se não existir
            document.getElementById('form_placar').value = placar;
            document.getElementById('form_id_equipe_a').value = idEquipeA;
            document.getElementById('form_id_equipe_b').value = idEquipeB;
            document.getElementById('form_nome_campeonato').value = nomeCampeonato;

            atualizarListaFotosComId(fotosJogador);
            // Armazena fotos no dataset do modal para validação
            modalArte.dataset.fotosJogador = JSON.stringify(fotosJogador);
        });

        // Validação do formulário antes de submeter
        const form = modalArte.querySelector('form');
        form.addEventListener('submit', function (event) {
            const fotos = JSON.parse(modalArte.dataset.fotosJogador || '[]');
            const fotoSelecionada = form.querySelector('input[name="foto_jogador"]:checked');
            const uploadFoto = form.querySelector('#upload_foto_jogador');

            if (fotos.length > 0 && !fotoSelecionada && !uploadFoto.files.length) {
                event.preventDefault();
                Swal.fire({
                    icon: 'warning',
                    title: 'Selecione uma foto',
                    text: 'Por favor, selecione uma foto do jogador ou faça upload de uma nova imagem.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3500,
                    timerProgressBar: true
                });
            } else if (fotos.length === 0 && uploadFoto && !uploadFoto.files.length) {
                event.preventDefault();
                Swal.fire({
                    icon: 'warning',
                    title: 'Faça upload de uma imagem',
                    text: 'Nenhuma foto disponível. Por favor, faça upload de uma imagem do jogador.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3500,
                    timerProgressBar: true
                });
            }
        });
    }

    // Lógica para o botão de exclusão via AJAX
    document.querySelectorAll('.btn-excluir-partida').forEach(button => {
        button.addEventListener('click', function () {
            const idPartida = this.dataset.idPartida;

            Swal.fire({
                title: 'Tem certeza?',
                text: 'Esta ação excluirá a partida permanentemente. Deseja continuar?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sim, excluir',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    fetch('excluir_partida.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: `id_partida=${encodeURIComponent(idPartida)}`
                    })
                    .then(response => response.json())
                    .then(data => {
                        Swal.fire({
                            icon: data.status,
                            title: data.message,
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3500,
                            timerProgressBar: true
                        }).then(() => {
                            if (data.status === 'success') {
                                document.querySelector(`tr[data-id-partida="${idPartida}"]`).remove();
                            }
                        });
                    })
                    .catch(error => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Erro ao excluir',
                            text: 'Ocorreu um erro ao tentar excluir a partida.',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3500,
                            timerProgressBar: true
                        });
                    });
                }
            });
        });
    });
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>