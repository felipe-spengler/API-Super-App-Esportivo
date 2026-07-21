<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$affected = DB::update("
    UPDATE championship_team ct 
    JOIN teams t ON ct.team_id = t.id 
    SET ct.captain_id = t.captain_id 
    WHERE ct.captain_id IS NULL
");

echo "Successfully updated $affected rows in championship_team table!\n";
