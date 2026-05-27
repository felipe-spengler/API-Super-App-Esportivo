<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "COMPETITOR TIMES LIST:\n";
$times = \App\Models\CompetitorTime::with(['user', 'team', 'category'])->get();
foreach ($times as $t) {
    echo "ID: {$t->id} | Champ: {$t->championship_id} | Match: " . ($t->game_match_id ?? 'NULL') . " | User: " . ($t->user->name ?? 'None') . " | Team: " . ($t->team->name ?? 'None') . " | Lap: {$t->lap} | TimeMs: {$t->time_ms} | Created: {$t->created_at}\n";
}
