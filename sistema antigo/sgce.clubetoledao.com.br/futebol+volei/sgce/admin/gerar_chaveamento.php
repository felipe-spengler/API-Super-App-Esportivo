<?php
// /admin/gerar_chaveamento.php
require_once '../includes/db.php';
// Adicionar lógica de proteção para admin aqui (ex: include '../includes/proteger_admin.php';)

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id_campeonato'])) {
    $id_campeonato = $_POST['id_campeonato'];

    try {
        // 1. Buscar as equipes inscritas no campeonato
        $stmt = $pdo->prepare("SELECT id_equipe FROM campeonatos_equipes WHERE id_campeonato = ?");
        $stmt->execute([$id_campeonato]);
        $equipes = $stmt->fetchAll(PDO::FETCH_COLUMN);

        // 2. Embaralhar as equipes para o sorteio
        shuffle($equipes);

        // 3. Verificar se o número de equipes é uma potência de 2 (ideal para mata-mata)
        // Se não for, a lógica precisaria ser mais complexa (times que avançam direto, etc.)
        // Para este exemplo, vamos supor que é.

        // 4. Gerar as partidas
        $fase = "Oitavas de Final"; // Determinar a fase com base no número de equipes
        if (count($equipes) <= 8) $fase = "Quartas de Final";
        if (count($equipes) <= 4) $fase = "Semifinal";
        if (count($equipes) <= 2) $fase = "Final";


        $pdo->beginTransaction();

        for ($i = 0; $i < count($equipes); $i += 2) {
            $id_equipe_a = $equipes[$i];
            $id_equipe_b = $equipes[$i + 1];

            $sql = "INSERT INTO partidas (id_campeonato, id_equipe_a, id_equipe_b, fase, status) VALUES (?, ?, ?, ?, 'Agendada')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id_campeonato, $id_equipe_a, $id_equipe_b, $fase]);
        }

        // 5. Atualizar o status do campeonato
        $stmt = $pdo->prepare("UPDATE campeonatos SET status = 'Em Andamento' WHERE id = ?");
        $stmt->execute([$id_campeonato]);
        
        $pdo->commit();
        
        echo "Chaveamento gerado com sucesso!";
        // Redirecionar de volta para a página do campeonato
        header("Location: /sgce/admin/gerenciar_campeonatos.php?id=$id_campeonato");
        exit();

    } catch (Exception $e) {
        $pdo->rollBack();
        die("Erro ao gerar chaveamento: " . $e->getMessage());
    }
}
?>