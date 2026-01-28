<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Championship extends Model
{
    protected $fillable = [
        'club_id',
        'sport_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'status',
        'image_path',  // Caminho da imagem: "championships/championship_123.jpg"
        'branding_settings',
        'art_generator_settings',
        'awards'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'branding_settings' => 'array',
        'art_generator_settings' => 'array',
        'awards' => 'array',
    ];

    public function club()
    {
        return $this->belongsTo(Club::class);
    }
    public function sport()
    {
        return $this->belongsTo(Sport::class);
    }
    public function categories()
    {
        return $this->hasMany(Category::class);
    }
    public function races()
    {
        return $this->hasMany(Race::class);
    }
    public function matches()
    {
        return $this->hasMany(GameMatch::class);
    }
}
