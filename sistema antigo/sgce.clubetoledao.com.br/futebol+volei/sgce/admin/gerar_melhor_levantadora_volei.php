<?php
// Inclui a conexão com o banco de dados
require_once '../includes/db.php';
$encoding = mb_internal_encoding(); // ou UTF-8, ISO-8859-1...

// --- 1. VALIDAÇÃO E CAPTURA DOS DADOS ---

// Apenas o ID do Jogador e a Categoria são estritamente necessários para a arte individual.
if (
    $_SERVER['REQUEST_METHOD'] !== 'POST' ||
    empty($_POST['id_jogador']) ||
    empty($_POST['categoria'])
) {
    header("Content-Type: text/plain");
    die("Erro: Dados insuficientes para gerar a arte. ID do Jogador e Categoria são obrigatórios.");
}

// Captura dos dados do formulário
$nome_campeonato = $_POST['nome_campeonato'] ?? "CAMPEONATO";
$rodada = " "; // Captura da rodada
$id_jogador = $_POST['id_jogador'];
$categoria = $_POST['categoria']; // Categoria enviada (não será usada para o texto, mas sim para o slug)

// Variáveis de placar/equipes adversárias são ignoradas, mas capturadas para manter compatibilidade
$placar = $_POST['placar'] ?? '0 x 0';
$id_equipe_a = $_POST['id_equipe_a'] ?? null;
$id_equipe_b = $_POST['id_equipe_b'] ?? null;

// Busca o nome, apelido E O ID DA EQUIPE do jogador no banco
try {
    // Busca id_equipe na tabela participantes
    $stmt_jogador = $pdo->prepare("SELECT nome_completo, apelido, id_equipe FROM participantes WHERE id = ?");
    $stmt_jogador->execute([$id_jogador]);
    $jogador = $stmt_jogador->fetch(PDO::FETCH_ASSOC);

    if (!$jogador) {
        die("Erro: Jogador não encontrado no banco de dados.");
    }
    // Verifica se o id_equipe foi encontrado
    if (empty($jogador['id_equipe'])) {
        die("Erro: ID da equipe do jogador não encontrado na tabela 'participantes'.");
    }

    $id_equipe_jogador = $jogador['id_equipe']; // <-- ID da equipe do jogador
    $nome_jogador = !empty($jogador['apelido']) ? $jogador['apelido'] : $jogador['nome_completo'];
} catch (PDOException $e) {
    die("Erro de conexão com o banco de dados (jogador): " . $e->getMessage());
}

// Divide a string em um vetor usando espaço como separador, limitando a dois nomes
$vetor_nomes = explode(" ", $nome_jogador);
$nome_jogador_primeiro_nome = $vetor_nomes[0];
$nome_jogador_segundo_nome = isset($vetor_nomes[1]) ? $vetor_nomes[1] : "";
$nome_jogador = $nome_jogador_primeiro_nome . " " . $nome_jogador_segundo_nome;

// --- 2. BUSCA DE DADOS ADICIONAIS NO BANCO (BUSCA APENAS A EQUIPE DO JOGADOR) ---
try {
    // Busca APENAS a equipe do jogador
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

// NOVO CAMINHO DO FUNDO PARA MELHOR LEVANTADORA
$caminho_fundo = '../assets/img/volei_melhor_levantadora.jpg'; 

$caminho_fonte = '../assets/fonts/Roboto-Bold.ttf';
$pasta_brasoes = '../public/brasoes/';

// Carrega a imagem de fundo
$fundo = @imagecreatefromjpeg($caminho_fundo);
if (!$fundo) die("Erro ao carregar a imagem de fundo: " . basename($caminho_fundo));

// Define as cores que serão usadas
$cor_branca = imagecolorallocate($fundo, 255, 255, 255);
$cor_preta = imagecolorallocate($fundo, 30, 30, 30);
$cor_contorno = imagecolorallocate($fundo, 0, 0, 0); // Cor para contorno de texto
$largura_fundo = imagesx($fundo);

// Função auxiliar para desenhar o brasão (se existir) ou a sigla (como fallback)
function desenharBrasaoOuSigla($imagem_fundo, $equipe, $x, $y, $tamanho, $caminho_fonte, $cor_texto, $pasta_brasoes) {
    $caminho_brasao_completo = $pasta_brasoes . $equipe['brasao'];
    $encoding = $GLOBALS['encoding'];

    if (!empty($equipe['brasao']) && file_exists($caminho_brasao_completo)) {
        $info_brasao = getimagesize($caminho_brasao_completo);
        $brasao_original = null;
        if ($info_brasao['mime'] == 'image/jpeg') $brasao_original = @imagecreatefromjpeg($caminho_brasao_completo);
        elseif ($info_brasao['mime'] == 'image/png') $brasao_original = @imagecreatefrompng($caminho_brasao_completo);

        if ($brasao_original) {
            // Se for PNG, preservar transparência
            if ($info_brasao['mime'] == 'image/png') {
                imagealphablending($brasao_original, true);
                imagesavealpha($brasao_original, true);
            }
            // Cria um recurso temporário para o redimensionamento suave
            $temp_brasao = imagecreatetruecolor($tamanho, $tamanho);
            if ($info_brasao['mime'] == 'image/png') {
                imagealphablending($temp_brasao, false);
                imagesavealpha($temp_brasao, true);
                $transparency = imagecolorallocatealpha($temp_brasao, 255, 255, 255, 127);
                imagefill($temp_brasao, 0, 0, $transparency);
            }
            
            imagecopyresampled($temp_brasao, $brasao_original, 0, 0, 0, 0, $tamanho, $tamanho, imagesx($brasao_original), imagesy($brasao_original));
            imagecopy($imagem_fundo, $temp_brasao, $x, $y, 0, 0, $tamanho, $tamanho);

            imagedestroy($brasao_original);
            imagedestroy($temp_brasao);
            return;
        }
    }
    
    // Fallback: Se não tem brasão ou o arquivo não foi encontrado, desenha a sigla
    $tamanho_fonte = $tamanho / 2;
    $texto_sigla = mb_strtoupper($equipe['sigla'] ?? 'N/A', $encoding);
    $caixa_texto = imagettfbbox($tamanho_fonte, 0, $caminho_fonte, $texto_sigla);
    $largura_texto = $caixa_texto[2] - $caixa_texto[0];
    $altura_texto = $caixa_texto[1] - $caixa_texto[7];
    $x_texto = $x + (($tamanho - $largura_texto) / 2);
    $y_texto = $y + (($tamanho - $altura_texto) / 2) + $altura_texto;
    imagettftext($imagem_fundo, $tamanho_fonte, 0, $x_texto, $y_texto, $cor_texto, $caminho_fonte, $texto_sigla);
}

// --- 4. COMPOSIÇÃO DA ARTE (DESENHAR TUDO NA IMAGEM) ---

// 4.1 Redimensionar e posicionar a foto do jogador
$foto_jogador_original = null;
$foto_redimensionada = null;

// Tenta carregar a foto do POST (nova_foto) ou do banco (foto_selecionada)
if (!empty($_FILES['nova_foto']['tmp_name'])) {
    // Usar a imagem enviada via upload
    $foto_info = getimagesize($_FILES['nova_foto']['tmp_name']);
    if ($foto_info['mime'] == 'image/jpeg') {
        $foto_jogador_original = @imagecreatefromjpeg($_FILES['nova_foto']['tmp_name']);
    } elseif ($foto_info['mime'] == 'image/png') {
        $foto_jogador_original = @imagecreatefrompng($_FILES['nova_foto']['tmp_name']);
    }
    if (!$foto_jogador_original) {
        // Se falhar, é um erro grave na foto, mas prosseguimos (pode ser ajustado)
        $foto_jogador_original = null; 
    }
} elseif (!empty($_POST['foto_selecionada'])) {
    // Usar a foto do banco (fotos_participantes)
    try {
        $stmt_foto = $pdo->prepare("SELECT src FROM fotos_participantes WHERE id = ?");
        $stmt_foto->execute([$_POST['foto_selecionada']]);
        $foto = $stmt_foto->fetch(PDO::FETCH_ASSOC);
        if ($foto && !empty($foto['src'])) {
            $path_foto_jogador = __DIR__ . '/../' . $foto['src'];
            if (file_exists($path_foto_jogador)) {
                $foto_info = getimagesize($path_foto_jogador);
                if ($foto_info['mime'] == 'image/jpeg') {
                    $foto_jogador_original = @imagecreatefromjpeg($path_foto_jogador);
                } elseif ($foto_info['mime'] == 'image/png') {
                    $foto_jogador_original = @imagecreatefrompng($path_foto_jogador);
                }
            }
        }
    } catch (PDOException $e) {
        // Se houver erro na consulta, prossegue sem foto
        $foto_jogador_original = null; 
    }
}

// Se houver uma foto, redimensionar e posicionar
if ($foto_jogador_original) {
    $largura_original = imagesx($foto_jogador_original);
    $altura_original = imagesy($foto_jogador_original);
    $altura_container_foto = 800; // Altura fixa de 800px
    $ratio_orig = $largura_original / $altura_original;

    // Define a nova altura como 800px e calcula a largura proporcional
    $nova_altura = $altura_container_foto;
    $nova_largura = $nova_altura * $ratio_orig;

    // Cria a imagem redimensionada
    $foto_redimensionada = imagecreatetruecolor($nova_largura, $nova_altura);
    if (isset($foto_info['mime']) && $foto_info['mime'] == 'image/png') {
        imagealphablending($foto_redimensionada, false);
        imagesavealpha($foto_redimensionada, true);
    }
    imagecopyresampled($foto_redimensionada, $foto_jogador_original, 0, 0, 0, 0, $nova_largura, $nova_altura, $largura_original, $altura_original);

    // Calcula a posição para centralizar a imagem no container
    $largura_container_foto = $nova_largura;
    $x_foto = ($largura_fundo - $largura_container_foto) / 2;
    $y_foto = 335;

    // Copia a imagem redimensionada para o fundo, centralizando-a
    imagecopy($fundo, $foto_redimensionada, $x_foto, $y_foto, 0, 0, $largura_container_foto, $altura_container_foto);
}

// 4.2 Escrever o nome do jogador, categoria, campeonato e rodada
$tamanho_fonte_nome = 70;
$tamanho_fonte_categoria = 50;
$tamanho_fonte_nome_campeonato = 40;
$tamanho_fonte_rodada = 30;

// **********************************************
// * ALTERAÇÃO: Título fixo para Melhor Levantadora
// **********************************************
$texto_categoria = mb_strtoupper("Melhor Levantadora", $encoding); 
$texto_nome = mb_strtoupper($nome_jogador, $encoding);
$texto_nome_campeonato = mb_strtoupper($nome_campeonato, $encoding);
$texto_rodada = mb_strtoupper($rodada, $encoding);

// Calcular as caixas de texto para centralização
$caixa_texto_categoria = imagettfbbox($tamanho_fonte_categoria, 0, $caminho_fonte, $texto_categoria);
$caixa_texto_nome = imagettfbbox($tamanho_fonte_nome, 0, $caminho_fonte, $texto_nome);
$largura_texto_categoria = $caixa_texto_categoria[2] - $caixa_texto_categoria[0];
$largura_texto_nome = $caixa_texto_nome[2] - $caixa_texto_nome[0];

$caixa_texto_nome_campeonato = imagettfbbox($tamanho_fonte_nome_campeonato, 0, $caminho_fonte, $texto_nome_campeonato);
$caixa_texto_rodada = imagettfbbox($tamanho_fonte_rodada, 0, $caminho_fonte, $texto_rodada);
$largura_texto_nome_campeonato = $caixa_texto_nome_campeonato[2] - $caixa_texto_nome_campeonato[0];
$largura_texto_rodada = $caixa_texto_rodada[2] - $caixa_texto_rodada[0];

$x_categoria = ($largura_fundo - $largura_texto_categoria) / 2;
$x_nome = ($largura_fundo - $largura_texto_nome) / 2;
$x_nome_campeonato = ($largura_fundo - $largura_texto_nome_campeonato) / 2;
$x_rodada = ($largura_fundo - $largura_texto_rodada) / 2;

$y_categoria = 1150;
$y_nome = 1230;
$y_nome_campeonato = 1700;
$y_rodada = $y_nome_campeonato + 50;

// Desenhar Categoria
imagettftext($fundo, $tamanho_fonte_categoria, 0, $x_categoria, $y_categoria, $cor_branca, $caminho_fonte, $texto_categoria);
// Desenhar o nome do jogador
imagettftext($fundo, $tamanho_fonte_nome, 0, $x_nome, $y_nome, $cor_branca, $caminho_fonte, $texto_nome);

// Parâmetros para contorno
$deslocamentos = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],  [0, 1],
    [1, -1],  [1, 0],  [1, 1]
];

// Desenhar o nome do campeonato com contorno (shadow)
foreach ($deslocamentos as $desloc) {
    imagettftext($fundo, $tamanho_fonte_nome_campeonato, 0, $x_nome_campeonato + $desloc[0], $y_nome_campeonato + $desloc[1], $cor_contorno, $caminho_fonte, $texto_nome_campeonato);
}
imagettftext($fundo, $tamanho_fonte_nome_campeonato, 0, $x_nome_campeonato, $y_nome_campeonato, $cor_branca, $caminho_fonte, $texto_nome_campeonato);

// Desenhar a rodada com contorno (shadow)
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
// Usamos a categoria enviada no POST para o nome do arquivo (slugify)
header('Content-Type: image/jpeg');
header('Content-Disposition: inline; filename="arte_'.slugify($categoria).'_'.slugify($nome_jogador).'.jpg"');

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