<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\TeamPlayer;
use App\Models\CompetitorTime;

echo "==========================================\n";
echo "SWIMMING TEST DATA SEEDER - APP ESPORTIVO\n";
echo "==========================================\n";

// 1. Championship 73: "nada voltas" (Category 170)
// Teams: 1070 ("NATAÇÃO 1"), 1071 ("NATAÇÃO 2")
// Matches: 3470
$champ73Id = 73;
$cat170Id = 170;
$match3470Id = 3470;
$teams73 = [1070 => 'NATAÇÃO 1', 1071 => 'NATAÇÃO 2'];

$letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
$voltasLaps = [
    'A' => [15400, 31200, 47900],
    'B' => [16100, 32800, 49500],
    'C' => [14900, 30100, 46200],
    'D' => [17200, 35100, 53400],
    'E' => [18000, 36700, 55800],
    'F' => [15900, 31900, 48300],
    'G' => [16600, 33400, 50800],
    'H' => [14200, 29000, 44100],
    'I' => [17500, 35900, 54100],
    'J' => [18500, 37900, 57200]
];

echo "\nSeeding 'nada voltas' (Championship 73)...\n";
foreach ($letters as $index => $letter) {
    $email = "swimmer_voltas_" . strtolower($letter) . "@example.com";
    $name = "Nadador Voltas " . $letter;
    
    // Get or create user
    $user = User::where('email', $email)->first();
    if (!$user) {
        $user = User::create([
            'name' => $name,
            'nickname' => "Voltas " . $letter,
            'email' => $email,
            'password' => bcrypt('password123'),
            'is_admin' => false,
        ]);
        echo "Created user: {$name}\n";
    } else {
        echo "User already exists: {$name}\n";
    }

    // Determine Team: A-E in 1070, F-J in 1071
    $teamId = ($index < 5) ? 1070 : 1071;

    // Link User to Team & Championship
    $teamPlayer = TeamPlayer::where('user_id', $user->id)
        ->where('championship_id', $champ73Id)
        ->first();
    
    if (!$teamPlayer) {
        TeamPlayer::create([
            'team_id' => $teamId,
            'user_id' => $user->id,
            'championship_id' => $champ73Id,
            'temp_player_name' => $name,
            'is_approved' => true
        ]);
        echo "Registered {$name} in Team {$teams73[$teamId]}\n";
    }

    // Insert Lap Times in competitor_times
    $laps = $voltasLaps[$letter];
    foreach ($laps as $lapIndex => $timeMs) {
        $lapNum = $lapIndex + 1;
        
        $compTime = CompetitorTime::where('user_id', $user->id)
            ->where('championship_id', $champ73Id)
            ->where('lap', $lapNum)
            ->first();
            
        if (!$compTime) {
            CompetitorTime::create([
                'championship_id' => $champ73Id,
                'game_match_id' => $match3470Id,
                'category_id' => $cat170Id,
                'team_id' => $teamId,
                'user_id' => $user->id,
                'time_ms' => $timeMs,
                'lap' => $lapNum,
                'status' => 'completed'
            ]);
            echo "Inserted Lap {$lapNum} time ({$timeMs}ms) for {$name}\n";
        }
    }
}

// 2. Championship 77: "nada tempo" (Category 174)
// Teams: 1062 ("Argentina"), 1066 ("Alemanha")
// Matches: 3491 (A-E), 3492 (F-J)
$champ77Id = 77;
$cat174Id = 174;
$match3491Id = 3491;
$match3492Id = 3492;
$teams77 = [1062 => 'Argentina', 1066 => 'Alemanha'];

$tempoTimes = [
    'A' => 4820,
    'B' => 5150,
    'C' => 5980,
    'D' => 6320,
    'E' => 6750,
    'F' => 4950,
    'G' => 5250,
    'H' => 5880,
    'I' => 6110,
    'J' => 6990
];

echo "\nSeeding 'nada tempo' (Championship 77)...\n";
foreach ($letters as $index => $letter) {
    $email = "swimmer_tempo_" . strtolower($letter) . "@example.com";
    $name = "Nadador Tempo " . $letter;
    
    // Get or create user
    $user = User::where('email', $email)->first();
    if (!$user) {
        $user = User::create([
            'name' => $name,
            'nickname' => "Tempo " . $letter,
            'email' => $email,
            'password' => bcrypt('password123'),
            'is_admin' => false,
        ]);
        echo "Created user: {$name}\n";
    } else {
        echo "User already exists: {$name}\n";
    }

    // Determine Team: A-E in 1062, F-J in 1066
    $teamId = ($index < 5) ? 1062 : 1066;

    // Determine Match: A-E in 3491, F-J in 3492
    $matchId = ($index < 5) ? $match3491Id : $match3492Id;

    // Link User to Team & Championship
    $teamPlayer = TeamPlayer::where('user_id', $user->id)
        ->where('championship_id', $champ77Id)
        ->first();
    
    if (!$teamPlayer) {
        TeamPlayer::create([
            'team_id' => $teamId,
            'user_id' => $user->id,
            'championship_id' => $champ77Id,
            'temp_player_name' => $name,
            'is_approved' => true
        ]);
        echo "Registered {$name} in Team {$teams77[$teamId]}\n";
    }

    // Insert Time in competitor_times (only 1 lap)
    $timeMs = $tempoTimes[$letter];
    
    $compTime = CompetitorTime::where('user_id', $user->id)
        ->where('championship_id', $champ77Id)
        ->first();
        
    if (!$compTime) {
        CompetitorTime::create([
            'championship_id' => $champ77Id,
            'game_match_id' => $matchId,
            'category_id' => $cat174Id,
            'team_id' => $teamId,
            'user_id' => $user->id,
            'time_ms' => $timeMs,
            'lap' => 1,
            'status' => 'completed'
        ]);
        echo "Inserted time ({$timeMs}ms) in Match {$matchId} for {$name}\n";
    }
}

echo "\n==========================================\n";
echo "SEEDING COMPLETED SUCCESSFULLY!\n";
echo "==========================================\n";
