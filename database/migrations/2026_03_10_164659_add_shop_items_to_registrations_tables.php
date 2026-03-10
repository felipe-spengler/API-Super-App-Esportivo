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
            $table->json('shop_items')->nullable()->after('gifts');
        });

        Schema::table('championship_team', function (Blueprint $table) {
            $table->json('shop_items')->nullable()->after('gifts');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('race_results', function (Blueprint $table) {
            $table->dropColumn('shop_items');
        });

        Schema::table('championship_team', function (Blueprint $table) {
            $table->dropColumn('shop_items');
        });
    }
};
