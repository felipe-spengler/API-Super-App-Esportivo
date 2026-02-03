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
        'art_settings',
        'is_active'
    ];

    protected $casts = [
        'active_modalities' => 'array',
        'art_settings' => 'array',
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

        // Se for URL relativa, converte para absoluta com /api
        if (str_starts_with($value, '/storage')) {
            return rtrim(config('app.url'), '/') . '/api' . $value;
        }

        return $value;
    }

    /**
     * Accessor: Garante que banner_url sempre retorne URL absoluta
     */
    public function getBannerUrlAttribute($value)
    {
        if (!$value) {
            return null;
        }

        // Se já for uma URL completa, retorna como está
        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        // Se for URL relativa, converte para absoluta com /api
        if (str_starts_with($value, '/storage')) {
            return rtrim(config('app.url'), '/') . '/api' . $value;
        }

        return $value;
    }
}
