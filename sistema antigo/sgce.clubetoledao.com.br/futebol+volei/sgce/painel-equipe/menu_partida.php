<?php
require_once '../includes/db.php';
require_once '../includes/proteger_equipe.php';

// Iniciar sessão, se não estiver ativa
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Validate id_partida from GET
$id_partida = isset($_GET['id_partida']) ? filter_var($_GET['id_partida'], FILTER_VALIDATE_INT) : null;
if (!$id_partida) {
    $_SESSION['notificacao'] = [
        'tipo' => 'error',
        'mensagem' => 'ID da partida inválido.'
    ];
    echo '<script>history.back();</script>';
    exit;
}

// Fetch match details and associated championship
$stmt_partida = $pdo->prepare("
    SELECT p.id, p.fase, p.placar_equipe_a, p.placar_equipe_b, p.id_campeonato,
           a.nome as nome_a, a.id as id_equipe_a, b.nome as nome_b, b.id as id_equipe_b,
           c.nome as nome_campeonato, c.id_campeonato_pai, cp.nome as nome_campeonato_pai
    FROM partidas p
    JOIN equipes a ON p.id_equipe_a = a.id
    JOIN equipes b ON p.id_equipe_b = b.id
    JOIN campeonatos c ON p.id_campeonato = c.id
    LEFT JOIN campeonatos cp ON c.id_campeonato_pai = cp.id
    WHERE p.id = ?  
");
$stmt_partida->execute([$id_partida]);
$partida = $stmt_partida->fetch(PDO::FETCH_ASSOC);

// Check if match exists and is finalized
if (!$partida) {
    $_SESSION['notificacao'] = [
        'tipo' => 'error',
        'mensagem' => 'Partida não encontrada '
    ];
    echo '<script>history.back();</script>';
    exit;
}

// Fetch all participants from both teams with their photos
$stmt_participantes = $pdo->prepare("
    SELECT p.id, p.nome_completo, p.apelido, fp.id as foto_id, fp.src as foto_src
    FROM participantes p
    LEFT JOIN fotos_participantes fp ON p.id = fp.participante_id
    WHERE p.id_equipe IN (?, ?)
    ORDER BY p.nome_completo ASC
");
$stmt_participantes->execute([$partida['id_equipe_a'], $partida['id_equipe_b']]);
$participantes = [];
$rows = $stmt_participantes->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $row) {
    $participante_id = $row['id'];
    if (!isset($participantes[$participante_id])) {
        $participantes[$participante_id] = [
            'id' => $row['id'],
            'nome_completo' => $row['nome_completo'],
            'apelido' => $row['apelido'],
            'fotos' => []
        ];
    }
    if ($row['foto_id']) {
        $participantes[$participante_id]['fotos'][] = [
            'id' => $row['foto_id'],
            'src' => $row['foto_src']
        ];
    }
}// --- INÍCIO DA RENDERIZAÇÃO DO HTML ---
require_once '../includes/header.php';
require_once 'sidebar_equipe.php';

?>



<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2"><i class="fas fa-image fa-fw me-2"></i><?= htmlspecialchars($partida['nome_a'] . ' x ' . $partida['nome_b'] . ' (' . $partida['fase'] . ')') ?></h1>
    <a href="confronto.php?id_categoria=<?= htmlspecialchars($partida['id_campeonato']) ?>" class="btn btn-outline-secondary btn-sm"><i class="fas fa-arrow-left me-1"></i> Voltar</a>
</div>

<style>
    .btn-gerar-arte:hover, .btn-gerar-confronto:hover {
        transform: scale(1.05);
        transition: transform 0.2s;
    }
    .foto-container {
        position: relative;
        display: inline-block;
        margin: 5px;
        text-align: center;
    }
    .foto-container img {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 5px;
        border: 1px solid #ccc;
    }
    .foto-container input[type="radio"]:checked + img {
        border: 2px solid #007bff;
    }
    .btn-excluir-foto {
        position: absolute;
        top: 2px;
        right: 2px;
        color: red;
        cursor: pointer;
        background: white;
        border-radius: 50%;
        padding: 2px 5px;
    }
</style>

<div class="row">
    <?php
    $categorias = [
        'Sumula' => ['titulo' => 'Súmula', 'icone' => 'fas fa-chart-bar', 'cor' => 'secundary','url'=>'sumula.php?id_partida='.$partida['id']],
        'gerarSumula' => ['titulo' => 'Gerar Súmula', 'icone' => 'fas fa-file-alt', 'cor' => 'primary','url'=>'sumula_adm.php?id_partida='.$partida['id']],
        'gerarArte' => ['titulo' => 'Gerar Arte', 'icone' => 'fas fa-id-badge', 'cor' => 'success','url'=>'menu_gerar_arte.php?id_partida='.$partida['id']],
    ];

    foreach ($categorias as $categoria => $info) {
    ?>
        <div class="col-xl-3 col-md-6 mb-4">
            <a href="<?= $info['url'] ?>" class="card border-left-<?= $info['cor'] ?> text-decoration-none shadow h-100 w-100 py-2 border-0 btn-gerar-arte">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs fw-bold text-<?= $info['cor'] ?> text-uppercase mb-1 text-start"><?= strtoupper($info['titulo']) ?></div>
                            <div class="h5 mb-0 fw-bold text-gray-800"></div>
                        </div>
                        <div class="col-auto"><i class="<?= $info['icone'] ?> fa-2x text-<?= $info['cor'] ?>"></i></div>
                    </div>
                </div>
            </a>
        </div>
    <?php
    }
    ?>

</div>

<?php
// Session-based notifications
if (isset($_SESSION['notificacao'])) {
    $notificacao = $_SESSION['notificacao'];
    unset($_SESSION['notificacao']);
    echo "<script>
        document.addEventListener('DOMContentLoaded', () => {
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3500,
                timerProgressBar: true,
                icon: '{$notificacao['tipo']}',
                title: `{$notificacao['mensagem']}`
            });
        });
    </script>";
}
?>


<?php require_once '../includes/footer_dashboard.php'; ?>