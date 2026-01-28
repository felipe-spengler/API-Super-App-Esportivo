<?php
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php';

$id_usuario = $_SESSION['user_id'] ?? null;
if (!$id_usuario) {
    header('Location: ../login.php');
    exit();
}

$id = $_GET['id'] ?? null;
if (!$id) {
    header("Location: gerenciar_jogadores.php");
    exit();
}

// Busca o jogador garantindo que ele pertença a uma equipe do líder
$stmt = $pdo->prepare("
    SELECT participantes.*, equipes.id AS equipe_id, equipes.nome AS equipe_nome 
    FROM participantes
    INNER JOIN equipes ON participantes.id_equipe = equipes.id
    WHERE participantes.id = ? AND equipes.id_lider = ?
");
$stmt->execute([$id, $id_usuario]);
$jogador = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$jogador) {
    header("Location: gerenciar_jogadores.php");
    exit();
}

// Busca todas as equipes do líder para popular o select
$stmt2 = $pdo->prepare("SELECT id, nome FROM equipes WHERE id_lider = ? ORDER BY nome");
$stmt2->execute([$id_usuario]);
$equipes_do_lider = $stmt2->fetchAll(PDO::FETCH_ASSOC);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nome = $_POST['nome_completo'];
    $apelido = $_POST['apelido'];
    $data_nascimento = $_POST['data_nascimento'];
    $numero_camisa = $_POST['numero_camisa'];
    $id_equipe = (int)$_POST['id_equipe'];

    // Verifica se o id_equipe pertence ao líder
    $stmt_check = $pdo->prepare("SELECT id FROM equipes WHERE id = ? AND id_lider = ?");
    $stmt_check->execute([$id_equipe, $id_usuario]);
    if (!$stmt_check->fetch()) {
        die("Equipe inválida ou sem permissão.");
    }

    $sql = "UPDATE participantes SET nome_completo = ?, apelido = ?, data_nascimento = ?, numero_camisa = ?, id_equipe = ? WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$nome, $apelido, $data_nascimento, $numero_camisa, $id_equipe, $id]);

    header("Location: gerenciar_jogadores.php");
    exit();
}

require_once '../includes/header.php';
require_once 'sidebar_equipe.php';
?>

<div class="container mt-4">
    <h2>Editar Jogador</h2>
    <form method="POST">
        <div class="mb-3">
            <label class="form-label">Equipe</label>
            <select class="form-select" name="id_equipe" required>
                <?php foreach($equipes_do_lider as $equipe): ?>
                    <option value="<?= $equipe['id'] ?>" <?= ($equipe['id'] == $jogador['equipe_id']) ? 'selected' : '' ?>>
                        <?= htmlspecialchars($equipe['nome']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="mb-3">
            <label class="form-label">Nome Completo</label>
            <input type="text" class="form-control" name="nome_completo" value="<?= htmlspecialchars($jogador['nome_completo']) ?>" required>
        </div>
        <div class="mb-3">
            <label class="form-label">Apelido</label>
            <input type="text" class="form-control" name="apelido" value="<?= htmlspecialchars($jogador['apelido']) ?>">
        </div>
        <div class="mb-3">
            <label class="form-label">Nascimento</label>
            <input type="date" class="form-control" name="data_nascimento" value="<?= $jogador['data_nascimento'] ?>" required>
        </div>
        <div class="mb-3">
            <label class="form-label">Nº Camisa</label>
            <input type="number" class="form-control" name="numero_camisa" value="<?= htmlspecialchars($jogador['numero_camisa']) ?>">
        </div>
        <button type="submit" class="btn btn-success">Salvar Alterações</button>
        <a href="gerenciar_jogadores.php" class="btn btn-secondary">Cancelar</a>
    </form>
</div>

<?php require_once '../includes/footer_dashboard.php'; ?>
