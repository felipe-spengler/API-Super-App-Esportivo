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
            // Drop foreign key first so we can drop the unique index
            $table->dropForeign(['voter_user_id']);
            
            // Drop old unique constraint
            $table->dropUnique('mvp_votes_game_match_id_voter_user_id_unique');
            
            // Make voter_user_id nullable
            $table->unsignedBigInteger('voter_user_id')->nullable()->change();

            // Re-add foreign key constraint with nullable support
            $table->foreign('voter_user_id')->references('id')->on('users')->onDelete('set null');

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
            // Drop foreign key
            $table->dropForeign(['voter_user_id']);

            $table->dropColumn(['voter_type', 'ip_address']);
            $table->unsignedBigInteger('voter_user_id')->nullable(false)->change();
            
            // Re-add foreign key and unique constraint
            $table->foreign('voter_user_id')->references('id')->on('users');
            $table->unique(['game_match_id', 'voter_user_id']);
        });
    }
};
