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
            $table->boolean('has_pcd_discount')->default(false);
            $table->decimal('pcd_discount_percentage', 5, 2)->default(0);
            $table->boolean('has_elderly_discount')->default(false);
            $table->decimal('elderly_discount_percentage', 5, 2)->default(0);
            $table->integer('elderly_minimum_age')->default(60);
        });

        Schema::table('race_results', function (Blueprint $table) {
            $table->boolean('is_pcd')->default(false);
            $table->string('pcd_document_url')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('championships', function (Blueprint $table) {
            $table->dropColumn([
                'has_pcd_discount',
                'pcd_discount_percentage',
                'has_elderly_discount',
                'elderly_discount_percentage',
                'elderly_minimum_age'
            ]);
        });

        Schema::table('race_results', function (Blueprint $table) {
            $table->dropColumn(['is_pcd', 'pcd_document_url']);
        });
    }
};
