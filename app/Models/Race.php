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

    /**
     * Accessor: Garante que map_image_url sempre retorne URL absoluta
     */
    public function getMapImageUrlAttribute($value)
    {
        if (!$value) {
            return null;
        }

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
