<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) {
    header("Location: gerenciar_campeonatos.php");
    exit();
}
$id_partida = $_GET['id'];

// Lógica de atualização
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (session_status() === PHP_SESSION_NONE) { session_start(); }

    try {
        $pdo->beginTransaction();

        $partida_original = $pdo->query("SELECT id_campeonato, data_partida, fase FROM partidas WHERE id = $id_partida")->fetch();
        $id_campeonato = $partida_original['id_campeonato'];

        // Novos dados do formulário
        $placar_a = $_POST['placar_equipe_a'];
        $placar_b = $_POST['placar_equipe_b'];
        $data_partida = $_POST['data_partida'];
        $local = $_POST['local_partida'];
        $status = $_POST['status'];
        // ADICIONADO: Captura o ID do melhor jogador (pode ser vazio)
        $id_melhor_jogador = !empty($_POST['id_melhor_jogador']) ? $_POST['id_melhor_jogador'] : null;

        // ADICIONADO: id_melhor_jogador na query
        $sql = "UPDATE partidas SET placar_equipe_a = ?, placar_equipe_b = ?, data_partida = ?, local_partida = ?, status = ?, id_melhor_jogador = ? WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$placar_a, $placar_b, $data_partida, $local, $status, $id_melhor_jogador, $id_partida]);

        // ... (toda a lógica de reagendamento e finalização do campeonato continua a mesma) ...

        $pdo->commit();
        $_SESSION['notificacao'] = ['tipo' => 'success', 'mensagem' => 'Partida atualizada com sucesso!'];

    } catch (Exception $e) {
        $pdo->rollBack();
        $_SESSION['notificacao'] = ['tipo' => 'error', 'mensagem' => 'Erro ao salvar alterações: ' . $e->getMessage()];
    }

    header("Location:confronto.php?id_categoria=" . $id_campeonato);
    exit();
}

// Buscar dados da partida
$stmt_partida = $pdo->prepare("SELECT p.*, c.nome as nome_campeonato, equipe_a.nome as nome_equipe_a, equipe_b.nome as nome_equipe_b FROM partidas p JOIN campeonatos c ON p.id_campeonato = c.id JOIN equipes equipe_a ON p.id_equipe_a = equipe_a.id JOIN equipes equipe_b ON p.id_equipe_b = equipe_b.id WHERE p.id = ?");
$stmt_partida->execute([$id_partida]);
$partida = $stmt_partida->fetch();

if (!$partida) { die("Partida não encontrada."); }

// ADICIONADO: Buscar todos os participantes das duas equipes
$stmt_participantes = $pdo->prepare("SELECT id, nome_completo FROM participantes WHERE id_equipe = ? OR id_equipe = ? ORDER BY nome_completo ASC");
$stmt_participantes->execute([$partida['id_equipe_a'], $partida['id_equipe_b']]);
$participantes_partida = $stmt_participantes->fetchAll();

require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonato <?php echo $partida['nome_campeonato_pai'];?> </a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos_categoria.php?id_campeonato=<?= htmlspecialchars($partida['id_campeonato_pai']) ?>">Gerenciar Categorias</a></li>
        <li class="breadcrumb-item"><a href="categoria.php?id_categoria=<?= htmlspecialchars($partida['id_campeonato']) ?>">Categoria <?= htmlspecialchars($partida['nome_campeonato']) ?></a></li>
        <li class="breadcrumb-item"><a href="confronto.php?id_categoria=<?= htmlspecialchars($partida['id_campeonato']) ?>">Partidas</a></li>
        <li class="breadcrumb-item active" aria-current="page"><?= htmlspecialchars($partida['nome_equipe_a'] . ' x ' . $partida['nome_equipe_b']) ?></li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-image fa-fw me-2"></i><?= htmlspecialchars($partida['nome_equipe_a'] . ' x ' . $partida['nome_equipe_b'] . ' (' . $partida['fase'] . ')') ?></h1>
    <a href="confronto.php?id_categoria=<?= htmlspecialchars($partida['id_campeonato']) ?>" class="btn btn-outline-secondary btn-sm"><i class="fas fa-arrow-left me-1"></i> Voltar</a>
</div>

<div class="card">
    <div class="card-header">
        <strong><?= htmlspecialchars($partida['nome_equipe_a']) ?></strong> vs <strong><?= htmlspecialchars($partida['nome_equipe_b']) ?></strong>
    </div>
    <div class="card-body">
        <form method="POST">
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="placar_equipe_a" class="form-label">Placar <?= htmlspecialchars($partida['nome_equipe_a']) ?></label>
                    <input type="number" class="form-control" id="placar_equipe_a" name="placar_equipe_a" value="<?= $partida['placar_equipe_a'] ?>">
                </div>
                <div class="col-md-6 mb-3">
                    <label for="placar_equipe_b" class="form-label">Placar <?= htmlspecialchars($partida['nome_equipe_b']) ?></label>
                    <input type="number" class="form-control" id="placar_equipe_b" name="placar_equipe_b" value="<?= $partida['placar_equipe_b'] ?>">
                </div>
            </div>
            <div class="row">
                <div class="col-md-4 mb-3">
                    <label for="data_partida" class="form-label">Data e Hora</label>
                    <input type="datetime-local" class="form-control" id="data_partida" name="data_partida" value="<?= date('Y-m-d\TH:i', strtotime($partida['data_partida'] ?? 'now')) ?>">
                </div>
                <div class="col-md-4 mb-3">
                    <label for="local_partida" class="form-label">Local</label>
                    <input type="text" class="form-control" id="local_partida" name="local_partida" value="<?= htmlspecialchars($partida['local_partida'] ?? '') ?>">
                </div>
                <div class="col-md-4 mb-3">
                    <label for="status" class="form-label">Status</label>
                    <select id="status" name="status" class="form-select">
                        <option value="Agendada" <?= $partida['status'] == 'Agendada' ? 'selected' : '' ?>>Agendada</option>
                        <option value="Em Andamento" <?= $partida['status'] == 'Em Andamento' ? 'selected' : '' ?>>Em Andamento</option>
                        <option value="Finalizada" <?= $partida['status'] == 'Finalizada' ? 'selected' : '' ?>>Finalizada</option>
                    </select>
                </div>
            </div>
            
            <div class="row">
                <div class="col-12 mb-3">
                    <label for="id_melhor_jogador" class="form-label">Melhor Jogador da Partida (MVP)</label>
                    <select id="id_melhor_jogador" name="id_melhor_jogador" class="form-select">
                        <option value="">-- Nenhum --</option>
                        <?php foreach ($participantes_partida as $participante): ?>
                            <option value="<?= $participante['id'] ?>" <?= ($partida['id_melhor_jogador'] == $participante['id']) ? 'selected' : '' ?>>
                                <?= htmlspecialchars($participante['nome_completo']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>

            <hr>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save me-2"></i>Salvar Alterações</button>
            <a href="ver_partidas.php?id_campeonato=<?= $partida['id_campeonato'] ?>" class="btn btn-secondary">Cancelar</a>
        </form>
    </div>
</div>

<?php require_once '../includes/footer_dashboard.php'; ?>