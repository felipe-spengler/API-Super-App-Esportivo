<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Drop foreign key first
        Schema::table('mvp_votes', function (Blueprint $table) {
            $table->dropForeign(['voter_user_id']);
        });

        // 2. Drop old unique constraint
        Schema::table('mvp_votes', function (Blueprint $table) {
            $table->dropUnique('mvp_votes_game_match_id_voter_user_id_unique');
        });
        
        // 3. Modify columns and add fields
        Schema::table('mvp_votes', function (Blueprint $table) {
            $table->unsignedBigInteger('voter_user_id')->nullable()->change();
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
        // 1. Drop foreign key first
        Schema::table('mvp_votes', function (Blueprint $table) {
            $table->dropForeign(['voter_user_id']);
        });

        // 2. Revert column modifications and unique constraint
        Schema::table('mvp_votes', function (Blueprint $table) {
            $table->dropColumn(['voter_type', 'ip_address']);
            $table->unsignedBigInteger('voter_user_id')->nullable(false)->change();
            
            $table->foreign('voter_user_id')->references('id')->on('users');
            $table->unique(['game_match_id', 'voter_user_id']);
        });
    }
};
