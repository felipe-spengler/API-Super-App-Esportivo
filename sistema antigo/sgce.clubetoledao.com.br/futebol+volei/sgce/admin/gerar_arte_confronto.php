<?php
// Inclui a conexão com o banco de dados
require_once '../includes/db.php';
$encoding = mb_internal_encoding(); // ou UTF-8, ISO-8859-1...

// --- 1. VALIDAÇÃO E CAPTURA DOS DADOS ---
if (
    $_SERVER['REQUEST_METHOD'] !== 'POST' ||
    empty($_POST['id_equipe_a']) ||
    empty($_POST['id_equipe_b'])
) {
    header("Content-Type: text/plain");
    die("Erro: Dados insuficientes para gerar a arte.");
}

// Captura dos dados do formulário
$nome_campeonato = $_POST['nome_campeonato'] ?? "Campeonato";
$rodada = $_POST['rodada'] ?? "1º rodada"; // Captura da rodada
$placar = $_POST['placar'] ?? '0 x 0';
$id_equipe_a = $_POST['id_equipe_a'];
$id_equipe_b = $_POST['id_equipe_b'];

// Novas entradas para jogadores que marcaram gol
$goleadores_a = $_POST['goleadores_a'] ?? []; // Array de goleadores da equipe A
$goleadores_b = $_POST['goleadores_b'] ?? []; // Array de goleadores da equipe B

// Separa o placar em duas variáveis
$partes_placar = explode(' x ', $placar);
$placar_a = trim($partes_placar[0] ?? '0');
$placar_b = trim($partes_placar[1] ?? '0');

// --- 2. BUSCA DE DADOS ADICIONAIS NO BANCO ---
try {
    $stmt_equipes = $pdo->prepare("SELECT id, sigla, brasao FROM equipes WHERE id IN (?, ?)");
    $stmt_equipes->execute([$id_equipe_a, $id_equipe_b]);
    $equipes_info_raw = $stmt_equipes->fetchAll(PDO::FETCH_ASSOC);

    if (count($equipes_info_raw) < 2) {
        die("Erro: Uma ou ambas as equipes não foram encontradas no banco de dados.");
    }

    // Organiza os dados para fácil acesso
    $equipes_info = [];
    foreach ($equipes_info_raw as $equipe) {
        $equipes_info[$equipe['id']] = $equipe;
    }
    $equipe_a = $equipes_info[$id_equipe_a];
    $equipe_b = $equipes_info[$id_equipe_b];

} catch (PDOException $e) {
    die("Erro de conexão com o banco de dados: " . $e->getMessage());
}

// --- 3. PREPARAÇÃO DOS RECURSOS (IMAGENS, FONTES, CORES) ---
$caminho_fundo = '../assets/img/fundo_confronto.jpg';
$caminho_fonte = '../assets/fonts/Roboto-Bold.ttf';
$caminho_bola = '../assets/img/bola.png'; // Caminho da imagem da bola
$pasta_brasoes = '../public/brasoes/';

// Carrega a imagem de fundo
$fundo = @imagecreatefromjpeg($caminho_fundo);
if (!$fundo) die("Erro ao carregar a imagem de fundo.");

// Carrega a imagem da bola
$bola = @imagecreatefrompng($caminho_bola);
if (!$bola) die("Erro ao carregar a imagem da bola.");

// Define as cores que serão usadas
$cor_branca = imagecolorallocate($fundo, 255, 255, 255);
$cor_preta = imagecolorallocate($fundo, 30, 30, 30);
$largura_fundo = imagesx($fundo);

// Função auxiliar para desenhar o brasão (se existir) ou a sigla (como fallback)
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
    $texto_sigla = mb_strtoupper($equipe['sigla'] ?? 'N/A', $encoding);
    $caixa_texto = imagettfbbox($tamanho_fonte, 0, $caminho_fonte, $texto_sigla);
    $largura_texto = $caixa_texto[2] - $caixa_texto[0];
    $altura_texto = $caixa_texto[1] - $caixa_texto[7];
    $x_texto = $x + (($tamanho - $largura_texto) / 2);
    $y_texto = $y + (($tamanho - $altura_texto) / 2) + $altura_texto;
    imagettftext($imagem_fundo, $tamanho_fonte, 0, $x_texto, $y_texto, $cor_texto, $caminho_fonte, $texto_sigla);
}

// --- 4. COMPOSIÇÃO DA ARTE (DESENHAR TUDO NA IMAGEM) ---

// 4.1 Posicionar brasões/siglas e placar
$tamanho_brasao = 300;
$y_brasoes_e_placar = 1170;
$distancia_centro_brasao = 400;
$distancia_centro_placar = 180;

// Desenha Brasão/Sigla da Equipe A
desenharBrasaoOuSigla($fundo, $equipe_a, 102 + ($largura_fundo / 2) - $distancia_centro_brasao - ($tamanho_brasao / 2), $y_brasoes_e_placar - 280, $tamanho_brasao, $caminho_fonte, $cor_preta, $pasta_brasoes);
// Desenha Brasão/Sigla da Equipe B
desenharBrasaoOuSigla($fundo, $equipe_b, -94 + ($largura_fundo / 2) + $distancia_centro_brasao - ($tamanho_brasao / 2), $y_brasoes_e_placar - 280, $tamanho_brasao, $caminho_fonte, $cor_branca, $pasta_brasoes);

// Escrever o placar
$tamanho_fonte_placar = 80;
imagettftext($fundo, $tamanho_fonte_placar, 0, -145 + ($largura_fundo / 2) - $distancia_centro_placar, $y_brasoes_e_placar+130, $cor_branca , $caminho_fonte, $placar_a);
imagettftext($fundo, $tamanho_fonte_placar, 0, ($largura_fundo / 2) + $distancia_centro_placar + 80, $y_brasoes_e_placar+130, $cor_branca , $caminho_fonte, $placar_b);

// 4.2 Adicionar goleadores abaixo do placar com ícones de bola
$tamanho_fonte_goleadores = 40;
$y_goleadores = $y_brasoes_e_placar + 200; // Ajuste vertical abaixo do placar
$x_goleadores_a = 0 + ($largura_fundo / 2) - $distancia_centro_brasao - 50; // Posição à esquerda
$x_goleadores_b = -300 + ($largura_fundo / 2) + $distancia_centro_brasao + 50; // Posição à direita

// Tamanho da imagem da bola (ajustado para corresponder à altura do texto)
$tamanho_bola = $tamanho_fonte_goleadores; // Aproximadamente a altura do texto
$bola_largura = imagesx($bola);
$bola_altura = imagesy($bola);
$espacamento_bola = 5; // Espaço entre bolas

// Goleadores da Equipe A
$offset_y_a = 0;
foreach ($goleadores_a as $goleador_entry) {
    // Parseia o nome e número de gols (formato esperado: "Nome:Gols")
    $partes = explode(':', $goleador_entry);
    $nome_goleador = trim($partes[0] ?? $goleador_entry);
    $num_gols = isset($partes[1]) ? max(1, intval($partes[1])) : 1; // Pelo menos 1 gol

    // Desenha as bolas conforme o número de gols
    $x_bola = $x_goleadores_a;
    for ($i = 0; $i < $num_gols; $i++) {
        imagecopyresampled(
            $fundo, $bola,
            $x_bola-($num_gols-1)*$tamanho_bola, $y_goleadores + $offset_y_a - $tamanho_bola, // Ajusta Y para alinhar com o texto
            0, 0, $tamanho_bola, $tamanho_bola, $bola_largura, $bola_altura
        );
        $x_bola += $tamanho_bola + $espacamento_bola; // Move para a próxima bola
    }

    // Escreve o nome do goleador ao lado das bolas
    $x_texto = $x_goleadores_a  + ($tamanho_bola) + ($espacamento_bola) + 10;
    imagettftext($fundo, $tamanho_fonte_goleadores, 0, $x_texto, $y_goleadores + $offset_y_a, $cor_branca, $caminho_fonte, $nome_goleador);
    $offset_y_a += 50; // Espaçamento vertical entre nomes
}

// Goleadores da Equipe B
$offset_y_b = 0;
foreach ($goleadores_b as $goleador_entry) {
    // Parseia o nome e número de gols (formato esperado: "Nome:Gols")
    $partes = explode(':', $goleador_entry);
    $nome_goleador = trim($partes[0] ?? $goleador_entry);
    $num_gols = isset($partes[1]) ? max(1, intval($partes[1])) : 1; // Pelo menos 1 gol

    // Desenha as bolas conforme o número de gols
    $x_bola = $x_goleadores_b;
    for ($i = 0; $i < $num_gols; $i++) {
        imagecopyresampled(
            $fundo, $bola,
            $x_bola-($num_gols-1)*$tamanho_bola, $y_goleadores + $offset_y_b - $tamanho_bola, // Ajusta Y para alinhar com o texto
            0, 0, $tamanho_bola, $tamanho_bola, $bola_largura, $bola_altura
        );
        $x_bola += $tamanho_bola + $espacamento_bola; // Move para a próxima bola
    }

    // Escreve o nome do goleador ao lado das bolas
    $x_texto = $x_goleadores_b + ($tamanho_bola) + ($espacamento_bola) + 10;
    imagettftext($fundo, $tamanho_fonte_goleadores, 0, $x_texto, $y_goleadores + $offset_y_b, $cor_branca, $caminho_fonte, $nome_goleador);
    $offset_y_b += 50; // Espaçamento vertical entre nomes
}

// Libera a memória da imagem da bola
imagedestroy($bola);

// 4.3 Escrever o nome do campeonato
$tamanho_fonte_nome_campeonato = 40;
$texto_nome_campeonato = mb_strtoupper($nome_campeonato, $encoding);
$caixa_texto_nome_campeonato = imagettfbbox($tamanho_fonte_nome_campeonato, 0, $caminho_fonte, $texto_nome_campeonato);
$largura_texto_nome_campeonato = $caixa_texto_nome_campeonato[2] - $caixa_texto_nome_campeonato[0];
$x_nome_campeonato = ($largura_fundo - $largura_texto_nome_campeonato) / 2;
$y_nome_campeonato = 1700;
imagettftext($fundo, $tamanho_fonte_nome_campeonato, 0, $x_nome_campeonato, $y_nome_campeonato, $cor_branca, $caminho_fonte, $texto_nome_campeonato);

// 4.4 Escrever a rodada abaixo do nome do campeonato
$tamanho_fonte_rodada = 30; // Tamanho menor para a rodada
$texto_rodada = mb_strtoupper($rodada, $encoding);
$caixa_texto_rodada = imagettfbbox($tamanho_fonte_rodada, 0, $caminho_fonte, $texto_rodada);
$largura_texto_rodada = $caixa_texto_rodada[2] - $caixa_texto_rodada[0];
$x_rodada = ($largura_fundo - $largura_texto_rodada) / 2;
$y_rodada = $y_nome_campeonato + 50; // Ajuste a distância vertical (50 pixels abaixo do campeonato)
imagettftext($fundo, $tamanho_fonte_rodada, 0, $x_rodada, $y_rodada, $cor_branca, $caminho_fonte, $texto_rodada);

// --- 5. SAÍDA DA IMAGEM ---
header('Content-Type: image/jpeg');
header('Content-Disposition: inline; filename="confronto_'.slugify($nome_campeonato).'.jpg"');

imagejpeg($fundo, null, 90); // Qualidade 90 para um bom balanço tamanho/qualidade

// Libera a memória
imagedestroy($fundo);

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