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
            if (!Schema::hasColumn('championship_team', 'staff')) {
                $table->json('staff')->nullable()->after('captain_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('championship_team', function (Blueprint $table) {
            if (Schema::hasColumn('championship_team', 'staff')) {
                $table->dropColumn('staff');
            }
        });
    }
};
