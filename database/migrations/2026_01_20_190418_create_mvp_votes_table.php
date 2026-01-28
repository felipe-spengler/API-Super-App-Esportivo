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
        Schema::create('mvp_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_match_id')->constrained('game_matches');
            $table->foreignId('voter_user_id')->constrained('users'); // Quem votou (torcedor/app)
            $table->foreignId('voted_player_id')->constrained('users'); // Em quem votou (atleta)

            $table->unique(['game_match_id', 'voter_user_id']); // Só pode votar 1x por jogo
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mvp_votes');
    }
};
