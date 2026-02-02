<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Club extends Model
{
    use HasFactory;
    protected $fillable = [
        'city_id',
        'name',
        'slug',
        'logo_url',
        'banner_url',
        'primary_color',
        'secondary_color',
        'primary_font',
        'secondary_font',
        'contact_email',
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
