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
            if (!Schema::hasColumn('users', 'rg')) {
                $table->string('rg')->nullable()->after('cpf');
            }
            if (!Schema::hasColumn('users', 'mother_name')) {
                $table->string('mother_name')->nullable()->after('rg');
            }
            if (!Schema::hasColumn('users', 'gender')) {
                $table->string('gender')->nullable()->after('mother_name'); // 'M', 'F', 'O'
            }
            // document_number might be redundant if we have cpf and rg, but user added it to model. 
            // Let's add it generic if needed or assume RG covers it. 
            // The user added 'document_number' to fillable. Let's add it to DB to be safe.
            if (!Schema::hasColumn('users', 'document_number')) {
                $table->string('document_number')->nullable()->after('gender');
            }
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
