<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    echo "Dispatched ChampionshipTimesUpdated event...\n";
    broadcast(new App\Events\ChampionshipTimesUpdated(73));
    echo "Success!\n";
    \Illuminate\Support\Facades\Log::error("test_reverb_publish failed", ['exception' => $e]);
    echo "Failed: check Laravel logs for error details.\n";
}
