<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('championship_team', function (Blueprint $table) {
            $table->unsignedBigInteger('captain_id')->nullable()->after('category_id');
        });

        // Set existing records to the team's main captain to keep consistency
        DB::statement('UPDATE championship_team 
                       JOIN teams ON teams.id = championship_team.team_id 
                       SET championship_team.captain_id = teams.captain_id');

        Schema::table('championship_team', function (Blueprint $table) {
            $table->foreign('captain_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('championship_team', function (Blueprint $table) {
            $table->dropForeign(['captain_id']);
            $table->dropColumn('captain_id');
        });
    }
};
