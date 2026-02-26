<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$matches = \App\Models\GameMatch::where('championship_id', 51)->get(['id', 'championship_id', 'category_id', 'status', 'match_details'])->toArray();

// Count total JSON events
$totalJsonEvents = 0;
foreach ($matches as $m) {
    if (isset($m['match_details']['events'])) {
        $totalJsonEvents += count($m['match_details']['events']);
    }
}

echo "Matches count: " . count($matches) . "\n";
echo "JSON events count: " . $totalJsonEvents . "\n";
if (count($matches) > 0) {
    echo "Sample Category ID: " . $matches[0]['category_id'] . "\n";
}
