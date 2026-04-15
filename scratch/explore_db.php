<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\GameMatch;
use App\Models\Championship;

$recentChamp = Championship::latest('updated_at')->first();

if (!$recentChamp) {
    echo "No championships found.\n";
    exit;
}

echo "Championship: {$recentChamp->name} (ID: {$recentChamp->id})\n";
echo "Include Knockout Standings: " . ($recentChamp->include_knockout_standings ? 'YES' : 'NO') . "\n";

$matches = GameMatch::where('championship_id', $recentChamp->id)
    ->where('status', 'finished')
    ->get(['id', 'round_name', 'is_knockout', 'home_score', 'away_score']);

echo "Total finished matches: " . $matches->count() . "\n";

$is_knockout_counts = $matches->groupBy('is_knockout')->map->count();
echo "Matches by is_knockout:\n";
foreach ($is_knockout_counts as $val => $count) {
    echo "  " . var_export($val, true) . ": $count\n";
}

$round_counts = $matches->groupBy('round_name')->map->count();
echo "Matches by round_name:\n";
foreach ($round_counts as $name => $count) {
    echo "  " . ($name ?: 'NULL') . ": $count\n";
}

// Check if any match has is_knockout = 1 but is being counted (or vice versa)
$knockoutMatches = $matches->where('is_knockout', 1);
echo "Knockout matches (is_knockout=1): " . $knockoutMatches->count() . "\n";
foreach ($knockoutMatches as $m) {
    echo "  Match ID: {$m->id}, Round: {$m->round_name}\n";
}
