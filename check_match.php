<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$match = \App\Models\GameMatch::find(3012);
if ($match) {
    echo "Match Found: " . $match->id . "\n";
    echo "Status: " . $match->status . "\n";
    echo "Details: " . json_encode($match->match_details, JSON_PRETTY_PRINT) . "\n";
} else {
    echo "Match 3012 NOT FOUND\n";
}
