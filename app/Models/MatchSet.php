<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MatchSet extends Model
{
    protected $guarded = [];

    public function gameMatch()
    {
        return $this->belongsTo(GameMatch::class);
    }
}
