<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\User::where('email', 'admin@yara.com')->first();
$club = \App\Models\Club::where('slug', 'yara')->first();

if ($club) {
    echo "Club Yara Found: " . $club->id . "\n";

    // Update modalities
    $modalities = $club->active_modalities ?? [];
    $needed = ['futebol', 'corrida'];
    $changed = false;
    foreach ($needed as $m) {
        if (!in_array($m, $modalities)) {
            $modalities[] = $m;
            $changed = true;
        }
    }
    if ($changed) {
        $club->active_modalities = $modalities;
        $club->save();
        echo "Updated Yara modalities to: " . implode(', ', $modalities) . "\n";
    }

    // Link user
    if ($user) {
        if ($user->club_id !== $club->id) {
            $user->club_id = $club->id;
            $user->save();
            echo "Linked User to Club Yara.\n";
        } else {
            echo "User already linked to Yara.\n";
        }
    } else {
        // Create user if missing
        echo "User admin@yara.com not found! Creating...\n";
        $user = \App\Models\User::create([
            'name' => 'Admin Yara',
            'email' => 'admin@yara.com',
            'password' => bcrypt('password'),
            'is_admin' => true,
            'club_id' => $club->id
        ]);
        echo "Created User linked to Club Yara.\n";
    }
} else {
    echo "Club Yara not found!\n";
}
