<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "COMPETITOR TIMES TABLE COLUMNS:\n";
$columns = \Schema::getColumnListing('competitor_times');
print_r($columns);
