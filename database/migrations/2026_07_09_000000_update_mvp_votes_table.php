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
        // 1. Drop foreign keys if they exist (needed because MySQL requires an index on foreign key columns,
        // and the unique constraint we are dropping might be satisfying that requirement for game_match_id)
        $fks = ['mvp_votes_game_match_id_foreign', 'mvp_votes_voter_user_id_foreign'];
        foreach ($fks as $fk) {
            $exists = count(DB::select("
                SELECT CONSTRAINT_NAME 
                FROM information_schema.REFERENTIAL_CONSTRAINTS 
                WHERE CONSTRAINT_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'mvp_votes' 
                  AND CONSTRAINT_NAME = ?
            ", [$fk])) > 0;

            if ($exists) {
                Schema::table('mvp_votes', function (Blueprint $table) use ($fk) {
                    $table->dropForeign($fk);
                });
            }
        }

        // 2. Drop old unique constraint if it exists
        $uniqueExists = count(DB::select("
            SELECT INDEX_NAME 
            FROM information_schema.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'mvp_votes' 
              AND INDEX_NAME = 'mvp_votes_game_match_id_voter_user_id_unique'
        ")) > 0;

        if ($uniqueExists) {
            Schema::table('mvp_votes', function (Blueprint $table) {
                $table->dropUnique('mvp_votes_game_match_id_voter_user_id_unique');
            });
        }
        
        // 3. Modify columns, restore foreign keys, and add fields
        Schema::table('mvp_votes', function (Blueprint $table) {
            $table->unsignedBigInteger('voter_user_id')->nullable()->change();
            
            $table->foreign('game_match_id')->references('id')->on('game_matches')->onDelete('cascade');
            $table->foreign('voter_user_id')->references('id')->on('users')->onDelete('set null');
            
            $table->string('voter_type')->default('public'); // public, mesario, arbitro
            $table->string('ip_address', 45)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Drop foreign keys if they exist
        $fks = ['mvp_votes_game_match_id_foreign', 'mvp_votes_voter_user_id_foreign'];
        foreach ($fks as $fk) {
            $exists = count(DB::select("
                SELECT CONSTRAINT_NAME 
                FROM information_schema.REFERENTIAL_CONSTRAINTS 
                WHERE CONSTRAINT_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'mvp_votes' 
                  AND CONSTRAINT_NAME = ?
            ", [$fk])) > 0;

            if ($exists) {
                Schema::table('mvp_votes', function (Blueprint $table) use ($fk) {
                    $table->dropForeign($fk);
                });
            }
        }

        // 2. Revert column modifications, restore original foreign keys and unique constraint
        Schema::table('mvp_votes', function (Blueprint $table) {
            $table->dropColumn(['voter_type', 'ip_address']);
            $table->unsignedBigInteger('voter_user_id')->nullable(false)->change();
            
            $table->foreign('game_match_id')->references('id')->on('game_matches')->onDelete('cascade');
            $table->foreign('voter_user_id')->references('id')->on('users')->onDelete('cascade');
            
            $table->unique(['game_match_id', 'voter_user_id']);
        });
    }
};
