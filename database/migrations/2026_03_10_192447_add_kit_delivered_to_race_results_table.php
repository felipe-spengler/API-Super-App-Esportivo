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
            $table->boolean('kit_delivered')->default(false)->after('status_payment');
            $table->timestamp('kit_delivered_at')->nullable()->after('kit_delivered');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('race_results', function (Blueprint $table) {
            $table->dropColumn(['kit_delivered', 'kit_delivered_at']);
        });
    }
};
