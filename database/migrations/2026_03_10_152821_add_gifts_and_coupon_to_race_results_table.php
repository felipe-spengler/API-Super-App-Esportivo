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
            $table->json('gifts')->nullable()->after('pcd_document_url');
            $table->foreignId('coupon_id')->nullable()->constrained('coupons')->after('gifts');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('race_results', function (Blueprint $table) {
            $table->dropForeign(['coupon_id']);
            $table->dropColumn(['gifts', 'coupon_id']);
        });
    }
};
