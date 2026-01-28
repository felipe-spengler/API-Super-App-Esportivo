<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Race extends Model
{
    protected $fillable = [
        'championship_id',
        'start_datetime',
        'location_name',
        'map_image_url',
        'kits_info'
    ];

    protected $casts = [
        'start_datetime' => 'datetime',
    ];

    public function championship()
    {
        return $this->belongsTo(Championship::class);
    }
    public function results()
    {
        return $this->hasMany(RaceResult::class);
    }
}
