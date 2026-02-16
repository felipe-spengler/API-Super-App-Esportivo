<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class TeamPlayer extends Pivot
{
    protected $table = 'team_players';

    protected $fillable = [
        'team_id',
        'user_id',
        'championship_id',
        'position',
        'number',
        'is_approved',
        'temp_player_name'
    ];
}
