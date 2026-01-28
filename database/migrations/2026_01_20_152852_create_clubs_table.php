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
        Schema::create('clubs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('city_id')->constrained('cities'); // Um clube pertence a uma cidade
            $table->string('name');
            $table->string('slug')->unique(); // toledao

            // Design System (Whitelabel)
            $table->string('logo_url')->nullable();
            $table->string('banner_url')->nullable();
            $table->string('primary_color', 7)->default('#000000'); // Hex
            $table->string('secondary_color', 7)->default('#FFFFFF'); // Hex

            // Configurações
            $table->json('active_modalities')->nullable(); // ['futebol', 'volei'] -> Quais esportes aparecem no app deste clube
            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clubs');
    }
};
