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
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->onDelete('cascade');

            // O item pode ser um Produto ou uma Inscrição (Categoria)
            $table->foreignId('product_id')->nullable()->constrained('products');
            $table->foreignId('category_id')->nullable()->constrained('categories'); // Se for inscrição

            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 10, 2);
            $table->decimal('subtotal', 10, 2);

            $table->json('variants_chosen')->nullable(); // { "Tamanho": "M" } ou { "Nome na Camisa": "João" }

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
