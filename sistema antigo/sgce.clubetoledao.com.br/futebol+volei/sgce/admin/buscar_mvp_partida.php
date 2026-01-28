<?php
require_once '../includes/db.php';
header('Content-Type: application/json');

$id_partida = $_GET['id_partida'] ?? 0;
if (!$id_partida) {
    echo json_encode(['success' => false]);
    exit;
}

$sql = "
    SELECT
        par.nome_completo,
        par.apelido,
        eq.nome AS equipe,
        COALESCE(p.placar_equipe_a, 0) AS placar_a,
        COALESCE(p.placar_equipe_b, 0) AS placar_b,
        ea.nome AS nome_equipe_a,
        eb.nome AS nome_equipe_b,

        -- 1. Foto já escolhida na súmula
        f_selecionada.src AS foto_selecionada,

        -- 2. Foto marcada como principal
        f_principal.src AS foto_principal,

        -- 3. Qualquer foto (a primeira que existir)
        f_qualquer.src AS foto_qualquer

    FROM partidas p
    JOIN participantes par ON p.id_melhor_jogador = par.id
    JOIN equipes eq ON par.id_equipe = eq.id
    JOIN equipes ea ON p.id_equipe_a = ea.id
    JOIN equipes eb ON p.id_equipe_b = eb.id

    -- 1. Foto da súmula
    LEFT JOIN fotos_participantes f_selecionada 
        ON f_selecionada.id = p.id_foto_selecionada_melhor_jogador

    -- 2. Foto principal
    LEFT JOIN fotos_participantes f_principal 
        ON f_principal.participante_id = par.id 
        AND f_principal.principal = 1

    -- 3. Qualquer foto
    LEFT JOIN fotos_participantes f_qualquer 
        ON f_qualquer.participante_id = par.id
        AND f_qualquer.id = (
            SELECT MIN(id) 
            FROM fotos_participantes 
            WHERE participante_id = par.id
        )

    WHERE p.id = ?
    LIMIT 1
";

$stmt = $pdo->prepare($sql);
$stmt->execute([$id_partida]);
$mvp = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$mvp) {
    echo json_encode(['success' => false, 'message' => 'MVP não encontrado']);
    exit;
}

// Monta o placar
$placar = "{$mvp['nome_equipe_a']} {$mvp['placar_a']} x {$mvp['placar_b']} {$mvp['nome_equipe_b']}";

// Escolhe a foto (EXATAMENTE na ordem que você pediu)
$foto_src = $mvp['foto_selecionada'] 
         ?? $mvp['foto_principal'] 
         ?? $mvp['foto_qualquer'] 
         ?? null;

$foto_url = $foto_src ? "/sgce/" . $foto_src : null;

echo json_encode([
    'success' => true,
    'mvp' => [
        'nome_completo' => $mvp['nome_completo'],
        'apelido'       => $mvp['apelido'],
        'equipe'        => $mvp['equipe'],
        'placar'        => $placar,
        'foto'          => $foto_url  // ← NULL se não tiver foto
    ]
]);