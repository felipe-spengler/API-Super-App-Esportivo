<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MatchSet extends Model
{
    protected $guarded = [];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    public function gameMatch()
    {
        return $this->belongsTo(GameMatch::class);
    }
}
