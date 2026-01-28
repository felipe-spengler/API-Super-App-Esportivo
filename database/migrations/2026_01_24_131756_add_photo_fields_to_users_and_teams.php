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
        // Adiciona campo de foto para usuários (jogadores)
        Schema::table('users', function (Blueprint $table) {
            $table->string('photo_path')->nullable()->after('email');
            // Exemplo: "players/player_123456.jpg"
        });

        // Adiciona campo de logo para equipes
        Schema::table('teams', function (Blueprint $table) {
            $table->string('logo_path')->nullable()->after('name');
            // Exemplo: "teams/team_789012.png"
        });

        // Adiciona campo de imagem para campeonatos
        Schema::table('championships', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('name');
            // Exemplo: "championships/championship_345678.jpg"
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('photo_path');
        });

        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn('logo_path');
        });

        Schema::table('championships', function (Blueprint $table) {
            $table->dropColumn('image_path');
        });
    }
};
