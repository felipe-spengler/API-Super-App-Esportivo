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

        Schema::create('championships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained('clubs');
            $table->foreignId('sport_id')->constrained('sports'); // Vincula ao esporte (Futebol, Corrida...)

            $table->string('name'); // "Copa Verão 2026"
            $table->text('description')->nullable();

            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();

            $table->string('season')->nullable(); // "2025", "2024/25"
            $table->string('format')->default('league'); // 'league', 'knockout', 'group_knockout', 'racing'

            $table->enum('status', ['draft', 'registrations_open', 'in_progress', 'upcoming', 'ongoing', 'finished'])->default('draft');

            // Visual e Configurações específicas deste campeonato
            $table->json('branding_settings')->nullable(); // { "background_url": "...", "font": "Inter" }
            $table->json('art_generator_settings')->nullable(); // { "template_goal": "url..." }

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('championships');
    }
};
