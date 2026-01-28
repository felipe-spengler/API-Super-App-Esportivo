<?php
// Inclui a conexão com o banco de dados
require_once '../includes/db.php';
$encoding = mb_internal_encoding(); // ou UTF-8, ISO-8859-1...

// --- 1. VALIDAÇÃO E CAPTURA DOS DADOS (Alterado: Remove id_equipe_a/b e placar da validação) ---
if (
    $_SERVER['REQUEST_METHOD'] !== 'POST' ||
    empty($_POST['id_jogador']) ||
    empty($_POST['categoria'])
) {
    header("Content-Type: text/plain");
    die("Erro: Dados insuficientes para gerar a arte. Certifique-se de fornecer id_jogador e categoria.");
}

// Captura dos dados do formulário
$nome_campeonato = $_POST['nome_campeonato'] ?? "Campeonato";
$rodada = $_POST['rodada'] ?? " "; // Captura da rodada
$id_jogador = $_POST['id_jogador'];
$categoria = $_POST['categoria']; // Mantido
// Removidos: $placar, $id_equipe_a, $id_equipe_b (não são mais necessários para o layout)

// Busca o nome, apelido E O ID DA EQUIPE do jogador no banco
try {
    // Busca id_equipe na tabela participantes
    $stmt_jogador = $pdo->prepare("SELECT nome_completo, apelido, id_equipe FROM participantes WHERE id = ?");
    $stmt_jogador->execute([$id_jogador]);
    $jogador = $stmt_jogador->fetch(PDO::FETCH_ASSOC);

    if (!$jogador) {
        die("Erro: Jogador não encontrado no banco de dados.");
    }
    if (empty($jogador['id_equipe'])) {
        die("Erro: ID da equipe do jogador não encontrado na tabela 'participantes'.");
    }

    $id_equipe_jogador = $jogador['id_equipe']; // <-- ID da equipe do jogador
    $nome_jogador = !empty($jogador['apelido']) ? $jogador['apelido'] : $jogador['nome_completo'];
} catch (PDOException $e) {
    die("Erro de conexão com o banco de dados (jogador): " . $e->getMessage());
}

// Divide a string em um vetor usando espaço como separador
$vetor_nomes = explode(" ", $nome_jogador);
$nome_jogador_primeiro_nome = $vetor_nomes[0];
$nome_jogador_segundo_nome = isset($vetor_nomes[1]) ? $vetor_nomes[1] : "";
$nome_jogador = $nome_jogador_primeiro_nome . " " . $nome_jogador_segundo_nome;

// Removido: Separação do placar, pois o placar não é usado.

// --- 2. BUSCA DE DADOS ADICIONAIS NO BANCO (Alterado: Busca APENAS a equipe do jogador) ---
try {
    // Busca apenas a equipe do jogador
    $stmt_equipe_unica = $pdo->prepare("SELECT id, sigla, brasao FROM equipes WHERE id = ?");
    $stmt_equipe_unica->execute([$id_equipe_jogador]);
    $equipe_jogador = $stmt_equipe_unica->fetch(PDO::FETCH_ASSOC);

    if (!$equipe_jogador) {
        die("Erro: A equipe do jogador ($id_equipe_jogador) não foi encontrada no banco.");
    }

} catch (PDOException $e) {
    die("Erro de conexão com o banco de dados (equipes): " . $e->getMessage());
}

// --- 3. PREPARAÇÃO DOS RECURSOS (IMAGENS, FONTES, CORES) ---
$caminho_fundo = '../assets/img/fundo_melhor_artilheiro.jpg'; // FUNDO MANTIDO DO ARTILHEIRO
$caminho_fonte = '../assets/fonts/Roboto-Bold.ttf';
$pasta_brasoes = '../public/brasoes/';

// Carrega a imagem de fundo
$fundo = @imagecreatefromjpeg($caminho_fundo);
if (!$fundo) die("Erro ao carregar a imagem de fundo.");

// Define as cores que serão usadas
$cor_branca = imagecolorallocate($fundo, 255, 255, 255);
$cor_preta = imagecolorallocate($fundo, 30, 30, 30);
$cor_contorno = imagecolorallocate($fundo, 0, 0, 0); // Cor preta para o contorno
$largura_fundo = imagesx($fundo);

// Função auxiliar para desenhar o brasão (mantida)
function desenharBrasaoOuSigla($imagem_fundo, $equipe, $x, $y, $tamanho, $caminho_fonte, $cor_texto, $pasta_brasoes) {
    $caminho_brasao_completo = $pasta_brasoes . $equipe['brasao'];

    if (!empty($equipe['brasao']) && file_exists($caminho_brasao_completo)) {
        $info_brasao = getimagesize($caminho_brasao_completo);
        $brasao_original = null;
        if ($info_brasao['mime'] == 'image/jpeg') $brasao_original = @imagecreatefromjpeg($caminho_brasao_completo);
        elseif ($info_brasao['mime'] == 'image/png') $brasao_original = @imagecreatefrompng($caminho_brasao_completo);

        if ($brasao_original) {
            imagecopyresampled($imagem_fundo, $brasao_original, $x, $y, 0, 0, $tamanho, $tamanho, imagesx($brasao_original), imagesy($brasao_original));
            imagedestroy($brasao_original);
            return; // Termina a função se o brasão foi desenhado
        }
    }
    
    // Fallback: Se não tem brasão ou o arquivo não foi encontrado, desenha a sigla
    $tamanho_fonte = $tamanho / 2;
    $texto_sigla = mb_strtoupper($equipe['sigla'] ?? 'N/A' , $GLOBALS['encoding']);
    $caixa_texto = imagettfbbox($tamanho_fonte, 0, $caminho_fonte, $texto_sigla);
    $largura_texto = $caixa_texto[2] - $caixa_texto[0];
    $altura_texto = $caixa_texto[1] - $caixa_texto[7];
    $x_texto = $x + (($tamanho - $largura_texto) / 2);
    $y_texto = $y + (($tamanho - $altura_texto) / 2) + $altura_texto;
    imagettftext($imagem_fundo, $tamanho_fonte, 0, $x_texto, $y_texto, $cor_texto, $caminho_fonte, $texto_sigla);
}

// --- 4. COMPOSIÇÃO DA ARTE (DESENHAR TUDO NA IMAGEM) ---

// 4.1 Redimensionar e posicionar a foto do jogador (código mantido)
$foto_jogador_original = null;
$foto_redimensionada = null;
if (!empty($_FILES['nova_foto']['tmp_name'])) {
    // ... (Lógica de upload de foto mantida) ...
    $foto_info = getimagesize($_FILES['nova_foto']['tmp_name']);
    if ($foto_info['mime'] == 'image/jpeg') {
        $foto_jogador_original = @imagecreatefromjpeg($_FILES['nova_foto']['tmp_name']);
    } elseif ($foto_info['mime'] == 'image/png') {
        $foto_jogador_original = @imagecreatefrompng($_FILES['nova_foto']['tmp_name']);
    }
    if (!$foto_jogador_original) {
        die("Erro ao carregar a foto do jogador enviada. Use JPG ou PNG.");
    }
} elseif (!empty($_POST['foto_selecionada'])) {
    // ... (Lógica de foto do banco mantida) ...
    try {
        $stmt_foto = $pdo->prepare("SELECT src FROM fotos_participantes WHERE id = ?");
        $stmt_foto->execute([$_POST['foto_selecionada']]);
        $foto = $stmt_foto->fetch(PDO::FETCH_ASSOC);
        if ($foto && !empty($foto['src'])) {
            $path_foto_jogador = __DIR__ . '/../' . $foto['src'];
            if (!file_exists($path_foto_jogador)) {
                die("Erro: A foto do jogador especificada não existe no servidor.");
            }
            $foto_info = getimagesize($path_foto_jogador);
            if ($foto_info['mime'] == 'image/jpeg') {
                $foto_jogador_original = @imagecreatefromjpeg($path_foto_jogador);
            } elseif ($foto_info['mime'] == 'image/png') {
                $foto_jogador_original = @imagecreatefrompng($path_foto_jogador);
            }
            if (!$foto_jogador_original) {
                die("Erro ao carregar a foto do jogador do banco. Use JPG ou PNG.");
            }
        } else {
            die("Erro: Foto selecionada não encontrada no banco de dados.");
        }
    } catch (PDOException $e) {
        die("Erro de conexão com o banco de dados (foto): " . $e->getMessage());
    }
}

// Se houver uma foto, redimensionar e posicionar (mantido)
if ($foto_jogador_original) {
    $largura_original = imagesx($foto_jogador_original);
    $altura_original = imagesy($foto_jogador_original);
    $altura_container_foto = 800; // Altura fixa de 800px
    $ratio_orig = $largura_original / $altura_original;

    $nova_altura = $altura_container_foto;
    $nova_largura = $nova_altura * $ratio_orig;

    $foto_redimensionada = imagecreatetruecolor($nova_largura, $nova_altura);
    if (isset($foto_info['mime']) && $foto_info['mime'] == 'image/png') {
        imagealphablending($foto_redimensionada, false);
        imagesavealpha($foto_redimensionada, true);
    }
    imagecopyresampled($foto_redimensionada, $foto_jogador_original, 0, 0, 0, 0, $nova_largura, $nova_altura, $largura_original, $altura_original);

    $largura_container_foto = $nova_largura;
    $x_foto = ($largura_fundo - $largura_container_foto) / 2; // Centraliza horizontalmente
    $y_foto = 335; // Posição vertical

    imagecopy($fundo, $foto_redimensionada, $x_foto, $y_foto, 0, 0, $largura_container_foto, $altura_container_foto);
}

// 4.2 Escrever o nome do jogador, campeonato e rodada (Alterado: Remoção do desenho explícito da Categoria)
$tamanho_fonte_nome = 70;
$tamanho_fonte_categoria = 50;
$tamanho_fonte_nome_campeonato = 40;
$tamanho_fonte_rodada = 30;

// Mapear a categoria para um título legível
$categorias_titulos = [
    'craque' => 'Craque do Jogo',
    'goleiro' => 'Melhor Goleiro',
    'lateral' => 'Melhor Lateral',
    'meia' => 'Melhor Meia',
    'atacante' => 'Melhor Atacante',
    'artilheiro' => 'Melhor Artilheiro',
    'assistencia' => 'Melhor Assistência',
    'volante' => 'Melhor Volante',
    'estreante' => 'Melhor Estreante',
    'zagueiro' => 'Melhor Zagueiro'
];
$texto_categoria = mb_strtoupper($categorias_titulos[$categoria] ?? 'MELHOR ARTILHEIRO' , $encoding);
$texto_nome = mb_strtoupper($nome_jogador , $encoding);
$texto_nome_campeonato = mb_strtoupper($nome_campeonato , $encoding);
$texto_rodada = mb_strtoupper($rodada , $encoding);

// Calcular as caixas de texto para centralização
$caixa_texto_categoria = imagettfbbox($tamanho_fonte_categoria, 0, $caminho_fonte, $texto_categoria);
$caixa_texto_nome = imagettfbbox($tamanho_fonte_nome, 0, $caminho_fonte, $texto_nome);
$caixa_texto_nome_campeonato = imagettfbbox($tamanho_fonte_nome_campeonato, 0, $caminho_fonte, $texto_nome_campeonato);
$caixa_texto_rodada = imagettfbbox($tamanho_fonte_rodada, 0, $caminho_fonte, $texto_rodada);
$largura_texto_categoria = $caixa_texto_categoria[2] - $caixa_texto_categoria[0];
$largura_texto_nome = $caixa_texto_nome[2] - $caixa_texto_nome[0];
$largura_texto_nome_campeonato = $caixa_texto_nome_campeonato[2] - $caixa_texto_nome_campeonato[0];
$largura_texto_rodada = $caixa_texto_rodada[2] - $caixa_texto_rodada[0];
$x_categoria = ($largura_fundo - $largura_texto_categoria) / 2;
$x_nome = ($largura_fundo - $largura_texto_nome) / 2;
$x_nome_campeonato = ($largura_fundo - $largura_texto_nome_campeonato) / 2;
$x_rodada = ($largura_fundo - $largura_texto_rodada) / 2;
$y_categoria = 1150; // Posição para a categoria (se fosse desenhada)
$y_nome = 1230;
$y_nome_campeonato = 1700;
$y_rodada = $y_nome_campeonato + 50;

// Desenhar Categoria (REMOVIDO para seguir o padrão)
// O código original era: imagettftext($fundo, $tamanho_fonte_categoria, 0, $x_categoria, $y_categoria, $cor_branca, $caminho_fonte, $texto_categoria);

// Desenhar o nome do jogador (sem contorno)
imagettftext($fundo, $tamanho_fonte_nome, 0, $x_nome, $y_nome, $cor_branca, $caminho_fonte, $texto_nome);

// Parâmetros para contorno (mantidos)
$deslocamentos = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],  [0, 1],
    [1, -1],  [1, 0],  [1, 1]
];

// Desenhar o nome do campeonato com contorno (mantido)
foreach ($deslocamentos as $desloc) {
    imagettftext($fundo, $tamanho_fonte_nome_campeonato, 0, $x_nome_campeonato + $desloc[0], $y_nome_campeonato + $desloc[1], $cor_contorno, $caminho_fonte, $texto_nome_campeonato);
}
imagettftext($fundo, $tamanho_fonte_nome_campeonato, 0, $x_nome_campeonato, $y_nome_campeonato, $cor_branca, $caminho_fonte, $texto_nome_campeonato);

// Desenhar a rodada com contorno (mantido)
foreach ($deslocamentos as $desloc) {
    imagettftext($fundo, $tamanho_fonte_rodada, 0, $x_rodada + $desloc[0], $y_rodada + $desloc[1], $cor_contorno, $caminho_fonte, $texto_rodada);
}
imagettftext($fundo, $tamanho_fonte_rodada, 0, $x_rodada, $y_rodada, $cor_branca, $caminho_fonte, $texto_rodada);

// 4.3 Posicionar APENAS o brasão da equipe do jogador, centralizado (SEM PLACAR)
$tamanho_brasao = 150;
$y_brasoes = 1535 - 280; // Posição vertical para o brasão

// Novo cálculo para centralizar o brasão
$x_brasao_centralizado = ($largura_fundo / 2) - ($tamanho_brasao / 2);

// Desenha o Brasão/Sigla da equipe do jogador
desenharBrasaoOuSigla($fundo, $equipe_jogador, $x_brasao_centralizado, $y_brasoes, $tamanho_brasao, $caminho_fonte, $cor_preta, $pasta_brasoes);

// --- 5. SAÍDA DA IMAGEM ---
header('Content-Type: image/jpeg');
header('Content-Disposition: inline; filename="arte_'.slugify($texto_categoria).'_'.slugify($nome_jogador).'.jpg"');

imagejpeg($fundo, null, 90);

// Libera a memória
imagedestroy($fundo);
if ($foto_jogador_original) {
    imagedestroy($foto_jogador_original);
}
if ($foto_redimensionada) {
    imagedestroy($foto_redimensionada);
}

function slugify($text) {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    $text = strtolower($text);
    return empty($text) ? 'n-a' : $text;
}

exit();
?>