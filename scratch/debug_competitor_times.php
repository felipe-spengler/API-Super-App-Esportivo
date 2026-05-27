<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\CompetitorTime;

$times = CompetitorTime::whereNotNull('game_match_id')->get();
echo "Total times with game_match_id: " . $times->count() . "\n";
foreach ($times as $t) {
    echo "ID: {$t->id}, game_match_id: {$t->game_match_id}, time_ms: {$t->time_ms}\n";
}
