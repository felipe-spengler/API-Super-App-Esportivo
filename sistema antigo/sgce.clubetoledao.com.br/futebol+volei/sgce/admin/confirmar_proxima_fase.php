<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['id_campeonato'])) {
    header("Location: gerenciar_campeonatos.php");
    exit();
}
$id_campeonato = $_POST['id_campeonato'];

// Ordem das fases para determinar a próxima
$ordem_fases = ['Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final'];

try {
    // 1. Buscar informações do campeonato e determinar a fase atual/próxima
    $stmt_camp = $pdo->prepare("SELECT nome FROM campeonatos WHERE id = ?");
    $stmt_camp->execute([$id_campeonato]);
    $nome_campeonato = $stmt_camp->fetchColumn();

    $stmt_fase = $pdo->prepare("SELECT DISTINCT fase FROM partidas WHERE id_campeonato = ? ORDER BY FIELD(fase, 'Final', 'Semifinal', 'Quartas de Final', 'Oitavas de Final')");
    $stmt_fase->execute([$id_campeonato]);
    $fase_atual = $stmt_fase->fetchColumn();

    $indice_fase_atual = array_search($fase_atual, $ordem_fases);
    if ($fase_atual === 'Final' || $indice_fase_atual === false) {
        throw new Exception("O campeonato já está na final ou a fase é inválida.");
    }
    $proxima_fase = $ordem_fases[$indice_fase_atual + 1];

    // 2. Coletar os vencedores da fase atual
    $stmt_vencedores = $pdo->prepare("SELECT id_equipe_a, id_equipe_b, placar_equipe_a, placar_equipe_b FROM partidas WHERE id_campeonato = ? AND fase = ? AND status = 'Finalizada'");
    $stmt_vencedores->execute([$id_campeonato, $fase_atual]);
    $partidas_concluidas = $stmt_vencedores->fetchAll();

    $classificados_ids = [];
    foreach ($partidas_concluidas as $partida) {
        if ($partida['placar_equipe_a'] > $partida['placar_equipe_b']) {
            $classificados_ids[] = $partida['id_equipe_a'];
        } elseif ($partida['placar_equipe_b'] > $partida['placar_equipe_a']) {
            $classificados_ids[] = $partida['id_equipe_b'];
        }
    }

    // 3. Juntar com equipes que tiveram "bye" na primeira fase, se aplicável
    if ($indice_fase_atual === 0) {
        $stmt_todos = $pdo->prepare("SELECT id_equipe FROM campeonatos_equipes WHERE id_campeonato = ?");
        $stmt_todos->execute([$id_campeonato]);
        $todos_inscritos = $stmt_todos->fetchAll(PDO::FETCH_COLUMN);

        $stmt_jogaram = $pdo->prepare("SELECT id_equipe_a FROM partidas WHERE id_campeonato = ? AND fase = ? UNION SELECT id_equipe_b FROM partidas WHERE id_campeonato = ? AND fase = ?");
        $stmt_jogaram->execute([$id_campeonato, $fase_atual, $id_campeonato, $fase_atual]);
        $jogaram = $stmt_jogaram->fetchAll(PDO::FETCH_COLUMN);
        
        $equipes_com_bye = array_diff($todos_inscritos, $jogaram);
        $classificados_ids = array_merge($classificados_ids, $equipes_com_bye);
    }

    if (count($classificados_ids) < 2 && count($classificados_ids) % 2 != 0) {
        // Se sobrou apenas 1 time, ele é o campeão por W.O. ou bye na final
        // Lógica a ser implementada se necessário
    }

    // 4. Sortear e propor as novas partidas
    shuffle($classificados_ids);

    $equipe_com_bye = null;
    if (count($classificados_ids) % 2 != 0) {
        $equipe_com_bye = array_pop($classificados_ids);
    }

    // Busca os nomes de todas as equipes envolvidas
    $stmt_nomes = $pdo->prepare("SELECT id, nome FROM equipes WHERE id IN (" . implode(',', array_fill(0, count($classificados_ids), '?')) . ")");
    $stmt_nomes->execute($classificados_ids);
    $equipes_info = $stmt_nomes->fetchAll(PDO::FETCH_KEY_PAIR);

    $partidas_propostas = [];
    for ($i = 0; $i < count($classificados_ids); $i += 2) {
        $partidas_propostas[] = ['equipe_a' => $classificados_ids[$i], 'equipe_b' => $classificados_ids[$i + 1]];
    }

} catch (Exception $e) {
    die("Erro: " . $e->getMessage());
}

require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-arrow-right fa-fw me-2"></i>Avançar para: <?= htmlspecialchars($proxima_fase) ?></h1>
</div>

<div class="alert alert-info">
    <p>Abaixo estão os confrontos sorteados para a próxima fase. Revise e, se necessário, altere as equipes antes de confirmar.</p>
</div>

<?php if ($equipe_com_bye):
    $stmt_bye_nome = $pdo->prepare("SELECT nome FROM equipes WHERE id = ?");
    $stmt_bye_nome->execute([$equipe_com_bye]);
    $nome_equipe_bye = $stmt_bye_nome->fetchColumn();
?>
    <div class="alert alert-success">
        <strong>Avanço Direto (Bye):</strong> A equipe <strong><?= htmlspecialchars($nome_equipe_bye) ?></strong> avançou para a próxima fase.
    </div>
<?php endif; ?>

<div class="card">
    <div class="card-header">
        Confrontos Propostos para a <strong><?= htmlspecialchars($proxima_fase) ?></strong>
    </div>
    <div class="card-body">
        <form action="salvar_proxima_fase.php" method="POST">
            <input type="hidden" name="id_campeonato" value="<?= $id_campeonato ?>">
            <input type="hidden" name="proxima_fase" value="<?= $proxima_fase ?>">
            
            <?php foreach ($partidas_propostas as $index => $partida): ?>
                <div class="row align-items-center mb-3 border-bottom pb-3">
                    <div class="col-md-5">
                        <select name="partidas[<?= $index ?>][equipe_a]" class="form-select select-equipe" required>
                            <?php foreach ($equipes_info as $id => $nome): ?>
                                <option value="<?= $id ?>" <?= ($id == $partida['equipe_a']) ? 'selected' : '' ?>><?= htmlspecialchars($nome) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="col-md-2 text-center"><strong>vs</strong></div>
                    <div class="col-md-5">
                        <select name="partidas[<?= $index ?>][equipe_b]" class="form-select select-equipe" required>
                            <?php foreach ($equipes_info as $id => $nome): ?>
                                <option value="<?= $id ?>" <?= ($id == $partida['equipe_b']) ? 'selected' : '' ?>><?= htmlspecialchars($nome) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
            <?php endforeach; ?>
            
            <div class="d-flex justify-content-end mt-4">
                <a href="ver_partidas.php?id_campeonato=<?= $id_campeonato ?>" class="btn btn-secondary me-2">Cancelar</a>
                <button type="submit" class="btn btn-success"><i class="fas fa-check-circle me-2"></i>Confirmar e Gerar <?= htmlspecialchars($proxima_fase) ?></button>
            </div>
        </form>
    </div>
</div>

<script>
// Script para evitar que a mesma equipe seja selecionada duas vezes no mesmo confronto
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('select-equipe')) {
        const currentRow = e.target.closest('.row');
        const selectsInRow = currentRow.querySelectorAll('.select-equipe');
        const selectA = selectsInRow[0];
        const selectB = selectsInRow[1];

        if (selectA.value && selectA.value === selectB.value) {
            alert('Uma equipe não pode jogar contra si mesma!');
            // Reverte a seleção para o valor original
            const options = Array.from(e.target.options);
            const originalOption = options.find(opt => opt.defaultSelected);
            e.target.value = originalOption ? originalOption.value : '';
        }
    }
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>