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
        Schema::create('match_positions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('game_match_id')->constrained()->onDelete('cascade');
            $table->foreignId('team_id')->constrained()->onDelete('cascade');
            $table->foreignId('player_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->integer('set_number')->default(1); // 1º Set, 2º Set...
            $table->integer('position'); // 1 a 6 (quadra), 0 (banco/líbero)
            $table->timestamps();

            // Garante que não haja dois jogadores na mesma posição do mesmo time no mesmo set
            $table->unique(['game_match_id', 'team_id', 'set_number', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('match_positions');
    }
};
