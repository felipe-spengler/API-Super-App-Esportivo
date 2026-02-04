<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('clubs', 'banner_url')) {
            Schema::table('clubs', function (Blueprint $table) {
                $table->string('banner_url')->nullable()->after('logo_url');
            });
        }
    }

    public function down(): void
    {
        Schema::table('clubs', function (Blueprint $table) {
            $table->dropColumn('banner_url');
        });
    }
};
