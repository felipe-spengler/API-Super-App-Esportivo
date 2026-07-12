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
        Schema::table('mvp_votes', function (Blueprint $table) {
            // Drop old unique constraint
            $table->dropUnique('mvp_votes_game_match_id_voter_user_id_unique');
            
            // Make voter_user_id nullable
            $table->unsignedBigInteger('voter_user_id')->nullable()->change();

            // Add voter_type and ip_address
            $table->string('voter_type')->default('public'); // public, mesario, arbitro
            $table->string('ip_address', 45)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('mvp_votes', function (Blueprint $table) {
            $table->dropColumn(['voter_type', 'ip_address']);
            $table->unsignedBigInteger('voter_user_id')->nullable(false)->change();
            $table->unique(['game_match_id', 'voter_user_id']);
        });
    }
};
