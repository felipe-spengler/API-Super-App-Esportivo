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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('club_id')->constrained('clubs');

            $table->string('name');
            $table->enum('type', ['good', 'service', 'donation', 'kit'])->default('good');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->string('image_url')->nullable();
            $table->boolean('is_active')->default(true);

            // Estoque e Variantes
            $table->integer('stock_quantity')->default(0); // Controle simples
            $table->json('variants')->nullable(); // [{ "name": "Tamanho", "options": ["P", "M", "G"] }]

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
