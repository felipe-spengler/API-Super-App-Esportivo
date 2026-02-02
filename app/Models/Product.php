<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends Model
{
    use HasFactory;
    protected $fillable = [
        'club_id',
        'name',
        'description',
        'price',
        'image_url',
        'stock_quantity',
        'variants'
    ];

    protected $casts = [
        'variants' => 'array',
    ];

    public function club()
    {
        return $this->belongsTo(Club::class);
    }

    /**
     * Accessor: Garante que image_url sempre retorne URL absoluta
     */
    public function getImageUrlAttribute($value)
    {
        if (!$value) {
            return null;
        }

        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        if (str_starts_with($value, '/')) {
            return rtrim(config('app.url'), '/') . $value;
        }

        return $value;
    }
}
