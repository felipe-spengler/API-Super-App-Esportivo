<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Championship;
use App\Models\Category;
use App\Models\Race;
use App\Models\RaceResult;
use App\Models\CompetitorTime;
use App\Models\User;
use App\Models\Sport;
use App\Models\Club;
use Illuminate\Support\Str;

function msToTime($ms) {
    $seconds = floor($ms / 1000);
    $minutes = floor($seconds / 60);
    $hours = floor($minutes / 60);
    $minutes = $minutes % 60;
    $seconds = $seconds % 60;
    return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
}

try {
    \DB::beginTransaction();

    // Verify Sport and Club
    $sport = Sport::where('slug', 'swimming')->orWhere('name', 'Natação')->orWhere('id', 16)->first();
    if (!$sport) {
        throw new \Exception("Natação (swimming) sport not found in DB.");
    }
    echo "Using Sport: ID={$sport->id}, Name={$sport->name}\n";

    $club = Club::find(1);
    if (!$club) {
        throw new \Exception("Club ID 1 not found in DB.");
    }
    echo "Using Club: ID={$club->id}, Name={$club->name}\n";

    // 1. Create or Find Championships
    $champsInfo = [
        [
            'name' => 'nada voltas individual',
            'format' => 'laps',
            'registration_type' => 'individual',
        ],
        [
            'name' => 'nada tempo individual',
            'format' => 'racing',
            'registration_type' => 'individual',
        ]
    ];

    $champs = [];
    foreach ($champsInfo as $info) {
        $champ = Championship::where('name', $info['name'])->where('club_id', $club->id)->first();
        if (!$champ) {
            $champ = Championship::create([
                'club_id' => $club->id,
                'sport_id' => $sport->id,
                'name' => $info['name'],
                'description' => 'Campeonato de Natação Individual para Testes - ' . ucfirst($info['format']),
                'start_date' => now()->toDateString(),
                'end_date' => now()->addDays(30)->toDateString(),
                'registration_start_date' => now()->subDays(5)->toDateTimeString(),
                'registration_end_date' => now()->addDays(5)->toDateTimeString(),
                'registration_type' => $info['registration_type'],
                'status' => 'ongoing',
                'format' => $info['format'],
                'is_status_auto' => false,
            ]);
            echo "Created Championship: '{$champ->name}', ID={$champ->id}\n";
        } else {
            // Safe Mode: Make sure status is ongoing and format/registration_type are correct
            $champ->update([
                'status' => 'ongoing',
                'format' => $info['format'],
                'registration_type' => $info['registration_type']
            ]);
            echo "Found Existing Championship: '{$champ->name}', ID={$champ->id}\n";
        }
        $champs[$info['format']] = $champ;
    }

    // 2. Create Categories & Race Records
    $categories = [];
    $races = [];
    foreach ($champs as $format => $champ) {
        // Category
        $cat = Category::where('championship_id', $champ->id)->where('name', 'Principal')->first();
        if (!$cat) {
            $cat = Category::create([
                'championship_id' => $champ->id,
                'name' => 'Principal',
                'description' => 'Categoria Principal de Natação',
                'gender' => 'mixed',
                'price' => 0,
            ]);
            echo "  Created Category 'Principal' for Championship ID={$champ->id}, ID={$cat->id}\n";
        } else {
            echo "  Found Category 'Principal' for Championship ID={$champ->id}, ID={$cat->id}\n";
        }
        $categories[$format] = $cat;

        // Race record (needed for individual championships to load results/participants)
        $race = Race::where('championship_id', $champ->id)->first();
        if (!$race) {
            $race = Race::create([
                'championship_id' => $champ->id,
                'start_datetime' => now()->toDateTimeString(),
                'location_name' => 'Piscina Olímpica Clube Toledão',
            ]);
            echo "  Created Race for Championship ID={$champ->id}, ID={$race->id}\n";
        } else {
            echo "  Found Race for Championship ID={$champ->id}, ID={$race->id}\n";
        }
        $races[$format] = $race;
    }

    // 3. Create 10 Individual Test Swimmers
    $users = [];
    for ($i = 0; $i < 10; $i++) {
        $char = chr(65 + $i); // A to J
        $cpf = sprintf('%03d%03d%03d%02d', 900 + $i, 111 * $i, 222 * $i, 10 + $i);
        $email = "nadador.ind.{$char}@toledao.com.br";
        $name = "Nadador Individual {$char}";

        $user = User::where('email', $email)->orWhere('cpf', $cpf)->first();
        if (!$user) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'phone' => '(45) 99999-00' . sprintf('%02d', $i),
                'cpf' => $cpf,
                'birth_date' => now()->subYears(20 + $i)->toDateString(),
                'gender' => ($i % 2 === 0) ? 'M' : 'F',
                'club_id' => $club->id,
                'password' => bcrypt('password123'),
            ]);
            echo "Created Swimmer User: '{$user->name}', ID={$user->id}\n";
        } else {
            echo "Found Swimmer User: '{$user->name}', ID={$user->id}\n";
        }
        $users[] = $user;
    }

    // 4. Seed Times for "nada tempo individual" (Racing format)
    $tempoChamp = $champs['racing'];
    $tempoRace = $races['racing'];
    $tempoCat = $categories['racing'];

    // Clean existing times/results for this specific championship to ensure a clean test state without duplicates
    CompetitorTime::where('championship_id', $tempoChamp->id)->delete();
    RaceResult::where('race_id', $tempoRace->id)->delete();

    // Baseline speeds for 50m free style: around 24 to 34 seconds (24000 to 34000 ms)
    $timesMs = [24150, 24890, 25620, 26340, 27120, 28010, 29430, 31100, 32670, 33980];
    
    foreach ($users as $index => $user) {
        $timeMs = $timesMs[$index];
        $timeStr = msToTime($timeMs);
        $bib = (string)($index + 1);

        // Create RaceResult
        $result = RaceResult::create([
            'race_id' => $tempoRace->id,
            'user_id' => $user->id,
            'name' => $user->name,
            'bib_number' => $bib,
            'category_id' => $tempoCat->id,
            'net_time' => $timeStr,
            'gross_time' => $timeStr,
            'lap' => 1,
            'position_general' => $index + 1,
            'position_category' => $index + 1,
            'status_payment' => 'paid',
            'payment_method' => 'manual',
        ]);

        // Create CompetitorTime
        $compTime = CompetitorTime::create([
            'championship_id' => $tempoChamp->id,
            'category_id' => $tempoCat->id,
            'user_id' => $user->id,
            'time_ms' => $timeMs,
            'lap' => 1,
            'status' => 'completed',
        ]);
    }
    echo "Successfully seeded times and results for 'nada tempo individual' (Racing)!\n";

    // 5. Seed Laps for "nada voltas individual" (Laps format)
    $voltasChamp = $champs['laps'];
    $voltasRace = $races['laps'];
    $voltasCat = $categories['laps'];

    // Clean existing times/results for this specific championship to ensure a clean test state without duplicates
    CompetitorTime::where('championship_id', $voltasChamp->id)->delete();
    RaceResult::where('race_id', $voltasRace->id)->delete();

    // Number of laps for each swimmer (Swimmer A did 15 laps, Swimmer B did 14, etc.)
    // For each swimmer, we insert the sum of their laps as a single record (to show max laps completed)
    // or does the system show total laps? Let's check how the UI renders laps.
    // Usually, in laps format, the winner is the one with the most laps in the least amount of time.
    // So the lap number should be higher for better placed swimmers, and if they have same laps, lower time wins.
    $lapsCount = [15, 15, 14, 14, 13, 12, 11, 10, 9, 8];
    // Total elapsed times for those laps (e.g. 15 laps in 45 minutes etc. Let's make it look realistic, around 20 to 45 minutes)
    $voltasTimesMs = [
        2700000, // 45:00
        2754000, // 45:54
        2580000, // 43:00
        2640000, // 44:00
        2460000, // 41:00
        2280000, // 38:00
        2100000, // 35:00
        1920000, // 32:00
        1800000, // 30:00
        1620000, // 27:00
    ];

    foreach ($users as $index => $user) {
        $laps = $lapsCount[$index];
        $timeMs = $voltasTimesMs[$index];
        $timeStr = msToTime($timeMs);
        $bib = (string)(100 + $index + 1);

        // Create RaceResult
        $result = RaceResult::create([
            'race_id' => $voltasRace->id,
            'user_id' => $user->id,
            'name' => $user->name,
            'bib_number' => $bib,
            'category_id' => $voltasCat->id,
            'net_time' => $timeStr,
            'gross_time' => $timeStr,
            'lap' => $laps,
            'position_general' => $index + 1,
            'position_category' => $index + 1,
            'status_payment' => 'paid',
            'payment_method' => 'manual',
        ]);

        // Create CompetitorTime
        $compTime = CompetitorTime::create([
            'championship_id' => $voltasChamp->id,
            'category_id' => $voltasCat->id,
            'user_id' => $user->id,
            'time_ms' => $timeMs,
            'lap' => $laps,
            'status' => 'completed',
        ]);
    }
    echo "Successfully seeded laps and results for 'nada voltas individual' (Laps)!\n";

    \DB::commit();
    echo "=== SEEDING COMPLETED SUCCESSFULLY ===\n";
} catch (\Throwable $e) {
    \DB::rollBack();
    echo "=== ERROR SEEDING INDIVIDUAL SWIMMING ===\n";
    echo $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
    exit(1);
}
