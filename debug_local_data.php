<?php

use App\Models\Championship;
use App\Models\Category;
use App\Models\GameMatch;
use App\Models\Team;
use App\Models\MatchSet;
use App\Models\MatchEvent;

echo "--- Data Verification (Local) ---\n";
echo "Total Championships: " . Championship::count() . "\n";
echo "Total Categories: " . Category::count() . "\n";
echo "Total Teams: " . Team::count() . "\n";
echo "Total Matches: " . GameMatch::count() . "\n";
echo "Total Sets: " . MatchSet::count() . "\n";
echo "Total Events: " . MatchEvent::count() . "\n";

echo "\n--- Sample Teams ---\n";
foreach (Team::take(5)->get() as $t) {
    echo "ID {$t->id}: {$t->name} (Logo: {$t->logo_url})\n";
}

echo "\n--- Sample Sets ---\n";
foreach (MatchSet::take(5)->get() as $s) {
    echo "Match {$s->game_match_id}: Set {$s->set_number} ({$s->home_score}-{$s->away_score})\n";
}

$champ = Championship::with('categories')->find(12);
if ($champ) {
    echo "\nChecking Championship ID 12 ({$champ->name}):\n";
    echo "Categories count: " . $champ->categories->count() . "\n";
    foreach ($champ->categories as $cat) {
        $matches = GameMatch::where('category_id', $cat->id)->count();
        echo "  - Cat ID {$cat->id} ({$cat->name}): {$matches} matches\n";
    }
} else {
    echo "\nChampionship ID 12 not found.\n";
}
