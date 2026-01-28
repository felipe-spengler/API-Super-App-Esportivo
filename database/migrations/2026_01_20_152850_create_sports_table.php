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
        Schema::create('sports', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Futebol, Vôlei, Corrida
            $table->string('slug')->unique(); // futebol, corrida
            $table->string('category_type'); // 'team', 'racing', 'racket', 'combat' (Define o comportamento do app)
            $table->string('icon_name')->default('trophy'); // Nome do ícone no App
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('sports');
        Schema::enableForeignKeyConstraints();
    }
};
