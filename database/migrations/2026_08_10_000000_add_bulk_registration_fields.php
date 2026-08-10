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
        Schema::table('championships', function (Blueprint $table) {
            $table->json('bulk_discount_settings')->nullable()->after('branding_settings');
        });

        Schema::table('race_results', function (Blueprint $table) {
            $table->string('payment_group_id')->nullable()->after('asaas_payment_id');
            $table->boolean('payment_group_leader')->default(false)->after('payment_group_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('championships', function (Blueprint $table) {
            $table->dropColumn('bulk_discount_settings');
        });

        Schema::table('race_results', function (Blueprint $table) {
            $table->dropColumn(['payment_group_id', 'payment_group_leader']);
        });
    }
};
