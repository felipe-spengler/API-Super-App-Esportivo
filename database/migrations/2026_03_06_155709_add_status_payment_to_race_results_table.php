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
        Schema::table('race_results', function (Blueprint $table) {
            $table->string('status_payment')->default('pending')->after('category_id'); // pending, paid, cancelled
            $table->string('payment_method')->nullable()->after('status_payment'); // money, pix, credit_card
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('race_results', function (Blueprint $table) {
            $table->dropColumn(['status_payment', 'payment_method']);
        });
    }
};
