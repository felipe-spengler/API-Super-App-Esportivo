<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('game_matches', function (Blueprint $table) {
            $table->json('awards')->nullable()->after('mvp_player_id');
            // awards stores: { best_player: id, best_goalkeeper: id, ... }
        });

        Schema::table('championships', function (Blueprint $table) {
            $table->json('awards')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('game_matches', function (Blueprint $table) {
            $table->dropColumn('awards');
        });

        Schema::table('championships', function (Blueprint $table) {
            $table->dropColumn('awards');
        });
    }
};
