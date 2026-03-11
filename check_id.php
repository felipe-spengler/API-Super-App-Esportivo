<?php
include 'vendor/autoload.php';
$app = include_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\RaceResult;
use Illuminate\Support\Facades\DB;

$id = 5;
$rr = RaceResult::find($id);
if ($rr) {
    echo "Found in race_results: " . json_encode($rr->toArray()) . "\n";
} else {
    echo "Not found in race_results\n";
}

$ct = DB::table('championship_team')->find($id);
if ($ct) {
    echo "Found in championship_team: " . json_encode($ct) . "\n";
} else {
    echo "Not found in championship_team\n";
}
