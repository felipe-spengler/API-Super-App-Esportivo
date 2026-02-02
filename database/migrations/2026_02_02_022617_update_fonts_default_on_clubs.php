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
        // 1. Update existing records first to avoid constraint violations during table recreation (SQLite behavior)
        \DB::table('clubs')->whereNull('primary_font')->update(['primary_font' => 'Inter']);
        \DB::table('clubs')->whereNull('secondary_font')->update(['secondary_font' => 'Inter']);

        // 2. Now change the column definition
        Schema::table('clubs', function (Blueprint $table) {
            $table->string('primary_font')->default('Inter')->nullable(false)->change();
            $table->string('secondary_font')->default('Inter')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clubs', function (Blueprint $table) {
            $table->string('primary_font')->nullable()->default(null)->change();
            $table->string('secondary_font')->nullable()->default(null)->change();
        });
    }
};
