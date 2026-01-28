<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RaceResult extends Model
{
    protected $fillable = [
        'race_id',
        'user_id',
        'category_id',
        'bib_number',
        'name',
        'net_time',
        'gross_time',
        'position_general',
        'position_category',
        'chip_id'
    ];

    public function race()
    {
        return $this->belongsTo(Race::class);
    }
    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
