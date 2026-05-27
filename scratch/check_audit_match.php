<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\CompetitorTime;

$times = CompetitorTime::where('user_id', 2763)
    ->where('time_ms', 45922)
    ->get();

echo "Matching records found: " . $times->count() . "\n";
foreach ($times as $t) {
    echo "ID: {$t->id}, game_match_id: " . var_export($t->game_match_id, true) . ", Created at: {$t->created_at}\n";
}
