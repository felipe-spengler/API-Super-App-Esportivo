<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\GameMatch;

$count = GameMatch::where(function($q) { 
    $q->where('round_name', 'like', '%Final%')
      ->orWhere('round_name', 'like', '%Semi%'); 
})
->where(function($q) {
    $q->where('is_knockout', '!=', 1)
      ->orWhereNull('is_knockout');
})
->count();

echo "Matches with knockout-like names but NO is_knockout flag: " . $count . "\n";

$matches = GameMatch::where(function($q) { 
    $q->where('round_name', 'like', '%Final%')
      ->orWhere('round_name', 'like', '%Semi%'); 
})
->where(function($q) {
    $q->where('is_knockout', '!=', 1)
      ->orWhereNull('is_knockout');
})
->with('championship:id,name')
->get(['id', 'round_name', 'championship_id']);

foreach ($matches as $m) {
    echo "ID: {$m->id}, Round: {$m->round_name}, Champ: " . ($m->championship->name ?? 'N/A') . "\n";
}
