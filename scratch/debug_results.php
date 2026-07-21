<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$controller = new App\Http\Controllers\EventController();
$response = $controller->raceResults(request(), 78);
$data = json_decode($response->getContent(), true);

echo "EVENTCONTROLLER PUBLIC COUNT: " . count($data) . "\n";
foreach ($data as $r) {
    echo "ID: {$r['id']}, Name: {$r['name']}, Bib: {$r['bib_number']}, NetTime: {$r['net_time']}, Lap: {$r['lap']}\n";
}
