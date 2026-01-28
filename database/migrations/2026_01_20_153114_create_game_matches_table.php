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
        Schema::create('game_matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('championship_id')->constrained('championships');
            $table->foreignId('category_id')->nullable()->constrained('categories');

            $table->foreignId('home_team_id')->nullable()->constrained('teams');
            $table->foreignId('away_team_id')->nullable()->constrained('teams');

            // Resultado
            $table->integer('home_score')->default(0);
            $table->integer('away_score')->default(0);

            // Estado
            $table->enum('status', ['scheduled', 'warmup', 'live', 'finished', 'canceled'])->default('scheduled');
            $table->dateTime('start_time');
            $table->string('location')->nullable(); // Campo/Quadra

            // Metadados (Rodada, Fase)
            $table->string('round_name')->nullable(); // "Rodada 1", "Final"
            $table->integer('round_number')->nullable(); // 1, 2, 3

            // Súmula Detalhada (Polimorfismo via JSON)
            // Futebol: { goals: [], cards: [] }
            // Vôlei: { sets: [25x20, 18x25], current_set_score: "10-2" }
            $table->json('match_details')->nullable();

            // MVP
            $table->foreignId('mvp_player_id')->nullable()->constrained('users');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('game_matches');
    }
};
