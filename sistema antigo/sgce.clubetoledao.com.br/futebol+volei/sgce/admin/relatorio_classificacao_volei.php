<?php
require_once '../includes/db.php';
require_once '../includes/proteger_admin.php';

// Valida o ID do campeonato na URL
if (!isset($_GET['id_categoria']) || !is_numeric($_GET['id_categoria'])) {
    die("Campeonato não especificado.");
}

$id_categoria = $_GET['id_categoria'];

// 1. Busca o nome do campeonato
$sql_campeonato = "
    SELECT 
        c.nome as nome_campeonato,
        c.id_campeonato_pai,
        cp.nome as nome_campeonato_pai
    FROM campeonatos c
    LEFT JOIN campeonatos cp ON(c.id_campeonato_pai=cp.id)
    WHERE c.id = ?
";
$stmt_campeonato = $pdo->prepare($sql_campeonato);
$stmt_campeonato->execute([$id_categoria]);
$campeonato = $stmt_campeonato->fetch(PDO::FETCH_ASSOC);

if (!$campeonato) {
    die("Campeonato não encontrado.");
}

// 2. Busca as equipes participantes do campeonato
$sql_equipes = "
    SELECT DISTINCT eq.id, eq.nome
    FROM equipes eq
    JOIN campeonatos_equipes ce ON eq.id = ce.id_equipe
    WHERE ce.id_campeonato = ?
";
$stmt_equipes = $pdo->prepare($sql_equipes);
$stmt_equipes->execute([$id_categoria]);
$equipes = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);

// 3. Calcula estatísticas para cada equipe
$classificacao = [];
foreach ($equipes as $equipe) {
    // ATENÇÃO: Se você armazena PONTOS TOTAIS em colunas separadas
    // (além do placar de sets), você deve incluí-las na query abaixo:
    // Exemplo: p.pontos_a, p.pontos_b
    $sql_partidas = "
        SELECT 
            p.id_equipe_a, p.id_equipe_b, p.placar_equipe_a, p.placar_equipe_b, p.status
        FROM partidas p
        WHERE p.id_campeonato = ? 
        AND (p.id_equipe_a = ? OR p.id_equipe_b = ?)
        AND p.status = 'Finalizada'
    ";
    $stmt_partidas = $pdo->prepare($sql_partidas);
    $stmt_partidas->execute([$id_categoria, $equipe['id'], $equipe['id']]);
    $partidas = $stmt_partidas->fetchAll(PDO::FETCH_ASSOC);

    $jogos = 0;
    $vitorias = 0;
    $derrotas = 0;
    $pontos = 0; // Pontos na classificação (3, 2, 1, 0)

    $sets_pro = 0;
    $sets_contra = 0;

    // VARIÁVEIS PARA PONTOS TOTAIS DA FASE (necessário para Point Average)
    // ATENÇÃO: Estou usando o placar de sets aqui, o que é INCORRETO para PA!
    // Você deve substituir por campos de PONTOS TOTAIS quando estiverem disponíveis.
    $pontos_pro_totais = 0;
    $pontos_contra_totais = 0;

    foreach ($partidas as $partida) {
        $jogos++;

        // Assumindo que placar_equipe_a/b agora são os SETS vencidos
        $sets_a = (int) $partida['placar_equipe_a'];
        $sets_b = (int) $partida['placar_equipe_b'];

        // --- INÍCIO DA LÓGICA DE CÁLCULO DE PONTOS E SETS ---
        if ($partida['id_equipe_a'] == $equipe['id']) {
            // Equipe atual é a A
            $sets_pro += $sets_a;
            $sets_contra += $sets_b;

            // SUBSTITUA ESTAS LINHAS: $pontos_pro_totais += $partida['pontos_a'];
            $pontos_pro_totais += $sets_a;
            $pontos_contra_totais += $sets_b;

            if ($sets_a > $sets_b) {
                // VITÓRIA
                $vitorias++;
                if ($sets_b < 2) { // Venceu por 3x0 ou 3x1
                    $pontos += 3;
                } else { // Venceu por 3x2
                    $pontos += 2;
                }
            } else {
                // DERROTA
                $derrotas++;
                if ($sets_a == 2 && $sets_b == 3) { // Perdeu por 2x3
                    $pontos += 1;
                } else { // Perdeu por 0x3 ou 1x3
                    $pontos += 0;
                }
            }
        } elseif ($partida['id_equipe_b'] == $equipe['id']) {
            // Equipe atual é a B
            $sets_pro += $sets_b;
            $sets_contra += $sets_a;

            // SUBSTITUA ESTAS LINHAS: $pontos_pro_totais += $partida['pontos_b'];
            $pontos_pro_totais += $sets_b;
            $pontos_contra_totais += $sets_a;

            if ($sets_b > $sets_a) {
                // VITÓRIA
                $vitorias++;
                if ($sets_a < 2) { // Venceu por 3x0 ou 3x1
                    $pontos += 3;
                } else { // Venceu por 3x2
                    $pontos += 2;
                }
            } else {
                // DERROTA
                $derrotas++;
                if ($sets_b == 2 && $sets_a == 3) { // Perdeu por 2x3
                    $pontos += 1;
                } else { // Perdeu por 0x3 ou 1x3
                    $pontos += 0;
                }
            }
        }
    }

    // Cálculo dos Averages (Média) - Critérios de desempate
    // 1. Set Average (Set Pró / Set Contra)
    $set_average = ($sets_contra > 0) ? $sets_pro / $sets_contra : ($sets_pro > 0 ? INF : 0);
    // 2. Point Average (Pontos Pró / Pontos Contra)
    $point_average = ($pontos_contra_totais > 0) ? $pontos_pro_totais / $pontos_contra_totais : ($pontos_pro_totais > 0 ? INF : 0);

    $classificacao[] = [
        'nome' => $equipe['nome'],
        'jogos' => $jogos,
        'vitorias' => $vitorias,
        'derrotas' => $derrotas,
        'pontos' => $pontos,
        'sets_pro' => $sets_pro,
        'sets_contra' => $sets_contra,
        'set_average' => $set_average,
        'pontos_pro' => $pontos_pro_totais,
        'pontos_contra' => $pontos_contra_totais,
        'point_average' => $point_average,
    ];
}

// Ordenação: Pontos > Vitórias > Set Average > Point Average > Confronto Direto
usort($classificacao, function ($a, $b) {
    // 1. Pontos
    if ($b['pontos'] != $a['pontos']) {
        return $b['pontos'] <=> $a['pontos'];
    }
    // 2. Vitórias
    if ($b['vitorias'] != $a['vitorias']) {
        return $b['vitorias'] <=> $a['vitorias'];
    }
    // 3. Set Average (Média de Sets Pró/Contra)
    if ($b['set_average'] != $a['set_average']) {
        // Tratamento para INF (divisão por zero) - Prioridade para quem tem 0 SC
        if ($a['sets_contra'] == 0 && $a['sets_pro'] > 0 && $b['sets_contra'] > 0)
            return 1;
        if ($b['sets_contra'] == 0 && $b['sets_pro'] > 0 && $a['sets_contra'] > 0)
            return -1;

        return $b['set_average'] <=> $a['set_average'];
    }
    // 4. Point Average (Média de Pontos Pró/Contra)
    if ($b['point_average'] != $a['point_average']) {
        // Tratamento para INF (divisão por zero) - Prioridade para quem tem 0 PC
        if ($a['pontos_contra'] == 0 && $a['pontos_pro'] > 0 && $b['pontos_contra'] > 0)
            return 1;
        if ($b['pontos_contra'] == 0 && $b['pontos_pro'] > 0 && $a['pontos_contra'] > 0)
            return -1;

        return $b['point_average'] <=> $a['point_average'];
    }

    // 5. Confronto Direto seria o próximo
    return 0;
});

require_once '../includes/header.php';
require_once 'sidebar.php';
?>

<nav aria-label="breadcrumb">
    <ol class="breadcrumb">
        <li class="breadcrumb-item"><a href="index.php">Dashboard</a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos.php">Campeonato <?php echo htmlspecialchars($campeonato['nome_campeonato_pai']); ?></a></li>
        <li class="breadcrumb-item"><a href="gerenciar_campeonatos_categoria.php?id_campeonato=<?= htmlspecialchars($campeonato['id_campeonato_pai']) ?>">Gerenciar Categorias</a></li>
        <li class="breadcrumb-item"><a href="categoria_volei.php?id_categoria=<?= htmlspecialchars($id_categoria) ?>">Categoria <?php echo htmlspecialchars($campeonato['nome_campeonato']); ?></a></li>
        <li class="breadcrumb-item active" aria-current="page">Classificação</li>
    </ol>
</nav>

<main class="container py-5">
    <div class="card">
        <div class="card-header"><i class="fas fa-trophy text-warning me-2"></i>Classificação do Campeonato (Vôlei)</div>
        <div class="card-body">
<?php if (count($classificacao) > 0): ?>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Posição</th>
                                <th>Equipe</th>
                                <th>P</th>
                                <th>J</th>
                                <th>V</th>
                                <th>D</th>
                                <th>Sets Pró</th>
                                <th>Sets Contra</th>
                                <th>Saldo Sets</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $posicao = 1;
                            foreach ($classificacao as $class):
                                $saldo_sets = $class['sets_pro'] - $class['sets_contra'];
                                ?>
                                <tr>
                                    <td><?= $posicao++ ?></td>
                                    <td><?= htmlspecialchars($class['nome']) ?></td>
                                    <td><?= $class['pontos'] ?></td>
                                    <td><?= $class['jogos'] ?></td>
                                    <td><?= $class['vitorias'] ?></td>
                                    <td><?= $class['derrotas'] ?></td>
                                    <td><?= $class['sets_pro'] ?></td>
                                    <td><?= $class['sets_contra'] ?></td>
                                    <td>
                                        <strong class="<?= $saldo_sets > 0 ? 'text-success' : ($saldo_sets < 0 ? 'text-danger' : '') ?>">
                                <?= $saldo_sets >= 0 ? '+' : '' ?><?= $saldo_sets ?>
                                        </strong>
                                    </td>
                                </tr>
                <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
<?php else: ?>
                <div class="alert alert-secondary text-center">Nenhuma partida finalizada para exibir a classificação.</div>
<?php endif; ?>

            <hr class="my-4">


        </div>
    </div>
</main>

<?php require_once '../includes/footer_dashboard.php'; ?>