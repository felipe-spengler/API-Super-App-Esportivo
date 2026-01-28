<?php
// Load Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$champId = 51; // Hardcoded for your test case

echo "<h1>Debug Estatísticas - Champ $champId</h1>";

// 1. Check Championship
$champ = \App\Models\Championship::find($champId);
if (!$champ)
    die("Campeonato não encontrado.");
echo "<p>Campeonato: <strong>{$champ->name}</strong> (ID: $champId)</p>";

// 2. Check Matches
$matches = \App\Models\GameMatch::where('championship_id', $champId)->get();
echo "<h2>Partidas ({$matches->count()})</h2>";
echo "<table border='1' cellspacing='0' cellpadding='5'>";
echo "<tr><th>ID</th><th>Times</th><th>Status</th><th>Events Count</th></tr>";
$matchIds = [];
foreach ($matches as $m) {
    // Force Load
    $count = \App\Models\MatchEvent::where('game_match_id', $m->id)->count();
    $matchIds[] = $m->id;

    echo "<tr>";
    echo "<td>{$m->id}</td>";
    echo "<td>{$m->home_team_id} vs {$m->away_team_id}</td>";
    echo "<td>{$m->status}</td>";
    echo "<td>{$count}</td>";
    echo "</tr>";
}
echo "</table>";

// 3. Stats Logic Simulation (Points)
echo "<h2>Simulação da Query de Pontuadores (Points + Blocks + Aces)</h2>";
$types = ['point', 'block', 'ace'];
$events = \App\Models\MatchEvent::whereIn('event_type', $types)
    ->whereHas('gameMatch', function ($q) use ($champId) {
        $q->where('championship_id', $champId);
        // Removing status check for debug to see EVERYTHING
    })
    ->with(['gameMatch', 'team'])
    ->get();

echo "<p>Total Eventos encontrados (Sem filtro de status): " . $events->count() . "</p>";

if ($events->count() > 0) {
    echo "<table border='1' cellspacing='0' cellpadding='5'>";
    echo "<tr><th>Match ID</th><th>Status</th><th>Type</th><th>Player (Metadata)</th><th>Team</th></tr>";
    foreach ($events as $e) {
        $meta = json_decode($e->metadata ?? '{}', true);
        echo "<tr>";
        echo "<td>{$e->game_match_id}</td>";
        echo "<td>{$e->gameMatch->status}</td>";
        echo "<td>{$e->event_type}</td>";
        echo "<td>" . ($meta['original_player_name'] ?? 'N/A') . "</td>";
        echo "<td>" . ($e->team->name ?? 'N/A') . "</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "<p style='color:red'>Nenhum evento encontrado para os tipos: " . implode(', ', $types) . "</p>";
}
