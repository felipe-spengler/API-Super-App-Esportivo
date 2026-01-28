<?php

require_once '../includes/db.php';
$encoding = mb_internal_encoding();

// === 1. VALIDAÇÃO OBRIGATÓRIA ===
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_POST['id_jogador']) || empty($_POST['categoria'])) {
    die("Erro: Dados insuficientes.");
}

$id_jogador = $_POST['id_jogador'];
$categoria = $_POST['categoria']; // ex: levantadora, libero, saque, etc.
$nome_campeonato = $_POST['nome_campeonato'] ?? "CAMPEONATO";
$rodada = "";

// === 2. MAPEAMENTO: CATEGORIA → TÍTULO + FUNDO ===
$mapa = [
    'levantadora' => ['titulo' => 'MELHOR LEVANTADORA', 'fundo' => 'volei_melhor_levantadora.jpg'],
    'libero' => ['titulo' => 'MELHOR LÍBERO', 'fundo' => 'volei_melhor_libero.jpg'],
    'oposta' => ['titulo' => 'MELHOR OPOSTA', 'fundo' => 'volei_melhor_oposta.jpg'],
    'ponteira' => ['titulo' => 'MELHOR PONTEIRA', 'fundo' => 'volei_melhor_ponteira.jpg'],
    'central' => ['titulo' => 'MELHOR CENTRAL', 'fundo' => 'volei_melhor_central.jpg'],
    'bloqueio' => ['titulo' => 'MELHOR BLOQUEIO', 'fundo' => 'volei_maior_bloqueadora.jpg'],
    'pontuador' => ['titulo' => 'MAIOR PONTUADORA', 'fundo' => 'volei_maior_pontuadora.jpg'], // <- corrigido (você disse bloqueadora, mas é pontuadora)
    'saque' => ['titulo' => 'MELHOR SAQUE', 'fundo' => 'volei_melhor_saque.jpg'],
    'estreante' => ['titulo' => 'MELHOR ESTREANTE', 'fundo' => 'volei_melhor_estreante.jpg'],
];

if (!isset($mapa[$categoria])) {
    die("Categoria inválida: $categoria");
}

$titulo_arte = $mapa[$categoria]['titulo'];
$nome_arquivo_fundo = $mapa[$categoria]['fundo'];
$caminho_fundo = '../assets/img/' . $nome_arquivo_fundo;

// === 3. BUSCAR JOGADOR + EQUIPE ===
try {
    $stmt = $pdo->prepare("SELECT p.nome_completo, p.apelido, p.id_equipe, e.sigla, e.brasao 
                           FROM participantes p 
                           LEFT JOIN equipes e ON p.id_equipe = e.id 
                           WHERE p.id = ?");
    $stmt->execute([$id_jogador]);
    $jogador = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$jogador)
        die("Jogador não encontrado.");

    // --- Novo tratamento para $nome_jogador ---
// 1. Busca o nome escolhido (apelido ou completo)
    $nome_jogador = !empty($jogador['apelido']) ? $jogador['apelido'] : $jogador['nome_completo'];

// 2. Divide a string em um array de palavras
    $vetor_nomes = explode(" ", trim($nome_jogador));

// 3. Define as preposições a serem ignoradas (em minúsculas)
    $preposicoes = ['da', 'de', 'di', 'do', 'du'];

// 4. Inicializa o nome formatado com o primeiro nome
    $nome_formatado = $vetor_nomes[0];

// 5. Verifica se há um segundo nome
    if (isset($vetor_nomes[1])) {
        $segundo_nome = $vetor_nomes[1];

        // Verifica se o segundo nome é uma preposição
        if (in_array(strtolower($segundo_nome), $preposicoes) && isset($vetor_nomes[2])) {
            // Se for preposição E existe um terceiro nome, inclui o segundo e o terceiro nome
            $nome_formatado .= " " . $segundo_nome . " " . $vetor_nomes[2];
        } else {
            // Se NÃO for preposição, inclui apenas o segundo nome
            $nome_formatado .= " " . $segundo_nome;
        }
    }

// 6. Atualiza a variável principal
    $nome_jogador = $nome_formatado;

// --- Fim do novo tratamento ---
    $equipe = ['sigla' => $jogador['sigla'], 'brasao' => $jogador['brasao']];
} catch (Exception $e) {
    die("Erro no banco: " . $e->getMessage());
}

// === 4. CARREGAR FUNDO ===
$fundo = @imagecreatefromjpeg($caminho_fundo);
if (!$fundo)
    die("Erro ao carregar fundo. Caminho Tentado: " . $caminho_fundo);

$cor_branca = imagecolorallocate($fundo, 255, 255, 255);
$cor_preta = imagecolorallocate($fundo, 30, 30, 30);
$cor_contorno = imagecolorallocate($fundo, 0, 0, 0);
$largura = imagesx($fundo);
$caminho_fonte = '../assets/fonts/Roboto-Bold.ttf';
$pasta_brasoes = '../public/brasoes/';

// === 5. FUNÇÃO: DESENHAR BRASÃO OU SIGLA ===
function desenharBrasaoOuSigla($img, $eq, $x, $y, $tam, $fonte, $cor, $pasta) {
    $caminho = $pasta . $eq['brasao'];
    if (!empty($eq['brasao']) && file_exists($caminho)) {
        $info = getimagesize($caminho);
        $img_brasao = $info['mime'] == 'image/png' ? imagecreatefrompng($caminho) : imagecreatefromjpeg($caminho);
        if ($img_brasao) {
            if ($info['mime'] == 'image/png') {
                imagealphablending($img_brasao, true);
                imagesavealpha($img_brasao, true);
            }
            $temp = imagecreatetruecolor($tam, $tam);
            if ($info['mime'] == 'image/png') {
                imagealphablending($temp, false);
                imagesavealpha($temp, true);
                imagefill($temp, 0, 0, imagecolorallocatealpha($temp, 0, 0, 0, 127));
            }
            imagecopyresampled($temp, $img_brasao, 0, 0, 0, 0, $tam, $tam, imagesx($img_brasao), imagesy($img_brasao));
            imagecopy($img, $temp, $x, $y, 0, 0, $tam, $tam);
            imagedestroy($img_brasao);
            imagedestroy($temp);
            return;
        }
    }
    // fallback sigla
    $txt = mb_strtoupper($eq['sigla'] ?? '??', 'UTF-8');
    $size = $tam / 2.5;
    $box = imagettfbbox($size, 0, $fonte, $txt);
    $w = $box[2] - $box[0];
    $h = $box[1] - $box[7];
    imagettftext($img, $size, 0, $x + ($tam - $w) / 2, $y + ($tam + $h) / 2, $cor, $fonte, $txt);
}

// === 6. FOTO DO JOGADOR ===
$foto_original = null;
if (!empty($_FILES['nova_foto']['tmp_name']) && $_FILES['nova_foto']['error'] == 0) {
    $info = getimagesize($_FILES['nova_foto']['tmp_name']);
    $foto_original = $info['mime'] == 'image/png' ? imagecreatefrompng($_FILES['nova_foto']['tmp_name']) : imagecreatefromjpeg($_FILES['nova_foto']['tmp_name']);
} elseif (!empty($_POST['foto_selecionada'])) {
    $stmt = $pdo->prepare("SELECT src FROM fotos_participantes WHERE id = ?");
    $stmt->execute([$_POST['foto_selecionada']]);
    $f = $stmt->fetch();
    if ($f && file_exists(__DIR__ . '/../' . $f['src'])) {
        $path = __DIR__ . '/../' . $f['src'];
        $info = getimagesize($path);
        $foto_original = $info['mime'] == 'image/png' ? imagecreatefrompng($path) : imagecreatefromjpeg($path);
    }
}

if ($foto_original) {
    $h_foto = 800;
    $ratio = imagesx($foto_original) / imagesy($foto_original);
    $w_foto = $h_foto * $ratio;
    $foto_resized = imagecreatetruecolor($w_foto, $h_foto);
    if (isset($info['mime']) && $info['mime'] == 'image/png') {
        imagealphablending($foto_resized, false);
        imagesavealpha($foto_resized, true);
    }
    imagecopyresampled($foto_resized, $foto_original, 0, 0, 0, 0, $w_foto, $h_foto, imagesx($foto_original), imagesy($foto_original));
    imagecopy($fundo, $foto_resized, ($largura - $w_foto) / 2, 335, 0, 0, $w_foto, $h_foto);
    imagedestroy($foto_original);
    imagedestroy($foto_resized);
}

// === 7. TEXTOS ===
$texto_titulo = "";
$texto_nome = mb_strtoupper($nome_jogador, $encoding);
$texto_camp = mb_strtoupper($nome_campeonato, $encoding);
$texto_rodada = mb_strtoupper($rodada, $encoding);

imagettftext($fundo, 70, 0, center_x($fundo, 70, $texto_nome, $caminho_fonte), 1230, $cor_contorno, $caminho_fonte, $texto_nome);
imagettftext($fundo, 50, 0, center_x($fundo, 50, $texto_titulo, $caminho_fonte), 1150, $cor_branca, $caminho_fonte, $texto_titulo);

// Campeonato e rodada com sombra
foreach ([[-1, -1], [-1, 1], [1, -1], [1, 1]] as $d) {
    imagettftext($fundo, 40, 0, center_x($fundo, 40, $texto_camp, $caminho_fonte) + $d[0] * 2, 1700 + $d[1] * 2, $cor_contorno, $caminho_fonte, $texto_camp);
    imagettftext($fundo, 30, 0, center_x($fundo, 30, $texto_rodada, $caminho_fonte) + $d[0] * 2, 1760 + $d[1] * 2, $cor_contorno, $caminho_fonte, $texto_rodada);
}
imagettftext($fundo, 40, 0, center_x($fundo, 40, $texto_camp, $caminho_fonte), 1700, $cor_branca, $caminho_fonte, $texto_camp);
imagettftext($fundo, 30, 0, center_x($fundo, 30, $texto_rodada, $caminho_fonte), 1760, $cor_branca, $caminho_fonte, $texto_rodada);

// Brasão centralizado
desenharBrasaoOuSigla($fundo, $equipe, ($largura - 150) / 2, 1255, 150, $caminho_fonte, $cor_preta, $pasta_brasoes);

// === 8. SAÍDA ===
header('Content-Type: image/jpeg');
header('Content-Disposition: inline; filename="arte_volei_' . slugify($categoria) . '_' . slugify($nome_jogador) . '.jpg"');
imagejpeg($fundo, null, 92);
imagedestroy($fundo);
exit();

// FUNÇÕES AUXILIARES
function center_x($img, $size, $text, $font) {
    $box = imagettfbbox($size, 0, $font, $text);
    return (imagesx($img) - ($box[2] - $box[0])) / 2;
}

function slugify($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = strtolower($text);
    return $text ?: 'arte';
}

?>