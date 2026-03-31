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
        Schema::table('game_matches', function (Blueprint $table) {
            $table->unsignedBigInteger('perna_de_pau_player_id')->nullable()->after('mvp_player_id');
            $table->foreign('perna_de_pau_player_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('game_matches', function (Blueprint $table) {
            $table->dropForeign(['perna_de_pau_player_id']);
            $table->dropColumn('perna_de_pau_player_id');
        });
    }
};
