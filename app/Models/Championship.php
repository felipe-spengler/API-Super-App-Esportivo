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
        'registration_type', // 'individual', 'team'
        'status',
        'format', // 'league', 'knockout', 'group_knockout', 'racing'
        'image_path',  // Caminho da imagem: "championships/championship_123.jpg"
        'logo_url',    // URL completa do logo
        'cover_image_url', // URL completa da capa
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

    public function teams()
    {
        return $this->belongsToMany(Team::class, 'championship_team')
            ->withPivot('category_id')
            ->withTimestamps();
    }

    /**
     * Accessor: Garante que logo_url sempre retorne URL absoluta
     */
    public function getLogoUrlAttribute($value)
    {
        if (!$value) {
            return null;
        }

        // Se já for uma URL completa, retorna como está
        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        // Se for URL relativa, converte para absoluta
        if (str_starts_with($value, '/')) {
            return rtrim(config('app.url'), '/') . $value;
        }

        return $value;
    }

    /**
     * Accessor: Garante que cover_image_url sempre retorne URL absoluta
     */
    public function getCoverImageUrlAttribute($value)
    {
        if (!$value) {
            return null;
        }

        // Se já for uma URL completa, retorna como está
        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        // Se for URL relativa, converte para absoluta
        if (str_starts_with($value, '/')) {
            return rtrim(config('app.url'), '/') . $value;
        }

        return $value;
    }
}
