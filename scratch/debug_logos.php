<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$m = \App\Models\GameMatch::with(['homeTeam', 'awayTeam'])->find(3396);
$data = [
    'home' => $m->homeTeam ? [
        'name' => $m->homeTeam->name,
        'logo_path' => $m->homeTeam->logo_path,
        'exists_storage' => $m->homeTeam->logo_path ? file_exists(storage_path('app/public/' . $m->homeTeam->logo_path)) : false,
        'exists_public' => $m->homeTeam->logo_path ? file_exists(public_path('storage/' . $m->homeTeam->logo_path)) : false,
        'exists_brasoes' => $m->homeTeam->logo_path ? file_exists(public_path('brasoes/' . basename($m->homeTeam->logo_path))) : false,
    ] : null,
    'away' => $m->awayTeam ? [
        'name' => $m->awayTeam->name,
        'logo_path' => $m->awayTeam->logo_path,
        'exists_storage' => $m->awayTeam->logo_path ? file_exists(storage_path('app/public/' . $m->awayTeam->logo_path)) : false,
        'exists_public' => $m->awayTeam->logo_path ? file_exists(public_path('storage/' . $m->awayTeam->logo_path)) : false,
        'exists_brasoes' => $m->awayTeam->logo_path ? file_exists(public_path('brasoes/' . basename($m->awayTeam->logo_path))) : false,
    ] : null,
];
echo json_encode($data, JSON_PRETTY_PRINT);
