<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

function countCsvLines($file)
{
    if (!file_exists($file))
        return 0;
    $linecount = 0;
    $handle = fopen($file, "r");
    while (!feof($handle)) {
        $line = fgets($handle);
        if ($line !== false)
            $linecount++;
    }
    fclose($handle);
    return $linecount;
}

$csvMatches = countCsvLines(base_path('../partidas.csv'));
$csvSets = countCsvLines(base_path('../sumulas_pontos_sets.csv'));
$csvEvents = countCsvLines(base_path('../sumulas_eventos.csv'));

$dbMatches = \App\Models\GameMatch::count();
$dbSets = \App\Models\MatchSet::count();
$dbEvents = \App\Models\MatchEvent::count();

echo "=== RELATÓRIO DE COMPARAÇÃO ===\n";
echo "PARTIDAS:\n";
echo "  CSV: ~" . ($csvMatches - 1) . " linhas (estimado)\n"; // -1 header
echo "  DB : " . $dbMatches . " registros\n";
echo "\n";
echo "SETS (Vôlei):\n";
echo "  CSV: ~" . ($csvSets) . " linhas\n";
echo "  DB : " . $dbSets . " registros\n";
echo "\n";
echo "EVENTOS (Gols/Cartões/Pontos):\n";
echo "  CSV: ~" . ($csvEvents) . " linhas\n";
echo "  DB : " . $dbEvents . " registros\n";

echo "\n";
echo "=== DETALHES DA PARTIDA 3012 ===\n";
$m = \App\Models\GameMatch::with(['sets', 'events'])->find(3012);
if ($m) {
    echo "Partida Encontrada: ID 3012\n";
    echo "Sets no Banco: " . $m->sets->count() . "\n";
    echo "Eventos no Banco: " . $m->events->count() . "\n";
    echo "Estrutura JSON (Frontend Compat): " . json_encode($m->match_details_structure, JSON_PRETTY_PRINT) . "\n";
} else {
    echo "Partida 3012 NÃO ENCONTRADA no banco.\n";
}
