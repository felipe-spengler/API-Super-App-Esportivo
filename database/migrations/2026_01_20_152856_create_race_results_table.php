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
        Schema::create('race_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('race_id')->constrained('races');
            $table->foreignId('user_id')->nullable()->constrained('users'); // Pode ser null se importado via planilha sem user no sistema ainda
            $table->foreignId('category_id')->nullable()->constrained('categories'); // Categoria que correu

            $table->string('bib_number')->nullable(); // Número de peito
            $table->string('name')->nullable(); // Nome cru (caso não tenha user_id)

            $table->time('net_time')->nullable(); // Tempo líquido
            $table->time('gross_time')->nullable(); // Tempo bruto

            $table->integer('position_general')->nullable();
            $table->integer('position_category')->nullable();
            $table->string('chip_id')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('race_results');
    }
};
