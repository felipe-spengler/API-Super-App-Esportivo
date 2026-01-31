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
        Schema::table('categories', function (Blueprint $table) {
            // Alter gender to string to support more values and different formats
            $table->string('gender')->nullable()->change();

            if (!Schema::hasColumn('categories', 'max_teams')) {
                $table->integer('max_teams')->nullable()->after('max_age');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            // Note: Reverting enum is tricky in Laravel migration if values changed.
            // Keeping it as string or dropping column if needed.
            $table->dropColumn('max_teams');
        });
    }
};
