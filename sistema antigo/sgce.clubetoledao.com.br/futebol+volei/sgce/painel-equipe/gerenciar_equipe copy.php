<?php
// /painel-equipe/gerenciar_equipe.php
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php'; // Assumindo que protege o acesso e define $_SESSION['user_id']

// Pega o ID do usuário logado
$id_usuario = $_SESSION['user_id'] ?? null;
if (!$id_usuario) {
    header('Location: ../login.php');
    exit();
}

// Validate id_categoria from GET
$id_categoria = filter_var($_GET['id_categoria'] ?? null, FILTER_VALIDATE_INT);
if (!$id_categoria) {
    header('Location: menu_campeonato_categoria_equipe.php');
    exit;
}
$categoria = null;
try {
    // Fetch category details and parent championship
    $stmt_categoria = $pdo->prepare("
        SELECT 
            c.id, 
            c.nome AS nome_categoria, 
            c.id_campeonato_pai, 
            cp.nome AS nome_campeonato_pai,
            e.nome AS esporte_nome,
            c.data_inicio,
            c.tipo_chaveamento,
            c.status
        FROM campeonatos c
        LEFT JOIN campeonatos cp ON c.id_campeonato_pai = cp.id
        JOIN esportes e ON c.id_esporte = e.id
        WHERE c.id = ?
    ");
    $stmt_categoria->execute([$id_categoria]);
    $categoria = $stmt_categoria->fetch(PDO::FETCH_ASSOC);
    
    if (!$categoria) {
        header('Location: menu_campeonato_categoria_equipe.php');
        exit;
    }

} catch (PDOException $e) {
    // Log error to file
    error_log("Database Error: " . $e->getMessage());
    die("A database error occurred. Please contact the administrator.");
}
// Tratamento para exclusão de equipe via POST (ex: botão excluir)
$notificacao = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['excluir_equipe_id'])) {
    $id_excluir = (int)$_POST['excluir_equipe_id'];

    // Verifica se o usuário é líder dessa equipe antes de excluir
    $stmt = null;
    if ($_SESSION['user_tipo'] == 'admin') {
        $stmt = $pdo->prepare("SELECT id FROM equipes WHERE id = ? ");
        $stmt->execute([$id_excluir]);
    } else {
        $stmt = $pdo->prepare("SELECT id FROM equipes WHERE id = ? AND id_lider = ? ");
        $stmt->execute([$id_excluir, $id_usuario]);
    }
    $existe = $stmt->fetch();

    if ($existe) {
        // Verifica se existem jogadores nesta equipe
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM participantes WHERE id_equipe = ?");
        $stmt->execute([$id_excluir]);
        $qtd_jogadores = $stmt->fetchColumn();

        if ($qtd_jogadores > 0) {
            // Não permite exclusão e exibe mensagem
            $notificacao = [
                'tipo' => 'error', 
                'mensagem' => "Não é possível excluir a equipe pois existem {$qtd_jogadores} jogador(es) vinculado(s) a ela."
            ];
        } else {
            // Remove brasão do servidor, se houver
            $stmt = $pdo->prepare("SELECT brasao FROM equipes WHERE id = ?");
            $stmt->execute([$id_excluir]);
            $brasao = $stmt->fetchColumn();
            if ($brasao && file_exists('../public/brasoes/' . $brasao)) {
                unlink('../public/brasoes/' . $brasao);
            }

            // Apaga a equipe
            $stmt = $pdo->prepare("DELETE FROM equipes WHERE id = ?");
            if ($stmt->execute([$id_excluir])) {
                $notificacao = ['tipo' => 'success', 'mensagem' => 'Equipe excluída com sucesso!'];
            } else {
                $notificacao = ['tipo' => 'error', 'mensagem' => 'Erro ao excluir a equipe.'];
            }
        }
    } else {
        $notificacao = ['tipo' => 'error', 'mensagem' => 'Equipe não encontrada ou você não tem permissão para excluir.'];
    }
}

// Pega todas as equipes que o usuário lidera e que estão associadas ao campeonato (id_categoria)
if ($_SESSION['user_tipo'] == 'admin') {
    $stmt = $pdo->prepare("
        SELECT e.*
        FROM equipes e
        INNER JOIN campeonatos_equipes ce ON e.id = ce.id_equipe
        WHERE ce.id_campeonato = ?
        ORDER BY e.nome
    ");
    $stmt->execute([$id_categoria]);
} else {
    $stmt = $pdo->prepare("
        SELECT e.*
        FROM equipes e
        INNER JOIN campeonatos_equipes ce ON e.id = ce.id_equipe
        WHERE ce.id_campeonato = ? AND e.id_lider = ?
        ORDER BY e.nome
    ");
    $stmt->execute([$id_categoria, $id_usuario]);
}
$equipes = $stmt->fetchAll(PDO::FETCH_ASSOC);

require_once '../includes/header.php';
require_once 'sidebar_equipe.php';
?>
<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="menu_campeonato_categoria_equipe.php">Equipes por Campeonato <?php echo htmlspecialchars($categoria['nome_campeonato_pai']); ?></a></li>
        <li class="breadcrumb-item active" aria-current="page">
            <a href="menu_categoria_equipe.php?id_campeonato=<?php echo htmlspecialchars($categoria['id_campeonato_pai']); ?>">
                Equipes por Campeonato/Categoria <?php echo htmlspecialchars($categoria['nome_categoria']); ?>
            </a>
        </li>
    </ol>
</nav>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-shield-alt fa-fw me-2"></i>Gerenciar Minhas Equipes</h1>
    <a href="editar_equipe.php?id_categoria=<?php echo $id_categoria;?>" class="btn btn-primary"><i class="fas fa-plus me-1"></i> Criar Nova Equipe</a>
</div>

<?php if ($notificacao): ?>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3500,
            timerProgressBar: true,
            icon: '<?= htmlspecialchars($notificacao['tipo']) ?>',
            title: '<?= htmlspecialchars($notificacao['mensagem']) ?>'
        });
    });
</script>
<?php endif; ?>

<div class="card">
    <div class="card-header"><i class="fas fa-list me-1"></i> Minhas Equipes</div>
    <div class="card-body">
        <?php if (count($equipes) === 0): ?>
            <p>Nenhuma equipe associada a este campeonato. Clique em "Criar Nova Equipe" para começar.</p>
        <?php else: ?>
            <div class="table-responsive">
                <table class="table table-hover align-middle">
                    <thead>
                        <tr>
                            <th>Brasão</th>
                            <th>Nome</th>
                            <th>Sigla</th>
                            <th>Cidade</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($equipes as $equipe): ?>
                            <tr>
                                <td>
                                    <?php if ($equipe['brasao'] && file_exists('../public/brasoes/' . $equipe['brasao'])): ?>
                                        <img src="../public/brasoes/<?= htmlspecialchars($equipe['brasao']) ?>" alt="Brasão <?= htmlspecialchars($equipe['nome']) ?>" style="max-width: 50px; max-height: 50px; border-radius: 5px;">
                                    <?php else: ?>
                                        <span class="text-muted">Sem brasão</span>
                                    <?php endif; ?>
                                </td>
                                <td><?= htmlspecialchars($equipe['nome']) ?></td>
                                <td><?= htmlspecialchars($equipe['sigla']) ?></td>
                                <td><?= htmlspecialchars($equipe['cidade']) ?></td>
                                <td>
                                    <a href="editar_equipe.php?id=<?= $equipe['id'] ?>&id_categoria=<?=$id_categoria    ?>" class="btn btn-warning btn-sm" title="Editar equipe">
                                        <i class="fas fa-edit"></i>
                                    </a>
                                    <form method="POST" style="display:inline-block" onsubmit="return confirm('Tem certeza que deseja excluir a equipe <?= htmlspecialchars(addslashes($equipe['nome'])) ?>? Esta ação não pode ser desfeita.')">
                                        <input type="hidden" name="excluir_equipe_id" value="<?= $equipe['id'] ?>">
                                        <button type="submit" class="btn btn-danger btn-sm" title="Excluir equipe">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php require_once '../includes/footer_dashboard.php'; ?>   