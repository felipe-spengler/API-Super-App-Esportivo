<?php

function schedulerRoundRobin($teams)
{
    $teamsArray = array_values($teams);

    if (count($teamsArray) % 2 != 0) {
        $teamsArray[] = null; // Dummy team for bye
    }

    $numTeams = count($teamsArray);
    $numRounds = $numTeams - 1;
    $half = $numTeams / 2;
    $rounds = [];

    $indices = array_keys($teamsArray); // 0 to N-1

    for ($r = 0; $r < $numRounds; $r++) {
        $roundMatches = [];
        for ($i = 0; $i < $half; $i++) {
            $homeIdx = $indices[$i];
            $awayIdx = $indices[$numTeams - 1 - $i];

            $home = $teamsArray[$homeIdx];
            $away = $teamsArray[$awayIdx];

            if ($home !== null && $away !== null) {
                $roundMatches[] = [$home, $away];
            }
        }
        $rounds[] = $roundMatches;

        // Rotate indices for next round (keep index 0 fixed)
        $moving = array_splice($indices, 1);
        $last = array_pop($moving);
        array_unshift($moving, $last);
        $indices = array_merge([$indices[0]], $moving);
    }

    return $rounds;
}

$teams = ['A', 'B', 'C', 'D', 'E', 'F'];
$schedule = schedulerRoundRobin($teams);

echo "Teams: " . implode(', ', $teams) . "\n";
echo "Rounds generated: " . count($schedule) . "\n";
foreach ($schedule as $idx => $matches) {
    echo "Round " . ($idx + 1) . ": " . count($matches) . " matches\n";
    foreach ($matches as $m) {
        echo "  " . $m[0] . " vs " . $m[1] . "\n";
    }
}
