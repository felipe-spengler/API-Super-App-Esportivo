<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Club extends Model
{
    protected $fillable = [
        'city_id',
        'name',
        'slug',
        'logo_url',
        'banner_url',
        'primary_color',
        'secondary_color',
        'active_modalities',
        'is_active'
    ];

    protected $casts = [
        'active_modalities' => 'array',
        'is_active' => 'boolean',
    ];

    public function city()
    {
        return $this->belongsTo(City::class);
    }

    public function championships()
    {
        return $this->hasMany(Championship::class);
    }
}
