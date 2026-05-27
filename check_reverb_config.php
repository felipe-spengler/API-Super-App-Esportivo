<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "REVERB CONFIG:\n";
print_r(config('reverb'));

echo "\nBROADCASTING CONFIG:\n";
print_r(config('broadcasting.connections.reverb'));
