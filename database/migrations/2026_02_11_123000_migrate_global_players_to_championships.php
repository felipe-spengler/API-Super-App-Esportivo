<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Get all team_player records that are GLOBAL (championship_id IS NULL)
        $globalPlayers = DB::table('team_players')
            ->whereNull('championship_id')
            ->get();

        // 2. Iterate through each global player record
        foreach ($globalPlayers as $playerRecord) {

            // 3. Find championships that this team is participating in
            $teamChampionships = DB::table('championship_team')
                ->where('team_id', $playerRecord->team_id)
                ->pluck('championship_id');

            // 4. For each championship, checking if we should duplicate the player
            foreach ($teamChampionships as $champId) {

                // Check if this player is ALREADY linked to this championship to avoid duplicates
                $exists = DB::table('team_players')
                    ->where('team_id', $playerRecord->team_id)
                    ->where('user_id', $playerRecord->user_id)
                    ->where('championship_id', $champId)
                    ->exists();

                if (!$exists) {
                    // 5. Create a copy of the player record for this championship
                    DB::table('team_players')->insert([
                        'team_id' => $playerRecord->team_id,
                        'user_id' => $playerRecord->user_id,
                        'temp_player_name' => $playerRecord->temp_player_name,
                        'position' => $playerRecord->position,
                        'number' => $playerRecord->number,
                        'is_approved' => $playerRecord->is_approved,
                        'created_at' => now(),
                        'updated_at' => now(),
                        'championship_id' => $champId // The context!
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Ideally we wouldn't delete data on down for this kind of migration,
        // but if we had to, we would delete records where championship_id is NOT NULL
        // and created_at match this migration time... which is hard to track.
        // So we leave down() empty or just acknowledge it's a data migration.
    }
};
