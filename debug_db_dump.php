<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$champId = 51; // The one being viewed

echo "=== CHAMPEONATO $champId ===\n";
$champ = \App\Models\Championship::find($champId);
echo $champ ? "Nome: " . $champ->name . "\n" : "Nao encontrado\n";

echo "\n=== CATEGORIAS (Filhos do Champ 51) ===\n";
$cats = \App\Models\Category::where('championship_id', $champId)->get();
foreach ($cats as $c)
    echo "ID: " . $c->id . " - " . $c->name . "\n";

echo "\n=== PARTIDAS DO CHAMP $champId ===\n";
$matches = \App\Models\GameMatch::where('championship_id', $champId)->get();
foreach ($matches as $m) {
    echo "Match ID: " . $m->id . " | Status: " . $m->status . " | Home: " . $m->home_team_id . " | Away: " . $m->away_team_id . "\n";
    $points = \App\Models\MatchEvent::where('game_match_id', $m->id)->where('event_type', 'point')->count();
    $blocks = \App\Models\MatchEvent::where('game_match_id', $m->id)->where('event_type', 'block')->count();
    $aces = \App\Models\MatchEvent::where('game_match_id', $m->id)->where('event_type', 'ace')->count();
    echo "   -> Pontos (Normal): $points | Bloqueios: $blocks | Aces: $aces\n";
}

echo "\n=== EVENTOS 'POINT' NO BANCO (Total) ===\n";
echo \App\Models\MatchEvent::where('event_type', 'point')->count() . " events type 'point'\n";

echo "\n=== PARTIDA 3002 (Detalhe) ===\n";
$m3002 = \App\Models\GameMatch::find(3002);
if ($m3002) {
    echo "ChampID: " . $m3002->championship_id . "\n";
    echo "Status: " . $m3002->status . "\n";
} else {
    echo "Nao encontrada.\n";
}
