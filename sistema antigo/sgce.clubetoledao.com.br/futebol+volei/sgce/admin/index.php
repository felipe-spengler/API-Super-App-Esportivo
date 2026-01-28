<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// --- BUSCA DE DADOS PARA O DASHBOARD ---

// 1. DADOS PARA OS CARDS DE ESTATÍSTICAS
$total_campeonatos = $pdo->query("SELECT COUNT(*) FROM campeonatos")->fetchColumn();
$total_equipes = $pdo->query("SELECT COUNT(*) FROM equipes")->fetchColumn();
$total_participantes = $pdo->query("SELECT COUNT(*) FROM participantes")->fetchColumn();
$partidas_agendadas = $pdo->query("SELECT COUNT(*) FROM partidas WHERE status = 'Agendada'")->fetchColumn();

// 2. DADOS PARA OS GRÁFICOS
// Gráfico de Usuários
$total_admins = $pdo->query("SELECT COUNT(*) FROM usuarios WHERE tipo='admin'")->fetchColumn();
$total_lideres = $pdo->query("SELECT COUNT(*) FROM usuarios WHERE tipo='lider_equipe'")->fetchColumn();

// Gráfico de Inscrições por Campeonato (Top 5)
$stmt_inscricoes = $pdo->query("
    SELECT c.nome, COUNT(ce.id_equipe) as total_inscritos
    FROM campeonatos c
    LEFT JOIN campeonatos_equipes ce ON c.id = ce.id_campeonato
    GROUP BY c.id, c.nome
    ORDER BY total_inscritos DESC
    LIMIT 5
");
$inscricoes_data = $stmt_inscricoes->fetchAll(PDO::FETCH_ASSOC);
$chart_inscricoes_labels = json_encode(array_column($inscricoes_data, 'nome'));
$chart_inscricoes_valores = json_encode(array_column($inscricoes_data, 'total_inscritos'));

// 3. DADOS PARA AS LISTAS DE ATIVIDADES
// Próximas 5 Partidas Agendadas
$stmt_proximas_partidas = $pdo->query("
    SELECT p.id, p.data_partida, a.nome as nome_a, b.nome as nome_b, c.nome as nome_campeonato
    FROM partidas p
    JOIN equipes a ON p.id_equipe_a = a.id
    JOIN equipes b ON p.id_equipe_b = b.id
    JOIN campeonatos c ON p.id_campeonato = c.id
    WHERE p.status = 'Agendada' AND p.data_partida >= NOW()
    ORDER BY p.data_partida ASC
    LIMIT 5
");
$proximas_partidas = $stmt_proximas_partidas->fetchAll(PDO::FETCH_ASSOC);

// Últimas 5 equipes inscritas em campeonatos
$stmt_ultimas_inscricoes = $pdo->query("
    SELECT e.nome as nome_equipe, c.nome as nome_campeonato, ce.data_inscricao
    FROM campeonatos_equipes ce
    JOIN equipes e ON ce.id_equipe = e.id
    JOIN campeonatos c ON ce.id_campeonato = c.id
    ORDER BY ce.data_inscricao DESC
    LIMIT 5
");
$ultimas_inscricoes = $stmt_ultimas_inscricoes->fetchAll(PDO::FETCH_ASSOC);


require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
    <h1 class="h2">Dashboard</h1>
</div>

<div class="row">
    <div class="col-xl-3 col-md-6 mb-4">
        <a  href="gerenciar_campeonatos.php" style="text-decoration: none;" class="card border-left-primary shadow h-100 py-2">
            <div class="card-body" >
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-primary text-uppercase mb-1">Campeonatos Ativos</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"><?= $total_campeonatos ?></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-trophy fa-2x text-gray-300"></i></div>
                </div>
            </div>
        </a>
    </div>
    <div class="col-xl-3 col-md-6 mb-4">
        <a  href="menu_campeonato_categoria_equipe.php" style="text-decoration: none;"  class="card border-left-success shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-success text-uppercase mb-1">Equipes Cadastradas</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"><?= $total_equipes ?></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-users fa-2x text-gray-300"></i></div>
                </div>
            </div>
        </a>
    </div>
    <div class="col-xl-3 col-md-6 mb-4">
        <a  href="participantes_admin.php" style="text-decoration: none;"  class="card border-left-info shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-info text-uppercase mb-1">Total de Participantes</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"><?= $total_participantes ?></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-user-friends fa-2x text-gray-300"></i></div>
                </div>
            </div>
        </a>
    </div>
    <div class="col-xl-3 col-md-6 mb-4">
        <a href="ver_partidas.php" style="text-decoration: none;" class="card border-left-warning shadow h-100 py-2">
            <div class="card-body">
                <div class="row no-gutters align-items-center">
                    <div class="col mr-2">
                        <div class="text-xs fw-bold text-warning text-uppercase mb-1">Partidas Agendadas</div>
                        <div class="h5 mb-0 fw-bold text-gray-800"><?= $partidas_agendadas ?></div>
                    </div>
                    <div class="col-auto"><i class="fas fa-calendar-alt fa-2x text-gray-300"></i></div>
                </div>
            </div>
        </a>
    </div>
</div>

<div class="row">
    <div class="col-lg-7 mb-4">
        <div class="card h-100">
            <div class="card-header"><i class="fas fa-chart-bar me-1"></i> Top 5 Campeonatos por Inscrições</div>
            <div class="card-body"><canvas id="inscricoesChart"></canvas></div>
        </div>
    </div>
    <div class="col-lg-5 mb-4">
        <a href="gerenciar_usuarios.php" style="text-decoration: none;"  class="card h-100">
            <div class="card-header"><i class="fas fa-chart-pie me-1"></i> Usuários do Sistema</div>
            <div class="card-body"><canvas id="usuariosChart"></canvas></div>
        </a>
    </div>
</div>

<div class="row">
    <div class="col-lg-6 mb-4">
        <div class="card h-100">
            <div class="card-header"><i class="fas fa-clock me-1"></i> Próximas Partidas</div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-striped table-hover mb-0">
                        <tbody>
                            <?php foreach($proximas_partidas as $partida): ?>
                            <tr>
                                <td>
                                    <strong><?= htmlspecialchars($partida['nome_a']) ?></strong> vs <strong><?= htmlspecialchars($partida['nome_b']) ?></strong><br>
                                    <small class="text-muted"><?= htmlspecialchars($partida['nome_campeonato']) ?></small>
                                </td>
                                <td class="text-end align-middle">
                                    <span class="badge bg-light text-dark"><?= date('d/m/Y H:i', strtotime($partida['data_partida'])) ?></span>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                            <?php if(empty($proximas_partidas)): ?>
                            <tr><td class="text-center p-3">Nenhuma partida agendada.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    <div class="col-lg-6 mb-4">
        <div class="card h-100">
            <div class="card-header"><i class="fas fa-clipboard-list me-1"></i> Atividade Recente (Inscrições)</div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-striped table-hover mb-0">
                         <tbody>
                            <?php foreach($ultimas_inscricoes as $inscricao): ?>
                            <tr>
                                <td>
                                    A equipe <strong><?= htmlspecialchars($inscricao['nome_equipe']) ?></strong> se inscreveu em<br>
                                    <small class="text-muted"><?= htmlspecialchars($inscricao['nome_campeonato']) ?></small>
                                </td>
                                <td class="text-end align-middle">
                                    <span class="badge bg-light text-dark"><?= date('d/m/Y', strtotime($inscricao['data_inscricao'])) ?></span>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                            <?php if(empty($ultimas_inscricoes)): ?>
                            <tr><td class="text-center p-3">Nenhuma inscrição recente.</td></tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener("DOMContentLoaded", function() {
    // Gráfico de Barras com dados dinâmicos
    const ctxBar = document.getElementById('inscricoesChart').getContext('2d');
    new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: <?= $chart_inscricoes_labels ?>,
            datasets: [{
                label: '# de Equipes Inscritas',
                data: <?= $chart_inscricoes_valores ?>,
                backgroundColor: 'rgba(13, 110, 253, 0.7)',
                borderColor: 'rgba(13, 110, 253, 1)',
                borderWidth: 1
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } 
        }
    });

    // Gráfico de Pizza com dados dinâmicos
    const ctxPie = document.getElementById('usuariosChart').getContext('2d');
    new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Administradores', 'Líderes de Equipe'],
            datasets: [{
                data: [<?= $total_admins ?>, <?= $total_lideres ?>],
                backgroundColor: ['#dc3545', '#198754'],
                hoverOffset: 4
            }]
        },
        options: { 
            responsive: true,
            maintainAspectRatio: false
        }
    });
});
</script>

<?php require_once '../includes/footer_dashboard.php'; ?>