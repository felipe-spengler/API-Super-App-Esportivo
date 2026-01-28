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
        Schema::create('match_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_match_id')->constrained('game_matches')->onDelete('cascade');
            $table->foreignId('team_id')->nullable()->constrained('teams');
            $table->foreignId('player_id')->nullable()->constrained('users'); // assuming players are users
            $table->string('event_type'); // goal, card, point, block, ace
            $table->integer('value')->default(1); // e.g. 1 point, 3 points (basketball)
            $table->string('game_time')->nullable(); // "10:00", "45+2"
            $table->string('period')->nullable(); // "1º Set", "2º Tempo"
            $table->json('metadata')->nullable(); // extra info
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('match_events');
    }
};
