<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

foreach (App\Models\Sport::all() as $s) {
    echo "ID: {$s->id}, Name: {$s->name}, Slug: {$s->slug}, Icon: {$s->icon_name}\n";
}
