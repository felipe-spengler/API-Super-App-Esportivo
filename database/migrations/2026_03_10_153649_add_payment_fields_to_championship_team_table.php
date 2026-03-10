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
        Schema::table('championship_team', function (Blueprint $table) {
            $table->string('status_payment')->default('pending')->after('category_id'); // pending, paid, cancelled
            $table->string('payment_method')->nullable()->after('status_payment'); // asaas, pix, free
            $table->foreignId('coupon_id')->nullable()->constrained('coupons')->after('payment_method');
            $table->json('gifts')->nullable()->after('coupon_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('championship_team', function (Blueprint $table) {
            $table->dropForeign(['coupon_id']);
            $table->dropColumn(['status_payment', 'payment_method', 'coupon_id', 'gifts']);
        });
    }
};
