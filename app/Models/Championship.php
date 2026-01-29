<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Championship extends Model
{
    use HasFactory;
    protected $fillable = [
        'club_id',
        'sport_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'registration_start_date',
        'registration_end_date',
        'status',
        'format', // 'league', 'knockout', 'group_knockout', 'racing'
        'image_path',  // Caminho da imagem: "championships/championship_123.jpg"
        'branding_settings',
        'art_generator_settings',
        'awards'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'registration_start_date' => 'datetime',
        'registration_end_date' => 'datetime',
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
