<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$logs = \DB::table('audit_logs')
    ->where('action', 'like', '%times%')
    ->orderBy('id', 'desc')
    ->take(10)
    ->get();

foreach ($logs as $log) {
    echo "ID: {$log->id}, Action: {$log->action}, Desc: {$log->description}\n";
    echo "Metadata: " . substr($log->metadata, 0, 500) . "\n\n";
}
