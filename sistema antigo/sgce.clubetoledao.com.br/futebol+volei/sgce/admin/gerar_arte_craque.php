<?php

// Inclui a conexão com o banco de dados

require_once '../includes/db.php';

$encoding = mb_internal_encoding(); // ou UTF-8, ISO-8859-1...



// --- 1. VALIDAÇÃO E CAPTURA DOS DADOS ---

if (

    $_SERVER['REQUEST_METHOD'] !== 'POST' ||

    empty($_POST['id_jogador']) ||

    empty($_POST['id_equipe_a']) ||

    empty($_POST['id_equipe_b']) ||

    empty($_POST['categoria'])

) {

    header("Content-Type: text/plain");

    die("Erro: Dados insuficientes para gerar a arte.");

}



// Captura dos dados do formulário

$nome_campeonato = $_POST['nome_campeonato'] ?? "Campeonato";

$rodada = $_POST['rodada'] ?? "1º rodada"; // Captura da rodada

$id_jogador = $_POST['id_jogador'];

$placar = $_POST['placar'] ?? '0 x 0';

$id_equipe_a = $_POST['id_equipe_a'];

$id_equipe_b = $_POST['id_equipe_b'];

$categoria = $_POST['categoria'];



// Busca o nome e apelido do jogador no banco

try {

    $stmt_jogador = $pdo->prepare("SELECT nome_completo, apelido FROM participantes WHERE id = ?");

    $stmt_jogador->execute([$id_jogador]);

    $jogador = $stmt_jogador->fetch(PDO::FETCH_ASSOC);

    if (!$jogador) {

        die("Erro: Jogador não encontrado no banco de dados.");

    }

    $nome_jogador = !empty($jogador['apelido']) ? $jogador['apelido'] : $jogador['nome_completo'];

} catch (PDOException $e) {

    die("Erro de conexão com o banco de dados (jogador): " . $e->getMessage());

}



// Divide a string em um vetor usando espaço como separador

$vetor_nomes = explode(" ", $nome_jogador);

$nome_jogador_primeiro_nome = $vetor_nomes[0];

$nome_jogador_segundo_nome = isset($vetor_nomes[1]) ? $vetor_nomes[1] : "";

$nome_jogador = $nome_jogador_primeiro_nome . " " . $nome_jogador_segundo_nome;



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

    die("Erro de conexão com o banco de dados (equipes): " . $e->getMessage());

}



// --- 3. PREPARAÇÃO DOS RECURSOS (IMAGENS, FONTES, CORES) ---

$caminho_fundo = '../assets/img/fundo_craque_do_jogo.jpg';

$caminho_fonte = '../assets/fonts/Roboto-Bold.ttf';

$pasta_brasoes = '../public/brasoes/';



// Carrega a imagem de fundo

$fundo = @imagecreatefromjpeg($caminho_fundo);

if (!$fundo) die("Erro ao carregar a imagem de fundo.");



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

    $texto_sigla = mb_strtoupper($equipe['sigla'] ?? 'N/A' , $GLOBALS['encoding']);

    $caixa_texto = imagettfbbox($tamanho_fonte, 0, $caminho_fonte, $texto_sigla);

    $largura_texto = $caixa_texto[2] - $caixa_texto[0];

    $altura_texto = $caixa_texto[1] - $caixa_texto[7];

    $x_texto = $x + (($tamanho - $largura_texto) / 2);

    $y_texto = $y + (($tamanho - $altura_texto) / 2) + $altura_texto;

    imagettftext($imagem_fundo, $tamanho_fonte, 0, $x_texto, $y_texto, $cor_texto, $caminho_fonte, $texto_sigla);

}



// --- 4. COMPOSIÇÃO DA ARTE (DESENHAR TUDO NA IMAGEM) ---



// 4.1 Redimensionar e posicionar a foto do jogador (se disponível)

$foto_jogador_original = null;

$foto_redimensionada = null;



// Tenta carregar a foto enviada via upload

if (!empty($_FILES['nova_foto']['tmp_name'])) {

    $foto_info = getimagesize($_FILES['nova_foto']['tmp_name']);

    if ($foto_info['mime'] == 'image/jpeg') {

        $foto_jogador_original = @imagecreatefromjpeg($_FILES['nova_foto']['tmp_name']);

    } elseif ($foto_info['mime'] == 'image/png') {

        $foto_jogador_original = @imagecreatefrompng($_FILES['nova_foto']['tmp_name']);

    }

    if (!$foto_jogador_original) {

        // Se a foto enviada não pôde ser carregada, prossegue sem foto

        $foto_jogador_original = null;

    }

}

// Tenta carregar a foto do banco de dados

elseif (!empty($_POST['foto_selecionada'])) {

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

        // Se houver erro na consulta ao banco, prossegue sem foto

        $foto_jogador_original = null;

    }

}



// Se houver uma foto válida, redimensionar e posicionar

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

    $largura_container_foto = $nova_largura; // A largura do container será a largura da imagem redimensionada

    $x_foto = ($largura_fundo - $largura_container_foto) / 2; // Centraliza horizontalmente

    $y_foto = 335; // Mantém a posição vertical ajustada



    // Copia a imagem redimensionada para o fundo, centralizando-a

    imagecopy($fundo, $foto_redimensionada, $x_foto, $y_foto, 0, 0, $largura_container_foto, $altura_container_foto);

}



// 4.2 Escrever o nome do jogador, categoria e campeonato

$tamanho_fonte_nome = 70;

$tamanho_fonte_categoria = 50;

$tamanho_fonte_nome_campeonato = 40;



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

$texto_categoria = mb_strtoupper($categorias_titulos[$categoria] ?? 'Craque do Jogo' , $encoding);

$texto_nome = mb_strtoupper($nome_jogador , $encoding);

$texto_nome_campeonato = mb_strtoupper($nome_campeonato , $encoding);



$caixa_texto_categoria = imagettfbbox($tamanho_fonte_categoria, 0, $caminho_fonte, $texto_categoria);

$caixa_texto_nome = imagettfbbox($tamanho_fonte_nome, 0, $caminho_fonte, $texto_nome);

$caixa_texto_nome_campeonato = imagettfbbox($tamanho_fonte_nome_campeonato, 0, $caminho_fonte, $texto_nome_campeonato);

$largura_texto_categoria = $caixa_texto_categoria[2] - $caixa_texto_categoria[0];

$largura_texto_nome = $caixa_texto_nome[2] - $caixa_texto_nome[0];

$largura_texto_nome_campeonato = $caixa_texto_nome_campeonato[2] - $caixa_texto_nome_campeonato[0];

$x_categoria = ($largura_fundo - $largura_texto_categoria) / 2;

$x_nome = ($largura_fundo - $largura_texto_nome) / 2;

$x_nome_campeonato = ($largura_fundo - $largura_texto_nome_campeonato) / 2;

$y_categoria = 1150; // Ajustado para posicionar acima do nome

$y_nome = 1230;

$y_nome_campeonato = 1700;



//imagettftext($fundo, $tamanho_fonte_categoria, 0, $x_categoria, $y_categoria, $cor_branca, $caminho_fonte, $texto_categoria);

imagettftext($fundo, $tamanho_fonte_nome, 0, $x_nome, $y_nome, $cor_branca, $caminho_fonte, $texto_nome);

imagettftext($fundo, $tamanho_fonte_nome_campeonato, 0, $x_nome_campeonato, $y_nome_campeonato, $cor_branca, $caminho_fonte, $texto_nome_campeonato);



// 4.3 Escrever a rodada abaixo do nome do campeonato

$tamanho_fonte_rodada = 30; // Tamanho menor para a rodada

$texto_rodada = mb_strtoupper($rodada , $encoding);

$caixa_texto_rodada = imagettfbbox($tamanho_fonte_rodada, 0, $caminho_fonte, $texto_rodada);

$largura_texto_rodada = $caixa_texto_rodada[2] - $caixa_texto_rodada[0];

$x_rodada = ($largura_fundo - $largura_texto_rodada) / 2;

$y_rodada = $y_nome_campeonato + 50; // Ajuste a distância vertical (50 pixels abaixo do campeonato)

imagettftext($fundo, $tamanho_fonte_rodada, 0, $x_rodada, $y_rodada, $cor_branca, $caminho_fonte, $texto_rodada);



// 4.4 Posicionar brasões/siglas e placar

$tamanho_brasao = 150;

$y_brasoes_e_placar = 1535;

$distancia_centro_brasao = 350;

$distancia_centro_placar = 180;



// Desenha Brasão/Sigla da Equipe A

desenharBrasaoOuSigla($fundo, $equipe_a, 102 + ($largura_fundo / 2) - $distancia_centro_brasao - ($tamanho_brasao / 2), $y_brasoes_e_placar - 280, $tamanho_brasao, $caminho_fonte, $cor_preta, $pasta_brasoes);

// Desenha Brasão/Sigla da Equipe B

desenharBrasaoOuSigla($fundo, $equipe_b, -94 + ($largura_fundo / 2) + $distancia_centro_brasao - ($tamanho_brasao / 2), $y_brasoes_e_placar - 280, $tamanho_brasao, $caminho_fonte, $cor_branca, $pasta_brasoes);



// Escrever o placar

$tamanho_fonte_placar = 100;

imagettftext($fundo, $tamanho_fonte_placar, 0, -105 + ($largura_fundo / 2) - $distancia_centro_placar, $y_brasoes_e_placar, $cor_preta, $caminho_fonte, $placar_a);

imagettftext($fundo, $tamanho_fonte_placar, 0, ($largura_fundo / 2) + $distancia_centro_placar + 40, $y_brasoes_e_placar, $cor_preta, $caminho_fonte, $placar_b);



// --- 5. SAÍDA DA IMAGEM ---

header('Content-Type: image/jpeg');

header('Content-Disposition: inline; filename="arte_'.slugify($texto_categoria).'_'.slugify($nome_jogador).'.jpg"');



imagejpeg($fundo, null, 90); // Qualidade 90 para um bom balanço tamanho/qualidade



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