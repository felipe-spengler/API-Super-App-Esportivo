<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('championships', function (Blueprint $table) {
            $table->boolean('include_repescagem_goals')->default(false)->after('tiebreaker_priority');
            $table->boolean('include_repescagem_assists')->default(false)->after('include_repescagem_goals');
            $table->boolean('include_repescagem_cards')->default(true)->after('include_repescagem_assists');
            $table->boolean('include_repescagem_standings')->default(false)->after('include_repescagem_cards');
            $table->boolean('include_knockout_standings')->default(false)->after('include_repescagem_standings');
            $table->boolean('include_knockout_goals')->default(false)->after('include_knockout_standings');
            $table->boolean('include_knockout_assists')->default(false)->after('include_knockout_goals');
            $table->boolean('include_knockout_cards')->default(true)->after('include_knockout_assists');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('championships', function (Blueprint $table) {
            $table->dropColumn([
                'include_repescagem_goals', 
                'include_repescagem_assists', 
                'include_repescagem_cards', 
                'include_repescagem_standings',
                'include_knockout_standings',
                'include_knockout_goals',
                'include_knockout_assists',
                'include_knockout_cards'
            ]);
        });
    }
};
