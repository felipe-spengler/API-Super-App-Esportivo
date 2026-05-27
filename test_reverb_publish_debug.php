<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

config(['broadcasting.connections.reverb.options.port' => 9099]);

try {
    echo "Dispatched ChampionshipTimesUpdated event to 9099...\n";
    broadcast(new App\Events\ChampionshipTimesUpdated(73));
    echo "Success!\n";
} catch (\Exception $e) {
    echo "Failed: " . $e->getMessage() . "\n";
}
