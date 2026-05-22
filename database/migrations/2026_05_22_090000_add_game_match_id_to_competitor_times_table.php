<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('competitor_times', function (Blueprint $table) {
            $table->foreignId('game_match_id')
                ->nullable()
                ->after('championship_id')
                ->constrained('game_matches')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('competitor_times', function (Blueprint $table) {
            $table->dropForeign(['game_match_id']);
            $table->dropColumn('game_match_id');
        });
    }
};
