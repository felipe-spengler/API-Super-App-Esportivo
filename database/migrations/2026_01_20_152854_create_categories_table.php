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
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('championship_id')->constrained('championships');
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete(); // Hierarquia (Pai -> Filho)

            $table->string('name'); // "Veterano" ou "5km"

            // Regras
            $table->enum('gender', ['M', 'F', 'MISTO'])->default('MISTO');
            $table->integer('min_age')->nullable();
            $table->integer('max_age')->nullable();

            // Financeiro
            $table->decimal('price', 10, 2)->default(0.00); // Preço da inscrição nesta categoria

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
