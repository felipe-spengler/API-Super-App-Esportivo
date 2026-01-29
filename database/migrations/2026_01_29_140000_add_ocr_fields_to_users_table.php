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
        Schema::table('users', function (Blueprint $table) {
            $table->string('rg')->nullable()->after('cpf');
            $table->string('mother_name')->nullable()->after('name');
            $table->string('gender', 1)->nullable()->after('birth_date'); // M, F, O
            $table->string('document_number')->nullable()->after('rg'); // CNH Number or other
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['rg', 'mother_name', 'gender', 'document_number']);
        });
    }
};
