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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('club_id')->constrained('clubs');
            $table->foreignId('coupon_id')->nullable()->constrained('coupons');

            // Valores
            $table->decimal('total_amount', 10, 2); // Quanto o usuário pagou
            $table->decimal('fee_platform', 10, 2)->default(0.00); // Nossa parte
            $table->decimal('net_club', 10, 2); // Parte do clube

            // Status
            $table->string('status')->default('pending'); // pending, paid, canceled, refunded
            $table->string('payment_method')->nullable(); // pix, credit_card
            $table->string('payment_id')->nullable(); // ID no Asaas/Stripe

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
