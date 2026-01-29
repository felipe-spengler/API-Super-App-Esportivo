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
            if (!Schema::hasColumn('categories', 'min_age')) {
                $table->integer('min_age')->nullable()->after('name');
            }
            if (!Schema::hasColumn('categories', 'max_age')) {
                $table->integer('max_age')->nullable()->after('min_age');
            }
            if (!Schema::hasColumn('categories', 'gender')) {
                $table->enum('gender', ['male', 'female', 'mixed'])->default('mixed')->after('max_age');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn(['min_age', 'max_age', 'gender']);
        });
    }
};
