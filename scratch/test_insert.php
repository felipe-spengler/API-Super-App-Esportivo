<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\CompetitorTime;

$insertData = [
    'championship_id' => 73,
    'user_id' => 2763,
    'team_id' => 1071,
    'category_id' => 170,
    'time_ms' => 12345,
    'lap' => 1,
    'status' => 'completed',
    'game_match_id' => 3470 // Let's use 3470!
];

$time = CompetitorTime::create($insertData);
echo "CREATED ID: {$time->id}\n";
echo "SAVED game_match_id: " . var_export($time->game_match_id, true) . "\n";

// Reload from database
$reloaded = CompetitorTime::find($time->id);
echo "RELOADED game_match_id: " . var_export($reloaded->game_match_id, true) . "\n";

// Delete it afterwards so we keep DB clean
$reloaded->delete();
echo "DELETED\n";
