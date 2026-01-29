<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "--- Sports ---\n";
$sports = \App\Models\Sport::all();
foreach ($sports as $s) {
    echo "ID: {$s->id} | Name: {$s->name} | Slug: {$s->slug}\n";
}

echo "\n--- Championships ---\n";
$champs = \App\Models\Championship::all();
foreach ($champs as $c) {
    echo "ID: {$c->id} | Name: {$c->name} | ClubID: {$c->club_id} | SportID: {$c->sport_id}\n";
}
